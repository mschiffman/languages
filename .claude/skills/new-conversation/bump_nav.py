"""Bump the nav-conv.js?v= cache-busting tag in every conversation page.

Run from the LANGUAGES root after any change to assets/js/nav-conv.js:

    python -I .claude/skills/new-conversation/bump_nav.py

The version is the current time as YYMMDDHHmm. Files are rewritten byte for
byte apart from the tag (no BOM, line endings kept). single/ is skipped:
the offline copies have no nav.
"""
import datetime
import pathlib
import re

CONV_DIR = pathlib.Path("fr/everyday/conversations")

v = datetime.datetime.now().strftime("%y%m%d%H%M").encode()
n = 0
for p in CONV_DIR.rglob("*.html"):
    if "single" in p.relative_to(CONV_DIR).parts:
        continue
    b = p.read_bytes()
    u = re.sub(rb'nav-conv\.js\?v=[^\s"]+', b"nav-conv.js?v=" + v, b)
    if u != b:
        p.write_bytes(u)
        n += 1
print(f"nav-conv.js?v={v.decode()} in {n} files")
