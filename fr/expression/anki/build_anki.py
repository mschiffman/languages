#!/usr/bin/env python3
"""
Build Anki decks (.apkg) from the expression flashcard pages (fr/expression/<topic>.html).

The decks copy the format of a reference deck exported from Anki
(default: French__Expressions__Refusal.apkg in this script's folder). The reference collection is
cloned and its notes are swapped for the new topic's, so the custom note type
"FR Expression (flip card)" (flip-card template, tap-to-play audio, bundled fonts)
keeps its id and mtime and Anki reuses the existing note type on import instead of
adding a duplicate "FR Expression (flip card)-xxxxx".

One note per card in the page's `categories` block, in reading order:

    English   = card[1]                French    = card[0]
    Audio     = [sound:NN.mp3]         (NN = position in reading order, from
                                        media/lessons/expressions/<topic>/)
    ExampleFR = card[3]                ExampleEN = card[4]   (first example only)
    Category  = the page's header badge, title-cased (AGREEMENT -> Agreement)

The explanation (card[2]) and any second example are left out, as in the reference.
Deck: <reference parent path>::<Name>, tags: expressions french <topic>.

Usage (from anywhere; needs Python 3.14+ for compression.zstd, or the zstandard package):
    python fr/expression/anki/build_anki.py agree                build Desktop/French__Expressions__Agree.apkg
    python fr/expression/anki/build_anki.py agree opinion        build several
    python fr/expression/anki/build_anki.py iMean --name IMean --category "I Mean"
    python fr/expression/anki/build_anki.py agree --out some/dir --force
    python fr/expression/anki/build_anki.py --check Desktop/French__Expressions__Agree.apkg

Every built package is re-opened and checked (database integrity, fields, every
[sound:] reference resolves to the right audio bytes) before the script reports success.
"""
import argparse
import hashlib
import io
import json
import os
import random
import re
import sqlite3
import sys
import time
import zipfile
from pathlib import Path

try:
    from compression import zstd  # Python 3.14+
    zstd_compress, zstd_decompress = zstd.compress, zstd.decompress
except ImportError:  # older Python with `pip install zstandard`
    import zstandard
    zstd_compress = zstandard.ZstdCompressor().compress
    zstd_decompress = lambda b: zstandard.ZstdDecompressor().decompress(b, max_output_size=1 << 30)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent  # site root (the "LANGUAGES" folder)
PAGES = ROOT / "fr" / "expression"
MEDIA = ROOT / "media" / "lessons" / "expressions"
DESKTOP = ROOT.parent
DEFAULT_REF = HERE / "French__Expressions__Refusal.apkg"

FIELDS = ["English", "French", "Audio", "ExampleFR", "ExampleEN", "Category"]
FIELD_SEP = "\x1f"  # separates note fields, and deck-name components (French\x1fExpressions\x1fAgree)

# Back-template fix. The 🔊 button plays the audio by clicking Anki's hidden replay button,
# and that click bubbled up to the card, whose click handler flipped it back to the front.
FLIP_BUGGY = "flip.onclick = function () { flip.classList.toggle('peek'); };"
FLIP_FIXED = """flip.onclick = function (e) {
    if (e.target.closest('.fr, .hidden-audio')) return; // playing the audio doesn't flip the card
    flip.classList.toggle('peek');
  };"""


# ---------------------------------------------------------------- lesson page

def read_page(topic):
    """Return (rows, badge) from <topic>.html; rows are the card arrays in reading order."""
    html = (PAGES / f"{topic}.html").read_text(encoding="utf-8")
    m = re.search(r"const categories = (\[.*?\n\s*\]);", html, re.S)
    if not m:
        sys.exit(f"{topic}.html: no `const categories = [...]` block; the page layout changed")
    js = re.sub(r"(?m)^(\s*)(en|fr|desc|cards):", r'\1"\2":', m.group(1))  # quote the keys
    js = re.sub(r",(\s*[\]}])", r"\1", js)  # drop trailing commas
    rows = [card for cat in json.loads(js) for card in cat["cards"]]
    badges = re.findall(r'<span class="badge">([^<]*)</span>', html)
    badge = badges[1].strip() if len(badges) > 1 else topic  # [0] is "EXPRESSIONS"
    return rows, badge


