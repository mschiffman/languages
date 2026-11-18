#!/usr/bin/env python3
"""
Build self-contained offline copies of the action-word lessons (eng/verbs/verbs_N.html).

Each page is Tailwind (CDN) + Alpine, with its own Tailwind theme (paper/forest/gold colours,
Fredoka/Andika fonts) and pictures/clips addressed as IMG_DIR + n + "." + IMG_EXT and
AUD_DIR + "NN." + AUD_EXT. This collapses one into ONE .html that opens offline (tablet / SD card):

  - every picture in IMG_DIR (img/ytstory/<set>/) and every clip in the local audio copy
    (media/eng/yt/<set>/) is embedded as base64 in an EMBED map; the page's two URL
    expressions are wrapped in media(...), which returns the embedded copy
      audio -> 96 kbps mono MP3 (cached in eng/.build_cache/, same as eng/build_single.py)
  - the Tailwind CDN script is replaced by the CSS it would generate, built by the standalone
    Tailwind CLI with the page's own tailwind.config theme (CLI cached in fr/expression/.build_cache/)
  - fonts: eng/offline_fonts.css (Fredoka, Andika) + eng/offline_fonts_my.css (Burmese)
  - alpine.min.js is inlined; Google Analytics, Google Fonts and the "< English" link are dropped

Usage (from anywhere):
    python eng/verbs/build_single.py verbs_1            build just this page
    python eng/verbs/build_single.py                    build every verbs_N.html
    python eng/verbs/build_single.py verbs_1 --kbps 0   embed the original audio

Output goes to eng/verbs/single/<name>.html.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "eng"))  # ahead of this folder, so build_single = eng/build_single.py
import build_single as eng_build  # noqa: E402  eng/build_single.py (audio shrink)

# fr/expression/build_single.py has the same module name; load it explicitly
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("fr_expr_build", ROOT / "fr" / "expression" / "build_single.py")
fr_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fr_build)

DEFAULT_OUT = HERE / "single"
BuildError = fr_build.BuildError


def collect_embed(html: str, kbps: int) -> dict:
    img_dir = fr_build.js_const(html, "IMG_DIR")
    img_ext = fr_build.js_const(html, "IMG_EXT")
    aud_dir = fr_build.js_const(html, "AUD_DIR")
    aud_ext = fr_build.js_const(html, "AUD_EXT")
    embed = {}

    pics = sorted((ROOT / img_dir.strip("/")).glob("*." + img_ext))
    if not pics:
        raise BuildError(f"no .{img_ext} pictures in {ROOT / img_dir.strip('/')}")
    for p in pics:
        embed[img_dir + p.name] = eng_build.data_uri(p)

    aud_path = urllib.parse.urlparse(aud_dir).path.strip("/")  # eng/yt/verbs_1
    folder = ROOT / "media" / aud_path
    clips = sorted(folder.glob("[0-9][0-9].mp3"))
    if not clips:
        raise BuildError(f"no NN.mp3 clips in {folder}")
    slug = eng_build.audio_key(aud_dir)
    for c in clips:
        src = eng_build.shrink_audio(c, slug, kbps) if kbps else c
        embed[aud_dir + c.stem + "." + aud_ext] = eng_build.data_uri(src)
    print(f"  {len(pics)} pictures, {len(clips)} clips")
    return embed


def tailwind_css(page: Path, theme_js: str) -> str:
    """CSS the Tailwind CDN would generate for this page, using the page's tailwind.config."""
    cdn = fr_build.cached("tailwind.js", fr_build.TAILWIND_URL).decode("utf-8")
    m = re.search(r"tailwindcss v\$\{(\w+)\}", cdn)
    m = m and re.search(rf"\b{m.group(1)}=\"(\d+\.\d+\.\d+)\"", cdn)
    if not m:
        raise BuildError("can't find the Tailwind version in the CDN script")
    with tempfile.TemporaryDirectory() as tmp:
        src, out, cfg = Path(tmp, "in.css"), Path(tmp, "out.css"), Path(tmp, "tailwind.config.js")
        src.write_text("@tailwind base;\n@tailwind components;\n@tailwind utilities;\n")
        cfg.write_text(f"module.exports = Object.assign({theme_js}, {{ content: {json.dumps([page.as_posix()])} }});\n",
                       encoding="utf-8")
        r = subprocess.run([str(fr_build.tailwind_cli(m.group(1))), "-c", str(cfg), "-i", str(src),
                            "-o", str(out), "--minify"], capture_output=True, text=True, check=False)
        if r.returncode or not out.is_file():
            raise BuildError(f"tailwind CLI failed: {r.stderr.strip()}")
        return out.read_text(encoding="utf-8")


