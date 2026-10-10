/* ---------------------------------------------------------------
   Generic expression-flashcard engine (fr/expression/n-*.html).
   Expects the page to define, before loading this script:
     AUD_DIR, AUD_EXT, categories
   (see the per-page <script> block for the data shape), plus
   <div id="cards"></div> and an optional <span id="count"></span>.
   The hamburger menu is separate (nav-expression-flash.js), so offline
   single-file builds (fr/expression/build_single.py) can leave it out.
--------------------------------------------------------------- */
(function () {
  /* Offline single-file builds define EMBED = { "<url>": dataURI };
     online pages don't, so this falls back to the plain URL. */
  const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;

  const esc = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const SPEAKER = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
  const CLIPBOARD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;

  // Audio files are numbered 01, 02, … in reading order across all categories.
  let audioNum = 0;
  const pad = (n) => String(n).padStart(2, "0");

  const card = ([fr, en, note]) => `
    <div class="card p-5 flex items-center gap-4 shadow-md">
      <button class="sound-btn" data-audio="${esc(`${AUD_DIR}${pad(++audioNum)}.${AUD_EXT}`)}" title="Play audio">${SPEAKER}</button>
      <div class="flex-1 min-w-0">
        <p class="phrase text-lg mb-1">${esc(fr)}</p>
        <p class="english">${esc(en)}</p>
      </div>
      <div class="note-wrapper" data-note="${esc(note)}">
        <button class="note-btn" title="Notes">${CLIPBOARD}</button>
      </div>
    </div>`;

  const section = (cat, i) => `
    <div class="${i ? "mt-14 " : ""}mb-6">
      <h2 class="text-3xl font-bold" style="font-family: 'Playfair Display', serif; color: white">
        ${esc(cat.en)}
        <span class="text-xl" style="color: var(--cyan); opacity: 0.85; font-style: italic">· ${esc(cat.fr)}</span>
      </h2>
      <p class="mt-1 text-sm" style="color: rgba(255, 255, 255, 0.55); font-family: 'Roboto', sans-serif">${esc(cat.desc)}</p>
      <div class="header-line w-48 mt-3"></div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${cat.cards.map(card).join("")}
    </div>`;

  document.getElementById("cards").innerHTML = categories
    .map(section)
    .join("");

  document.querySelectorAll(".sound-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      new Audio(media(btn.dataset.audio)).play();
    });
  });

  const count = document.getElementById("count");
  if (count) {
    count.textContent = categories.reduce((n, c) => n + c.cards.length, 0);
  }
})();
