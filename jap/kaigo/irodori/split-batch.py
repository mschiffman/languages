#!/usr/bin/env python3
"""
split-batch.py — one batch export → correctly named clip files

    python3 split-batch.py 01 ~/Downloads/lesson01-batch.mp3

Generate all of a lesson's phrases in ONE ElevenLabs request, separated by
clear pauses. This finds the pauses, cuts at them, and names each piece
using the clip ids in lessons.js, in order. Then run build-audio.sh as
usual.

    python3 split-batch.py 01 batch.mp3
    ./build-audio.sh 01
    python3 verify.py

The naming is the point. Eighteen clips split by ear and renamed by hand is
where a lesson silently goes wrong — one file off by a position and every
card after it is mislabelled, with nothing to show you.

    --min-silence   pause length that separates phrases (default 0.9s)
    --threshold     what counts as silence (default -40dB)
    --dry-run       report the split without writing anything
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def need(tool):
    if shutil.which(tool):
        return
    print(f"\n{tool} not found on PATH.\n")
    print("Windows:  winget install Gyan.FFmpeg")
    print("          then close and reopen PowerShell")
    print("macOS:    brew install ffmpeg")
    print("Linux:    sudo apt install ffmpeg\n")
    sys.exit(1)


def clip_order(lesson_id):
    """Unique clip ids, in order of first appearance in lessons.js."""
    text = open(os.path.join(ROOT, "lessons.js"), encoding="utf-8").read()

    # Narrow to the requested lesson's block.
    start = text.find('id: "%s"' % lesson_id)
    if start == -1:
        sys.exit("lesson '%s' not found in lessons.js" % lesson_id)

    nxt = text.find('\n    id: "', start + 1)
    block = text[start:nxt if nxt != -1 else len(text)]

    seen, order = set(), []
    for cid in re.findall(r'clip:\s*"([^"]+)"', block):
        if cid not in seen:
            seen.add(cid)
            order.append(cid)
    return order


def clip_texts(lesson_id):
    """clip id -> the Japanese line it was cut for."""
    text = open(os.path.join(ROOT, "lessons.js"), encoding="utf-8").read()

    start = text.find('id: "%s"' % lesson_id)
    nxt = text.find('\n    id: "', start + 1)
    block = text[start:nxt if nxt != -1 else len(text)]

    out = {}
    for m in re.finditer(
            r'clip:\s*"([^"]+)".*?japanese:\s*"([^"]*)"', block, re.S):
        out.setdefault(m.group(1), m.group(2))
    return out


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def find_silences(path, threshold, min_silence):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path,
         "-af", "silencedetect=noise=%ddB:d=%s" % (threshold, min_silence),
         "-f", "null", "-"],
        capture_output=True, text=True)

    log = out.stderr
    starts = [float(m) for m in re.findall(r"silence_start:\s*(-?[\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*(-?[\d.]+)", log)]
    return starts, ends


def segments_from_silences(starts, ends, total):
    """Speech runs are the gaps between detected silences."""
    segs, cursor = [], 0.0

    for i, s in enumerate(starts):
        if s > cursor + 0.05:
            segs.append((cursor, s))
        cursor = ends[i] if i < len(ends) else total

    if total - cursor > 0.05:
        segs.append((cursor, total))

    return segs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lesson")
    ap.add_argument("batch")
    ap.add_argument("--min-silence", type=float, default=0.9)
    ap.add_argument("--threshold", type=int, default=-40)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    need("ffmpeg")
    need("ffprobe")

    # PowerShell does not expand ~ in a bare argument, so it arrives literal.
    batch = os.path.expanduser(args.batch)

    if not os.path.exists(batch):
        sys.exit("no such file: %s" % batch)

    args.batch = batch

    expected = clip_order(args.lesson)
    total = duration(args.batch)

    starts, ends = find_silences(args.batch, args.threshold, args.min_silence)
    segs = segments_from_silences(starts, ends, total)

    print("batch length     : %.2fs" % total)
    print("pauses found     : %d" % len(starts))
    print("phrases detected : %d" % len(segs))
    print("clips expected   : %d" % len(expected))
    print()

    if len(segs) != len(expected):
        print("MISMATCH — nothing written.\n")
        print("Detected segments:")
        for i, (a, b) in enumerate(segs, 1):
            print("  %2d  %6.2fs → %6.2fs  (%.2fs)" % (i, a, b, b - a))
        print("\nExpected clips:")
        print("  " + "  ".join(expected))
        print()

        if len(segs) > len(expected):
            print("Too many segments. A phrase with an internal pause was")
            print("probably split in two — Japanese sentence breaks (。) do")
            print("this. Raise --min-silence toward your inter-phrase pause:")
            print("    python3 split-batch.py %s %s --min-silence 1.3"
                  % (args.lesson, args.batch))
        else:
            print("Too few segments. Pauses may be shorter than expected, or")
            print("quiet enough to miss. Try:")
            print("    python3 split-batch.py %s %s --min-silence 0.6 --threshold -45"
                  % (args.lesson, args.batch))

        print("\nAdd --dry-run to re-check without writing.")
        return 1

    if args.dry_run:
        print("Would write:")
        for cid, (a, b) in zip(expected, segs):
            print("  %-6s %6.2fs → %6.2fs  (%.2fs)" % (cid, a, b, b - a))
        return 0

    src = os.path.join(ROOT, "audio", args.lesson, "src")
    os.makedirs(src, exist_ok=True)

    for cid, (a, b) in zip(expected, segs):
        # Small margin either side; build-audio.sh trims precisely later.
        a = max(0.0, a - 0.08)
        b = min(total, b + 0.08)

        out = os.path.join(src, "%s.opus" % cid)
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-ss", "%.3f" % a, "-to", "%.3f" % b, "-i", args.batch,
             "-ac", "1", "-ar", "48000", "-c:a", "libopus",
             "-b:a", "48k", "-application", "audio", out],
            check=True)

        print("  %-6s %6.2fs  (%.2fs)" % (cid, a, b - a))

    # Record what each clip was cut for. With sequential ids a number is an
    # identity, not a position — but nothing in the filename enforces that.
    # If lessons.js is later reordered or renumbered without regenerating
    # audio, every file stays valid while its meaning shifts. This is what
    # lets verify.py catch that.
    texts = clip_texts(args.lesson)
    manifest = {
        "lesson": args.lesson,
        "clips": {cid: texts.get(cid, "") for cid in expected},
    }
    with open(os.path.join(ROOT, "audio", args.lesson, "manifest.json"),
              "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n%d clips written to %s" % (len(expected), src))
    print("\nListen through them, then:")
    print("    ./build-audio.sh %s" % args.lesson)
    print("    python3 verify.py")
    return 0


if __name__ == "__main__":
    # Piping to head/less closes stdout early; don't die mid-write.
    try:
        sys.exit(main())
    except BrokenPipeError:
        try:
            sys.stdout.close()
        finally:
            os._exit(0)