def build(page: Path, out_dir: Path, kbps: int) -> Path:
    html = page.read_text(encoding="utf-8-sig")
    embed = collect_embed(html, kbps)

    # ---- page media URLs -> media(url), which prefers the embedded copy ----
    html, n_img = re.subn(r"IMG_DIR\s*\+[^;]*?IMG_EXT", lambda m: "media(" + m.group(0) + ")", html)
    html, n_aud = re.subn(r"AUD_DIR\s*\+[^;]*?AUD_EXT", lambda m: "media(" + m.group(0) + ")", html)
    if not (n_img and n_aud):
        raise BuildError(f"expected IMG_DIR + ... IMG_EXT and AUD_DIR + ... AUD_EXT in the page "
                         f"(found {n_img} and {n_aud})")

    # ---- Tailwind: CDN script + inline config -> generated CSS ----
    cfg = re.search(r"<script>\s*(?:/\*.*?\*/\s*)?tailwind\.config\s*=\s*(\{.*?\})\s*;\s*</script>\s*", html, re.S)
    tw = re.search(r'<script\b[^>]*src="https://cdn\.tailwindcss\.com[^"]*"[^>]*>\s*</script>\s*', html)
    if not (cfg and tw):
        raise BuildError("expected the Tailwind CDN script and a tailwind.config block")
    css = tailwind_css(page, cfg.group(1))
    html = html.replace(cfg.group(0), "", 1)
    html = html.replace(tw.group(0), "<style>\n" + css + "\n</style>\n", 1)

    # ---- fonts: offline copies instead of Google Fonts ----
    html = re.sub(r'\s*<link\b[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>', "", html)
    fonts = (eng_build.FONTS_CSS.read_text(encoding="utf-8")
             + "\n" + eng_build.FONTS_CSS_MY.read_text(encoding="utf-8"))
    html = html.replace("</head>", f"<style>\n{fonts}\n</style>\n</head>", 1)

    # ---- Google Analytics ----
    html = re.sub(r'<script\b[^>]*src="https://www\.googletagmanager\.com[^"]*"[^>]*>\s*</script>\s*', "", html)
    html = re.sub(r"<script>(?:(?!</script>).)*?window\.dataLayer(?:(?!</script>).)*?</script>\s*", "", html,
                  flags=re.S)
    html = re.sub(r"\s*<!-- Google tag \(gtag\.js\) -->", "", html)

    # ---- "< English" back link: nowhere to go offline ----
    html = re.sub(r'\s*<a\b[^>]*href="/english\.html"[^>]*>.*?</a>', "", html, count=1, flags=re.S)

    # ---- local scripts (alpine.min.js) inlined ----
    html = re.sub(r'<script\b[^>]*src="(?!https?:)([^"]+)"[^>]*>\s*</script>',
                  lambda m: fr_build.inline_script(fr_build.local_file(m.group(1), page).read_text(encoding="utf-8-sig")),
                  html)

    # ---- EMBED + media() before the page's first <body> script ----
    body = html.index("<body")
    first = html.index("<script", body)
    shim = ("const EMBED = " + json.dumps(embed, separators=(",", ":")) + ";\n"
            "function media(url) { return EMBED[url] || url; }")
    html = html[:first] + fr_build.inline_script(shim) + "\n    " + html[first:]

    # ---- favicon ----
    html = re.sub(r'(<link\b[^>]*href=)"(/[^"]+\.png)"',
                  lambda m: f'{m.group(1)}"{eng_build.data_uri(ROOT / m.group(2).lstrip("/"))}"', html)

    left = sorted(set(re.findall(r'(?:src|href)="((?:https?:)?/[^"]*)"', html)))
    if left:
        print("  warning: still references: " + ", ".join(left))

    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / page.name
    dest.write_text(html, encoding="utf-8", newline="\n")
    return dest


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Build offline single-file copies of eng/verbs/verbs_N.html")
    ap.add_argument("names", nargs="*", help="page names, e.g. verbs_1 (default: all)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    ap.add_argument("--kbps", type=int, default=96, help="audio as N kbps mono MP3 (default 96; 0 = original)")
    args = ap.parse_args()

    pages = [HERE / (n if n.endswith(".html") else n + ".html") for n in args.names] or \
        sorted(HERE.glob("verbs_*.html"))
    failed = 0
    for page in pages:
        print(page.name)
        try:
            if not page.is_file():
                raise BuildError(f"no such page: {page}")
            dest = build(page, args.out, args.kbps)
            print(f"  -> {dest}  ({dest.stat().st_size / 1024 / 1024:.2f} MB)")
        except (BuildError, eng_build.BuildError) as e:
            failed += 1
            print(f"  FAILED: {e}")
    print(f"\n{len(pages) - failed} built, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
