"""
Rebuild the grammar hamburger menu and wire it into every page under fr/grammar.

Run from anywhere:   python fr/grammar/update_nav_grammar.py

What it does
  1. Scans fr/grammar for HTML files, one menu group per folder (sub-folders
     become nested groups) and reads each page's <title> for its label.
  2. Writes the menu data into assets/js/nav-grammar.js (between the
     BEGIN/END MENU DATA markers).
  3. Adds <script src=".../nav-grammar.js?v=YYMMDD"></script> before </body>
     in every page that does not already have one, and bumps ?v= otherwise.
     Pages that already carry their own sidebar/hamburger are skipped
     (see OWN_MENU_MARKERS) so two menus never sit on top of each other.

Run it again whenever you add, rename or delete a grammar page.
"""
import json
import os
import re
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))              # .../fr/grammar
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))         # site root
NAV_JS = os.path.join(ROOT, "assets", "js", "nav-grammar.js")
VERSION = datetime.now().strftime("%y%m%d")

# Folder labels in the menu (all groups are sorted alphabetically by label).
FOLDERS = [
    ("article", "Articles"),
    ("noun", "Nouns"),
    ("pronoun", "Pronouns"),
    ("adjective", "Adjectives"),
    ("adverb", "Adverbs"),
    ("comparative", "Comparatives"),
    ("negation", "Negation"),
    ("preposition", "Prepositions"),
    ("question", "Questions"),
    ("subjunctive", "Subjunctive"),
    ("connector", "Linking words"),
    ("condition", "Si-clauses"),
    ("quantity", "Numbers & quantity"),
    ("gerund", "Gerund"),
    ("reported", "Reported speech"),
    ("passive", "Passive"),
    ("verb", "Verbs"),
    ("imperative", "Imperatives"),
    ("tense", "Tenses"),
    ("others", "Others"),
]
SUBFOLDER_LABELS = {"cooking": "Cooking", "utensils": "Utensils", "single": "Single"}

# Pages containing any of these already have their own top-left menu.
OWN_MENU_MARKERS = ('id="sidebar-nav"', 'id="sidebar-accordion"', 'id="hamburgerBtn"')

SCRIPT_RE = re.compile(r'<script[^>]*nav-grammar\.js[^>]*></script>\s*', re.I)


def read(path):
    with open(path, encoding="utf-8", errors="replace", newline="") as f:
        return f.read()


def title_of(path, fallback):
    m = re.search(r"<title>(.*?)</title>", read(path), re.S | re.I)
    t = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    t = re.sub(r"^French\s+", "", t)  # "French Adverbs ..." -> "Adverbs ..."
    return t or fallback


def build_group(folder, label):
    """Return {label, pages:[{t,h}], groups:[...]} for a folder, recursively."""
    pages, groups = [], []
    for name in sorted(os.listdir(folder), key=str.lower):
        full = os.path.join(folder, name)
        if os.path.isdir(full):
            sub = build_group(full, SUBFOLDER_LABELS.get(name, name.title()))
            if sub["pages"] or sub["groups"]:
                sub["dir"] = name
                groups.append(sub)
        elif name.lower().endswith(".html"):
            pages.append({"t": title_of(full, name), "h": name})
    # same title twice in one folder: tell them apart by file name
    for p in pages:
        if sum(q["t"] == p["t"] for q in pages) > 1:
            p["t"] = f'{p["t"]} ({p["h"][:-5]})'
    # an index page goes first
    pages.sort(key=lambda p: (p["h"].lower() != "index.html",))
    groups.sort(key=lambda g: g["label"].casefold())
    return {"label": label, "pages": pages, "groups": groups}


def build_menu():
    menu = []
    seen = set()
    order = FOLDERS + [
        (d, d.title())
        for d in sorted(os.listdir(HERE))
        if os.path.isdir(os.path.join(HERE, d)) and d not in dict(FOLDERS)
    ]
    for d, label in order:
        full = os.path.join(HERE, d)
        if not os.path.isdir(full) or d in seen:
            continue
        seen.add(d)
        g = build_group(full, label)
        if g["pages"] or g["groups"]:
            g["dir"] = d
            menu.append(g)
    return sorted(menu, key=lambda g: g["label"].casefold())


def write_menu(menu):
    text = read(NAV_JS)
    block = "/* BEGIN MENU DATA */\nconst MENU = " + json.dumps(menu, ensure_ascii=False, indent=1) + ";\n/* END MENU DATA */"
    new = re.sub(r"/\* BEGIN MENU DATA \*/.*?/\* END MENU DATA \*/", lambda _: block, text, flags=re.S)
    with open(NAV_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write(new)


def wire_pages():
    added = bumped = skipped = 0
    for dirpath, _, files in os.walk(HERE):
        for name in files:
            if not name.lower().endswith(".html"):
                continue
            path = os.path.join(dirpath, name)
            html = read(path)
            if any(m in html for m in OWN_MENU_MARKERS):
                skipped += 1
                print("skip (own menu):", os.path.relpath(path, HERE))
                continue
            rel = os.path.relpath(NAV_JS, dirpath).replace(os.sep, "/")
            nl = "\r\n" if "\r\n" in html else "\n"
            tag = f'<script src="{rel}?v={VERSION}"></script>{nl}'
            if SCRIPT_RE.search(html):
                new = SCRIPT_RE.sub(lambda _: tag, html, count=1)
                bumped += 1
            elif re.search(r"</body>", html, re.I):
                new = re.sub(r"</body>", lambda _: tag + "</body>", html, count=1, flags=re.I)
                added += 1
            else:
                print("no </body>:", path)
                continue
            if new != html:
                with open(path, "w", encoding="utf-8", newline="") as f:
                    f.write(new)
    print(f"added {added}, updated {bumped}, skipped {skipped}")


if __name__ == "__main__":
    menu = build_menu()
    write_menu(menu)
    wire_pages()
