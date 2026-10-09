#!/usr/bin/env python3
"""Check rendered site links, identity metadata, and issue #6 regressions offline."""
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ORIGIN = 'https://fair-bioheaders.github.io'
MATHJAX_INTEGRITY = 'sha384-Wuix6BuhrWbjDBs24bXrjf4ZQ5aFeFWBuKkFekO2t8xFU0iNaLQfp2K6/1Nxveei'
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
        for key in ('srcset', 'imagesrcset'):
            for url in parse_srcset(attrs.get(key, '')):
                self.links.append(url)
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


def parse_srcset(value):
    """Extract the URLs from a srcset/imagesrcset attribute value.

    Each candidate is a URL optionally followed by a width/density descriptor,
    separated by commas. URLs cannot contain unescaped spaces or commas here, so
    a simple split keeps this dependency-free.
    """
    urls = []
    for candidate in value.split(','):
        candidate = candidate.strip()
        if not candidate:
            continue
        urls.append(candidate.split()[0])
    return urls


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


class MicrodataParser(HTMLParser):
    """Read nested Schema.org item scopes and their directly owned properties."""

    VOID_TAGS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = None
        self.scopes = []
        self.elements = []
        self.feed(text)

    @staticmethod
    def add_property(props, name, value):
        if name in props:
            if not isinstance(props[name], list):
                props[name] = [props[name]]
            props[name].append(value)
        else:
            props[name] = value

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        names = attrs.get('itemprop', '').split()
        parent = self.scopes[-1] if self.scopes else None
        if 'itemscope' in attrs:
            item = {
                'type': attrs.get('itemtype', '').rsplit('/', 1)[-1],
                'props': {},
            }
            if parent and names:
                for name in names:
                    self.add_property(parent['props'], name, item)
            elif self.root is None:
                self.root = item
            self.scopes.append(item)
            closes_scope = True
        else:
            if parent and names:
                value = attrs.get('content', attrs.get('href', attrs.get('datetime', '')))
                for name in names:
                    self.add_property(parent['props'], name, value)
            closes_scope = False
        if tag not in self.VOID_TAGS:
            self.elements.append((tag, closes_scope))

    def handle_endtag(self, tag):
        if tag in self.VOID_TAGS:
            return
        while self.elements:
            element, closes_scope = self.elements.pop()
            if closes_scope:
                self.scopes.pop()
            if element == tag:
                break


def first_item(value):
    return value[0] if isinstance(value, list) and value else value


def nested_items(item):
    if not isinstance(item, dict):
        return
    yield item
    for value in item.get('props', {}).values():
        for child in value if isinstance(value, list) else [value]:
            if isinstance(child, dict):
                yield from nested_items(child)


def container_hierarchy_errors(root, relative):
    errors = []
    scopes = list(nested_items(root))
    owners = {
        prop: [item for item in scopes if prop in item.get('props', {})]
        for prop in ('issueNumber', 'volumeNumber')
    }
    issue = bool(owners['issueNumber'])
    volume = bool(owners['volumeNumber'])
    has_periodical = any(item.get('type') == 'Periodical' for item in scopes)
    if issue and not volume:
        expected = ('PublicationIssue', 'Periodical')
    elif issue and volume:
        expected = ('PublicationIssue', 'PublicationVolume', 'Periodical')
    elif volume:
        expected = ('PublicationVolume', 'Periodical')
    elif has_periodical:
        expected = ('Periodical',)
    else:
        expected = ()

    chain = []
    current = first_item(root.get('props', {}).get('isPartOf'))
    while isinstance(current, dict):
        chain.append(current)
        current = first_item(current.get('props', {}).get('isPartOf'))
    actual = tuple(item.get('type') for item in chain)
    if actual != expected:
        errors.append(f'{relative}: expected container hierarchy {" > ".join(expected)}, got {" > ".join(actual) or "none"}')
    for prop, expected_type in (('issueNumber', 'PublicationIssue'),
                                ('volumeNumber', 'PublicationVolume')):
        if owners[prop] and (
            len(owners[prop]) != 1 or owners[prop][0].get('type') != expected_type
        ):
            errors.append(f'{relative}: {prop} must belong only to a {expected_type}')
    return errors


def jsonld_container_errors(article, relative):
    errors = []
    chain = []
    current = article.get('isPartOf')
    while isinstance(current, dict):
        chain.append(current)
        current = current.get('isPartOf')
    issue = any('issueNumber' in item for item in chain)
    volume = any('volumeNumber' in item for item in chain)
    if issue and volume:
        expected = ('PublicationIssue', 'PublicationVolume', 'Periodical')
    elif issue:
        expected = ('PublicationIssue', 'Periodical')
    elif volume:
        expected = ('PublicationVolume', 'Periodical')
    elif chain:
        expected = ('Periodical',)
    else:
        expected = ()
    actual = tuple(item.get('@type') for item in chain)
    if actual != expected:
        errors.append(
            f'{relative}: expected JSON-LD container hierarchy '
            f'{" > ".join(expected) or "none"}, got {" > ".join(actual) or "none"}'
        )
    for prop, expected_type in (('issueNumber', 'PublicationIssue'),
                                ('volumeNumber', 'PublicationVolume')):
        owners = [item for item in chain if prop in item]
        if owners and (
            len(owners) != 1 or owners[0].get('@type') != expected_type
        ):
            errors.append(f'{relative}: JSON-LD {prop} must belong only to a {expected_type}')
    return errors


