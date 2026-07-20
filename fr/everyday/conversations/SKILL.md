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
| Exercise scoring/feedback script (shared) | `assets/js/exercise-feedback.js` |
| Source transcript | Provided as a `.txt` or `.md` file |

**`assets/js/exercise-feedback.js` is shared across all conversations** — do not create a per-conversation copy of it. It auto-detects which page it's on (translation quiz, listen-master, or dictation, based on which elements/globals exist) and:

- Renders the translation quiz's `questions` array into `#quiz-area` and scores it
- Adds a live score box (correct / wrong / unanswered + percentage bar) to all three exercise types
- Adds "Accept answers without accents" / "Ignore punctuation" toggle checkboxes that all answer-checking respects
- Normalizes answers before comparing: folds curly apostrophes, spells-out number words to digits (`vingt` → `20`), and collapses thousands separators — so `answers` arrays only need to list genuinely different phrasings, not punctuation/formatting variants
- Overrides `checkAnswers`/`resetTest` (listen-master) and `changeLevel`/`checkDictation`/etc. (dictation) after the page's own inline script defines them, so the page script can stay simple

Every `translationN.html`, `listen.html`, and `listen-master.html` loads it the same way, right before `nav-utensils.js`:

```html
<script src="/assets/js/exercise-feedback.js"></script>
<script type="module" src="../../../../assets/js/nav-utensils.js"></script>
```

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

