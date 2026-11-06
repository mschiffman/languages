"""Check a story's clips with local Whisper: flag any whose transcript differs from the chunk text.

usage (from the LANGUAGES root):
    python -E stories/check_audio.py <page> [N ...]     all clips, or just these numbers

Prints "??" lines for clips to look at. Most are only spelling (Whisper writes
"Tinkerbell", "a lad in", "spider web"); a re-take is needed only when the
words themselves are wrong or garbled. Uses the cached "small" model on the GPU.
The language comes from the page's <html lang>; accents, punctuation and gender
notes in brackets, "l'arbre (m)", are ignored in the comparison.
"""
import sys, re, subprocess, unicodedata, urllib.parse
import whisper
sys.stdout.reconfigure(encoding="utf-8")
page = sys.argv[1]
only = {int(x) for x in sys.argv[2:]}
src = open(f"stories/{page}.html", encoding="utf-8").read()
lang = re.search(r'<html lang="(\w+)"', src).group(1)
aud_path = urllib.parse.urlparse(re.search(r'const AUD_DIR = "([^"]+)"', src).group(1)).path.strip("/")
body = src[src.index("const pages"):]
chunks = [(int(n), (a or b).replace("\\'", "'"))
          for a, b, n in re.findall(r"""\[\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*(\d+)\s*\]""", body)]


def norm(s):
    s = unicodedata.normalize("NFD", re.sub(r"\([^)]*\)", "", s).lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    # English joins "don't" into one word; French "l'arbre" is compared as "l arbre"
    s = s.replace("-", " ").replace("’", "'").replace("'", " " if lang == "fr" else "")
    return re.sub(r"[^a-z ]", "", s).split()


m = whisper.load_model("small")
bad = 0
for n, text in chunks:
    if only and n not in only:
        continue
    f = f"media/{aud_path}/{n:02d}.mp3"
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                             capture_output=True, text=True).stdout)
    heard = m.transcribe(f, language=lang, fp16=True)["text"].strip()
    ok = norm(heard) == norm(text)
    bad += not ok
    print(("   " if ok else "?? ") + f"{n:02d} {d:5.2f}s  {text}" + ("" if ok else f"   | heard: {heard}"))
print(bad, "to look at")
