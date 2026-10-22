"""Add shadowing chunks to a conversation page, like conv41.

usage (from the LANGUAGES root):
    python -I .claude/skills/new-conversation/add_chunks.py <conv#>

Reads fr/everyday/conversations/conv##/conv##-chunks.txt: one chunk per line,
a blank line between audio lines, in page order. Each chunk is checked against
the page text (the chunks of a line must join back into it exactly) before
anything is written. Then, in conv##.html:
  - each line's <p> text becomes <span class="chunk" data-audio="NN_k.mp3">
    spans, NN being that line's audio name (01, 02, ... or 1, 2, ...); a chunk
    written in parentheses, e.g. "(Plein de vaisselle à faire)", is a stage
    direction and stays plain text with no audio
  - the chunk CSS, the "Click a phrase" hint and the chunk player script are
    added if the page doesn't have them yet
"""
import re, sys

sys.stdout.reconfigure(encoding="utf-8")
conv = int(sys.argv[1])
folder = f"fr/everyday/conversations/conv{conv}"
page = f"{folder}/conv{conv}.html"
src = open(page, encoding="utf-8").read()
if 'class="chunk"' in src:
    sys.exit(f"{page} already has chunks")

groups = [g.splitlines() for g in
          re.split(r"\n\s*\n", open(f"{folder}/conv{conv}-chunks.txt", encoding="utf-8").read().strip())]

BLOCK_RE = re.compile(
    r'(<div class="(?:french|english)-text"[^>]*>\s*<audio\b[^>]*?data-audio="([^".?]+)\.\w+[^"]*"[^>]*>\s*</audio>\s*<p>)'
    r'(.*?)(\s*<i class="bi bi-translate"></i>)', re.S)
blocks = list(BLOCK_RE.finditer(src))
if len(blocks) != len(groups):
    sys.exit(f"page has {len(blocks)} lines, chunks file has {len(groups)}")

norm = lambda s: " ".join(s.split())
# Older pages have word-info tooltips inside the text; each is kept whole.
SPAN_RE = re.compile(r"<span\b[^>]*>(.*?)</span\s*>", re.S)


def units(p_html):
    """The <p> content as (plain text, html) pieces: one per character, one per
    whitespace run, one per tooltip span (which a chunk boundary can't split)."""
    out, pos = [], 0
    for m in list(SPAN_RE.finditer(p_html)) + [None]:
        text = p_html[pos:m.start() if m else len(p_html)]
        if "<" in text:
            raise ValueError("contains markup other than word-info spans")
        for part in re.findall(r"\s+|\S", text):
            out.append((" ", " ") if part.isspace() else (part, part))
        if m:
            out.append((norm(m.group(1)), norm(m.group(0))))
            pos = m.end()
    out = [u for i, u in enumerate(out) if not (u[0] == " " and i and out[i - 1][0] == " ")]
    while out and out[0][0] == " ":
        out.pop(0)
    while out and out[-1][0] == " ":
        out.pop()
    return out


def split(p_html, chunks):
    """The html of each chunk, checked against the page text."""
    us, i, result = units(p_html), 0, []
    for c in map(norm, chunks):
        got, h = "", ""
        while len(got) < len(c) and i < len(us):
            got, h, i = got + us[i][0], h + us[i][1], i + 1
        if got != c:
            raise ValueError(f"chunk doesn't match the page (or splits a tooltip)\n  chunk: {c}\n  page:  {got}")
        result.append(h)
        if i < len(us) and us[i][0] == " ":
            i += 1
    if i != len(us):
        raise ValueError("page text left over: " + "".join(u[0] for u in us[i:]))
    return result


parts, errors = [], []
for i, (m, chunks) in enumerate(zip(blocks, groups), 1):
    try:
        parts.append(split(m.group(3), chunks))
    except ValueError as e:
        errors.append(f"line {i}: {e}")
if errors:
    sys.exit("\n".join(errors))


def chunk_markup(m, chunks, htmls):
    indent = "\n          "
    out, k = [], 0
    for c, h in zip(map(str.strip, chunks), htmls):
        if c.startswith("(") and c.endswith(")"):  # stage direction: shown, not voiced
            out.append(indent + h)
        else:
            k += 1
            out.append(f'{indent}<span class="chunk" data-audio="{m.group(2)}_{k}.mp3">{h}</span>')
    return m.group(1) + "".join(out) + m.group(4)


out, pos = [], 0
for m, chunks, htmls in zip(blocks, groups, parts):
    out += [src[pos:m.start()], chunk_markup(m, chunks, htmls)]
    pos = m.end()
src = "".join(out) + src[pos:]

CSS = """      /* Phrase chunks: read.css colours every span in .french-text brown,
         so keep the normal text colour; the hover highlight comes from read.css. */
      .french-text .chunk,
      .english-text .chunk {
        color: inherit;
      }
"""
PLAYER = """
      // Each phrase (.chunk) has its own recording, data-audio="N_k.mp3"
      // (k = 1, 2, ... for the phrases of N.mp3).
      // Clicking a phrase plays just that phrase. The player is added to the
      // page so the "pause the others" handler above covers it too.
      // Opened from this computer (as a file or on a local dev server), phrases
      // play the copies in media/, so new recordings work before uploading.
      const isLocal =
        location.protocol === "file:" ||
        ["localhost", "127.0.0.1"].includes(location.hostname);
      const CHUNK_DIR = isLocal
        ? "../../../../media/lessons/everyday/conv%d/"
        : AUD_DIR;
      const chunkPlayer = document.createElement("audio");
      document.body.appendChild(chunkPlayer);
      document.querySelectorAll(".chunk[data-audio]").forEach(function (span) {
        span.addEventListener("click", function () {
          chunkPlayer.src = CHUNK_DIR + span.dataset.audio;
          chunkPlayer.play();
        });
      });
""" % conv


def add(pattern, repl, what):
    global src
    src, n = re.subn(pattern, repl, src, count=1, flags=re.S)
    if not n:
        print(f"! could not add {what}; add it by hand (see conv41.html)")


if ".french-text .chunk" not in src:
    add(r"(\n    </style>\s*\n  </head>)", lambda m: "\n" + CSS.rstrip("\n") + m.group(1), "chunk CSS")
if "Click a phrase" not in src:
    add(r"(to display or hide\s+the translation\.)", lambda m: m.group(1) + " Click a phrase to hear it on its own.",
        "click hint")
if "chunkPlayer" not in src:
    add(r"(a\.src = AUD_DIR \+ a\.dataset\.audio;\s*\}\);\n)", lambda m: m.group(1) + PLAYER, "chunk player")

open(page, "w", encoding="utf-8", newline="").write(src)
print(f"{page}: {sum(map(len, groups))} chunks in {len(groups)} lines")