def reference_errors(relative, text, page):
    errors = []
    for head, block in iter_references(text):
        if 'itemscope' not in head or 'itemtype="https://schema.org/' not in head:
            errors.append(f'{relative}: reference block lacks itemscope/itemtype')
        root = MicrodataParser(f'<div{head}>{block}</div>').root or {'type': '', 'props': {}}
        props = root.get('props', {})
        if not props.get('name'):
            errors.append(f'{relative}: reference block lacks a name')
        authors = props.get('author', [])
        authors = authors if isinstance(authors, list) else [authors]
        if not any(
            isinstance(author, dict) and author.get('props', {}).get('familyName')
            for author in authors
        ):
            errors.append(f'{relative}: reference block lacks author name parts')
        identifiers = list(nested_items(root))
        has_doi = any(
            item.get('props', {}).get('propertyID') == 'DOI'
            and item.get('props', {}).get('value')
            for item in identifiers
        )
        has_repo = any(item.get('props', {}).get('codeRepository') for item in identifiers)
        has_repo = has_repo or any(
            str(item.get('props', {}).get(prop, '')).startswith('https://github.com/')
            for item in identifiers for prop in ('url', 'sameAs')
        )
        if not has_doi and not has_repo:
            errors.append(f'{relative}: reference block lacks a DOI or repository identifier')
        is_article = root.get('type') == 'ScholarlyArticle'
        if is_article:
            if not props.get('datePublished'):
                errors.append(f'{relative}: article reference lacks datePublished')
            errors.extend(container_hierarchy_errors(root, relative))
    expected = page.cite_buttons
    for label, actual in (
        ('output', page.cite_outputs),
        ('copy button', page.cite_copies),
        ('panel', page.cite_panels),
    ):
        for key in sorted(expected.symmetric_difference(actual)):
            errors.append(f'{relative}: cite button/{label} mismatch for {key}')
    return errors


ATOM = '{http://www.w3.org/2005/Atom}'


def parse_timestamp(value):
    if not value:
        raise ValueError('timestamp is empty')
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def feed_errors(path, expected_url, expected_entries=None):
    """Parse an Atom feed and check its canonical URL, expected entries, and dates."""
    errors = []
    if not path.is_file():
        return [f'{path.name}: missing Atom feed']
    try:
        tree = ET.parse(path)
    except ET.ParseError as error:
        return [f'{path.name}: invalid Atom XML ({error})']
    feed = tree.getroot()
    self_link = None
    for link in feed.findall(f'{ATOM}link'):
        if link.get('rel') == 'self':
            self_link = link.get('href')
    if self_link != expected_url:
        errors.append(f'{path.name}: feed self link must equal {expected_url}')
    try:
        parse_timestamp(feed.findtext(f'{ATOM}updated'))
    except (TypeError, ValueError):
        errors.append(f'{path.name}: feed has missing or invalid updated timestamp')

    entries = feed.findall(f'{ATOM}entry')
    entry_ids = []
    entry_urls = []
    origin = f'{urlsplit(expected_url).scheme}://{urlsplit(expected_url).netloc}'
    for entry in entries:
        eid = entry.findtext(f'{ATOM}id') or ''
        entry_ids.append(eid)
        if not eid.startswith(origin + '/'):
            errors.append(f'{path.name}: entry id outside the expected origin: {eid}')
        alternate_urls = [
            link.get('href') for link in entry.findall(f'{ATOM}link')
            if link.get('rel') == 'alternate' and link.get('href')
        ]
        entry_url = alternate_urls[0] if alternate_urls else ''
        entry_urls.append(entry_url)
        if not entry_url:
            errors.append(f'{path.name}: entry missing its canonical alternate link: {eid}')
        for field in ('published', 'updated'):
            try:
                parse_timestamp(entry.findtext(f'{ATOM}{field}'))
            except (TypeError, ValueError):
                errors.append(f'{path.name}: entry has missing or invalid {field} timestamp: {eid}')
        for link in entry.findall(f'{ATOM}link'):
            href = link.get('href') or ''
            if href and not href.startswith(origin + '/') and not href.startswith('https://doi.org/'):
                errors.append(f'{path.name}: entry link outside expected origins: {href}')
    if expected_entries is not None:
        if len(entry_urls) != len(set(entry_urls)):
            errors.append(f'{path.name}: duplicate Atom entries')
        if set(entry_urls) != set(expected_entries):
            errors.append(f'{path.name}: Atom entry coverage does not match expected publications')
        for entry, entry_url in zip(entries, entry_urls):
            if entry_url not in expected_entries:
                continue
            try:
                expected_date = parse_timestamp(expected_entries[entry_url])
            except (TypeError, ValueError):
                errors.append(f'{path.name}: invalid expected publication date for {entry_url}')
                continue
            for field in ('published', 'updated'):
                value = entry.findtext(f'{ATOM}{field}')
                try:
                    actual_date = parse_timestamp(value)
                except (TypeError, ValueError):
                    continue
                if actual_date != expected_date:
                    errors.append(f'{path.name}: entry {field} does not match publication date: {entry_url}')
    return errors


