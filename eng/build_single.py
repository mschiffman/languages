#!/usr/bin/env python3
"""
Build self-contained offline story files straight from the site pages in youtube/.

Each youtube/<name>.html is a thin page: markup + story data, with the shared
CSS/JS (assets/css/yt*.css, assets/js/*.js) loaded from the site. This script
collapses one into ONE .html that opens offline (tablet / SD card):

  - inlines the shared stylesheet(s), scripts and offline fonts (eng/offline_fonts.css)
  - embeds every image and audio file the story uses as base64 (EMBED map)
  - drops Google Analytics and the Google Fonts links

Usage (from anywhere):
    python eng/build_single.py                      build every page in youtube/
    python eng/build_single.py 2.7_clean 2.8_do     build just these
    python eng/build_single.py --no-nav 2.7_clean   leave out the lessons menu
    python eng/build_single.py --out some/dir       write somewhere else

Output goes to eng/single/<name>.html (same file names as youtube/, so the
lessons menu links between the single files keep working).

Media lookup
  images : the page's IMG_DIR, relative to the site root (e.g. img/ytstory/2.7_clean/)
  audio  : eng/yt/<story>/NN.mp3, otherwise downloaded from the page's AUD_DIR
           and cached there
"""
import argparse
import base64
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # site root (the "languages" folder)
ENG = ROOT / "eng"
YOUTUBE = ROOT / "youtube"
DEFAULT_OUT = ENG / "single"
FONTS_CSS = ENG / "offline_fonts.css"
AUDIO_CACHE = ENG / "yt"

MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif",
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav",
}


class BuildError(Exception):
    pass


def data_uri(path: Path) -> str:
    mime = MIME[path.suffix.lower()]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def js_const(html: str, name: str, default=None) -> str:
    m = re.search(rf'const\s+{name}\s*=\s*"([^"]*)"', html)
    if m:
        return m.group(1)
    if default is not None:
        return default
    raise BuildError(f"page does not define {name}")


def expected_media(html: str, img_ext: str, aud_ext: str):
    """Return (image file names, audio file names) the page will ask for."""
    if "const pages" in html:  # story reader: pages -> sentences -> [text, audio#]
        imgs = sorted({int(n) for n in re.findall(r"\bimg:\s*(\d+)", html)})
        auds = sorted({
            int(n)
            for n in re.findall(  # text may be "double" or 'single' quoted
                r'''\[\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*(\d+)\s*\]''', html
            )
        })
        gaps = sorted(set(range(1, max(auds, default=0) + 1)) - set(auds))
        if gaps:  # numbers "run 1..N in order"; a gap usually means the parse missed a phrase
            print(f"  warning: no phrase uses audio number(s) {gaps}")
        return ([f"{n}.{img_ext}" for n in imgs], [f"{n:02d}.{aud_ext}" for n in auds])
    if "const LETTERS" in html:  # alphabet: 1 image per letter, name+word audio each
        n = len(re.findall(r'\bL:\s*"', html))
        return ([f"{i:02d}.jpg" for i in range(1, n + 1)],
                [f"{i:02d}.mp3" for i in range(1, 2 * n + 1)])
    raise BuildError("no `const pages` or `const LETTERS` data found - not a story page?")


