# Building an Anki Deck from an Expression Page

This document describes how to turn an expression flashcard page
(`fr/expression/n-<topic>.html`) and its audio into an Anki deck
(`French__Expressions__<Name>.apkg`) in the same format as the existing
Refusal deck. First done for Agree on 2026-10-12.

---

## File locations

| File | Path |
|---|---|
| Build script | `fr/expression/anki/build_anki.py` (reads `n-<topic>.html`) |
| Build script, renamed pages | `fr/expression/anki/build_anki_new.py` (reads `<topic>.html`) |
| Expression page (card text) | `fr/expression/n-<topic>.html` |
| Audio, one per card in reading order | `media/lessons/expressions/<topic>/01.mp3` … `NN.mp3` |
| Reference deck (format template) | `fr/expression/anki/French__Expressions__Refusal.apkg` (next to the scripts) |
| Output | `Desktop/French__Expressions__<Name>.apkg` |
| Anki | 26.9.3 in `%LOCALAPPDATA%\Programs\Anki`, profile `User 1` |

The page lives in `fr/expression/`, **not** in `media/lessons/expressions/`
(only the audio is there). A request that names
`media/lessons/expressions/n-<topic>.html` means the `fr/expression/` page.

Topics with both a page and audio (as of 2026-10-12): `agree`, `annoyance`,
`congrats`, `excitement`, `exclamation`, `iMean`, `opinion`, `refusal`,
`understand`. Decks built so far: Refusal (made in Anki), Agree.

---

## Step 1 — Build

```
python fr/expression/anki/build_anki.py agree
```

This reads `n-agree.html` and `media/lessons/expressions/agree/`, clones the
Refusal deck and writes `Desktop/French__Expressions__Agree.apkg`. Several
topics at once: `build_anki.py annoyance opinion`.

The flashcard pages are being renamed from `n-<topic>.html` to
`<topic>.html` (replacing the old-format pages of that name). Once a topic is
renamed, use `build_anki_new.py` instead. It is the same script, with the
same options, except for the file it reads. On a page that hasn't been
converted yet it stops with "is it still the old-format page?" and writes
nothing. When every page is renamed, `build_anki.py` can be deleted.

Options:

- `--name X` — deck name and file-name suffix. Defaults to the topic with a
  capital first letter (`agree` → `Agree`). When the default reads badly
  (`iMean` would become `IMean`), ask the user what name they want.
- `--category "X"` — the badge shown on each card. Defaults to the page's
  header badge, title-cased (`AGREEMENT` → `Agreement`,
  `CONGRATULATIONS` → `Congratulations`).
- `--out DIR`, `--force` (the script won't overwrite an existing `.apkg`
  without it; ask the user before overwriting a deck on the Desktop).
- `--ref FILE.apkg` — a different template deck.

The script stops, without writing anything, if the number of cards on the page
doesn't match the `01.mp3 … NN.mp3` files. Don't work around that: it means the
page or the audio folder has changed, so ask which one is right.

The deck name and the badge can differ (deck `Agree`, badge `Agreement`).
Mention both in the report so the user can change either one.

## Step 2 — Verify

The script re-opens every package it writes and checks it: database
integrity, 6 fields per note, each card paired with its note, the 3 template
fonts present, and every `[sound:NN.mp3]` resolving to the same bytes as the
source file. It prints one line per card (`NN.mp3  English  French`) and
`ok`. To check a package on its own:

```
python fr/expression/anki/build_anki.py --check Desktop/French__Expressions__Agree.apkg
```

Nothing here does a real import into Anki. Anki's bundled Python library
is compiled for 3.13 and can't be loaded from the system Python 3.14. A real
test means importing the file in Anki (File → Import) or installing `anki`
from PyPI. Ask before downloading.

---

## How a page card becomes a note

Each card in the page's `categories` block is
`[French, English, note, exFR, exEN, (exFR2, exEN2)]`.

| Note field | Value |
|---|---|
| English | `card[1]` (also the sort field) |
| French | `card[0]` |
| Audio | `[sound:NN.mp3]`, NN = the card's position in reading order |
| ExampleFR / ExampleEN | `card[3]` / `card[4]` — first example only |
| Category | header badge, title-cased |

The explanation (`card[2]`) and any second example are left out, as in the
Refusal deck. Deck: `French::Expressions::<Name>`. Tags:
`expressions french <topic in lowercase>`. Cards are new and unscheduled.

---

## What's inside an `.apkg` (why the script works this way)

Anki's current export format, a zip with every member **stored** (not
deflated):

| Member | Contents |
|---|---|
| `meta` | `08 03`: protobuf "version 3" = zstd-compressed package |
| `collection.anki21b` | zstd-compressed SQLite collection (schema 18, WAL header) |
| `collection.anki2` | legacy stub telling old Anki versions to update; copied as is |
| `media` | zstd-compressed protobuf list of `{name, size, sha1}` |
| `0`, `1`, … | each media file, zstd-compressed; member `i` is entry `i` of `media` |

