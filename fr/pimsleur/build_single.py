#!/usr/bin/env python3
"""
Build self-contained offline copies of the French Pimsleur lesson pages in fr/pimsleur/.

Each <name>.html (1.1.html, 1.2.html, ...) becomes ONE .html that opens offline
(tablet / SD card / email attachment):

  - every flashcard's  data-audio="https://.../lessons/pimsleur/1.3/N.m4a"  is replaced by a
    base64 data: URI read from  media/lessons/pimsleur/1.3/N.m4a
    (page name is the fallback folder when the URL doesn't name one)
  - the shared stylesheet and script (assets/css/pimsleur.css, assets/js/pimsleur.js) are inlined
  - the Tailwind CDN script (~400 KB runtime compiler) is replaced by the CSS it would generate:
    the standalone Tailwind CLI, same version as the CDN, compiles just the classes the page uses
    (CLI downloaded once, cached). If the CLI can't run, the CDN script is inlined instead.
  - the Google Fonts <link> is replaced by base64 woff2 @font-face rules, subset by Google to
    just the characters the page uses (downloaded once per page, cached). Google serves a variable
    font as the same file under several weights; each file is embedded once, as one weight range.
  - the audio is embedded exactly as recorded (best quality, for shadowing);
    build_single_small.py makes 96 kbps mono copies for sharing
  - the course menu (hamburger + sidebar) is removed, including its code in pimsleur.js
  - the favicon is embedded; Google Analytics is dropped

Usage (from anywhere):
    python fr/pimsleur/build_single.py                  build every page in fr/pimsleur/
    python fr/pimsleur/build_single.py 1.4 1.5          build just these
    python fr/pimsleur/build_single.py --out some/dir   write somewhere else

Output goes to fr/pimsleur/single/<name>.html. Network is only needed the first time
(Tailwind + fonts); downloads are cached in fr/pimsleur/.build_cache/.
"""
import argparse
import base64
import hashlib
import platform
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # site root (the "LANGUAGES" folder)
MEDIA = ROOT / "media" / "lessons" / "pimsleur"
DEFAULT_OUT = HERE / "single"
CACHE = HERE / ".build_cache"

TAILWIND_URL = "https://cdn.tailwindcss.com"
TAILWIND_CLI = "https://github.com/tailwindlabs/tailwindcss/releases/download/v{ver}/tailwindcss-{plat}"
# Google serves woff2 only to browsers it recognises
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


def local_file(ref: str) -> Path:
    """Path of a local href/src: '/x' is relative to the site root, anything else to this folder."""
    p = (ROOT / ref.lstrip("/")) if ref.startswith("/") else (HERE / ref)
    p = p.resolve()
    if not p.is_file():
        raise BuildError(f"{ref} referenced by the page but {p} does not exist")
    return p


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

        # A variable font comes back as one file under each requested weight (e.g. Noto Sans JP
        # 300/400/700). Keep one @font-face per file, spanning those weights, so it's embedded once.
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