def find_audio(url_name: str, slug: str, aud_dir: str) -> Path:
    name = url_name.split("?")[0]  # AUD_EXT may carry a cache-buster, e.g. "mp3?v=123"
    cached = AUDIO_CACHE / slug / name
    if cached.is_file():
        return cached
    if aud_dir.startswith("http"):
        dest = AUDIO_CACHE / slug / name
        try:
            req = urllib.request.Request(aud_dir + url_name, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:  # site 403s the default Python UA
                data = r.read()
        except Exception as e:  # noqa: BLE001 - report any network problem plainly
            raise BuildError(
                f"audio {name} not found locally and download failed ({aud_dir}{url_name}): {e}\n"
                f"       put it in {AUDIO_CACHE / slug}"
            )
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        print(f"    downloaded {name}")
        return dest
    raise BuildError(f"audio {name} not found (looked in {AUDIO_CACHE / slug})")


def collect_embed(html: str) -> dict:
    img_dir = js_const(html, "IMG_DIR")
    aud_dir = js_const(html, "AUD_DIR")
    img_ext = js_const(html, "IMG_EXT", "jpg")
    aud_ext = js_const(html, "AUD_EXT", "mp3")
    imgs, auds = expected_media(html, img_ext, aud_ext)
    slug = aud_dir.rstrip("/").rsplit("/", 1)[-1]

    embed = {}
    missing = []
    for name in imgs:
        p = ROOT / img_dir.lstrip("/") / name
        if p.is_file():
            embed[img_dir + name] = data_uri(p)
        else:
            missing.append(str(p))
    for name in auds:
        embed[aud_dir + name] = data_uri(find_audio(name, slug, aud_dir))
    if missing:
        raise BuildError("missing images:\n       " + "\n       ".join(missing))
    return embed


def inline_script(src_code: str) -> str:
    return "<script>\n" + src_code.replace("</script", "<\\/script") + "\n</script>"


def site_file(url: str) -> Path:
    p = ROOT / url.lstrip("/")
    if not p.is_file():
        raise BuildError(f"{url} referenced by the page but {p} does not exist")
    return p


def build(page: Path, out_dir: Path, nav: bool) -> Path:
    html = page.read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", html, re.S)
    head = re.search(r"<head>(.*?)</head>", html, re.S)
    body = re.search(r"<body>(.*?)</body>", html, re.S)
    if not (title and head and body):
        raise BuildError("expected <title>, <head> and <body>")

    embed = collect_embed(html)

    # ---- <style>: offline fonts + every local stylesheet the page links ----
    css_urls = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/[^"]+)"', head.group(1))
    css_urls += re.findall(r'<link[^>]*href="(/[^"]+\.css)"[^>]*rel="stylesheet"', head.group(1))
    css = FONTS_CSS.read_text(encoding="utf-8")
    for url in css_urls:
        css += "\n" + site_file(url).read_text(encoding="utf-8")

    favicon = ""
    icon = re.search(r'<link[^>]*href="(/[^"]+\.png)"[^>]*rel="icon"', head.group(1)) or \
        re.search(r'<link[^>]*rel="icon"[^>]*href="(/[^"]+\.png)"', head.group(1))
    if icon and site_file(icon.group(1)):
        favicon = f'\n    <link rel="icon" href="{data_uri(site_file(icon.group(1)))}" />'

    # ---- <body>: keep the markup; inline local scripts; EMBED goes before the first script ----
    def replace_script(m):
        attrs, code = m.group(1), m.group(2)
        src = re.search(r'src="([^"]+)"', attrs)
        if src:
            url = src.group(1)
            if url.startswith("http"):
                return ""  # external (analytics etc.) - useless offline
            if not nav and "nav-" in url:
                return ""
            return inline_script(site_file(url).read_text(encoding="utf-8"))
        return inline_script(code.strip("\n"))

    body_html = re.sub(r"<script\b([^>]*)>(.*?)</script>", replace_script, body.group(1), flags=re.S)
    embed_js = inline_script("const EMBED = " + json.dumps(embed, separators=(",", ":")) + ";")
    first = body_html.index("<script>")
    body_html = body_html[:first] + embed_js + "\n    " + body_html[first:]

    out = (
        '<!doctype html>\n<html lang="en">\n  <head>\n'
        '    <meta charset="UTF-8" />\n'
        '    <meta\n      name="viewport"\n'
        '      content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"\n'
        "    />\n"
        f"    <title>{title.group(1)}</title>{favicon}\n"
        f"    <style>\n{css}\n    </style>\n"
        f"  </head>\n  <body>{body_html}</body>\n</html>\n"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / page.name
    dest.write_text(out, encoding="utf-8", newline="\n")
    return dest


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Build offline single-file stories from youtube/*.html")
    ap.add_argument("names", nargs="*", help="story names, e.g. 2.7_clean (default: all)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    ap.add_argument("--no-nav", action="store_true", help="leave out the lessons menu")
    args = ap.parse_args()

    if args.names:
        pages = []
        for n in args.names:
            p = Path(n)
            if not p.is_file():
                p = YOUTUBE / (n if n.endswith(".html") else n + ".html")
            if not p.is_file():
                print(f"error: no such page: {n}")
                return 1
            pages.append(p)
    else:
        pages = sorted(YOUTUBE.glob("*.html"))

    failed = 0
    for page in pages:
        print(f"{page.name}")
        try:
            dest = build(page, args.out, nav=not args.no_nav)
            print(f"  -> {dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
        except BuildError as e:
            failed += 1
            print(f"  FAILED: {e}")
    print(f"\n{len(pages) - failed} built, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
