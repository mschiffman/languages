# Adding or Changing an Expression Page

This document describes how to add a "Les Expressions" flashcard page to
`fr/expression/` (or add cards to an existing one), make its audio, and wire it
into the archive, the menu and the site map.

The pages were called `n-<topic>.html` until 2026-10-24, when they replaced the
old Bootstrap pages of the same name (which used `expression.js` /
`nav-expression.js`) and took their names.

---

## File locations

| File | Path |
|---|---|
| Expression page | `fr/expression/<topic>.html` |
| Card engine (renders the cards, plays audio) | `assets/js/expression-flash.js` |
| Hamburger menu (category list) | `assets/js/nav-expression-flash.js` |
| Stylesheet | `assets/css/pimsleur.css` (page) / `assets/css/frArchive.css` (archive) |
| Archive index | `fr/expression/archive.html` |
| Site map | `sitemap.html` (root) |
| Audio, one clip per card in reading order | `media/lessons/expressions/<folder>/01.mp3` … `NN.mp3` |
| Audio online (Cloudflare R2, bucket `languages`) | `https://languages.rmlives.com/lessons/Expressions/<folder>/NN.mp3` |
| Make audio / upload audio | `fr/expression/make_audio.py` / `fr/expression/upload_audio.py` |
| Offline copies (not in git) | `fr/expression/single/<topic>.html`, built by `build_single.py` |
| Anki decks | `fr/expression/anki/` (see its own `SKILL.md`) |

`<folder>` is normally the topic name. The one exception: `offers.html` uses
the folder `offer`. The page's `AUD_DIR` is what counts.

Pages without cards that also live here: `archive.html`, `me-*.html`,
`slides-connectors.html`, `video-connectors.html`.

---

## Step 1 — Create `<topic>.html`

Copy a recent page (`wishes.html`, `permission.html`) and change:

- `<title>` → `Les Expressions — <Topic>`
- the two header badges → `EXPRESSIONS` and `<TOPIC>`
- the `<h1>` → `<Topic>`; the line under it → the French title
  (e.g. `Souhaits et formules`)
- the footer → `<span id="count">N</span> expressions · <Topic> · Bonne chance&#8239;!`
  (the engine overwrites N with the real count, but keep it right for the source)
- the comment at the top of the data `<script>` → `01.mp3 … NN.mp3`
- `AUD_DIR` → `https://languages.rmlives.com/lessons/Expressions/<folder>/`
- `AUD_EXT` → `mp3?v=<YYMMDD>` (see Step 3 before choosing it)

Keep the rest unchanged: the Google tag, the Tailwind CDN script, the fonts,
`pimsleur.css`, `<div id="cards"></div>`, and the two scripts at the end:

```html
<script src="../../assets/js/expression-flash.js"></script>
<script src="../../assets/js/nav-expression-flash.js"></script>
```

### The data block

All the content is in `categories`, rendered by `expression-flash.js`:

```js
const categories = [
  {
    en: "Everyday send-offs",          // section title
    fr: "Au quotidien",                // shown next to it, in italics
    desc: "What you say as people leave: shops, work, friends.",
    cards: [
      ["Bonne journée !", "Have a good day!",
        "Note shown in the popup (usage, register, formal/plural form…).",
        "Example in French.", "Example in English."],
      // more example pairs may follow; the note may be "" if the examples say enough
    ],
  },
  // 3–6 sections
];
```

- Each card is `[French, English, note, exFR, exEN, exFR, exEN, …]`.
- Write French with a normal space before `! ? ; :`. The engine turns it into
  a narrow no-break space.
- IPA goes inline in the note between slashes, e.g. `Fier /fjɛʁ/: the r is
  pronounced.`
- Gendered forms: `désolé(e)`, `fier(ère)`. The audio is a male voice, and
  `make_audio.py` drops the `(e)` part when it makes the clip.
- **Audio follows reading order across all sections** (card 1 = `01.mp3`).
  Inserting a card anywhere but at the very end shifts every later clip; see
  Step 3.

---

## Step 2 — Make the audio

One clip per card: the French phrase only (not the examples), ElevenLabs
**v3**, voice **Fr-Adrien** (`OrVRsyqKB4siJQenyBu5`), mono 44.1 kHz 192 kbps,
leveled to -16 LUFS.

```
python -E fr/expression/make_audio.py <topic>
```

- It only makes the clips that are missing in `media/lessons/expressions/<folder>/`.
  Existing files are never touched.
- Each clip is checked with local Whisper ("small"). If the transcript
  doesn't match, it makes up to 4 more takes and keeps the closest. Raw takes
  are kept in `%TEMP%/elevenlabs-raw/<folder>/NN_tK.mp3`.
- Lines marked `<<< check` didn't match. Whisper is unreliable on clips under
  1 s: it hears *dodo* as *doudou* and joins words (`DORBIEN`). Look at what
  it heard, and if in doubt ask the user to listen.
