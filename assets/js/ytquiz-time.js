/* ---------------------------------------------------------------
   Clock -> type-the-time quiz engine: two (or more) answers per picture,
   e.g. "It's one twenty-seven." and "It's twenty-seven past one."
   Built from ytquiz.js (one answer per picture).

   Expects the page to define, before loading this script:
     IMG_DIR, AUD_DIR, IMG_EXT, AUD_EXT, pages   (same shape as the reader)
     ASK = ["<question>", audio#]   played when each picture opens
   and optionally:
     ALSO  = { "<answer>": ["<other form marked correct>", ...] }
     HINTS = { "<answer>": { "<near miss>": "<note shown with the answer>" } }

   Every chunk of a page is one answer, with its own input box and a 🔊
   button on its left that says it. The boxes take the answers in any order.

   Rules (graded on recall):
     - One try per box. A wrong answer is final: the correct answer is shown,
       with a short note on what went wrong.
     - ONE more try when the time is right but "It's" is missing, the
       apostrophe is missing ("Its"), the numbers are figures ("It's 1:27"),
       or the same answer is in two boxes.
     - Score = correct answers (a correct second try counts). Tapping 🔊 first
       costs nothing.
     - Case, spaces, hyphens, end punctuation and "It is" / "It's" are ignored.
   The end screen shows the score and grade, feedback by mistake type, every
   wrong answer next to the correct one, and the right answers.

   URL option:  ?order=book  keeps the book order (default: shuffled)
--------------------------------------------------------------- */
(function () {
  /* Mistake types that get one more try. */
  const SECOND_TRY = ["noIts", "apostrophe", "digits", "same"];

  /* grade bands: [lowest %, label] */
  const GRADES = [
    [100, "Perfect!"],
    [90, "Excellent!"],
    [75, "Very good!"],
    [60, "Good work!"],
    [40, "Keep going!"],
    [0, "Keep practicing!"],
  ];

  /* Offline single-file builds define EMBED = { "<url>": dataURI }. */
  const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;
  const pad = (n) => String(n).padStart(2, "0");
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const imgUrl = (pic) => media(`${IMG_DIR}${pic.img}.${IMG_EXT}`);
  const audUrl = (num) => media(`${AUD_DIR}${pad(num)}.${AUD_EXT}`);
  const byBook = (ids) => ids.slice().sort((a, b) => a - b);

  const PICS = pages.map((p, i) => ({
    id: i,
    img: p.img,
    answers: p.sentences.flat().map(([text, num]) => ({ text, audio: num })),
  }));
  const also = typeof ALSO !== "undefined" ? ALSO : {};
  const hints = typeof HINTS !== "undefined" ? HINTS : {};

  /* ---- elements ---- */
  const stage = document.querySelector(".stage");
  const counter = $("counter");
  const modeTag = $("modeTag");
  const progress = $("progress");
  const quizView = $("quiz");
  const pic = $("pic");
  const form = $("answerForm");
  const rowsBox = $("answers");
  const resultsView = $("results");
  const againBtn = $("again");
  const checkBtn = $("check");
  const checkLabel = $("checkLabel");
  const listenBtn = $("listen");

  const SPEAKER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/></svg>';
  const SPEAKER_WAVES =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>' +
    '<path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

  /* ---- answer checking ---- */
  const norm = (s) =>
    s
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[‘’`]/g, "'")
      .replace(/[-‐-―_]/g, " ")
      .replace(/[.,!?;"]/g, " ")
      .replace(/\bit\s+is\b/g, "it's")
      .replace(/\s+/g, " ")
      .trim();
  const squash = (s) => s.replace(/\s+/g, "");
  const bare = (s) => squash(s.replace(/^it'?s\b\s*/, "")); // without "It's"
  const words = (s) => s.split(" ").filter(Boolean);

  function lev(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }

  /* A small slip: every word at most one letter off ("fourty", "tree"),
     two slips at most. Whole-string distance would let "six" pass for
     "seven" in a long sentence. */
  function slip(typed, form) {
    const a = words(typed);
    const b = words(form);
    if (a.length !== b.length) return lev(squash(typed), squash(form)) <= 1;
    let total = 0;
    for (let i = 0; i < a.length; i++) {
      const d = lev(a[i], b[i]);
      if (d > 1 || (d && b[i].length < 4)) return false;
      total += d;
    }
    return total <= 2;
  }

  /* Returns { ok:true, exact } or { ok:false, type, retry, note }.
       type  = the mistake, used for the end-of-quiz feedback:
               noIts | apostrophe | digits | quarterHalf | pastTo | nearWord | spelling | other
       retry = message when the mistake gets a second try
       note  = shown with the correct answer when the answer is final */
  function judge(raw, text) {
    const typed = norm(raw);
    const forms = [text, ...(also[text] || [])].map(norm);
    if (forms.some((f) => squash(f) === squash(typed))) return { ok: true, exact: typed === forms[0] };
    const miss = (type, note, retry) => ({ ok: false, type, note, retry });

    if (/\d/.test(typed)) {
      return miss("digits", "Write the numbers in words.", "Almost! Write the numbers in <b>words</b>.");
    }
    if (forms.some((f) => bare(f) === squash(typed))) {
      return miss("noIts", "Start with <b>It's</b>.", "Almost! Start with <b>It's</b>.");
    }
    const noApos = (s) => squash(s).replace(/'/g, "");
    if (forms.some((f) => noApos(f) === noApos(typed))) {
      return miss("apostrophe", "Write <b>It's</b> with an apostrophe.", "Almost! Write <b>It's</b> with an apostrophe.");
    }
    /* the page's own near misses */
    for (const [near, note] of Object.entries(hints[text] || {})) {
      if (bare(norm(near)) === bare(typed)) return miss("nearWord", esc(note));
    }
    /* "fifteen past ten" for "a quarter past ten", "thirty past four" for "half past four" */
    const main = forms[0];
    if (/\bquarter\b/.test(main) && /\bfifteen (past|to)\b/.test(typed)) {
      return miss("quarterHalf", "15 minutes: say <b>a quarter</b>.");
    }
    if (/\bhalf\b/.test(main) && /\bthirty past\b/.test(typed)) {
      return miss("quarterHalf", "30 minutes: say <b>half past</b>.");
    }
    /* past instead of to, or the other way round */
    if (/\bto\b/.test(main) && /\bpast\b/.test(typed)) {
      return miss("pastTo", "After half past, say the minutes <b>to</b> the next hour.");
    }
    if (/\bpast\b/.test(main) && /\bto\b/.test(typed)) {
      return miss("pastTo", "Up to half past, say the minutes <b>past</b> the hour.");
    }
    if (forms.some((f) => slip(typed, f))) return miss("spelling", "Check the spelling.");
    return miss("other", "");
  }

  /* ---- audio (one reusable element; a queue for the answers) ---- */
  const player = new Audio();
  let queue = [];
  let playId = 0; // a newer play() makes the older one's rejection harmless
  function clearPlaying() {
    document.querySelectorAll(".playing").forEach((el) => el.classList.remove("playing"));
  }
  /* list = [[audio#, button or null], ...] played one after another */
  function play(list) {
    player.pause();
    queue = list.slice();
    return step();
  }
  function step() {
    clearPlaying();
    const next = queue.shift();
    if (!next) return null;
    const [num, btn] = next;
    const id = ++playId;
    player.src = audUrl(num);
    if (btn) btn.classList.add("playing");
    player.onended = step;
    const p = player.play();
    if (p && p.catch) {
      p.catch(() => {
        if (id !== playId) return;
        queue = [];
        clearPlaying();
      });
    }
    return p;
  }
  const ask = () => play([[ASK[1], listenBtn]]);

  /* Browsers block sound before the first tap: ask again on the first one. */
  let asked = false;
  function askNow() {
    const p = ask();
    asked = true;
    if (p && p.catch) p.catch(() => (asked = false));
  }
  function unlock(e) {
    if (asked || !cur || cur.done || cur.results) return;
    if (e.target.closest && e.target.closest("button")) return; // a 🔊 or Check tap plays its own sound
    askNow();
  }
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);

  /* ---- round state ---- */
  let round = []; // picture ids in play order
  let pos = 0;
  let results = {}; // id -> [{ ok, wrong: [typed...], types: Set }] per answer
  let practice = false;
  let cur = null; // { pic, boxes, done }
  const PRAISE = ["Great!", "Yes!", "Well done!", "Correct!", "Super!"];

  function order(ids) {
    const out = [...ids];
    if (new URLSearchParams(location.search).get("order") === "book") return byBook(out);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function startRound(ids, isPractice) {
    practice = isPractice;
    round = order(ids);
    pos = 0;
    results = {};
    modeTag.textContent = practice ? "Practice" : "Quiz";
    progress.innerHTML = round.map(() => "<i></i>").join("");
    progress.hidden = false;
    resultsView.hidden = true;
    quizView.hidden = false;
    stage.classList.remove("show-results");
    showItem();
  }

  function picStatus(r) {
    const right = r.filter((a) => a.ok).length;
    return right === r.length ? "correct" : right ? "half" : "wrong";
  }

  function paintProgress() {
    [...progress.children].forEach((seg, i) => {
      const r = results[round[i]];
      seg.className = r ? picStatus(r) : i === pos ? "now" : "";
    });
  }

  function say(box, kind, html) {
    box.fb.className = "feedback" + (kind ? " " + kind : "");
    box.fb.innerHTML = html || "";
  }

  function focus(input) {
    try {
      input.focus({ preventScroll: true });
    } catch (e) {
      input.focus();
    }
  }
  const openBoxes = () => cur.boxes.filter((b) => !b.done);
  function focusOpen() {
    const open = openBoxes();
    const empty = open.find((b) => !b.input.value.trim());
    if (empty || open[0]) focus((empty || open[0]).input);
  }

  function shake(input) {
    input.classList.remove("shake");
    void input.offsetWidth; // restart the animation
    input.classList.add("shake");
  }

  /* One row per answer: 🔊 on the left, then the box, feedback below.
     The rows are kept from clock to clock (same number of answers), so the
     focused box stays and the phone keyboard doesn't close. */
  let rows = [];
  function resetRows(p) {
    if (rows.length !== p.answers.length) rows = buildRows(p.answers.length);
    rows.forEach((box) => {
      Object.assign(box, { done: false, ok: false, retried: false, slot: null, wrong: [], types: new Set() });
      box.input.value = "";
      box.input.readOnly = false;
      box.input.classList.remove("right", "wrong", "shake");
      say(box, "", "");
    });
    return rows;
  }

  function buildRows(count) {
    rowsBox.innerHTML = "";
    return Array.from({ length: count }, (_, k) => {
      const row = document.createElement("div");
      row.className = "answer-row";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "say";
      btn.setAttribute("aria-label", `Listen: answer ${k + 1}`);
      btn.innerHTML = SPEAKER_WAVES;
      const input = document.createElement("input");
      input.type = "text";
      input.id = `answer${k + 1}`;
      input.setAttribute("aria-label", `Answer ${k + 1}`);
      for (const [a, v] of [
        ["autocomplete", "off"],
        ["autocorrect", "off"],
        ["autocapitalize", "off"],
        ["spellcheck", "false"],
        ["enterkeyhint", k === count - 1 ? "go" : "next"],
      ])
        input.setAttribute(a, v);
      input.placeholder = k === 0 ? "Type it here" : "Say it another way";
      const fb = document.createElement("p");
      fb.className = "feedback";
      fb.setAttribute("aria-live", "polite");
      row.append(btn, input);
      rowsBox.append(row, fb);

      const box = { k, input, btn, fb };
      btn.addEventListener("mousedown", (e) => e.preventDefault()); // keep the keyboard up
      btn.addEventListener("click", () => {
        if (!cur || cur.results) return;
        play([[cur.pic.answers[k].audio, btn]]);
        if (!box.done) focus(input);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const empty = openBoxes().find((b) => !b.input.value.trim());
        if (empty && empty !== box && box.input.value.trim()) focus(empty.input);
        else check();
      });
      return box;
    });
  }

  function showItem() {
    const p = PICS[round[pos]];
    cur = { pic: p, boxes: resetRows(p), done: false };
    pic.src = imgUrl(p);
    counter.textContent = `${pos + 1} / ${round.length}`;
    checkLabel.textContent = "Check";
    paintProgress();
    const next = PICS[round[pos + 1]];
    if (next) new Image().src = imgUrl(next);
    focus(cur.boxes[0].input);
    askNow();
  }

  /* Match the open boxes to the answers not yet taken: a box keeps its own
     answer when it is right, else takes whichever free answer it matches. */
  function assign() {
    const answers = cur.pic.answers;
    const taken = new Set(cur.boxes.filter((b) => b.done).map((b) => b.slot));
    const open = openBoxes();
    const out = new Map(); // box -> { slot, r }
    const tryClaim = (box, j) => {
      const r = judge(box.input.value, answers[j].text);
      if (r.ok) {
        taken.add(j);
        out.set(box, { slot: j, r });
      }
      return r.ok;
    };
    for (const box of open) if (!taken.has(box.k)) tryClaim(box, box.k);
    for (const box of open) {
      if (out.has(box)) continue;
      answers.some((_, j) => !taken.has(j) && tryClaim(box, j));
    }
    const free = answers.map((_, j) => j).filter((j) => !taken.has(j));
    for (const box of open) {
      if (out.has(box)) continue;
      /* already written in another box? */
      const dup = answers.some((a, j) => taken.has(j) && judge(box.input.value, a.text).ok);
      const slot = !taken.has(box.k) ? box.k : free.find((j) => ![...out.values()].some((o) => o.slot === j));
      const r = dup
        ? {
            ok: false,
            type: "same",
            note: "Write the time another way.",
            retry: "Almost! You wrote that one. Write it <b>another way</b>.",
          }
        : judge(box.input.value, answers[slot].text);
      out.set(box, { slot, r });
    }
    return out;
  }

  function check() {
    if (cur.done) return next();
    const open = openBoxes();
    const empty = open.find((b) => !b.input.value.trim());
    if (empty) {
      say(empty, "", open.length > 1 && empty === open[0] ? "Write the time two ways." : "Write the time here too.");
      return focus(empty.input);
    }
    for (const [box, { slot, r }] of assign()) {
      const answer = cur.pic.answers[slot];
      if (r.ok) {
        Object.assign(box, { done: true, ok: true, slot });
        box.input.readOnly = true;
        box.input.classList.remove("shake");
        box.input.classList.add("right");
        let html = `<span class="mark">✓</span> ${box.retried ? "Yes! Good fix." : PRAISE[Math.floor(Math.random() * PRAISE.length)]}`;
        if (!r.exact) html += ` We write: <b>${esc(answer.text)}</b>`;
        say(box, "right", html);
        continue;
      }
      const typed = box.input.value.trim().replace(/\s+/g, " ");
      if (!box.wrong.includes(typed)) box.wrong.push(typed);
      box.types.add(r.type);
      if (!box.retried && r.retry && SECOND_TRY.includes(r.type)) {
        box.retried = true;
        say(box, "almost", r.retry);
        shake(box.input);
      } else {
        Object.assign(box, { done: true, ok: false, slot });
        box.input.readOnly = true;
        box.input.classList.add("wrong");
        shake(box.input);
        say(
          box,
          "wrong",
          `<span class="mark">✗</span> <b>${esc(answer.text)}</b>` + (r.note ? `<span class="note">${r.note}</span>` : ""),
        );
      }
    }
    if (openBoxes().length) return focusOpen();
    finish();
  }

  function finish() {
    cur.done = true;
    const r = cur.pic.answers.map(() => ({ ok: false, wrong: [], types: new Set() }));
    for (const b of cur.boxes) r[b.slot] = { ok: b.ok, wrong: b.wrong, types: b.types };
    results[cur.pic.id] = r;
    checkLabel.textContent = pos === round.length - 1 ? "See results" : "Next";
    paintProgress();
    /* say the answers, each lighting up the 🔊 of the box that holds it */
    const holder = (j) => cur.boxes.find((b) => b.slot === j).btn;
    play(cur.pic.answers.map((a, j) => [a.audio, holder(j)]));
  }

  function next() {
    pos++;
    if (pos >= round.length) showResults();
    else showItem();
  }

  /* ---- results: grade, feedback, wrong vs correct, right answers ---- */
  const TIPS = [
    ["noIts", "Start with <b>It's</b>: <b>It's</b> one twenty-seven."],
    ["apostrophe", "Write <b>It's</b> with an apostrophe (It is = It's)."],
    ["digits", "Write the numbers in words."],
    ["same", "Say each time two ways: <b>one twenty-seven</b> and <b>twenty-seven past one</b>."],
    ["quarterHalf", "15 minutes is <b>a quarter</b>, 30 minutes is <b>half</b>: a quarter past ten, half past four."],
    ["pastTo", "Up to half past, use <b>past</b>. After half past, use <b>to</b> and the next hour."],
    ["nearWord", "Read the notes on these times."],
    ["spelling", "Check the spelling."],
    ["other", "Practice these times. Tap them to listen."],
  ];

  const gradeFor = (pct) => GRADES.find(([min]) => pct >= min)[1];
  const chip = (id, j) => {
    const text = PICS[id].answers[j].text;
    return `<span class="chunk" role="button" tabindex="0" data-id="${id}" data-j="${j}" aria-label="Play: ${esc(text)}">${esc(text)}</span>`;
  };

  function showResults() {
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    player.pause();
    queue = [];
    clearPlaying();
    /* every answer of the round: [picture id, answer index] */
    const all = round.flatMap((id) => PICS[id].answers.map((_, j) => [id, j]));
    const n = all.length;
    const isOk = ([id, j]) => results[id][j].ok;
    const correct = all.filter(isOk);
    const wrong = all.filter((a) => !isOk(a));
    const pct = Math.round((100 * correct.length) / n);
    const bookOrder = (list) => list.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    /* score card */
    let html =
      `<div class="score-card">` +
      `<div class="grade-label">${gradeFor(pct)}</div>` +
      `<div class="score-big">${correct.length} / ${n}</div>` +
      `<p class="score-sub"><b>${pct}%</b> correct</p>` +
      `<div class="tally">` +
      `<span class="t correct">${correct.length} correct</span>` +
      `<span class="t wrong">${wrong.length} wrong</span>` +
      `</div></div>`;

    /* feedback by mistake type (a fixed slip still gets a reminder) */
    const tips = [];
    for (const [type, text] of TIPS) {
      const hit = all.filter(([id, j]) => results[id][j].types.has(type));
      if (hit.length) tips.push({ text, hit });
    }
    html += `<section class="panel tips"><h2>Feedback</h2>`;
    if (!tips.length) {
      html += `<p class="tip-lead">You told every time without a mistake. Try again in a few days to keep it fresh.</p>`;
    } else {
      html +=
        `<p class="tip-lead">${pct >= 75 ? "Nice work! A few things to practice:" : "Here is what to practice:"}</p><ul>` +
        tips
          .map(
            (t) =>
              `<li><span class="tip-text">${t.text}</span>` +
              `<span class="tip-ex">${bookOrder(t.hit)
                .map(([id, j]) => esc(PICS[id].answers[j].text))
                .join(" · ")}</span></li>`,
          )
          .join("") +
        `</ul>`;
    }
    html += `</section>`;

    /* wrong answers next to the correct ones */
    if (wrong.length) {
      html +=
        `<section class="panel"><h2>Wrong answers <span class="count">${wrong.length}</span></h2><ul class="review">` +
        bookOrder(wrong)
          .map(([id, j]) => {
            const typed = results[id][j].wrong;
            return (
              `<li><img src="${imgUrl(PICS[id])}" alt="" />` +
              `<div class="pair"><div class="row yours"><span class="lbl">You wrote</span><span class="val">` +
              (typed.length ? typed.map((w) => `<s>${esc(w)}</s>`).join("") : "<em>(nothing)</em>") +
              `</span></div>` +
              `<div class="row correct"><span class="lbl">Correct</span><span class="val">${chip(id, j)}</span></div></div></li>`
            );
          })
          .join("") +
        `</ul></section>`;
    }

    /* right answers, one tile per clock */
    const rightPics = byBook(round.filter((id) => results[id].some((a) => a.ok)));
    if (rightPics.length) {
      html +=
        `<section class="panel"><h2>Right answers <span class="count ok">${correct.length}</span></h2>` +
        `<div class="right-grid time-grid">` +
        rightPics
          .map((id) => {
            const full = results[id].every((a) => a.ok);
            const chips = results[id].map((a, j) => (a.ok ? chip(id, j) : "")).join("");
            return (
              `<div class="tile correct"><div class="thumb"><img src="${imgUrl(PICS[id])}" alt="" />` +
              (full ? `<i class="badge">✓</i>` : "") +
              `</div>${chips}</div>`
            );
          })
          .join("") +
        `</div></section>`;
    }

    resultsView.innerHTML = html;
    resultsView.querySelectorAll(".chunk").forEach((el) => {
      const go = () => play([[PICS[+el.dataset.id].answers[+el.dataset.j].audio, el]]);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });

    const redo = round.filter((id) => results[id].some((a) => !a.ok));
    counter.textContent = practice ? "Practice done" : "Results";
    progress.hidden = true;
    quizView.hidden = true;
    resultsView.hidden = false;
    resultsView.scrollTop = 0;
    stage.classList.add("show-results");
    checkLabel.textContent = redo.length ? `Practice these (${redo.length})` : "Play again";
    cur = { done: true, results: true, redo };
  }

  /* ---- wiring ---- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    check();
  });
  checkBtn.addEventListener("click", () => {
    if (cur && cur.results) {
      if (cur.redo.length) startRound(cur.redo, true);
      else startRound(PICS.map((p) => p.id), false);
    } else check();
  });
  againBtn.addEventListener("click", () => startRound(PICS.map((p) => p.id), false));
  listenBtn.addEventListener("click", () => {
    if (!cur || cur.results) return;
    ask();
    asked = true;
    if (!cur.done) focusOpen();
  });
  /* keep the keyboard up on phones: the footer buttons don't steal focus */
  [checkBtn, listenBtn].forEach((b) => b.addEventListener("mousedown", (e) => e.preventDefault()));

  /* ---- fit the stage above the on-screen keyboard ---- */
  const vv = window.visualViewport;
  function fit() {
    stage.style.height = (vv ? vv.height : window.innerHeight) + "px";
    window.scrollTo(0, 0);
  }
  if (vv) vv.addEventListener("resize", fit);
  window.addEventListener("resize", fit);
  fit();

  startRound(
    PICS.map((p) => p.id),
    false,
  );
})();
