"""Make the audio for an English expression flashcard page, level it, upload it to R2.

usage (from the LANGUAGES root):
    python -E eng/expressions/make_audio.py <topic>                make the missing clips
    python -E eng/expressions/make_audio.py <topic> --redo 6 12    new takes of 06.mp3 and 12.mp3
    python -E eng/expressions/make_audio.py <topic> --upload       send new/changed clips to R2

Reads eng/expressions/<topic>.html: the English phrase of every card becomes NN.mp3, in reading
order. Examples and Burmese are not voiced. A blank in a phrase ("Thanks for the ___.") is spoken
as a trailing "Thanks for the...".

Files: media/eng/expressions/<folder>/NN.mp3, raw ElevenLabs takes in
media/elevenlabs-raw/eng_<folder>/NN.mp3. <folder> is the last part of the page's AUD_DIR.
New clips are checked with local Whisper ("small"); mismatches are marked <<< check.

--upload compares by MD5, sends what differs to the R2 bucket "languages" under
eng/expressions/<folder>/, and only then writes a new ?v= tag into the page's AUD_EXT (Cloudflare
caches each URL, query string included). It finishes by fetching every clip through the CDN with
the new tag and comparing it with the local file.

Voice British Modern RP-Woman, model eleven_v4, 48 kHz stereo 320 kbps, -12 LUFS.

Needs ELEVENLABS_API_KEY, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID (User env vars),
ffmpeg, whisper, curl, and for --upload boto3 + truststore. Run with -E, not -I: -I hides the user
site-packages where boto3 is installed.
"""
import argparse, datetime, hashlib, json, os, re, subprocess, sys, tempfile, urllib.error, urllib.request, winreg
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")

VOICE = "MOAe6Ugu3k7GT4qGvdi6"  # British Modern RP-Woman
MODEL = "eleven_v4"
TARGET = -12.0  # LUFS
BASE = "pan=stereo|c0=c0|c1=c0,aresample=48000"
BUCKET = "languages"

ap = argparse.ArgumentParser()
ap.add_argument("topic", help="eng/expressions/<topic>.html, without .html")
ap.add_argument("--redo", type=int, nargs="+", default=[], metavar="N", help="make new takes of these clips")
ap.add_argument("--upload", action="store_true", help="upload new/changed clips to R2, then set a new ?v= tag")
a = ap.parse_args()


def env(k):
    if os.environ.get(k):
        return os.environ[k].strip()
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, k)[0].strip()


page = f"eng/expressions/{a.topic}.html"
src = open(page, encoding="utf-8", newline="").read()
aud_dir = re.search(r'const AUD_DIR = "([^"]+)"', src).group(1)
folder = aud_dir.rstrip("/").rsplit("/", 1)[-1]
# A card starts its own line: ["English", "Burmese", "note",
cards = re.findall(r'^\s+\["([^"]*)",', src, re.M)
if not cards:
    sys.exit(f"no cards found in {page}")
media = f"media/eng/expressions/{folder}"
raw = f"media/elevenlabs-raw/eng_{folder}"
os.makedirs(media, exist_ok=True)
os.makedirs(raw, exist_ok=True)


# Cards whose text the voice can't read as written (Burmese script in an English phrase).
SAY = {"How do you say လ in English?": "How do you say la in English?"}


def spoken(text):
    text = re.sub(r"<[^>]+>", "", text)  # <span class=gray> is only for the page
    return SAY.get(text, text).replace("___.", "...").replace("___", "...")


def tts(text, dest):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": env("ELEVENLABS_API_KEY"), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            open(dest, "wb").write(r.read())
    except urllib.error.HTTPError as e:
        # e.g. quota_exceeded: the key's own credit limit, set in ElevenLabs > API keys
        sys.exit(f"ElevenLabs refused the request ({e.code}): {e.read().decode(errors='replace')}")


