/* ===================================================================
   Reader - one story, page by page, tap a phrase to hear it.
   =================================================================== */

const params = new URLSearchParams(location.search);
const story = storyById(params.get("id"));

if (!story) {
  location.replace("index.html");
}

const pages = story.pages;
const DIR = `media/${story.id}/`;
const LEGACY = ""; /* files left in the root folder still work */

const track = document.getElementById("track");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const playBtn = document.getElementById("playPage");
const playLabel = document.getElementById("playLabel");

/* ---- dress the page in this story's colours ---- */
(function theme() {
  const t = story.theme;
  const r = document.documentElement.style;
  r.setProperty("--paper", t.paper);
  r.setProperty("--paper-edge", t.paperEdge);
  r.setProperty("--ink", t.ink);
  r.setProperty("--ink-soft", t.inkSoft);
  r.setProperty("--tap", t.tap);
  r.setProperty("--tap-tint", t.tapTint);
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-deep", t.accentDeep);
  r.setProperty("--hill-deep", t.hillDeep);
  document.title = story.title;
  document.getElementById("title").textContent = story.title;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.ink);
})();

let current = 0;

/* ---- build the pages ---- */
pages.forEach((page, i) => {
  const el = document.createElement("section");
  el.className = "leaf-page";

  const art = document.createElement("div");
  art.className = "art";
  const img = new Image();
  let triedLegacy = false;
  img.src = `${DIR}${page.img}.${IMG_EXT}`;
  img.alt = `Picture for page ${i + 1} of ${story.title}`;
  img.onerror = () => {
    if (!triedLegacy) {
      triedLegacy = true;
      img.src = `${LEGACY}${page.img}.${IMG_EXT}`;
      return;
    }
    art.innerHTML = `<div class="missing"><b>${page.img}.${IMG_EXT}</b>picture goes here</div>`;
  };
  art.appendChild(img);
  el.appendChild(art);

  const read = document.createElement("div");
  read.className = "read";
  page.sentences.forEach((sentence) => {
    const p = document.createElement("p");
    p.className = "sentence";
    sentence.forEach(([text, num]) => {
      const span = document.createElement("span");
      span.className = "chunk";
      span.textContent = text;
      span.dataset.audio = pad2(num);
      span.setAttribute("role", "button");
      span.setAttribute("tabindex", "0");
      span.setAttribute("aria-label", `Play: ${text}`);
      span.addEventListener("click", () => playChunk(span));
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playChunk(span);
        }
      });
      p.appendChild(span);
    });
    read.appendChild(p);
  });
  el.appendChild(read);
  track.appendChild(el);
});

/* ---- audio engine (one reusable element) ---- */
const player = new Audio();
player.preload = "auto";
let activeChunk = null;
let sequence = null; /* the queue when playing a whole page */
let onFail = null; /* what to do when a file will not play */

player.addEventListener("error", () => {
  if (onFail) onFail();
});

function clearActive() {
  if (activeChunk) {
    activeChunk.classList.remove("playing");
    activeChunk = null;
  }
}
function stopAll() {
  player.pause();
  player.onended = null;
  onFail = null;
  sequence = null;
  clearActive();
  setPlayButton(false);
}

/* plays num.mp3, falling back to a copy left in the root folder */
function playFile(num, whenMissing) {
  let triedLegacy = false;
  player.pause();
  try {
    player.currentTime = 0;
  } catch (e) {}
  onFail = () => {
    if (!triedLegacy) {
      triedLegacy = true;
      player.src = `${LEGACY}${num}.${AUD_EXT}`;
      player.play().catch(() => {});
      return;
    }
    onFail = null;
    if (whenMissing) whenMissing();
  };
  player.src = `${DIR}${num}.${AUD_EXT}`;
  const p = player.play();
  if (p && p.catch) p.catch(() => {});
}

function playChunk(span) {
  if (sequence) stopAll();
  clearActive();
  activeChunk = span;
  span.classList.add("playing");
  player.onended = clearActive;
  /* if there is no recording yet, let the highlight fade on its own */
  playFile(span.dataset.audio, () => setTimeout(clearActive, 700));
}

/* ---- play the whole page in order ---- */
function setPlayButton(playing) {
  playBtn.classList.toggle("stopmode", playing);
  playLabel.textContent = playing ? "Stop" : "Play page";
  playBtn.setAttribute("aria-label", playing ? "Stop" : "Play this page");
}

function playPage() {
  if (sequence) {
    stopAll();
    return;
  }
  const chunks = [...track.children[current].querySelectorAll(".chunk")];
  if (!chunks.length) return;
  sequence = chunks;
  setPlayButton(true);
  let idx = 0;

  const advance = () => {
    idx++;
    step();
  };
  const step = () => {
    if (!sequence || idx >= sequence.length) {
      stopAll();
      return;
    }
    clearActive();
    activeChunk = sequence[idx];
    activeChunk.classList.add("playing");
    activeChunk.scrollIntoView({ block: "nearest", behavior: "smooth" });
    player.onended = advance;
    /* a missing recording should not stall the whole page */
    playFile(sequence[idx].dataset.audio, () => {
      if (sequence) setTimeout(advance, 650);
    });
  };
  step();
}
playBtn.addEventListener("click", playPage);

/* ---- navigation ---- */
function goTo(i) {
  current = Math.max(0, Math.min(pages.length - 1, i));
  track.style.transform = `translateX(-${current * 100}%)`;
  counter.textContent = `${current + 1} / ${pages.length}`;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === pages.length - 1;
  stopAll();
  try {
    localStorage.setItem(`page:${story.id}`, String(current));
  } catch (e) {}
}
prevBtn.addEventListener("click", () => goTo(current - 1));
nextBtn.addEventListener("click", () => goTo(current + 1));

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") goTo(current - 1);
  if (e.key === "ArrowRight") goTo(current + 1);
  if (e.key === "Escape") location.href = "index.html";
});

/* ---- touch swipe ---- */
let x0 = null,
  y0 = null;
track.addEventListener(
  "touchstart",
  (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  },
  { passive: true },
);
track.addEventListener(
  "touchend",
  (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0,
      dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      goTo(current - Math.sign(dx));
    }
    x0 = y0 = null;
  },
  { passive: true },
);

/* stop the audio when the tablet is put down or the Home button is used */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopAll();
});

/* ---- keep the screen awake while reading ---- */
let lock = null;
async function keepAwake() {
  if (!("wakeLock" in navigator)) return;
  try {
    lock = await navigator.wakeLock.request("screen");
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") keepAwake();
});
keepAwake();

/* ---- open where the reader left off, or start again if finished ---- */
const saved = parseInt(localStorage.getItem(`page:${story.id}`) || "0", 10);
const resume =
  Number.isFinite(saved) && saved > 0 && saved < pages.length - 1 ? saved : 0;
goTo(resume);

/* ---- service worker ---- */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
