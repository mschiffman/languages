"""Story app: a small dashboard in the browser for the three story scripts.

usage (from the LANGUAGES root), or double-click stories/story_app.bat:
    python -E stories/story_app.py

Opens http://127.0.0.1:8765. Type a story.md (a name in Desktop\\story-md, or
a full path) or the name of an existing page, then:

  Process   1. new_story.py: the page from story.md (skipped for a page name)
            2. story_audio.py: makes missing clips, Whisper-checks the new takes
            3. publish_story.py --dry-run: pictures, menu, what would be uploaded
            Each step has its own panel; a step that fails stops the ones after it.
  Publish   publish_story.py --yes: upload, offline copy, Drive, commit, push,
            live check. Only after all three steps passed for that story.

Two things it adds so "fix story.md, press Process again" is safe:
  - If the page was changed by hand since the app last wrote it, step 1 puts it
    back and shows the difference instead of overwriting it ("Replace" overwrites).
  - Clips whose text changed since the last Process get new takes
    (story_audio.py --redo), so old audio isn't published with new text.
Its memory is media/story_app_state.json (not in git).
To stop the app, close its window (or Ctrl+C).
"""
import difflib, hashlib, json, re, subprocess, sys, threading, traceback, urllib.parse, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORIES = ROOT / "stories"
MD_DIR = ROOT.parent / "story-md"  # where the story.md files from ChatGPT are kept
STATE = ROOT / "media" / "story_app_state.json"
PORT = 8765
CHUNK = re.compile(r"""\[\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*(\d+)\s*\]""")
STEPS = ("page", "audio", "check", "publish")

lock = threading.RLock()
job = {"busy": False, "page": None, "aud": None, "ready": None, "conflict": False, "steps": {}}


def reset(names):
    with lock:
        for s in names:
            job["steps"][s] = {"status": "idle", "note": "", "log": []}


def log(step, *lines):
    with lock:
        job["steps"][step]["log"].extend(lines)


def finish(step, status, note=""):
    with lock:
        job["steps"][step].update(status=status, note=note)
    return status == "ok" or status == "skipped"


