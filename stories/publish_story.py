"""Publish a finished story page: upload, check, offline copy, Google Drive, commit, push, live check.

usage (from the LANGUAGES root):
    python -E stories/publish_story.py <page>              asks for a typed yes, then does everything
    python -E stories/publish_story.py <page> --dry-run    only the local checks and what would happen
    python -E stories/publish_story.py <page> --no-push    everything except commit/push/live check

Run it after story_audio.py (which also runs the Whisper check), when you've
listened to anything it flagged. Steps, in this order (the order matters: Cloudflare caches a 404 for
4 hours, so nothing requests an audio URL before it's uploaded):

  1. local checks: every clip in media/, every picture, the menu entry
  2. upload new/changed clips to R2 (story_audio.py --upload)
  3. every clip URL answers 200 with the same size as the local file
  4. offline copy (eng/build_single.py), opened in Edge: no console errors
  5. copy the page, offline copy and menu script to G:\\My Drive\\_LANGUAGES
  6. commit only this story's files (page, pictures, menu script) and push
  7. wait for Cloudflare Pages, then check the live page and every picture

Every step can be re-run: unchanged clips aren't uploaded again, and an
unchanged story makes no commit. If a step fails, fix it and run again.
"""
import argparse, os, re, shutil, subprocess, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)  # keep our lines in order with the sub-scripts'
ROOT = Path(__file__).resolve().parent.parent
DRIVE = Path(r"G:\My Drive\_LANGUAGES")
SITE = "https://languages-4ko.pages.dev"  # Cloudflare Pages (production = master)
PY = [sys.executable, "-E"]


def fail(msg):
    print(f"\nSTOPPED: {msg}")
    sys.exit(1)


def step(msg):
    print(f"\n== {msg}")


