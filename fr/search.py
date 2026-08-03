#!/usr/bin/env python3
r"""
search.py — recursively search files by name, extension, or text content.

Examples:
    python search.py "misc" --filename
    python search.py "md" --extension
    python search.py "French shadowing" --content
    python search.py "budget" --both --ext md txt
    python search.py "invoice\s+\d+" --content --regex
    python search.py "report" --filename --root "C:\Users\Owner\Documents"
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator


DEFAULT_EXCLUDED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
}

# Files larger than this are skipped during content searches unless --max-size is changed.
DEFAULT_MAX_SIZE_MB = 10.0

# A few common encodings, tried in order.
TEXT_ENCODINGS = ("utf-8", "utf-8-sig", "utf-16", "cp1252")


@dataclass
class Match:
    path: Path
    kind: str
    line_number: int | None = None
    preview: str | None = None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Search a folder and all subfolders by filename, extension, "
            "or text contained inside files."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python search.py "misc" --filename
  python search.py "md" --extension
  python search.py "French shadowing" --content
  python search.py "budget" --both --ext md txt
  python search.py "report" --filename --root "C:\\Users\\Owner\\Documents"
  python search.py "invoice\\s+\\d+" --content --regex

Notes:
  --filename searches the complete filename, including its extension.
  --extension searches only the final extension, such as md, pdf, or docx.
  --content searches ordinary text files and reports matching line numbers.
  If no search mode is supplied, --both is used.
""",
    )

    parser.add_argument("query", help="Text or regular expression to search for")
    parser.add_argument(
        "-r",
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Folder to search. Default: the current folder",
    )

    modes = parser.add_mutually_exclusive_group()
    modes.add_argument(
        "--filename",
        action="store_true",
        help="Search filenames only; the extension is included in the filename",
    )
    modes.add_argument(
        "--extension",
        action="store_true",
        help="Search file extensions only, such as md, pdf, or docx",
    )
    modes.add_argument(
        "--content",
        action="store_true",
        help="Search text contained inside files only",
    )
    modes.add_argument(
        "--both",
        action="store_true",
        help="Search both filenames and text content; this is the default",
    )

    parser.add_argument(
        "--ext",
        nargs="+",
        metavar="EXT",
        help="Limit files to one or more extensions, such as --ext md txt py",
    )
    parser.add_argument(
        "--case-sensitive",
        action="store_true",
        help="Make matching case-sensitive",
    )
    parser.add_argument(
        "--regex",
        action="store_true",
        help="Treat the query as a Python regular expression",
    )
    parser.add_argument(
        "--exact",
        action="store_true",
        help="Require an exact filename or extension match",
    )
    parser.add_argument(
        "--max-size",
        type=float,
        default=DEFAULT_MAX_SIZE_MB,
        metavar="MB",
        help=f"Maximum file size for content searches. Default: {DEFAULT_MAX_SIZE_MB:g} MB",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=5,
        metavar="N",
        help="Maximum content matches shown per file. Default: 5; use 0 for unlimited",
    )
    parser.add_argument(
        "--exclude-dir",
        action="append",
        default=[],
        metavar="NAME",
        help="Exclude a directory name. May be used more than once",
    )
    parser.add_argument(
        "--include-hidden",
        action="store_true",
        help="Include hidden files and folders",
    )
    parser.add_argument(
        "--paths-only",
        action="store_true",
        help="Print matching paths without line previews",
    )
    return parser


def normalize_extensions(values: list[str] | None) -> set[str] | None:
    if not values:
        return None
    normalized = set()
    for value in values:
        ext = value.strip().lower()
        if not ext:
            continue
        if not ext.startswith("."):
            ext = "." + ext
        normalized.add(ext)
    return normalized or None


def is_hidden(path: Path) -> bool:
    """Best-effort hidden-file check that works on Windows and Unix-like systems."""
    if path.name.startswith("."):
        return True

    if os.name == "nt":
        try:
            import ctypes

            attrs = ctypes.windll.kernel32.GetFileAttributesW(str(path))
            if attrs != -1:
                FILE_ATTRIBUTE_HIDDEN = 0x2
                return bool(attrs & FILE_ATTRIBUTE_HIDDEN)
        except Exception:
            pass

    return False


def iter_files(
    root: Path,
    excluded_dirs: set[str],
    include_hidden: bool,
) -> Iterator[Path]:
    """Yield files recursively while pruning excluded directories."""
    for current_root, dir_names, file_names in os.walk(root):
        current = Path(current_root)

        kept_dirs: list[str] = []
        for name in dir_names:
            candidate = current / name
            if name in excluded_dirs:
                continue
            if not include_hidden and is_hidden(candidate):
                continue
            kept_dirs.append(name)
        dir_names[:] = kept_dirs

        for name in file_names:
            candidate = current / name
            if not include_hidden and is_hidden(candidate):
                continue
            yield candidate


def compile_matcher(
    query: str,
    *,
    regex: bool,
    case_sensitive: bool,
):
    flags = 0 if case_sensitive else re.IGNORECASE

    if regex:
        try:
            pattern = re.compile(query, flags)
        except re.error as exc:
            raise ValueError(f"Invalid regular expression: {exc}") from exc

        return lambda text: pattern.search(text) is not None

    if case_sensitive:
        return lambda text: query in text

    lowered = query.casefold()
    return lambda text: lowered in text.casefold()


def exact_match(left: str, right: str, case_sensitive: bool) -> bool:
    if case_sensitive:
        return left == right
    return left.casefold() == right.casefold()


