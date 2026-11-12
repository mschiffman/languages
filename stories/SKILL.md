# Adding a Story Page

This document describes how to add an illustrated read-along story to
`stories/` (fairy tales, Aesop fables, science readers): the page, its audio,
the menu entry and the offline single-file copy. The worked example is
`Aladdin_lamp.html` (2026-10-24).

Each page is a slider of 8 book pages. Every page shows a picture and its
text, split into short phrases ("chunks"). Tapping a chunk plays that chunk;
**Play page** plays the whole page chunk by chunk.

---

## Quick way (since 2026-11-12)

For a new English story with Burmese, two scripts do Steps 1, 4, 5 and 6:

```
python -E stories/new_story.py story.md        # page + menu entry from ChatGPT's story.md
python -E stories/story_audio.py <page>        # audio + Whisper check of the new takes (Step 3); listen to any ??
python -E stories/publish_story.py <page>      # upload, checks, offline copy, Drive, commit, push, live check
```

- `story.md` is ChatGPT's output in the format of `stories/chatgpt_format.txt`
  (paste that file into ChatGPT with the story): a header (`page`, `slug`,
  `menu`, `brand`), `## N` per picture, then per sentence one `EN:` line per
  chunk and one `MY:` line, sentences separated by blank lines.
  `new_story.py --check` only checks it and lists problems with line numbers.
- `new_story.py` copies the layout of the last story in the menu group
  (or `template: <page>` from the header), fills in the title, header brand,
  `IMG_DIR`/`AUD_DIR`, Burmese `tr` lines and `pages`, and adds the menu entry.
  It needs the pictures in `img/ytstory/<slug>/` first (run
  `all_downloads_to_ytstory.bat`), and refuses to replace a page without `--force`.
- `publish_story.py` asks for a typed `yes` (`--dry-run` shows the plan,
  `--no-push` stops before git). It never requests an audio URL before the upload,
  commits only the page, its picture folder and the menu script, and checks the
  live page at `https://languages-4ko.pages.dev` (a missing page there answers 200
  with "Protected Page", so it compares the page content). Every step can be re-run.
- Fixes after publishing (a Burmese typo, a re-take, a new picture) are made
  as before; then run `publish_story.py <page>` again.

---

## File locations

| File | Path |
|---|---|
| Story page | `stories/<page>.html` |
| Reader engine (slider, chunk playback) | `assets/js/ytstory.js` |
| Stylesheet | `assets/css/ytstory.css` |
| Menu, fairy tales | `assets/js/nav-stories.js` |
| Menu, Aesop fables | `assets/js/nav-aesop.js` |
| Menu, science readers | `assets/js/nav-science.js` |
| Pictures, one per book page | `img/ytstory/<slug>/1.jpg` … `8.jpg` |
| Audio, one clip per chunk | `media/eng/yt/<slug>/01.mp3` … `NN.mp3` (not in git) |
| Audio online (Cloudflare R2, bucket `languages`) | `https://languages.rmlives.com/eng/yt/<slug>/NN.mp3` |
| Make + upload audio | `stories/story_audio.py` |
| Check audio with Whisper | `stories/check_audio.py` |
| Offline copies (not in git) | `eng/single/<page>.html`, built by `eng/build_single.py` |

`<slug>` is the media folder name (`lion`, `beanstalk`, `Aladdin` …), which is
not always the page name. The page's `IMG_DIR` and `AUD_DIR` are what count;
`story_audio.py` and `build_single.py` both take the slug from the last part of
`AUD_DIR`.

---

## Step 1 — Create `<page>.html`

Copy a story page from the same menu (`Jack_beanstalk.html` for a fairy tale,
`lion_mouse.html` for a fable) and change:

1. `<title>`.
2. The header brand: the two coloured parts of the title go in
   `<span class="lion">` and `<span class="mouse">`, joined by plain text, e.g.
   `<span class="lion">Aladdin</span> and the <span class="mouse">Magic&nbsp;Lamp</span>`.
   Use `&nbsp;` so a two-word part doesn't break across lines.
3. `IMG_DIR` / `AUD_DIR`, and the media comment above them (chunk count).
4. The `pages` array: one object per book page, `img` = picture number,
   `tr` = the Burmese lines (see "Burmese translation" below),
   `sentences` = list of sentences, each a list of `[text, audioNumber]` chunks.
5. The menu `<script src="/assets/js/nav-….js">` if the story goes in a
   different menu than the page you copied.

Keep `</head>` when copying only the top of a file — `build_single.py` refuses a
page without `<title>`, `<head>` and `<body>` (this happened with Aladdin).

