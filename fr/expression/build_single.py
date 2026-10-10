#!/usr/bin/env python3
"""
Build self-contained offline copies of the expression flashcard pages (fr/expression/n-*.html).

Each n-<topic>.html is a thin page: header + a `categories` data block, with the cards
rendered by assets/js/expression-flash.js. This script collapses one into ONE .html that
opens offline (tablet / SD card / email attachment):

  - every card's audio (AUD_DIR + 01.mp3, 02.mp3, ... one per card, in reading order) is
    embedded as base64 in an EMBED map, which expression-flash.js reads before the URL
  - the shared stylesheet and card script (assets/css/pimsleur.css, assets/js/expression-flash.js)
    are inlined
  - the Tailwind CDN script is inlined (downloaded once, cached) so the utility classes work offline
  - the Google Fonts <link> is replaced by base64 woff2 @font-face rules, subset by Google to
    just the characters the page uses (downloaded once per page, cached)
  - the category menu (assets/js/nav-expression-flash.js) is left out: its links point at
    other pages that aren't in the offline file
  - the favicon is embedded; Google Analytics is dropped

Usage (from anywhere):
    python fr/expression/build_single.py                  build every n-*.html in fr/expression/
    python fr/expression/build_single.py n-refusal        build just these
    python fr/expression/build_single.py --out some/dir   write somewhere else

Output goes to fr/expression/single/<name>.html.

Audio lookup, per file:  media/lessons/Expressions/<topic>/NN.mp3 (the local copy), then
fr/expression/.build_cache/audio/<topic>/NN.mp3, otherwise downloaded from the page's AUD_DIR
into that cache. Network is only needed the first time (audio, Tailwind, fonts).
"""
import argparse
import base64
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # site root (the "LANGUAGES" folder)
MEDIA = ROOT / "media" / "lessons" / "Expressions"
DEFAULT_OUT = HERE / "single"
CACHE = HERE / ".build_cache"

TAILWIND_URL = "https://cdn.tailwindcss.com"
# Google serves woff2 only to browsers it recognises; the audio host 403s the default Python UA
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

MIME = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


class BuildError(Exception):
    pass


def data_uri(path: Path) -> str:
    return f"data:{MIME[path.suffix.lower()]};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def cached(key: str, url: str) -> bytes:
    """Download url once; later runs read CACHE/<key>."""
    f = CACHE / key
    if not f.is_file():
        try:
            data = fetch(url)
        except Exception as e:  # noqa: BLE001 - report any network problem plainly
            raise BuildError(f"download failed ({url}): {e}")
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(data)
        print(f"    downloaded {key}")
    return f.read_bytes()


def inline_script(code: str) -> str:
    return "<script>\n" + code.replace("</script", "<\\/script") + "\n</script>"


def local_file(ref: str, page: Path) -> Path:
    """Path of a local href/src: '/x' is relative to the site root, anything else to the page."""
    p = (ROOT / ref.lstrip("/")) if ref.startswith("/") else (page.parent / ref)
    p = p.resolve()
    if not p.is_file():
        raise BuildError(f"{ref} referenced by the page but {p} does not exist")
    return p


def js_const(html: str, name: str) -> str:
    m = re.search(rf'const\s+{name}\s*=\s*"([^"]*)"', html)
    if not m:
        raise BuildError(f"page does not define {name}")
    return m.group(1)


# ---------------------------------------------------------------- audio
def card_count(html: str) -> int:
    """Number of cards in `const categories = [...]`; each card row starts with a "string",."""
    block = re.search(r"const\s+categories\s*=\s*\[(.*?)\n\s*\];", html, re.S)
    if not block:
        raise BuildError("no `const categories` data found - not an expression flashcard page?")
    return len(re.findall(r'\[\s*"(?:[^"\\]|\\.)*"\s*,', block.group(1)))


def collect_embed(html: str) -> dict:
    """{ audio URL the page will request: data URI } for every card."""
    aud_dir = js_const(html, "AUD_DIR")
    aud_ext = js_const(html, "AUD_EXT")
    topic = aud_dir.rstrip("/").rsplit("/", 1)[-1]
    n = card_count(html)
    if not n:
        raise BuildError("`categories` has no cards")

    embed = {}
    for i in range(1, n + 1):
        url = f"{aud_dir}{i:02d}.{aud_ext}"  # expression-flash.js numbers cards 01, 02, ...
        name = f"{i:02d}.{aud_ext}".split("?")[0]  # AUD_EXT may carry a cache-buster, e.g. "mp3?v=123"
        local = MEDIA / topic / name
        if local.is_file():
            embed[url] = data_uri(local)
            continue
        if not aud_dir.startswith("http"):
            raise BuildError(f"audio {name} not found (looked in {local.parent})")
        key = f"audio/{topic}/{name}"
        cached(key, url)
        embed[url] = data_uri(CACHE / key)
    return embed


