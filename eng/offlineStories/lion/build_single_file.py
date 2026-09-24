#!/usr/bin/env python3
"""
Collapse a reader folder into ONE self-contained .html
(images + audio embedded, so it opens offline with no sibling files).

Usage:
    python3 build_single_file.py  <reader_folder>  [output.html]

The folder must contain index_offline.html (or index.html) plus the media
(1.jpg ... , 01.mp3 ...), either beside it or in img/ and audio/ subfolders.
Any .jpg/.jpeg/.png/.webp/.mp3/.m4a/.wav found is embedded, keyed by its filename.
"""
import sys, os, base64, json, glob

MIME = {".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png",
        ".webp":"image/webp", ".gif":"image/gif",
        ".mp3":"audio/mpeg", ".m4a":"audio/mp4", ".wav":"audio/wav",
        ".ogg":"audio/ogg"}

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    folder = sys.argv[1].rstrip("/")
    out = sys.argv[2] if len(sys.argv) > 2 else folder + "/reader-single.html"

    page_html = os.path.join(folder, "index_offline.html")
    if not os.path.exists(page_html):
        page_html = os.path.join(folder, "index.html")
    html = open(page_html, encoding="utf-8").read()

    embed = {}
    total = 0
    # media may sit next to index.html or in img/ and audio/ subfolders
    paths = glob.glob(os.path.join(folder, "*"))
    for sub in ("img", "audio"):
        paths += glob.glob(os.path.join(folder, sub, "*"))
    for path in sorted(paths):
        ext = os.path.splitext(path)[1].lower()
        if ext not in MIME:
            continue
        data = open(path, "rb").read()
        total += len(data)
        embed[os.path.basename(path)] = (
            f"data:{MIME[ext]};base64," + base64.b64encode(data).decode())
        print(f"  embedded {os.path.basename(path):<12} {len(data)/1024:8.1f} KB")

    if not embed:
        print("No media found in", folder); sys.exit(1)

    js = "const EMBED = " + json.dumps(embed) + ";"
    if "/*__INLINE_ASSETS__*/" in html:
        html = html.replace("const EMBED = {}; /*__INLINE_ASSETS__*/", js)
    else:
        html = html.replace("const EMBED = {};", js)

    open(out, "w", encoding="utf-8").write(html)
    print(f"\nWrote {out}")
    print(f"  {len(embed)} files embedded, ~{total/1024/1024:.1f} MB of media")
    print(f"  final file: {os.path.getsize(out)/1024/1024:.1f} MB")

if __name__ == "__main__":
    main()
