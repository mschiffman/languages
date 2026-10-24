"""Upload media/lessons/expressions/<folder>/NN.mp3 to R2 lessons/Expressions/<folder>/.
Only files missing online or with a different MD5 are sent; then every file is checked.
    python -E fr/expression/upload_audio.py apology clarify ...    (audio folder names = the page's AUD_DIR)"""
import hashlib, os, sys, winreg
from concurrent.futures import ThreadPoolExecutor
import truststore
truststore.inject_into_ssl()
import urllib3
urllib3.disable_warnings()
import boto3

sys.stdout.reconfigure(encoding="utf-8")
ROOT = "C:/Users/mschi/OneDrive/Desktop/LANGUAGES/media/lessons/expressions"


def env(k):
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
        return winreg.QueryValueEx(h, k)[0].strip()


s3 = boto3.client("s3", endpoint_url=f"https://{env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
                  aws_access_key_id=env("R2_ACCESS_KEY_ID"), aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
                  region_name="auto")
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()


def online(prefix):
    out = {}
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket="languages", Prefix=prefix):
        out.update({o["Key"]: o["ETag"].strip('"') for o in page.get("Contents", [])})
    return out


for folder in sys.argv[1:]:
    prefix, local = f"lessons/Expressions/{folder}/", f"{ROOT}/{folder}"
    files = sorted(f for f in os.listdir(local) if f.endswith(".mp3") and not f.endswith(".tmp.mp3"))
    have = online(prefix)
    todo = [f for f in files if have.get(prefix + f) != md5(f"{local}/{f}")]
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda f: s3.upload_file(f"{local}/{f}", "languages", prefix + f,
                                               ExtraArgs={"ContentType": "audio/mpeg"}), todo))
    have = online(prefix)
    ok = sum(have.get(prefix + f) == md5(f"{local}/{f}") for f in files)
    print(f"{folder:14} uploaded {len(todo):3}  online match {ok}/{len(files)}")
