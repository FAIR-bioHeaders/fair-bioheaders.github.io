#!/usr/bin/env python3
"""Smoke-check the deployed site.

A successful source build does not prove the live endpoints are current, so run
this after a GitHub Pages deployment. It retries for propagation and then:

- requires the homepage, ``sitemap.xml``, ``robots.txt``, and both Atom feeds to
  return 200 with the expected content type;
- parses the live XML sitemap: production origin, unique URLs, only the intended
  indexable pages, and a 200 response for every target;
- confirms ``robots.txt`` advertises the sitemap.

Usage::

    python3 scripts/check_deployed.py [origin] [--attempts N] [--delay S]

Defaults to the production origin with 6 attempts and 20s between them.
"""
import argparse
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

DEFAULT_ORIGIN = 'https://fair-bioheaders.github.io'
SM_NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
INDEXABLE = ('/', '/publications/', '/resources/', '/guide/', '/table-builder/')
SITEMAP_PREFIX = '/publication/'


def fetch(url, attempts, delay):
    """Return (status, content_type, body) retrying while the resource is absent."""
    last = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'fhr-site-smoke/1.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, response.headers.get('Content-Type', ''), response.read()
        except urllib.error.HTTPError as error:
            last = error
        except (urllib.error.URLError, TimeoutError) as error:
            last = error
        if attempt < attempts:
            print(f'  retry {attempt}/{attempts} for {url}: {last}', flush=True)
            time.sleep(delay)
    raise SystemExit(f'FAIL: {url} unavailable after {attempts} attempts: {last}')


def check(origin, attempts, delay):
    origin = origin.rstrip('/')
    errors = []
    pages = {}

    for path in ('/', '/sitemap.xml', '/robots.txt', '/publications/feed.xml', '/feed.xml'):
        status, content_type, body = fetch(origin + path, attempts, delay)
        pages[path] = body
        if status != 200:
            errors.append(f'{path}: expected 200, got {status}')
        if path.endswith('.xml') and 'xml' not in content_type.lower():
            errors.append(f'{path}: expected XML content type, got {content_type}')

    try:
        sitemap = ET.fromstring(pages['/sitemap.xml'])
    except ET.ParseError as error:
        errors.append(f'/sitemap.xml: invalid XML ({error})')
        sitemap = None

    urls = []
    if sitemap is not None:
        urls = [loc.text for loc in sitemap.findall(f'.//{SM_NS}loc')]
        if len(urls) != len(set(urls)):
            errors.append('sitemap contains duplicate URLs')
        for url in urls:
            parts = urlsplit(url)
            if f'{parts.scheme}://{parts.netloc}' != origin:
                errors.append(f'sitemap URL outside the production origin: {url}')
                continue
            if not (parts.path in INDEXABLE or parts.path.startswith(SITEMAP_PREFIX)):
                errors.append(f'sitemap has unexpected page: {url}')
                continue
            status, _, _ = fetch(url, attempts, delay)
            if status != 200:
                errors.append(f'sitemap target not reachable: {url} ({status})')
        sitemap_paths = {urlsplit(url).path for url in urls}
        for path in INDEXABLE:
            if path not in sitemap_paths:
                errors.append(f'sitemap is missing required page: {path}')

    sitemap_url = origin + '/sitemap.xml'
    if sitemap_url not in pages['/robots.txt'].decode('utf-8', 'replace'):
        errors.append('/robots.txt does not advertise the sitemap URL')

    if errors:
        print('\n'.join(f'FAIL: {e}' for e in errors), file=sys.stderr)
        return 1
    print(f'Deployed smoke check passed: {len(urls)} sitemap URLs, feeds, and robots all reachable.')
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('origin', nargs='?', default=DEFAULT_ORIGIN)
    parser.add_argument('--attempts', type=int, default=6)
    parser.add_argument('--delay', type=float, default=20)
    args = parser.parse_args(argv)
    return check(args.origin, args.attempts, args.delay)


if __name__ == '__main__':
    sys.exit(main())
