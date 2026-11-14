"""Quiz maker: a small page in the browser with one button per kind of quiz.

usage (from the LANGUAGES root), or double-click stories/quiz_app.bat:
    python -E stories/quiz_app.py

Opens http://127.0.0.1:8766. It lists the quiz .md files in Desktop\\story-md by
their header line:

  Vocabulary quiz    type: quiz             stories/new_quiz.py <md> --force
                                            then eng/build_single.py <page>
  Expressions quiz   type: expression-quiz  eng/expressions/new_expr_quiz.py <md>
                                            then eng/expressions/build_single.py <page>

Each button makes the page and its offline copy, shows what the scripts printed,
and "Open the offline copy" opens the result in your browser. Nothing is uploaded,
committed or copied to Google Drive: publishing stays in story_app.
A vocabulary page is always replaced by what its .md makes. An expressions quiz
that was typed into its page by hand is not replaced (the script says so).
To stop the app, close its window (or Ctrl+C).
"""
import json, os, re, subprocess, sys, threading, traceback, urllib.parse, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_DIR = ROOT.parent / "story-md"
PORT = 8766
KINDS = {
    "voc": {"type": "quiz", "maker": ["-E", "stories/new_quiz.py"], "extra": ["--force"],
            "build": ["-I", "eng/build_single.py"], "single": "eng/single"},
    "expr": {"type": "expression-quiz", "maker": ["-E", "eng/expressions/new_expr_quiz.py"], "extra": [],
             "build": ["eng/expressions/build_single.py"], "single": "eng/expressions/single"},
}

lock = threading.RLock()
job = {"busy": False, "kind": None, "status": {"voc": "idle", "expr": "idle"}, "note": {"voc": "", "expr": ""},
       "log": {"voc": [], "expr": []}, "single": {"voc": None, "expr": None}}


def header(md):
    """(type, page) from the header of a quiz .md"""
    text = md.read_text(encoding="utf-8-sig", errors="replace")
    head = text.split("\n## ", 1)[0]
    t = re.search(r"(?mi)^\s*type\s*:\s*([\w-]+)\s*$", head)
    p = re.search(r"(?mi)^\s*page\s*:\s*([\w.-]+)\s*$", head)
    return (t.group(1).lower() if t else None, p.group(1).removesuffix(".html") if p else None)


def lists():
    out = {"voc": [], "expr": []}
    mds = sorted(MD_DIR.glob("*.md"), key=lambda f: -f.stat().st_mtime) if MD_DIR.exists() else []
    for f in mds:
        t, page = header(f)
        for k, v in KINDS.items():
            if t == v["type"]:
                out[k].append({"md": f.name, "page": page})
    return out