- If the takes keep failing, regenerate with `voice_settings: {"stability": 1.0}`
  ("Robust").
- To force a pronunciation, write IPA between slashes in the text sent to
  ElevenLabs, e.g. `/nɥi/`. SSML `<phoneme>` tags don't work on v3: it reads
  them aloud.
- The API key is in the User environment variable `ELEVENLABS_API_KEY`.

---

## Step 3 — Upload the audio, then set the version tag

```
python -E fr/expression/upload_audio.py <folder>
```

It sends only the files that are missing online or differ (MD5), then checks
every file. It needs the User environment variables `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`, and `-E` (not `-I`) for boto3.

**Inserting cards into an existing page** (anything other than appending at
the very end):

1. Insert the cards in the page.
2. Rename the later clips upward, from the last one down
   (`30.mp3` → `31.mp3`, …). Do the same in `%TEMP%/elevenlabs-raw/<folder>/`
   (`NN.mp3` and `NN_tK.mp3`), otherwise `make_audio.py` reuses the old takes.
3. Run `make_audio.py` to make the new clips.
4. Upload.
5. **Only now** change `AUD_EXT` to a new `?v=` tag, and push.

Cloudflare caches each URL, query string included. If anyone requests the
new `?v=` URL before the upload (a local preview is enough), the old clip gets
cached under it and the cards play the wrong audio. Check afterwards by
fetching a few clips with the new tag and comparing their MD5 with the local
files. If they differ, change the tag again.

---

## Step 4 — Menu, archive, site map

**a) Menu** (`assets/js/nav-expression-flash.js`): add an entry to
`CATEGORIES`. The first entry, `📚 All Expressions`, links to the archive.

```js
{ label: "🙋 Permission", href: "permission.html" },
```

**b) Archive** (`archive.html`): two additions, both keyed by the same anchor id.

Sidebar link in the `#spy` list:

```html
<a class="list-group-item list-group-item-action" href="#<anchor-id>"
  >🙋 <Topic Label></a
>
```

Grid card:

```html
<!-- <Topic Label> -->
<div
  class="col-md-6"
  id="<anchor-id>"
  data-aos="fade-up"
  data-aos-delay="100"
  data-aos-once="false"
>
  <div class="card fx-card b-<color>">
    <span class="emoji-dot dot-<color>" aria-hidden="true"
      ><i class="bi bi-<icon>"></i
    ></span>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <h3 class="card-title mb-2"><Topic Label></h3>
        <a class="small text-decoration-none" href="<topic>.html"
          >Voir plus →</a
        >
      </div>
      <ul class="list ps-3">
        <li>• French — <em>English</em></li>
        <li>• French — <em>English</em></li>
        <li>• French — <em>English</em></li>
      </ul>
    </div>
  </div>
</div>
```

- Pick 3 short, representative phrases from the page.
- Color pairs (`b-*` / `dot-*`, from `frArchive.css`): `blue`, `red`,
  `violet`, `orange`, `teal`, `pumpkin`, `crimson`, `green`, `yellow`, `pink`,
  `indigo`, `cyan`, `lime`, `amber`. Pick one not used by the adjacent cards.
- Pick a Bootstrap Icons class (`bi bi-*`, version 1.11.3) that fits the theme.

**c) Site map** (`sitemap.html`): add a node under the Expressions
grandchildren (Positive, Negative or Conversational), and a link from that
group:

```js
{
  id: "Permission",
  group: 5,
  level: 2,
  url: "fr/expression/permission.html",
},
// …in links:
{ source: "Conversational", target: "Permission" },
```

Node ids must be unique across the whole site map.

---

## Step 5 — Offline copy

```
python -I fr/expression/build_single.py <topic>
```

This writes `fr/expression/single/<topic>.html`, about 1–2 MB. It embeds
the audio from the local folder, inlines the CSS and JS, compiles Tailwind
and embeds the fonts. The menu is left out. Run it with no names to rebuild
every page that has a `categories` block. `build_single_small.py` makes
96 kbps copies for sharing. `single/` is in `.gitignore`.

Rebuild the offline copy whenever the page or its audio changes.

---

## Checklist

- [ ] `<topic>.html` created: title, badges, h1, French subtitle, footer, `AUD_DIR`
- [ ] `categories` filled; card text, notes and examples checked
- [ ] Audio made (`make_audio.py`); `<<< check` lines reviewed; clip count = card count
- [ ] Audio uploaded (`upload_audio.py`), **then** `AUD_EXT` set to a new `?v=`
- [ ] Menu entry in `nav-expression-flash.js`
- [ ] Archive sidebar link and grid card (same anchor id, distinct color)
- [ ] Site map node and link
- [ ] Offline copy built
- [ ] Committed and pushed (when the user asks)
