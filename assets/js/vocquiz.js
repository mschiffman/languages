/* ---------------------------------------------------------------
   Vocabulary quiz with several question formats, built with Alpine.js
   (stories/voc_<set>_quiz_mix.html; model: voc_atSchool_quiz_mix.html).

   The page has the usual .stage with its <header> (brand + .counter) and
   defines, before this script:
     IMG_DIR, AUD_DIR, IMG_EXT, AUD_EXT, pages   (the reader's, pasted unchanged)
     quiz = [ ...plan ]                           (which formats, how many)
   and optionally
     ALSO    = { "a piece of paper": ["a sheet of paper"] }   typed forms marked right
     SIMILAR = [ ["a pen", "a pencil", "a crayon"], ... ]     words that are easy to mix up:
                                                              they become each other's wrong options
   and loads, at the end of <body>:  vocquiz.js, then alpine.min.js (defer).
   Styles: ytstory.css + ytquiz.css + vocquiz.css.

   Words come from `pages`: one word per page that has a picture. The LAST
   chunk is what the lesson teaches ("a book", "a pair of scissors"); the
   chunk before it, when the last one ends with it, is the bare word ("book",
   "scissors"). Each has its own clip. Nothing else needs writing.

   The plan: a list of blocks, asked in this order (easy formats first).
     { type: "pick",    count: 5 }             picture -> choose the word (4 options)
     { type: "listen",  count: 5 }             hear the word -> tap the picture (4 pictures)
     { type: "match",   count: 2, pairs: 4 }   pictures on the left, words on the right
     { type: "article", count: 4 }             picture + "___ eraser" -> a / an
     { type: "spell",   count: 4, max: 10 }    picture -> tap the letters in order
                                               (bare word, at most `max` letters)
     { type: "type",    count: 4 }             picture -> type it ("a book")
   Words are picked at random, each one used before any is used twice, so every
   play is a new quiz. To choose them yourself, give the block
     words: ["a desk", "a chair"]              (count is then the length of the list;
                                                for match, these are one question's pairs)

   Rules: one try per question; a wrong answer is final and the right one is
   shown and played. A match is right only when every pair is right.
   The end screen has the score, tips by kind of mistake, wrong answers next
   to the right ones, and "Practice these" for the wrong questions.

   URL option: ?order=mixed asks the questions in a random order instead of
   block by block.
--------------------------------------------------------------- */
(function () {
  const stage = document.querySelector(".stage");
  if (!stage || typeof pages === "undefined") return;

  /* Offline single-file builds define EMBED = { "<url>": dataURI }. */
  const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;
  const pad = (n) => String(n).padStart(2, "0");
  const audUrl = (n) => media(`${AUD_DIR}${pad(n)}.${AUD_EXT}`);
  const low = (s) => s.toLowerCase();
  const norm = (s) =>
    low(s)
      .replace(/[.!?]+$/, "")
      .replace(/[-‐‑]/g, " ")
      .replace(/[’']/g, "")
      .replace(/\s+/g, " ")
      .trim();

  function shuffle(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const DEFAULT_PLAN = [
    { type: "pick", count: 5 },
    { type: "listen", count: 5 },
    { type: "match", count: 2, pairs: 4 },
    { type: "article", count: 4 },
    { type: "spell", count: 4 },
    { type: "type", count: 4 },
  ];
  const PLAN = typeof quiz !== "undefined" && Array.isArray(quiz) && quiz.length ? quiz : DEFAULT_PLAN;

  const ASK = {
    pick: ["What is it?", "ဒါ ဘာလဲ။"],
    listen: ["Listen. Which picture?", "နားထောင်ပါ။ ဘယ်ပုံလဲ။"],
    match: ["Match the pictures with the words.", "ပုံနဲ့ စကားလုံး တွဲပေးပါ။"],
    article: ["a or an?", "a လား၊ an လား။"],
    spell: ["Spell the word.", "စာလုံးပေါင်းပါ။"],
    type: ["Type what you see.", "မြင်တာကို ရိုက်ထည့်ပါ။"],
  };

  /* kinds of mistake -> the tip on the end screen */
  const TAG = { pick: "meaning", match: "meaning", listen: "listening", article: "article", spell: "spelling", type: "spelling" };
  const TIPS = {
    meaning: "Learn these words again with their pictures.",
    listening: "Listen to these words again.",
    article: "a or an? Say an before a vowel sound: an eraser, an apple.",
    spelling: "Practice the spelling of these words.",
  };

  const GRADES = [
    [100, "Perfect!"],
    [90, "Excellent!"],
    [75, "Very good!"],
    [60, "Good work!"],
    [40, "Keep going!"],
    [0, "Keep practicing!"],
  ];
  const MATCH_COLORS = ["#2f7fd1", "#d9822b", "#8a5cc4", "#2a9d8f", "#d6457a", "#6b8e23"];

  /* ---- the words, from the reader's pages ---- */
  const WORDS = [];
  pages.forEach((p) => {
    const chunks = (p.sentences || []).flat();
    if (p.img == null || !chunks.length) return;
    const [say, sayN] = chunks[chunks.length - 1];
    const prev = chunks.length > 1 ? chunks[chunks.length - 2] : null;
    const m = say.match(/^(an?)\s+(.+)$/i);
    let word = m ? m[2] : say;
    let wordN = sayN;
    if (prev && prev[0] !== say && low(say).endsWith(low(prev[0]))) [word, wordN] = prev;
    WORDS.push({
      id: WORDS.length,
      img: media(`${IMG_DIR}${p.img}.${IMG_EXT}`),
      say, // "a book": what the options, the matches and the typed answer use
      sayUrl: audUrl(sayN),
      word, // "book": what is spelled
      wordUrl: audUrl(wordN),
      art: m && low(m[2]) === low(word) ? low(m[1]) : null, // "a" | "an", only for "a book" (not "a pair of ...")
    });
  });

  const problems = [];
  const problem = (msg) => problems.includes(msg) || problems.push(msg); // build() runs on every new game
  const also = typeof ALSO !== "undefined" ? ALSO : {};
  const similar = typeof SIMILAR !== "undefined" ? SIMILAR : [];
  const byText = (t) => WORDS.find((w) => low(w.say) === low(t) || low(w.word) === low(t));
  const mates = (w) => {
    const out = new Set();
    similar.forEach((g) => {
      if (g.some((t) => byText(t) === w)) g.forEach((t) => byText(t) && byText(t) !== w && out.add(byText(t).id));
    });
    return [...out];
  };
  similar.flat().forEach((t) => byText(t) || problem(`SIMILAR: "${t}" is not a word on this page`));

  const letters = (w) => w.word.replace(/[^A-Za-z]/g, "");
  const ELIGIBLE = {
    article: (w) => !!w.art,
    spell: (w, b) => letters(w).length >= 2 && letters(w).length <= (b.max || 10),
  };

  /* three wrong words for w: the ones marked similar first, then any others */
  function others(w, n) {
    const m = shuffle(mates(w));
    const rest = shuffle(WORDS.filter((x) => x !== w && !m.includes(x.id) && low(x.say) !== low(w.say)).map((x) => x.id));
    return m.concat(rest).slice(0, n);
  }

  /* one question, with its options / tiles in a new order */
  function make(type, ids, block) {
    const q = { type, ids, w: ids[0], block };
    if (type === "pick" || type === "listen") q.opts = shuffle([q.w, ...others(WORDS[q.w], 3)]);
    if (type === "spell") q.pattern = WORDS[q.w].word.split("");
    return q;
  }

  /* the whole quiz from the plan; `uses` spreads the words over the questions */
  function build() {
    const uses = WORDS.map(() => 0);
    const take = (ok, n, block) => {
      const pool = shuffle(WORDS.filter((w) => ok(w, block))).sort((a, b) => uses[a.id] - uses[b.id]);
      const got = pool.slice(0, n).map((w) => w.id);
      got.forEach((id) => uses[id]++);
      return got;
    };
    const out = [];
    PLAN.forEach((block, bi) => {
      const where = `quiz[${bi}]`;
      if (!ASK[block.type]) return problem(`${where}: unknown type "${block.type}"`);
      const ok = ELIGIBLE[block.type] || (() => true);
      let fixed = null;
      if (block.words) {
        fixed = block.words.map((t) => {
          const w = byText(t);
          if (!w) problem(`${where}: "${t}" is not a word on this page`);
          return w;
        }).filter(Boolean).map((w) => w.id);
      }
      if (block.type === "match") {
        const n = fixed ? 1 : block.count || 1;
        for (let k = 0; k < n; k++) {
          const ids = fixed || take(ok, Math.min(block.pairs || 4, 6), block);
          if (ids.length >= 2) out.push(make("match", ids, block));
        }
      } else {
        (fixed || take(ok, block.count || 1, block)).forEach((id) => out.push(make(block.type, [id], block)));
      }
    });
    return new URLSearchParams(location.search).get("order") === "mixed" ? shuffle(out) : out;
  }

  /* right column in a new order, with no pair left side by side when that's possible */
  function mix(left) {
    let r = shuffle(left);
    for (let tries = 0; tries < 30 && r.some((id, i) => id === left[i]); tries++) r = shuffle(left);
    return r;
  }

  /* one clip at a time */
  const player = new Audio();
  function play(url, done) {
    if (!url) return;
    player.pause();
    player.src = url;
    player.onended = player.onerror = done || null;
    const p = player.play();
    if (p && p.catch) p.catch(() => done && done()); // autoplay blocked before the first tap: tap 🔊
  }

  /* ---- markup ---- */
  const SPK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

  stage.classList.add("vq");
  stage.setAttribute("x-data", "vocQuiz");
  stage.setAttribute(":class", "{ 'show-results': view === 'results' }");
  stage.setAttribute("@keydown.window", "onKey($event)");
  const counter = stage.querySelector(".counter");
  if (counter) counter.setAttribute("x-text", "counterText");

  stage.insertAdjacentHTML(
    "beforeend",
    `
<div class="progress" :hidden="view === 'results'" aria-hidden="true">
  <template x-for="(x, k) in round" :key="k"><i :class="dot(k)"></i></template>
</div>

<main class="quiz-body" :hidden="view === 'results'">
  <template x-if="problems.length">
    <div class="vq-problems"><b>Quiz data problems</b>
      <template x-for="p in problems"><div x-text="p"></div></template>
    </div>
  </template>

  <template x-if="view === 'q' && q">
    <div class="vq-q" :class="'vq-' + q.type">
      <div class="vq-ask"><b x-text="ASK[q.type][0]"></b> <span lang="my" x-text="ASK[q.type][1]"></span></div>

      <!-- the picture to name: pick, article, spell, type -->
      <template x-if="q.type !== 'listen' && q.type !== 'match'">
        <div class="art"><img :src="W[q.w].img" alt="Picture to name" /></div>
      </template>

      <!-- listen: the word to find -->
      <template x-if="q.type === 'listen'">
        <button class="vq-hear" :class="{ playing }" @click="hear()">${SPK}<span>Listen</span></button>
      </template>

      <!-- pick: four words -->
      <template x-if="q.type === 'pick'">
        <div class="vq-opts">
          <template x-for="id in q.opts" :key="id">
            <button class="vq-opt" :class="optClass(id)" @click="select(id)" x-text="W[id].say"></button>
          </template>
        </div>
      </template>

      <!-- listen: four pictures -->
      <template x-if="q.type === 'listen'">
        <div class="vq-pics">
          <template x-for="id in q.opts" :key="id">
            <button class="vq-pic" :class="optClass(id)" @click="select(id)"><img :src="W[id].img" alt="" /></button>
          </template>
        </div>
      </template>

      <!-- match: tap a picture, then its word -->
      <template x-if="q.type === 'match'">
        <div class="vq-match">
          <template x-for="(id, i) in mL" :key="id">
            <div class="vq-mrow">
              <button class="vq-mitem pic" :class="mClass('l', id)" :style="mStyle('l', id)" @click="mTap('l', id)">
                <i class="vq-mbadge" x-show="mBadge('l', id)" x-text="mBadge('l', id)"></i>
                <img :src="W[id].img" alt="" />
                <span class="vq-mark" x-text="mMark(id)"></span>
              </button>
              <button class="vq-mitem" :class="mClass('r', mRight(i))" :style="mStyle('r', mRight(i))" @click="mTap('r', mRight(i))">
                <i class="vq-mbadge" x-show="mBadge('r', mRight(i))" x-text="mBadge('r', mRight(i))"></i>
                <span x-text="mRight(i) >= 0 ? W[mRight(i)].say : ''"></span>
              </button>
            </div>
          </template>
        </div>
      </template>

      <!-- article: a / an -->
      <template x-if="q.type === 'article'">
        <div class="vq-art">
          <p class="vq-gap"><span class="vq-blank" :class="blankClass()" x-text="revealed ? W[q.w].art : sel || ''"></span> <span x-text="W[q.w].word"></span></p>
          <div class="vq-ab">
            <button class="vq-opt" :class="abClass('a')" @click="select('a')">a</button>
            <button class="vq-opt" :class="abClass('an')" @click="select('an')">an</button>
          </div>
        </div>
      </template>

      <!-- spell: tap the letters -->
      <template x-if="q.type === 'spell'">
        <div class="vq-spell">
          <div class="vq-slots" :class="lineClass()">
            <template x-for="(s, i) in slots" :key="i">
              <button class="vq-slot" :class="{ sp: s.sp, full: s.ch }" :disabled="s.sp || !s.ch || revealed"
                      @click="takeAt(s.n)" x-text="s.ch"></button>
            </template>
          </div>
          <div class="vq-bank">
            <template x-for="t in bank" :key="t.k">
              <button class="vq-tile" :class="t.used && 'ghost'" :disabled="t.used || revealed" @click="put(t)" x-text="t.ch"></button>
            </template>
          </div>
        </div>
      </template>

      <!-- type -->
      <template x-if="q.type === 'type'">
        <form class="answer" autocomplete="off" @submit.prevent="main()">
          <input id="answer" type="text" x-model="typed" x-ref="answer" :readonly="revealed" :class="lineClass()"
                 autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"
                 placeholder="Type it here" aria-label="Type what you see" />
        </form>
      </template>

      <p class="feedback" :class="fb && fb.cls" aria-live="polite">
        <template x-if="fb">
          <span><span class="mark" x-text="fb.mark"></span> <span x-text="fb.head"></span>
            <b x-show="fb.answer" x-text="fb.answer"></b><span class="note" x-show="fb.note" x-text="fb.note"></span></span>
        </template>
      </p>
    </div>
  </template>
</main>

<section class="results" aria-live="polite" x-ref="results" :hidden="view !== 'results'">
  <template x-if="view === 'results'">
    <div class="vq-results">
      <div class="score-card">
        <div class="grade-label" x-text="grade"></div>
        <div class="score-big" x-text="rightN + ' / ' + round.length"></div>
        <p class="score-sub"><b x-text="pct + '%'"></b> correct</p>
        <div class="tally">
          <span class="t correct" x-text="rightN + ' correct'"></span>
          <span class="t wrong" x-text="wrongList.length + ' wrong'"></span>
        </div>
      </div>

      <section class="panel tips">
        <h2>Feedback</h2>
        <p class="tip-lead" x-text="!tips.length ? 'Every answer was right. Try again in a few days to keep the words fresh.'
            : pct >= 75 ? 'Nice work! A few things to practice:' : 'Here is what to practice:'"></p>
        <ul x-show="tips.length">
          <template x-for="t in tips" :key="t.tag">
            <li><span class="tip-text" x-text="t.text"></span><span class="tip-ex" x-text="t.ex"></span></li>
          </template>
        </ul>
      </section>

      <section class="panel" x-show="wrongList.length">
        <h2>Wrong answers <span class="count" x-text="wrongList.length"></span></h2>
        <ul class="review">
          <template x-for="w in wrongList" :key="w.k">
            <li>
              <img :src="W[w.ids[0]].img" alt="" />
              <div class="pair">
                <div class="row"><span class="lbl" x-text="w.kind"></span></div>
                <div class="row yours"><span class="lbl">You</span>
                  <span class="val"><s x-show="w.chosen" x-text="w.chosen"></s><em x-show="!w.chosen">(nothing)</em></span></div>
                <div class="row correct"><span class="lbl">Correct</span>
                  <span class="val">
                    <template x-for="id in w.ids" :key="id">
                      <span class="chunk" role="button" tabindex="0" @click="say(id)" @keydown.enter.prevent="say(id)" x-text="W[id].say"></span>
                    </template>
                  </span></div>
              </div>
            </li>
          </template>
        </ul>
      </section>

      <section class="panel" x-show="rightWords.length">
        <h2>Right answers <span class="count ok" x-text="rightN"></span></h2>
        <div class="right-grid">
          <template x-for="id in rightWords" :key="id">
            <div class="tile correct">
              <div class="thumb"><img :src="W[id].img" alt="" /><i class="badge">✓</i></div>
              <span class="chunk" role="button" tabindex="0" @click="say(id)" @keydown.enter.prevent="say(id)" x-text="W[id].say"></span>
            </div>
          </template>
        </div>
      </section>
    </div>
  </template>
</section>

<footer>
  <button class="nav" id="again" aria-label="Start a new quiz" @click="again()">&#8635;</button>
  <button class="nav" id="listen" aria-label="Listen" :class="{ playing }" :disabled="!canListen" @mousedown.prevent @click="hear()">${SPK}</button>
  <button class="play-page" id="check" :disabled="mainOff" @mousedown.prevent @click="main()"><span x-text="mainLabel">Check</span></button>
</footer>`,
  );

  /* ---- the Alpine component ---- */
  document.addEventListener("alpine:init", () => {
    Alpine.data("vocQuiz", () => ({
      W: WORDS,
      ASK,
      problems,
      round: [],
      pos: 0,
      results: [], // by position: { ok, chosen, miss }
      practice: false,
      view: "q", // "q" | "results"
      sel: null,
      revealed: false,
      fb: null,
      typed: "",
      placed: [], // spell: tiles tapped so far
      bank: [],
      mL: [], // match: word ids on the left (pictures), in the order shown
      mR: [], // match: word ids on the right (words)
      mPair: {}, // match: left id -> the right id chosen
      mSel: null,
      mOk: {},
      playing: false,

      init() {
        if (!WORDS.length) problems.push("No words: `pages` has no page with a picture.");
        this.start(build(), false);
      },
      get q() {
        return this.round[this.pos];
      },
      get counterText() {
        return this.view === "q" ? `${this.pos + 1} / ${this.round.length}` : this.practice ? "Practice done" : "Results";
      },
      start(qs, practice) {
        this.round = qs;
        this.pos = 0;
        this.results = [];
        this.practice = practice;
        this.view = qs.length ? "q" : "results";
        if (qs.length) this.load();
      },
      again() {
        this.start(build(), false);
      },
      load() {
        const q = this.q;
        this.sel = null;
        this.revealed = false;
        this.fb = null;
        this.typed = "";
        this.placed = [];
        this.bank = q.type === "spell" ? this.scramble(q) : [];
        this.mL = q.type === "match" ? shuffle(q.ids) : [];
        this.mR = q.type === "match" ? mix(this.mL) : [];
        this.mPair = {};
        this.mSel = null;
        this.mOk = {};
        this.$nextTick(() => {
          if (q.type === "listen") this.hear();
          if (q.type === "type" && this.$refs.answer) this.$refs.answer.focus({ preventScroll: true });
        });
      },
      scramble(q) {
        const ls = letters(WORDS[q.w]).toLowerCase().split("");
        let s = shuffle(ls);
        for (let tries = 0; tries < 12 && s.join("") === ls.join(""); tries++) s = shuffle(ls);
        return s.map((ch, k) => ({ ch, k, used: false }));
      },

      /* ---- sound ---- */
      get canListen() {
        const q = this.q;
        return this.view === "q" && !!q && (q.type === "listen" || (this.revealed && q.type !== "match"));
      },
      hear() {
        if (!this.canListen) return;
        const w = WORDS[this.q.w];
        this.playing = true;
        play(this.q.type === "spell" ? w.wordUrl : w.sayUrl, () => (this.playing = false));
      },
      say(id) {
        play(WORDS[id].sayUrl);
      },

      /* ---- answering ---- */
      select(v) {
        if (!this.revealed) this.sel = v;
      },
      put(t) {
        if (this.revealed || t.used) return;
        t.used = true;
        this.placed.push(t);
      },
      takeAt(n) {
        if (this.revealed) return;
        const [t] = this.placed.splice(n, 1);
        if (t) t.used = false;
      },
      /* spell: the word's shape, filled with the tapped letters (spaces and hyphens stay put) */
      get slots() {
        const q = this.q;
        if (!q || q.type !== "spell") return [];
        let n = 0;
        return q.pattern.map((c) => {
          if (!/[A-Za-z]/.test(c)) return { sp: true, ch: c.trim() };
          const t = this.placed[n];
          return { ch: t ? t.ch : "", n: n++ };
        });
      },
      mRight(i) {
        return this.mR[i] == null ? -1 : this.mR[i];
      },
      mLeftOf(rid) {
        const l = Object.keys(this.mPair).find((k) => this.mPair[k] === rid);
        return l == null ? -1 : Number(l);
      },
      mTap(side, id) {
        if (this.revealed) return side === "l" && this.say(id);
        if (id < 0) return;
        const pair = { ...this.mPair };
        const lid = side === "l" ? id : this.mLeftOf(id);
        if (lid >= 0 && pair[lid] != null) {
          delete pair[lid]; // tapping a matched one frees both
          this.mPair = pair;
          this.mSel = null;
        } else if (!this.mSel || this.mSel.side === side) {
          this.mSel = this.mSel && this.mSel.id === id ? null : { side, id };
        } else {
          pair[side === "l" ? id : this.mSel.id] = side === "l" ? this.mSel.id : id;
          this.mPair = pair;
          this.mSel = null;
        }
      },
      /* a pair's number: the row of its picture (0 = not matched, or the answer is showing) */
      mBadge(side, id) {
        if (this.revealed) return 0;
        const lid = side === "l" ? (this.mPair[id] != null ? id : -1) : this.mLeftOf(id);
        return lid < 0 ? 0 : this.mL.indexOf(lid) + 1;
      },
      mStyle(side, id) {
        const b = this.mBadge(side, id);
        return b ? `--mc: ${MATCH_COLORS[(b - 1) % MATCH_COLORS.length]}` : "";
      },
      mClass(side, id) {
        if (this.revealed) return side === "l" ? (this.mOk[id] ? "right" : "wrong") : "shown";
        return { sel: !!this.mSel && this.mSel.side === side && this.mSel.id === id, paired: this.mBadge(side, id) > 0 };
      },
      mMark(id) {
        return this.revealed ? (this.mOk[id] ? "✓" : "✗") : "";
      },

      get canCheck() {
        const q = this.q;
        if (!q) return false;
        if (q.type === "match") return q.ids.every((id) => this.mPair[id] != null);
        if (q.type === "spell") return this.placed.length === letters(WORDS[q.w]).length;
        if (q.type === "type") return this.typed.trim().length > 0;
        return this.sel !== null;
      },
      check() {
        const q = this.q;
        const w = WORDS[q.w];
        let ok, chosen, note = "", miss = null, answer = w.say;
        if (q.type === "pick" || q.type === "listen") {
          ok = this.sel === q.w;
          chosen = WORDS[this.sel].say;
        } else if (q.type === "match") {
          miss = q.ids.filter((id) => this.mPair[id] !== id);
          ok = !miss.length;
          chosen = miss.map((id) => WORDS[this.mPair[id]].say).join(", ");
          answer = "";
          if (!ok) note = `${q.ids.length - miss.length} of ${q.ids.length} matched. Each picture now has its word beside it.`;
          this.mOk = Object.fromEntries(q.ids.map((id) => [id, this.mPair[id] === id]));
          this.mR = this.mL.slice(); // show the answer: partners side by side
          this.mSel = null;
        } else if (q.type === "article") {
          ok = this.sel === w.art;
          chosen = `${this.sel} ${w.word}`;
          if (!ok) note = w.art === "an" ? "Say an before a vowel sound." : "Say a before a consonant sound.";
        } else if (q.type === "spell") {
          const built = this.placed.map((t) => t.ch).join("");
          ok = built === letters(w).toLowerCase();
          chosen = built;
          answer = w.word;
        } else {
          const t = norm(this.typed);
          ok = t === norm(w.say) || (also[w.say] || []).some((a) => norm(a) === t);
          chosen = this.typed.trim();
          if (!ok && t === norm(w.word) && w.say !== w.word) note = w.art ? "Add a or an." : "Say the whole name.";
          else if (!ok) note = "Check the spelling.";
        }
        this.results[this.pos] = { ok, chosen, miss };
        this.revealed = true;
        this.fb = ok
          ? { cls: "right", mark: "✓", head: q.type === "match" ? "Right! All matched." : "Right!", answer, note: "" }
          : { cls: "wrong", mark: "✗", head: q.type === "match" ? "Not quite." : "It's", answer, note };
        if (q.type !== "match") {
          this.playing = true;
          play(q.type === "spell" ? w.wordUrl : w.sayUrl, () => (this.playing = false));
        }
      },
      next() {
        this.pos++;
        if (this.pos >= this.round.length) {
          this.view = "results";
          player.pause();
          this.$nextTick(() => this.$refs.results && (this.$refs.results.scrollTop = 0));
        } else this.load();
      },
      main() {
        if (this.view === "results") {
          const redo = this.round.filter((q, k) => this.results[k] && !this.results[k].ok);
          if (redo.length) this.start(shuffle(redo).map((q) => make(q.type, q.ids, q.block)), true);
          else this.again();
        } else if (!this.revealed) {
          if (this.canCheck) this.check();
        } else this.next();
      },
      get mainLabel() {
        if (this.view === "results") return this.wrongList.length ? `Practice these (${this.wrongList.length})` : "Play again";
        if (!this.revealed) return "Check";
        return this.pos === this.round.length - 1 ? "See results" : "Next";
      },
      get mainOff() {
        return this.view === "q" && !this.revealed && !this.canCheck;
      },
      onKey(e) {
        if (e.key === "Enter" && !(e.target && e.target.closest && e.target.closest("button, a, input"))) {
          e.preventDefault();
          return this.main();
        }
        if (this.view !== "q" || this.revealed || !this.q || (e.target && e.target.tagName === "INPUT")) return;
        const q = this.q;
        const n = Number(e.key);
        if ((q.type === "pick" || q.type === "listen") && n >= 1 && n <= q.opts.length) this.select(q.opts[n - 1]);
        else if (q.type === "article" && (n === 1 || n === 2)) this.select(n === 1 ? "a" : "an");
        else if (q.type === "spell") {
          if (e.key === "Backspace" && this.placed.length) {
            e.preventDefault();
            this.takeAt(this.placed.length - 1);
          } else if (/^[a-z]$/i.test(e.key)) {
            const t = this.bank.find((x) => !x.used && x.ch === e.key.toLowerCase());
            if (t) this.put(t);
          }
        }
      },

      /* ---- classes ---- */
      dot(k) {
        const r = this.results[k];
        return r ? (r.ok ? "correct" : "wrong") : k === this.pos && this.view === "q" ? "now" : "";
      },
      optClass(id) {
        if (!this.revealed) return { sel: this.sel === id };
        const right = id === this.q.w;
        return { right, wrong: !right && this.sel === id, dim: !right && this.sel !== id };
      },
      abClass(v) {
        if (!this.revealed) return { sel: this.sel === v };
        const right = v === WORDS[this.q.w].art;
        return { right, wrong: !right && this.sel === v, dim: !right && this.sel !== v };
      },
      blankClass() {
        return this.revealed ? "right" : this.sel ? "full" : "";
      },
      lineClass() {
        if (!this.revealed) return "";
        return this.results[this.pos].ok ? "right" : "wrong";
      },

      /* ---- results ---- */
      get rightN() {
        return this.results.filter((r) => r && r.ok).length;
      },
      get pct() {
        return this.round.length ? Math.round((100 * this.rightN) / this.round.length) : 0;
      },
      get grade() {
        return GRADES.find(([min]) => this.pct >= min)[1];
      },
      get wrongList() {
        const out = [];
        this.round.forEach((q, k) => {
          const r = this.results[k];
          if (r && !r.ok) out.push({ k, kind: ASK[q.type][0], tag: TAG[q.type], chosen: r.chosen, ids: r.miss || [q.w] });
        });
        return out;
      },
      get tips() {
        return Object.entries(TIPS)
          .map(([tag, text]) => {
            const ids = [...new Set(this.wrongList.filter((w) => w.tag === tag).flatMap((w) => w.ids))];
            return { tag, text, ex: ids.map((id) => WORDS[id].say).join(" · ") };
          })
          .filter((t) => t.ex);
      },
      get rightWords() {
        const ids = new Set();
        this.round.forEach((q, k) => {
          if (this.results[k] && this.results[k].ok) q.ids.forEach((id) => ids.add(id));
        });
        return [...ids].sort((a, b) => a - b);
      },
    }));
  });
})();
