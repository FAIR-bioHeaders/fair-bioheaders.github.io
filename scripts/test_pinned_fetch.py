"""Snapshot refresh rejects local/foreign authorities, redirects and unbounded bytes."""
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from urllib.request import Request
import pinned_fetch as fetch

URL = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.6.0/fhr.json'

class Response(io.BytesIO):
    def geturl(self):
        return URL

class PinnedFetchChecks(unittest.TestCase):
    def test_every_current_provenance_fetch_url_is_approved(self):
        for folder in ('schema-snapshots', 'mapping-snapshots'):
            data = json.loads((Path(__file__).parent / folder / 'provenance.json').read_text())
            def walk(node):
                if isinstance(node, dict):
                    if 'fetchUrl' in node:
                        self.assertEqual(fetch.approved_url(node['fetchUrl']), node['fetchUrl'])
                    for value in node.values():
                        walk(value)
                elif isinstance(node, list):
                    for value in node:
                        walk(value)
            walk(data)

    def test_file_http_credentials_and_foreign_origins_are_rejected_before_open(self):
        with patch.object(fetch, 'build_opener') as opener:
            for url in ('file:///etc/passwd', URL.replace('https:', 'http:'),
                        URL.replace('raw.githubusercontent.com', 'raw.githubusercontent.com.evil.test'),
                        URL.replace('/FAIR-bioHeaders/', '/other-owner/'),
                        URL.replace('https://', 'https://user:password@')):
                with self.subTest(url=url), self.assertRaises(ValueError):
                    fetch.fetch_bytes(url)
            opener.assert_not_called()

    def test_redirect_cannot_downgrade_or_leave_the_authority(self):
        handler = fetch.AuthorityRedirects()
        for url in ('file:///etc/passwd', 'http://w3id.org/fair-bioheaders/fhr/v0.6.0',
                    'https://example.test/private'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                handler.redirect_request(Request(URL), None, 302, 'Found', {}, url)
        request = handler.redirect_request(Request('https://w3id.org/fair-bioheaders/fhr/v0.6.0'),
                                           None, 302, 'Found', {}, URL)
        self.assertEqual(request.full_url, URL)

    def test_bounded_bytes_and_oversized_response(self):
        with patch.object(fetch, 'build_opener') as opener:
            opener.return_value.open.return_value = Response(b'abc')
            self.assertEqual(fetch.fetch_bytes(URL), b'abc')
            with patch.object(fetch, 'MAX_BYTES', 3):
                opener.return_value.open.return_value = Response(b'abcd')
                with self.assertRaisesRegex(ValueError, 'exceeds'):
                    fetch.fetch_bytes(URL)

    def test_destination_cannot_escape_even_through_a_symlink(self):
        with TemporaryDirectory() as root, TemporaryDirectory() as outside:
            self.assertEqual(fetch.snapshot_target(root, 'notes/a.json'), Path(root).resolve() / 'notes/a.json')
            (Path(root) / 'link').symlink_to(outside, target_is_directory=True)
            for name in ('../a.json', outside + '/a.json', 'link/a.json', ''):
                with self.subTest(name=name), self.assertRaises(ValueError):
                    fetch.snapshot_target(root, name)
