"""Make the audio for a conversation page with ElevenLabs, then normalize it.

usage (from the LANGUAGES root):
    python -I .claude/skills/new-conversation/make_audio.py <conv#> [--first N] [--last N]
           [--chunks-only] [--renormalize] [--raw DIR]
           [--voices Leila,Adrien] [--line N=VOICE ...]

Reads the page fr/everyday/conversations/conv##/conv##.html. Each line's audio
is NN.mp3 and its chunks are NN_k.mp3 (text from the .chunk spans; the full
line is the chunks joined). The --voices take turns line by line (default:
odd lines Leila, even lines Adrien); --line sets the voice of a single line,
e.g. for a third speaker. Files that already exist in
media/lessons/everyday/conv##/ are skipped.

Raw ElevenLabs downloads are kept in --raw (default: %TEMP%/elevenlabs-raw/conv##)
so --renormalize can redo the processing without spending credits.
"""
import argparse, html, json, os, re, subprocess, sys, tempfile, urllib.request, winreg

sys.stdout.reconfigure(encoding="utf-8")

VOICES = {
    "Leila": "TqSzeWTTYMk8ynnHrHq5", "Adrien": "OrVRsyqKB4siJQenyBu5",
    "Melissa": "KzPZhE4ZluG6tjLsI1qh", "Sophie": "3YsdE1c1xyJow6Iy6jWB",
    "Caroline": "ajJK5BEm3mqUf8PILk4K", "Augustin": "KKoLMp5NIRsM4N2KnhO9",
}
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
ap.add_argument("--voices", default="Leila,Adrien",
                help="voices taking turns line by line, starting with line 1 (default Leila,Adrien)")
ap.add_argument("--line", action="append", default=[], metavar="N=VOICE",
                help="voice for one line, overriding --voices (repeatable), e.g. --line 7=Sophie")
a = ap.parse_args()
turns = a.voices.split(",")
overrides = {int(n): v for n, v in (x.split("=") for x in a.line)}
for v in turns + list(overrides.values()):
    if v not in VOICES:
        ap.error(f"unknown voice {v}; known: {', '.join(VOICES)}")


def voice_for(line):
    return overrides.get(line) or turns[(line - 1) % len(turns)]

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


FEMALE = {"Leila", "Melissa", "Sophie", "Caroline"}


def spoken(text, voice):
    # "épuisé(e)" on the page: say the form that fits the speaker
    text = re.sub(r"(\w)\((e|es)\)", lambda m: m.group(1) + (m.group(2) if voice in FEMALE else ""), text)
    # "orale / familière": don't read the slash out
    text = re.sub(r"(?<=\w)\s*/\s*(?=\w)", " ou ", text)
    # emojis (👉 ✅ 😅 ...) stay on the page but aren't spoken
    return " ".join(re.sub(r"[\U0001F000-\U0001FFFF☀-➿️]", "", text).split())


def tts(text, voice, dest):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            open(dest, "wb").write(r.read())
    except urllib.error.HTTPError as e:
        # e.g. quota_exceeded: the key's own credit limit, set in ElevenLabs > API keys
        sys.exit(f"ElevenLabs refused the request ({e.code}): {e.read().decode(errors='replace')}")


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


def chunk_spans(src):
    """(name, inner html) of each chunk span; chunks can contain tooltip spans."""
    for m in re.finditer(r'<span class="chunk" data-audio="(\d+_\d+)\.mp3">', src):
        depth, pos = 1, m.end()
        for t in re.finditer(r"<(/?)span\b[^>]*>", src[pos:]):
            depth += -1 if t.group(1) else 1
            if not depth:
                yield m.group(1), src[pos:pos + t.start()]
                break


src = open(page, encoding="utf-8").read()
lines = {}
for name, text in chunk_spans(src):
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
    voice = voice_for(line)
    if not os.path.exists(rawf):
        tts(spoken(text, voice), VOICES[voice], rawf)
    got = normalize(rawf, out)
    print(f"{name:7} {voice:8} {got:6.1f} LUFS  {text}")
print("raw files:", raw)