def file_matches_extension_filter(path: Path, allowed: set[str] | None) -> bool:
    if allowed is None:
        return True
    return path.suffix.lower() in allowed


def looks_binary(sample: bytes) -> bool:
    """Detect obvious binary data before attempting text decoding."""
    if not sample:
        return False
    if b"\x00" in sample:
        # UTF-16 often contains NUL bytes, so recognize common byte-order marks.
        if sample.startswith((b"\xff\xfe", b"\xfe\xff")):
            return False
        return True

    # Count control bytes that are uncommon in ordinary text.
    suspicious = sum(
        byte < 9 or (13 < byte < 32)
        for byte in sample
    )
    return suspicious / len(sample) > 0.10


def read_text_lines(path: Path) -> Iterable[tuple[int, str]]:
    """
    Read a likely text file and yield (line number, line).

    The function reads the file once as bytes, rejects obvious binary files,
    and then tries a few common encodings.
    """
    data = path.read_bytes()

    if looks_binary(data[:4096]):
        raise UnicodeError("binary file")

    last_error: UnicodeError | None = None
    for encoding in TEXT_ENCODINGS:
        try:
            text = data.decode(encoding)
            for line_number, line in enumerate(text.splitlines(), start=1):
                yield line_number, line
            return
        except UnicodeError as exc:
            last_error = exc

    raise last_error or UnicodeError("could not decode file")


def clean_preview(line: str, width: int = 180) -> str:
    preview = " ".join(line.strip().split())
    if len(preview) > width:
        return preview[: width - 1] + "…"
    return preview


def relative_display(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def search(args: argparse.Namespace) -> tuple[list[Match], int, int]:
    root = args.root.expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Folder does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Not a folder: {root}")
    if args.max_size < 0:
        raise ValueError("--max-size cannot be negative")
    if args.max_matches < 0:
        raise ValueError("--max-matches cannot be negative")

    allowed_extensions = normalize_extensions(args.ext)
    excluded_dirs = DEFAULT_EXCLUDED_DIRS | set(args.exclude_dir)

    search_filename = args.filename or args.both
    search_extension = args.extension
    search_content = args.content or args.both

    # Default mode when no mode flag was provided.
    if not any((args.filename, args.extension, args.content, args.both)):
        search_filename = True
        search_content = True

    matcher = compile_matcher(
        args.query,
        regex=args.regex,
        case_sensitive=args.case_sensitive,
    )

    results: list[Match] = []
    scanned_files = 0
    skipped_content_files = 0
    max_bytes = int(args.max_size * 1024 * 1024)

    normalized_extension_query = args.query.strip()
    if normalized_extension_query.startswith("."):
        normalized_extension_query = normalized_extension_query[1:]

    for path in iter_files(root, excluded_dirs, args.include_hidden):
        if not file_matches_extension_filter(path, allowed_extensions):
            continue

        scanned_files += 1

        if search_filename:
            if args.exact:
                matched = exact_match(path.name, args.query, args.case_sensitive)
            else:
                matched = matcher(path.name)
            if matched:
                results.append(Match(path=path, kind="filename"))

        if search_extension:
            extension = path.suffix[1:] if path.suffix.startswith(".") else path.suffix
            if args.exact:
                matched = exact_match(
                    extension,
                    normalized_extension_query,
                    args.case_sensitive,
                )
            else:
                matched = matcher(extension)
            if matched:
                results.append(Match(path=path, kind="extension"))

        if not search_content:
            continue

        try:
            size = path.stat().st_size
            if size > max_bytes:
                skipped_content_files += 1
                continue

            matches_in_file = 0
            for line_number, line in read_text_lines(path):
                if matcher(line):
                    results.append(
                        Match(
                            path=path,
                            kind="content",
                            line_number=line_number,
                            preview=clean_preview(line),
                        )
                    )
                    matches_in_file += 1
                    if args.max_matches and matches_in_file >= args.max_matches:
                        break
        except (OSError, UnicodeError):
            skipped_content_files += 1
            continue

    return results, scanned_files, skipped_content_files


def print_results(
    results: list[Match],
    *,
    root: Path,
    paths_only: bool,
) -> None:
    if not results:
        print("No matches found.")
        return

    seen_paths: set[Path] = set()

    for match in results:
        display_path = relative_display(match.path, root)

        if paths_only:
            if match.path not in seen_paths:
                print(display_path)
                seen_paths.add(match.path)
            continue

        if match.kind == "content":
            print(f"[content]   {display_path}:{match.line_number}")
            if match.preview:
                print(f"            {match.preview}")
        elif match.kind == "extension":
            print(f"[extension] {display_path}")
        else:
            print(f"[filename]  {display_path}")


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        results, scanned, skipped = search(args)
    except (FileNotFoundError, NotADirectoryError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nSearch cancelled.", file=sys.stderr)
        return 130

    root = args.root.expanduser().resolve()
    print_results(results, root=root, paths_only=args.paths_only)

    unique_files = len({match.path for match in results})
    print(
        f"\nScanned {scanned:,} file(s); "
        f"found {len(results):,} match(es) in {unique_files:,} file(s)."
    )

    if skipped and (args.content or args.both or not any(
        (args.filename, args.extension, args.content, args.both)
    )):
        print(
            f"Skipped content in {skipped:,} file(s) "
            f"because they were binary, unreadable, or larger than {args.max_size:g} MB."
        )

    return 0 if results else 1


if __name__ == "__main__":
    raise SystemExit(main())
