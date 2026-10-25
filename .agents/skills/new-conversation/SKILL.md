---
name: new-conversation
description: Build a new French everyday conversation page (fr/everyday/conversations/conv##) from the conversation text — page with translations, shadowing chunks, ElevenLabs audio (Leïla/Adrien), volume normalization, mind map, nav entry, sitemap and offline single-file copy. Also use to make or redo audio/chunks for an existing conv page.
---

# New conversation page (conv##)

Input: the conversation text (French), usually `fr/everyday/conversations/conv##/conv##.md`, one line per speaker turn. Usually lines alternate speakers: the **first line is the woman (Leïla), the second the man (Adrien)**, and so on. Some conversations are two women (e.g. conv39: Leïla and Melissa) or two women and a man. Before generating audio, always ask the user who the speakers are, show which voice each line gets, and work on one conversation at a time.

Use conv42 as the model for everything below. **No exercise pages** (listen, translation1–5, listen-master): a conversation is the page, its mind map and its offline copy.

| File | Path |
|---|---|
| Conversation page | `fr/everyday/conversations/conv##/conv##.html` |
| Chunks | `fr/everyday/conversations/conv##/conv##-chunks.txt` |
| Mind map | `fr/everyday/conversations/conv##/tree-conv##.html` |
| Audio | `media/lessons/everyday/conv##/` (not in git; served from R2) |
| Navigation | `assets/js/nav-conv.js` |
| Site map | `sitemap.html` |
| Offline copies | `fr/everyday/conversations/single/conv##/` (not in git) |

## 1. Source text

The source is sometimes saved in a broken encoding. Fix it to proper UTF-8 before use: `Ã©` → `é`, `Ã¨` → `è`, `Ã ` → `à`, `Ã§` → `ç`, `Ã´` → `ô`, `Ã®` → `î`, `Ã»` → `û`, `Ã¢` → `â`, `Ãª` → `ê`, `Å"` → `œ`, `â€™` → `'`, `Â«`/`Â»` → `«`/`»`, `Ã‰` → `É`, `Ã€` → `À`, `â¦` → `…`.

## 2. Page

- Create `conv##/conv##.html` by copying the previous conversation's page and replacing the content.
- Title: `Conversation ##`; `<h1>`: `Conversation ## - <French title>`.
- One block per line, alternating `french-text` (odd lines) and `english-text` (even lines), each followed by a `translation` div with a natural English translation.
- In the script at the bottom, change `AUD_DIR` and `CHUNK_DIR` to `conv##`.
- Supplemental Section: only the mind map link, `./tree-conv##.html` (step 6).
- Notable vocabulary can go in a tooltip span: `<span class="word-info" data-bs-toggle="tooltip" data-bs-placement="top" title="/IPA/" data-meaning="English meaning">French phrase</span>`.

## 3. Chunks

- Split each line into short shadowing phrases: about 2–6 words, broken at natural breath points (clause boundaries, before prepositions/relative pronouns, after commas). Never split inside a fixed expression.
- Keep the original punctuation in each chunk; the chunks of a line must join back into the full line.
- Markup: `<span class="chunk" data-audio="NN_k.mp3">…</span>`, where `NN` is the line's audio name (01, 02, …; older pages use 1, 2, …) and `k` counts from 1 within that line.
- Save the chunks in `conv##-chunks.txt`: one chunk per line, a blank line between audio lines.
- To add chunks to a page that has none: write `conv##-chunks.txt`, then run `python -I .Codex/skills/new-conversation/add_chunks.py <conv#>`. It checks the chunks against the page text, then adds the spans, the chunk CSS, the "Click a phrase" hint and the chunk player. `word-info` tooltips in older pages stay whole inside their chunk (a chunk boundary can't split one). A chunk written in parentheses, e.g. `(Plein de vaisselle à faire)`, is a stage direction: shown as plain text, no audio.

## 4. Audio naming

Stored in `media/lessons/everyday/conv##/` (the page plays chunks from there when opened locally; online everything plays from `https://languages.rmlives.com/lessons/everyday/conv##/`).

- `NN.mp3`: the full line `NN` (01.mp3, 02.mp3, …)
- `NN_k.mp3`: chunk `k` of line `NN` (01_1.mp3, 01_2.mp3, …)

## 5. Audio: generate and normalize

Once the page has its chunk spans, run from the LANGUAGES root:

```
python -I .Codex/skills/new-conversation/make_audio.py <conv#>
```

It reads the chunk text from the page, generates every missing `NN.mp3` (chunks joined) and `NN_k.mp3` with ElevenLabs, and normalizes them. Options: `--first N --last N` (line range), `--chunks-only`, `--renormalize` (redo processing from the raw files, no credits), `--raw DIR`, `--voices Leila,Melissa` (voices taking turns from line 1; default `Leila,Adrien`; for three speakers give one voice per line, e.g. conv29), `--line 7=Adrien` (one line's voice, repeatable, for a third speaker). Known voices: Leila, Adrien, Melissa, Sophie, Caroline, Augustin. Existing files are never regenerated, so it is safe to re-run.

What it does, in case it needs changing:

- **TTS:** model `eleven_v4`; voice IDs are in the script's `VOICES` table (Fr-Leïla `TqSzeWTTYMk8ynnHrHq5`, Fr-Adrien `OrVRsyqKB4siJQenyBu5`, Fr-Melissa `KzPZhE4ZluG6tjLsI1qh`, …). The key is the User-scope env var `ELEVENLABS_API_KEY` (VS Code may not inherit it; the script falls back to the registry). The key can't read models or credit balance, and it has its own credit limit (60,000 as of 2026-10-22), separate from the account's balance; when it runs out, requests fail with 401 `quota_exceeded` and the user has to raise the key's limit in ElevenLabs › API keys. Re-running the script resumes where it stopped. Each chunk is its own clip; never split a line's audio by pauses.
- **Raw downloads** are kept in `%TEMP%/elevenlabs-raw/conv##` for reprocessing.
- **Normalize:** ElevenLabs output drops off in volume, and Leïla comes out much quieter than Adrien. Every clip is matched to the existing files: 48 kHz stereo, 320 kbps, about −9 LUFS, peaks ≤ −1 dB. Chain: `dynaudnorm` (evens out volume within the clip), measured gain to −9 LUFS, `alimiter`, re-measured until within ±0.3 LU. `loudnorm` is not used: on short clips it misses the target by 5–9 dB.

Spending credits: one request per line and per chunk, roughly twice the conversation's character count. Tell the user how many clips will be generated before a large run.

## 6. Mind map

Create `conv##/tree-conv##.html` by copying the previous `tree-conv##.html` (d3 tree) and replacing the data:

- Title: `Mind Map - Conversation ##`; root (`treeData.name`): `Conversation ##`.
- Branches: 5–6 topics of the conversation, named in French, each with `style: { stroke, fill }`. Colors, one per branch: green `#007850`, orange `#e07b39`, dark red `#9e2a00`, blue `#0070a8`, purple `#7b02b5`, teal `#006666`.
- Leaves: key phrases from the conversation, written `French phrase - English meaning`, shortened to the useful expression rather than the whole line; about 4–10 per branch.
- The last branch is always **Expressions utiles**: vocabulary and idioms from the conversation.

## 7. Navigation

- Add the page at the end of the `convs` array in `assets/js/nav-conv.js`:
  ```js
  {
    href: "../conv##/conv##.html",
    label: "Conv ## - <French title>",
    year: "2026",
    month: "October",
  },
  ```
- Then bump the `nav-conv.js?v=` tag in every conversation page, so browsers don't keep the cached nav without the new entry:
  ```
  python -I .Codex/skills/new-conversation/bump_nav.py
  ```
  Do this after every change to `nav-conv.js`, not only when adding a conversation.

## 8. Site map

In `sitemap.html`, the `"Conversation"` node in `graphData.nodes` always links to the latest conversation. Change its `url` to `fr/everyday/conversations/conv##/conv##.html`.

## 9. Check and upload

- Every `data-audio` in the page has a matching file in the media folder.
- Look at the LUFS column the script prints and report any clip that is off.
- Upload the new audio to Cloudflare R2 (bucket `languages`, served at languages.rmlives.com): `python -E .Codex/skills/new-conversation/upload_audio.py <conv#> [--lines] [--dry-run]`. It only sends files missing online or whose MD5 differs; `--lines` includes the full-line `NN.mp3` files. Do a `--dry-run` first and tell the user if anything would be *replaced*.
- The pages go live through GitHub → Cloudflare Pages (commit and push, when the user asks).

## 10. Offline single-file copies (last step)

Self-contained copies of the conversation page and its mind map, for use with no connection. Run after the audio exists and the page is final, since the audio is embedded:

```
cd fr/everyday/conversations
python -I make_single.py --offline conv##
```

- **Output:** `single/conv##/conv##.html` and `single/conv##/tree-conv##.html`; the mind map link between them keeps working.
- **What `--offline` does:** inlines the local CSS/JS/images and the CDN libraries and fonts (Bootstrap, icons, Google Fonts, d3), and embeds every line and chunk mp3 from `media/lessons/everyday/conv##/` at full quality. The sidebar nav and the Site Map button are removed.
- **Size:** 10–55 MB with the audio.
- **Not in git:** `single/` is in `.gitignore`, because Cloudflare Pages rejects files over 25 MB. The copies stay local, synced by OneDrive.
- **Other uses:** `--all` rebuilds every conversation. Without `--offline`, audio streams from languages.rmlives.com and the copies stay small.
- **Depends on** `fr/enunciation/make_single.py`, which does the inlining, so keep that file where it is.
- If the page changes later (a fixed translation, re-generated audio), rebuild its offline copy.

## Checklist

- [ ] Speakers confirmed with the user
- [ ] `conv##.html`: translations, chunk spans, `AUD_DIR`/`CHUNK_DIR`, mind map link; correct UTF-8
- [ ] `conv##-chunks.txt` written
- [ ] Audio generated (`make_audio.py`), LUFS checked, every `data-audio` has a file
- [ ] Audio uploaded to R2 (`upload_audio.py --lines`, dry run first)
- [ ] `tree-conv##.html` with 5–6 branches, ending with Expressions utiles
- [ ] `nav-conv.js` entry added and `bump_nav.py` run
- [ ] `sitemap.html` Conversation node points to the new page
- [ ] Offline copies built (`make_single.py --offline conv##`), last
