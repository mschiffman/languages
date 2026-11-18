"""Make the ElevenLabs audio for the English word lessons (eng/adjectives, adverbs, verbs, pronouns, prepositions).

usage (from the LANGUAGES root):
    python -E eng/lesson_audio.py                          make every missing clip of every lesson
    python -E eng/lesson_audio.py verbs_3 adjectives_9     only these lessons
    python -E eng/lesson_audio.py verbs_11 --redo 9 10     new takes of 09.mp3 and 10.mp3

The text comes from eng/<type>/<type>_audio.txt ("=== verbs_3 (16 clips) ===" then "01 Stand." lines),
in the page's clip numbering. Clips go to media/eng/yt/<folder>/NN.mp3, raw takes to
media/elevenlabs-raw/eng_<folder>/NN.mp3; <folder> is the last part of the page's AUD_DIR.
New clips are checked with local Whisper ("small", 1 s of silence padded each side so single words
are heard); mismatches are marked <<< check.

Voice British Modern RP-Woman, model eleven_v4, 48 kHz stereo 320 kbps, -12 LUFS (as eng/expressions).
Uploading to R2 is not done here.
"""
import argparse, glob, json, os, re, subprocess, sys, tempfile, urllib.error, urllib.request, winreg
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")

VOICE = "MOAe6Ugu3k7GT4qGvdi6"  # British Modern RP-Woman
MODEL = "eleven_v4"
TARGET = -12.0
BASE = "pan=stereo|c0=c0|c1=c0,aresample=48000"
# what the voice is given when the written text would be read wrong
SAY = {("verbs_11", 9): "Red."}  # past tense of read, said "red"

ap = argparse.ArgumentParser()
ap.add_argument("lessons", nargs="*", help="e.g. verbs_3 (default: all)")
ap.add_argument("--redo", type=int, nargs="+", default=[], metavar="N")
a = ap.parse_args()


def env(k):
    if os.environ.get(k):
        return os.environ[k].strip()
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, k)[0].strip()


KEY = env("ELEVENLABS_API_KEY")

jobs = []  # (lesson, n, text, out, raw)
for txt in sorted(glob.glob("eng/*/*_audio.txt")):
    kind = os.path.dirname(txt)
    lesson = None
    for line in open(txt, encoding="utf-8"):
        m = re.match(r"=== (\w+) \((\d+) clips\) ===", line)
        if m:
            lesson = m.group(1)
            src = open(f"{kind}/{lesson}.html", encoding="utf-8").read()
            folder = re.search(r'const AUD_DIR = "([^"]+)"', src).group(1).rstrip("/").rsplit("/", 1)[-1]
            continue
        m = re.match(r"(\d{2}) (.+)", line.strip())
        if m and lesson and (not a.lessons or lesson in a.lessons):
            n = int(m.group(1))
            jobs.append((lesson, n, m.group(2), f"media/eng/yt/{folder}/{n:02d}.mp3",
                         f"media/elevenlabs-raw/eng_{folder}/{n:02d}.mp3"))


def tts(text, dest):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                open(dest, "wb").write(r.read())
            return
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code != 429 and e.code < 500:
                sys.exit(f"ElevenLabs refused the request ({e.code}): {msg}")
        except urllib.error.URLError:
            pass
    sys.exit(f"ElevenLabs failed three times on: {text}")


def lufs(path, chain):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", chain + ",ebur128",
                        "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def normalize(path, dest):
    gain = TARGET - lufs(path, BASE)
    for _ in range(3):
        chain = f"{BASE},volume={gain:.2f}dB,alimiter=limit=0.891:level=false"
        got = lufs(path, chain)
        if abs(got - TARGET) < 0.3:
            break
        gain += TARGET - got
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af", chain, "-b:a", "320k", dest], check=True)
    return got


def make(job):
    lesson, n, text, out, raw = job
    if os.path.exists(out) and not (a.redo and n in a.redo):
        return None
    os.makedirs(os.path.dirname(out), exist_ok=True)
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    tts(SAY.get((lesson, n), text), raw)
    return job, normalize(raw, out)


def letters(s):
    return re.sub(r"[^a-z]", "", s.lower().replace("can not", "cannot"))


with ThreadPoolExecutor(4) as pool:
    made = [m for m in pool.map(make, jobs) if m]

if made:
    with tempfile.TemporaryDirectory() as tmp:
        padded = []
        for k, ((lesson, n, text, out, raw), _) in enumerate(made):
            p = f"{tmp}/{k:04d}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-af", "adelay=1000:all=1,apad=pad_dur=1",
                            "-ar", "16000", "-ac", "1", p], check=True)
            padded.append(p)
        subprocess.run(["whisper", *padded, "--model", "small", "--language", "en", "--output_format", "txt",
                        "--output_dir", tmp, "--verbose", "False", "--fp16", "False"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        for k, ((lesson, n, text, out, raw), level) in enumerate(made):
            heard = open(f"{tmp}/{k:04d}.txt", encoding="utf-8").read().strip()
            flag = "" if letters(heard) == letters(SAY.get((lesson, n), text)) else "  <<< check"
            print(f"{lesson} {n:02d} {level:6.1f} LUFS  {text}  | heard: {heard}{flag}")
print(f"{len(jobs)} clips listed, {len(made)} made")
