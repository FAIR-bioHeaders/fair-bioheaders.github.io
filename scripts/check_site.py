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

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.links, self.ids, self.metas, self.json_ld = [], set(), {}, []
        self.json_buffer = None
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
        if tag == 'img':
            self.images.append(attrs)
        if tag == 'meta':
            self.metas[attrs.get('name', attrs.get('property'))] = attrs.get('content')
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
        text = file.read_text().lower()
        for forbidden in ('lorem ipsum', 'future blog post', 'github university', 'analytics.js', 'polyfill', 'mathjax-script', 'jquery-1.12'):
            require(forbidden not in text, f'{relative}: unwanted template/runtime content: {forbidden}')
    # Also check font and image references in CSS, including missing vendored assets.
    for file in root.rglob('*.css'):
        for link in re.findall(r'url\([\'\"]?([^\)\'\"]+)', file.read_text()):
            if urlsplit(link).scheme or link.startswith('#'):
                continue
            base = ORIGIN + '/' + file.relative_to(root).as_posix()
            require(resolve(urlsplit(urljoin(base, link)).path).is_file(), f'{file.name}: missing CSS asset {link}')
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
