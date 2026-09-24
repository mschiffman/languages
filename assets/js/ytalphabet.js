/* ---------------------------------------------------------------
   A-to-Z alphabet reader engine.
   Expects the page to define, before loading this script:
     IMG_DIR, AUD_DIR, LETTERS  (see the page's <script> block)
   Images: 01.jpg … 26.jpg (one per letter)
   Audio : 01.mp3 … 52.mp3 (letter name, then word, for each letter)
--------------------------------------------------------------- */

/* Offline single-file builds define EMBED = { "<url>": dataURI };
   online pages don't, so this falls back to the plain URL. */
const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;

const pad = (n) => String(n).padStart(2, "0");
const imgSrc = (L) =>
  media(`${IMG_DIR}${pad(LETTERS.findIndex((x) => x.L === L) + 1)}.jpg`);
const audSrc = (L, kind) => {
  const idx = LETTERS.findIndex((x) => x.L === L);
  return media(`${AUD_DIR}${pad(idx * 2 + (kind === "name" ? 1 : 2))}.mp3`);
};

const glyphEl = document.getElementById("glyph");
const wordEl = document.getElementById("word");
const imgEl = document.getElementById("kwimg");
const letterEl = document.getElementById("letter");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const playBtn = document.getElementById("play");
const playLabel = document.getElementById("playLabel");

let cur = 0;
const player = new Audio();
let active = null;
let seq = null;

function clearActive() {
  if (active) {
    active.classList.remove("playing");
    active = null;
  }
}
function setStop(on) {
  playBtn.classList.toggle("stop", on);
  playLabel.textContent = on ? "Stop" : "Play";
}
function stopAll() {
  player.pause();
  player.onended = null;
  seq = null;
  clearActive();
  setStop(false);
}
function playSrc(src) {
  player.pause();
  player.currentTime = 0;
  player.src = src;
  const p = player.play();
  if (p && p.catch) p.catch(() => {});
}

function playOne(kind, el) {
  if (seq) stopAll();
  else player.onended = clearActive;
  clearActive();
  active = el;
  el.classList.add("playing");
  playSrc(audSrc(LETTERS[cur].L, kind));
}
letterEl.addEventListener("click", () => playOne("name", letterEl));
wordEl.addEventListener("click", () => playOne("word", wordEl));
[letterEl, wordEl].forEach((el) =>
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      el.click();
    }
  }),
);

/* Play = letter name -> word */
playBtn.addEventListener("click", () => {
  if (seq) {
    stopAll();
    return;
  }
  seq = [
    ["name", letterEl],
    ["word", wordEl],
  ];
  setStop(true);
  let i = 0;
  const step = () => {
    if (!seq || i >= seq.length) {
      stopAll();
      return;
    }
    clearActive();
    const [kind, el] = seq[i];
    active = el;
    el.classList.add("playing");
    player.onended = () => {
      i++;
      step();
    };
    playSrc(audSrc(LETTERS[cur].L, kind));
  };
  step();
});

function render(i) {
  cur = Math.max(0, Math.min(LETTERS.length - 1, i));
  const { L, w } = LETTERS[cur];
  glyphEl.textContent = L + L.toLowerCase();
  wordEl.textContent = w;
  imgEl.onerror = () => {
    imgEl.replaceWith(
      Object.assign(document.createElement("div"), {
        className: "ph",
        textContent: w,
      }),
    );
  };
  imgEl.src = imgSrc(L);
  counter.textContent = `${cur + 1} / ${LETTERS.length}`;
  prevBtn.disabled = cur === 0;
  nextBtn.disabled = cur === LETTERS.length - 1;
  stopAll();
}
prevBtn.addEventListener("click", () => render(cur - 1));
nextBtn.addEventListener("click", () => render(cur + 1));
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") render(cur - 1);
  if (e.key === "ArrowRight") render(cur + 1);
});

/* swipe */
let x0 = null,
  y0 = null;
document.querySelector("main").addEventListener(
  "touchstart",
  (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  },
  { passive: true },
);
document.querySelector("main").addEventListener(
  "touchend",
  (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0,
      dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4)
      render(cur - Math.sign(dx));
    x0 = y0 = null;
  },
  { passive: true },
);

/* letter grid */
const sheet = document.getElementById("sheet");
const tiles = document.getElementById("tiles");
LETTERS.forEach((L, idx) => {
  const t = document.createElement("button");
  t.className = "tile";
  t.textContent = L.L;
  t.setAttribute("aria-label", `${L.L}, ${L.w}`);
  t.addEventListener("click", () => {
    render(idx);
    closeSheet();
  });
  tiles.appendChild(t);
});
function openSheet() {
  stopAll();
  sheet.hidden = false;
}
function closeSheet() {
  sheet.hidden = true;
}
document.getElementById("menuBtn").addEventListener("click", openSheet);
document.getElementById("closeBtn").addEventListener("click", closeSheet);
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) closeSheet();
});

render(0);