#!/usr/bin/env python3
"""Check rendered site links, identity metadata, and issue #6 regressions offline."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ORIGIN = 'https://fair-bioheaders.github.io'
MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.links, self.ids, self.metas, self.json_ld = [], set(), {}, []
        self.json_buffer = None
        self.scripts = []
        self.icons = []
        self.references = []
        self.cite_buttons = set()
        self.cite_outputs = set()
        self.skip, self.main, self.menu, self.images = False, False, False, []
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('name'):
            self.ids.add(attrs['name'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == 'script':
            self.scripts.append(attrs)
        if tag == 'img':
            self.images.append(attrs)
        if any(token in {'fa', 'fas', 'far', 'fab', 'fal', 'fad', 'fat'}
               or token.startswith('fa-') for token in attrs.get('class', '').split()):
            self.icons.append(attrs.get('class', ''))
        if tag == 'meta':
            self.metas[attrs.get('name', attrs.get('property'))] = attrs.get('content')
        if tag == 'button' and 'cite-button' in attrs.get('class', '').split():
            if attrs.get('data-cite-key'):
                self.cite_buttons.add(attrs['data-cite-key'])
        if tag == 'pre' and attrs.get('data-cite-output'):
            self.cite_outputs.add(attrs['data-cite-output'])
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.json_buffer = ''
        if tag == 'a' and attrs.get('href') == '#main':
            self.skip = True
        if tag == 'main' and attrs.get('id') == 'main' and attrs.get('tabindex') == '-1':
            self.main = True
        if tag == 'button' and attrs.get('class') == 'nav-toggle':
            self.menu = bool(attrs.get('aria-label')) and attrs.get('aria-expanded') == 'false' and attrs.get('aria-controls') == 'overflow-navigation'

    def handle_data(self, data):
        if self.json_buffer is not None:
            self.json_buffer += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.json_buffer is not None:
            self.json_ld.append(json.loads(self.json_buffer))
            self.json_buffer = None


REFERENCE_RE = re.compile(r'<div class="reference"([^>]*)>(.*?)</div>', re.DOTALL)


def reference_errors(relative, text, page):
    errors = []
    for head, block in REFERENCE_RE.findall(text):
        if 'itemscope' not in head or 'itemtype="https://schema.org/' not in head:
            errors.append(f'{relative}: reference block lacks itemscope/itemtype')
        if not re.search(r'itemprop="name"', block):
            errors.append(f'{relative}: reference block lacks a name')
        if not re.search(r'itemprop="author".*?itemprop="familyName"', block, re.DOTALL):
            errors.append(f'{relative}: reference block lacks author name parts')
        if 'itemprop="propertyID" content="DOI"' not in block or 'itemprop="value"' not in block:
            errors.append(f'{relative}: reference block lacks a DOI identifier')
    missing = page.cite_buttons.symmetric_difference(page.cite_outputs)
    for key in sorted(missing):
        errors.append(f'{relative}: cite button/output mismatch for {key}')
    return errors


def mathjax_errors(page):
    scripts = [script for script in page.scripts
               if 'mathjax' in script.get('src', '').lower()
               or script.get('id', '').lower() == 'mathjax-script']
    if page.metas.get('fhr:math') == 'true':
        if len(scripts) != 1 or scripts[0].get('src') != MATHJAX_URL:
            return ['math opt-in must load exactly the pinned MathJax script']
    elif scripts:
        return ['MathJax loaded without a page math opt-in']
    return []


def check(root):
    errors = []
    html = {p: Page(p.read_text()) for p in root.rglob('*.html')}
    def require(condition, message):
        if not condition:
            errors.append(message)
    def resolve(path):
        candidate = root / unquote(path).lstrip('/')
        if candidate.is_dir():
            candidate /= 'index.html'
        elif not candidate.is_file() and not candidate.suffix:
            candidate = candidate.with_name(candidate.name + '.html')
        return candidate
    for file, page in html.items():
        relative = file.relative_to(root).as_posix()
        url = '/' + relative.removesuffix('index.html')
        for link in page.links:
            parsed = urlsplit(urljoin(ORIGIN + url, link))
            if parsed.netloc != urlsplit(ORIGIN).netloc or parsed.scheme not in ('http', 'https'):
                continue
            target = resolve(parsed.path)
            require(target.is_file(), f'{relative}: missing target {link}')
            if parsed.fragment and target in html:
                require(unquote(parsed.fragment) in html[target].ids, f'{relative}: missing fragment {link}')
        # Redirect pages intentionally use jekyll-redirect-from's minimal template.
        if 'og:site_name' in page.metas:
            for key in ('description', 'og:description', 'og:image', 'twitter:card'):
                require(bool(page.metas.get(key)), f'{relative}: missing {key}')
            require(page.skip and page.main and page.menu, f'{relative}: missing keyboard navigation')
            for image in page.images:
                require('alt' in image, f'{relative}: image lacks alt text')
            for icon in page.icons:
                require(False, f'{relative}: icon-font markup without a shipped icon font: {icon}')
        text = file.read_text().lower()
        for forbidden in ('fonts.googleapis.com', 'fonts.gstatic.com', 'lorem ipsum', 'future blog post', 'github university', 'analytics.js', 'polyfill', 'jquery-1.12'):
            require(forbidden not in text, f'{relative}: unwanted template/runtime content: {forbidden}')
        require('cite-button' not in text or 'assets/js/main.min.js' in text,
                f'{relative}: cite buttons require the bundled script')
        errors.extend(reference_errors(relative, file.read_text(), page))
        errors.extend(f'{relative}: {error}' for error in mathjax_errors(page))
    # Also check font and image references in CSS, including missing vendored assets.
    for file in root.rglob('*.css'):
        css = file.read_text()
        for link in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css):
            if urlsplit(link).scheme or link.startswith('#'):
                continue
            base = ORIGIN + '/' + file.relative_to(root).as_posix()
            require(resolve(urlsplit(urljoin(base, link)).path).is_file(), f'{file.name}: missing CSS asset {link}')
        for forbidden in ('font awesome', 'academicons'):
            require(forbidden not in css.lower(), f'{file.name}: references removed icon font: {forbidden}')
    sitemap = ET.parse(root / 'sitemap.xml')
    urls = [loc.text for loc in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    require(len(urls) == len(set(urls)), 'Sitemap contains duplicate URLs')
    for url in urls:
        path = urlsplit(url).path
        require(resolve(path).is_file(), f'Sitemap has missing page: {url}')
        require(path == '/' or path in ('/publications/', '/resources/') or path.startswith('/publication/'), f'Unexpected sitemap page: {url}')
    org = html[root / 'index.html'].json_ld[0]
    require(org.get('@type') == 'Organization', 'Home identity must be an organization')
    members = {p['@id'] for p in org.get('member', [])}
    require(members == {'https://orcid.org/0000-0002-5719-4024', 'https://orcid.org/0000-0003-3192-6538'}, 'Home identity must include both maintainer ORCIDs')
    require(org.get('sameAs') == ['https://github.com/FAIR-bioHeaders'], 'Organization identity must use its own GitHub profile')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Checked {len(html)} HTML pages, local links/assets, {len(urls)} sitemap URLs, SEO and identity metadata.')
    return 0

if __name__ == '__main__':
    sys.exit(check(Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()))
