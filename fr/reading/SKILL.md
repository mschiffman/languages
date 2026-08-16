# Reading Lesson — Procedures

## Adding a new reading lesson

### 1. Create the HTML file

Copy `meteorite.html` (or `moon.html`) as your starting template and place it in `fr/reading/`.

Key sections to update:

| Section | What to change |
|---|---|
| `<audio src="...">` | Point to `https://languages.rmlives.com/lessons/read/<topic>/audio.mp3` |
| `<h1>` / `<h5>` | Article title and subtitle |
| `.french-text` | French body paragraphs with `.word-info` tooltip spans |
| `.english-text` | English translation paragraphs |
| `.glossary-section` | Glossary table rows with `data-audio` pointing to word MP3s |
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
      data-audio="https://languages.rmlives.com/lessons/read/<topic>/<word>.mp3">
    french word
  </td>
  <td style="width: 40px"></td>
  <td>english meaning</td>
</tr>
```

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
- [ ] Glossary table populated with MP3 `data-audio` URLs
- [ ] `fr/reading/video-<topic>.html` created from template
- [ ] Supplemental section links added (video, NotebookLM audio)
- [ ] `/img/<topic>.png` image uploaded
- [ ] Audio files uploaded to `languages.rmlives.com/lessons/read/<topic>/`
- [ ] Entry added to `nav-read.js` under the correct category
- [ ] Node + link added to `sitemap.html`
- [ ] nav-read.js version stamp updated across all reading HTML files
- [ ] Committed to git
