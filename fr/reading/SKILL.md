# Reading Lesson — Procedures

## Adding a new reading lesson

### 1. Create the HTML file

Copy `meteorite.html` (or `moon.html`) as your starting template and place it in `fr/reading/`.

Key sections to update:

| Section | What to change |
|---|---|
| `AUD_DIR` (script at the end of the page) | `https://languages.rmlives.com/lessons/read/<topic>/` |
| `<audio id="audioElement" data-audio="audio">` | Name of the whole-text recording in `AUD_DIR` (usually `audio`) |
| `<h1>` / `<h5>` | Article title and subtitle |
| `.french-text` | French body paragraphs with `.word-info` tooltip spans |
| `.english-text` | English translation paragraphs |
| `.glossary-section` | Glossary table rows; `data-audio` = the word's clip name in `AUD_DIR` |
| `.supplemental-section` | Links to NotebookLM video/audio pages |
| `img src` | `/img/<topic>.png` |
| `.french-text .<topic>-image` | Rename the float-left image CSS class to match topic |

**Tooltip span pattern:**
```html
<span
  class="word-info"
  data-bs-toggle="tooltip"
  data-bs-placement="top"
  title="/IPA/"
  data-meaning="english meaning"
  data-origin="infinitive /IPA/"   <!-- optional -->
>word</span>
```

**Glossary row pattern:**
```html
<tr>
  <td class="glossary-word"
      data-audio="<word>">
    french word
  </td>
  <td style="width: 40px"></td>
  <td>english meaning</td>
</tr>
```

**Audio URLs:** every clip is `AUD_DIR + data-audio + "." + AUD_EXT`, set in
the script at the end of the page:

```js
const AUD_DIR = "https://languages.rmlives.com/lessons/read/<topic>/";
const AUD_EXT = "mp3";
const AUD_VER = "";
```

- A name with its own extension is used as is (`data-audio="goutte.m4a"`).
- A player file outside the topic folder keeps a full `src` and no
  `data-audio` (amber: `lessons/read/amber.m4a`).
- **Replacing clips that are already online:** upload first, then set
  `AUD_VER` to the time (`YYMMDDHHmm`) — it adds `?v=…` to every clip on the
  page, so browsers and Cloudflare (which cache for 4 hours) fetch the new
  files. Setting it before the upload makes Cloudflare cache the old file
  under the new URL.

### Flash-card audio (fc-<topic>.html)

`fc-beaver.html` (2026-11-04) plays a clip when a card turns to its back.
Each card in `baseDeck` has `say: ["French text", N]`; clip N is
`AUD_DIR + NN.mp3` (`lessons/read/fc-<topic>/`, set with `AUD_EXT` /
`AUD_VER` above the deck). An optional `sayFront` plays when the card turns
back to the front. Cards without `say` stay silent.

- Word cards: the French word; both forms when the masculine and feminine
  sound different ("précieux, précieuse"), one when they sound the same
  ("dévoué", "poilu").
- Fill-in-the-blank cards: the whole sentence with the word filled in.
- Question cards (English + French translation): `sayFront` = the French
  question, `say` = the French answer. Added after the rest (clips 54–73,
  so the clips already online kept their numbers; `fc_audio.py` only needs
  1..N without gaps, in any order). A blank in a question ("des … sûrs") is
  read straight through, so clip 60 got 1 s of silence spliced in after
  "des" (in the raw take too, so `--renormalize` keeps it; `--redo 60`
  would lose it).

```
python -E fr/reading/fc_audio.py fc-beaver              # make missing clips (V4, Fr-Adrien, -12 LUFS)
python -E fr/reading/fc_audio.py fc-beaver --check      # Whisper medium, 1 s padding
python -E fr/reading/fc_audio.py fc-beaver --redo 29    # new take
python -E fr/reading/fc_audio.py fc-beaver --upload     # new/changed clips to R2
```

Whisper flags many homophones (couper/coupé, étang/étant, doux/d'où) —
ignore those. It also can't hear isolated "poilu" or the first word of
"surpuissant, surpuissante" / "long, longue" on any take; listen to those.

---

### 2. Update nav-read.js

File: `assets/js/nav-read.js`

Add a link inside the correct category `<div id="...">` block under the Science, Nature, Health, History, or Culture section:

```html
<a href="<topic>.html" class="sidebar-link">
  🌙 &nbsp;Display Name
</a>
```

**Category IDs:** `science`, `nature`, `cholesterol` (Health), `history`, `culture`

---

### 3. Update sitemap.html

File: `sitemap.html` (root of `languages/`)

**Add a node** to `graphData.nodes` (after the last entry in the same group):

```js
{
  id: "Display Name",
  group: 4,          // 4 = Reading cluster
  level: 2,
  url: "fr/reading/<topic>.html",
},
```

**Add a link** to `graphData.links` under the appropriate parent category:

```js
{ source: "Science", target: "Display Name" },
```

Category parent nodes: `Science`, `Nature`, `Health`, `History`, `Culture`

---

### 4. Create the video page

Copy `video-meteorite.html` as a template and save as `video-<topic>.html` in `fr/reading/`.

Update these two values:

| Field | Value |
|---|---|
| `<title>` | Topic name (e.g. `Moon`) |
| `<h1>` | Full article title |
| `<video src="...">` | `https://languages.rmlives.com/lessons/read/video-<topic>.mp4` |
| `<p class="lead ...">` | One-line English description of the video |

The file is linked from the **Supplemental Section** of the main lesson page:

```html
<a href="video-<topic>.html" target="_blank">
  <li>Topic video (NotebookLM)</li>
</a>
```

---

### 5. Version-stamp nav-read.js across the reading folder

After any change to `nav-read.js`, update the `?v=` cache-busting parameter in **every** reading HTML file so browsers pick up the new sidebar.

**Version format:** `YYMMDDHHmm` (e.g. `2606061552` = 2026-06-06 15:52)

Run this PowerShell command from any directory:

```powershell
$v = Get-Date -Format "yyMMddHHmm"
$folder = "c:\Users\Owner\Desktop\MAIN\WEBSITE\My Website\languages\fr\reading"
Get-ChildItem $folder -Filter "*.html" | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($c -match 'nav-read\.js\?v=\d+') {
        $c = $c -replace 'nav-read\.js\?v=\d+', "nav-read.js?v=$v"
        Set-Content $_.FullName -Value $c -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($_.Name)"
    }
}
```

> Run this every time nav-read.js is modified.

---

## Checklist for a new lesson

- [ ] `fr/reading/<topic>.html` created from template
- [ ] French text proofread for correct accented characters
- [ ] English translation added
- [ ] Tooltip spans added for 10–15 key vocabulary words
- [ ] Glossary table populated with `data-audio` clip names, `AUD_DIR` set
- [ ] `fr/reading/video-<topic>.html` created from template
- [ ] Supplemental section links added (video, NotebookLM audio)
- [ ] `/img/<topic>.png` image uploaded
- [ ] Audio files uploaded to `languages.rmlives.com/lessons/read/<topic>/`
- [ ] Entry added to `nav-read.js` under the correct category
- [ ] Node + link added to `sitemap.html`
- [ ] nav-read.js version stamp updated across all reading HTML files
- [ ] Committed to git