### Chunking the text

The source is usually a `.md` with `Page 1` … `Page 8` (or `Scene 1 — …`)
headings, one sentence per line. Each heading becomes one book page; the
reader has no place for a page/scene title, so the headings aren't shown or
read. A long scene is fine — the text panel scrolls (Tinker Bell's scene 6 has
10 sentences).

- Chunk 1 is the title, alone, on page 1 (fairy tales and fables). Science
  readers have no title chunk; chunk 1 is the first sentence.
- Split sentences at natural pauses into chunks of about 2–6 words:
  before "and"/"but", after a fronted phrase ("One day," / "At last,"), between
  a quote and its speech tag (`'"Go down,"'` / `"said the magician."`).
  Short sentences stay one chunk.
- A moral ends the last page: `"Moral:"` is its own chunk.
- Audio numbers run 1..N in reading order with no gaps; `story_audio.py`
  checks this.
- Use straight quotes. A chunk containing `"` is written in single quotes:
  `['"I am your uncle."', 11]`; an apostrophe goes in double quotes:
  `["Aladdin's uncle.", 13]`.

For a long text it's easiest to write the chunks as a Python list and print
the `pages` JS with the numbers filled in.

Don't save the chunks in a separate `.txt` file: the `pages` array is the
only copy.

### Burmese translation (မြန်မာ)

Every new English story gets a Burmese translation, first used in
`s2.2_rainbow.html` (2026-11-03). If the source `.md` has it (after the
English, one line per English sentence), use that. If it doesn't, write it
while building the page:

- One Burmese line per line of the English source, so a line with two short
  sentences ("Oh no! Its legs were stuck!") is one `tr` string.
- Match `s2.4_underground.html` and `s2.5_amber.html`: written style ending in
  `…ပါသည်။` for statements, spoken style for exclamations
  (`ဘယ်လောက် လှပတဲ့ အတွေးလဲ!`).
- Where a sentence introduces a science term, keep the English term and put the
  Burmese in brackets: `resin (သစ်စေး)`. After that, use the Burmese alone.
- Translate the New Words too, one `tr` line per word page.
- Tell the user which lines to have a Burmese reader check if a word is
  uncertain.

In the page:

- `const TRANSLATION = { lang: "my", label: "မြန်မာ" };` before `pages`
  (`label` is the button text).
- Each page gets `tr: [...]` before `sentences`: one string per sentence, in
  the same order — the line count must equal the sentence count.
- Add the font to the Google Fonts link (`&family=Noto+Sans+Myanmar:wght@400`
  for Burmese).

`ytstory.js` then adds a toggle button in the footer, between **Play page** and
→. It starts off (the page looks as before); when on, each sentence gets its
translation underneath in a smaller grey line (`.tr` in `ytstory.css`). The
lines aren't tappable and have no audio. The choice is kept in
`localStorage` (`ytstory-tr-<lang>`), so it stays on across stories.

Offline: `build_single.py` inlines `eng/offline_fonts_my.css` (Noto Sans
Myanmar, base64) into any page containing Burmese characters. Another script
would need its own `offline_fonts_<lang>.css` and a matching check there, and
the `.tr` / `.tr-toggle` font stacks in `ytstory.css`.

### Numbered words (optional)

For a picture with numbered labels (several words on one picture), add
`numbered: true` to the page: `ytstory.js` shows `1.`, `2.` … before each
sentence (not tappable, not spoken), and the translation lines are indented
to line up under the word. First used for pictures 18–20 of the rainbow
story (2026-11-04), now the "New Words" pages at the end of
`s2.2_rainbow.html` (see below).

### New words at the end (optional)

When the source `.md` ends with a `New Words` list and there is one picture
per word, the words go on the same page after the story: one book page per
word, `heading: "New Words"`, one chunk each, audio numbers continuing after
the story. `ytstory.js` shows `heading` as a small label above the text (not
tappable, not spoken; `.page-heading` in `ytstory.css`). First used in
`s2.3_pitcher.html` (2026-11-05): 8 story pictures, then pictures 9–17 for
9 words, clips 79–87. A word page can hold several words with
`numbered: true` (rainbow pictures 18–20).

### A French version of a story

`s2.4_sousTerre.html` (2026-11-06) is the French text of
`s2.4_underground.html` in the same reader. It lives in `stories/`, next to the
English page, and differs in:

- `<html lang="fr">`: `story_audio.py` takes the voice from it (**Fr-Melissa**,
  `KzPZhE4ZluG6tjLsI1qh`, V4) and `check_audio.py` the Whisper language.