# ---------------------------------------------------------------- fonts
def embedded_fonts(html: str, link_href: str) -> str:
    """@font-face CSS for the families in a Google Fonts link, subset to the characters in html."""
    text = "".join(sorted({c for c in html if c.isprintable() and not c.isspace()} | set(" ")))
    families = re.findall(r"family=([^&]+)", link_href.replace("&amp;", "&"))
    css_parts = []
    for fam in families:
        url = ("https://fonts.googleapis.com/css2?family=" + fam
               + "&display=swap&text=" + urllib.parse.quote(text))
        key = "font-" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".css"
        css = cached(key, url).decode("utf-8")

        def to_data(m):
            font = cached("woff2-" + hashlib.sha1(m.group(1).encode()).hexdigest()[:16] + ".woff2", m.group(1))
            return "url(data:font/woff2;base64," + base64.b64encode(font).decode("ascii") + ")"

        css_parts.append(re.sub(r"url\((https://[^)]+)\)", to_data, css))
    return "\n".join(css_parts)


# ---------------------------------------------------------------- build
def build(page: Path, out_dir: Path) -> Path:
    html = page.read_text(encoding="utf-8-sig")

    embed = collect_embed(html)

    # ---- Google Fonts: <link href="https://fonts.googleapis.com/css2?..." rel="stylesheet"> ----
    fonts_css = ""
    link = re.search(r'<link\b[^>]*href="(https://fonts\.googleapis\.com/css2\?[^"]+)"[^>]*>', html)
    if link:
        fonts_css = embedded_fonts(html, link.group(1))
    html = re.sub(r'<link\b[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*', "", html)

    # ---- local stylesheets (assets/css/pimsleur.css) -> <style>, with the fonts first ----
    def stylesheet(m):
        return "<style>\n" + local_file(m.group(1), page).read_text(encoding="utf-8-sig") + "\n</style>"

    html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="(?!https?:)([^"]+)"[^>]*>', stylesheet, html)
    html = re.sub(r'<link\b[^>]*href="(?!https?:)([^"]+\.css)"[^>]*rel="stylesheet"[^>]*>', stylesheet, html)
    if fonts_css:
        html = html.replace("</head>", f"<style>\n/* embedded fonts */\n{fonts_css}\n</style>\n</head>", 1)

    # ---- Tailwind CDN -> inline copy ----
    tw = re.search(r'<script\b[^>]*src="https://cdn\.tailwindcss\.com[^"]*"[^>]*>\s*</script>', html)
    if tw:
        code = cached("tailwind.js", TAILWIND_URL).decode("utf-8")
        html = html.replace(tw.group(0), inline_script(code), 1)

    # ---- Google Analytics: external tag + the inline dataLayer/gtag snippet ----
    html = re.sub(r'<script\b[^>]*src="https://www\.googletagmanager\.com[^"]*"[^>]*>\s*</script>\s*', "", html)
    html = re.sub(r"<script>(?:(?!</script>).)*?window\.dataLayer(?:(?!</script>).)*?</script>\s*", "", html, flags=re.S)
    html = re.sub(r"\s*<!-- Google tag \(gtag\.js\) -->", "", html)

    # ---- local scripts: drop the category menu (nav-*.js), inline the rest ----
    def script(m):
        if "/nav-" in m.group(1) or m.group(1).startswith("nav-"):
            return ""
        return inline_script(local_file(m.group(1), page).read_text(encoding="utf-8-sig"))

    html = re.sub(r'[ \t]*<script\b[^>]*src="(?!https?:)([^"]+)"[^>]*>\s*</script>\n?', script, html)

    # ---- EMBED goes before the page's first <body> script (the categories data) ----
    body = html.index("<body")
    first = html.index("<script", body)
    embed_js = inline_script("const EMBED = " + json.dumps(embed, separators=(",", ":")) + ";")
    html = html[:first] + embed_js + "\n    " + html[first:]

    # ---- favicon ----
    def favicon(m):
        f = ROOT / m.group(2).lstrip("/")
        return f'{m.group(1)}"{data_uri(f)}"' if f.is_file() else m.group(0)

    html = re.sub(r'(<link\b[^>]*href=)"(/[^"]+\.png)"', favicon, html)

    left = sorted(set(re.findall(r'(?:src|href)="(https?://[^"]+)"', html)))
    if left:
        print("  warning: still references the network: " + ", ".join(left))

    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / page.name
    dest.write_text(html, encoding="utf-8", newline="\n")
    print(f"  {len(embed)} audio files embedded")
    return dest


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Build offline single-file pages from fr/expression/n-*.html")
    ap.add_argument("names", nargs="*", help="page names, e.g. n-refusal (default: all n-*.html)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    args = ap.parse_args()

    if args.names:
        pages = []
        for n in args.names:
            p = Path(n)
            if not p.is_file():
                p = HERE / (n if n.endswith(".html") else n + ".html")
            if not p.is_file():
                print(f"error: no such page: {n}")
                return 1
            pages.append(p)
    else:
        pages = sorted(HERE.glob("n-*.html"))

    failed = 0
    for page in pages:
        print(page.name)
        try:
            dest = build(page, args.out)
            print(f"  -> {dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
        except BuildError as e:
            failed += 1
            print(f"  FAILED: {e}")
    print(f"\n{len(pages) - failed} built, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
