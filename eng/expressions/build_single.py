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

Typing quizzes (<topic>_quiz.html, the pages that load ytquiz.js) are built by the stories
builder, eng/build_single.py, also with the audio as recorded, and go to the same folder.

Usage (from anywhere):
    python eng/expressions/build_single.py                  build every flashcard page and quiz here
    python eng/expressions/build_single.py greet_goodbye greet_goodbye_quiz    build just these
    python eng/expressions/build_single.py --out some/dir   write somewhere else

Output goes to eng/expressions/single/<name>.html.

Audio lookup, per file: media/eng/expressions/<folder>/NN.mp3, where <folder> is the last part
of the page's AUD_DIR; then eng/expressions/.build_cache/audio/<folder>/NN.mp3; otherwise it is
downloaded from AUD_DIR into that cache.
"""
import argparse
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

spec = importlib.util.spec_from_file_location("eng_build_single", ROOT / "eng" / "build_single.py")
quiz_builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quiz_builder)

flash_build = builder.build


def build(page: Path, out_dir: Path, *args, **kwargs) -> Path:
    """Flashcard pages -> the French builder; typing quizzes -> the stories builder."""
    if "ytquiz.js" not in page.read_text(encoding="utf-8"):
        return flash_build(page, out_dir, *args, **kwargs)
    try:
        return quiz_builder.build(page, out_dir, kbps=0)  # audio as recorded
    except quiz_builder.BuildError as e:
        raise builder.BuildError(str(e)) from e


builder.build = build


def is_page(p: Path) -> bool:
    text = p.read_text(encoding="utf-8")
    return "const categories" in text or "ytquiz.js" in text


if __name__ == "__main__":
    # No names given: the French builder would only pick the flashcard pages, so name them all.
    names = argparse.ArgumentParser(add_help=False)
    names.add_argument("names", nargs="*")
    names.add_argument("--out")
    if not names.parse_known_args()[0].names:
        sys.argv += sorted(p.name for p in HERE.glob("*.html") if is_page(p))
    sys.exit(builder.main())
