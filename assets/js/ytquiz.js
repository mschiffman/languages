/* ---------------------------------------------------------------
   Picture -> type-the-answer quiz engine (vocabulary sets).

   Expects the page to define, before loading this script:
     IMG_DIR, AUD_DIR, IMG_EXT, AUD_EXT, pages   (same shape as the reader)
   and optionally:
     ALSO  = { "<answer>": ["<other form marked correct>", ...] }
     HINTS = { "<answer>": { "<near miss>": "<note shown with the answer>" } }

   The answer for each picture is the LAST chunk of its page, so a reader's
   pages array can be pasted in unchanged (the quiz pages only list the answers,
   which keeps the offline file small).

   Rules (graded on recall):
     - The only clue is the audio cue (🔊), which says the answer.
     - One answer per picture. A wrong answer is final: the correct answer is
       shown and played, with a short note on what went wrong.
     - Exception: the word is right but "a"/"an" is missing or wrong
       ("eraser", "a eraser") -> "Almost! Add a or an." and ONE more try.
     - Score = correct answers (a correct second try counts). Tapping 🔊 first
       costs nothing (set LISTEN_COUNTS_AS_HELP to make it cost the point).
   The end screen shows the score and grade, feedback by mistake type, every
   wrong answer next to the correct one, and the right answers.

   URL option:  ?order=book  keeps the book order (default: shuffled)
--------------------------------------------------------------- */
(function () {
  /* Mistake types that get one more try. Add "spelling" (small slip) or
     "measure" ("scissors" for "a pair of scissors") to allow a retry for those too. */
  const SECOND_TRY = ["noArticle", "wrongArticle"];

  /* true  = an answer typed after tapping 🔊 is right but doesn't score.
     false = listening first is allowed and still scores (dictation mode). */
  const LISTEN_COUNTS_AS_HELP = false;

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
  const imgUrl = (item) => media(`${IMG_DIR}${item.img}.${IMG_EXT}`);
  const audUrl = (item) => media(`${AUD_DIR}${pad(item.audio)}.${AUD_EXT}`);
  const byBook = (ids) => ids.slice().sort((a, b) => a - b);

  const ITEMS = pages.map((p, i) => {
    const chunks = p.sentences.flat();
    const [text, num] = chunks[chunks.length - 1];
    return { id: i, img: p.img, answer: text, audio: num };
  });
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
  const input = $("answer");
  const feedback = $("feedback");
  const resultsView = $("results");
  const againBtn = $("again");
  const checkBtn = $("check");
  const checkLabel = $("checkLabel");
  const listenBtn = $("listen");

  /* ---- answer checking ---- */
  const norm = (s) =>
    s
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[‘’`]/g, "'")
      .replace(/[-‐-―_]/g, " ")
      .replace(/[.,!?;:"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const split = (s) => {
    const m = s.match(/^(a|an)\s+(.+)$/);
    return m ? { art: m[1], noun: m[2] } : { art: "", noun: s };
  };
  const squash = (s) => s.replace(/\s+/g, "");

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

  /* Returns { ok:true, exact } or { ok:false, type, retry, note }.
       type  = the mistake, used for the end-of-quiz feedback:
               noArticle | wrongArticle | measure | partial | nearWord | spelling | other
       retry = message when the mistake gets a second try
       note  = shown with the correct answer when the answer is final */
  function judge(raw, item) {
    const typed = norm(raw);
    const u = split(typed);
    const forms = [item.answer, ...(also[item.answer] || [])].map(norm);
    const main = split(forms[0]);

    for (const f of forms) {
      const a = split(f);
      if (u.art === a.art && squash(u.noun) === squash(a.noun)) {
        return { ok: true, exact: typed === forms[0] };
      }
    }
    const miss = (type, note, retry) => ({ ok: false, type, note, retry });

    /* right word, a / an missing or wrong */
    for (const f of forms) {
      if (squash(u.noun) === squash(split(f).noun)) {
        return u.art
          ? miss("wrongArticle", "Use <b>an</b> before a vowel sound, <b>a</b> before other sounds.", "Almost! <b>a</b> or <b>an</b>?")
          : miss("noArticle", "Don't forget <b>a</b> or <b>an</b>.", "Almost! Add <b>a</b> or <b>an</b>.");
      }
    }
    /* the page's own near misses ("a book" for the dictionary, "a rubber" ...) */
    for (const [near, note] of Object.entries(hints[item.answer] || {})) {
      if (squash(split(norm(near)).noun) === squash(u.noun)) return miss("nearWord", esc(note));
    }
    /* "scissors" for "a pair of scissors" */
    const m = main.noun.match(/^(\w+) of (.+)$/);
    if (m && squash(u.noun) === squash(m[2])) {
      return miss("measure", `Don't forget <b>${esc(main.art)} ${esc(m[1])} of</b>.`);
    }
    /* part of a compound: "a pencil" for "a colored pencil", "a pencil" for "a pencil sharpener" */
    const un = squash(u.noun);
    const an = squash(main.noun);
    if (un.length >= 3 && un !== an && (an.endsWith(un) || an.startsWith(un))) {
      return miss("partial", "Say the whole name.");
    }
    /* small spelling slip */
    const dist = Math.min(...forms.map((f) => lev(typed, f)));
    if (dist <= Math.max(1, Math.floor(forms[0].length / 6))) {
      return miss("spelling", "Check the spelling.");
    }
    return miss("other", "");
  }

  /* ---- audio (one reusable element) ---- */
  const player = new Audio();
  function play(item, btn) {
    player.pause();
    document.querySelectorAll(".playing").forEach((el) => el.classList.remove("playing"));
    player.src = audUrl(item);
    if (btn) {
      btn.classList.add("playing");
      player.onended = () => btn.classList.remove("playing");
    } else {
      player.onended = null;
    }
    const p = player.play();
    if (p && p.catch) p.catch(() => btn && btn.classList.remove("playing"));
  }

  /* ---- round state ---- */
  let round = []; // item ids in play order
  let pos = 0;
  let results = {}; // id -> { status: correct|audio|wrong, wrong: [typed...], types: Set, second }
  let practice = false;
  let cur = null; // { item, wrong, types, retried, listened, done }
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

  function paintProgress() {
    [...progress.children].forEach((seg, i) => {
      const r = results[round[i]];
      seg.className = r ? r.status : i === pos ? "now" : "";
    });
  }

  function say(kind, html) {
    feedback.className = "feedback" + (kind ? " " + kind : "");
    feedback.innerHTML = html || "";
  }

  function focusInput() {
    try {
      input.focus({ preventScroll: true });
    } catch (e) {
      input.focus();
    }
  }

  function shake() {
    input.classList.remove("shake");
    void input.offsetWidth; // restart the animation
    input.classList.add("shake");
  }

  function showItem() {
    const item = ITEMS[round[pos]];
    cur = { item, wrong: [], types: new Set(), retried: false, listened: false, done: false };
    pic.src = imgUrl(item);
    counter.textContent = `${pos + 1} / ${round.length}`;
    input.value = "";
    input.classList.remove("right", "wrong", "shake");
    say("", "");
    checkLabel.textContent = "Check";
    listenBtn.classList.remove("playing");
    player.pause();
    paintProgress();
    const next = ITEMS[round[pos + 1]];
    if (next) new Image().src = imgUrl(next);
    focusInput();
  }

  function finish(ok, note) {
    cur.done = true;
    const status = !ok ? "wrong" : LISTEN_COUNTS_AS_HELP && cur.listened ? "audio" : "correct";
    results[cur.item.id] = { status, wrong: cur.wrong, types: cur.types, second: ok && cur.retried };
    checkLabel.textContent = pos === round.length - 1 ? "See results" : "Next";
    paintProgress();
    play(cur.item, listenBtn);
    return status;
  }

  function check() {
    if (cur.done) return next();
    if (!input.value.trim()) {
      say("", "Type the word for the picture.");
      return focusInput();
    }
    const r = judge(input.value, cur.item);
    if (r.ok) {
      const status = finish(true);
      input.classList.add("right");
      let html = `<span class="mark">✓</span> ${cur.retried ? "Yes! Good fix." : PRAISE[Math.floor(Math.random() * PRAISE.length)]}`;
      if (!r.exact) html += ` We write: <b>${esc(cur.item.answer)}</b>`;
      if (status === "audio") html += `<span class="note">You listened first, so no point this time.</span>`;
      say("right", html);
    } else {
      const typed = input.value.trim().replace(/\s+/g, " ");
      if (!cur.wrong.includes(typed)) cur.wrong.push(typed);
      cur.types.add(r.type);
      if (!cur.retried && r.retry && SECOND_TRY.includes(r.type)) {
        cur.retried = true;
        say("almost", r.retry);
        shake();
      } else {
        finish(false);
        input.classList.add("wrong");
        shake();
        say(
          "wrong",
          `<span class="mark">✗</span> It's <b>${esc(cur.item.answer)}</b>` +
            (r.note ? `<span class="note">${r.note}</span>` : ""),
        );
      }
    }
    focusInput();
  }

  function next() {
    pos++;
    if (pos >= round.length) showResults();
    else showItem();
  }

  function listen() {
    if (!cur) return;
    if (!cur.done) cur.listened = true;
    play(cur.item, listenBtn);
    focusInput();
  }

  /* ---- results: grade, feedback, wrong vs correct, right answers ---- */
  const TIPS = [
    ["noArticle", "Add <b>a</b> or <b>an</b> before the word."],
    ["wrongArticle", "Use <b>an</b> before a vowel sound (<b>an eraser</b>), <b>a</b> before other sounds (<b>a book</b>)."],
    ["measure", "Some words need <b>a pair of</b> or <b>a piece of</b>."],
    ["partial", "Say the whole name of the thing."],
    ["nearWord", "Use the word from this lesson."],
    ["spelling", "Check the spelling."],
    ["other", "Learn these words. Tap them to listen."],
  ];
  const SPEAKER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/></svg>';

  const gradeFor = (pct) => GRADES.find(([min]) => pct >= min)[1];
  const chip = (item) =>
    `<span class="chunk" role="button" tabindex="0" data-id="${item.id}" aria-label="Play: ${esc(item.answer)}">${esc(item.answer)}</span>`;

  function showResults() {
    input.blur();
    player.pause();
    const n = round.length;
    const ids = (s) => round.filter((id) => results[id].status === s);
    const correct = ids("correct");
    const audio = ids("audio");
    const wrong = ids("wrong");
    const pct = Math.round((100 * correct.length) / n);

    /* score card */
    let html =
      `<div class="score-card">` +
      `<div class="grade-label">${gradeFor(pct)}</div>` +
      `<div class="score-big">${correct.length} / ${n}</div>` +
      `<p class="score-sub"><b>${pct}%</b> correct</p>` +
      `<div class="tally">` +
      `<span class="t correct">${correct.length} correct</span>` +
      (audio.length ? `<span class="t audio">${audio.length} after listening</span>` : "") +
      `<span class="t wrong">${wrong.length} wrong</span>` +
      `</div></div>`;

    /* feedback by mistake type (a fixed a/an slip still gets a reminder) */
    const tips = [];
    for (const [type, text] of TIPS) {
      const hit = round.filter((id) => results[id].types.has(type));
      if (hit.length) tips.push({ text, ids: hit });
    }
    if (audio.length) tips.push({ text: "You listened first for these. Try them again without 🔊.", ids: audio });
    html += `<section class="panel tips"><h2>Feedback</h2>`;
    if (!tips.length) {
      html += `<p class="tip-lead">You remembered every word without help. Try this set again in a few days to keep it fresh.</p>`;
    } else {
      html +=
        `<p class="tip-lead">${pct >= 75 ? "Nice work! A few things to practice:" : "Here is what to practice:"}</p><ul>` +
        tips
          .map(
            (t) =>
              `<li><span class="tip-text">${t.text}</span>` +
              `<span class="tip-ex">${byBook(t.ids)
                .map((id) => esc(ITEMS[id].answer))
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
        byBook(wrong)
          .map((id) => {
            const it = ITEMS[id];
            return (
              `<li><img src="${imgUrl(it)}" alt="" />` +
              `<div class="pair"><div class="row yours"><span class="lbl">You wrote</span><span class="val">` +
              results[id].wrong.map((w) => `<s>${esc(w)}</s>`).join("") +
              `</span></div>` +
              `<div class="row correct"><span class="lbl">Correct</span><span class="val">${chip(it)}</span></div></div></li>`
            );
          })
          .join("") +
        `</ul></section>`;
    }

    /* right answers (🔊 badge = right after listening, no point) */
    const rightIds = byBook([...correct, ...audio]);
    if (rightIds.length) {
      html +=
        `<section class="panel"><h2>Right answers <span class="count ok">${correct.length}</span></h2>` +
        `<div class="right-grid">` +
        rightIds
          .map((id) => {
            const st = results[id].status;
            const badge = st === "audio" ? SPEAKER : "✓";
            return `<div class="tile ${st}"><div class="thumb"><img src="${imgUrl(ITEMS[id])}" alt="" /><i class="badge">${badge}</i></div>${chip(ITEMS[id])}</div>`;
          })
          .join("") +
        `</div></section>`;
    }

    resultsView.innerHTML = html;
    resultsView.querySelectorAll(".chunk").forEach((el) => {
      const go = () => play(ITEMS[+el.dataset.id], el);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });

    const redo = [...wrong, ...audio];
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
      else startRound(ITEMS.map((it) => it.id), false);
    } else check();
  });
  againBtn.addEventListener("click", () => startRound(ITEMS.map((it) => it.id), false));
  listenBtn.addEventListener("click", listen);
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
    ITEMS.map((it) => it.id),
    false,
  );
})();
