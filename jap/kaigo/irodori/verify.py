#!/usr/bin/env python3
"""
verify.py — check lessons.js against the generated audio before you push.

    python3 verify.py

The failure this exists to catch: SKILL.md writes a clip id that has no
matching source file, so one card is silently mute. That is invisible in
testing unless you happen to tap that exact card, and invisible to you
entirely once it is on a learner's phone.

Also flags recorded audio that nothing references, which usually means a
clip id was renamed on one side only.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

problems = []
notes = []


def read_lessons():
    path = os.path.join(ROOT, "lessons.js")
    if not os.path.exists(path):
        problems.append("lessons.js not found")
        return "", []

    text = open(path, encoding="utf-8").read()

    lessons = []
    for block in re.finditer(r'id:\s*"([^"]+)"', text):
        lessons.append(block.group(1))

    # Lesson ids are the ids that have a matching audio directory pattern;
    # clip ids appear as `clip: "..."`.
    return text, lessons


def lesson_block(lesson_id, text):
    """Return only one lesson object so clip ids never cross lessons."""
    start = text.find('id: "%s"' % lesson_id)
    if start == -1:
        return ""

    nxt = text.find('\n    id: "', start + 1)
    return text[start:nxt if nxt != -1 else len(text)]


def check_drift(lesson_id, text):
    """
    The failure sequential ids invite: a clip number is an identity, but
    nothing in the filename enforces that. Insert a phrase in the middle,
    renumber, and every file remains valid while its meaning shifts one
    place — lessons.js then points at the wrong audio on every card after
    the insertion, with nothing visible to show it.

    manifest.json records the Japanese line each clip was cut for. If that
    no longer matches lessons.js, the audio needs regenerating.
    """
    path = os.path.join(ROOT, "audio", lesson_id, "manifest.json")

    if not os.path.exists(path):
        notes.append(
            f"{lesson_id}: no manifest.json — drift can't be checked "
            "(only written by split-batch.py)"
        )
        return

    recorded = json.load(open(path, encoding="utf-8")).get("clips", {})

    block = lesson_block(lesson_id, text)

    current = {}
    for m in re.finditer(
            r'clip:\s*"([^"]+)".*?japanese:\s*"([^"]*)"', block, re.S):
        current.setdefault(m.group(1), m.group(2))

    for cid, was in recorded.items():
        now = current.get(cid)
        if now is None:
            notes.append(f"{lesson_id}: clip '{cid}' recorded but gone from lessons.js")
        elif now != was:
            problems.append(
                f"{lesson_id}: clip '{cid}' DRIFTED — audio was cut for "
                f"'{was}' but lessons.js now says '{now}'. Regenerate audio."
            )


def main():
    text, ids = read_lessons()
    if not text:
        print("FAIL: could not read lessons.js")
        return 1

    if not ids:
        problems.append("no clip references found in lessons.js")

    total_refs = 0
    checked_lessons = 0

    for lesson_id in ids:
        refs = re.findall(r'clip:\s*"([^"]+)"', lesson_block(lesson_id, text))
        total_refs += len(set(refs))

        if not refs:
            problems.append(f"{lesson_id}: no clip references found")
            continue

        audio_dir = os.path.join(ROOT, "audio", lesson_id)
        if not os.path.isdir(audio_dir):
            notes.append(
                f"{lesson_id}: audio not generated yet — add batch audio later"
            )
            continue

        checked_lessons += 1
        sprite_path = os.path.join(ROOT, "audio", lesson_id, "sprite.json")

        if not os.path.exists(sprite_path):
            problems.append(f"{lesson_id}: sprite.json missing — run build-audio.sh")
            continue

        clips = json.load(open(sprite_path, encoding="utf-8"))
        clips = clips.get("clips", clips)

        missing = sorted({r for r in refs if r not in clips})
        unused = sorted({c for c in clips if c not in refs})

        for m in missing:
            problems.append(f"{lesson_id}: clip '{m}' referenced but has no audio")

        for u in unused:
            notes.append(f"{lesson_id}: clip '{u}' recorded but never used")

        for name, t in clips.items():
            if t.get("dur", 0) < 0.25:
                problems.append(
                    f"{lesson_id}: clip '{name}' is only {t['dur']}s — "
                    "silence trimming may have eaten it"
                )
            if t.get("dur", 0) > 12:
                notes.append(
                    f"{lesson_id}: clip '{name}' is {t['dur']}s — unusually long"
                )

        f = os.path.join(ROOT, "audio", lesson_id, "lesson.mp3")
        if not os.path.exists(f):
            problems.append(f"{lesson_id}: lesson.mp3 missing")
        else:
            kb = os.path.getsize(f) / 1024
            print(f"  {lesson_id}/lesson.mp3: {kb:.0f} KB")

        check_drift(lesson_id, text)

    print()

    for n in notes:
        print(f"  note: {n}")

    if problems:
        print()
        for p in problems:
            print(f"  FAIL: {p}")
        print(f"\n{len(problems)} problem(s). Do not push.")
        return 1

    print(
        f"\nOK — {total_refs} clip references across {len(ids)} lessons; "
        f"{checked_lessons} audio package(s) checked."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