def run(kind, args):
    """Run a script, its output going line by line into the log. Returns the exit code."""
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUNBUFFERED="1")
    p = subprocess.Popen([sys.executable, *args], cwd=ROOT, stdin=subprocess.DEVNULL, env=env,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for raw in p.stdout:
        with lock:
            job["log"][kind].append(raw.decode("utf-8", "replace").rstrip("\r\n"))
    return p.wait()


def make(kind, name):
    k = KINDS[kind]

    def finish(status, note):
        with lock:
            job["status"][kind], job["note"][kind] = status, note

    with lock:
        job["status"][kind], job["note"][kind], job["log"][kind], job["single"][kind] = "running", "", [], None
    md = (MD_DIR / Path(name).name)
    if not md.is_file():
        return finish("error", f"Can't find {md}.")
    t, page = header(md)
    if t != k["type"] or not page:
        return finish("error", f"{md.name} needs the header lines 'type: {k['type']}' and 'page: …'.")
    if run(kind, [*k["maker"], str(md), *k["extra"]]):
        return finish("error", f"The quiz wasn't made: fix {md.name} (see below), then press the button again.")
    with lock:
        job["log"][kind].append("")
    if run(kind, [*k["build"], page]):
        return finish("error", "The page was made, but the offline copy failed: see below.")
    single = ROOT / k["single"] / f"{page}.html"
    with lock:
        job["single"][kind] = str(single) if single.is_file() else None
    first = next((l for l in job["log"][kind] if "— OK" in l), "")
    finish("ok", (first.split(": ", 1)[-1].replace(" — OK", "") + ". " if first else "") + f"Offline copy: {k['single']}/{page}.html")


def guarded(kind, name):
    try:
        make(kind, name)
    except Exception:
        with lock:
            job["log"][kind].extend(traceback.format_exc().splitlines())
            job["status"][kind], job["note"][kind] = "error", "The app itself failed here: see below."
    finally:
        with lock:
            job["busy"] = False


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
                return self.send(200, json.dumps({**job, "lists": lists()}))
        self.send(404, "not found", "text/plain")

    def do_POST(self):
        # only this page may start a job: other websites can't send JSON here or use this host name
        if self.headers.get("Content-Type") != "application/json" or self.headers.get("Host") != f"127.0.0.1:{PORT}":
            return self.send(403, '{"error": "forbidden"}')
        data = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        path = urllib.parse.urlparse(self.path).path
        kind = data.get("kind")
        if kind not in KINDS:
            return self.send(400, '{"error": "which quiz?"}')
        with lock:
            if path == "/api/open":
                if job["single"][kind] and Path(job["single"][kind]).is_file():
                    os.startfile(job["single"][kind])  # the default browser
                return self.send(200, "{}")
            if path != "/api/make" or not data.get("md"):
                return self.send(400, '{"error": "choose a .md file"}')
            if job["busy"]:
                return self.send(409, '{"error": "busy"}')
            job["busy"], job["kind"] = True, kind
        threading.Thread(target=guarded, args=(kind, str(data["md"])), daemon=True).start()
        self.send(200, "{}")


PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quiz maker</title>
<link rel="icon" href="data:,">
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1d2330;--mute:#6b7280;--line:#e2e5ea;--voc:#15803d;--expr:#2557d6;
--ok:#15803d;--okbg:#e7f5eb;--err:#b42318;--errbg:#fdeceb;--run:#2557d6;--runbg:#e8eefc}
@media (prefers-color-scheme:dark){:root{--bg:#15171c;--card:#1e2128;--ink:#e6e8ec;--mute:#9aa1ad;--line:#2e323b;
--voc:#3fae62;--expr:#6b93ff;--ok:#5ad385;--okbg:#17301f;--err:#ff8a80;--errbg:#3a1d1b;--run:#8fb0ff;--runbg:#1d2742}}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 "Segoe UI",system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:22px 16px 48px}
h1{font-size:20px;margin:0 0 4px}
.sub{color:var(--mute);margin:0 0 18px;font-size:13.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-top:4px solid var(--k);border-radius:10px;padding:14px 16px;min-width:0}
#c-voc{--k:var(--voc)}#c-expr{--k:var(--expr)}
.head{display:flex;justify-content:space-between;align-items:center;gap:8px}
h2{font-size:16px;margin:0}
.what{color:var(--mute);font-size:13.5px;margin:4px 0 12px}
.badge{font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;background:var(--bg);color:var(--mute);white-space:nowrap}
.ok .badge{background:var(--okbg);color:var(--ok)}.error .badge{background:var(--errbg);color:var(--err)}
.running .badge{background:var(--runbg);color:var(--run)}
select{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit}
button.main{width:100%;margin-top:10px;padding:11px 20px;border:0;border-radius:8px;background:var(--k);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button.main:disabled{opacity:.35;cursor:default}
button.link{border:0;background:none;color:var(--k);padding:0;cursor:pointer;font:inherit;text-decoration:underline}
.note{margin:10px 0 6px;font-size:14px;overflow-wrap:anywhere}
.note:empty{display:none}
.box{background:var(--errbg);color:var(--err);border-radius:6px;padding:8px 10px;margin:8px 0;
font:12.5px/1.45 Consolas,"Myanmar Text",monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto}
details{margin-top:8px}
details summary{cursor:pointer;color:var(--mute);font-size:13px}
pre{max-height:320px;overflow:auto;margin:6px 0 0;padding:8px 10px;background:var(--bg);border-radius:6px;
font:12px/1.5 Consolas,"Myanmar Text",monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.none{color:var(--mute);font-size:13.5px}
.foot{color:var(--mute);font-size:12.5px;margin-top:22px}
</style>
</head>
<body>
<main>
  <h1>Quiz maker</h1>
  <p class="sub">Choose a quiz .md from Desktop\story-md and press its button. It makes the page and the offline copy. Nothing is uploaded or published.</p>
  <div class="grid">
    <section class="card" id="c-voc"></section>
    <section class="card" id="c-expr"></section>
  </div>
  <p class="foot">A file shows up on the left when its header says <b>type: quiz</b>, on the right when it says <b>type: expression-quiz</b>. Formats: stories\quiz_format.txt and the top of eng\expressions\new_expr_quiz.py. To stop the app, close its window.</p>
</main>
<script>
const KIND={voc:["Vocabulary quiz","Pictures and words: pick, listen, match, a/an, spell, type.","Make vocabulary quiz"],
            expr:["Expressions quiz","Embedded in the cards page: match, say, reply, build, judge.","Make expressions quiz"]};
const LABEL={idle:"ready",running:"running…",ok:"done",error:"needs fixing"};
const $=id=>document.getElementById(id);
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
let S=null,timer=null;const shown={};
for(const k of Object.keys(KIND)){
  $('c-'+k).innerHTML=`<div class="head"><h2>${KIND[k][0]}</h2><span class="badge">ready</span></div>
  <p class="what">${KIND[k][1]}</p>
  <select aria-label="${KIND[k][0]} file"></select><p class="none" hidden>No .md with this type in Desktop\\story-md yet.</p>
  <button class="main">${KIND[k][2]}</button>
  <div class="note"></div><div class="box" hidden></div>
  <details><summary>Full output</summary><pre></pre></details>`;
  $('c-'+k).querySelector('button.main').onclick=()=>{
    const md=$('c-'+k).querySelector('select').value;if(!md)return;
    post('/api/make',{kind:k,md});
  };
}
function paint(k){
  const c=$('c-'+k),st=S.status[k],log=S.log[k],list=S.lists[k];
  const sel=c.querySelector('select'),opts=list.map(x=>x.md).join('|');
  if(sel.dataset.opts!==opts){
    const keep=sel.value;sel.dataset.opts=opts;
    sel.innerHTML=list.map(x=>`<option value="${esc(x.md)}">${esc(x.md)}  →  ${esc(x.page||'?')}.html</option>`).join('');
    if(list.some(x=>x.md===keep))sel.value=keep;
  }
  sel.hidden=!list.length;c.querySelector('.none').hidden=!!list.length;
  c.querySelector('button.main').disabled=S.busy||!list.length;
  const key=st+'|'+log.length+'|'+S.note[k]+'|'+S.single[k];
  if(shown[k]===key)return;shown[k]=key;
  c.className='card '+st;
  c.querySelector('.badge').textContent=LABEL[st];
  c.querySelector('.note').innerHTML=esc(S.note[k])+(st==='ok'&&S.single[k]?` <button class="link" data-open="${k}">Open the offline copy</button>`:'');
  const bad=st==='error'?log.filter(l=>/problem\(s\)|^\s{2,}\S|Error|Traceback|already|failed|can't/i.test(l)):[];
  const box=c.querySelector('.box');box.hidden=!bad.length;box.textContent=bad.join('\n');
  const pre=c.querySelector('pre');pre.textContent=log.join('\n');
  if(st==='running')c.querySelector('details').open=true;
  pre.scrollTop=pre.scrollHeight;
}
async function poll(){
  clearTimeout(timer);
  try{S=await (await fetch('/api/state')).json();paint('voc');paint('expr')}catch(e){}
  timer=setTimeout(poll,S&&S.busy?800:4000);
}
async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)alert((await r.json()).error||'refused');
  poll();
}
document.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.open;if(k)post('/api/open',{kind:k})});
poll();
</script>
</body>
</html>
"""


def main():
    url = f"http://127.0.0.1:{PORT}/"
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"The quiz maker is already running: {url}")
        webbrowser.open(url)
        return
    print(f"Quiz maker: {url}\nClose this window (or Ctrl+C) to stop it.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