# ---------------------------------------------------------------- Anki helpers

B91 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~"


def new_guid():
    """Anki's guid: a random 64-bit number in its base-91 alphabet."""
    n, s = random.getrandbits(64), ""
    while n:
        n, r = divmod(n, 91)
        s = B91[r] + s
    return s


def field_checksum(text):
    """notes.csum: first 8 hex digits of the sha1 of the first field, HTML stripped."""
    text = re.sub(r"<[^>]*>", "", text)
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest()[:8], 16)


_last_id = 0


def new_id():
    """Millisecond timestamp ids, strictly increasing across every deck built in this run."""
    global _last_id
    _last_id = max(_last_id + 1, int(time.time() * 1000))
    return _last_id


def one(rows, what):
    """The single row of a query that must return exactly one."""
    if len(rows) != 1:
        sys.exit(f"expected one {what}, found {len(rows)}; use a deck exported on its own")
    return rows[0]


def unicase(a, b):
    """Stand-in for Anki's `unicase` collation (deck, tag and notetype names are ASCII here)."""
    a, b = a.casefold(), b.casefold()
    return (a > b) - (a < b)


def open_collection(raw):
    """Load a collection.anki21b in memory. Anki writes it in WAL mode, which
    deserialize() refuses, so flip the header to rollback mode first."""
    raw = bytearray(raw)
    raw[18:20] = b"\x01\x01"
    db = sqlite3.connect(":memory:")
    db.create_collation("unicase", unicase)
    db.deserialize(bytes(raw))
    return db


def save_collection(db):
    raw = bytearray(db.serialize())
    raw[18:20] = b"\x02\x02"  # back to WAL, as Anki exports it
    return bytes(raw)


# protobuf, just enough for the `media` index: MediaEntries { repeated MediaEntry entries = 1 }
# MediaEntry { string name = 1; uint32 size = 2; bytes sha1 = 3 }

def _varint(b, i):
    r = s = 0
    while True:
        x = b[i]
        i += 1
        r |= (x & 0x7F) << s
        s += 7
        if not x & 0x80:
            return r, i


def pb_parse(b):
    i, out = 0, []
    while i < len(b):
        key, i = _varint(b, i)
        if key & 7 == 0:
            v, i = _varint(b, i)
        else:
            n, i = _varint(b, i)
            v, i = b[i:i + n], i + n
        out.append((key >> 3, v))
    return out


def _enc_varint(n):
    out = bytearray()
    while True:
        b, n = n & 0x7F, n >> 7
        out.append(b | 0x80 if n else b)
        if not n:
            return bytes(out)


def pb_field(num, v):
    if isinstance(v, int):
        return _enc_varint(num << 3) + _enc_varint(v)
    return _enc_varint((num << 3) | 2) + _enc_varint(len(v)) + v


def read_media(z):
    """{name: bytes} from a package; zip member "i" holds entry i of the media index."""
    entries = pb_parse(zstd_decompress(z.read("media")))
    media = {}
    for i, (_, entry) in enumerate(entries):
        e = dict(pb_parse(entry))
        data = zstd_decompress(z.read(str(i)))
        assert len(data) == e[2] and hashlib.sha1(data).digest() == e[3], f"media {i} corrupt"
        media[e[1].decode()] = data
    return media


def fix_templates(c, mid, now):
    """Apply FLIP_FIXED to the cloned note type's templates. If anything changed, bump the
    note type's mtime: importing the deck then also updates the note type already in Anki
    (Anki's default is to update note types "if newer"), which every expression deck shares."""
    fixed = 0
    for ord_, config in c.execute("select ord, config from templates where ntid=?", (mid,)).fetchall():
        parts = pb_parse(config)  # CardTemplateConfig: 1 = front HTML, 2 = back HTML, ...
        assert b"".join(pb_field(f, v) for f, v in parts) == config, "unexpected template encoding"
        new = [(f, v.replace(FLIP_BUGGY.encode(), FLIP_FIXED.encode()) if f == 2 else v) for f, v in parts]
        if new != parts:
            c.execute("update templates set config=?, mtime_secs=?, usn=-1 where ntid=? and ord=?",
                      (b"".join(pb_field(f, v) for f, v in new), now, mid, ord_))
            fixed += 1
    if fixed:
        c.execute("update notetypes set mtime_secs=?, usn=-1 where id=?", (now, mid))
    return fixed


