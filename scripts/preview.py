#!/usr/bin/env python3
"""Serve _site locally, including GitHub Pages' extensionless HTML URLs."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='_site', **kwargs)

    def translate_path(self, path):
        target = super().translate_path(path)
        if not Path(target).exists() and Path(target + '.html').is_file():
            return target + '.html'
        return target

class PreviewServer(ThreadingHTTPServer):
    # Parallel browsers open bursts of connections for fonts, images, and scripts.
    # A small listen backlog can reset those requests before a handler accepts them.
    request_queue_size = 128

if __name__ == '__main__':
    print('Preview: http://127.0.0.1:4000', flush=True)
    PreviewServer(('127.0.0.1', 4000), Handler).serve_forever()
