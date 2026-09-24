import base64, glob, os, re
SRC="abc"; OUT="ABC-A-Z.html"
html=open(f"{SRC}/index.html",encoding="utf-8").read()
css=open(f"{SRC}/assets/app.css",encoding="utf-8").read()

# 1) inline the stylesheet
html=html.replace('<link rel="stylesheet" href="assets/app.css">', "<style>\n"+css+"\n</style>")

# 2) build the EMBED map from images + audio
MIME={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",
      ".mp3":"audio/mpeg",".m4a":"audio/mp4",".wav":"audio/wav"}
embed={}
for folder in ("images","audio"):
    for p in sorted(glob.glob(f"{SRC}/{folder}/*")):
        ext=os.path.splitext(p)[1].lower()
        if ext not in MIME: continue
        key=f"{folder}/{os.path.basename(p)}"
        embed[key]="data:%s;base64,%s"%(MIME[ext],base64.b64encode(open(p,"rb").read()).decode())
import json
html=html.replace("const EMBED = {}; /*__INLINE_ASSETS__*/","const EMBED = "+json.dumps(embed)+";")

open(OUT,"w",encoding="utf-8").write(html)
print(f"wrote {OUT}: {os.path.getsize(OUT)/1024/1024:.2f} MB, {len(embed)} assets embedded")
