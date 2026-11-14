"""Put a "Test yourself" quiz into an expression cards page, from a quiz.md.

usage (from the LANGUAGES root):
    python -E eng/expressions/new_expr_quiz.py <quiz.md>            check it, then write it into the page
    python -E eng/expressions/new_expr_quiz.py <quiz.md> --check    only check, change nothing
    python -E eng/expressions/new_expr_quiz.py <quiz.md> --force    replace a quiz that was typed into the page by hand
    python -E eng/expressions/new_expr_quiz.py --cards <page>       print the page's cards, to paste into ChatGPT
                                                                    with chatgpt_quiz_format.txt

The quiz is embedded: it goes into eng/expressions/<page>.html as `const quiz = [...]`
(between "quiz:start" and "quiz:end" marks, so running again replaces it), and the page
gets the quiz stylesheet and scripts if it doesn't load them yet. Nothing else changes.
Then build the offline copy:  python eng/expressions/build_single.py <page>

quiz.md (model: Desktop\\story-md\\exclamation_quiz.md):

    # Exclamations: Quiz
    type: expression-quiz
    page: exclamation

    ## tags
    feeling = Match the feeling: surprise, happiness, pain, bad news or relief.

    ## match
    Really?
    Oops!
    Ouch!

    ## match
    How are you? = Good, thanks. And you?
    What's up? = Not much. You?

    ## say
    SCENE: 🎓 Your friend passed her exam.
    MY: <the scene in Burmese>
    + Congratulations!
    - Good luck! | moment | Good luck! is before the exam.
    - What a shame! | feeling

    ## reply
    PROMPT: Nice to meet you.
    + Nice to meet you too.
    - Good to see you. | moment | <note>

    ## build
    CUE: 🙏 Something bad didn't happen
    + Thank goodness!
    - thanks | words | It is Thank goodness!, without s.
    ALSO: <another word order that is also right>

    ## judge
    SCENE: 🍽️ At dinner · Everyone lifts a glass.
    MY: <the scene in Burmese>
    PHRASE: Cheers!
    OK: yes
    TAG: meaning
    NOTE: <optional>

One "## <type>" block per question; lines starting with // are notes.
  +   the right answer (a card of the page, written exactly as on the card)
  -   a wrong option:  - <phrase> | <mistake tag> | <note>   (note optional: the card's own note)
      in a build block: an extra wrong word tile
  match   a list of cards = English with each card's Burmese; "<card> = <reply>" lines = a
          line with its reply. 2 to 6 pairs.
  ## tags   "<tag> = <tip>": new mistake tags, or new wording for a built-in one's tip.
Built-in tags: time, moment, register, literal, reply, words, meaning.
"""
import argparse, json, re, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
CURLY = str.maketrans({"“": '"', "”": '"', "‘": "'", "’": "'"})
TAGS = {"time", "moment", "register", "literal", "reply", "words", "meaning"}
TYPES = ("match", "say", "reply", "build", "judge")
KEYS = {"say": {"SCENE", "MY", "NOTE"}, "reply": {"PROMPT", "SCENE", "MY", "NOTE"},
        "build": {"CUE", "MY", "NOTE", "ALSO"}, "judge": {"SCENE", "MY", "PHRASE", "OK", "TAG", "NOTE"}, "match": set()}
START = "/* quiz:start"
END = "/* quiz:end */"
J = lambda s: json.dumps(s, ensure_ascii=False)   # a JS string


def strip_tags(s):
    return re.sub(r"<[^>]*>", "", s)