# ---------------------------------------------------------------- build
def build(page: Path, out_dir: Path) -> Path:
    html = page.read_text(encoding="utf-8-sig")

    # ---- audio: data-audio=".../lessons/pimsleur/<lesson>/N.m4a" -> data URI ----
    missing = []

    def audio(m):
        path = urllib.parse.urlparse(m.group(2)).path
        rel = path.split("/lessons/pimsleur/", 1)[1] if "/lessons/pimsleur/" in path else f"{page.stem}/{Path(path).name}"
        f = MEDIA / rel
        if not f.is_file():
            missing.append(str(f))
            return m.group(0)
        return f'{m.group(1)}"{data_uri(f)}"'

    html, n_audio = re.subn(r'(data-audio=)"([^"]+)"', audio, html)
    if missing:
        raise BuildError("missing audio:\n       " + "\n       ".join(missing))

    # ---- Google Fonts: <link href="https://fonts.googleapis.com/css2?..." rel="stylesheet"> ----
    fonts_css = ""
    link = re.search(r'<link\b[^>]*href="(https://fonts\.googleapis\.com/css2\?[^"]+)"[^>]*>', html)
    if link:
        fonts_css = embedded_fonts(html, link.group(1))
    html = re.sub(r'<link\b[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*', "", html)

    # ---- local stylesheets (assets/css/pimsleur.css) -> <style>, with the fonts first ----
    def stylesheet(m):
        return "<style>\n" + local_file(m.group(1)).read_text(encoding="utf-8-sig") + "\n</style>"

    html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="(?!https?:)([^"]+)"[^>]*>', stylesheet, html)
    html = re.sub(r'<link\b[^>]*href="(?!https?:)([^"]+\.css)"[^>]*rel="stylesheet"[^>]*>', stylesheet, html)
    if fonts_css:
        html = html.replace("</head>", f"<style>\n/* embedded fonts */\n{fonts_css}\n</style>\n</head>", 1)

    # ---- Tailwind CDN -> the CSS it would generate (or, failing that, an inline copy) ----
    tw = re.search(r'<script\b[^>]*src="https://cdn\.tailwindcss\.com[^"]*"[^>]*>\s*</script>', html)
    if tw:
        try:
            inline = "<style>\n" + tailwind_css([page, *(local_file(s) for s in re.findall(r'<script\b[^>]*src="(?!https?:)([^"]+)"', html))]) + "\n</style>"
        except BuildError as e:
            print(f"  warning: {e}; inlining the Tailwind CDN script instead")
            inline = inline_script(cached("tailwind.js", TAILWIND_URL).decode("utf-8"))
        html = html.replace(tw.group(0), inline, 1)

    # ---- local scripts (assets/js/pimsleur.js) -> inline ----
    def script(m):
        return inline_script(local_file(m.group(1)).read_text(encoding="utf-8-sig"))

    html = re.sub(r'<script\b[^>]*src="(?!https?:)([^"]+)"[^>]*>\s*</script>', script, html)

    # ---- Google Analytics: external tag + the inline dataLayer/gtag snippet ----
    html = re.sub(r'<script\b[^>]*src="https://www\.googletagmanager\.com[^"]*"[^>]*>\s*</script>\s*', "", html)
    html = re.sub(r"<script>(?:(?!</script>).)*?window\.dataLayer(?:(?!</script>).)*?</script>\s*", "", html, flags=re.S)
    html = re.sub(r"\s*<!-- Google tag \(gtag\.js\) -->", "", html)

    # ---- course menu: hamburger button, overlay, <nav id="sidebar"> and the script that builds/toggles it ----
    html = re.sub(r'\s*<button\b[^>]*id="hamburger".*?</button>', "", html, flags=re.S)
    html = re.sub(r'\s*<div\b[^>]*id="sidebar-overlay"[^>]*>\s*</div>', "", html)
    html = re.sub(r'\s*<nav\b[^>]*id="sidebar".*?</nav>', "", html, flags=re.S)
    html = re.sub(r"[ \t]*<!-- (?:Hamburger button|Sidebar overlay|Sidebar) -->\n?", "", html)
    html = re.sub(r"\n[ \t]*// ── Sidebar ──.*?(?=</script>)", "\n", html, flags=re.S)

    # ---- favicon ----
    def favicon(m):
        f = ROOT / m.group(2).lstrip("/")
        return f'{m.group(1)}"{data_uri(f)}"' if f.is_file() else m.group(0)

    html = re.sub(r'(<link\b[^>]*href=)"(/[^"]+\.png)"', favicon, html)

    left = sorted(set(re.findall(r'(?:src|href)="(https?://[^"]+)"', html)))
    if left:
        print("  warning: still references the network: " + ", ".join(left))
    if re.search(r'id="(?:hamburger|sidebar)', html):
        print("  warning: course menu markup is still present")

    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / page.name
    dest.write_text(html, encoding="utf-8", newline="\n")
    print(f"  {n_audio} audio files embedded")
    return dest


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Build offline single-file pages from fr/pimsleur/*.html")
    ap.add_argument("names", nargs="*", help="page names, e.g. 1.4 (default: all)")
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
        pages = sorted(HERE.glob("*.html"))

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
