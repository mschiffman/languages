"""Make the audio for a conversation page with ElevenLabs, then normalize it.

usage (from the LANGUAGES root):
    python -I .claude/skills/new-conversation/make_audio.py <conv#> [--first N] [--last N]
           [--chunks-only] [--renormalize] [--raw DIR]

Reads the page fr/everyday/conversations/conv##/conv##.html. Each line's audio
is NN.mp3 and its chunks are NN_k.mp3 (text from the .chunk spans; the full
line is the chunks joined). Odd lines are Leila, even lines Adrien. Files that
already exist in media/lessons/everyday/conv##/ are skipped.

Raw ElevenLabs downloads are kept in --raw (default: %TEMP%/elevenlabs-raw/conv##)
so --renormalize can redo the processing without spending credits.
"""
import argparse, html, json, os, re, subprocess, sys, tempfile, urllib.request, winreg

sys.stdout.reconfigure(encoding="utf-8")

LEILA, ADRIEN = "TqSzeWTTYMk8ynnHrHq5", "OrVRsyqKB4siJQenyBu5"
MODEL = "eleven_v4"
TARGET = -9.0  # LUFS, matches the existing conv41 files
# dynaudnorm lifts the volume where ElevenLabs drops off; output is 48 kHz stereo
BASE = "dynaudnorm=f=150:g=15:m=6,pan=stereo|c0=c0|c1=c0,aresample=48000"

ap = argparse.ArgumentParser()
ap.add_argument("conv", type=int)
ap.add_argument("--first", type=int, default=1)
ap.add_argument("--last", type=int, default=999)
ap.add_argument("--chunks-only", action="store_true")
ap.add_argument("--renormalize", action="store_true", help="overwrite outputs from the raw files")
ap.add_argument("--raw")
a = ap.parse_args()

page = f"fr/everyday/conversations/conv{a.conv}/conv{a.conv}.html"
media = f"media/lessons/everyday/conv{a.conv}"
raw = a.raw or os.path.join(tempfile.gettempdir(), "elevenlabs-raw", f"conv{a.conv}")
os.makedirs(media, exist_ok=True)
os.makedirs(raw, exist_ok=True)


def api_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
        return winreg.QueryValueEx(k, "ELEVENLABS_API_KEY")[0]


def tts(text, voice, dest):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        open(dest, "wb").write(r.read())


def lufs(src, chain):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", chain + ",ebur128",
                        "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def normalize(src, dest):
    # loudnorm misses the target on short clips, so measure and apply the gain directly
    gain = TARGET - lufs(src, BASE)
    for _ in range(3):  # the limiter shaves some loudness off; correct for it
        chain = f"{BASE},volume={gain:.2f}dB,alimiter=limit=0.891:level=false"
        got = lufs(src, chain)
        if abs(got - TARGET) < 0.3:
            break
        gain += TARGET - got
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", chain, "-b:a", "320k", dest], check=True)
    return got


src = open(page, encoding="utf-8").read()
lines = {}
for name, text in re.findall(r'class="chunk" data-audio="(\d+_\d+)\.mp3">(.*?)</span>', src, re.S):
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", "", text)).split())
    lines.setdefault(name.split("_")[0], []).append((name, text))

jobs = []
for nn, chunks in lines.items():
    if not a.first <= int(nn) <= a.last:
        continue
    if not a.chunks_only:
        jobs.append((nn, " ".join(t for _, t in chunks), int(nn)))
    jobs += [(name, text, int(nn)) for name, text in chunks]

for name, text, line in jobs:
    out = os.path.join(media, name + ".mp3")
    rawf = os.path.join(raw, name + ".mp3")
    if os.path.exists(out) and not (a.renormalize and os.path.exists(rawf)):
        continue
    voice = ADRIEN if line % 2 == 0 else LEILA
    if not os.path.exists(rawf):
        tts(text, voice, rawf)
    got = normalize(rawf, out)
    print(f"{name:7} {'Adrien' if voice == ADRIEN else 'Leila':6} {got:6.1f} LUFS  {text}")
print("raw files:", raw)
