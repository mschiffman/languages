# Adding a New Conversation

This document describes the full procedure for adding a new conversation to the site.

---

## File locations

Each conversation lives in its own subfolder, `conversations/convN/`.

| File | Path |
|---|---|
| Conversation HTML | `fr/everyday/conversations/convN/convN.html` |
| Mind map HTML | `fr/everyday/conversations/convN/tree-convN.html` |
| Listening Lab (dictation) | `fr/everyday/conversations/convN/listen.html` |
| Listening Master (comprehension) | `fr/everyday/conversations/convN/listen-master.html` |
| Translation Quiz (5 pages) | `fr/everyday/conversations/convN/translation1.html` – `translation5.html` |
| Navigation script | `assets/js/nav-conv.js` |
| Source transcript | Provided as a `.txt` or `.md` file |

---

## Step 1 — Prepare the source text

The source file is a back-and-forth conversation, one paragraph per speaker, separated by blank lines. It's often saved in a broken encoding (e.g. `Ã©` instead of `é`). **Decode all characters to proper UTF-8 before use.** Common substitutions:

| Broken | Correct |
|---|---|
| `Ã©` | `é` |
| `Ã¨` | `è` |
| `Ã ` | `à` |
| `Ã§` | `ç` |
| `Ã´` | `ô` |
| `Ã®` | `î` |
| `Ã»` | `û` |
| `Ã¢` | `â` |
| `Ãª` | `ê` |
| `Å"` | `œ` |
| `â€™` | `'` |
| `Â«` / `Â»` | `«` / `»` |
| `Ã‰` | `É` |
| `Ã€` | `À` |
| `â` (standalone, followed by a space, used as a dialogue marker) | `—` (em dash) |
| `â¦` | `…` (ellipsis) |

---

## Step 2 — Create `convN/convN.html`

Copy the most recent conversation's `convN.html` as a template (e.g. `conv32/conv32.html`). Update:

- `<title>` → `Conversation N`
- `<h1>` → `Conversation N - [topic title]`
- `nav-conv.js?v=` → set a placeholder version tag for now (e.g. `?v=260604a`); the final value is set in Step 7 below
- Audio `src` URLs → `https://languages.rmlives.com/lessons/everyday/YYMMDD/01.mp3` (increment for each block)
- Supplement section links → `./tree-convN.html`, `./translation1.html`, `./listen.html`, `./listen-master.html` (all in the same subfolder)

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

## Step 3 — Create `convN/tree-convN.html`

Copy the most recent conversation's `tree-convN.html` as a template. Update:

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

## Step 4 — Extract the sentence bank

Both the Listening Lab (Step 5) and the Translation Quiz (Step 6) reuse the same underlying list, so build it once.

Go through the conversation paragraph by paragraph and split each into individual sentences/clauses on `.`, `?`, `!`, keeping an ellipsis (`…`) as internal punctuation rather than a hard break. Be inclusive — even short fragments and interjections (e.g. `"Là."`, `"On verra."`) are kept, since they still have pedagogical value. Skip only pure non-lexical filler (e.g. a lone "Hmmm"). A typical 18–21 paragraph conversation yields roughly 45–50 sentences.

For each sentence, record the French original and its English translation (already available from Step 2's `.translation` blocks — split into matching fragments). Number them sequentially in conversation order; this numbering drives the audio filenames in Step 5.

---

## Step 5 — Create `convN/listen.html`

Copy the most recent conversation's `listen.html` as a template (a "Smart Dictation - 10 Levels" page, self-contained with inline CSS). Update:

- `const sentences` → the French sentence bank from Step 4, **shuffled into random order** (do not present it in conversation order — that makes the audio predictable/skippable)
- `const translations` → the matching English translations, reordered the same way so each entry still lines up with its sentence (used for the Hint button)
- `const audioNums` → a parallel array giving each shuffled entry's **original** Step 4 index (1-based), since the pre-recorded audio files are named after conversation order, not display order
- `const audioBase` → `https://languages.rmlives.com/lessons/everyday/convN/listen/`

Audio files are expected at `{audioBase}{NN}-{m|f}.mp3` where `NN` is the sentence's **original** Step 4 index (not its shuffled display position), zero-padded to 2 digits (e.g. `01-m.mp3`, `01-f.mp3`). Update `playAudio()` to build the filename from `audioNums[currentIndex]` rather than `currentIndex + 1`, since the two now differ.

---

## Step 6 — Create `convN/translation1.html` – `translation5.html`

Copy the most recent conversation's `translationN.html` pages as templates. **Shuffle the Step 4 sentence bank into random order first**, then split the shuffled list into 5 pages of 10 questions each (the last page may have fewer if the bank isn't a multiple of 10) — do not keep conversation order, since that lets learners anticipate the next answer from memory of the dialogue. For each page, update:

