# Adding or Changing an English Expression Page

This document describes how to add a flashcard page to `eng/expressions/`
(English phrases with Burmese translations), make its audio, wire it into the
menu and the English map, and build its offline copy.

The pages share their engine with the French expression pages
(`fr/expression/`, which has its own `SKILL.md`), but the voice, audio settings,
paths and menu are different.

---

## File locations

| File | Path |
|---|---|
| Expression page | `eng/expressions/<topic>.html` |
| Card engine (shared with French) | `assets/js/expression-flash.js` |
| Hamburger menu (category list) | `assets/js/nav-eng-expression-flash.js` |
| Quiz engine ("Test yourself"; its header documents the data format) | `assets/js/expression-quiz.js` |
| Quiz styles | `assets/css/expression-quiz.css` |
| Typing quiz: Burmese in the frame → type the English (optional; `ytquiz.js` text mode, styled by `ytstory.css` + `ytquiz.css`) | `eng/expressions/<topic>_quiz.html`, model: `greet_goodbye_quiz.html` |
| Alpine.js 3.17.5 (used by the quiz; kept local so the offline build inlines it) | `assets/js/alpine.min.js` |
| Stylesheet | `assets/css/pimsleur.css` |
| English map | `english.html` (root) |
| Make / upload audio | `eng/expressions/make_audio.py` |
| Audio, one clip per card in reading order (not in git) | `media/eng/expressions/<folder>/01.mp3` … `NN.mp3` |
| Raw ElevenLabs takes (not in git) | `media/elevenlabs-raw/eng_<folder>/NN.mp3` |
| Audio online (Cloudflare R2, bucket `languages`) | `https://languages.rmlives.com/eng/expressions/<folder>/NN.mp3` |
| Offline copies (not in git) | `eng/expressions/single/<topic>.html`, built by `build_single.py` |

`<folder>` is the last part of the page's `AUD_DIR`, normally the topic name.

Current pages: `greet_goodbye` (29 cards, quiz of 15), `thank` (27), `apology` (27), `exclamation` (31), `not_understanding` (32), `ask` (29), `offer_accept` (31), `polite_refusal` (26), `likes_dislikes` (27), `opinion` (32), `small_talk` (33).

---

## Step 1 — Create `<topic>.html`

Copy a recent page (`apology.html`) and change every label left over from it:

- `<title>` → `Expressions — <Topic>`
- the second header badge → `<TOPIC>`
- the `<h1>` → `<Topic>`; the line under it → the Burmese title. If the title
  has a word of 10 letters or more, change the `<h1>` class `text-7xl` to
  `text-5xl sm:text-7xl`, or the page scrolls sideways on phones
- the footer → `<span id="count">N</span> expressions · <Topic>`
  (the engine overwrites N with the real count, but keep it right for the source)
- the comment at the top of the data `<script>` → `01.mp3 … NN.mp3`
- `AUD_DIR` → `https://languages.rmlives.com/eng/expressions/<folder>/`

Leave `AUD_EXT` alone: `make_audio.py --upload` sets it (Step 3).

After editing, search the page for the old topic's words, in English and in
Burmese.

Keep the rest unchanged, including the two scripts at the end:

```html
<script src="../../assets/js/expression-flash.js"></script>
<script src="../../assets/js/nav-eng-expression-flash.js"></script>
```

### The data block

```js
const categories = [
  {
    en: "Saying sorry",                 // section title
    my: "ဆောရီး ပြောခြင်း",              // shown next to it, in italics
    desc: "Quick, everyday apologies for small things.",
    cards: [
      ["Sorry!", "ဆောရီး။",
        "Note shown in the popup (usage, register, what Burmese speakers should watch for).",
        "Example in English.", "Example in Burmese."],
    ],
  },
  // 3–6 sections
];
```

- Each card is `[English, Burmese, note, exEN, exMY, exEN, exMY, …]`. The note
  may be `""` if the examples say enough.
- **Each card must start on its own line with `["`, and the English phrase can't
  contain a `"`.** That is how `make_audio.py` finds the cards. Examples and
  later lines must not start with `[`.
- Don't put a space before `! ? ; :`. The engine is shared with French and turns
  such a space into a narrow no-break space.
- A blank is written `___` (`Thanks for the ___.`). The voice says it as a
  trailing `Thanks for the...`.
- Burmese script inside an English phrase (`How do you say လ in English?`) needs
  a spoken form: add the card to `SAY` at the top of `make_audio.py`
  (`How do you say la in English?`). Left as it is, the voice may read it as an
  English letter.
- **Audio follows reading order across all sections** (card 1 = `01.mp3`).
  Inserting a card anywhere but at the very end shifts every later clip; see
  Step 3.

### The quiz (optional, "Test yourself")

A page with a `quiz` array gets a "Test yourself" button above the cards that
opens the quiz over them; `<topic>.html#quiz` opens it directly. Model a new
one on `greet_goodbye.html`, and see the header of
`assets/js/expression-quiz.js` for every field.

1. Add the stylesheet after `pimsleur.css`:
   `<link rel="stylesheet" href="../../assets/css/expression-quiz.css" />`
2. Add `const quiz = [ … ];` after `categories`, in the same `<script>`.
3. Scripts at the end of `<body>`, in this order (Alpine must be last):

   ```html
   <script src="../../assets/js/expression-flash.js"></script>
   <script src="../../assets/js/expression-quiz.js"></script>
   <script src="../../assets/js/nav-eng-expression-flash.js"></script>
   <script src="../../assets/js/alpine.min.js"></script>
   ```

Writing the questions:

- Four types: `say` (scene → pick the phrase), `reply` (hear a line → pick
  the answer), `build` (tap word tiles into order), `judge` (OK / not OK).
  About 15 per topic, mixed.
