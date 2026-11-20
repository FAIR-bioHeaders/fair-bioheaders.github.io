"""Bounded, authority-only downloads for explicit maintainer snapshot refreshes.

MPL-2.0; see LICENSE. Normal generation and CI remain offline.
"""
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, build_opener

MAX_BYTES = 8 * 1024 * 1024


def approved_url(url):
    parts = urlsplit(url)
    host = (parts.hostname or '').lower()
    first = parts.path.split('/')[1].lower() if '/' in parts.path else ''
    authority = ((host in {'raw.githubusercontent.com', 'github.com'} and first == 'fair-bioheaders')
                 or (host == 'w3id.org' and first == 'fair-bioheaders'))
    if (parts.scheme != 'https' or parts.username or parts.password
            or parts.port not in (None, 443) or not authority):
        raise ValueError(f'Unapproved snapshot authority: {url}')
    return url


class AuthorityRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        approved_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def snapshot_target(directory, name):
    root = Path(directory).resolve()
    target = (root / name).resolve()
    if target == root or not target.is_relative_to(root):
        raise ValueError(f'Snapshot destination escapes its directory: {name}')
    return target


def fetch_bytes(url):
    approved_url(url)
    with build_opener(AuthorityRedirects()).open(url, timeout=60) as response:
        approved_url(response.geturl())
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError(f'Snapshot exceeds {MAX_BYTES} bytes: {url}')
    return data
