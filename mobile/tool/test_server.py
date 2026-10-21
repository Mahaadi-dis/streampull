#!/usr/bin/env python3
"""Static file server with HTTP Range support, for the Android smoke test (python's http.server cannot seek, which
yt-dlp's --download-sections needs).

    python3 test_server.py <directory> <port>
"""
import http.server
import os
import re
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get("Range")
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
        if not m:
            return super().send_head()
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else 0
        end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
        if start > end or start >= size:
            self.send_error(416, "Requested Range Not Satisfiable")
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


if __name__ == "__main__":
    root, port = sys.argv[1], int(sys.argv[2])
    os.chdir(root)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
