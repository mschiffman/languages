#!/usr/bin/env python3
"""
SMALL version of build_single.py, for sharing: same pages, audio shrunk to 96 kbps mono.

Build self-contained offline copies of the expression flashcard pages (fr/expression/<topic>.html).

Each <topic>.html is a thin page: header + a `categories` data block, with the cards
rendered by assets/js/expression-flash.js. This script collapses one into ONE .html that
opens offline (tablet / SD card / email attachment):

  - every card's audio (AUD_DIR + 01.mp3, 02.mp3, ... one per card, in reading order) is
    embedded as base64 in an EMBED map, which expression-flash.js reads before the URL
  - the shared stylesheet and card script (assets/css/pimsleur.css, assets/js/expression-flash.js)
    are inlined
  - the Tailwind CDN script (~400 KB runtime compiler) is replaced by the CSS it would generate:
    the standalone Tailwind CLI, same version as the CDN, compiles just the classes used by the page
    and its inlined scripts (CLI downloaded once, cached). If the CLI can't run, the CDN script is
    inlined instead, as before.
  - the Google Fonts <link> is replaced by base64 woff2 @font-face rules, subset by Google to
    just the characters the page uses (downloaded once per page, cached). Google serves a variable
    font as the same file under several weights; each file is embedded once, as one weight range.
  - the audio is re-encoded to 96 kbps mono MP3 with ffmpeg (--kbps N to change, --kbps 0 to embed as-is)
  - the category menu (assets/js/nav-expression-flash.js) is left out: its links point at
    other pages that aren't in the offline file
  - the favicon is embedded; Google Analytics is dropped

Usage (from anywhere):
    python fr/expression/build_single_small.py                  build every flashcard page in fr/expression/
    python fr/expression/build_single_small.py refusal          build just these
    python fr/expression/build_single_small.py --out some/dir   write somewhere else
    python fr/expression/build_single_small.py --kbps 0         embed the original audio untouched

Output goes to fr/expression/single_small/<name>.html.

Audio lookup, per file:  media/lessons/expressions/<topic>/NN.mp3 (the local copy), then
fr/expression/.build_cache/audio/<topic>/NN.mp3, otherwise downloaded from the page's AUD_DIR
into that cache. Network is only needed the first time (audio, Tailwind, fonts).
"""
import argparse
import base64
import hashlib
import json
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # site root (the "LANGUAGES" folder)
MEDIA = ROOT / "media" / "lessons" / "expressions"
DEFAULT_OUT = HERE / "single_small"
CACHE = HERE / ".build_cache"

TAILWIND_URL = "https://cdn.tailwindcss.com"
TAILWIND_CLI = "https://github.com/tailwindlabs/tailwindcss/releases/download/v{ver}/tailwindcss-{plat}"
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


def reencode(src: Path, kbps: int) -> Path:
    """src as a kbps mono MP3, cached next to the downloads; src itself if that wouldn't be smaller."""
    out = CACHE / f"audio-{kbps}k" / src.parent.name / src.name
    if not out.is_file() or out.stat().st_mtime < src.stat().st_mtime:  # redo if re-recorded
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise BuildError("--kbps needs ffmpeg on PATH")
        out.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run([ffmpeg, "-v", "error", "-y", "-i", str(src), "-map_metadata", "-1",
                            "-ac", "1", "-c:a", "libmp3lame", "-b:a", f"{kbps}k", str(out)],
                           capture_output=True, text=True, check=False)
        if r.returncode:
            raise BuildError(f"ffmpeg failed on {src}: {r.stderr.strip()}")
    return out if out.stat().st_size < src.stat().st_size else src


def collect_embed(html: str, kbps: int | None) -> dict:
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
        src = MEDIA / topic / name
        if not src.is_file():
            if not aud_dir.startswith("http"):
                raise BuildError(f"audio {name} not found (looked in {src.parent})")
            key = f"audio/{topic}/{name}"
            cached(key, url)
            src = CACHE / key
        embed[url] = data_uri(reencode(src, kbps) if kbps else src)
    return embed