def run(step, script, *args):
    """Run a story script, its output going line by line into the step's log. Returns the exit code."""
    with lock:
        job["steps"][step]["status"] = "running"
    p = subprocess.Popen([sys.executable, "-E", "-u", str(STORIES / script), *map(str, args)], cwd=ROOT,
                         stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for raw in p.stdout:
        log(step, raw.decode("utf-8", "replace").rstrip("\r\n").split("\r")[-1])
    return p.wait()


def sha(b):
    return hashlib.sha256(b).hexdigest()


def load_state():
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_state(st):
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")


def find_md(s):
    p = Path(s)
    for c in [p] if p.is_absolute() else [MD_DIR / p, ROOT / p, Path.home() / "Downloads" / p]:
        if c.is_file():
            return c


def suggestions():
    mds = sorted(MD_DIR.glob("*.md"), key=lambda f: -f.stat().st_mtime) if MD_DIR.exists() else []
    pages = sorted(STORIES.glob("*.html"), key=lambda f: -f.stat().st_mtime)[:20]
    return [f.name for f in mds] + [f.stem for f in pages]


# ---------------------------------------------------------------- Process

def process(story, replace):
    reset(STEPS)
    with lock:
        job.update(page=None, aud=None, ready=None, conflict=False)
    st = load_state()
    s = story.strip().strip('"')

    # ---- 1. page from story.md
    if s.lower().endswith(".md"):
        md = find_md(s)
        if not md:
            return finish("page", "error", f"Can't find {s} (looked in {MD_DIR} and in LANGUAGES).")
        m = re.search(r"(?m)^\s*page\s*:\s*([\w.-]+)", md.read_text(encoding="utf-8-sig"))
        page = m and m.group(1).removesuffix(".html")
        pf = STORIES / f"{page}.html"
        old = pf.read_bytes() if page and pf.exists() else None
        known = old is not None and st.get(page, {}).get("page_sha") == sha(old)
        log("page", f"{md}")
        if run("page", "new_story.py", md, *(["--force"] if old is not None else [])):
            return finish("page", "error", "new_story.py stopped: fix story.md, then Process again.")
        with lock:
            job["page"] = page
        new = pf.read_bytes()
        if old is not None and new != old and not known and not replace:
            pf.write_bytes(old)  # it was changed by hand (or made before the app): don't lose that
            diff = list(difflib.unified_diff(old.decode("utf-8", "replace").splitlines(),
                                             new.decode("utf-8", "replace").splitlines(),
                                             "page now", "from story.md", lineterm="", n=0))
            log("page", "", f"Put stories/{pf.name} back as it was. Differences:",
                *diff[:60], *(["  … and more"] if len(diff) > 60 else []))
            with lock:
                job["conflict"] = True
            return finish("page", "error",
                          f"stories/{pf.name} isn't what story.md makes: probably fixed by hand. Nothing was "
                          f"overwritten. Make the same fix in story.md, or tick “Replace the page”, or type "
                          f"{page} instead of the .md to keep the page as it is.")
        st.setdefault(page, {})["page_sha"] = sha(new)
        save_state(st)
        finish("page", "ok", "Page unchanged." if new == old else f"Wrote stories/{pf.name}.")
    else:
        page = Path(s).name.removesuffix(".html")
        if not page or not (STORIES / f"{page}.html").exists():
            return finish("page", "error", f"No stories/{page}.html. Type a story.md, or the name of a page in stories/.")
        with lock:
            job["page"] = page
        finish("page", "skipped", f"No story.md: using stories/{page}.html as it is.")

    # ---- 2. audio + Whisper check
    src = (STORIES / f"{page}.html").read_text(encoding="utf-8")
    aud = urllib.parse.urlparse(re.search(r'const AUD_DIR = "([^"]+)"', src).group(1)).path.strip("/")
    with lock:
        job["aud"] = aud
    chunks = {n: a or b for a, b, n in CHUNK.findall(src[src.index("const pages"):])}
    seen = st.get(page, {}).get("clips")
    redo = [n for n, t in chunks.items()
            if seen and seen.get(n) != t and (ROOT / "media" / aud / f"{int(n):02d}.mp3").exists()]
    if redo:
        log("audio", f"New takes of {', '.join(redo)}: their text changed since the last Process.", "")
    rc = run("audio", "story_audio.py", page, *(["--redo", *redo] if redo else []))
    lines = job["steps"]["audio"]["log"]
    flagged = [l for l in lines if l.startswith("?? ")]
    if rc == 0 or flagged:  # every take was made
        st.setdefault(page, {})["clips"] = chunks
        save_state(st)
    if rc:
        if flagged:
            return finish("audio", "error",
                          f"Whisper flagged {len(flagged)} clip(s). Listen with ▶. If they sound right, press "
                          f"Process again to accept them. If one is really wrong, re-take it in the terminal: "
                          f"python -E stories/story_audio.py {page} --redo N")
        return finish("audio", "error", "story_audio.py stopped: see below.")
    takes = sum(1 for l in lines if re.match(r"\d{2,3}\.mp3 ", l))
    finish("audio", "ok", f"{takes} new clip(s), and Whisper found nothing to look at." if takes
           else f"All {len(chunks)} clips were made before; nothing new.")

    # ---- 3. publish checks (dry run)
    if run("check", "publish_story.py", page, "--dry-run"):
        return finish("check", "error", "publish_story.py found problems: see below.")
    up = next((l for l in job["steps"]["check"]["log"] if re.match(r"R2 .*to upload", l)), "")
    finish("check", "ok", f"Ready to publish. {up}")
    with lock:
        job["ready"] = page


def publish(page):
    reset(["publish"])
    with lock:
        job["ready"] = None
    rc = run("publish", "publish_story.py", page, "--yes")
    url = next((l.split(": ", 1)[1] for l in job["steps"]["publish"]["log"] if l.startswith("Published: ")), "")
    if rc:
        finish("publish", "error", "publish_story.py stopped: fix what it says, then Process and Publish again.")
    else:
        finish("publish", "ok", f"Published: {url}")


def guarded(fn, *args):
    try:
        fn(*args)
    except Exception:
        with lock:
            steps = job["steps"]
            step = next((s for s in STEPS if steps[s]["status"] == "running"),
                        next((s for s in reversed(STEPS) if steps[s]["status"] != "idle"), "page"))
            steps[step]["log"].extend(traceback.format_exc().splitlines())
            steps[step].update(status="error", note="The app itself failed here: see below.")
    finally:
        with lock:
            job["busy"] = False


# ---------------------------------------------------------------- web server

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        body = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/":
            return self.send(200, PAGE, "text/html; charset=utf-8")
        if path == "/api/state":
            with lock:
                return self.send(200, json.dumps(job))
        if path == "/api/stories":
            return self.send(200, json.dumps(suggestions()))
        if path.startswith("/media/"):  # local clips for ▶ (never the R2 URLs before upload)
            base = (ROOT / "media").resolve()
            f = (base / urllib.parse.unquote(path[7:])).resolve()
            if f.is_relative_to(base) and f.suffix == ".mp3" and f.is_file():
                return self.send(200, f.read_bytes(), "audio/mpeg")
        self.send(404, "not found", "text/plain")

    def do_POST(self):
        # only this page may start a job: other websites can't send JSON here or use this host name
        if self.headers.get("Content-Type") != "application/json" or self.headers.get("Host") != f"127.0.0.1:{PORT}":
            return self.send(403, '{"error": "forbidden"}')
        data = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        path = urllib.parse.urlparse(self.path).path
        with lock:
            if job["busy"]:
                return self.send(409, '{"error": "busy"}')
            if path == "/api/process":
                fn, args = process, (str(data.get("story", "")), bool(data.get("replace")))
            elif path == "/api/publish" and data.get("page") and data["page"] == job["ready"]:
                fn, args = publish, (job["ready"],)
            else:
                return self.send(400, '{"error": "not ready"}')
            job["busy"] = True
        threading.Thread(target=guarded, args=(fn, *args), daemon=True).start()
        self.send(200, "{}")


PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Story publisher</title>
<link rel="icon" href="data:,">
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1d2330;--mute:#6b7280;--line:#e2e5ea;--accent:#2557d6;
--ok:#15803d;--okbg:#e7f5eb;--err:#b42318;--errbg:#fdeceb;--warn:#8a4b08;--warnbg:#fdf3e1;--run:#2557d6;--runbg:#e8eefc}
@media (prefers-color-scheme:dark){:root{--bg:#15171c;--card:#1e2128;--ink:#e6e8ec;--mute:#9aa1ad;--line:#2e323b;
--accent:#6b93ff;--ok:#5ad385;--okbg:#17301f;--err:#ff8a80;--errbg:#3a1d1b;--warn:#f5c060;--warnbg:#382b12;--run:#8fb0ff;--runbg:#1d2742}}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 "Segoe UI",system-ui,sans-serif}
main{max-width:1320px;margin:0 auto;padding:22px 16px 48px}
h1{font-size:20px;margin:0 0 4px}
.sub{color:var(--mute);margin:0 0 16px;font-size:13.5px}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input[type=text]{flex:1 1 380px;min-width:0;padding:9px 12px;border:1px solid var(--line);border-radius:8px;
background:var(--card);color:var(--ink);font:inherit}
button.main{padding:9px 20px;border:0;border-radius:8px;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button.main:disabled{opacity:.35;cursor:default}
#publish{background:var(--ok)}
@media (prefers-color-scheme:dark){#publish{color:#0f1a12}}
label.rep{font-size:13.5px;color:var(--err);display:flex;gap:6px;align-items:center}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
@media (max-width:960px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--line);border-radius:10px;padding:12px 14px;min-width:0}
.card.ok{border-top-color:var(--ok)}.card.error{border-top-color:var(--err)}.card.running{border-top-color:var(--run)}
.head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.head h2{font-size:15px;margin:0}
.badge{font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;background:var(--bg);color:var(--mute);white-space:nowrap}
.ok .badge{background:var(--okbg);color:var(--ok)}.error .badge{background:var(--errbg);color:var(--err)}
.running .badge{background:var(--runbg);color:var(--run)}
.note{margin:8px 0;font-size:14px;overflow-wrap:anywhere}
.note:empty{display:none}
.note a{color:var(--accent)}
.box{background:var(--errbg);color:var(--err);border-radius:6px;padding:8px 10px;margin:8px 0;
font:12.5px/1.45 Consolas,"Myanmar Text",monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto}
.box.warn{background:var(--warnbg);color:var(--warn)}
details summary{cursor:pointer;color:var(--mute);font-size:13px}
pre{max-height:360px;overflow:auto;margin:6px 0 0;padding:8px 10px;background:var(--bg);border-radius:6px;
font:12px/1.5 Consolas,"Myanmar Text",monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.flag{color:var(--err);font-weight:600}
.play{border:0;background:none;color:var(--accent);padding:0 6px 0 0;cursor:pointer;font:inherit}
#pubcard[hidden]{display:none}
#pubcard{margin-top:14px}
.foot{color:var(--mute);font-size:12.5px;margin-top:22px}
</style>
</head>
<body>
<main>
  <h1>Story publisher</h1>
  <p class="sub">Type a story.md from Desktop\story-md, or the name of a page in stories/ to skip step 1.</p>
  <div class="bar">
    <input type="text" id="story" list="stories" placeholder="orchestra.md  or  Mushroom_house_orchestra" autocomplete="off">
    <datalist id="stories"></datalist>
    <button class="main" id="process">Process</button>
    <button class="main" id="publish" disabled>Publish</button>
  </div>
  <label class="rep" id="replabel" hidden><input type="checkbox" id="replace"> Replace the page with what story.md makes (loses the hand-made changes shown in step 1)</label>
  <div class="grid">
    <section class="card" id="c-page"></section>
    <section class="card" id="c-audio"></section>
    <section class="card" id="c-check"></section>
  </div>
  <section class="card" id="c-publish" hidden></section>
  <p class="foot">The ▶ buttons play your local clips, so listening never touches R2 before the upload. To stop the app, close its window.</p>
</main>
<script>
const TITLES={page:"1 · Page from story.md",audio:"2 · Audio + Whisper check",check:"3 · Publish checks",publish:"Publish"};
const LABEL={idle:"waiting",running:"running…",ok:"OK",error:"needs fixing",skipped:"skipped"};
const KEY=/^STOPPED|problem\(s\)$|^\?\? |^warning:|Traceback|Error|refused|failed|^Put stories\//;
const $=id=>document.getElementById(id);
const player=new Audio();
let S=null,timer=null;const shown={},prev={};

for(const id of Object.keys(TITLES)){
  $('c-'+id).innerHTML=`<div class="head"><h2>${TITLES[id]}</h2><span class="badge">waiting</span></div>
  <div class="note"></div><div class="box" hidden></div>
  <details><summary>Full output</summary><pre></pre></details>`;
}
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function errs(lines){
  const out=[];let take=false;
  for(const l of lines){
    if(KEY.test(l)){out.push(l);take=true}
    else if(take&&/^\s+\S|^[-+@]/.test(l))out.push(l);
    else take=false;
  }
  return out;
}
function line(id,l){
  let h=esc(l);
  if(l.startsWith('?? '))h=`<span class="flag">${h}</span>`;
  const m=id==='audio'&&S.aud&&l.match(/^(?:\?\? |   )?(\d{2,3})(?:\.mp3 | )/);
  return m?`<button class="play" data-n="${m[1]}" title="Play ${m[1]}.mp3">▶</button>`+h:h;
}
function paint(id,st){
  const key=st.status+'|'+st.log.length+'|'+st.note;
  if(shown[id]===key)return;shown[id]=key;
  const c=$('c-'+id);c.className='card '+st.status;
  c.querySelector('.badge').textContent=LABEL[st.status];
  c.querySelector('.note').innerHTML=esc(st.note).replace(/https?:\/\/\S+/g,u=>`<a href="${u}" target="_blank">${u}</a>`);
  const e=errs(st.log),box=c.querySelector('.box');
  box.hidden=!e.length;box.classList.toggle('warn',st.status!=='error');
  box.innerHTML=e.map(l=>line(id,l)).join('\n');
  const pre=c.querySelector('pre'),end=pre.scrollTop+pre.clientHeight>=pre.scrollHeight-24;
  pre.innerHTML=st.log.map(l=>line(id,l)).join('\n');
  if(st.status==='running'&&prev[id]!=='running')c.querySelector('details').open=true;
  if(st.status==='running'&&end)pre.scrollTop=pre.scrollHeight;
  prev[id]=st.status;
}
function render(){
  for(const id of Object.keys(TITLES))paint(id,S.steps[id]);
  $('c-publish').hidden=S.steps.publish.status==='idle';
  $('process').disabled=S.busy;
  $('publish').disabled=S.busy||!S.ready;
  $('publish').textContent=S.ready?`Publish ${S.ready}`:'Publish';
  $('replabel').hidden=!S.conflict;
  if(!S.conflict)$('replace').checked=false;
}
async function poll(){
  clearTimeout(timer);
  try{S=await (await fetch('/api/state')).json();render()}catch(e){}
  if(!S||S.busy)timer=setTimeout(poll,1000);
}
async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)alert((await r.json()).error||'refused');
  poll();
}
$('process').onclick=()=>{
  const story=$('story').value.trim();if(!story)return $('story').focus();
  try{localStorage.setItem('story',story)}catch(e){}
  post('/api/process',{story,replace:$('replace').checked});
};
$('publish').onclick=()=>{
  if(confirm(`Publish ${S.ready}?\n\nThis uploads the audio to R2, copies to Google Drive, commits, pushes and checks the live page.`))
    post('/api/publish',{page:S.ready});
};
$('story').onkeydown=e=>{if(e.key==='Enter')$('process').click()};
document.addEventListener('click',e=>{
  const b=e.target.closest('.play');if(!b)return;
  player.src=`/media/${S.aud}/${b.dataset.n}.mp3?t=${Date.now()}`;player.play();
});
fetch('/api/stories').then(r=>r.json()).then(list=>{
  $('stories').innerHTML=list.map(s=>`<option value="${esc(s)}">`).join('');
  let last='';try{last=localStorage.getItem('story')||''}catch(e){}
  $('story').value=last||list[0]||'';
});
poll();
</script>
</body>
</html>
"""


def main():
    reset(STEPS)
    url = f"http://127.0.0.1:{PORT}/"
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"The story app is already running: {url}")
        webbrowser.open(url)
        return
    print(f"Story app: {url}\nClose this window (or Ctrl+C) to stop it.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
