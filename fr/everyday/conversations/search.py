#!/usr/bin/env python3
"""Search HTML files in the current folder and all subfolders for a text string."""

from pathlib import Path

SEARCH_TEXT = "Il fait combien aujourd'hui"

def main():
    root = Path(".")
    matches = []

    for path in root.rglob("*"):
        if path.suffix.lower() not in (".html", ".htm"):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except (OSError, UnicodeError) as e:
            print(f"  [skipped] {path}: {e}")
            continue

        # collect matching line numbers (case-sensitive)
        hits = [i for i, line in enumerate(text.splitlines(), 1)
                if SEARCH_TEXT in line]
        if hits:
            matches.append((path, hits))

    if not matches:
        print(f'No files contain: "{SEARCH_TEXT}"')
        return

    print(f'Found "{SEARCH_TEXT}" in {len(matches)} file(s):\n')
    for path, hits in matches:
        lines = ", ".join(str(h) for h in hits)
        print(f"  {path}  (line{'s' if len(hits) > 1 else ''}: {lines})")

if __name__ == "__main__":
    main()