- **The reference collection is cloned rather than built from scratch.**
  That keeps the note type "FR Expression (flip card)" (id `1782650301`) with
  the same id and mtime, so Anki reuses the user's existing note type instead
  of importing a duplicate `FR Expression (flip card)-xxxxx`. It also keeps
  the parent decks, deck options and the CSS/template/fonts unchanged.
- Only the topic deck gets a new id and name. Its notes and cards are
  replaced. New notes get Anki-style base-91 GUIDs, millisecond ids and
  `csum` = first 8 hex digits of sha1(first field).
- **The back template gets patched while building** (`fix_templates()`,
  2026-10-12). The 🔊 button plays the audio by clicking Anki's hidden replay
  button. That click bubbled up to the card, whose click handler flipped it
  back to the front. The patched handler ignores clicks that come from `.fr`
  or `.hidden-audio`, so clicking anywhere else still flips the card to peek.
  The patch only runs while the template still has the old line, and then it
  bumps the note type's mtime. When the deck is imported, Anki's default
  ("update note types if newer") replaces the shared note type, which fixes
  every expression deck already imported. `--check` fails on a package that
  still has the old line. The Refusal template in this folder was fixed by
  hand in Anki and exported again on 2026-10-12, so the patch now does
  nothing and builds keep the note type's mtime from that export.
- The template's fonts (`_PlayfairDisplay-*.ttf`, `_SpaceMono-Regular.ttf`)
  are copied from the reference's media. The leading `_` stops Anki's "Check
  Media" from deleting them as unused.
- Python's `sqlite3` can't load the collection as exported. Before
  `deserialize()` will accept it, the WAL header bytes (18–19) have to be
  flipped to `01 01`. Queries on deck, tag or notetype names also need Anki's
  `unicase` collation registered, or they fail with "no query solution".
  `open_collection()` in the script does both, so reuse it when inspecting
  a deck:

  ```python
  sys.path.insert(0, "fr/expression/anki"); import build_anki as b
  c = b.open_collection(b.zstd_decompress(zipfile.ZipFile(p).read("collection.anki21b"))).cursor()
  ```

---

## Gotchas

- **Audio names repeat across decks.** Every topic uses `01.mp3 …`. On
  import Anki renames a clashing file to `01-<sha1>.mp3` and updates the
  note, and `collection.media` already has many such files. This is expected.
  Don't rename the audio to avoid it.
- **Rebuilding a deck that's already in Anki creates duplicates.** Every
  build gets fresh GUIDs, so re-importing adds a second copy of each note
  instead of updating it. To change cards that are already imported, edit
  them in Anki, or delete the deck there first.
- **Decks and pages drift apart.** The Refusal deck's "En aucun cas" example
  (`— Je peux lire ton journal ? — En aucun cas !`) isn't the one on
  `n-refusal.html`, so that deck was edited after it was built. Rebuilding
  from the page discards hand edits like that. Otherwise the script
  reproduces the Refusal deck exactly.
- **Card design changes belong in the reference deck.** If you change the
  card design in Anki (Manage Note Types → FR Expression (flip card)), export
  the Refusal deck again into this folder. While the reference still has the
  old flip handler, every build marks the note type as newer, so importing it
  would overwrite design changes made in Anki.
- **The reference must be a deck exported on its own** (one note type with
  notes, one deck holding cards). The script stops if it isn't.
- **Python.** System Python is 3.14 (`compression.zstd` is built in, nothing
  to install). With `-I` it ignores `PYTHONIOENCODING`, so print French text
  only after `sys.stdout.reconfigure(encoding="utf-8")` (the script does this).
- **Long paths (for Claude).** The session scratchpad path is over 260
  characters. Python and `C:\sqlite\sqlite3` can't open files there, and
  `python script.py` fails with "can't open file". Keep scripts and outputs
  on short paths (this folder, the Desktop, the session's working folder).
  The script reads the reference zip in memory, so nothing has to be extracted.
- **Backslashes (for Claude).** The Bash tool collapses `\\` inside heredocs,
  which breaks Windows paths in inline Python. Use forward slashes there.

---

## Checklist

- [ ] Page found (`n-<topic>.html` → `build_anki.py`, renamed `<topic>.html` → `build_anki_new.py`) and audio folder found; card count = mp3 count
- [ ] Deck name and badge chosen (defaults shown in the script's output)
- [ ] `build_anki.py <topic>` printed `ok`
- [ ] Didn't overwrite an existing Desktop `.apkg` without asking
- [ ] Report to the user: deck name, badge, card count, any judgment calls
