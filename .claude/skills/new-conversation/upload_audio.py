"""Upload a conversation's audio to Cloudflare R2 (bucket "languages", served
at https://languages.rmlives.com/).

usage (from the LANGUAGES root):
    python -E .claude/skills/new-conversation/upload_audio.py <conv#> [<conv#> ...]
           [--lines] [--dry-run]

Uploads media/lessons/everyday/conv##/NN_k.mp3 (chunks) to
lessons/everyday/conv##/ in the bucket; with --lines, the full-line NN.mp3
files too. A file is only sent when it's missing online or its MD5 differs
from the online ETag, so re-running is cheap. --dry-run only reports.

Needs the User env vars R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID
(an R2 token with Object Read & Write on the bucket) and the boto3 and
truststore packages (pip install --user boto3 truststore). Run with -E, not
-I: -I hides the user site-packages where they're installed.
"""
import argparse, hashlib, os, re, sys, winreg
from concurrent.futures import ThreadPoolExecutor

import truststore
truststore.inject_into_ssl()  # use the Windows certificate store
import urllib3
# truststore verifies certificates through Windows, which urllib3 can't see, so
# it warns "Unverified HTTPS request" on every call. Bad certificates are still
# refused (tested against self-signed/expired/wrong-host badssl.com).
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import boto3

BUCKET = "languages"
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("convs", nargs="+", type=int)
ap.add_argument("--lines", action="store_true", help="also upload the full-line NN.mp3 files")
ap.add_argument("--dry-run", action="store_true")
a = ap.parse_args()


def env(k):
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, k)[0].strip()


s3 = boto3.client("s3", endpoint_url=f"https://{env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
                  aws_access_key_id=env("R2_ACCESS_KEY_ID"), aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
                  region_name="auto")
pattern = re.compile(r"\d+(_\d+)?\.mp3$" if a.lines else r"\d+_\d+\.mp3$")

for conv in a.convs:
    folder = f"media/lessons/everyday/conv{conv}"
    prefix = f"lessons/everyday/conv{conv}/"
    online = {}
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
        online.update({o["Key"]: o["ETag"].strip('"') for o in page.get("Contents", [])})
    new, changed = [], []
    for f in sorted(os.listdir(folder)):
        if not pattern.fullmatch(f):
            continue
        key = prefix + f
        if key not in online:
            new.append(f)
        elif hashlib.md5(open(os.path.join(folder, f), "rb").read()).hexdigest() != online[key]:
            changed.append(f)
    print(f"conv{conv}: {len(new)} new, {len(changed)} changed"
          + (f" (changed: {', '.join(changed[:8])}{' ...' if len(changed) > 8 else ''})" if changed else ""))
    if a.dry_run or not (new or changed):
        continue

    def put(f):
        s3.upload_file(os.path.join(folder, f), BUCKET, prefix + f, ExtraArgs={"ContentType": "audio/mpeg"})

    with ThreadPoolExecutor(8) as pool:
        list(pool.map(put, new + changed))
    print(f"  uploaded {len(new) + len(changed)}")
