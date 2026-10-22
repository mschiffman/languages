"""
Convert conversation pages (conv##/*.html: the page and its mind map) into
self-contained single-file HTML pages, written to
fr/everyday/conversations/single/ with the same sub-folder layout, so the
mind map link keeps working.

The inlining itself is done by fr/enunciation/make_single.py (local CSS, JS,
images and fonts -> inline / data: URIs; --remote also inlines CDN libraries).
On top of that, for conversation pages:
  - audio (lines and chunks) always plays from languages.rmlives.com; the
    local media/ fallback for chunks doesn't exist next to a single-file copy.
  - the sidebar nav (nav-conv.js) and the Site Map button are removed.

Usage:
    python make_single.py conv41            # one conversation
    python make_single.py conv41 conv40     # several
    python make_single.py --all             # every conv## folder
    python make_single.py --remote conv41   # also inline CDN libraries/fonts
"""

import argparse
import importlib.util
import re
import sys
from pathlib import Path

CONV_DIR = Path(__file__).resolve().parent              # fr/everyday/conversations
OUT_DIR = CONV_DIR / "single"
AUDIO_URL = "https://languages.rmlives.com/lessons/everyday/"

_spec = importlib.util.spec_from_file_location(
    "enun_single", CONV_DIR.parent.parent / "enunciation" / "make_single.py")
sf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sf)


class ConvInliner(sf.PageInliner):
    def process_script(self, open_tag, body):
        # The sidebar nav is left as a link here and removed by PAGE_PATCHES.
        if "nav-conv" in sf.parse_attrs(open_tag).get("src", ""):
            return open_tag, body
        return super().process_script(open_tag, body)


PAGE_PATCHES = [
    # Sidebar nav: the single-file copies have none
    (re.compile(r'\s*<script\b[^>]*nav-conv\.js[^>]*>\s*</script\s*>', re.S), ""),
    # Site Map button at the top of the page
    (re.compile(r'\s*<a\s+href="[^"]*sitemap\.html"[^>]*>\s*Site Map\s*</a\s*>', re.S), ""),
    # Chunks: play from the server, not from the local media/ folder
    (re.compile(r'"(?:\.\./)+media/lessons/everyday/'), f'"{AUDIO_URL}'),
]


def convert(page, remote):
    html = ConvInliner(page, remote).run()
    for pattern, repl in PAGE_PATCHES:
        html = pattern.sub(repl, html)
    out = OUT_DIR / page.relative_to(CONV_DIR)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("convs", nargs="*", help="conversation folders, e.g. conv41")
    parser.add_argument("--all", action="store_true", help="every conv## folder")
    parser.add_argument("--remote", action="store_true",
                        help="also download and inline CDN stylesheets, scripts and fonts")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    if args.all:
        folders = sorted((p for p in CONV_DIR.glob("conv*") if p.is_dir()),
                         key=lambda p: int(re.sub(r"\D", "", p.name) or 0))
    elif args.convs:
        folders = [CONV_DIR / c for c in args.convs]
    else:
        parser.error("name the conversation(s), e.g. conv41, or use --all")

    for folder in folders:
        if not folder.is_dir():
            sf.warn(f"no such folder: {folder.name}")
            continue
        for page in sorted(folder.glob("*.html")):
            out = convert(page, args.remote)
            print(f"  {out.relative_to(OUT_DIR).as_posix():32} {out.stat().st_size / 1024:7.0f} KB")
    print("\nDone.")


if __name__ == "__main__":
    main()