- `AUD_DIR` is `https://languages.rmlives.com/fr/yt/<slug>/`; both scripts use
  that path for `media/fr/yt/<slug>/` and the R2 key.
- `IMG_DIR` points at the English page's folder (the pictures have no text).
- `heading: "Vocabulaire"`. A gender note in brackets, `"l'arbre (m)"`, is shown
  but not spoken. Two words on one line in the source ("le sol / la terre") become
  two tappable lines on one word page.
- Straight apostrophes; a no-break space (a literal U+00A0 in the page) before
  `!`, `?`, `:` and `(m)` so they don't wrap alone onto the next line.

`check_audio.py` flags many French homophones that aren't errors: ses/ces,
vers/verres, poussent/pousse, aident/aide, mère/mer, grès/gré, arrivés/arrivé.
For anything else short, pad the clip with 1 s of silence on each side and
transcribe it with "medium" before re-taking it ("Elles aident l'arbre" came
back as "LZ l'arbre" from "small" but correct from "medium").

### Words on a separate page (older)

`s2.2_rainbow.html` had its words on a separate page,
`s2.2_rainbow_voc.html`; on 2026-11-05 they were moved to the end of the
story as pages 9–12 (pictures 17–20, clips 86–98) and the separate page was
removed. Its clips were copied from `rainbow-voc/01–13` to
`s2.2_rainbow/86–98` (media and elevenlabs-raw folders), so no new takes
were needed. The old `eng/yt/rainbow-voc/` folder on R2 is no longer used.

---

## Step 2 — Pictures

Put the 8 pictures in `img/ytstory/<slug>/` as `1.jpg` … `8.jpg`
(around 1230–1340 px wide, 16:9, a few hundred KB each). The user usually
provides these.

For an animated picture, add `imgExt: "webp"` right after that page's `img:`
line. `ytstory.js` and `build_single.py` both honor it (first used on page 3
of `s1.5_dayNight`). `ytquiz.js` does not, so quizzes still use `IMG_EXT`.

---

## Step 3 — Audio (ElevenLabs) and upload (R2)

```
python -E stories/story_audio.py <page>            # make missing clips
python -E stories/story_audio.py <page> --upload   # make missing clips, then upload
```

