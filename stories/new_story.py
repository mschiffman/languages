"""Make a story page from ChatGPT's story.md.

usage (from the LANGUAGES root):
    python -E stories/new_story.py <story.md>             check it, then write stories/<page>.html
    python -E stories/new_story.py <story.md> --check     only check, write nothing
    python -E stories/new_story.py <story.md> --force     replace an existing page

story.md (the format ChatGPT is asked for in stories/chatgpt_format.txt):

    # Rosie and the Little People of Clover Valley
    page: Clover_valley
    slug: Clover
    menu: stories
    brand: [Rosie] and the Little People of [Clover Valley]

    ## 1
    EN: Rosie and the Little People of Clover Valley
    MY: <Burmese>

    EN: One bright morning,
    EN: Rosie Rabbit was hopping
    EN: through a meadow.
    MY: <Burmese for the whole sentence>

    ## 9 | New Words
    EN: meadow
    MY: <Burmese>

One "## N" per picture (N = img/ytstory/<slug>/N.jpg). Each sentence is one EN
line per chunk (= one audio clip) followed by one MY line for the sentence,
with a blank line between sentences.
"## N | Heading" puts a small heading on that page ("New Words").

Header: page (file name), slug (picture/audio folder), menu (stories, aesop or
science), brand (optional: the two coloured parts of the header title in
[brackets]), group (optional: menu group name, default the menu's first
group), template (optional: page to copy the layout from, default the last
story in that menu group).

The page is a copy of the template with the title, header, folders, Burmese
and pages filled in, and gets a menu entry. Audio comes next:
story_audio.py, check_audio.py, then publish_story.py.
"""
import argparse, re, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
STORIES = ROOT / "stories"
AUD_BASE = "https://languages.rmlives.com/eng/yt/"
CURLY = str.maketrans({"“": '"', "”": '"', "‘": "'", "’": "'"})


class Story:
    def __init__(self):
        self.title = None
        self.fields = {}
        self.pages = []  # {"img": n, "heading": str|None, "line": n, "sentences": [{"chunks": [(text, line)], "my": str}]}


def parse(path):
    """Read story.md; return (story, errors, warnings). Errors and warnings carry line numbers."""
    st, errors, warnings = Story(), [], []
    page = None
    chunks = []  # EN lines waiting for their MY line
    lines = path.read_text(encoding="utf-8-sig").splitlines()

    def close_sentence(lineno, why):
        if chunks:
            errors.append(f"line {chunks[0][1]}: sentence has no MY line ({why} at line {lineno})")
            chunks.clear()

    for i, raw in enumerate(lines, 1):
        line = raw.strip()
        if line.startswith("```"):  # ChatGPT's code block fences
            continue
        if not line:
            close_sentence(i, "blank line")  # sentences are separated by blank lines
            continue
        if line.startswith("## "):
            close_sentence(i, "new picture heading")
            m = re.fullmatch(r"##\s*(\d+)\s*(?:\|\s*(.+))?", line)
            if not m:
                errors.append(f"line {i}: picture heading should be '## N' or '## N | Heading': {line}")
                page = None
                continue
            page = {"img": int(m.group(1)), "heading": m.group(2), "line": i, "sentences": []}
            st.pages.append(page)
        elif line.startswith("# "):
            if st.title:
                errors.append(f"line {i}: a second '# title' line")
            st.title = line[2:].strip()
        elif re.match(r"(?i)EN\s*(\[[^\]]*\])?\s*:", line):
            if page is None:
                errors.append(f"line {i}: EN line before the first '## N' heading")
                continue
            text = line.split(":", 1)[1].strip().translate(CURLY)
            if not text:
                errors.append(f"line {i}: empty EN line")
                continue
            if len(text.split()) > 12:
                warnings.append(f"line {i}: {len(text.split())} words in one chunk, probably a missed split: {text}")
            chunks.append((text, i))
        elif re.match(r"(?i)MY\s*:", line):
            text = line.split(":", 1)[1].strip()
            if not chunks:
                errors.append(f"line {i}: MY line with no EN lines before it (one MY line per sentence)")
                continue
            if not text:
                errors.append(f"line {i}: empty MY line")
            page["sentences"].append({"chunks": chunks[:], "my": text})
            chunks.clear()
        elif m := re.fullmatch(r"(\w+)\s*:\s*(.+)", line):
            if page is not None:
                errors.append(f"line {i}: header line '{m.group(1)}:' after the pictures started")
            st.fields[m.group(1).lower()] = m.group(2).strip()
        else:
            errors.append(f"line {i}: not an EN, MY, heading or header line: {line}")
    close_sentence(len(lines), "end of file")

    if not st.title:
        errors.append("line 1: no '# Title' line")
    for f in ("page", "slug", "menu"):
        if f not in st.fields:
            errors.append(f"header: no '{f}:' line")
    for k in ("page", "slug"):
        if k in st.fields and not re.fullmatch(r"[A-Za-z0-9_.-]+", st.fields[k]):
            errors.append(f"header: {k} should be letters, digits, _ . - only: {st.fields[k]}")
    if "menu" in st.fields and not (ROOT / f"assets/js/nav-{st.fields['menu']}.js").exists():
        errors.append(f"header: no menu assets/js/nav-{st.fields['menu']}.js")
    if "brand" in st.fields and st.title:
        if st.fields["brand"].replace("[", "").replace("]", "") != st.title:
            errors.append(f"header: brand without its [brackets] should read exactly like the title")
    if not st.pages:
        errors.append("no '## N' picture headings")
    for n, p in enumerate(st.pages, 1):
        if p["img"] != n:
            errors.append(f"line {p['line']}: picture {p['img']}, expected {n} (pictures run 1, 2, 3 … in order)")
        if not p["sentences"]:
            errors.append(f"line {p['line']}: picture {p['img']} has no sentences")
    return st, errors, warnings


