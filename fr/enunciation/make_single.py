"""
Convert every HTML page under fr/enunciation into a self-contained single-file
HTML page, written to fr/enunciation/single/ (same sub-folder layout, so
relative links such as "2.html" keep working).

What gets inlined:
  - local stylesheets   <link rel="stylesheet" href="...">  ->  <style>
  - local scripts       <script src="...">                  ->  <script>
  - local media referenced from attributes (src, href, poster, data-src),
    CSS url(...) and quoted string literals in scripts      ->  data: URIs
  - JS templates that build a path from a local folder, e.g.
    `/img/enun/deck-vowel/${slide.image}`: every media file in that folder is
    embedded once in a lookup table and the template reads from it.

With --remote, CDN stylesheets/scripts (Tailwind, Bootstrap, AOS, Google
Fonts, ...) and the fonts they reference are downloaded and inlined too, so the
page works offline. Analytics tags and remote audio/video (rmlives.com mp3/mp4)
are always left as links.

The nav menus are inlined and re-pointed at the single/ copies.

Usage:
    python make_single.py                 # all pages, local assets only
    python make_single.py --remote        # also inline CDN libraries/fonts
    python make_single.py a/index.html    # only the given page(s)
"""

import argparse
import base64
import mimetypes
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

# --- CONFIGURATION ---
ENUN_DIR = Path(__file__).resolve().parent          # fr/enunciation
SITE_ROOT = ENUN_DIR.parent.parent                  # "/" in site URLs
OUT_DIR = ENUN_DIR / "single"

MEDIA_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".avif", ".bmp",
    ".mp3", ".wav", ".ogg", ".m4a", ".mp4", ".webm",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
}

# Remote scripts that must never be inlined (analytics).
REMOTE_SKIP = ("googletagmanager.com", "google-analytics.com")

# Google Fonts serves woff2 only to modern browsers.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

MIME_OVERRIDES = {
    ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2",
    ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4", ".ico": "image/x-icon", ".webp": "image/webp",
}

# The nav menus (nav-enun.js, nav-enun-flash.js) build their links from the
# "enunciation" folder in the URL. In the inlined copies, drop "single" from the
# path they parse (so the root links and the current-sound highlight still work)
# and point the enunciation links at the single/ copies. The Home link and the
# "Other French Resources" section are removed, since they lead outside single/.
NAV_SCRIPT_PREFIX = "nav-enun"
NAV_PATCHES = [
    (
        re.compile(r"const pathParts = ((?:window\.)?location\.pathname\.split\(\"/\"\)\.filter\(Boolean\));"),
        lambda m: (
            f"const __sfParts = {m.group(1)};\n"
            '  const __sfSingle = __sfParts.lastIndexOf("single");\n'
            "  const pathParts = __sfSingle > 0\n"
            "    ? __sfParts.filter((_, i) => i !== __sfSingle)\n"
            "    : __sfParts;"
        ),
    ),
    (
        re.compile(r'pathParts\.slice\(0, enunIndex \+ 1\)\.join\("/"\)\}/`'),
        lambda m: m.group(0)[:-1] + "single/`",
    ),
]

# Per-file removals: file name -> patterns whose matches are deleted.
NAV_REMOVALS = {
    "nav-enun.js": [
        # Home link
        re.compile(r'\s*<a href="\$\{homePath\}"[^>]*>.*?</a>', re.S),
        # "Other French Resources" section
        re.compile(r'\s*<div class="sidebar-section">\s*'
                   r'<div class="sidebar-section-title">Other French Resources</div>'
                   r'(?:\s*<a\b.*?</a>)*\s*</div>', re.S),
    ],
    "nav-enun-flash.js": [
        # Home link
        re.compile(r'\s*const home = document\.createElement\("a"\);.*?scroll\.appendChild\(home\);', re.S),
        # "Other French Resources" entry in SECTIONS
        re.compile(r'\s*\{\s*name: "Other French Resources",.*?\],\s*\},', re.S),
    ],
}

