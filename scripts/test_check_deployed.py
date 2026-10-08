"""Regression coverage for the post-deploy smoke check (offline, mocked fetch)."""
import unittest
from unittest import mock

import check_deployed

ORIGIN = 'https://fair-bioheaders.github.io'
SITEMAP = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    f'<url><loc>{ORIGIN}/</loc></url>'
    f'<url><loc>{ORIGIN}/publications/</loc></url>'
    f'<url><loc>{ORIGIN}/resources/</loc></url>'
    f'<url><loc>{ORIGIN}/guide/</loc></url>'
    f'<url><loc>{ORIGIN}/publication/x</loc></url>'
    '</urlset>'
)
ROBOTS = f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n'


def fake_fetch(overrides=None):
    pages = {
        '/': (200, 'text/html', b'<html></html>'),
        '/sitemap.xml': (200, 'application/xml', SITEMAP.encode()),
        '/robots.txt': (200, 'text/plain', ROBOTS.encode()),
        '/publications/feed.xml': (200, 'application/atom+xml', b'<feed/>'),
        '/feed.xml': (200, 'application/atom+xml', b'<feed/>'),
        '/publications/': (200, 'text/html', b'<html></html>'),
        '/resources/': (200, 'text/html', b'<html></html>'),
        '/guide/': (200, 'text/html', b'<html></html>'),
        '/publication/x': (200, 'text/html', b'<html></html>'),
    }
    if overrides:
        pages.update(overrides)

    def fetch(url, attempts, delay):
        path = url[len(ORIGIN):]
        if path not in pages:
            raise SystemExit(f'unexpected fetch {url}')
        return pages[path]

    return fetch


class DeploySmokeChecks(unittest.TestCase):
    def run_check(self, fetch, origin=ORIGIN):
        with mock.patch.object(check_deployed, 'fetch', fetch):
            return check_deployed.check(origin, attempts=1, delay=0)

    def test_healthy_deployment_passes(self):
        self.assertEqual(self.run_check(fake_fetch()), 0)

    def test_missing_endpoint_is_reported(self):
        def fetch(url, attempts, delay):
            if url.endswith('/feed.xml'):
                return (404, 'text/html', b'')
            return fake_fetch()(url, attempts, delay)
        self.assertEqual(self.run_check(fetch), 1)

    def test_sitemap_duplicate_is_reported(self):
        dupe = SITEMAP.replace(
            f'<url><loc>{ORIGIN}/publications/</loc></url>',
            f'<url><loc>{ORIGIN}/</loc></url>')
        self.assertEqual(self.run_check(fake_fetch({'/sitemap.xml': (200, 'application/xml', dupe.encode())})), 1)

    def test_sitemap_foreign_origin_is_reported(self):
        foreign = SITEMAP.replace(f'{ORIGIN}/publication/x', 'https://evil.example/')
        self.assertEqual(self.run_check(fake_fetch({'/sitemap.xml': (200, 'application/xml', foreign.encode())})), 1)

    def test_sitemap_unexpected_page_is_reported(self):
        extra = SITEMAP.replace('</urlset>', f'<url><loc>{ORIGIN}/terms/</loc></url></urlset>')
        self.assertEqual(self.run_check(fake_fetch({'/sitemap.xml': (200, 'application/xml', extra.encode())})), 1)

    def test_sitemap_missing_required_page_is_reported(self):
        missing = SITEMAP.replace(f'<url><loc>{ORIGIN}/resources/</loc></url>', '')
        self.assertEqual(self.run_check(fake_fetch({'/sitemap.xml': (200, 'application/xml', missing.encode())})), 1)

    def test_robots_without_sitemap_is_reported(self):
        self.assertEqual(self.run_check(fake_fetch({'/robots.txt': (200, 'text/plain', b'User-agent: *')})), 1)

    def test_sitemap_target_not_reachable_is_reported(self):
        self.assertEqual(self.run_check(fake_fetch({'/publication/x': (503, 'text/html', b'')})), 1)


if __name__ == '__main__':
    unittest.main()