def publication_itemlist_errors(item_list, rendered_urls):
    errors = []
    items = item_list.get('itemListElement', [])
    urls = [item.get('item', {}).get('url') for item in items]
    if len(urls) != len(set(urls)):
        errors.append('ItemList contains duplicate publication URLs')
    if urls != rendered_urls:
        errors.append('ItemList URLs and order do not match rendered publication links')
    return errors


def mathjax_errors(page):
    scripts = [script for script in page.scripts
               if 'mathjax' in script.get('src', '').lower()
               or script.get('id', '').lower() == 'mathjax-script']
    if page.metas.get('fhr:math') == 'true':
        if len(scripts) != 1 or scripts[0].get('src') != MATHJAX_URL:
            return ['math opt-in must load exactly the pinned MathJax script']
        if scripts[0].get('integrity') != MATHJAX_INTEGRITY or scripts[0].get('crossorigin') != 'anonymous':
            return ['MathJax must have the verified integrity digest and anonymous CORS']
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
        require(path == '/' or path in ('/publications/', '/resources/', '/guide/', '/table-builder/') or path.startswith('/publication/'), f'Unexpected sitemap page: {url}')
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
    publications_page = html[root / 'publications/index.html']
    rendered_publication_urls = [
        urljoin(ORIGIN + '/publications/', href)
        for href in publications_page.links
        if urlsplit(urljoin(ORIGIN + '/publications/', href)).path.startswith('/publication/')
    ]
    item_lists = [b for b in publications_jsonld if b.get('@type') == 'ItemList']
    require(bool(item_lists), 'Publications page must include an ItemList JSON-LD')
    publication_pages = sorted(p for p in html if p.relative_to(root).as_posix().startswith('publication/'))
    for item_list in item_lists:
        items = item_list.get('itemListElement', [])
        require(len(items) == len(publication_pages),
                f'ItemList covers {len(items)} of {len(publication_pages)} publication pages')
        positions = [item.get('position') for item in items]
        require(positions == list(range(1, len(items) + 1)), 'ItemList positions must be sequential')
        for error in publication_itemlist_errors(item_list, rendered_publication_urls):
            errors.append(f'publications/index.html: {error}')
        for item in items:
            article = item.get('item', {})
            require(article.get('@type') == 'ScholarlyArticle', 'ItemList entries must be ScholarlyArticle')
            require(bool(article.get('name')), 'ItemList article missing a name')
            require(str(article.get('url', '')).startswith(ORIGIN), 'ItemList article url outside the production origin')
            require('isPartOf' in article, 'ItemList article missing a container')
    publication_entries = {}
    for file, page in html.items():
        relative = file.relative_to(root).as_posix()
        types = {block.get('@type') for block in page.json_ld}
        if relative.startswith('publication/'):
            require('ScholarlyArticle' in types, f'{relative}: missing ScholarlyArticle JSON-LD')
            article = next(b for b in page.json_ld if b.get('@type') == 'ScholarlyArticle')
            article_url = article.get('url')
            published_at = page.metas.get('article:published_time')
            if article_url:
                publication_entries[article_url] = published_at
            require(bool(article.get('identifier', {}).get('value')), f'{relative}: ScholarlyArticle missing DOI identifier')
            require(bool(article.get('datePublished')), f'{relative}: ScholarlyArticle missing datePublished')
            require(bool(article.get('author')), f'{relative}: ScholarlyArticle missing authors')
            errors.extend(jsonld_container_errors(article, relative))
            require(any('citation_title' == key for key in page.metas),
                    f'{relative}: missing Highwire citation_title meta')
            require(any('citation_author' == key for key in page.metas),
                    f'{relative}: missing Highwire citation_author meta')
        if relative in ('terms/index.html', 'sitemap/index.html', '404.html'):
            require(page.metas.get('robots', '').startswith('noindex'),
                    f'{relative}: utility page should be noindex')
    errors.extend(feed_errors(
        root / 'publications/feed.xml',
        ORIGIN + '/publications/feed.xml',
        publication_entries,
    ))
    errors.extend(feed_errors(root / 'feed.xml', ORIGIN + '/feed.xml'))
    require((root / 'publications/feed.xml').is_file(), 'Missing publications Atom feed')
    require((root / 'feed.xml').is_file(), 'Missing site Atom feed')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Checked {len(html)} HTML pages, local links/assets, {len(urls)} sitemap URLs, SEO and identity metadata.')
    return 0

if __name__ == '__main__':
    sys.exit(check(Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()))
