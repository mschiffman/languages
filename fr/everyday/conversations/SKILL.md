# Adding a New Conversation

This document describes the full procedure for adding a new conversation to the site.

---

## File locations

| File | Path |
|---|---|
| Conversation HTML | `fr/everyday/conversations/convN.html` |
| Mind map HTML | `fr/everyday/tree-convN.html` |
| Navigation script | `assets/js/nav-conv.js` |
| Source transcript | Provided as a `.txt` file |

---

## Step 1 — Prepare the source text

The source `.txt` file is a back-and-forth conversation, one paragraph per speaker, separated by blank lines. The txt file is often saved in a broken encoding (e.g. `Ã©` instead of `é`). **Decode all characters to proper UTF-8 before use.** Common substitutions:

| Broken | Correct |
|---|---|
| `Ã©` | `é` |
| `Ã¨` | `è` |
| `Ã ` | `à` |
| `Ã§` | `ç` |
| `Ã´` | `ô` |
| `Ã®` | `î` |
| `Ã»` | `û` |
| `Å"` | `œ` |
| `â€™` | `'` |
| `Â«` / `Â»` | `«` / `»` |
| `Ã‰` | `É` |
| `Ã€` | `À` |

---

## Step 2 — Create `convN.html`

Copy `conv17.html` (or any recent conversation) as a template. Update:

- `<title>` → `Conversation N`
- `<h1>` → `Conversation N - [topic title]`
- `nav-conv.js?v=` → set a placeholder version tag for now (e.g. `?v=260604a`); the final value is set in Step 5 below
- Audio `src` URLs → `https://languages.rmlives.com/lessons/everyday/YYMMDD/01.mp3` (increment for each block)
- Supplement section link → `../tree-convN.html`

### Speaker alternation

Paragraphs alternate between the two speakers:
- **Odd paragraphs** (1, 3, 5…) — Marissa → use `class="french-text"`
- **Even paragraphs** (2, 4, 6…) — AI/partner → use `class="english-text"`

### Per-block structure

```html
<div class="french-text" data-aos="fade-up">
  <audio controls class="mb-2" src="https://languages.rmlives.com/lessons/everyday/YYMMDD/NN.mp3"></audio>
  <p>
    [French text]
    <i class="bi bi-translate"></i>
  </p>
</div>
<br />
<div class="translation">
  <p>[English translation]</p>
</div>
<br />
```

The `.translation` div has `display: none` by default; the translate icon toggles it.

For notable vocabulary, wrap in a tooltip span:

```html
<span class="word-info" data-bs-toggle="tooltip" data-bs-placement="top"
  title="/IPA/" data-meaning="English meaning">French phrase</span>
```

---

## Step 3 — Create `tree-convN.html`

Copy `tree-conv17.html` as a template. Update:

- `<title>` → `Mind Map - Conversation N`
- `treeData.name` → `"Conversation N"`
- Replace `treeData.children` with 5–6 thematic branches extracted from the conversation.

### Branch structure

Each branch has a `name` (theme label), a `style` with `stroke` and `fill` (hex color), and a `children` array of leaf nodes. Each leaf is `{ name: "French phrase - English translation" }`.

**Color palette used so far** (avoid repeating within the same mind map):

| Color | Hex |
|---|---|
| Green | `#007850` |
| Orange | `#e07b39` |
| Dark red | `#9e2a00` |
| Blue | `#0070a8` |
| Purple | `#7b02b5` |
| Teal | `#006666` |

Aim for 6–10 leaf nodes per branch. The last branch is always **Expressions utiles** with useful phrases from the conversation.

---

## Step 4 — Update `nav-conv.js`

Add a new entry to the `convs` array at the bottom, before the closing `];`:

```js
{
  href: "convN.html",
  label: "Mon DD - [Topic title]",
  year: "2026",
  month: "June",       // or whichever month applies
},
```

Label format: `Mon DD - Title` (e.g. `Jun 4 - Les livres DK`).

---

## Step 5 — Bump the `nav-conv.js` version in all conversation HTMLs

Every time `nav-conv.js` changes, all conversation HTML files must use a new `?v=` query string so browsers don't serve a cached copy of the old script. The version format is `YYMMDDHHmm` (year/month/day/hour/minute, 24-hour clock).

Run this PowerShell one-liner from the repo root (or any directory) to update every file at once:

```powershell
$v = Get-Date -Format "yyMMddHHmm"
$folder = "c:\Users\Owner\Desktop\MAIN\WEBSITE\My Website\languages\fr\everyday\conversations"
Get-ChildItem "$folder\*.html" | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    $u = $c -replace 'nav-conv\.js\?v=[^\s"]+', "nav-conv.js?v=$v"
    if ($u -ne $c) { [System.IO.File]::WriteAllText($_.FullName, $u, [System.Text.Encoding]::UTF8) }
}
```

This must be run **after** every change to `nav-conv.js` (adding a conversation, restructuring the sidebar, etc.), not just when adding a new file.

---

## Step 6 — Update `sitemap.html`

In `sitemap.html`, find the `"Conversation"` node in `graphData.nodes` and update its `url` to point to the latest conversation file:

```js
{
  id: "Conversation",
  group: 7,
  level: 2,
  url: "fr/everyday/conversations/convN.html",
},
```

There is only one entry to change — the node always links to the most recent conversation.

---

## Checklist

- [ ] `convN.html` created with all paragraphs, translations, and audio placeholders
- [ ] All French characters are correct UTF-8 (no `Ã©` artifacts)
- [ ] `tree-convN.html` created with 5–6 themed branches
- [ ] `nav-conv.js` updated with the new entry
- [ ] `nav-conv.js?v=` bumped in **all** conversation HTML files (Step 5 PowerShell)
- [ ] `sitemap.html` updated
