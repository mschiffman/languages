"""Make a mixed vocabulary quiz page (assets/js/vocquiz.js) from a quiz.md.

usage (from the LANGUAGES root):
    python -E stories/new_quiz.py <quiz.md>             check it, then write stories/<page>.html
    python -E stories/new_quiz.py <quiz.md> --check     only check, write nothing
    python -E stories/new_quiz.py <quiz.md> --force     replace an existing page

quiz.md, for a lesson that already exists (its words, pictures and clips are reused):

    # At School: Mixed Quiz
    type: quiz
    page: voc_atSchool_quiz_mix
    from: voc_atSchool
    menu: ytstory

    ## quiz
    pick: 5
    listen: 5
    match: 2 x 4
    article: 4
    spell: 4, max 10
    type: 4

    ## similar
    a pen, a pencil, a crayon

    ## also
    a piece of paper = a sheet of paper

quiz.md, for a new set of words (no lesson page):

    # Fruit: Quiz
    type: quiz
    page: voc_fruit_quiz_mix
    slug: voc-fruit
    menu: ytstory

    ## words
    1 | apple | an apple
    2 | banana | a banana
    3 | grapes | a bunch of grapes

stories/quiz_format.txt explains every line. In short:
  header   page (file name); from (lesson page) OR slug (picture/audio folder) with a
           "## words" section; menu (optional: adds a menu entry); group (optional menu
           group); pictures, size, audio (optional, new sets only: see below).
  ## quiz  one line per block, asked in this order: "<format>: <how many>", or
           "<format>: word, word, ..." to choose the words yourself. Formats: pick,
           listen, match ("2 x 4" = 2 questions of 4 pairs), article, spell
           (", max 10" = longest word in letters), type. Left out = the default plan.
  ## similar  one line per group of words that are easy to mix up.
  ## also     "<answer> = <other spelling>, <another>" for the typed answers.
  ## words    "<picture number> | <word> | <phrase>". The phrase is optional.
              Clips are numbered 1, 2, 3 ... in the order of the lines (word, then
              phrase), which is what story_audio.py and publish_story.py expect.

Pictures of a new set: img/ytstory/<slug>/N.jpg. When some are missing and the
hi-res N.png are in G:\\My Drive\\_YOUTUBE\\<pictures or slug>, they are converted
(80% size like the lessons, or "size: 800" = longest side in pixels).
Audio of a new set: media/eng/yt/<audio or slug>/NN.mp3. Missing clips are made by
story_audio.py afterwards, as for a story.
"""
import argparse, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from new_story import AUD_BASE, CURLY, esc, js, menu_groups  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
STORIES = ROOT / "stories"
TEMPLATE = STORIES / "voc_atSchool_quiz_mix.html"
YOUTUBE = Path(r"G:\My Drive\_YOUTUBE")
CONVERT_PY = Path(r"C:\Users\mschi\OneDrive\Desktop\PYTHON AUTOMATIONS\_IMG\PNG to JPG\convert.py")
FORMATS = ("pick", "listen", "match", "article", "spell", "type")
DEFAULT_PLAN = [("pick", {"count": 5}), ("listen", {"count": 5}), ("match", {"count": 2, "pairs": 4}),
                ("article", {"count": 4}), ("spell", {"count": 4}), ("type", {"count": 4})]
CHUNK = re.compile(r"""\[\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*(\d+)\s*\]""")


def parse(path):
    """Read quiz.md; return (title, fields, sections {name: [(line no, text)]}, errors)."""
    title, fields, sections, errors, sec = None, {}, {}, [], None
    for i, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip().translate(CURLY)
        if not line or line.startswith("```") or line.startswith("//"):  # "// ..." is a note to yourself
            continue
        if line.startswith("## "):
            sec = line[3:].strip().lower()
            if sec not in ("quiz", "similar", "also", "words"):
                errors.append(f"line {i}: unknown section '## {sec}' (quiz, words, similar, also)")
            sections.setdefault(sec, [])
        elif line.startswith("# "):
            title = line[2:].strip()
        elif sec is None:
            m = re.fullmatch(r"([\w-]+)\s*:\s*(.+)", line)
            if m:
                fields[m.group(1).lower()] = m.group(2).strip()
            else:
                errors.append(f"line {i}: not a header line (name: value): {line}")
        else:
            sections[sec].append((i, line))
    return title, fields, sections, errors


