# ဂျပန်စကား — Lessons 01–02

An offline-capable Japanese lesson app with two selectable lessons and
generated audio for both.

Lesson 01's eighteen phrases are the ones that make every other free resource
usable: *wakarimasen*, *mō ichido onegaishimasu*, *yukkuri onegaishimasu*,
*daijōbu desu*. A learner who has these can work through Irodori's Burmese
edition alone. A learner who doesn't is stuck regardless of how many
lessons exist.

---

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app. Markup, styles, logic. |
| `lessons.js` | **The only file that changes per lesson.** SKILL.md's target. |
| `sw.js` | Service worker. Shell cached on install; audio only on request. |
| `manifest.json` | Makes it installable to the home screen. |
| `split-batch.py` | One batch export → compact Opus clip files, named from `lessons.js`. |
| `build-audio.py` | Clip files → sprite + timing map. **Windows: use this.** |
| `build-audio.sh` | Same thing for bash (macOS/Linux). |
| `verify.py` | Run before every push. Catches silent-card bugs. |
| `audio/01/` | Lesson 01's generated sprite and audio. |
| `audio/02/` | Lesson 02's generated source clips, sprite, and audio. |

---

## The audio workflow

Batch-generate a whole lesson in one ElevenLabs request, phrases separated
by clear pauses — the way you already do for French. Then:

**Windows (PowerShell)** — note `py`, not `python3`:

```
py split-batch.py 01 batch.mp3 --dry-run
py split-batch.py 01 batch.mp3
py build-audio.py 01
py verify.py
```

**macOS / Linux:**

```
python3 split-batch.py 01 batch.mp3 --dry-run
python3 split-batch.py 01 batch.mp3
./build-audio.sh 01            # or: python3 build-audio.py 01
python3 verify.py
```

To regenerate Lesson 02 later, use the same workflow with lesson id `02`:

```powershell
python split-batch.py 02 batch.mp3 --dry-run
python split-batch.py 02 batch.mp3
python build-audio.py 02
python verify.py
```

Run these **from the project folder**, not from wherever the audio lives —
the scripts look for `lessons.js` and `audio/` next to themselves. The batch
file can be anywhere; pass its path.

ffmpeg must be on PATH. On Windows: `winget install Gyan.FFmpeg`, then
reopen PowerShell. The scripts check and tell you if it's missing.

You never name a file or compute a timestamp by hand. `split-batch.py`
takes the clip ids straight from `lessons.js`, in order, and names the
pieces as it cuts them. `build-audio.sh` then trims, normalises,
concatenates, encodes MP3, and writes the offsets.

Always `--dry-run` first. It reports the split without writing, so a bad
detection costs you a second instead of eighteen mislabelled files.

**A clip number is an identity, not a position.** To add a phrase later,
give it the next unused number and append it. Never insert one in the
middle and renumber: every filename stays valid while its meaning shifts
one place, so `lessons.js` points at the wrong audio on every card after
the insertion, with nothing on screen to reveal it.

`split-batch.py` writes `audio/<id>/manifest.json` recording the Japanese
line each clip was cut for, and `verify.py` fails if that no longer matches
`lessons.js`:

```
FAIL: 01: clip '07' DRIFTED — audio was cut for 'わかりません'
      but lessons.js now says 'ちょっと待ってください'. Regenerate audio.
```

### When the split count is wrong

The script refuses to write anything on a mismatch, prints every detected
segment with its timing, and suggests a fix. A common cause is a phrase
containing its own pause, such as a Japanese sentence break (。). Raise the
threshold above the internal pause but below your inter-phrase pause:

```
python3 split-batch.py 01 batch.mp3 --min-silence 1.3
```

The opposite failure — too few segments — means pauses shorter or quieter
than expected: `--min-silence 0.6 --threshold -45`.

This is the one step worth watching, because a silently misaligned split
puts the wrong audio on every card after the error, with nothing on screen
to reveal it. Hence the refusal to guess.

### If you'd rather record separately

Skip `split-batch.py`, drop individually named Opus files into
`audio/01/src/001.opus` and so on, and run `build-audio.sh` directly.

**Naming is the contract** either way. Source files are named by clip id
(`01.opus`, `02.opus`, …), and `lessons.js` references those same ids. Record
separately and you lose the drift check, since only `split-batch.py` writes
the manifest.

`verify.py` exists for one failure in particular: a clip id in `lessons.js`
with no matching audio produces a card that is silently mute. You'd only
notice by tapping that exact card. On a learner's phone you'd never notice
at all.

---

## Deploying

Service workers require HTTPS or localhost — **the app will not go offline
when opened as a `file://` URL**, and caching will appear broken. Test with:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

Then GitHub → Cloudflare Pages as with your French site.

When you change `index.html` or `lessons.js`, bump `SHELL` in `sw.js`
(`kaigo-shell-v7` → `-v8`). Returning visitors otherwise keep the old copy
indefinitely — that's the cache doing its job.

---

## Decisions worth knowing about

**Audio loads as a Blob, not a URL.** Seeking to a sprite offset on a
normal `src` issues a byte-range request, and range requests don't
reliably match a full cached response once the lesson is saved offline.
Fetching the file whole and handing the player a Blob avoids that class of
bug entirely and makes every replay instant. At ~150 KB the memory cost is
nothing.

**Nothing large downloads without being asked.** The shell caches on
install — it's a few KB. Audio caches only when the learner taps Save, and
the button shows the size first. `navigator.storage.persist()` is
requested at that moment: without it, Chrome evicts caches under storage
pressure, so lessons would vanish exactly when a phone fills up.

**MP3 at 64 kbps.** Opus was tried first but sounded noticeably worse at
the bitrate needed to keep files small, so the app serves MP3 only now.
Encode from the ElevenLabs originals, not from an existing lossy file, or
you stack compression artifacts.

**Speed ladder 0.75 / 0.9 / 1.0**, with `preservesPitch` set explicitly
across vendor prefixes. Same ladder as your French shadowing.

**In-app browser warning.** Links opened from Facebook or Viber land in a
webview that throttles audio and can't install a PWA. Detected by UA, with
a note to open in Chrome.

---

## Two things needing you

**1. Review the Burmese UI strings.** I wrote the interface text — Save,
Delete, "works offline", the completion message, the Chrome notice — and
you're the native speaker. Check tone especially: I aimed for plain and
non-patronising, but that judgement is yours. Strings are in `index.html`
(search for the Burmese) and `manifest.json`.

**2. Drop in the font.** `fonts/NotoSansMyanmar-subset.woff2` is
referenced but not included. Without it the app falls back to the device
font, which is fine on most current Android and unreliable on old or cheap
handsets. To subset:

```
pip install fonttools brotli
pyftsubset NotoSansMyanmar-Regular.ttf \
  --unicodes="U+1000-109F,U+AA60-AA7F,U+A9E0-A9FF,U+0020-007E" \
  --flavor=woff2 --output-file=fonts/NotoSansMyanmar-subset.woff2
```

---

## Replacing the test audio

`audio/01/` currently holds sine tones so you can test the app on your
phone today, before generating anything. They're the right lengths and
the offsets are correct, so navigation, speed, and offline saving all
work — they just sound like a hearing test.

```
rm -rf audio/01/*
mkdir -p audio/01/src
# add your ElevenLabs exports, then:
./build-audio.sh 01
```