def main():
    ap = argparse.ArgumentParser(description="Embed a quiz in an expression cards page")
    ap.add_argument("md", type=Path, nargs="?")
    ap.add_argument("--cards", metavar="PAGE", help="print the cards of eng/expressions/<PAGE>.html and stop")
    ap.add_argument("--check", action="store_true", help="only check quiz.md against the cards")
    ap.add_argument("--force", action="store_true", help="replace a quiz typed into the page by hand")
    a = ap.parse_args()
    if a.cards:
        return print_cards(a.cards)
    if not a.md:
        ap.error("give a quiz.md (or --cards <page>)")

    title, fields, tags, blocks, errors = None, {}, {}, [], []
    cur = None   # {"type", "line", "keys": {}, "plus": [], "minus": [], "rows": []}
    in_tags = False
    for i, raw in enumerate(a.md.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip().translate(CURLY)
        if not line or line.startswith("//") or line.startswith("```"):
            continue
        if line.startswith("## "):
            name = line[3:].strip().lower()
            in_tags, cur = name == "tags", None
            if name in TYPES:
                cur = {"type": name, "line": i, "keys": {}, "plus": [], "minus": [], "rows": []}
                blocks.append(cur)
            elif not in_tags:
                errors.append(f"line {i}: unknown block '## {name}' ({', '.join(TYPES)}, tags)")
        elif line.startswith("# "):
            title = line[2:].strip()
        elif in_tags:
            if "=" not in line:
                errors.append(f"line {i}: a tag line is '<tag> = <tip>': {line}")
            else:
                k, v = (x.strip() for x in line.split("=", 1))
                tags[k] = v
        elif cur is None:
            m = re.fullmatch(r"([\w-]+)\s*:\s*(.+)", line)
            if m:
                fields[m.group(1).lower()] = m.group(2).strip()
            else:
                errors.append(f"line {i}: not a header line (name: value): {line}")
        elif cur["type"] == "match":
            cur["rows"].append((i, line))
        elif line[0] in "+-" and line[1:2] == " ":
            parts = [x.strip() for x in line[2:].split("|", 2)]
            (cur["plus"] if line[0] == "+" else cur["minus"]).append((i, parts))
        else:
            m = re.fullmatch(r"([A-Za-z]+)\s*:\s*(.+)", line)
            if not m or m.group(1).upper() not in KEYS[cur["type"]]:
                errors.append(f"line {i}: in a {cur['type']} block, lines are + answer, - wrong option, or "
                              f"{', '.join(sorted(KEYS[cur['type']]))}: — got: {line}")
            else:
                cur["keys"][m.group(1).upper()] = m.group(2).strip()

    if fields.get("type", "").lower() != "expression-quiz":
        errors.append("header: 'type: expression-quiz' is missing")
    page = HERE / f"{fields.get('page', '').removesuffix('.html')}.html"
    if "page" not in fields:
        errors.append("header: no 'page:' line (the cards page, e.g. page: exclamation)")
    elif not page.exists():
        errors.append(f"header: no page eng/expressions/{page.name}")
    if not blocks:
        errors.append("no question blocks")
    if errors:
        return report(a.md, errors)

    src = page.read_text(encoding="utf-8")
    i0 = src.index("const categories")
    cat_end = src.index("\n      ];", i0) + len("\n      ];")
    cards = {}   # English -> Burmese
    for m in re.finditer(r'(?m)^\s*\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"', src[i0:cat_end]):
        en, my = (json.loads(f'"{g}"') for g in m.groups())
        cards[strip_tags(en)] = strip_tags(my)
    known = TAGS | set(tags)

    def card(text, where, what):
        if text not in cards:
            near = [c for c in cards if c.lower().strip(".!?") == text.lower().strip(".!?")]
            errors.append(f"line {where}: {what} \"{text}\" is not a card of {page.name}"
                          + (f" (did you mean \"{near[0]}\"?)" if near else ""))

    def option(i, parts, what):
        """(text, js value) of a '-' line: tag, or [tag, note]"""
        if len(parts) < 2 or not parts[0] or not parts[1]:
            errors.append(f"line {i}: a {what} is '- <text> | <tag> | <note>' (the tag is needed)")
            return parts[0], '""'
        if parts[1] not in known:
            errors.append(f"line {i}: unknown tag \"{parts[1]}\" (tags: {', '.join(sorted(known))}; add others under ## tags)")
        return parts[0], (f"[{J(parts[1])}, {J(parts[2])}]" if len(parts) > 2 and parts[2] else J(parts[1]))

    out = []
    for b in blocks:
        t, k, ln = b["type"], b["keys"], b["line"]
        q = [f'type: "{t}"']
        if t == "match":
            pairs = [tuple(x.strip() for x in line.split("=", 1)) for _, line in b["rows"] if "=" in line]
            plain = [line for _, line in b["rows"] if "=" not in line]
            if pairs and plain:
                errors.append(f"line {ln}: a match is either a list of cards or '<card> = <reply>' lines, not both")
            n = len(pairs or plain)
            if not 2 <= n <= 6:
                errors.append(f"line {ln}: a match has 2 to 6 pairs, this one has {n}")
            for i, line in b["rows"]:
                card(line.split("=", 1)[0].strip(), i, "match line")
            right = [r for _, r in pairs] or [cards.get(c, c) for c in plain]
            if len(set(right)) < len(right):
                dup = sorted({r for r in right if right.count(r) > 1})
                errors.append(f"line {ln}: two pairs have the same right-hand text: {', '.join(dup)}")
            if pairs:
                q.append("pairs: {\n" + "".join(f"            {J(l)}: {J(r)},\n" for l, r in pairs) + "          }")
            else:
                q.append("cards: [" + ", ".join(J(c) for c in plain) + "]")
            out.append("        { " + ", ".join(q) + " }," if not pairs else block_js(q))
            continue

        if t == "judge":
            for need in ("PHRASE", "OK", "TAG", "SCENE"):
                if need not in k:
                    errors.append(f"line {ln}: judge block has no {need}: line")
            if b["plus"] or b["minus"]:
                errors.append(f"line {ln}: a judge block has no + or - lines (use PHRASE:, OK:, TAG:)")
            if "PHRASE" in k:
                card(k["PHRASE"], ln, "PHRASE")
            ok = k.get("OK", "").lower()
            if ok not in ("yes", "no"):
                errors.append(f"line {ln}: OK: is yes or no")
            if k.get("TAG") and k["TAG"] not in known:
                errors.append(f"line {ln}: unknown tag \"{k['TAG']}\"")
            q += [f"scene: {J(k.get('SCENE', ''))}"] + ([f"my: {J(k['MY'])}"] if "MY" in k else [])
            q += [f"phrase: {J(k.get('PHRASE', ''))}", f"ok: {'true' if ok == 'yes' else 'false'}", f"tag: {J(k.get('TAG', ''))}"]
        else:
            if len(b["plus"]) != 1:
                errors.append(f"line {ln}: a {t} block needs exactly one '+ <answer>' line, this one has {len(b['plus'])}")
                continue
            ai, aparts = b["plus"][0]
            card(aparts[0], ai, "the answer")
            if t in ("say", "reply") and not b["minus"]:
                errors.append(f"line {ln}: a {t} block needs at least one '- <wrong option>' line")
            if t == "say" and "SCENE" not in k:
                errors.append(f"line {ln}: say block has no SCENE: line")
            if t == "reply":
                if "PROMPT" not in k:
                    errors.append(f"line {ln}: reply block has no PROMPT: line")
                else:
                    card(k["PROMPT"], ln, "PROMPT")
                    q.append(f"prompt: {J(k['PROMPT'])}")
            if "SCENE" in k:
                q.append(f"scene: {J(k['SCENE'])}")
            if "CUE" in k:
                q.append(f"cue: {J(k['CUE'])}")
            if "MY" in k:
                q.append(f"my: {J(k['MY'])}")
            q.append(f"answer: {J(aparts[0])}")
            opts = [option(i, parts, "wrong word" if t == "build" else "wrong option") for i, parts in b["minus"]]
            if t == "build":
                for (i, parts), (text, _) in zip(b["minus"], opts):
                    if " " in text:
                        errors.append(f"line {i}: a build decoy is one word: {text}")
                if opts:
                    q.append("decoys: {\n" + "".join(f"            {J(x)}: {v},\n" for x, v in opts) + "          }")
                if "ALSO" in k:
                    q.append("also: [" + ", ".join(J(x.strip()) for x in k["ALSO"].split("|")) + "]")
            else:
                for (i, parts), (text, _) in zip(b["minus"], opts):
                    if text == aparts[0]:
                        errors.append(f"line {i}: the wrong option is the same as the answer")
                q.append("wrong: {\n" + "".join(f"            {J(x)}: {v},\n" for x, v in opts) + "          }")
        if "NOTE" in k:
            q.append(f"note: {J(k['NOTE'])}")
        out.append(block_js(q))

    if errors:
        return report(a.md, errors)
    counts = {t: sum(b["type"] == t for b in blocks) for t in TYPES}
    print(f"{a.md.name}: {len(blocks)} questions for {page.name} ("
          + ", ".join(f"{t} {n}" for t, n in counts.items() if n) + f"), {len(cards)} cards — OK")
    if a.check:
        return

    quiz_js = (f"\n\n      {START}: made from {a.md.name} by new_expr_quiz.py. Change the .md and run it again. */\n"
               + ("      const quizTags = {\n" + "".join(f"        {k}: {J(v)},\n" for k, v in tags.items()) + "      };\n" if tags else "")
               + "      const quiz = [\n" + "\n".join(out) + "\n      ];\n      " + END)
    if START in src:
        s, e = src.index(START), src.index(END) + len(END)
        s = len(src[:s].rstrip())   # the blank lines before the mark come back with quiz_js
        src = src[:s] + quiz_js + src[e:]
    elif re.search(r"\bconst quiz\s*=", src):
        if not a.force:
            sys.exit(f"{page.name} already has a quiz that was typed in by hand. --force replaces it with this one.")
        s = re.search(r"\n\s*(/\*[^*]*\*/\s*)?const quiz\s*=\s*\[", src[cat_end:]).start() + cat_end
        e = src.index("\n      ];", s) + len("\n      ];")
        src = src[:s] + quiz_js + src[e:]
    else:
        src = src[:cat_end] + quiz_js + src[cat_end:]

    added = []
    if "expression-quiz.css" not in src:
        src = src.replace('<link rel="stylesheet" href="../../assets/css/pimsleur.css" />',
                          '<link rel="stylesheet" href="../../assets/css/pimsleur.css" />\n'
                          '    <link rel="stylesheet" href="../../assets/css/expression-quiz.css" />', 1)
        added.append("expression-quiz.css")
    if "expression-quiz.js" not in src:
        src = src.replace('<script src="../../assets/js/expression-flash.js"></script>',
                          '<script src="../../assets/js/expression-flash.js"></script>\n'
                          '    <script src="../../assets/js/expression-quiz.js"></script>', 1)
        added.append("expression-quiz.js")
    if "alpine.min.js" not in src:
        src = src.replace("  </body>", "    <!-- last: Alpine starts the quiz once everything above has run -->\n"
                                       '    <script src="../../assets/js/alpine.min.js"></script>\n  </body>', 1)
        added.append("alpine.min.js")
    for f in ("expression-quiz.css", "expression-quiz.js", "alpine.min.js"):
        if f not in src:
            sys.exit(f"couldn't add {f} to {page.name}: the page isn't laid out like the other cards pages")
    page.write_text(src, encoding="utf-8", newline="\n")
    print(f"wrote the quiz into eng/expressions/{page.name}" + (f" (added {', '.join(added)})" if added else ""))
    print(f"\nnext:\n  python eng/expressions/build_single.py {page.stem}      (the offline copy)")


def print_cards(name):
    """The cards as plain text: category headings, then English | Burmese | note."""
    page = HERE / f"{name.removesuffix('.html')}.html"
    if not page.exists():
        sys.exit(f"no page eng/expressions/{page.name}")
    src = page.read_text(encoding="utf-8")
    i0 = src.index("const categories")
    body = src[i0:src.index("\n      ];", i0)]
    print(f"page: {page.stem}")
    for m in re.finditer(r'(?m)^\s*en:\s*"((?:[^"\\]|\\.)*)"|^\s*\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"(?:,\s*"((?:[^"\\]|\\.)*)")?', body):
        if m.group(1) is not None:
            print(f"\n[{json.loads(chr(34) + m.group(1) + chr(34))}]")
        else:
            en, my, note = (strip_tags(json.loads(f'"{g}"')) if g else "" for g in m.groups()[1:])
            print(f"{en} | {my} | {note}")


def block_js(parts):
    return "        {\n" + "".join(f"          {p},\n" for p in parts) + "        },"


def report(md, errors):
    print(f"{md.name}: {len(errors)} problem(s)")
    for e in errors:
        print("  ", e)
    sys.exit(1)


if __name__ == "__main__":
    main()
