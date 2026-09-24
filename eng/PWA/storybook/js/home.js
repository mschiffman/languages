/* ===================================================================
   Home - builds the shelf, tracks progress, saves stories offline.
   =================================================================== */

const shelf = document.getElementById("shelf");
const netdot = document.getElementById("netdot");

/* ---- reading progress, kept on the tablet ---- */
function readPage(id) {
  const v = parseInt(localStorage.getItem(`page:${id}`) || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

/* ---- which media is already in the offline cache ---- */
let cachedSet = new Set();
async function loadCachedSet() {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open("storybook-media");
    const keys = await cache.keys();
    cachedSet = new Set(keys.map((r) => new URL(r.url).pathname));
  } catch (e) {
    /* cache not ready yet - the buttons simply show "Save for offline" */
  }
}

function pathOf(rel) {
  return new URL(rel, location.href).pathname;
}

function savedCount(story) {
  return mediaUrlsOf(story).filter((u) => cachedSet.has(pathOf(u))).length;
}

/* ---- icons ---- */
const ICON_SAVE = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3v12m0 0 4-4m-4 4-4-4" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round"/></svg>`;
const ICON_DONE = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="m4 12.5 5.2 5.2L20 7" stroke="currentColor" stroke-width="2.6"
        stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---- build one card ---- */
function cardFor(story) {
  const t = story.theme;
  const total = story.pages.length;
  const done = Math.min(readPage(story.id) + 1, total);
  const started = readPage(story.id) > 0;
  const chunks = chunksOf(story).length;

  const li = document.createElement("li");
  li.className = "card";
  li.style.cssText = `
    --ink:${t.ink}; --ink-soft:${t.inkSoft}; --accent:${t.accent};
    --accent-deep:${t.accentDeep}; --tap-tint:${t.tapTint};
    --paper-edge:${t.paperEdge}; --sky:${t.sky}; --hill-deep:${t.hillDeep};`;

  li.innerHTML = `
    <a class="card-link" href="story.html?id=${encodeURIComponent(story.id)}">
      <div class="card-cover">${coverSVG(story)}</div>
      <div class="card-body">
        <h2>${story.title}</h2>
        <p>${story.blurb}</p>
        <div class="card-meta">
          <span>${started ? `Page ${done} of ${total}` : `${total} pages`}</span>
          <span class="bar"><i style="width:${
            started ? Math.round((done / total) * 100) : 0
          }%"></i></span>
        </div>
      </div>
    </a>
    <div class="card-foot">
      <button class="save" type="button"></button>
    </div>`;

  /* a real cover photo replaces the drawing when one exists */
  const coverBox = li.querySelector(".card-cover");
  const probe = new Image();
  probe.onload = () => {
    coverBox.innerHTML = "";
    probe.alt = "";
    coverBox.appendChild(probe);
  };
  probe.src = `media/${story.id}/cover.${IMG_EXT}`;

  /* ---- save for offline ---- */
  const btn = li.querySelector(".save");
  const total_files = mediaUrlsOf(story).length;

  function paint(state, text) {
    btn.className = `save ${state}`;
    btn.innerHTML =
      (state === "saved" ? ICON_DONE : state === "busy" ? "" : ICON_SAVE) +
      `<span>${text}</span>`;
    btn.disabled = state === "busy";
  }

  function refresh() {
    const have = savedCount(story);
    if (have >= total_files) paint("saved", "Saved on this tablet");
    else if (have > 0) paint("", `Finish saving (${have}/${total_files})`);
    else paint("", `Save for offline`);
  }
  refresh();

  btn.addEventListener("click", async () => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      paint("", "Reload the page first");
      return;
    }
    paint("busy", "Saving 0%");
    const result = await saveStory(story, (done_, total_) =>
      paint("busy", `Saving ${Math.round((done_ / total_) * 100)}%`),
    );
    await loadCachedSet();
    if (result.ok === 0) {
      paint("", "No media files found yet");
      setTimeout(refresh, 2600);
    } else {
      refresh();
      if (result.ok < result.total) {
        btn.querySelector("span").textContent = `Saved ${result.ok} of ${
          result.total
        } files`;
      }
    }
  });

  return li;
}

/* ---- ask the service worker to download a story's media ---- */
function saveStory(story, onProgress) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "progress") onProgress(d.done, d.total);
      if (d.type === "complete") resolve(d);
    };
    navigator.serviceWorker.controller.postMessage(
      { type: "CACHE_STORY", id: story.id, urls: mediaUrlsOf(story) },
      [channel.port2],
    );
  });
}

/* ---- render ---- */
async function render() {
  await loadCachedSet();
  shelf.innerHTML = "";
  STORIES.forEach((s) => shelf.appendChild(cardFor(s)));
}
render();

/* redraw progress when coming back from a story */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) render();
});

/* ---- online / offline badge ---- */
function net() {
  const off = !navigator.onLine;
  netdot.classList.toggle("off", off);
  netdot.textContent = off ? "Offline" : "Online";
}
addEventListener("online", net);
addEventListener("offline", net);
net();

/* ---- install prompt ---- */
let deferred = null;
const installBtn = document.getElementById("install");
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  installBtn.hidden = true;
});
addEventListener("appinstalled", () => {
  installBtn.hidden = true;
});

/* ---- service worker ---- */
if (navigator.serviceWorker) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      document.getElementById("footnote").textContent =
        "Offline saving needs this page served over https.";
    });
  });
}