def lufs(path, chain):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", chain + ",ebur128",
                        "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def normalize(path, dest):
    # loudnorm misses the target on short clips, so measure and apply the gain directly
    gain = TARGET - lufs(path, BASE)
    for _ in range(3):  # the limiter shaves some loudness off; correct for it
        chain = f"{BASE},volume={gain:.2f}dB,alimiter=limit=0.891:level=false"
        got = lufs(path, chain)
        if abs(got - TARGET) < 0.3:
            break
        gain += TARGET - got
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af", chain, "-b:a", "320k", dest], check=True)
    return got


def make(i):
    n = i + 1
    out = f"{media}/{n:02d}.mp3"
    if os.path.exists(out) and n not in a.redo:
        return None
    rawf = f"{raw}/{n:02d}.mp3"
    tts(spoken(cards[i]), rawf)
    return n, normalize(rawf, out)


def letters(s):
    return re.sub(r"[^a-z]", "", re.sub(r"\bok\b", "okay", s.lower()))  # Whisper writes OK as okay


with ThreadPoolExecutor(4) as pool:
    made = [m for m in pool.map(make, range(len(cards))) if m]

if made:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["whisper", *[f"{media}/{n:02d}.mp3" for n, _ in made], "--model", "small", "--language", "en",
                        "--output_format", "txt", "--output_dir", tmp, "--verbose", "False", "--fp16", "False"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        for n, level in made:
            heard = open(f"{tmp}/{n:02d}.txt", encoding="utf-8").read().strip()
            flag = "" if letters(heard) == letters(spoken(cards[n - 1])) else "  <<< check"
            print(f"{n:02d}.mp3 {level:6.1f} LUFS  {spoken(cards[n - 1])}  | heard: {heard}{flag}")
print(f"{folder}: {len(cards)} cards, {len(made)} clips made, in {media}")

if a.upload:
    missing = [f"{n:02d}.mp3" for n in range(1, len(cards) + 1) if not os.path.exists(f"{media}/{n:02d}.mp3")]
    if missing:
        sys.exit(f"missing clips, not uploading: {missing}")
    import truststore
    truststore.inject_into_ssl()  # use the Windows certificate store
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    import boto3

    s3 = boto3.client("s3", endpoint_url=f"https://{env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
                      aws_access_key_id=env("R2_ACCESS_KEY_ID"), aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
                      region_name="auto")
    prefix = f"eng/expressions/{folder}/"
    md5 = lambda f: hashlib.md5(open(f"{media}/{f}", "rb").read()).hexdigest()
    names = [f"{n:02d}.mp3" for n in range(1, len(cards) + 1)]
    online = {}
    for pg in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
        online.update({o["Key"]: o["ETag"].strip('"') for o in pg.get("Contents", [])})
    todo = [f for f in names if online.get(prefix + f) != md5(f)]
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda f: s3.upload_file(f"{media}/{f}", BUCKET, prefix + f,
                                               ExtraArgs={"ContentType": "audio/mpeg"}), todo))
    print(f"R2 {prefix}: {len(online)} already online, {len(todo)} uploaded")

    if todo:
        tag = datetime.datetime.now().strftime("%y%m%d%H%M")
        src = re.sub(r'const AUD_EXT = "mp3\?v=[^"]*"', f'const AUD_EXT = "mp3?v={tag}"', src)
        open(page, "w", encoding="utf-8", newline="").write(src)
        print(f"AUD_EXT tag set to {tag}")
    ext = re.search(r'const AUD_EXT = "([^"]+)"', src).group(1)

    def same(f):
        got = subprocess.run(["curl", "-s", f"{aud_dir}{f[:-4]}.{ext}"], capture_output=True).stdout
        return hashlib.md5(got).hexdigest() == md5(f)

    with ThreadPoolExecutor(8) as pool:
        wrong = [f for f, ok in zip(names, pool.map(same, names)) if not ok]
    print(f"CDN check: {len(names) - len(wrong)}/{len(names)} match" + (f", DIFFERENT: {wrong}" if wrong else ""))
    if wrong:
        sys.exit("the CDN is serving different files: rerun with a new tag")