def js(s):
    """A JS string the way the existing pages write it: double quotes, or single quotes when it contains a "."""
    if '"' in s:
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"
    return '"' + s.replace("\\", "\\\\") + '"'


def pages_js(st):
    out, n = [], 0
    for p in st.pages:
        out.append("        {")
        out.append(f"          img: {p['img']},")
        out.append("          tr: [")
        out += [f"            {js(s['my'])}," for s in p["sentences"]]
        out.append("          ],")
        if p["heading"]:
            out.append(f"          heading: {js(p['heading'])},")
        out.append("          sentences: [")
        for s in p["sentences"]:
            items = []
            for text, _ in s["chunks"]:
                n += 1
                items.append(f"[{js(text)}, {n}]")
            if len(items) == 1:
                out.append(f"            [{items[0]}],")
            else:
                out.append("            [")
                out += [f"              {it}," for it in items]
                out.append("            ],")
        out.append("          ],")
        out.append("        },")
    return "\n".join(out), n


def brand_html(st):
    b = st.fields.get("brand")
    if not b:
        return f"<span>{esc(st.title)}</span>"
    parts = iter(["lion", "mouse"])

    def span(m):
        cls = next(parts, "mouse")
        return f'<span class="{cls}">{esc(m.group(1)).replace(" ", "&nbsp;")}</span>'
    return "<span>" + re.sub(r"\[([^\]]+)\]", span, b) + "</span>"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def menu_groups(nav):
    """[(name, start, end)] of each group's lessons list in a nav-*.js file (end = index of its closing ']')."""
    groups = []
    for m in re.finditer(r'name:\s*"([^"]*)",\s*lessons:\s*\[', nav):
        depth, j = 1, m.end()
        while depth:
            depth += {"[": 1, "]": -1}.get(nav[j], 0)
            j += 1
        groups.append((m.group(1), m.end(), j - 1))
    return groups


