#!/usr/bin/env python3
"""
Build self-contained offline copies of the English expression flashcard pages
(eng/expressions/<topic>.html). The result opens with no network (tablet, SD card, email).

This uses the French builder, fr/expression/build_single.py, for all the work (audio, styles,
scripts, fonts and Tailwind embedded; analytics and the category menu left out) and changes:

  - where it reads pages and audio and where it writes, and
  - adds Noto Sans Myanmar (eng/offline_fonts_my.css), so the Burmese lines don't depend on
    the fonts installed on the device.

The audio is embedded as recorded, like the French expression pages.

Usage (from anywhere):
    python eng/expressions/build_single.py                  build every flashcard page here
    python eng/expressions/build_single.py greet_goodbye    build just these
    python eng/expressions/build_single.py --out some/dir   write somewhere else

Output goes to eng/expressions/single/<name>.html.

Audio lookup, per file: media/eng/expressions/<folder>/NN.mp3, where <folder> is the last part
of the page's AUD_DIR; then eng/expressions/.build_cache/audio/<folder>/NN.mp3; otherwise it is
downloaded from AUD_DIR into that cache.
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

spec = importlib.util.spec_from_file_location("fr_expression_build_single", ROOT / "fr" / "expression" / "build_single.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

BURMESE_CSS = """
.english, .note-wrapper::after { font-family: "Roboto", "Noto Sans Myanmar", sans-serif; }
#cards h2 span { font-family: "Playfair Display", "Noto Sans Myanmar", serif; }
"""

builder.HERE = HERE
builder.MEDIA = ROOT / "media" / "eng" / "expressions"
builder.DEFAULT_OUT = HERE / "single"
# Not shared with the French cache: both languages can have a topic with the same name.
builder.CACHE = HERE / ".build_cache"
builder.OFFLINE_CSS += "\n" + (ROOT / "eng" / "offline_fonts_my.css").read_text(encoding="utf-8") + BURMESE_CSS

if __name__ == "__main__":
    sys.exit(builder.main())
