---
name: new-conversation
description: Build a new French everyday conversation page (fr/everyday/conversations/conv##) from the conversation text — page with translations, shadowing chunks, ElevenLabs audio (Leïla/Adrien), volume normalization, nav entry and mind map. Also use to make or redo audio/chunks for an existing conv page.
---

# New conversation page (conv##)

Input: the conversation text (French). Lines alternate speakers: the **first line is always the woman (Leïla), the second the man (Adrien)**, and so on. Odd lines = Leïla, even lines = Adrien.

Use conv41 as the model for everything below.

## 1. Page

- Create `fr/everyday/conversations/conv##/conv##.html` by copying the previous conversation's page and replacing the content.
- Title and `<h1>`: `Conversation ## - <French title>`.
- One block per line, alternating `french-text` (odd lines) and `english-text` (even lines), each followed by a `translation` div with a natural English translation.
- In the script at the bottom, change `AUD_DIR` and `CHUNK_DIR` to `conv##`.
- Add the page to the list in `assets/js/nav-conv.js` (href, label, year, month).
- Supplemental Section: link to the mind map, `./tree-conv##.html` (step 6).
- Also save the chunks, one per line, in `conv##-chunks.txt`.

## 2. Chunks

- Split each line into short shadowing phrases: about 2–6 words, broken at natural breath points (clause boundaries, before prepositions/relative pronouns, after commas). Never split inside a fixed expression.
- Keep the original punctuation in each chunk; the chunks of a line must join back into the full line.
- Markup: `<span class="chunk" data-audio="NN_k.mp3">…</span>`, where `NN` is the line number (2 digits) and `k` counts from 1 within that line.

## 3. Audio naming

Stored in `media/lessons/everyday/conv##/` (the page plays chunks from there when opened locally; online everything plays from `https://languages.rmlives.com/lessons/everyday/conv##/`, which the user uploads).

- `NN.mp3`: the full line `NN` (01.mp3, 02.mp3, …)
- `NN_k.mp3`: chunk `k` of line `NN` (01_1.mp3, 01_2.mp3, …)

## 4. Audio: generate and normalize

Once the page has its chunk spans, run from the LANGUAGES root:

```
python -I .claude/skills/new-conversation/make_audio.py <conv#>
```

It reads the chunk text from the page, generates every missing `NN.mp3` (chunks joined) and `NN_k.mp3` with ElevenLabs, and normalizes them. Options: `--first N --last N` (line range), `--chunks-only`, `--renormalize` (redo processing from the raw files, no credits), `--raw DIR`. Existing files are never regenerated, so it is safe to re-run.

What it does, in case it needs changing:

- **TTS:** model `eleven_v4`; voices Fr-Leïla `TqSzeWTTYMk8ynnHrHq5`, Fr-Adrien `OrVRsyqKB4siJQenyBu5`. The key is the User-scope env var `ELEVENLABS_API_KEY` (VS Code may not inherit it; the script falls back to the registry). The key can't read models or credit balance. Each chunk is its own clip; never split a line's audio by pauses.
- **Raw downloads** are kept in `%TEMP%/elevenlabs-raw/conv##` for reprocessing.
- **Normalize:** ElevenLabs output drops off in volume, and Leïla comes out much quieter than Adrien. Every clip is matched to the existing files: 48 kHz stereo, 320 kbps, about −9 LUFS, peaks ≤ −1 dB. Chain: `dynaudnorm` (evens out volume within the clip), measured gain to −9 LUFS, `alimiter`, re-measured until within ±0.3 LU. `loudnorm` is not used: on short clips it misses the target by 5–9 dB.

Spending credits: one request per line and per chunk, roughly twice the conversation's character count. Tell the user how many clips will be generated before a large run.

## 5. Check

- Every `data-audio` in the page has a matching file in the media folder.
- Look at the LUFS column the script prints and report any clip that is off.
- Remind the user to upload the new files to languages.rmlives.com.

## 6. Mind map

Create `fr/everyday/conversations/conv##/tree-conv##.html` by copying `tree-conv41.html` (d3 tree) and replacing the data:

- Root: `Conversation ##`.
- Branches: 4–6 topics of the conversation, named in French.
- Leaves: key phrases from the conversation, written `French phrase - English meaning`, shortened to the useful expression rather than the whole line.
- Title: `Mind Map - Conversation ##`.
