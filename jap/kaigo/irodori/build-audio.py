#!/usr/bin/env python3
"""
build-audio.py — clip files → lesson sprite + timing map

    py build-audio.py 01          (Windows)
    python3 build-audio.py 01     (macOS / Linux)

Same job as build-audio.sh, without needing bash. Use whichever suits your
machine; they produce identical output.

Reads:   audio/01/src/*.opus|mp3|wav|m4a
Writes:  audio/01/lesson.mp3
         audio/01/sprite.json      clip id -> start, duration

Each clip is silence-trimmed and loudness-normalised before concatenation,
so clips sound level and start immediately on replay.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))

GAP = 0.25          # silence between clips in the sprite
MP3_BITRATE = "64k"

CLEAN = (
    "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
    "areverse,"
    "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
    "areverse,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)


def need(tool):
    if shutil.which(tool):
        return
    print(f"\n{tool} not found on PATH.\n")
    print("Windows:  winget install Gyan.FFmpeg")
    print("          then close and reopen PowerShell")
    print("macOS:    brew install ffmpeg")
    print("Linux:    sudo apt install ffmpeg\n")
    sys.exit(1)


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main():
    if len(sys.argv) < 2:
        print("usage: py build-audio.py <lesson-id>    e.g. py build-audio.py 01")
        return 1

    need("ffmpeg")
    need("ffprobe")

    lesson = sys.argv[1]
    out_dir = os.path.join(ROOT, "audio", lesson)
    src_dir = os.path.join(out_dir, "src")

    if not os.path.isdir(src_dir):
        print(f"missing {src_dir}")
        print("Run split-batch.py first, or put named clip files there.")
        return 1

    clips = sorted(
        os.path.splitext(f)[0]
        for f in os.listdir(src_dir)
        if os.path.splitext(f)[1].lower() in (".opus", ".mp3", ".wav", ".m4a")
    )

    if not clips:
        print(f"no audio files in {src_dir}")
        return 1

    work = tempfile.mkdtemp(prefix="kaigo-")

    try:
        # ---- clean each clip -------------------------------------------
        for cid in clips:
            source = next(
                os.path.join(src_dir, f)
                for f in os.listdir(src_dir)
                if os.path.splitext(f)[0] == cid
            )
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-i", source, "-af", CLEAN, "-ar", "48000", "-ac", "1",
                 os.path.join(work, cid + ".wav")],
                check=True)

        # ---- gap --------------------------------------------------------
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
             "-t", str(GAP), os.path.join(work, "_gap.wav")],
            check=True)

        # ---- measure and build the concat list --------------------------
        lines, sprite, cursor = [], {}, 0.0

        for cid in clips:
            dur = duration(os.path.join(work, cid + ".wav"))

            lines.append(f"file '{cid}.wav'")
            lines.append("file '_gap.wav'")

            sprite[cid] = {"start": round(cursor, 3), "dur": round(dur, 3)}
            cursor += dur + GAP

        list_path = os.path.join(work, "concat.txt")
        with open(list_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        # ---- encode -----------------------------------------------------
        # cwd=work so the concat list can use bare filenames, which avoids
        # Windows backslash escaping inside the demuxer list.
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-f", "concat", "-safe", "0", "-i", "concat.txt",
             "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, "-ac", "1",
             os.path.join(out_dir, "lesson.mp3")],
            cwd=work, check=True)

        with open(os.path.join(out_dir, "sprite.json"), "w",
                  encoding="utf-8") as f:
            json.dump({"clips": sprite}, f, indent=2)

    finally:
        shutil.rmtree(work, ignore_errors=True)

    kb = os.path.getsize(os.path.join(out_dir, "lesson.mp3")) / 1024
    print(f"  lesson.mp3   {kb:6.0f} KB")

    print(f"  sprite.json  {len(sprite)} clips")
    print("\nNow run:  py verify.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
