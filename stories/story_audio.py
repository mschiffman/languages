"""Make the audio for a story page with ElevenLabs, level it, upload it to R2.

usage (from the LANGUAGES root):
    python -E stories/story_audio.py <page> [--redo N ...] [--renormalize] [--upload] [--dry-run]

    python -E stories/story_audio.py Aladdin_lamp              make what's missing
    python -E stories/story_audio.py Aladdin_lamp --redo 12 30  new takes of 12.mp3 and 30.mp3
    python -E stories/story_audio.py Aladdin_lamp --upload      then send it to R2

Reads stories/<page>.html: every chunk ["text", N] in `pages` becomes NN.mp3,
the folder name is the last part of the page's AUD_DIR (…/eng/yt/<slug>/).
Files go to media/eng/yt/<slug>/ (existing ones are skipped); the raw
ElevenLabs downloads are kept in %TEMP%/elevenlabs-raw/<slug> so --renormalize
redoes the leveling without spending credits. --upload sends new/changed files
to the R2 bucket "languages" under eng/yt/<slug>/ (compared by MD5).

Voice: British Modern RP-Woman, model eleven_v4. Output matches the older story
clips: 48 kHz stereo 320 kbps, about -12 LUFS.

Needs ELEVENLABS_API_KEY, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID
(User env vars), ffmpeg, and for --upload boto3 + truststore. Run with -E, not
-I: -I hides the user site-packages where boto3 is installed.
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, urllib.request, winreg
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")

VOICE = "MOAe6Ugu3k7GT4qGvdi6"  # British Modern RP-Woman
MODEL = "eleven_v4"
TARGET = -12.0  # LUFS; the older story clips are -11 to -14
BASE = "pan=stereo|c0=c0|c1=c0,aresample=48000"
BUCKET = "languages"

ap = argparse.ArgumentParser()
ap.add_argument("page", help="stories/<page>.html, without .html")
ap.add_argument("--redo", type=int, nargs="+", default=[], metavar="N", help="make new takes of these clips")
ap.add_argument("--renormalize", action="store_true", help="redo the leveling from the raw files")
ap.add_argument("--upload", action="store_true", help="upload new/changed clips to R2")
ap.add_argument("--dry-run", action="store_true", help="with --upload: only report")
a = ap.parse_args()


def env(k):
    if os.environ.get(k):
        return os.environ[k].strip()
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, k)[0].strip()


src = open(f"stories/{a.page}.html", encoding="utf-8").read()
slug = re.search(r'const AUD_DIR = "([^"]+)"', src).group(1).rstrip("/").rsplit("/", 1)[-1]
body = src[src.index("const pages"):]
# ["text", 12] or ['"Quoted," text', 12]
chunks = [(int(n), (t1 or t2).replace("\\'", "'").replace('\\"', '"'))
          for t1, t2, n in re.findall(r"""\[\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*(\d+)\s*\]""", body)]
nums = [n for n, _ in chunks]
if nums != list(range(1, len(nums) + 1)):
    sys.exit(f"chunk numbers aren't 1..{len(nums)} in order: {nums}")

media = f"media/eng/yt/{slug}"
raw = os.path.join(tempfile.gettempdir(), "elevenlabs-raw", slug)
os.makedirs(media, exist_ok=True)
os.makedirs(raw, exist_ok=True)


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


def make(n, text):
    name = f"{n:02d}.mp3"
    out, rawf = os.path.join(media, name), os.path.join(raw, name)
    redo = n in a.redo
    if os.path.exists(out) and not redo and not (a.renormalize and os.path.exists(rawf)):
        return None
    if redo or not os.path.exists(rawf):
        # quotation marks are for the reader; the voice doesn't need them
        tts(" ".join(text.replace('"', "").split()), rawf)
    return f"{name}  {normalize(rawf, out):6.1f} LUFS  {text}"


with ThreadPoolExecutor(4) as pool:
    for line in pool.map(lambda c: make(*c), chunks):
        if line:
            print(line)
print(f"{slug}: {len(chunks)} chunks in {media}")

if a.upload:
    import truststore
    truststore.inject_into_ssl()  # use the Windows certificate store
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    import boto3

    s3 = boto3.client("s3", endpoint_url=f"https://{env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
                      aws_access_key_id=env("R2_ACCESS_KEY_ID"), aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
                      region_name="auto")
    prefix = f"eng/yt/{slug}/"
    online = {}
    for pg in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
        online.update({o["Key"]: o["ETag"].strip('"') for o in pg.get("Contents", [])})
    todo = [f"{n:02d}.mp3" for n in nums
            if online.get(prefix + f"{n:02d}.mp3")
            != hashlib.md5(open(os.path.join(media, f"{n:02d}.mp3"), "rb").read()).hexdigest()]
    print(f"R2 {prefix}: {len(todo)} to upload" + (f" ({', '.join(todo[:10])}{' ...' if len(todo) > 10 else ''})" if todo else ""))
    if todo and not a.dry_run:
        def put(f):
            s3.upload_file(os.path.join(media, f), BUCKET, prefix + f, ExtraArgs={"ContentType": "audio/mpeg"})
        with ThreadPoolExecutor(8) as pool:
            list(pool.map(put, todo))
        print(f"  uploaded {len(todo)}")
