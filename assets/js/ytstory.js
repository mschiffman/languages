/* ---------------------------------------------------------------
   Generic YouTube-story reader engine.
   Expects the page to define, before loading this script:
     IMG_DIR, AUD_DIR, IMG_EXT, AUD_EXT, pages
   (see the per-story <script> block for the data shape)
--------------------------------------------------------------- */

/* Offline single-file builds define EMBED = { "<url>": dataURI };
   online pages don't, so this falls back to the plain URL. */
const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;

const pad = (n) => String(n).padStart(2, "0");
const track = document.getElementById("track");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const playBtn = document.getElementById("playPage");
const playLabel = document.getElementById("playLabel");

let current = 0;

/* ---- build the pages ---- */
pages.forEach((page, i) => {
  const el = document.createElement("section");
  el.className = "leaf-page";

  const art = document.createElement("div");
  art.className = "art";
  const img = new Image();
  img.src = media(`${IMG_DIR}${page.img}.${IMG_EXT}`);
  img.alt = `Illustration for page ${i + 1}`;
  img.onerror = () => {
    art.innerHTML = `<div class="missing"><b>${page.img}.${IMG_EXT}</b>illustration goes here</div>`;
  };
  art.appendChild(img);
  el.appendChild(art);

  const read = document.createElement("div");
  read.className = "read";
  page.sentences.forEach((sentence, si) => {
    const p = document.createElement("p");
    p.className = "sentence";
    // optional 1., 2. … before each sentence (page.numbered), matching labels in the picture
    if (page.numbered) {
      const n = document.createElement("span");
      n.className = "num";
      n.textContent = `${si + 1}.`;
      n.setAttribute("aria-hidden", "true");
      p.appendChild(n);
    }
    sentence.forEach(([text, num]) => {
      const span = document.createElement("span");
      span.className = "chunk";
      span.textContent = text;
      span.dataset.audio = pad(num);
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
    // optional translation line under the sentence (page.tr[i], see TRANSLATION)
    const tr = page.tr && page.tr[si];
    if (tr) {
      const t = document.createElement("p");
      t.className = page.numbered ? "tr numbered-tr" : "tr";
      if (typeof TRANSLATION !== "undefined") t.lang = TRANSLATION.lang;
      t.textContent = tr;
      read.appendChild(t);
    }
  });
  el.appendChild(read);
  track.appendChild(el);
});

/* ---- translation toggle ----
   A page that defines TRANSLATION = { lang: "my", label: "မြန်မာ" } and gives
   its pages a tr: [...] list (one line per sentence) gets a footer button that
   shows/hides the lines. Off by default; the choice is remembered per language. */
if (typeof TRANSLATION !== "undefined" && pages.some((p) => p.tr)) {
  const stage = document.querySelector(".stage");
  stage.classList.add("has-tr");
  const key = `ytstory-tr-${TRANSLATION.lang}`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tr-toggle";
  btn.lang = TRANSLATION.lang;
  btn.textContent = TRANSLATION.label;
  btn.setAttribute("aria-label", `Show translation (${TRANSLATION.label})`);
  const setTr = (on) => {
    stage.classList.toggle("show-tr", on);
    btn.setAttribute("aria-pressed", String(on));
    try {
      localStorage.setItem(key, on ? "1" : "0");
    } catch (e) {}
  };
  let saved = false;
  try {
    saved = localStorage.getItem(key) === "1";
  } catch (e) {}
  setTr(saved);
  btn.addEventListener("click", () =>
    setTr(!stage.classList.contains("show-tr")),
  );
  playBtn.after(btn);
}

/* ---- audio engine (single reusable element) ---- */
const player = new Audio();
let activeChunk = null;
let sequence = null; // array of chunk elements when playing a whole page

function clearActive() {
  if (activeChunk) {
    activeChunk.classList.remove("playing");
    activeChunk = null;
  }
}
function stopAll() {
  player.pause();
  player.onended = null;
  sequence = null;
  clearActive();
  setPlayButton(false);
}
function playFile(num) {
  player.pause();
  player.currentTime = 0;
  player.src = media(`${AUD_DIR}${num}.${AUD_EXT}`);
  const p = player.play();
  if (p && p.catch) p.catch(() => {}); // ignore if file not present yet
}
function playChunk(span) {
  if (sequence)
    stopAll(); // a single tap cancels page-playback
  else {
    player.onended = clearActive;
  }
  clearActive();
  activeChunk = span;
  span.classList.add("playing");
  playFile(span.dataset.audio);
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
  const step = () => {
    if (!sequence || idx >= sequence.length) {
      stopAll();
      return;
    }
    clearActive();
    activeChunk = sequence[idx];
    activeChunk.classList.add("playing");
    activeChunk.scrollIntoView({ block: "nearest", behavior: "smooth" });
    player.onended = () => {
      idx++;
      step();
    };
    playFile(sequence[idx].dataset.audio);
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
}
prevBtn.addEventListener("click", () => goTo(current - 1));
nextBtn.addEventListener("click", () => goTo(current + 1));
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") goTo(current - 1);
  if (e.key === "ArrowRight") goTo(current + 1);
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

goTo(0);