def main():
    ap = argparse.ArgumentParser(description="Make a story page from ChatGPT's story.md")
    ap.add_argument("md", type=Path)
    ap.add_argument("--check", action="store_true", help="only check story.md and the pictures")
    ap.add_argument("--force", action="store_true", help="replace an existing page")
    ap.add_argument("--no-pictures", action="store_true", help="don't require the pictures yet")
    a = ap.parse_args()

    st, errors, warnings = parse(a.md)
    f = st.fields
    nav_path = ROOT / f"assets/js/nav-{f.get('menu')}.js"
    nav = nav_path.read_text(encoding="utf-8") if nav_path.exists() else ""
    groups = menu_groups(nav)
    group = None
    if nav:
        want = f.get("group")
        group = next((g for g in groups if g[0] == want), None) if want else (groups[0] if groups else None)
        if group is None:
            errors.append(f"header: no menu group {want!r} in {nav_path.name} (groups: {', '.join(g[0] for g in groups)})")

    out = STORIES / f"{f.get('page')}.html"
    if "page" in f and out.exists() and not a.force and not a.check:
        errors.append(f"stories/{out.name} already exists (use --force to replace it)")

    if "slug" in f and st.pages and not a.no_pictures:
        img_dir = ROOT / "img/ytstory" / f["slug"]
        missing = [p["img"] for p in st.pages if not (img_dir / f"{p['img']}.jpg").exists()]
        if missing:
            errors.append(f"pictures missing in img/ytstory/{f['slug']}/: "
                          + ", ".join(f"{n}.jpg" for n in missing)
                          + " (run all_downloads_to_ytstory.bat, or use --no-pictures)")
        extra = sorted(int(p.stem) for p in img_dir.glob("*.jpg") if p.stem.isdigit() and int(p.stem) > len(st.pages))
        if extra:
            warnings.append(f"img/ytstory/{f['slug']}/ has more pictures than the story: "
                            + ", ".join(f"{n}.jpg" for n in extra))

    # template: the page named in the header, else the last story in the menu group
    tpl_name = f.get("template")
    if not tpl_name and group:
        hrefs = re.findall(r'href:\s*"([^"]+)\.html"', nav[group[1]:group[2]])
        tpl_name = next((h for h in reversed(hrefs) if h != f.get("page") and (STORIES / f"{h}.html").exists()), None)
    tpl = STORIES / f"{tpl_name}.html" if tpl_name else None
    if not errors and (tpl is None or not tpl.exists()):
        errors.append(f"no template page {tpl_name!r} (add 'template: <page>' to the header)")

    for w in warnings:
        print("warning:", w)
    if errors:
        print(f"{a.md.name}: {len(errors)} problem(s)")
        for e in errors:
            print("  ", e)
        sys.exit(1)

    body, n_chunks = pages_js(st)
    n_sent = sum(len(p["sentences"]) for p in st.pages)
    print(f"{a.md.name}: {len(st.pages)} pictures, {n_sent} sentences, {n_chunks} chunks — OK")
    if a.check:
        return

    html = tpl.read_text(encoding="utf-8")

    def sub(pattern, repl, flags=re.S, required=True):
        nonlocal html
        html, k = re.subn(pattern, lambda m: repl(m) if callable(repl) else repl, html, count=1, flags=flags)
        if not k and required:
            sys.exit(f"template {tpl.name}: can't find {pattern!r}")

    sub(r"<title>.*?</title>", f"<title>{esc(st.title)}</title>")
    sub(r'(<div class="brand">.*?</svg>\s*).*?(\s*</div>)', lambda m: m.group(1) + brand_html(st) + m.group(2))
    sub(r'(<div class="counter" id="counter">)1 / \d+', lambda m: f"{m.group(1)}1 / {len(st.pages)}")
    sub(r"/\* -{20,}\s*Media:.*?-{20,} \*/",
        f"/* ---------------------------------------------------------------\n"
        f"   Media:\n"
        f"     images : /img/ytstory/{f['slug']}/1.jpg … {len(st.pages)}.jpg   (one per book page)\n"
        f"     audio  : 01.mp3 … {n_chunks:02d}.mp3 in AUD_DIR (one per phrase, in reading order)\n"
        f"   Made from story.md by stories/new_story.py.\n"
        f"--------------------------------------------------------------- */")
    sub(r'const IMG_DIR = "[^"]*";', f'const IMG_DIR = "/img/ytstory/{f["slug"]}/";')
    sub(r'const AUD_DIR = "[^"]*";', f'const AUD_DIR = "{AUD_BASE}{f["slug"]}/";')
    if "const TRANSLATION" not in html:
        sub(r'(const AUD_EXT = "[^"]*";\n)',
            lambda m: m.group(1) + '\n      /* Burmese translation, one line per sentence (page.tr), shown by the footer button. */\n'
                                   '      const TRANSLATION = { lang: "my", label: "မြန်မာ" };\n')
    if "Noto+Sans+Myanmar" not in html:
        sub(r"(family=Andika:wght@[^&\"]*)", lambda m: m.group(1) + "&family=Noto+Sans+Myanmar:wght@400")
    sub(r"/\* pages -> sentences -> chunks\.[^*]*\*/", f"/* pages -> sentences -> chunks. Audio numbers run 1..{n_chunks} in order. */",
        required=False)
    sub(r"(const pages = \[\n).*?(\n      \];\n    </script>)", lambda m: m.group(1) + body + m.group(2))
    sub(r'<script src="/assets/js/nav-[\w-]+\.js"></script>', f'<script src="/assets/js/nav-{f["menu"]}.js"></script>')

    out.write_text(html, encoding="utf-8", newline="\n")
    print(f"wrote stories/{out.name} (layout from {tpl.name})")

    href = f"{f['page']}.html"
    if f'href: "{href}"' in nav:
        print(f"menu: {nav_path.name} already lists {href}")
    else:
        entry = f'{{ title: {js(st.title)}, href: "{href}" }},'
        close = group[2]
        line_start = nav.rfind("\n", 0, close) + 1  # the line with the group's closing ']'
        indent = re.match(r"\s*", nav[line_start:]).group(0) + "  "
        nav = nav[:line_start] + indent + entry + "\n" + nav[line_start:]
        nav_path.write_text(nav, encoding="utf-8", newline="\n")
        print(f"menu: added to {nav_path.name}, group {group[0]!r}")

    print("\nnext:")
    print(f"  python -E stories/story_audio.py {f['page']}")
    print(f"  python -E stories/check_audio.py {f['page']}")
    print(f"  python -E stories/publish_story.py {f['page']}")
    print("Don't open the page in a browser before publish_story.py has uploaded the audio.")


if __name__ == "__main__":
    main()
