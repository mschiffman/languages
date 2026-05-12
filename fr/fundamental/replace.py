#!/usr/bin/env python3
"""
Recursive search/replace in .html/.htm files under the current folder.

Usage:
  python replace_html_recursive.py --old "foo" --new "bar"
  python replace_html_recursive.py --old "foo" --new "bar" --dry-run
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

HTML_EXTENSIONS = {".html", ".htm"}
SKIP_DIRS = {".git", ".svn", ".hg", "node_modules", "dist", "build", "__pycache__", ".venv", "venv"}

def looks_binary(sample: bytes) -> bool:
    return b"\x00" in sample

def process_file(
    file_path: Path,
    old: str,
    new: str,
    dry_run: bool,
    make_backup: bool,
    encoding: str,
) -> tuple[bool, int]:
    """
    Returns: (changed?, replacements_count)
    """
    try:
        raw = file_path.read_bytes()
        if looks_binary(raw[:8192]):
            return (False, 0)

        text = raw.decode(encoding)
    except UnicodeDecodeError:
        return (False, 0)
    except (OSError, PermissionError):
        return (False, 0)

    count = text.count(old)
    if count == 0:
        return (False, 0)

    new_text = text.replace(old, new)

    if dry_run:
        return (True, count)

    try:
        if make_backup:
            backup_path = file_path.with_suffix(file_path.suffix + ".bak")
            if not backup_path.exists():
                backup_path.write_bytes(raw)

        # newline="" keeps existing newlines as-is on most platforms when writing text
        file_path.write_text(new_text, encoding=encoding, newline="")
        return (True, count)
    except (OSError, PermissionError):
        return (False, 0)

def main() -> int:
    parser = argparse.ArgumentParser(description="Recursive text search/replace in HTML files.")
    parser.add_argument("--old", required=True, help="Text to search for")
    parser.add_argument("--new", required=True, help="Replacement text")
    parser.add_argument("--root", default=".", help="Root folder to process (default: current folder)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing files")
    parser.add_argument("--no-backup", action="store_true", help="Do not create .bak backups")
    parser.add_argument("--encoding", default="utf-8", help="File encoding (default: utf-8)")
    parser.add_argument(
        "--skip-dirs",
        nargs="*",
        default=None,
        help=f"Directory names to skip (default: {sorted(SKIP_DIRS)})",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"Root folder not found or not a directory: {root}")
        return 2

    skip_dirs = set(SKIP_DIRS if args.skip_dirs is None else args.skip_dirs)

    files_scanned = 0
    files_changed = 0
    total_replacements = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]

        for name in filenames:
            path = Path(dirpath) / name

            # Only HTML
            if path.suffix.lower() not in HTML_EXTENSIONS:
                continue

            # Skip our backups
            if path.name.lower().endswith((".html.bak", ".htm.bak")):
                continue

            files_scanned += 1
            changed, count = process_file(
                file_path=path,
                old=args.old,
                new=args.new,
                dry_run=args.dry_run,
                make_backup=not args.no_backup,
                encoding=args.encoding,
            )
            if changed and count > 0:
                files_changed += 1
                total_replacements += count
                action = "WOULD CHANGE" if args.dry_run else "CHANGED"
                print(f"{action}: {path}  ({count} replacement{'s' if count != 1 else ''})")

    print("\n--- Summary ---")
    print(f"Root: {root}")
    print(f"Scanned HTML files: {files_scanned}")
    print(f"HTML files changed: {files_changed}")
    print(f"Total replacements: {total_replacements}")
    print("Mode:", "dry-run" if args.dry_run else "write")
    print("Backups:", "disabled" if args.no_backup else "enabled (.bak)")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())