/* ===================================================================
   Storybook service worker
   - the app itself is cached on first visit and then always works offline
   - pictures and recordings are cached the first time they are used,
     or all at once from the "Save for offline" button on the home page
   Bump SHELL_VERSION after you change any app file.
   =================================================================== */

const SHELL_VERSION = "storybook-shell-v1";
const MEDIA_CACHE = "storybook-media";
const FONT_CACHE = "storybook-fonts";

const SHELL = [
  "./",
  "index.html",
  "story.html",
  "css/app.css",
  "js/stories.js",
  "js/covers.js",
  "js/home.js",
  "js/reader.js",
  "manifest.webmanifest",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
];

/* ---------- install ---------- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

/* ---------- activate ---------- */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("storybook-shell-") &&
              k !== SHELL_VERSION,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ---------- helpers ---------- */
const isMedia = (url) =>
  url.pathname.includes("/media/") ||
  /\.(mp3|m4a|ogg|wav|jpg|jpeg|png|webp|gif|svg)$/i.test(url.pathname);

const isFont = (url) =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

/* ---------- fetch ---------- */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* pages: serve from cache, ignoring ?id=... so every story opens offline */
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) {
          refresh(req);
          return cached;
        }
        try {
          return await fetch(req);
        } catch (err) {
          return (
            (await caches.match("index.html")) ||
            new Response("Offline", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  /* fonts from Google: use the copy we have, refresh it quietly when online */
  if (isFont(url)) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return hit || (await net) || new Response("", { status: 504 });
      })(),
    );
    return;
  }

  /* pictures and recordings: cache first, keep whatever we fetch */
  if (isMedia(url) && url.origin === location.origin) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(MEDIA_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          /* a real 404 lets the page show its friendly placeholder */
          return new Response("", { status: 404, statusText: "Not cached" });
        }
      })(),
    );
    return;
  }

  /* app files: cache first, refresh in the background */
  if (url.origin === location.origin) {
    e.respondWith(
      (async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) {
          refresh(req);
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cache = await caches.open(SHELL_VERSION);
            cache.put(req, res.clone());
          }
          return res;
        } catch (err) {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }
});

/* quietly pick up a newer copy for next time */
function refresh(req) {
  fetch(req)
    .then((res) => {
      if (res && res.ok) caches.open(SHELL_VERSION).then((c) => c.put(req, res));
    })
    .catch(() => {});
}

/* ---------- messages from the home page ---------- */
self.addEventListener("message", (e) => {
  const data = e.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_STORY") {
    const port = e.ports && e.ports[0];
    e.waitUntil(downloadStory(data.urls || [], port));
  }
});

async function downloadStory(urls, port) {
  const cache = await caches.open(MEDIA_CACHE);
  const total = urls.length;
  let done = 0;
  let ok = 0;

  for (const url of urls) {
    try {
      const hit = await cache.match(url);
      if (hit) {
        ok++;
      } else {
        const res = await fetch(url, { cache: "no-cache" });
        if (res && res.ok) {
          await cache.put(url, res.clone());
          ok++;
        }
      }
    } catch (err) {
      /* a missing file is fine - the story still reads without it */
    }
    done++;
    if (port) port.postMessage({ type: "progress", done, total });
  }

  if (port) port.postMessage({ type: "complete", ok, total });
}
