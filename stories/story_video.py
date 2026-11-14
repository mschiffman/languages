"""Make a narrated video from a story page: pictures + narration, no text on screen.

usage (from the LANGUAGES root):
    python -E stories/story_video.py <page> [--pics DIR] [--out DIR] [--offline-only]

    python -E stories/story_video.py s2.6_newton

Reads stories/<page>.html and uses the page's own narration: the chunk clips NN.mp3
in media/<AUD_DIR path>/ (made by story_audio.py).
The video is for listening practice (after the story page and its quiz), so only the
title card has text; the sentences and their times go into the .srt, to use or not.
Pictures: N.png (or N.jpg) for each page's img number, from --pics (default: the folder in
G:\\My Drive\\_YOUTUBE whose name ends with the slug; without one, the website's JPGs).

Writes to --out (default <pics>/video):
  <slug>_en_youtube.mp4       1080p H.264, slow zoom on the pictures, for uploading
  <slug>_en_offline_av1.mp4   720p AV1 + Opus, still pictures, smallest
  <slug>_en_offline_h264.mp4  720p H.264 + AAC, still pictures, for old phones
  <slug>_en.srt               the sentences with their times (optional, for YouTube's CC)
("en" is the page's <html lang>.)

Needs ffmpeg and Playwright (Chromium reads the page's data and draws the title card).
"""
import argparse, glob, html, json, os, re, subprocess, sys, tempfile, urllib.parse
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

W, H, FPS = 1920, 1080, 30
LEAD, GAP, TAIL = 0.8, 0.45, 1.0   # silence before the first sentence, between sentences, after the last
XF = 0.6                           # cross-fade between pages (must be < LEAD and < TAIL)
TITLE_SECS = 3.5
ZOOM = 0.06                        # slow zoom over a page, alternating in and out
PICS_ROOT = r"G:\My Drive\_YOUTUBE"

ap = argparse.ArgumentParser()
ap.add_argument("page", help="stories/<page>.html, without .html")
ap.add_argument("--pics", help="folder with 1.png, 2.png ...")
ap.add_argument("--out", help="output folder (default <pics>/video)")
ap.add_argument("--offline-only", action="store_true", help="leave the YouTube copy as it is, remake the small copies")
ap.add_argument("--keep", action="store_true", help="keep the work folder (title card, page segments)")
a = ap.parse_args()

src = open(f"stories/{a.page}.html", encoding="utf-8").read()
lang = re.search(r'<html lang="(\w+)"', src).group(1)
title = html.unescape(re.search(r"<title>(.*?)</title>", src, re.S).group(1).strip())
aud_path = urllib.parse.urlparse(re.search(r'const AUD_DIR = "([^"]+)"', src).group(1)).path.strip("/")
slug = aud_path.rsplit("/", 1)[-1]
i0 = src.index("const pages")
pages_js = src[i0:src.index("</script>", i0)]

pics = a.pics
if not pics:
    hits = [d for d in glob.glob(os.path.join(PICS_ROOT, "*")) if os.path.isdir(d) and d.lower().endswith(slug.lower())]
    if len(hits) > 1:
        sys.exit(f"can't tell which folder in {PICS_ROOT} has the pictures for {slug}: {hits}. Use --pics.")
    if hits:
        pics = hits[0]
    else:
        pics = f"img/ytstory/{slug}"
        print(f"warning: no folder ending in {slug} in {PICS_ROOT}; using the website's smaller JPGs in {pics}", flush=True)
        a.out = a.out or os.path.join(PICS_ROOT, slug, "video")
out = a.out or os.path.join(pics, "video")
os.makedirs(out, exist_ok=True)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        sys.exit(f"ffmpeg failed:\n{' '.join(cmd[:6])} ...\n{r.stderr[-3000:]}")


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


CSS = """
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Andika:wght@400;700&display=swap');
html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
body { display: flex; justify-content: center; }
.title { position: absolute; top: 50%; transform: translateY(-50%); max-width: 1500px; padding: 40px 70px;
         background: rgba(255, 250, 238, .94); border-radius: 44px; box-shadow: 0 10px 34px rgba(0,0,0,.35);
         color: #2B2118; text-align: center; text-wrap: balance; }
.title .t1 { font: 600 84px/1.2 Fredoka, 'Segoe UI', sans-serif; }
"""