- Phrases are the cards' English, **exactly** as written (`"Good evening."`).
  That gives the question the card's clip, Burmese and note, so a quiz needs no
  new audio. Answers, `reply` prompts and `judge` phrases must be cards; a
  wrong option can be any text (it just has no 🔊).
- Every wrong option has a mistake tag: `time`, `moment`, `register`,
  `literal`, `reply`, `words` (add others per page with `quizTags`). The
  results group mistakes by tag. **If you can't name why an option is wrong,
  it isn't a wrong option**: a near-acceptable answer (`Good, thanks.` without
  `And you?`) makes the question unfair.
- Notes default to the cards' notes. Write one when the card's note doesn't
  explain the mistake in this scene.
- Scene and cue lines: short parts joined by ` · `, each starting with an
  emoji; the Burmese scene goes in `my`.
- **No line of the quiz may start with `["`**: `make_audio.py` would count it
  as a card. Write wrong options as `wrong: { "Hey!": ["register", "…"] }`.
- Test it on the page: data mistakes (a phrase that isn't a card, an unknown
  tag) are listed in red at the top of the quiz.

---

## Step 2 — Make the audio

One clip per card: the English phrase only, no Burmese and no examples.
ElevenLabs **V4** (`eleven_v4`), voice **British Modern RP-Woman**
(`MOAe6Ugu3k7GT4qGvdi6`), 48 kHz stereo 320 kbps, -12 LUFS.

Run from the `LANGUAGES` root:

```
python -E eng/expressions/make_audio.py <topic>
python -E eng/expressions/make_audio.py <topic> --redo 6 12
```

- It only makes the clips that are missing. `--redo` makes new takes of the
  numbers given.
- Each new clip is checked with local Whisper ("small"), and a mismatch is
  marked `<<< check`. Look at what Whisper heard, and if in doubt ask the user
  to listen. Whisper fills in unfinished phrases: it heard `Thanks for the...`
  as `Thanks for that`.
- The API key is in the User environment variable `ELEVENLABS_API_KEY`.
- Use `-E`, not `-I`: `-I` hides the user site-packages where boto3 is installed.

---

## Step 3 — Upload the audio

```
python -E eng/expressions/make_audio.py <topic> --upload
```

This does the following, in this order:

1. Uploads the clips that are missing online or differ (MD5).
2. If anything was uploaded, writes a new `?v=` tag (`YYMMDDHHMM`) into the
   page's `AUD_EXT`.
3. Fetches every clip through the CDN with the current tag and compares it with
   the local file.

The order matters. Cloudflare caches each URL, query string included. If anyone
requests a new `?v=` URL before the upload (a local preview is enough), the old
clip gets cached under it and the cards play the wrong audio. If the last step
reports different files, change the tag again.

It needs the User environment variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and
`R2_SECRET_ACCESS_KEY`.

**Inserting cards into an existing page** (anything other than appending at the
very end):

1. Insert the cards in the page.
2. Rename the later clips upward, from the last one down (`30.mp3` → `31.mp3`,
   …), in both `media/eng/expressions/<folder>/` and
   `media/elevenlabs-raw/eng_<folder>/`.
3. Run `make_audio.py <topic>` to make the new clips.
4. Run `make_audio.py <topic> --upload`, then rebuild the offline copy.

---

## Step 4 — Menu and English map

**a) Menu** (`assets/js/nav-eng-expression-flash.js`): add an entry to
`CATEGORIES`.

```js
{ label: "🙇 Apology", href: "apology.html" },
```

A topic with a typing quiz (`<topic>_quiz.html`) also gets `quiz:`, which adds
a "✍️ Quiz" link under it. The quiz page loads the same menu, styled by
`assets/css/nav-eng-expression.css` (it doesn't load `pimsleur.css`):

```js
{ label: "👋 Greetings & Goodbyes", href: "greet_goodbye.html", quiz: "greet_goodbye_quiz.html" },
```

**b) English map** (`english.html`): add a node to the `expressions` group, and
a link from `expressions`.

```js
{
  id: "apology",
  group: 4,
  level: 2,
  url: "eng/expressions/apology.html",
},
// …in links:
{ source: "expressions", target: "apology" },
```

Node ids must be unique across the whole map. The English expressions are not
in `sitemap.html`.

---

## Step 5 — Offline copy

```
python -I eng/expressions/build_single.py <topic>
```

This writes `eng/expressions/single/<topic>.html`, about 2 MB. It embeds the
audio from the local folder as recorded, inlines the CSS and JS, compiles
Tailwind and embeds the fonts, including Noto Sans Myanmar for the Burmese. The
menu is left out; the quiz, with Alpine, is included and uses the same embedded
clips. Run it with no names to rebuild every page.

Typing quizzes are built the same way (`build_single.py greet_goodbye_quiz`,
about 2 MB), by the stories builder `eng/build_single.py` with the audio as
recorded. Their stylesheet and script links must start with `/assets/…`: the
builder only inlines site-absolute links.

Rebuild the offline copy whenever the page or its audio changes, and after the
upload, so it contains the final clips.

---

## Checklist

- [ ] `<topic>.html` created: title, badge, h1, Burmese subtitle, footer, comment, `AUD_DIR`
- [ ] No leftovers from the copied page (English and Burmese)
- [ ] `categories` filled; card text, notes and examples checked
- [ ] Audio made; `<<< check` lines reviewed; clip count = card count
- [ ] Audio uploaded with `--upload`; CDN check matches
- [ ] Menu entry in `nav-eng-expression-flash.js`
- [ ] Quiz (if any): stylesheet + scripts added, played through once, no red data problems
- [ ] Node and link in `english.html`
- [ ] Offline copy built
- [ ] Committed and pushed (when the user asks)
