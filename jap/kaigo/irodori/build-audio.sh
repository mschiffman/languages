#!/usr/bin/env bash
#
# build-audio.sh — turn a folder of ElevenLabs exports into a lesson sprite
#
#   ./build-audio.sh 01
#
# Reads:   audio/01/src/*.opus (or .mp3/.wav/.m4a)
# Writes:  audio/01/lesson.mp3
#          audio/01/sprite.json     (clip id -> start, duration)
#
# Source files are named by CLIP ID, matching lessons.js:
#
#   audio/01/src/001.mp3
#   audio/01/src/002.mp3
#   ...
#   audio/01/src/r04.mp3
#   audio/01/src/r06.mp3
#
# Each file is silence-trimmed and loudness-normalised before being
# concatenated, so clips sound level and start immediately on replay —
# ElevenLabs pads its output, and that padding both wastes bytes and
# makes repeated listening feel sluggish.
#
# Requires: ffmpeg, ffprobe, python3

set -euo pipefail

LESSON="${1:-}"
if [ -z "$LESSON" ]; then
  echo "usage: ./build-audio.sh <lesson-id>    e.g. ./build-audio.sh 01" >&2
  exit 1
fi

DIR="audio/$LESSON"
SRC="$DIR/src"
WORK="$DIR/.work"

[ -d "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

rm -rf "$WORK"
mkdir -p "$WORK"

# Gap between clips. Prevents the tail of one bleeding into the next
# when the player seeks, and gives a beat of air on replay.
GAP=0.25

# -------------------------------------------------------------------
# 1. Clean each clip
# -------------------------------------------------------------------

CLIPS=()

for file in "$SRC"/*.{opus,mp3,wav,m4a,OPUS,MP3,WAV,M4A}; do
  [ -e "$file" ] || continue

  id="$(basename "$file")"
  id="${id%.*}"

  ffmpeg -hide_banner -loglevel error -y -i "$file" \
    -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,\
areverse,\
silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,\
areverse,\
loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ar 48000 -ac 1 \
    "$WORK/$id.wav"

  CLIPS+=("$id")
done

if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "no source audio found in $SRC" >&2
  exit 1
fi

IFS=$'\n' CLIPS=($(sort <<<"${CLIPS[*]}")); unset IFS

# -------------------------------------------------------------------
# 2. Measure, and build the concat list with silence padding
# -------------------------------------------------------------------

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "anullsrc=r=48000:cl=mono" -t "$GAP" "$WORK/_gap.wav"

LIST="$WORK/concat.txt"
: > "$LIST"

MAP="$WORK/map.txt"
: > "$MAP"

cursor=0

for id in "${CLIPS[@]}"; do
  dur=$(ffprobe -v error -show_entries format=duration \
        -of default=noprint_wrappers=1:nokey=1 "$WORK/$id.wav")

  echo "file '$id.wav'"   >> "$LIST"
  echo "file '_gap.wav'"  >> "$LIST"

  echo "$id $cursor $dur" >> "$MAP"

  cursor=$(python3 -c "print($cursor + $dur + $GAP)")
done

# -------------------------------------------------------------------
# 3. Encode
# -------------------------------------------------------------------

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i "$LIST" \
  -c:a libmp3lame -b:a 64k -ac 1 \
  "$DIR/lesson.mp3"

# -------------------------------------------------------------------
# 4. Emit the timing map
# -------------------------------------------------------------------

python3 - "$MAP" "$DIR/sprite.json" <<'PY'
import json, sys

rows = open(sys.argv[1]).read().split("\n")
clips = {}

for row in rows:
    if not row.strip():
        continue
    clip_id, start, dur = row.split()
    clips[clip_id] = {
        "start": round(float(start), 3),
        "dur": round(float(dur), 3),
    }

with open(sys.argv[2], "w") as f:
    json.dump({"clips": clips}, f, indent=2)

print(f"{len(clips)} clips")
PY

rm -rf "$WORK"

echo
echo "  lesson.mp3   $(du -h "$DIR/lesson.mp3" | cut -f1)"
echo "  sprite.json  written"
echo
echo "Done. Commit $DIR and push."
