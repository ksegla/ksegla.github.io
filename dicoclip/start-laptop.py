"""Serve this folder on this laptop only; no Python packages are required."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.webmanifest': 'application/manifest+json',
        '.js': 'application/javascript',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    print('Open http://localhost:8000 in Chrome on THIS laptop.')
    print('Keep this window open for the first visit. Ctrl+C stops the server.')
    try:
        with ThreadingHTTPServer(('127.0.0.1', 8000), partial(Handler, directory=str(ROOT))) as server:
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except OSError as error:
        print(f'Could not start the local server: {error}')