- Voice **British Modern RP-Woman** (`MOAe6Ugu3k7GT4qGvdi6`), model **V4**
  (`eleven_v4`); a `lang="fr"` page uses Fr-Melissa instead (see "A French
  version of a story"). Each chunk is its own request; quotation marks and
  bracketed notes are stripped from the text sent to the voice.
- Output matches the older story clips: 48 kHz stereo 320 kbps, leveled to
  -12 LUFS (the old clips are -11 to -14).
- Existing files are skipped. `--redo 12 30` makes new takes of single clips.
  Raw downloads are kept in `media\elevenlabs-raw\<slug>\` (not %TEMP%,
  which cleanups empty), so `--renormalize` re-levels without spending credits.
- `--upload` sends only new/changed files (MD5 vs. R2 ETag) to
  `eng/yt/<slug>/`. `--dry-run` with it only reports.
- Run with `python -E`, not `-I`: boto3/truststore are in the user
  site-packages. Keys come from the User env vars `ELEVENLABS_API_KEY`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.

**Check the takes** before uploading. Since 2026-11-12 `story_audio.py` does
this by itself for every new take (`--no-check` skips it); if anything is
flagged it holds back `--upload` and exits with an error. Once the flagged
clips are re-taken or judged fine by ear, run `--upload` again (no new takes,
so no check). To check clips by hand:

```
python -E stories/check_audio.py <page>          # or <page> 12 30 for single clips
```

It transcribes every clip with local Whisper ("small" model, GPU) and prints
`??` where the words differ from the chunk text. Most of those are only
spelling — "a lad in" for Aladdin, "Tinkerbell", "spider web", "Glo" — not bad
takes. Re-do (`--redo N`) any clip that is garbled or says the wrong words,
then listen to anything doubtful.

"small" often mishears very short clips (1–2 s) the same way take after take
— "Love, Tencel" for "laughed Hansel", "Hansel Grind" for "Hansel grinned"
(butterfly, 2026-10-25). If a re-take comes back with the same `??`,
transcribe it with the "medium" model before spending more credits:

```
python -E -c "import whisper; m = whisper.load_model('medium'); print(m.transcribe('media/eng/yt/<slug>/70.mp3', language='en')['text'])"
```

Some near-homophones neither model can settle ("in comfortable" /
"uncomfortable") — listen to those.

Both models also turn a rarer word into a commoner one that sounds close:
"pitcher" came back as "picture" in 19 of the pitcher-plant clips (2026-11-05),
including the word alone on its word page, take after take. Comparing
Whisper's score for both spellings, minus the same comparison on silence (to
take out its language prior), showed the audio favored "pitcher" in every
sentence clip. The lone word scored the same as a take of "pitch-er", which
can't contain a /k/, so the takes were fine. Don't spend credits re-taking a
clip like that; listen to it instead.

**Don't open a new page before its audio is uploaded.** A request for a
missing clip makes Cloudflare cache the 404 for 4 hours (`max-age=14400`), and
the clip stays broken after the upload (butterfly `01.mp3`, 2026-10-25). After
uploading, check every clip:

```
for i in $(seq 1 N); do n=$(printf %02d $i); c=$(curl -s -o /dev/null -w "%{http_code}" -I https://languages.rmlives.com/eng/yt/<slug>/$n.mp3); [ "$c" != 200 ] && echo "$n $c"; done
```

A cached 404 clears by itself after the 4 hours, or purge the URL in the
Cloudflare dashboard (Caching → Purge Cache → Custom URL).

**Replacing clips that are already online**: the pages load
`AUD_DIR + NN.mp3` with no version tag, so Cloudflare may keep serving the
old file for a while. Upload, then curl a few URLs and compare their MD5 with
the local files.

---

## Step 4 — Menu

Add the story to the right `GROUPS` list in the menu script, e.g.
`assets/js/nav-stories.js`:

```js
{ title: "Aladdin and the Magic Lamp", href: "Aladdin_lamp.html" },
```

`href` is the bare file name (the menu marks the current page by comparing it
with the URL's last part).

---

## Step 5 — Offline single-file copy

```
python -I eng/build_single.py <page>
```

Writes `eng/single/<page>.html` (≈3 MB): CSS, JS and offline fonts inlined,
pictures and audio embedded as base64 (audio re-encoded to 96 kbps mono, cached
in `eng/.build_cache/`; French pages keep the original audio, so they are
larger). The menu and Google Analytics are left out — the menu
didn't work on the Android tablet. Audio is taken from `media/eng/yt/<slug>/`
(or downloaded from `AUD_DIR`). With no page name it rebuilds every story.

---

## Step 6 — Copy to Google Drive

Copy the new page and its offline copy to the Google Drive folder
`G:\My Drive\_LANGUAGES`. That folder is how the user shares files with
anyone who has the link, so it must always hold the latest version
(`publish_story.py` does this copy):

| File | Copy to |
|---|---|
| `stories/<page>.html` | `G:\My Drive\_LANGUAGES\stories\` |
| `eng/single/<page>.html` | `G:\My Drive\_LANGUAGES\eng\single\` |
| The menu script from Step 4 (`assets/js/nav-*.js`) | `G:\My Drive\_LANGUAGES\assets\js\` |
| `assets/js/ytstory.js` / `assets/css/ytstory.css`, if changed | `G:\My Drive\_LANGUAGES\assets\js\` / `…\assets\css\` |

```
cp stories/<page>.html "/g/My Drive/_LANGUAGES/stories/"
cp eng/single/<page>.html "/g/My Drive/_LANGUAGES/eng/single/"
cp assets/js/nav-science.js "/g/My Drive/_LANGUAGES/assets/js/"   # the menu you edited
```

Copy them again whenever a page, its offline copy or its menu changes —
including when a picture is replaced (rebuild the offline copy first).

---

## Checklist

- [ ] `stories/<page>.html` with `</head>`, title, brand, `IMG_DIR`, `AUD_DIR`, `pages`
- [ ] Burmese: `TRANSLATION`, a `tr` line for every sentence and word page, the Noto Sans Myanmar font link
- [ ] 8 pictures in `img/ytstory/<slug>/`
- [ ] Audio made, checked with `check_audio.py`, uploaded; every URL returns 200, a few MD5-matched
- [ ] Menu entry in `assets/js/nav-*.js`
- [ ] `eng/single/<page>.html` built
- [ ] Page copied to `G:\My Drive\_LANGUAGES\stories\`, offline copy to `G:\My Drive\_LANGUAGES\eng\single\`, menu script to `G:\My Drive\_LANGUAGES\assets\js\`
- [ ] Commit the page, pictures, menu script (media/ and eng/single/ are git-ignored)

---

## Vocabulary quiz pages

A quiz page (`voc_<set>_quiz.html`, e.g. `voc_atSchool_quiz.html`) shows each
picture and the learner types the answer ("a book"). It uses the reader's
pictures and audio — no new media — with its own engine and styles:

| File | Path |
|---|---|
| Quiz engine | `assets/js/ytquiz.js` |
| Quiz styles (on top of `ytstory.css`) | `assets/css/ytquiz.css` |

To make one, copy `voc_atSchool_quiz.html` and change the title, brand,
`IMG_DIR` / `AUD_DIR`, and `pages`: one `{ img, sentences: [[[answer, audio#]]] }`
per picture. The engine takes the **last** chunk of each page as the answer, so
the reader's full `pages` array also works (but then every clip is embedded
offline). Optional `ALSO` lists other forms marked correct; `HINTS` gives a note shown with the correct answer
for near misses ("a book" for the dictionary, "a rubber" for eraser).

Rules (graded on recall; the learner is rewarded for correct answers):

- The only clue is the 🔊 audio cue, which says the answer. There is no
  show-answer button.
- One answer per picture. A wrong answer is final: the correct answer is shown
  and played, with a short note (`HINTS`, or "Check the spelling.",
  "Don't forget a pair of.", "Say the whole name.").
- Exception: the word is right but a/an is missing or wrong ("eraser",
  "a eraser") -> "Almost! Add a or an." and **one** more try. A correct second
  try counts. `SECOND_TRY` in `ytquiz.js` lists the mistake types that get it.
- Tapping 🔊 first costs no points: an answer typed after listening scores
  like any other. (`LISTEN_COUNTS_AS_HELP = true` in `ytquiz.js` would make it
  right but pointless, with a 🔊 badge on the end screen.)
- Case, spaces, hyphens and end punctuation are ignored.

The end screen shows the score (correct / total, percentage, grade from
`GRADES`), feedback grouped by mistake type, every wrong answer next to the
correct one, the right answers, and a **Practice these** round with the
wrong words.
`?order=book` keeps the book order (default: shuffled).

Add it to the menu next to its reader, build the offline copy as usual
(`python -I eng/build_single.py voc_atSchool_quiz`; `build_single.py` knows a
quiz page only uses the answer clips), and copy both to Google Drive (Step 6).

### Time quiz (two answers per picture)

`time_quiz.html` (2026-11-02) uses clocks 9–18 from `img/ytstory/time/` and its
own engine, `assets/js/ytquiz-time.js` + `assets/css/ytquiz-time.css` (on top of
`ytquiz.css`). Each page lists two answer chunks ("It's one twenty-seven." /
"It's twenty-seven past one."); each gets a box with a 🔊 on its left that says
it, and the boxes take the answers in either order. `ASK = ["What time is it?", 21]`
is played when each clock opens (and by the footer 🔊). It comes after `pages`
with the last number, so `story_audio.py` makes it like any other chunk.

Audio: its own folder, R2 `eng/yt/time-quiz/` (V4, British Modern RP-Woman).
"It is", hyphens and full stops are ignored; one more try for a missing "It's",
a missing apostrophe, figures ("It's 1:27") or the same answer twice. `ALSO`
holds accepted variants ("twenty-seven minutes past one", "quarter past ten").

### Spoken question (optional)

`s2.2_rainbow_quiz.html` (2026-11-03, pictures 9–17 of the rainbow story) adds a
spoken question to the one-answer engine. After `pages`, with the next audio
numbers:

```js
const ASK = { color: ["What color is it?", 10], thing: ["What is it?", 11] };
```

and `ask: "color"` / `ask: "thing"` on each page (or `const ASK = ["…", N]`
for one question on every picture). `ytquiz.js` plays it when each picture
opens (on the first tap if the browser blocked sound) and shows it in a
`<button id="ask">` above the box, which replays it. The footer 🔊 still says
the answer.

Answers with no article ("red", "water") are fine: "a red" gets
"Almost! No a or an here." and one more try (`extraArticle`), and
"It's red." / "It is red." counts as "red". Audio: R2 `eng/yt/rainbow-quiz/`.

A picture with several numbered labels can be asked once per label: repeat
the picture as separate pages, each with its own question (picture 21 of the
rainbow: `ask: "n1"` … `"n3"` = "What is number one?" …, added 2026-11-04 with
picture 20, "What is it called?" → refraction). Answers must come before the
questions in audio order, so adding answers later means moving the question
clips up (rename the files in `media/eng/yt/<slug>/` and
`media/elevenlabs-raw/<slug>/` before running `story_audio.py`) and bumping
the `?v=` tag after the upload. The shuffle keeps pages with the same picture
together, in book order (`order()` in `ytquiz.js`), so the three picture-21
questions come one after another.
