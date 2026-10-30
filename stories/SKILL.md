# Adding a Story Page

This document describes how to add an illustrated read-along story to
`stories/` (fairy tales, Aesop fables, science readers): the page, its audio,
the menu entry and the offline single-file copy. The worked example is
`Aladdin_lamp.html` (2026-10-24).

Each page is a slider of 8 book pages. Every page shows a picture and its
text, split into short phrases ("chunks"). Tapping a chunk plays that chunk;
**Play page** plays the whole page chunk by chunk.

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

---

## Step 2 — Pictures

Put the 8 pictures in `img/ytstory/<slug>/` as `1.jpg` … `8.jpg`
(around 1230–1340 px wide, 16:9, a few hundred KB each). The user usually
provides these.

---

## Step 3 — Audio (ElevenLabs) and upload (R2)

```
python -E stories/story_audio.py <page>            # make missing clips
python -E stories/story_audio.py <page> --upload   # make missing clips, then upload
```

- Voice **British Modern RP-Woman** (`MOAe6Ugu3k7GT4qGvdi6`), model **V4**
  (`eleven_v4`). Each chunk is its own request; quotation marks are stripped
  from the text sent to the voice.
- Output matches the older story clips: 48 kHz stereo 320 kbps, leveled to
  -12 LUFS (the old clips are -11 to -14).
- Existing files are skipped. `--redo 12 30` makes new takes of single clips.
  Raw downloads are kept in `%TEMP%\elevenlabs-raw\<slug>\`, so
  `--renormalize` re-levels without spending credits.
- `--upload` sends only new/changed files (MD5 vs. R2 ETag) to
  `eng/yt/<slug>/`. `--dry-run` with it only reports.
- Run with `python -E`, not `-I`: boto3/truststore are in the user
  site-packages. Keys come from the User env vars `ELEVENLABS_API_KEY`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.

**Check the takes** before uploading:

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
in `eng/.build_cache/`). The menu and Google Analytics are left out — the menu
didn't work on the Android tablet. Audio is taken from `media/eng/yt/<slug>/`
(or downloaded from `AUD_DIR`). With no page name it rebuilds every story.

---

## Step 6 — Copy to Google Drive

Copy the new page and its offline copy to the Google Drive folder
`G:\My Drive\_LANGUAGES`:

| File | Copy to |
|---|---|
| `stories/<page>.html` | `G:\My Drive\_LANGUAGES\stories\` |
| `eng/single/<page>.html` | `G:\My Drive\_LANGUAGES\eng\single\` |

```
cp stories/<page>.html "/g/My Drive/_LANGUAGES/stories/"
cp eng/single/<page>.html "/g/My Drive/_LANGUAGES/eng/single/"
```

Copy them again whenever a page or its offline copy is rebuilt.

---

## Checklist

- [ ] `stories/<page>.html` with `</head>`, title, brand, `IMG_DIR`, `AUD_DIR`, `pages`
- [ ] 8 pictures in `img/ytstory/<slug>/`
- [ ] Audio made, checked with `check_audio.py`, uploaded; every URL returns 200, a few MD5-matched
- [ ] Menu entry in `assets/js/nav-*.js`
- [ ] `eng/single/<page>.html` built
- [ ] Page copied to `G:\My Drive\_LANGUAGES\stories\`, offline copy to `G:\My Drive\_LANGUAGES\eng\single\`
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