# ---------------------------------------------------------------- build

def build(topic, ref_path, out_path, name, category, tag):
    rows, badge = read_page(topic)
    category = category or badge.title()
    audio_dir = MEDIA / topic
    audio = sorted(p.name for p in audio_dir.glob("*.mp3"))
    expected = [f"{i:02d}.mp3" for i in range(1, len(rows) + 1)]
    if audio != expected:
        sys.exit(f"{topic}: {len(rows)} cards in {topic}.html but audio folder has {audio}")

    zin = zipfile.ZipFile(ref_path)
    if zin.read("meta") != b"\x08\x03":
        sys.exit("reference package is not Anki's latest (v3, zstd) format; re-export it from Anki")
    db = open_collection(zstd_decompress(zin.read("collection.anki21b")))
    c = db.cursor()

    # what to replace: the reference's one note type and one deck
    mid, = one(c.execute("select distinct mid from notes").fetchall(), "note type in the reference")
    names = [r[0] for r in c.execute("select name from fields where ntid=? order by ord", (mid,))]
    if names != FIELDS:
        sys.exit(f"reference note type has fields {names}, expected {FIELDS}")
    ref_did, = one(c.execute("select distinct did from cards").fetchall(), "deck in the reference")
    ref_deck = c.execute("select name from decks where id=?", (ref_did,)).fetchone()[0]
    ref_leaf = ref_deck.split(FIELD_SEP)[-1]
    deck_name = FIELD_SEP.join(ref_deck.split(FIELD_SEP)[:-1] + [name])
    base_tags = set(c.execute("select tags from notes limit 1").fetchone()[0].split()) - {ref_leaf.lower()}
    tags = " " + " ".join(sorted(base_tags | {tag}, key=str.casefold)) + " "

    now = int(time.time())
    fixed = fix_templates(c, mid, now)
    deck_id = new_id()
    c.execute("delete from cards where did=?", (ref_did,))
    c.execute("delete from notes where mid=?", (mid,))
    if c.execute("select count(*) from notes").fetchone()[0]:
        sys.exit("reference holds notes of other types; use a deck exported on its own")
    c.execute("update decks set id=?, name=?, mtime_secs=?, usn=-1 where id=?", (deck_id, deck_name, now, ref_did))

    for i, card in enumerate(rows):
        fr, en, ex_fr, ex_en = card[0], card[1], card[3], card[4]
        fields = [en, fr, f"[sound:{audio[i]}]", ex_fr, ex_en, category]
        nid, cid = new_id(), new_id()
        c.execute("insert into notes (id,guid,mid,mod,usn,tags,flds,sfld,csum,flags,data) "
                  "values (?,?,?,?,-1,?,?,?,?,0,'')",
                  (nid, new_guid(), mid, now, tags, FIELD_SEP.join(fields), en, field_checksum(en)))
        c.execute("insert into cards (id,nid,did,ord,mod,usn,type,queue,due,ivl,factor,reps,lapses,"
                  "left,odue,odid,flags,data) values (?,?,?,0,?,-1,0,0,0,0,0,0,0,0,0,0,0,'{}')",
                  (cid, nid, deck_id, now))
    c.execute("update col set mod=?", (int(time.time() * 1000),))
    db.commit()
    c.execute("vacuum")
    c.execute("analyze")

    # media: this topic's audio, then the template's fonts (the "_"-prefixed files) from the reference
    ref_media = read_media(zin)
    media = [(n, (audio_dir / n).read_bytes()) for n in audio]
    media += [(n, d) for n, d in sorted(ref_media.items()) if n.startswith("_")]
    index = b"".join(pb_field(1, pb_field(1, n.encode()) + pb_field(2, len(d)) + pb_field(3, hashlib.sha1(d).digest()))
                     for n, d in media)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:  # Anki stores; members are zstd'd
        z.writestr("meta", b"\x08\x03")
        z.writestr("collection.anki21b", zstd_compress(save_collection(db)))
        z.writestr("collection.anki2", zin.read("collection.anki2"))  # legacy "please update Anki" stub
        for i, (_, d) in enumerate(media):
            z.writestr(str(i), zstd_compress(d))
        z.writestr("media", zstd_compress(index))
    out_path.write_bytes(buf.getvalue())
    print(f"wrote {out_path}  ({len(rows)} notes, {len(media)} media files, category {category!r}, tags{tags.rstrip()})")
    if fixed:
        print("  patched the back template: playing the audio no longer flips the card")
    check(out_path, audio_dir)