For each sentence, record the French original and its English translation (already available from Step 2's `.translation` blocks — split into matching fragments), numbered sequentially in conversation order.

This master bank (order and one-sentence-per-entry) stays exactly as extracted — Step 5 shuffles a copy of it, and the dictation audio is recorded against that shuffled order (not this conversation-order numbering). **The chunking described in Step 6 is a further split applied only to that copy**, not to this master bank.

---

## Step 5 — Create `convN/listen.html`

Copy the most recent conversation's `listen.html` as a template (a "Smart Dictation - 10 Levels" page, self-contained with inline CSS). Update:

- `const sentences` → the French sentence bank from Step 4, **chunked and shuffled into random order**:
  - **Chunk first.** Split any long or multi-clause sentence into meaningful, independently-transcribable pieces, same criteria as Step 6's chunking (split on an independent clause with its own subject and verb — joined by `et`, `mais`, a comma, `parce que`, a relative clause, etc. — not just any comma). One long sentence dictated as a single entry is slow to record, slow to check, and easy to get wrong on a single missed word; shorter chunks keep each dictation level quick to attempt and verify. Short sentences and tightly-bound clauses stay whole. This chunking is applied to `listen.html`'s own copy of the bank — it does not change Step 4's master numbering.
  - **Then shuffle** the (now-chunked) list into random order (do not present it in conversation order — that makes the audio predictable/skippable)
- `const translations` → the matching English translations, reordered the same way so each entry still lines up with its sentence (used for the Hint button)
- `const audioBase` → `https://languages.rmlives.com/lessons/everyday/convN/listen/`

Audio files are recorded **in this same shuffled order** and named sequentially: `{audioBase}{NN}-{m|f}.mp3` where `NN` is the sentence's shuffled display position (`currentIndex + 1`), zero-padded to 2 digits (e.g. `01-m.mp3`, `01-f.mp3`). `playAudio()` builds the filename directly from `currentIndex + 1` — no separate mapping array is needed.

The page's inline script only needs to define `sentences`, `translations`, `audioBase`, and the level-navigation/audio/hint functions shown in the template. Loading `assets/js/exercise-feedback.js` afterward (see [File locations](#file-locations)) adds the live score box and accent/punctuation toggles, and wraps `changeLevel`/`checkDictation`/`revealAnswer`/`resetDictation` so each level's correct/wrong status persists as the learner navigates between levels — don't duplicate that scoring logic in the page script.

---

## Step 6 — Create `convN/translation1.html` – `translation5.html`

Copy the most recent conversation's `translationN.html` pages as templates. The page body only needs an empty `<div id="quiz-area"></div>` plus one inline script defining a `questions` array — `assets/js/exercise-feedback.js` renders the question blocks, wires up input checking, and adds the live score box at runtime:

```html
<div id="quiz-area"></div>
...
<script>
  const questions = [
    { english: "It's going to be very hot today.", answers: ["Il va faire très chaud aujourd'hui", "Il fera très chaud aujourd'hui"] },
    { english: "I've got this.", answers: ["Je gère", "Je gère ça"] },
    ...
  ];
</script>
```

Each entry is `{ english, answers }` — `answers` is an array of acceptable French translations (add alternate phrasings as extra array entries when there's more than one reasonable translation, e.g. with vs. without an em dash). You don't need to list accent-free or differently-punctuated variants — the shared script normalizes those away.

### Chunk long/compound sentences into separate questions

Before shuffling, go through the Step 4 sentence bank and **split any long or multi-clause sentence into meaningful chunks**, each becoming its own `questions` entry, instead of asking the learner to produce one long sentence in a single answer box. A chunk is worth splitting out when it's an independent clause with its own subject and verb (joined to the rest by `et`, `mais`, a comma, `parce que`, a relative clause, etc.) — not just any comma-separated fragment. For example:

> "Ça doit être sympa de pouvoir partir comme ça n'importe quand dans l'année, quel que soit le temps."

is better asked as two questions ("It must be nice to be able to leave like that anytime during the year." / "Whatever the weather.") than one. Short sentences and tightly-bound clauses (e.g. "Faut que je traite demain") stay whole — only split when it genuinely makes the question easier to answer without changing the meaning of either half. This chunking only affects the translation quiz's copy of the bank; it does not change Step 4's master numbering or Step 5's sentences/audio.

**Shuffle the (possibly-chunked) list into random order first**, then split into 5 pages of 10 questions each (the last page may have fewer if the bank isn't a multiple of 10) — do not keep conversation order, since that lets learners anticipate the next answer from memory of the dialogue. For each page, update:

- `<h2>` → `✍️ Translation Challenge (Page N)`
- `questions` → the page's slice of the shuffled (and chunked) list
- `page-nav` → mark the current page's `page-btn` as `active`

These pages share `assets/css/translation.css` and load `assets/js/exercise-feedback.js` (see the shared-script note in [File locations](#file-locations)) — only the `questions` array and page number differ.

---

## Step 7 — Create `convN/listen-master.html`

Copy the most recent conversation's `listen-master.html` as a template (uses the shared `/assets/css/listenMaster.css` and `/assets/js/listenMaster.js`). Unlike Steps 5–6, this page does **not** reuse the conversation's own sentences — write an **original** short French narrative (8–10 sentences) on a theme loosely related to the conversation's topic, plus 10 multiple-choice comprehension questions (3 options each, one `value="correct"`). Update:

- `<source id="audio-source" src="...">` and the `audioFiles` object → `https://languages.rmlives.com/lessons/everyday/convN/listen-master/listen-{m,f,ms}.mp3`
- `#trans-box` → the narrative text
- The 10 `.question-item` blocks → your comprehension questions, each with one `value="correct"` radio option
- `page-nav` → `<a href="listen-master.html" class="page-btn active">1</a>` (if the narrative is long enough to need a second page, follow conv31's `listen-master1.html` / `listen-master2.html` split-page pattern instead)

Load order matters: `assets/js/listenMaster.js` (voice switching, transcript toggle) then `assets/js/exercise-feedback.js` (see [File locations](#file-locations)), which overrides `checkAnswers`/`resetTest` to add the live, percentage-based score breakdown (correct/wrong/unanswered) that updates as each radio is selected, not just on submit.

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
- [ ] `convN/listen.html` created with the full sentence bank **chunked** (long/multi-clause sentences split into meaningful pieces) then **shuffled** (random order), correct `audioBase`; audio recorded in that same chunked/shuffled order and numbered sequentially (`01`, `02`, …)
- [ ] `convN/translation1.html`–`translation5.html` created, sentence bank **chunked** (long sentences split into meaningful clauses) then **shuffled** and split 10/page as `questions` arrays
- [ ] `convN/listen-master.html` created with an original narrative + 10 comprehension questions
- [ ] All three exercise page types load `assets/js/exercise-feedback.js` (not a per-conversation copy) after the page's own script(s)
- [ ] `convN.html` supplement section links to the mind map, translation, listening lab, and listening master pages
- [ ] `nav-conv.js` updated with the new entry
- [ ] `nav-conv.js?v=` bumped in **all** conversation HTML files (Step 9 PowerShell)
- [ ] `sitemap.html` updated