with tempfile.TemporaryDirectory(prefix="story_video_", ignore_cleanup_errors=True) as work, sync_playwright() as pw:
    if a.keep:
        work = os.path.join(out, "work")
        os.makedirs(work, exist_ok=True)
    browser = pw.chromium.launch()
    tab = browser.new_page(viewport={"width": W, "height": H})
    pages = tab.evaluate(f"(() => {{ {pages_js}; return pages; }})()")

    # ---- what is said on each page: (sentence, [audio files])
    units = [[(" ".join(c[0] for c in sent), [f"media/{aud_path}/{c[1]:02d}.mp3" for c in sent])
              for sent in p["sentences"]] for p in pages]
    missing = [f for us in units for _, fs in us for f in fs if not os.path.exists(f)]
    if missing:
        sys.exit(f"{len(missing)} audio clip(s) missing, e.g. {missing[0]}"
                 f"\nMake them first: python -E stories/story_audio.py {a.page}")

    def shot(body, dest):
        tab.set_content(f"<style>{CSS}</style>{body}", wait_until="load")
        try:
            tab.evaluate("Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))])")
        except Exception:
            pass
        # shrink the box to its longest line (balanced lines leave it wider than the text)
        tab.evaluate("""() => { const el = document.querySelector('.title'); const r = document.createRange();
            r.selectNodeContents(el); const xs = [...r.getClientRects()];
            const w = Math.max(...xs.map(x => x.right)) - Math.min(...xs.map(x => x.left));
            const cs = getComputedStyle(el);
            el.style.width = Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2) + 'px'; }""")
        tab.screenshot(path=dest, omit_background=True)

    # ---- title card, drawn over the first picture
    shot(f'<div class="title"><div class="t1">{html.escape(title)}</div></div>', os.path.join(work, "title.png"))

    # ---- lay out every page: what is on screen and heard, and when
    plan = []     # (picture, seconds, [(overlay png, on, off)] - none now, the video has no captions, [(audio file, start)])
    srt = []      # (start, end, text) on the final timeline
    t0 = TITLE_SECS - XF      # where the current page starts on the final timeline
    for pi, (p, us) in enumerate(zip(pages, units), 1):
        pic = next((f for f in (os.path.join(pics, f"{p['img']}.{e}") for e in ("png", "jpg")) if os.path.exists(f)), None)
        if not pic:
            sys.exit(f"no picture {p['img']}.png (or .jpg) in {pics}")
        t, caps, clips = LEAD, [], []
        for ui, (text, files) in enumerate(us):
            start = t
            for f in files:
                clips.append((f, t))
                t += dur(f)
            srt.append((t0 + start, t0 + t + GAP * 0.55, text))
            t += GAP
        secs = t - GAP + TAIL
        plan.append((pic, secs, caps, clips))
        print(f"page {pi}  {secs:5.1f}s  {len(us)} sentences", flush=True)
        t0 += secs - XF
    browser.close()
    total = TITLE_SECS + sum(p[1] for p in plan) - XF * len(plan)

    def picture(secs, zoom, zoom_in):
        """filter text: input 0 (a looped still) -> [bg], 1920x1080, with a slow zoom if asked"""
        if not zoom:
            return (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},"
                    f"fps={FPS},format=yuv420p[bg]")
        nfr = max(1, round(secs * FPS))
        z = f"1+{zoom}*on/{nfr}" if zoom_in else f"1+{zoom}-{zoom}*on/{nfr}"
        return (f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase:flags=lanczos,crop={W*2}:{H*2},"
                f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p[bg]")

    def render(zoom, dest, codec):
        """all segments, then joined with cross-fades into dest"""
        tag = "z" if zoom else "s"
        segs = []

        def encode_seg(inputs, filt, vlabel, alabel, secs):
            f = os.path.join(work, f"seg{tag}{len(segs):02d}.mkv")
            run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", filt, "-map", vlabel, "-map", alabel,
                 "-t", f"{secs:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "12",
                 "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", f])
            segs.append((f, secs))

        still = lambda f, secs: ["-loop", "1", "-framerate", str(FPS), "-t", f"{secs:.3f}", "-i", f]
        # the title, over the first picture (which starts its zoom only on page 1)
        encode_seg(still(plan[0][0], TITLE_SECS) + still(os.path.join(work, "title.png"), TITLE_SECS)
                   + ["-f", "lavfi", "-t", f"{TITLE_SECS}", "-i", "anullsrc=r=48000:cl=stereo"],
                   picture(TITLE_SECS, 0, True) + ";[bg][1:v]overlay=0:0[v]", "[v]", "2:a", TITLE_SECS)
        for pi, (pic, secs, caps, clips) in enumerate(plan, 1):
            inputs = still(pic, secs)
            for png, _, _ in caps:
                inputs += still(png, secs)
            for f, _ in clips:
                inputs += ["-i", f]
            filt, last = [picture(secs, zoom, pi % 2 == 1)], "[bg]"
            for ci, (_, on, off) in enumerate(caps, 1):
                filt.append(f"[{ci}:v]format=rgba,fade=in:st={on:.3f}:d=0.2:alpha=1,fade=out:st={off - 0.2:.3f}:d=0.2:alpha=1[c{ci}]")
                filt.append(f"{last}[c{ci}]overlay=0:0:enable='between(t,{on:.3f},{off:.3f})'[v{ci}]")
                last = f"[v{ci}]"
            k0 = 1 + len(caps)
            for ai, (_, start) in enumerate(clips):
                filt.append(f"[{k0 + ai}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                            f"adelay={round(start * 1000)}:all=1[a{ai}]")
            filt.append("".join(f"[a{ai}]" for ai in range(len(clips)))
                        + f"amix=inputs={len(clips)}:normalize=0:duration=longest,apad[a]")
            encode_seg(inputs, ";".join(filt), last, "[a]", secs)

        inputs, filt, v, au, off = [], [], "[0:v]", "[0:a]", 0.0
        for f, _ in segs:
            inputs += ["-i", f]
        for k in range(1, len(segs)):
            off += segs[k - 1][1] - XF
            filt.append(f"{v}[{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{k}]")
            filt.append(f"{au}[{k}:a]acrossfade=d={XF}:c1=tri:c2=tri[y{k}]")
            v, au = f"[x{k}]", f"[y{k}]"
        filt.append(f"{v}fade=out:st={total - 0.8:.3f}:d=0.8,format=yuv420p[v]")
        run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[v]", "-map", au,
             "-r", str(FPS), *codec, dest])

    name = os.path.join(out, f"{slug}_{lang}")
    master = name + "_youtube.mp4"
    if not a.offline_only:
      print("YouTube copy (slow zoom on the pictures) ...", flush=True)
      render(ZOOM, master, ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"])

    # ---- small copies for offline use: still pictures, because a zoom costs several times the space.
    # Nearly all the space goes to key frames (about 0.5 MB each for these detailed paintings),
    # so there is one only every 30 s; skipping lands on the nearest one.
    print("offline copies (still pictures) ...", flush=True)
    flat = os.path.join(work, "flat.mkv")
    render(0, flat, ["-c:v", "libx264", "-preset", "fast", "-crf", "10", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le"])
    av1, old = name + "_offline_av1.mp4", name + "_offline_h264.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", flat, "-vf", "scale=1280:720:flags=lanczos",
         "-c:v", "libsvtav1", "-preset", "4", "-crf", "38", "-g", "900", "-pix_fmt", "yuv420p10le",
         "-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-movflags", "+faststart", av1])
    run(["ffmpeg", "-v", "error", "-y", "-i", flat, "-vf", "scale=1280:720:flags=lanczos",
         "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-g", "900", "-pix_fmt", "yuv420p",
         "-profile:v", "high", "-level", "3.1", "-c:a", "aac", "-b:a", "64k", "-ac", "1",
         "-movflags", "+faststart", old])

    def stamp(x):
        ms = round(x * 1000)
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    with open(name + ".srt", "w", encoding="utf-8") as f:
        for i, (s, e, text) in enumerate(srt, 1):
            f.write(f"{i}\n{stamp(s)} --> {stamp(e)}\n{text}\n\n")

    print(f"\n{total / 60:.1f} min ({total:.0f}s)")
    for f in (master, av1, old):
        print(f"{os.path.getsize(f) / 1e6:7.1f} MB  {f}")
    print(f"             {name}.srt")