- `<h2>` → `✍️ Translation Challenge (Page N)`
- Each `.question-block`'s `english-prompt` → the English sentence
- `answerKey` → maps `q1`…`q10` to an array of acceptable French answers (add alternate phrasings as extra array entries when there's more than one reasonable translation, e.g. with vs. without an em dash)
- `page-nav` → mark the current page's `page-btn` as `active`

These pages share `assets/css/translation.css` and reuse the same `checkTranslations()` / `resetTranslations()` script boilerplate — only the content arrays and page number differ.

---

## Step 7 — Create `convN/listen-master.html`

Copy the most recent conversation's `listen-master.html` as a template (uses the shared `/assets/css/listenMaster.css` and `/assets/js/listenMaster.js`). Unlike Steps 5–6, this page does **not** reuse the conversation's own sentences — write an **original** short French narrative (8–10 sentences) on a theme loosely related to the conversation's topic, plus 10 multiple-choice comprehension questions (3 options each, one `value="correct"`). Update:

- `<source id="audio-source" src="...">` and the `audioFiles` object → `https://languages.rmlives.com/lessons/everyday/convN/listen-master/listen-{m,f,ms}.mp3`
- `#trans-box` → the narrative text
- The 10 `.question-item` blocks → your comprehension questions, each with one `value="correct"` radio option
- `page-nav` → `<a href="listen-master.html" class="page-btn active">1</a>` (if the narrative is long enough to need a second page, follow conv31's `listen-master1.html` / `listen-master2.html` split-page pattern instead)

---

## Step 8 — Update `nav-conv.js`

Add a new entry to the `convs` array at the bottom, before the closing `];`:

```js
{
  href: "../convN/convN.html",
  label: "Mon DD - [Topic title]",
  year: "2026",
  month: "June",       // or whichever month applies
},
```

Label format: `Mon DD - Title` (e.g. `Jun 4 - Les livres DK`).

---

## Step 9 — Bump the `nav-conv.js` version in all conversation HTMLs

Every time `nav-conv.js` changes, all conversation HTML files must use a new `?v=` query string so browsers don't serve a cached copy of the old script. The version format is `YYMMDDHHmm` (year/month/day/hour/minute, 24-hour clock).

Run this PowerShell one-liner from the repo root (or any directory) to update every file at once (note `-Recurse`, since conversation files now live in per-conversation subfolders):

```powershell
$v = Get-Date -Format "yyMMddHHmm"
$folder = "c:\Users\Owner\Desktop\MAIN\WEBSITE\My Website\languages\fr\everyday\conversations"
Get-ChildItem "$folder\*.html" -Recurse | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    $u = $c -replace 'nav-conv\.js\?v=[^\s"]+', "nav-conv.js?v=$v"
    if ($u -ne $c) { [System.IO.File]::WriteAllText($_.FullName, $u, [System.Text.Encoding]::UTF8) }
}
```

This must be run **after** every change to `nav-conv.js` (adding a conversation, restructuring the sidebar, etc.), not just when adding a new file.

---

## Step 10 — Update `sitemap.html`

In `sitemap.html`, find the `"Conversation"` node in `graphData.nodes` and update its `url` to point to the latest conversation file:

```js
{
  id: "Conversation",
  group: 7,
  level: 2,
  url: "fr/everyday/conversations/convN/convN.html",
},
```

There is only one entry to change — the node always links to the most recent conversation.

---

## Checklist

- [ ] `convN/convN.html` created with all paragraphs, translations, and audio placeholders
- [ ] All French characters are correct UTF-8 (no `Ã©` artifacts)
- [ ] `convN/tree-convN.html` created with 5–6 themed branches
- [ ] Sentence bank extracted from the conversation (Step 4)
- [ ] `convN/listen.html` created with the full sentence bank **shuffled** (random order), correct `audioBase`, and `audioNums` mapping each shuffled entry back to its original index
- [ ] `convN/translation1.html`–`translation5.html` created, sentence bank **shuffled** then split 10/page with answer keys
- [ ] `convN/listen-master.html` created with an original narrative + 10 comprehension questions
- [ ] `convN.html` supplement section links to the mind map, translation, listening lab, and listening master pages
- [ ] `nav-conv.js` updated with the new entry
- [ ] `nav-conv.js?v=` bumped in **all** conversation HTML files (Step 9 PowerShell)
- [ ] `sitemap.html` updated