# ---------------------------------------------------------------- fonts
def embedded_fonts(html: str, link_href: str) -> str:
    """@font-face CSS for the families in a Google Fonts link, subset to the characters in html."""
    # + the spaces expression-flash.js inserts at runtime (U+202F before ! ? ; : », U+00A0 via &nbsp;)
    text = "".join(sorted({c for c in html if c.isprintable() and not c.isspace()} | set("   ")))
    families = re.findall(r"family=([^&]+)", link_href.replace("&amp;", "&"))
    css_parts = []
    for fam in families:
        url = ("https://fonts.googleapis.com/css2?family=" + fam
               + "&display=swap&text=" + urllib.parse.quote(text))
        key = "font-" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".css"
        css = cached(key, url).decode("utf-8")

        # A variable font comes back as one file under each requested weight (Playfair 400/700,
        # Roboto 400/500). Keep one @font-face per file, spanning those weights, so it's embedded once.
        faces = {}
        for block in re.findall(r"@font-face\s*\{[^}]*\}", css):
            src = re.search(r"url\((https://[^)]+)\)", block).group(1)
            style = re.search(r"font-style:\s*(\w+)", block).group(1)
            weight = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
            faces.setdefault((style, src), [block, []])[1].append(weight)

        for (_, src), (block, weights) in faces.items():
            font = cached("woff2-" + hashlib.sha1(src.encode()).hexdigest()[:16] + ".woff2", src)
            w = str(weights[0]) if len(weights) == 1 else f"{min(weights)} {max(weights)}"
            block = re.sub(r"font-weight:\s*\d+", "font-weight: " + w, block)
            css_parts.append(block.replace(src, "data:font/woff2;base64," + base64.b64encode(font).decode("ascii")))
    return "\n".join(css_parts)


# ---------------------------------------------------------------- tailwind
def tailwind_cli(version: str) -> Path:
    """The standalone Tailwind CLI for this machine, downloaded once into the cache."""
    arch = "arm64" if platform.machine().lower() in ("arm64", "aarch64") else "x64"
    plat = {"Windows": f"windows-{arch}.exe", "Darwin": f"macos-{arch}"}.get(platform.system(), f"linux-{arch}")
    key = f"tailwindcss-{version}-{plat}"
    exe = CACHE / key
    cached(key, TAILWIND_CLI.format(ver=version, plat=plat))
    exe.chmod(0o755)
    return exe


def tailwind_css(content: list[Path]) -> str:
    """The CSS the Tailwind CDN would generate for the classes in these files, minified."""
    cdn = cached("tailwind.js", TAILWIND_URL).decode("utf-8")
    m = re.search(r"tailwindcss v\$\{(\w+)\}", cdn)
    m = m and re.search(rf"\b{m.group(1)}=\"(\d+\.\d+\.\d+)\"", cdn)
    if not m:
        raise BuildError("can't find the Tailwind version in the CDN script")
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp, "in.css"), Path(tmp, "out.css")
        src.write_text("@tailwind base;\n@tailwind components;\n@tailwind utilities;\n")
        r = subprocess.run([str(tailwind_cli(m.group(1))), "-i", str(src), "-o", str(out), "--minify",
                            "--content", ",".join(p.as_posix() for p in content)],
                           capture_output=True, text=True, check=False)
        if r.returncode or not out.is_file():
            raise BuildError(f"tailwind CLI failed: {r.stderr.strip()}")
        return out.read_text(encoding="utf-8")


# ---------------------------------------------------------------- build
def build(page: Path, out_dir: Path, kbps: int | None = None) -> Path:
    html = page.read_text(encoding="utf-8-sig")

    embed = collect_embed(html, kbps)

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

    # ---- Tailwind CDN -> the CSS it would generate (or, failing that, an inline copy) ----
    tw = re.search(r'<script\b[^>]*src="https://cdn\.tailwindcss\.com[^"]*"[^>]*>\s*</script>', html)
    if tw:
        scripts = [local_file(s, page) for s in re.findall(r'<script\b[^>]*src="(?!https?:)([^"]+)"', html)
                   if "/nav-" not in s and not s.startswith("nav-")]
        try:
            inline = "<style>\n" + tailwind_css([page, *scripts]) + "\n</style>"
        except BuildError as e:
            print(f"  warning: {e}; inlining the Tailwind CDN script instead")
            inline = inline_script(cached("tailwind.js", TAILWIND_URL).decode("utf-8"))
        html = html.replace(tw.group(0), inline, 1)

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
    ap = argparse.ArgumentParser(description="Build offline single-file pages from fr/expression/<topic>.html")
    ap.add_argument("names", nargs="*", help="page names, e.g. refusal (default: every flashcard page)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    ap.add_argument("--kbps", type=int, default=96,
                    help="re-encode audio to this many kbps mono MP3 (default 96, needs ffmpeg; 0 = as-is)")
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
        # flashcard pages are the ones with a `categories` data block (not archive.html, me-*.html, ...)
        pages = sorted(p for p in HERE.glob("*.html") if "const categories" in p.read_text(encoding="utf-8"))

    failed = 0
    for page in pages:
        print(page.name)
        try:
            dest = build(page, args.out, args.kbps)
            print(f"  -> {dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
        except BuildError as e:
            failed += 1
            print(f"  FAILED: {e}")
    print(f"\n{len(pages) - failed} built, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