def http(url, method="GET"):
    """(status, headers, body) without raising on 4xx/5xx."""
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "publish_story"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers, (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, e.headers, b""


def http_retry(url, method="GET"):
    for wait in (0, 2, 5):
        time.sleep(wait)
        try:
            return http(url, method)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
    return 0, {}, str(last).encode()


def main():
    ap = argparse.ArgumentParser(description="Publish a story page")
    ap.add_argument("page", help="stories/<page>.html, without .html")
    ap.add_argument("--dry-run", action="store_true", help="local checks only, change nothing")
    ap.add_argument("--no-push", action="store_true", help="stop before commit and push")
    ap.add_argument("--yes", action="store_true", help="don't ask (only when Marissa has said go ahead)")
    ap.add_argument("-m", "--message", help="commit message (default: Stories: add/update <title>)")
    a = ap.parse_args()
    os.chdir(ROOT)

    page = ROOT / "stories" / f"{a.page.removesuffix('.html')}.html"
    if not page.exists():
        fail(f"no page {page.relative_to(ROOT)}")
    name = page.stem
    src = page.read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", src, re.S).group(1).strip()
    aud_dir = re.search(r'const AUD_DIR = "([^"]+)"', src).group(1)
    img_dir = re.search(r'const IMG_DIR = "([^"]+)"', src).group(1)
    img_ext = (re.search(r'const IMG_EXT = "([^"]+)"', src) or [None, "jpg"])[1]
    aud_ext = (re.search(r'const AUD_EXT = "([^"]+)"', src) or [None, "mp3"])[1]
    nav = re.search(r'<script src="/(assets/js/nav-[\w-]+\.js)"></script>', src)
    body = src[src.index("const pages"):]
    nums = [int(n) for n in re.findall(r"""\[\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*(\d+)\s*\]""", body)]
    pics = sorted({(int(n), ext or img_ext) for n, ext in
                   re.findall(r'img:\s*(\d+),(?:\s*imgExt:\s*"(\w+)",)?', body)})
    aud_path = urllib.parse.urlparse(aud_dir).path.strip("/")
    media = ROOT / "media" / aud_path
    clips = [media / f"{n:02d}.{aud_ext}" for n in nums]
    pic_files = [ROOT / img_dir.strip("/") / f"{n}.{ext}" for n, ext in pics]

    # ---- 1. local checks
    step("1. local checks")
    problems = []
    if nums != list(range(1, len(nums) + 1)):
        problems.append(f"chunk numbers aren't 1..{len(nums)} in order")
    missing = [c.name for c in clips if not c.exists()]
    if missing:
        problems.append(f"{len(missing)} clip(s) not made yet in {media.relative_to(ROOT)}: {', '.join(missing[:10])}"
                        f" (run story_audio.py {name})")
    missing = [str(p.relative_to(ROOT)) for p in pic_files if not p.exists()]
    if missing:
        problems.append(f"picture(s) missing: {', '.join(missing)}")
    if not nav:
        problems.append("the page has no nav-*.js menu script")
    elif f'href: "{page.name}"' not in (ROOT / nav.group(1)).read_text(encoding="utf-8"):
        problems.append(f"{nav.group(1)} has no entry for {page.name}")
    if problems:
        fail("\n  " + "\n  ".join(problems))
    branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
    git_paths = [str(page.relative_to(ROOT)), img_dir.strip("/"), nav.group(1)]
    git_status = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all", "--", *git_paths],
                                capture_output=True, text=True).stdout.splitlines()
    new_page = subprocess.run(["git", "ls-files", "--error-unmatch", str(page.relative_to(ROOT))],
                              capture_output=True).returncode != 0
    msg = a.message or f"Stories: {'add' if new_page else 'update'} {title}"
    size = sum(c.stat().st_size for c in clips)
    print(f"{title}  ({page.name})")
    print(f"  {len(clips)} clips ({size / 1e6:.1f} MB) in {media.relative_to(ROOT)} -> R2 {aud_path}/")
    print(f"  {len(pic_files)} pictures in {img_dir}")
    print(f"  menu: {nav.group(1)}")
    print(f"  offline copy: eng/single/{page.name}, copies to {DRIVE}")
    if git_status:
        print(f"  commit on {branch!r}: {msg}")
        for line in git_status:
            print(f"    {line}")
        print("  then push" + (" (skipped: --no-push)" if a.no_push else ""))
    else:
        print("  git: nothing to commit for this story")
    print("Did you listen to the clips Whisper flagged (??) when story_audio.py made them?")

    if a.dry_run:
        step("dry run: what the upload would send")
        subprocess.run(PY + ["stories/story_audio.py", name, "--upload", "--dry-run"])
        print("\nDry run: nothing changed.")
        return
    if not a.yes and input("\nType yes to publish: ").strip().lower() != "yes":
        print("Nothing done.")
        return

    try:
        import truststore
        truststore.inject_into_ssl()  # this PC needs the Windows certificate store for HTTPS
    except ImportError:
        pass

    # ---- 2. upload
    step("2. upload audio to R2")
    if subprocess.run(PY + ["stories/story_audio.py", name, "--upload"]).returncode:
        fail("story_audio.py --upload failed (see above)")

    # ---- 3. every clip online, same size as the local file
    step("3. check every clip online")

    def check_clip(c):
        status, headers, _ = http_retry(aud_dir + c.name, "HEAD")
        if status != 200:
            return f"{c.name}: {status}"
        online = int(headers.get("Content-Length") or -1)
        if online != c.stat().st_size:
            return f"{c.name}: online {online} bytes, local {c.stat().st_size} (old file cached? purge it in Cloudflare)"
    with ThreadPoolExecutor(8) as pool:
        bad = [r for r in pool.map(check_clip, clips) if r]
    if bad:
        fail("clips not right online:\n  " + "\n  ".join(bad)
             + "\n  A cached 404 clears after 4 hours, or purge the URL: Cloudflare > Caching > Purge Cache > Custom URL.")
    print(f"all {len(clips)} clips OK")

    # ---- 4. offline copy
    step("4. offline copy")
    if subprocess.run([sys.executable, "-I", "eng/build_single.py", name]).returncode:
        fail("build_single.py failed (see above)")
    single = ROOT / "eng" / "single" / page.name
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright isn't available: open the offline copy by hand to check it.")
    else:
        errors = []
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge")
            pg = browser.new_page()
            pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(single.as_uri())
            pg.wait_for_timeout(1500)
            n_chunks = pg.locator(".chunk").count()
            browser.close()
        if errors:
            fail("offline copy has console errors:\n  " + "\n  ".join(errors))
        if n_chunks != len(clips):
            fail(f"offline copy shows {n_chunks} chunks, the page has {len(clips)}")
        print(f"opens in Edge with no console errors, all {n_chunks} chunks shown")
    print(f"{single.relative_to(ROOT)}: {single.stat().st_size / 1e6:.1f} MB")

    # ---- 5. Google Drive
    step("5. copy to Google Drive")
    if not DRIVE.exists():
        fail(f"can't find {DRIVE}. Is Google Drive running?")
    for f, dest in [(page, DRIVE / "stories"), (single, DRIVE / "eng" / "single"), (ROOT / nav.group(1), DRIVE / "assets" / "js")]:
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dest / f.name)
        print(f"  {f.name} -> {dest}")

    if a.no_push:
        print("\nDone up to the commit (--no-push).")
        return

    # ---- 6. commit and push
    step("6. commit and push")
    if git_status:
        subprocess.run(["git", "add", "--", *git_paths], check=True)
        # commit only these paths, even if something else is staged
        if subprocess.run(["git", "commit", "-m", msg, "--", *git_paths]).returncode:
            fail("git commit failed (see above)")
    else:
        print("nothing to commit")
    if subprocess.run(["git", "push"]).returncode:
        fail("git push failed (see above); run again once it's fixed")

    # ---- 7. live check
    step("7. live check")
    site = SITE if branch in ("master", "main") else \
        f"https://{re.sub(r'[^a-z0-9-]', '-', branch.lower())[:28].strip('-')}.{SITE.split('//')[1]}"
    url = f"{site}/stories/{page.name}"
    print(f"waiting for {url} ...")
    # a missing page answers 200 with a "Protected Page", so look for the end of this version of the page
    want = src.replace("\r", "").encode()[-2000:].strip()
    for _ in range(40):  # up to 10 minutes
        status, _, html = http_retry(url)
        if status == 200 and want in html.replace(b"\r", b""):
            break
        time.sleep(15)
    else:
        fail(f"the live page didn't show the new version within 10 minutes: {url}")
    print("page is live")

    def check_pic(f):
        rel = f.relative_to(ROOT).as_posix()
        status, headers, data = http_retry(f"{site}/{rel}")
        if status != 200 or not headers.get("Content-Type", "").startswith("image/"):
            return f"{rel}: {status} {headers.get('Content-Type')}"
        if len(data) != f.stat().st_size:
            return f"{rel}: online {len(data)} bytes, local {f.stat().st_size} (old picture still cached?)"
    with ThreadPoolExecutor(8) as pool:
        bad = [r for r in pool.map(check_pic, pic_files) if r]
    if bad:
        fail("pictures not right online:\n  " + "\n  ".join(bad))
    print(f"all {len(pic_files)} pictures OK")
    print(f"\nPublished: {url}")


if __name__ == "__main__":
    main()
