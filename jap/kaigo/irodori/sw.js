/* =====================================================================
   SERVICE WORKER

   Two caches, deliberately separate:

     kaigo-shell-v7   the app itself. Small. Cached on install.
     kaigo-audio-v1   lesson audio. Never touched here — the page adds
                      and removes entries only when the learner taps
                      Save or Delete.

   That split is the whole point: nothing large is ever downloaded
   without the learner asking for it and seeing the size first.

   Bump SHELL when you change index.html or lessons.js, or returning
   visitors will keep the old copy.
   ===================================================================== */

var SHELL = "kaigo-shell-v7";
var AUDIO = "kaigo-audio-v1";

var SHELL_FILES = [
  "./",
  "index.html",
  "lessons.js",
  "manifest.json",
  "fonts/NotoSansMyanmar-subset.woff2",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      /* Added one by one: a missing optional file (the font subset,
         before you drop it in) must not fail the whole install. */
      return Promise.all(
        SHELL_FILES.map(function (url) {
          return cache.add(url).catch(function () {});
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== SHELL && key !== AUDIO) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var request = event.request;

  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Audio: cache-only-if-saved. A range request for a sprite offset
     will not match a cached full response, so serve the cached body
     directly and let the media element seek within it. */
  if (url.pathname.indexOf("/audio/") !== -1) {
    event.respondWith(
      caches.open(AUDIO).then(function (cache) {
        return cache.match(request, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          return fetch(request);
        });
      })
    );
    return;
  }

  /* Shell: cache first, refresh in the background. */
  event.respondWith(
    caches.match(request).then(function (hit) {
      var network = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(SHELL).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return hit;
        });

      return hit || network;
    })
  );
});