# Transparent 1x1 gif used as a placeholder while the lookup table fills in.
BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

BLOCK_RE = re.compile(r"(<(script|style)\b[^>]*>)(.*?)(</\2\s*>)", re.I | re.S)
ATTR_RE = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""")
CSS_URL_RE = re.compile(r"""url\(\s*(["']?)([^"')]+)\1\s*\)""", re.I)
CSS_IMPORT_RE = re.compile(r"""@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?\s*;""", re.I)
LINK_RE = re.compile(r"<link\b[^>]*>", re.I)
MARKUP_ATTR_RE = re.compile(r"""(\s(?:src|href|poster|data-src)\s*=\s*)(["'])([^"']*)\2""", re.I)
STYLE_ATTR_RE = re.compile(r"""(\sstyle\s*=\s*)(["'])(.*?)\2""", re.I | re.S)
JS_STRING_RE = re.compile(r"""(["'`])([^"'`\s<>${}]+\.[A-Za-z0-9]{2,5})\1""")
JS_TEMPLATE_RE = re.compile(r"(?<![\w.:/-])(/?(?:[\w%.-]+/)+)\$\{([^{}]+)\}")
JS_IMPORT_RE = re.compile(r"""^\s*import\b[^;]*?["'](\.{1,2}/[^"']+)["']""", re.M)

_data_uri_cache: dict[Path, str] = {}
_remote_cache: dict[str, bytes | None] = {}


def warn(msg):
    print(f"  ! {msg}", file=sys.stderr)


def parse_attrs(tag):
    return {m.group(1).lower(): next(g for g in m.groups()[1:] if g is not None)
            for m in ATTR_RE.finditer(tag)}


def remove_attr(tag, name):
    return re.sub(rf"""\s{name}\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)""", "", tag, flags=re.I)


def is_remote(url):
    return url.startswith(("http://", "https://", "//"))


def resolve_local(url, base_dir):
    """Map a site URL to a file on disk, or None if it isn't a local file."""
    if not url or is_remote(url) or url.startswith(("data:", "#", "mailto:", "javascript:", "blob:")):
        return None
    path = unquote(urlsplit(url).path)
    if not path:
        return None
    target = SITE_ROOT / path.lstrip("/") if path.startswith("/") else base_dir / path
    try:
        target = target.resolve()
    except OSError:
        return None
    return target


def mime_for(name):
    ext = Path(urlsplit(name).path).suffix.lower()
    return MIME_OVERRIDES.get(ext) or mimetypes.guess_type(name)[0] or "application/octet-stream"


def to_data_uri(data, name):
    return f"data:{mime_for(name)};base64,{base64.b64encode(data).decode('ascii')}"


def local_data_uri(path):
    if path not in _data_uri_cache:
        _data_uri_cache[path] = to_data_uri(path.read_bytes(), path.name)
    return _data_uri_cache[path]


def is_local_media(path):
    return path is not None and path.suffix.lower() in MEDIA_EXTENSIONS and path.is_file()


def fetch_remote(url):
    if url.startswith("//"):
        url = "https:" + url
    if url not in _remote_cache:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                _remote_cache[url] = resp.read()
        except Exception as exc:  # network errors, 404s, ...
            warn(f"could not fetch {url}: {exc}")
            _remote_cache[url] = None
    return _remote_cache[url]


def escape_script(text):
    return re.sub(r"</(script)", r"<\\/\1", text, flags=re.I)


class PageInliner:
    def __init__(self, html_path, remote):
        self.html_path = html_path
        self.base_dir = html_path.parent
        self.remote = remote
        self.asset_map: dict[str, str] = {}   # key used in JS -> data URI
        self.asset_keys: dict[Path, str] = {} # file -> key, for static <img> dedupe

    # ---------- CSS ----------
    def inline_css(self, css, base_dir=None, base_url=None):
        """Rewrite url(...) and @import in CSS. base_url is set for remote CSS."""
        def import_repl(m):
            href = m.group(1)
            if base_url or is_remote(href):
                full = urljoin(base_url or "", href)
                if not self.remote:
                    return m.group(0)
                data = fetch_remote(full)
                return self.inline_css(data.decode("utf-8", "replace"), base_url=full) if data else m.group(0)
            path = resolve_local(href, base_dir)
            if path and path.is_file():
                return self.inline_css(path.read_text(encoding="utf-8-sig"), base_dir=path.parent)
            return m.group(0)

        def url_repl(m):
            ref = m.group(2).strip()
            if ref.startswith(("data:", "#")):
                return m.group(0)
            if base_url or is_remote(ref):
                if not self.remote:
                    return m.group(0)
                full = urljoin(base_url or "", ref)
                data = fetch_remote(full)
                return f'url("{to_data_uri(data, full)}")' if data else m.group(0)
            path = resolve_local(ref, base_dir)
            if is_local_media(path):
                return f'url("{local_data_uri(path)}")'
            return m.group(0)

        css = CSS_IMPORT_RE.sub(import_repl, css)
        return CSS_URL_RE.sub(url_repl, css)

    # ---------- JS ----------
    def inline_js(self, js):
        for m in JS_IMPORT_RE.finditer(js):
            warn(f"{self.html_path.name}: module import '{m.group(1)}' is not bundled")

        def template_repl(m):
            prefix, expr = m.group(1), m.group(2)
            folder = resolve_local(prefix, self.base_dir)
            if folder is None or not folder.is_dir():
                return m.group(0)
            files = [f for f in sorted(folder.iterdir()) if is_local_media(f)]
            if not files:
                return m.group(0)
            for f in files:
                key = prefix + f.name
                self.asset_map[key] = local_data_uri(f)
                self.asset_keys[f.resolve()] = key
            return f'${{__sfAsset("{prefix}" + ({expr}))}}'

        def string_repl(m):
            quote, ref = m.group(1), m.group(2)
            path = resolve_local(ref, self.base_dir)
            if not is_local_media(path):
                return m.group(0)
            return f"{quote}{local_data_uri(path)}{quote}"

        js = JS_TEMPLATE_RE.sub(template_repl, js)
        return JS_STRING_RE.sub(string_repl, js)

    def patch_nav(self, js, name):
        for pattern, repl in NAV_PATCHES:
            js, n = pattern.subn(repl, js, count=1)
            if not n:
                warn(f"{name}: nav patch did not apply ({pattern.pattern[:40]}...)")
        for pattern in NAV_REMOVALS.get(name, []):
            js, n = pattern.subn("", js, count=1)
            if not n:
                warn(f"{name}: nav removal did not apply ({pattern.pattern[:40]}...)")
        return js

    def process_script(self, open_tag, body):
        src = parse_attrs(open_tag).get("src")
        if src:
            if is_remote(src):
                if not self.remote or any(s in src for s in REMOTE_SKIP):
                    return open_tag, body
                data = fetch_remote(src)
                if data is None:
                    return open_tag, body
                return remove_attr(open_tag, "src"), escape_script(data.decode("utf-8", "replace"))
            path = resolve_local(src, self.base_dir)
            if path is None or not path.is_file():
                warn(f"{self.html_path.name}: script not found: {src}")
                return open_tag, body
            body = path.read_text(encoding="utf-8-sig")
            if path.name.startswith(NAV_SCRIPT_PREFIX):
                body = self.patch_nav(body, path.name)
            open_tag = remove_attr(open_tag, "src")
        return open_tag, escape_script(self.inline_js(body))

    # ---------- markup ----------
    def link_to_style(self, m):
        tag = m.group(0)
        attrs = parse_attrs(tag)
        rels = attrs.get("rel", "").lower().split()
        href = attrs.get("href", "")
        if "stylesheet" not in rels or not href:
            return tag
        media = f' media="{attrs["media"]}"' if "media" in attrs else ""
        if is_remote(href):
            if not self.remote:
                return tag
            data = fetch_remote(href)
            if data is None:
                return tag
            full = "https:" + href if href.startswith("//") else href
            css = self.inline_css(data.decode("utf-8", "replace"), base_url=full)
        else:
            path = resolve_local(href, self.base_dir)
            if path is None or not path.is_file():
                warn(f"{self.html_path.name}: stylesheet not found: {href}")
                return tag
            css = self.inline_css(path.read_text(encoding="utf-8-sig"), base_dir=path.parent)
        return f"<style{media}>\n{css}\n</style>"

    def attr_to_data(self, m):
        prefix, quote, ref = m.groups()
        path = resolve_local(ref, self.base_dir)
        if not is_local_media(path):
            return m.group(0)
        key = self.asset_keys.get(path)
        if key:  # already in the JS lookup table: load from there, don't embed twice
            return f'{prefix}{quote}{BLANK_GIF}{quote} data-sf-src={quote}{key}{quote}'
        return f"{prefix}{quote}{local_data_uri(path)}{quote}"

    def process_markup(self, html):
        html = LINK_RE.sub(self.link_to_style, html)
        html = STYLE_ATTR_RE.sub(
            lambda m: m.group(1) + m.group(2) + self.inline_css(m.group(3), base_dir=self.base_dir) + m.group(2),
            html)
        return MARKUP_ATTR_RE.sub(self.attr_to_data, html)

    # ---------- page ----------
    def asset_script(self):
        entries = ",\n".join(f"  {k!r}: {v!r}" for k, v in self.asset_map.items())
        return (
            "<script>\n"
            f"window.__sfAssets = {{\n{entries}\n}};\n"
            "window.__sfAsset = (p) => window.__sfAssets[p] || p;\n"
            'document.addEventListener("DOMContentLoaded", () => {\n'
            '  document.querySelectorAll("[data-sf-src]").forEach((el) => {\n'
            "    el.src = __sfAsset(el.dataset.sfSrc);\n"
            "  });\n"
            "});\n"
            "</script>\n"
        )

    def run(self):
        html = self.html_path.read_text(encoding="utf-8-sig")

        # Split into markup and <script>/<style> blocks, then handle scripts first
        # so the JS lookup table is known before static <img> tags are rewritten.
        parts, pos = [], 0
        for m in BLOCK_RE.finditer(html):
            parts.append(["markup", html[pos:m.start()]])
            parts.append([m.group(2).lower(), m.group(1), m.group(3), m.group(4)])
            pos = m.end()
        parts.append(["markup", html[pos:]])

        for part in parts:
            if part[0] == "script":
                part[1], part[2] = self.process_script(part[1], part[2])
        for part in parts:
            if part[0] == "style":
                part[2] = self.inline_css(part[2], base_dir=self.base_dir)
            elif part[0] == "markup":
                part[1] = self.process_markup(part[1])

        out = "".join(p[1] if p[0] == "markup" else p[1] + p[2] + p[3] for p in parts)
        if self.asset_map:
            out = re.sub(r"(<head\b[^>]*>)", lambda m: m.group(1) + "\n" + self.asset_script(),
                         out, count=1, flags=re.I)
        return out


def find_pages(args):
    if args:
        return [Path(a).resolve() for a in args]
    return sorted(p for p in ENUN_DIR.rglob("*.html") if OUT_DIR not in p.parents)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pages", nargs="*", help="specific HTML files (default: all under fr/enunciation)")
    parser.add_argument("--remote", action="store_true",
                        help="also download and inline CDN stylesheets, scripts and fonts")
    args = parser.parse_args()
    # Folder names are IPA symbols; the Windows console defaults to cp1252.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    pages = find_pages(args.pages)
    print(f"Converting {len(pages)} page(s) into {OUT_DIR}\n")
    for page in pages:
        rel = page.relative_to(ENUN_DIR)
        out_path = OUT_DIR / rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(PageInliner(page, args.remote).run(), encoding="utf-8")
        size = out_path.stat().st_size / 1024
        print(f"  {rel.as_posix():30} {size:9.0f} KB")
    print("\nDone.")


if __name__ == "__main__":
    main()