# ---------------------------------------------------------------- check

def check(apkg, audio_dir=None):
    z = zipfile.ZipFile(apkg)
    assert z.testzip() is None and z.read("meta") == b"\x08\x03"
    db = open_collection(zstd_decompress(z.read("collection.anki21b")))
    c = db.cursor()
    assert c.execute("pragma integrity_check").fetchone()[0] == "ok"
    for (config,) in c.execute("select config from templates"):
        assert FLIP_BUGGY.encode() not in config, "back template still flips the card when the audio plays"
    media = read_media(z)
    did, ncards = one(c.execute("select did, count(*) from cards group by did").fetchall(), "deck")
    deck = c.execute("select name from decks where id=?", (did,)).fetchone()[0]
    orphans = c.execute("select (select count(*) from cards where nid not in (select id from notes))"
                        " + (select count(*) from notes where id not in (select nid from cards))").fetchone()[0]
    assert orphans == 0, "cards and notes don't pair up"
    fonts = [n for n in media if n.startswith("_")]
    assert len(fonts) == 3, f"template fonts missing: {fonts}"
    print(f"  deck {deck.replace(FIELD_SEP, '::')}: {ncards} cards")
    for flds, tags in c.execute("select flds, tags from notes order by id"):
        f = flds.split(FIELD_SEP)
        assert len(f) == len(FIELDS)
        snd = re.fullmatch(r"\[sound:(.+)\]", f[2]).group(1)
        assert snd in media, f"{snd} missing from package"
        if audio_dir:
            assert media[snd] == (Path(audio_dir) / snd).read_bytes(), f"{snd} differs from source"
        print(f"  {snd}  {f[1]:<28} {f[0]}")
    print("  ok")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("topics", nargs="*", help="topic folder names, e.g. agree iMean (<topic>.html)")
    ap.add_argument("--ref", type=Path, default=DEFAULT_REF, help="reference .apkg (default: %(default)s)")
    ap.add_argument("--out", type=Path, default=DESKTOP, help="output folder (default: %(default)s)")
    ap.add_argument("--name", help="deck name, also used in the file name (default: topic, first letter capitalised)")
    ap.add_argument("--category", help="badge on each card (default: the page's header badge, title-cased)")
    ap.add_argument("--force", action="store_true", help="overwrite an existing .apkg")
    ap.add_argument("--check", type=Path, metavar="APKG", help="only verify an existing package")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if args.check:
        check(args.check)
        return
    if not args.topics:
        ap.error("give at least one topic, or --check")
    if not args.ref.is_file():
        sys.exit(f"reference deck not found: {args.ref} "
                 f"(put {DEFAULT_REF.name} next to this script, or pass --ref FILE.apkg)")
    if len(args.topics) > 1 and (args.name or args.category):
        ap.error("--name/--category apply to one topic at a time")
    for topic in args.topics:
        name = args.name or topic[:1].upper() + topic[1:]
        out = args.out / f"French__Expressions__{name}.apkg"
        if out.exists() and not args.force:
            sys.exit(f"{out} exists; pass --force to overwrite")
        build(topic, args.ref, out, name, args.category, topic.lower())


if __name__ == "__main__":
    main()
