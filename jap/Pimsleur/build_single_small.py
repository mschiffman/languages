#!/usr/bin/env python3
"""
SMALL version of build_single.py, for sharing: same pages, audio shrunk to 96 kbps mono.

Build self-contained offline copies of the Pimsleur lesson pages in jap/Pimsleur/.

Each <name>.html (1.1.html, me-1.3.html, ...) becomes ONE .html that opens offline
(tablet / SD card / email attachment):

  - every flashcard's  data-audio="https://.../N.mp3"  is replaced by a base64 data: URI
    read from  media/lessons/jap/<lesson>/<file>.mp3  (<lesson> = the page name, e.g. 1.3;
    the URL's own folder is ignored because several pages point at the wrong one)
  - the Tailwind CDN script (~400 KB runtime compiler) is replaced by the CSS it would generate:
    the standalone Tailwind CLI, same version as the CDN, compiles just the classes the page uses
    (CLI downloaded once, cached). If the CLI can't run, the CDN script is inlined instead.
  - the Google Fonts <link> is replaced by base64 woff2 @font-face rules, subset by Google to
    just the characters the page uses (downloaded once per page, cached). Google serves a variable
    font as the same file under several weights; each file is embedded once, as one weight range.
  - the audio is re-encoded to 96 kbps mono with ffmpeg, same format as the original
    (--kbps N to change, --kbps 0 to embed it as-is; shrunk copies cached in .build_cache/)
  - the favicon is embedded; Google Analytics is dropped
  - the course menu (hamburger + sidebar) is removed: its links don't work between the built files
    (the "Mind Map" link stays; me-*.html are built too, so it works in the same output folder)

Usage (from anywhere):
    python jap/Pimsleur/build_single_small.py                 build every page in jap/Pimsleur/
    python jap/Pimsleur/build_single_small.py 1.3 me-1.3      build just these
    python jap/Pimsleur/build_single_small.py --out some/dir  write somewhere else
    python jap/Pimsleur/build_single_small.py --kbps 0        embed the original audio untouched

Output goes to jap/Pimsleur/single_small/<name>.html. Network is only needed the first time
(Tailwind + fonts); downloads are cached in jap/Pimsleur/.build_cache/.
"""
import argparse
import base64
import hashlib
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
MEDIA = ROOT / "media" / "lessons" / "jap"
DEFAULT_OUT = HERE / "single_small"
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


def reencode(src: Path, kbps: int) -> Path:
    """src at kbps mono (AAC for .m4a, MP3 for .mp3; cached), or src itself if that wouldn't be smaller."""
    out = CACHE / f"audio-{kbps}k" / src.parent.name / src.name
    if not out.is_file() or out.stat().st_mtime < src.stat().st_mtime:  # redo if re-recorded
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise BuildError("shrinking the audio needs ffmpeg on PATH (or use --kbps 0)")
        codec = ["-c:a", "aac", "-movflags", "+faststart"] if src.suffix.lower() == ".m4a" else ["-c:a", "libmp3lame"]
        out.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run([ffmpeg, "-v", "error", "-y", "-i", str(src), "-map_metadata", "-1", "-vn",
                            "-ac", "1", *codec, "-b:a", f"{kbps}k", str(out)],
                           capture_output=True, text=True, check=False)
        if r.returncode:
            raise BuildError(f"ffmpeg failed on {src}: {r.stderr.strip()}")
    return out if out.stat().st_size < src.stat().st_size else src


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
    chars = sorted({c for c in html if c.isprintable() and not c.isspace()} | set(" "))
    text = "".join(chars)
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
def build(page: Path, out_dir: Path, kbps: int = 96) -> Path:
    html = page.read_text(encoding="utf-8-sig")
    lesson = page.stem  # 1.3 -> media/lessons/jap/1.3/

    # ---- audio: data-audio="<url>/N.mp3" -> data URI ----
    missing = []

    def audio(m):
        name = Path(urllib.parse.urlparse(m.group(2)).path).name
        f = MEDIA / lesson / name
        if not f.is_file():
            missing.append(str(f))
            return m.group(0)
        return f'{m.group(1)}"{data_uri(reencode(f, kbps) if kbps else f)}"'

    html, n_audio = re.subn(r'(data-audio=)"([^"]+)"', audio, html)
    if missing:
        raise BuildError("missing audio:\n       " + "\n       ".join(missing))

    # ---- Google Fonts: <link href="https://fonts.googleapis.com/css2?..." rel="stylesheet"> ----
    fonts_css = ""
    link = re.search(r'<link\b[^>]*href="(https://fonts\.googleapis\.com/css2\?[^"]+)"[^>]*>', html)
    if link:
        fonts_css = embedded_fonts(html, link.group(1))
    html = re.sub(r'<link\b[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*', "", html)
    if fonts_css:
        html = html.replace("</head>", f"<style>\n/* embedded fonts */\n{fonts_css}\n</style>\n</head>", 1)

    # ---- Tailwind CDN -> the CSS it would generate (or, failing that, an inline copy) ----
    tw = re.search(r'<script\b[^>]*src="https://cdn\.tailwindcss\.com[^"]*"[^>]*>\s*</script>', html)
    if tw:
        try:
            inline = "<style>\n" + tailwind_css([page]) + "\n</style>"
        except BuildError as e:
            print(f"  warning: {e}; inlining the Tailwind CDN script instead")
            inline = inline_script(cached("tailwind.js", TAILWIND_URL).decode("utf-8"))
        html = html.replace(tw.group(0), inline, 1)

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

    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / page.name
    dest.write_text(html, encoding="utf-8", newline="\n")
    print(f"  {n_audio} audio files embedded")
    return dest


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Build offline single-file pages from jap/Pimsleur/*.html")
    ap.add_argument("names", nargs="*", help="page names, e.g. 1.3 or me-1.3 (default: all)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    ap.add_argument("--kbps", type=int, default=96,
                    help="re-encode audio to this many kbps mono (default 96, needs ffmpeg; 0 = as-is)")
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
            dest = build(page, args.out, args.kbps)
            print(f"  -> {dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
        except BuildError as e:
            failed += 1
            print(f"  FAILED: {e}")
    print(f"\n{len(pages) - failed} built, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
