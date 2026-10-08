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
        self.duplicate_ids = set()
        self.scripts = []
        self.icons = []
        self.references = []
        self.json_errors = []
        self.cite_buttons = set()
        self.cite_outputs = set()
        self.cite_copies = set()
        self.cite_panels = set()
        self.skip, self.main, self.menu, self.images = False, False, False, []
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            if attrs['id'] in self.ids:
                self.duplicate_ids.add(attrs['id'])
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
        if tag == 'button' and 'cite-copy' in attrs.get('class', '').split():
            if attrs.get('data-cite-copy'):
                self.cite_copies.add(attrs['data-cite-copy'])
        if tag == 'pre' and attrs.get('data-cite-output'):
            self.cite_outputs.add(attrs['data-cite-output'])
        if tag == 'div' and attrs.get('data-cite-panel'):
            self.cite_panels.add(attrs['data-cite-panel'])
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
            try:
                self.json_ld.append(json.loads(self.json_buffer))
            except json.JSONDecodeError as error:
                self.json_errors.append(str(error))
            self.json_buffer = None


REFERENCE_RE = re.compile(r'<div class="reference"([^>]*)>')


def iter_references(text):
    """Yield (start_tag_attrs, inner_html) for each .reference div.

    Divs nest (the citation panel), so scan with a depth counter rather than a
    non-greedy match that would stop at the first closing tag.
    """
    for match in REFERENCE_RE.finditer(text):
        depth = 1
        pos = match.end()
        for div in re.finditer(r'<div\b|</div>', text[pos:]):
            depth += 1 if div.group(0).startswith('<div') else -1
            if depth == 0:
                yield match.group(1), text[pos:pos + div.start()]
                break


def reference_errors(relative, text, page):
    errors = []
    for head, block in iter_references(text):
        if 'itemscope' not in head or 'itemtype="https://schema.org/' not in head:
            errors.append(f'{relative}: reference block lacks itemscope/itemtype')
        if not re.search(r'itemprop="name"', block):
            errors.append(f'{relative}: reference block lacks a name')
        if not re.search(r'itemprop="author".*?itemprop="familyName"', block, re.DOTALL):
            errors.append(f'{relative}: reference block lacks author name parts')
        has_doi = 'itemprop="propertyID" content="DOI"' in block and 'itemprop="value"' in block
        has_repo = 'itemprop="codeRepository"' in block or bool(re.search(r'itemprop="(?:url|sameAs)"[^>]*(?:content|href)="https://github\.com/', block))
        if not has_doi and not has_repo:
            errors.append(f'{relative}: reference block lacks a DOI or repository identifier')
    expected = page.cite_buttons
    for label, actual in (
        ('output', page.cite_outputs),
        ('copy button', page.cite_copies),
        ('panel', page.cite_panels),
    ):
        for key in sorted(expected.symmetric_difference(actual)):
            errors.append(f'{relative}: cite button/{label} mismatch for {key}')
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
        for duplicate in sorted(page.duplicate_ids):
            errors.append(f'{relative}: duplicate element ID {duplicate}')
        text = file.read_text().lower()
        for forbidden in ('fonts.googleapis.com', 'fonts.gstatic.com', 'lorem ipsum', 'future blog post', 'github university', 'analytics.js', 'polyfill', 'jquery-1.12'):
            require(forbidden not in text, f'{relative}: unwanted template/runtime content: {forbidden}')
        require('cite-button' not in text or 'assets/js/main.min.js' in text,
                f'{relative}: cite buttons require the bundled script')
        for error in page.json_errors:
            errors.append(f'{relative}: invalid JSON-LD ({error})')
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
    # Repo Markdown docs are excluded from Jekyll and must not be published.
    for doc in ('README.md', 'CONTRIBUTING.md', 'AGENTS.md'):
        require(not (root / doc).exists(), f'{doc} should be excluded from the build')
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
    same_as = org.get('sameAs') or []
    require('https://github.com/FAIR-bioHeaders' in same_as, 'Organization identity must use its own GitHub profile')
    require(len(set(same_as)) == len(same_as), 'Organization sameAs must not repeat links')
    member_keys = {p.get('@id') for p in org.get('member', [])}
    for person in org.get('member', []):
        require('jobTitle' in person and 'worksFor' in person,
                f"Organization member {person.get('name')} lacks jobTitle/worksFor")
        require(person['@id'] in member_keys, 'member @id missing')

    # Per-page structured data expectations.
    home_jsonld = html[root / 'index.html'].json_ld
    require(any(block.get('@type') == 'WebSite' for block in home_jsonld),
            'Home page must include WebSite JSON-LD')
    publications_jsonld = html[root / 'publications/index.html'].json_ld
    require(any(block.get('@type') == 'ItemList' for block in publications_jsonld),
            'Publications page must include an ItemList JSON-LD')
    for file, page in html.items():
        relative = file.relative_to(root).as_posix()
        types = {block.get('@type') for block in page.json_ld}
        if relative.startswith('publication/'):
            require('ScholarlyArticle' in types, f'{relative}: missing ScholarlyArticle JSON-LD')
            require(any('citation_title' == key for key in page.metas),
                    f'{relative}: missing Highwire citation_title meta')
            require(any('citation_author' == key for key in page.metas),
                    f'{relative}: missing Highwire citation_author meta')
        if relative in ('terms/index.html', 'sitemap/index.html', '404.html'):
            require(page.metas.get('robots', '').startswith('noindex'),
                    f'{relative}: utility page should be noindex')
    require((root / 'publications/feed.xml').is_file(), 'Missing publications Atom feed')
    require((root / 'feed.xml').is_file(), 'Missing site Atom feed')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Checked {len(html)} HTML pages, local links/assets, {len(urls)} sitemap URLs, SEO and identity metadata.')
    return 0

if __name__ == '__main__':
    sys.exit(check(Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()))
