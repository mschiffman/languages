"""
Convert conversation pages (conv##/conv##.html and its mind map,
conv##/tree-conv##.html; not the exercise pages) into
self-contained single-file HTML pages, written to
fr/everyday/conversations/single/ with the same sub-folder layout, so the
mind map link keeps working.

The inlining itself is done by fr/enunciation/make_single.py (local CSS, JS,
images and fonts -> inline / data: URIs; --remote also inlines CDN libraries).
On top of that, for conversation pages:
  - audio (lines and chunks) plays from languages.rmlives.com; the local
    media/ fallback for chunks doesn't exist next to a single-file copy.
    With --offline, each convN.html instead carries its own line and chunk
    audio (full quality, from media/lessons/everyday/convN/), and CDN
    libraries/fonts are inlined as with --remote.
  - the sidebar nav (nav-conv.js) and the Site Map button are removed.

Usage:
    python make_single.py conv41            # one conversation
    python make_single.py conv41 conv40     # several
    python make_single.py --all             # every conv## folder
    python make_single.py --remote conv41   # also inline CDN libraries/fonts
    python make_single.py --offline --all   # + embed the conversation audio
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
        if re.search(r"/nav-[\w-]+\.js", sf.parse_attrs(open_tag).get("src", "")):
            return open_tag, body
        return super().process_script(open_tag, body)


PAGE_PATCHES = [
    # Sidebar navs (nav-conv.js, nav-utensils.js): the single-file copies have none
    (re.compile(r'\s*<script\b[^>]*/nav-[\w-]+\.js[^>]*>\s*</script\s*>', re.S), ""),
    # Site Map button at the top of the page
    (re.compile(r'\s*<a\s+href="[^"]*sitemap\.html"[^>]*>\s*Site Map\s*</a\s*>', re.S), ""),
    # Audio: play from the server, not from the local media/ folder
    # ("../../../../media/..." in the chunk player, "/media/..." in conv33/listen.html)
    (re.compile(r'"(?:(?:\.\./)+|/)media/lessons/everyday/'), f'"{AUDIO_URL}'),
]


MEDIA_DIR = sf.SITE_ROOT / "media" / "lessons" / "everyday"


def embed_audio(html, page):
    """Embed the line and chunk mp3s of a convN.html page (from the local
    media/ folder) and make its players read them from that table."""
    # \d: skip the data-audio="N_k.mp3" examples in the page's code comments
    names = sorted({a.split("?")[0] for a in re.findall(r'data-audio="(\d[^"]*)"', html)})
    table, missing = {}, []
    for name in names:
        f = MEDIA_DIR / page.parent.name / name
        if f.is_file():
            table[name] = sf.local_data_uri(f)
        else:
            missing.append(name)
    if missing:
        sf.warn(f"{page.name}: {len(missing)} audio file(s) not found locally, left online: {', '.join(missing[:5])}")
    entries = ",\n".join(f"  {k!r}: {v!r}" for k, v in table.items())
    script = ("<script>\n"
              f"window.__sfAudioData = {{\n{entries}\n}};\n"
              'window.__sfAudio = (name, dir) => window.__sfAudioData[name.split("?")[0]] || dir + name;\n'
              "</script>\n")
    html = re.sub(r"(<head\b[^>]*>)", lambda m: m.group(1) + "\n" + script, html, count=1, flags=re.I)
    html = html.replace("a.src = AUD_DIR + a.dataset.audio;", "a.src = __sfAudio(a.dataset.audio, AUD_DIR);")
    return html.replace("chunkPlayer.src = CHUNK_DIR + span.dataset.audio;",
                        "chunkPlayer.src = __sfAudio(span.dataset.audio, CHUNK_DIR);")


def convert(page, remote, offline=False):
    html = ConvInliner(page, remote or offline).run()
    for pattern, repl in PAGE_PATCHES:
        html = pattern.sub(repl, html)
    if offline and page.stem == page.parent.name:  # convN.html, not the mind map/exercises
        html = embed_audio(html, page)
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
    parser.add_argument("--offline", action="store_true",
                        help="like --remote, and embed each convN.html's line and chunk audio")
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
        # Only the conversation page and its mind map, not the exercise pages
        pages = [folder / f"{folder.name}.html", folder / f"tree-{folder.name}.html"]
        for page in (p for p in pages if p.is_file()):
            out = convert(page, args.remote, args.offline)
            print(f"  {out.relative_to(OUT_DIR).as_posix():32} {out.stat().st_size / 1024:7.0f} KB")
    print("\nDone.")


if __name__ == "__main__":
    main()
