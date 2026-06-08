#!/usr/bin/env python3
import re
import sys
import urllib.request

handle = sys.argv[1] if len(sys.argv) > 1 else "@MycoDAO"
url = f"https://www.youtube.com/{handle.lstrip('@')}" if handle.startswith("@") else handle
if "youtube.com" not in url:
    url = f"https://www.youtube.com/@{handle.lstrip('@')}"

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=25) as r:
    html = r.read().decode("utf-8", errors="ignore")

for pat in (
    r'"channelId":"(UC[^"]+)"',
    r'"externalId":"(UC[^"]+)"',
    r'channel/(UC[^"/]+)',
):
    m = re.search(pat, html)
    if m:
        print(m.group(1))
        sys.exit(0)

print("NOT_FOUND", file=sys.stderr)
sys.exit(1)