def lesson_words(src):
    """[(img, word, phrase)] from a page's `pages`, the way vocquiz.js reads them."""
    body = src[src.index("const pages"):]
    out = []
    parts = re.split(r"\bimg:\s*(\d+)", body)
    for img, text in zip(parts[1::2], parts[2::2]):
        chunks = [(a or b).replace("\\'", "'").replace('\\"', '"') for a, b, _ in CHUNK.findall(text)]
        if not chunks:
            continue
        say = chunks[-1]
        m = re.match(r"(?i)(an?)\s+(.+)$", say)
        word = m.group(2) if m else say
        if len(chunks) > 1 and chunks[-2] != say and say.lower().endswith(chunks[-2].lower()):
            word = chunks[-2]
        out.append((int(img), word, say))
    return out


def main():
    ap = argparse.ArgumentParser(description="Make a mixed vocabulary quiz page from quiz.md")
    ap.add_argument("md", type=Path)
    ap.add_argument("--check", action="store_true", help="only check quiz.md, the pictures and the plan")
    ap.add_argument("--force", action="store_true", help="replace an existing page")
    ap.add_argument("--no-pictures", action="store_true", help="don't require (or convert) the pictures yet")
    a = ap.parse_args()

    title, f, sec, errors = parse(a.md)
    warnings = []
    if not title:
        errors.append("line 1: no '# Title' line")
    if "page" not in f:
        errors.append("header: no 'page:' line")
    elif not re.fullmatch(r"[A-Za-z0-9_.-]+", f["page"]):
        errors.append(f"header: page should be letters, digits, _ . - only: {f['page']}")
    if ("from" in f) == ("words" in sec):
        errors.append("give either 'from: <lesson page>' in the header or a '## words' section (one of the two)")

    # ---- the words, and where the pictures and clips are
    words, data = [], ""   # [(img, word, phrase)], the page's data lines
    if "from" in f and "words" not in sec:
        src_page = STORIES / f"{f['from'].removesuffix('.html')}.html"
        if not src_page.exists():
            errors.append(f"header: from: no page stories/{src_page.name}")
        else:
            src = src_page.read_text(encoding="utf-8")
            m = re.search(r"( *const IMG_DIR = .*?const AUD_EXT = [^\n]*\n).*?( *const pages = \[\n.*?\n *\];\n)", src, re.S)
            if not m:
                errors.append(f"stories/{src_page.name}: can't find IMG_DIR … AUD_EXT and pages")
            else:
                data = (m.group(1) + f"\n      /* pages: pasted from {src_page.name}, unchanged. */\n" + m.group(2))
                words = lesson_words(src)
    elif "words" in sec:
        slug = f.get("slug")
        if not slug or not re.fullmatch(r"[A-Za-z0-9_.-]+", slug):
            errors.append("header: a '## words' quiz needs 'slug: <picture/audio folder>' (letters, digits, _ . -)")
            slug = slug or "x"
        rows, n = [], 0
        for i, line in sec["words"]:
            cells = [c.strip() for c in line.split("|")]
            if len(cells) < 2 or not cells[0].isdigit() or not cells[1]:
                errors.append(f"line {i}: a word line is '<picture number> | <word> | <phrase>': {line}")
                continue
            img, word = int(cells[0]), cells[1]
            say = cells[2] if len(cells) > 2 and cells[2] else None
            if len(cells) > 3:
                errors.append(f"line {i}: too many | parts (picture | word | phrase): {line}")
            need = 2 if say and say != word else 1
            clips = list(range(n + 1, n + need + 1))
            n += need
            rows.append((img, word, say if need == 2 else None, clips))
            words.append((img, word, say or word))
        if not rows and "words" in sec:
            errors.append("'## words' has no word lines")
        aud = f.get("audio", slug)
        body = []
        for img, word, say, clips in rows:
            sents = f"[[{js(word)}, {clips[0]}]]" + (f", [[{js(say)}, {clips[1]}]]" if say else "")
            body.append(f"        {{ img: {img}, sentences: [{sents}] }},")
        data = (f'      const IMG_DIR = "/img/ytstory/{slug}/";\n'
                f'      const AUD_DIR = "{AUD_BASE}{aud}/";\n'
                f'      const IMG_EXT = "jpg";\n'
                f'      const AUD_EXT = "mp3";\n\n'
                f"      /* One word per picture: the bare word, then the phrase the lesson teaches. */\n"
                f"      const pages = [\n" + "\n".join(body) + "\n      ];\n")

        # pictures: convert the hi-res PNGs when the JPGs aren't there yet
        if rows and not a.no_pictures and not errors:
            img_dir = ROOT / "img/ytstory" / slug
            missing = [r[0] for r in rows if not (img_dir / f"{r[0]}.jpg").exists()]
            src_dir = YOUTUBE / f.get("pictures", slug)
            if missing and all((src_dir / f"{n}.png").exists() for n in missing):
                if a.check:
                    print(f"pictures: {len(missing)} to convert from {src_dir}")
                else:
                    size = ["--max-side", f["size"]] if f.get("size", "").isdigit() else ["--scale", "0.8"]
                    print(f"pictures: converting {src_dir} -> img/ytstory/{slug}/ ({' '.join(size)})", flush=True)
                    if subprocess.run([sys.executable, str(CONVERT_PY), str(src_dir), *size, "-o", str(img_dir)]).returncode:
                        errors.append("picture conversion failed (see above)")
                    missing = [r[0] for r in rows if not (img_dir / f"{r[0]}.jpg").exists()]
            if missing and not a.check:
                errors.append(f"pictures missing in img/ytstory/{slug}/: " + ", ".join(f"{n}.jpg" for n in missing)
                              + f" (and no PNGs for them in {src_dir}; or use --no-pictures)")
            have = sum((ROOT / "media/eng/yt" / aud / f"{c:02d}.mp3").exists() for r in rows for c in r[3])
            total = sum(len(r[3]) for r in rows)
            print(f"audio: {have} of {total} clips are in media/eng/yt/{aud}/"
                  + ("" if have == total else " (story_audio.py makes the rest)"))

    by = {}
    for img, word, say in words:
        by.setdefault(say.lower(), say)
        by.setdefault(word.lower(), say)
    known = lambda t: by.get(t.lower())

    def listed(text, where):
        out = []
        for t in (x.strip() for x in text.split(",")):
            if t and not known(t):
                errors.append(f"{where}: '{t}' is not a word of this quiz")
            elif t:
                out.append(known(t))
        return out

    # ---- the plan
    plan = []
    for i, line in sec.get("quiz", []):
        m = re.fullmatch(r"(\w+)\s*:\s*(.+)", line)
        if not m or m.group(1).lower() not in FORMATS:
            errors.append(f"line {i}: a quiz line is '<format>: <how many>' ({', '.join(FORMATS)}): {line}")
            continue
        kind, rest, block = m.group(1).lower(), m.group(2).strip(), {}
        mx = re.search(r",\s*max\s+(\d+)\s*$", rest)
        if mx:
            block["max"] = int(mx.group(1))
            rest = rest[:mx.start()].strip()
        if kind == "match" and (mm := re.fullmatch(r"(\d+)\s*[x×]\s*(\d+)", rest)):
            block.update(count=int(mm.group(1)), pairs=int(mm.group(2)))
            if not 2 <= block["pairs"] <= 6:
                errors.append(f"line {i}: a match has 2 to 6 pairs")
        elif rest.isdigit():
            block["count"] = int(rest)
            if kind == "match":
                block["pairs"] = 4
        else:
            block["words"] = listed(rest, f"line {i}")
            if kind == "match" and not 2 <= len(block["words"]) <= 6:
                errors.append(f"line {i}: a match has 2 to 6 pairs")
        if block.get("count") == 0:
            errors.append(f"line {i}: 0 questions")
        plan.append((kind, block))
    if not plan:
        plan = [(k, dict(b)) for k, b in DEFAULT_PLAN]

    # enough words for each block?
    if words and not errors:
        art = [w for w in words if re.fullmatch(r"(?i)an? " + re.escape(w[1]), w[2])]
        for kind, b in plan:
            pool = len(words)
            if kind == "article":
                pool = len(art)
            if kind == "spell":
                pool = sum(2 <= len(re.sub(r"[^A-Za-z]", "", w[1])) <= b.get("max", 10) for w in words)
            want = b.get("count", 0) * (b.get("pairs", 1) if kind == "match" else 1)
            if kind in ("pick", "listen") and len(words) < 4:
                errors.append(f"{kind}: needs at least 4 words (4 options), the quiz has {len(words)}")
            if want > pool:
                (errors if kind != "match" and b.get("count", 0) > pool else warnings).append(
                    f"{kind}: asks for {want} word(s) but only {pool} fit this format"
                    + ("" if kind != "match" else " (words will repeat)"))

    similar = [listed(line, f"line {i}") for i, line in sec.get("similar", [])]
    also = {}
    for i, line in sec.get("also", []):
        if "=" not in line:
            errors.append(f"line {i}: an also line is '<answer> = <other form>, <other form>': {line}")
            continue
        ans, forms = line.split("=", 1)
        if not known(ans.strip()):
            errors.append(f"line {i}: '{ans.strip()}' is not a word of this quiz")
        else:
            also[known(ans.strip())] = [x.strip() for x in forms.split(",") if x.strip()]

    # ---- menu
    nav_path = ROOT / f"assets/js/nav-{f.get('menu')}.js" if "menu" in f else None
    nav = ""
    if nav_path and not nav_path.exists():
        errors.append(f"header: no menu assets/js/{nav_path.name}")
    elif nav_path:
        nav = nav_path.read_text(encoding="utf-8")

    out = STORIES / f"{f.get('page')}.html"
    if "page" in f and out.exists() and not a.force and not a.check:
        errors.append(f"stories/{out.name} already exists (use --force to replace it)")
    if not TEMPLATE.exists():
        errors.append(f"the template stories/{TEMPLATE.name} is missing")

    for w in warnings:
        print("warning:", w)
    if errors:
        print(f"{a.md.name}: {len(errors)} problem(s)")
        for e in errors:
            print("  ", e)
        sys.exit(1)
    n_q = sum(1 if "words" in b and k == "match" else len(b["words"]) if "words" in b else b["count"] for k, b in plan)
    print(f"{a.md.name}: {len(words)} words, {n_q} questions ("
          + ", ".join(f"{k} {1 if 'words' in b and k == 'match' else len(b['words']) if 'words' in b else b['count']}" for k, b in plan)
          + ") — OK")
    if a.check:
        return

    # ---- write the page from the template
    def block_js(kind, b):
        parts = [f'type: "{kind}"']
        if "words" in b:
            parts.append("words: [" + ", ".join(js(w) for w in b["words"]) + "]")
        else:
            parts.append(f"count: {b['count']}")
            if "pairs" in b:
                parts.append(f"pairs: {b['pairs']}")
        if "max" in b:
            parts.append(f"max: {b['max']}")
        return "        { " + ", ".join(parts) + " },"

    script = ("    <script>\n"
              "      /* ---------------------------------------------------------------\n"
              "         Mixed vocabulary quiz (assets/js/vocquiz.js; its header explains\n"
              f"         every field). Made from {a.md.name} by stories/new_quiz.py.\n"
              "      --------------------------------------------------------------- */\n"
              + data
              + "\n      /* The plan: which formats, in this order, and how many questions of each. */\n"
              "      const quiz = [\n" + "\n".join(block_js(k, b) for k, b in plan) + "\n      ];\n")
    if similar:
        script += ("\n      /* Words that are easy to mix up: they become each other's wrong options. */\n"
                   "      const SIMILAR = [\n" + "\n".join("        [" + ", ".join(js(w) for w in g) + "]," for g in similar if g)
                   + "\n      ];\n")
    if also:
        script += ("\n      /* Typed forms that are also marked right. */\n      const ALSO = {\n"
                   + "\n".join(f"        {js(k)}: [" + ", ".join(js(x) for x in v) + "]," for k, v in also.items())
                   + "\n      };\n")
    script += "    </script>\n"

    html = TEMPLATE.read_text(encoding="utf-8")

    def sub(pattern, repl):
        nonlocal html
        html, k = re.subn(pattern, lambda m: repl(m) if callable(repl) else repl, html, count=1, flags=re.S)
        if not k:
            sys.exit(f"template {TEMPLATE.name}: can't find {pattern!r}")

    name = re.sub(r"\s*[:–-]\s*(mixed\s+)?quiz\s*$", "", title, flags=re.I)   # "At School: Mixed Quiz" -> "At School"
    back = f"{f['from'].removesuffix('.html')}.html" if "from" in f else None
    sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    sub(r'<a class="brand" href="[^"]*">(.*?</svg>\s*)<span>.*?</span>(.*?)</a>',
        lambda m: (f'<a class="brand" href="{back}">' if back else '<div class="brand">')
        + m.group(1) + f"<span>{esc(name)}</span>" + m.group(2) + ("</a>" if back else "</div>"))
    sub(r'(<div class="counter">)1 / \d+', lambda m: f"{m.group(1)}1 / {n_q}")
    sub(r"    <script>\n      /\* -{20,}\s*Mixed vocabulary quiz.*?    </script>\n", script)
    if nav_path:
        sub(r'<script src="/assets/js/nav-[\w-]+\.js"></script>', f'<script src="/assets/js/{nav_path.name}"></script>')
    out.write_text(html, encoding="utf-8", newline="\n")
    print(f"wrote stories/{out.name}")

    # ---- menu entry: after the lesson (and its typing quiz), else at the end of the group
    if nav_path:
        href = out.name
        if f'href: "{href}"' in nav:
            print(f"menu: {nav_path.name} already lists {href}")
        else:
            entry = f'{{ title: {js(title)}, href: "{href}" }},'
            at = None
            if back:
                hits = [m for m in re.finditer(r'[^\n]*href:\s*"(' + re.escape(back[:-5]) + r'(?:_quiz)?\.html)"[^\n]*\n', nav)]
                if hits:
                    at, indent = hits[-1].end(), re.match(r"\s*", hits[-1].group(0)).group(0)
            if at is None:
                groups = menu_groups(nav)
                g = next((g for g in groups if g[0] == f.get("group")), None) or \
                    next((g for g in groups if g[0] == "Vocabulary"), None) or (groups[-1] if groups else None)
                if g is None:
                    sys.exit(f"menu: can't find a lessons list in {nav_path.name}")
                at = nav.rfind("\n", 0, g[2]) + 1
                indent = re.match(r"\s*", nav[at:]).group(0) + "  "
            nav_path.write_text(nav[:at] + indent + entry + "\n" + nav[at:], encoding="utf-8", newline="\n")
            print(f"menu: added to {nav_path.name}")

    print("\nnext:")
    print(f"  python -E stories/story_audio.py {f['page']}      (makes any missing clips)")
    print(f"  python -I eng/build_single.py {f['page']}         (the offline copy)")


if __name__ == "__main__":
    main()
