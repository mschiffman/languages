"""Make the missing card audio for fr/expression/<page>.html with ElevenLabs v3 (Fr-Adrien).

    python -E fr/expression/make_audio.py apology clarify ...      (page names without .html)

For each card whose NN.mp3 is missing in media/lessons/expressions/<AUD_DIR folder>/:
  take 0, checked with local Whisper; if the transcript doesn't match, up to 4 more takes,
  keeping the closest. The chosen take is trimmed after the last spoken word (drops breaths
  after a pause), leveled to -16 LUFS, mono 44.1 kHz 192 kbps, like the other clips.
Raw takes are kept in %TEMP%/elevenlabs-raw/<folder>/NN_tK.mp3. Existing files are never touched.
Writes a report of cards whose best take still didn't match to %TEMP%/elevenlabs-raw/flagged.txt.
"""
import difflib, json, os, re, shutil, subprocess, sys, tempfile, urllib.error, urllib.request, winreg
import torch, whisper

sys.stdout.reconfigure(encoding="utf-8")
ROOT = "C:/Users/mschi/OneDrive/Desktop/LANGUAGES"
RAWROOT = os.path.join(tempfile.gettempdir(), "elevenlabs-raw")
VOICE, MODEL, TARGET = "OrVRsyqKB4siJQenyBu5", "eleven_v3", -16.0
model = whisper.load_model("small", device="cuda" if torch.cuda.is_available() else "cpu")
FP16 = torch.cuda.is_available()

with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
    KEY = winreg.QueryValueEx(k, "ELEVENLABS_API_KEY")[0]


def spoken(card):
    t = re.sub(r"\((?:e|ne|le|se|euse|ère|es)\)", "", card)   # désolé(e) -> désolé (male voice)
    t = re.sub(r"\s*\([^)]*\)", "", t)                          # c'est (de) ma faute -> c'est ma faute
    t = re.sub(r"^…\s*,?\s*", "", t)                            # "…, non ?" -> "non ?"
    t = re.sub(r"\s*,\s*…\s*$", "…", t)                         # "Au fait, …" -> "Au fait…"
    return " ".join(t.split())


def tts(text, dest):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                open(dest, "wb").write(r.read())
            return
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            if e.code in (429, 500, 502, 503) and attempt < 2:
                continue
            sys.exit(f"ElevenLabs refused ({e.code}): {body}")
        except OSError:
            if attempt == 2:
                raise


def hear(path):
    r = model.transcribe(path, language="fr", word_timestamps=True, fp16=FP16, condition_on_previous_text=False)
    words = [w for s in r["segments"] for w in s["words"] if re.search(r"\w", w["word"])]
    return r["text"].strip(), (words[-1]["end"] if words else None)


import unicodedata


def norm(s):
    """Words reduced to roughly how they sound: no accents, no silent endings (moment = moments,
    serre = sers, marchez = marché), so Whisper's homophone spellings still count as a match."""
    s = unicodedata.normalize("NFD", s.lower().replace("'", " ").replace("’", " "))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    out = []
    for w in re.sub(r"[^\w ]", " ", s).split():
        w = re.sub(r"(er|ez|ee?s?)$", "e", w)
        w = re.sub(r"(?<=.)[sxtdz]+$", "", w)
        out.append(w)
    return out
score = lambda heard, text: difflib.SequenceMatcher(None, norm(heard), norm(text)).ratio()


def ff(*args):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args], capture_output=True, text=True)


def lufs(src, chain):
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", ff("-i", src, "-af", chain + ",ebur128", "-f", "null", "-").stderr)[-1])


def cut_point(raw, end):
    if end is None:
        return None
    sil = [float(x) for x in re.findall(r"silence_start: ([\d.]+)",
                                        ff("-i", raw, "-af", "silencedetect=n=-45dB:d=0.15", "-f", "null", "-").stderr)]
    after = [s for s in sil if s >= end - 0.05]
    return after[0] + 0.12 if after else None


def finish(raw, dest, cut):
    trim = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08"
    if cut:
        trim += f",atrim=end={cut:.3f},afade=t=out:st={max(cut - 0.04, 0):.3f}:d=0.04"
    base = trim + ",aformat=channel_layouts=mono,aresample=44100"
    gain = TARGET - lufs(raw, base)
    for _ in range(3):
        chain = f"{base},volume={gain:.2f}dB,alimiter=limit=0.891:level=false"
        got = lufs(raw, chain)
        if abs(got - TARGET) < 0.3:
            break
        gain += TARGET - got
    tmp = dest + ".tmp.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", chain, "-ac", "1", "-b:a", "192k", tmp], check=True)
    os.replace(tmp, dest)
    return got


os.makedirs(RAWROOT, exist_ok=True)
flagged = open(os.path.join(RAWROOT, "flagged.txt"), "a", encoding="utf-8")
for page in sys.argv[1:]:
    h = open(f"{ROOT}/fr/expression/{page}.html", encoding="utf-8").read()
    folder = re.search(r'AUD_DIR = "[^"]*/Expressions/([^/"]+)/"', h).group(1)
    blk = re.search(r"const\s+categories\s*=\s*\[(.*?)\n\s*\];", h, re.S).group(1)
    cards = re.findall(r'^\s*\[\s*"([^"]*)"\s*,', blk, re.M)
    out_dir, raw_dir = f"{ROOT}/media/lessons/expressions/{folder}", os.path.join(RAWROOT, folder)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(raw_dir, exist_ok=True)
    made = 0
    for i, card in enumerate(cards, 1):
        dest = f"{out_dir}/{i:02d}.mp3"
        if os.path.exists(dest):
            continue
        text, best = spoken(card), None
        for k in range(5):
            take = os.path.join(raw_dir, f"{i:02d}_t{k}.mp3")
            if not os.path.exists(take):
                tts(text, take)
            heard, end = hear(take)
            s = score(heard, text)
            if not best or s > best[0]:
                best = (s, take, heard, end)
            if s >= 0.99:
                break
        s, take, heard, end = best
        shutil.copy(take, os.path.join(raw_dir, f"{i:02d}.mp3"))
        got = finish(take, dest, cut_point(take, end))
        made += 1
        mark = "" if s >= 0.99 else "   <<< check"
        print(f"{folder}/{i:02d}  {os.path.basename(take)[3:-4]:3} {s:.2f}  {got:5.1f} LUFS  {text!r} heard {heard!r}{mark}", flush=True)
        if mark:
            flagged.write(f"{folder}/{i:02d}  {s:.2f}  {text!r} heard {heard!r}\n")
            flagged.flush()
    print(f"== {page}: {made} made, folder {folder}", flush=True)
