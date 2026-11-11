/* ---------------------------------------------------------------
   Expression quiz for the English expression pages
   (eng/expressions/<topic>.html), built with Alpine.js.

   The page defines, in its data <script>, after `categories`:
     quiz = [ ...questions ]        (without it this script does nothing)
   and optionally
     quizTags = { <tag>: "<tip>" }  extra tags, or new wording for the tips
   and loads, at the end of <body>, in this order:
     expression-flash.js, expression-quiz.js, (the nav menu), alpine.min.js
   Styles: assets/css/expression-quiz.css.

   The quiz opens over the cards from the "Test yourself" button this
   script adds above the cards, or from the URL  #quiz .
   Android's Back button closes it. ?order=book keeps the order of `quiz`
   (default: shuffled).

   Questions point at cards by their English phrase, written exactly as in
   `categories` ("Good evening."). The quiz then uses that card's clip,
   Burmese line and note, so it needs no new audio. A wrong option that is
   not a card is fine; it just has no clip.

   Four types (scene/cue: short parts joined by " · "; each becomes a chip):

     say    What do you say in this situation?
            { type: "say", scene: "🌙 8 pm · 🍽️ At a restaurant · You walk in.",
              my: "<the scene in Burmese>", answer: "Good evening.",
              wrong: { "Good night.": "moment",
                       "Hey!": ["register", "Too casual for a waiter."] } }
     reply  What do you say back? The prompt's clip plays when it opens.
            { type: "reply", prompt: "How are you?",
              answer: "Good, thanks. And you?", wrong: { ... } }
            (scene and my are optional)
     build  Tap the words into order. The Burmese is the card's.
            { type: "build", answer: "Have a nice day.",
              cue: "🛍️ A customer is leaving your shop",
              decoys: { be: ["literal", "<note>"] }, also: ["<other right answer>"] }
     judge  Is this OK to say here?
            { type: "judge", scene: "...", my: "...", phrase: "Hey!",
              ok: false, tag: "register", note: "<note>" }

   Every wrong option, decoy and judge has a mistake tag (TAGS below); the
   results group the mistakes by tag. A wrong option's value is the tag, or
   [tag, note]. Notes, when not given:
     wrong option -> that card's note (it usually says when to use it)
     right answer -> the answer card's note (or `note:` on the question)
     build decoy  -> the tag's tip

   Rules: one try per question; a wrong answer is final. When the answer is
   shown, its clip plays. Options can be played before choosing only when
   every option is a card; otherwise the missing 🔊 would give it away.

   The quiz data must not have a line that starts with ["  (make_audio.py
   reads such lines as cards). Objects like  wrong: { "Hey!": ... }  are safe.
--------------------------------------------------------------- */
(function () {
  if (typeof quiz === "undefined" || !Array.isArray(quiz) || !quiz.length) return;

  /* Offline single-file builds define EMBED = { "<url>": dataURI }. */
  const media = (url) => (typeof EMBED !== "undefined" && EMBED[url]) || url;
  const pad = (n) => String(n).padStart(2, "0");
  const strip = (s) => String(s).replace(/<[^>]*>/g, "");
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const norm = (s) => s.replace(/[.!?]+$/, "").trim().replace(/\s+/g, " ").toLowerCase();

  function shuffle(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /* ---- tags: what kind of mistake, and the tip shown in the results ---- */
  const TAGS = Object.assign(
    {
      time: "Watch the time of day.",
      moment: "Check the moment: arriving or leaving? Meeting for the first time, or seeing someone again?",
      register: "Think about who you're talking to: a friend, a teacher, a customer or a stranger.",
      literal: "Don't translate word for word from Burmese: English says it in its own way.",
      reply: "Answer what the person said.",
      words: "Check the word order and the form of each word.",
    },
    typeof quizTags !== "undefined" ? quizTags : {},
  );

  const ASK = {
    say: ["What do you say?", "ဘာပြောမလဲ။"],
    reply: ["What do you say back?", "ဘယ်လို ပြန်ပြောမလဲ။"],
    build: ["Put the words in order.", "စကားလုံးတွေကို အစဉ်လိုက် စီပါ။"],
    judge: ["Is this OK?", "ဒီလိုပြောရင် အဆင်ပြေလား။"],
  };

  const GRADES = [
    [100, "Perfect!"],
    [90, "Excellent!"],
    [75, "Very good!"],
    [60, "Good work!"],
    [40, "Keep going!"],
    [0, "Keep practicing!"],
  ];

  /* ---- cards by English phrase, numbered like expression-flash.js ---- */
  const CARDS = new Map();
  let num = 0;
  for (const cat of categories) {
    for (const [en, my, note] of cat.cards) {
      num++;
      const text = strip(en);
      CARDS.set(text, { en: text, my: strip(my), note: note || "", url: media(`${AUD_DIR}${pad(num)}.${AUD_EXT}`) });
    }
  }

  /* Data mistakes are listed at the top of the quiz (and in the console),
     so they show up while you test the page. */
  const problems = [];
  function card(text, where, required) {
    const c = CARDS.get(text);
    if (!c && required) problems.push(`${where}: "${text}" is not a card on this page`);
    return c || { en: text, my: "", note: "", url: null };
  }
  function tagged(v, where) {
    const [tag, note] = Array.isArray(v) ? v : [v];
    if (!TAGS[tag]) problems.push(`${where}: unknown tag "${tag}"`);
    return [tag, note];
  }

  /* ---- questions, prepared once ---- */
  const QS = [];
  quiz.forEach((q, i) => {
    const where = `quiz[${i}]`;
    const chips = (q.scene || q.cue || "")
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean);
    const base = { type: q.type, chips, my: q.my || "" };

    if (q.type === "say" || q.type === "reply") {
      const answer = card(q.answer, where, true);
      const opts = [{ text: answer.en, card: answer.url ? answer : null, ok: true, note: q.note || answer.note }];
      for (const [text, v] of Object.entries(q.wrong || {})) {
        const [tag, note] = tagged(v, where);
        const c = CARDS.get(text) || null;
        opts.push({ text, card: c, ok: false, tag, note: note || (c && c.note) || TAGS[tag] || "" });
      }
      if (opts.length < 2) problems.push(`${where}: needs at least one wrong option`);
      QS.push({
        ...base,
        prompt: q.type === "reply" ? card(q.prompt, where, true) : null,
        answer,
        opts,
        listen: opts.every((o) => o.card),
      });
    } else if (q.type === "build") {
      const answer = card(q.answer, where, true);
      const end = (answer.en.match(/[.!?]+$/) || [""])[0];
      const words = answer.en.slice(0, answer.en.length - end.length).trim().split(/\s+/);
      /* lower-case the first word so its capital letter isn't a clue ("I" stays) */
      const tiles = words.map((w, k) => ({ w: k === 0 && !/^I\b/.test(w) ? w[0].toLowerCase() + w.slice(1) : w }));
      for (const [w, v] of Object.entries(q.decoys || {})) {
        const [tag, note] = tagged(v, where);
        tiles.push({ w, decoy: true, tag, note: note || TAGS[tag] || "" });
      }
      QS.push({
        ...base,
        my: q.my || answer.my,
        answer,
        end,
        target: norm(words.join(" ")),
        also: (q.also || []).map(norm),
        tiles,
        note: q.note || answer.note,
      });
    } else if (q.type === "judge") {
      if (typeof q.ok !== "boolean") problems.push(`${where}: ok must be true or false`);
      tagged(q.tag, where);
      const phrase = card(q.phrase, where, true);
      QS.push({ ...base, phrase, ok: q.ok === true, tag: q.tag, note: q.note || phrase.note });
    } else {
      problems.push(`${where}: unknown type "${q.type}"`);
    }
  });
  QS.forEach((q, id) => (q.id = id));
  problems.forEach((p) => console.warn("Quiz data:", p));

  const ALL = QS.map((q) => q.id);
  const order = () => (new URLSearchParams(location.search).get("order") === "book" ? ALL.slice() : shuffle(ALL));

  /* tiles in a new order (never the answer's order) */
  function scramble(tiles) {
    const t = tiles.map((x, k) => ({ ...x, k, used: false }));
    const key = (a) =>
      a
        .filter((x) => !x.decoy)
        .map((x) => x.w)
        .join(" ");
    for (let tries = 0; tries < 12; tries++) {
      const s = shuffle(t);
      if (key(s) !== key(t)) return s;
    }
    return shuffle(t);
  }

  /* a judge answer keeps its verdict, so "Hey!" never looks like the thing to say */
  const answerText = (q) => (q.type === "judge" ? `${q.ok ? "OK" : "Not OK"}: ${q.phrase.en}` : q.answer.en);
  const answerUrl = (q) => (q.type === "judge" ? q.phrase.url : q.answer.url);
  function label(q) {
    if (q.type === "reply") return `“${q.prompt.en}”`;
    if (q.type === "build") return [q.my, ...q.chips].filter(Boolean).join(" · ");
    return q.chips.join(" · ");
  }

  /* one clip at a time */
  const player = new Audio();
  function play(url) {
    if (!url) return;
    player.pause();
    player.src = url;
    const p = player.play();
    if (p && p.catch) p.catch(() => {}); // autoplay blocked before the first tap: tap 🔊 to hear it
  }

  /* ---- markup: the launch button, and the quiz itself ---- */
  const SPK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;

  const cards = document.getElementById("cards");
  if (cards) {
    const launch = (extra) =>
      `<div class="xq-launch ${extra}"><a class="xq-launch-btn" href="#quiz">📝 Test yourself <span lang="my">ကိုယ့်ကိုယ်ကို စစ်ဆေးကြည့်ပါ</span></a></div>`;
    cards.insertAdjacentHTML("beforebegin", launch("xq-launch-top"));
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
<div class="xq" x-data="exprQuiz" x-show="open" x-cloak role="dialog" aria-modal="true"
     :aria-label="title + ' quiz'" @keydown.window="onKey($event)">
  <div class="xq-top">
    <div class="xq-bar">
      <button class="xq-back" @click="close()">← Cards</button>
      <span class="xq-name"><span class="badge">QUIZ</span> <span x-text="title"></span></span>
      <span class="xq-count" x-text="view === 'q' ? (pos + 1) + ' / ' + round.length : (practice ? 'Practice done' : 'Results')"></span>
    </div>
    <div class="xq-dots" x-show="view === 'q'" aria-hidden="true">
      <template x-for="(id, k) in round" :key="k"><i :class="dot(k)"></i></template>
    </div>
  </div>

  <div class="xq-body" x-ref="body">
    <div class="xq-inner">
      <template x-if="problems.length">
        <div class="xq-problems"><b>Quiz data problems</b>
          <template x-for="p in problems"><div x-text="p"></div></template>
        </div>
      </template>

      <!-- ===== a question ===== -->
      <template x-if="view === 'q' && q">
        <div class="xq-q">
          <div class="xq-scene" x-show="q.chips.length">
            <template x-for="c in q.chips"><span class="xq-chip" x-text="c"></span></template>
          </div>
          <p class="xq-my" lang="my" x-show="q.my" x-text="q.my"></p>

          <template x-if="q.type === 'reply'">
            <button class="xq-bubble" @click="play(q.prompt.url)" :disabled="!q.prompt.url">
              <span class="xq-spk">${SPK}</span><span x-text="q.prompt.en"></span>
            </button>
          </template>

          <template x-if="q.type === 'judge'">
            <div class="xq-say">
              <span class="xq-say-lbl">You say:</span>
              <button class="xq-phrase" @click="play(q.phrase.url)" :disabled="!q.phrase.url">
                <span class="xq-spk">${SPK}</span><span x-text="q.phrase.en"></span>
              </button>
            </div>
          </template>

          <h2 class="xq-ask" x-text="ASK[q.type][0]"></h2>
          <p class="xq-ask-my" lang="my" x-text="ASK[q.type][1]"></p>

          <!-- say / reply: options -->
          <template x-if="q.type === 'say' || q.type === 'reply'">
            <div class="xq-opts">
              <template x-for="o in opts" :key="o.k">
                <div class="xq-opt" :class="optClass(o)" @click="select(o.k)">
                  <button class="sound-btn" x-show="o.card && (q.listen || revealed)"
                          @click.stop="play(o.card.url)" aria-label="Listen">${SPK}</button>
                  <button class="xq-opt-text" :aria-pressed="sel === o.k" x-text="o.text"></button>
                  <span class="xq-mark" x-text="mark(o)"></span>
                </div>
              </template>
            </div>
          </template>

          <!-- judge: OK / not OK -->
          <template x-if="q.type === 'judge'">
            <div class="xq-judge">
              <button class="xq-jbtn" :class="jClass(true)" @click="select('ok')" :aria-pressed="sel === 'ok'">
                <span class="xq-jicon">👍</span><span class="xq-jtext">OK</span><small lang="my">ပြောလို့ရတယ်</small>
              </button>
              <button class="xq-jbtn" :class="jClass(false)" @click="select('no')" :aria-pressed="sel === 'no'">
                <span class="xq-jicon">👎</span><span class="xq-jtext">Not OK</span><small lang="my">မပြောသင့်ဘူး</small>
              </button>
            </div>
          </template>

          <!-- build: tap the tiles into the line -->
          <template x-if="q.type === 'build'">
            <div class="xq-build">
              <div class="xq-line" :class="lineClass()">
                <template x-for="(t, i) in placed" :key="t.k">
                  <button class="xq-tile" @click="take(i)" :disabled="revealed" x-text="i === 0 ? cap(t.w) : t.w"></button>
                </template>
                <span class="xq-end" x-show="placed.length" x-text="q.end"></span>
                <span class="xq-hint" x-show="!placed.length">Tap the words below.</span>
              </div>
              <div class="xq-bank">
                <template x-for="t in bank" :key="t.k">
                  <button class="xq-tile" :class="t.used && 'ghost'" :disabled="t.used || revealed"
                          @click="put(t)" x-text="t.w"></button>
                </template>
              </div>
            </div>
          </template>

          <!-- feedback -->
          <div class="xq-fb" x-show="revealed && fb" :class="fb && (fb.ok ? 'ok' : 'no')" aria-live="polite">
            <b x-text="fb && fb.head"></b>
            <p class="xq-fb-line" x-show="fb && fb.line">
              <span class="lbl">Correct:</span>
              <button class="xq-chipbtn" @click="play(fb.url)" x-text="fb && fb.line"></button>
            </p>
            <p class="xq-fb-note" x-show="fb && fb.note" x-text="fb && fb.note"></p>
          </div>
        </div>
      </template>

      <!-- ===== results ===== -->
      <template x-if="view === 'results'">
        <div class="xq-results">
          <div class="xq-score">
            <div class="xq-grade" x-text="grade"></div>
            <div class="xq-big" x-text="rightIds.length + ' / ' + round.length"></div>
            <p class="xq-pct"><b x-text="pct + '%'"></b> correct</p>
            <div class="xq-tally">
              <span class="t ok" x-text="rightIds.length + ' right'"></span>
              <span class="t no" x-text="wrongIds.length + ' wrong'"></span>
            </div>
          </div>

          <section class="xq-panel">
            <h3>Feedback</h3>
            <p x-show="!tips.length">You got every one right. Try this set again in a few days to keep it fresh.</p>
            <p x-show="tips.length" x-text="pct >= 75 ? 'Nice work! A few things to practice:' : 'Here is what to practice:'"></p>
            <ul class="xq-tips">
              <template x-for="t in tips" :key="t.tag">
                <li><span x-text="t.text"></span><span class="xq-tip-ex" x-text="t.phrases.join(' · ')"></span></li>
              </template>
            </ul>
          </section>

          <section class="xq-panel" x-show="wrongIds.length">
            <h3>Wrong answers <span class="xq-n no" x-text="wrongIds.length"></span></h3>
            <ul class="xq-review">
              <template x-for="w in wrongList" :key="w.id">
                <li>
                  <div class="xq-rv-q" x-text="w.label"></div>
                  <div class="xq-rv-row"><span class="lbl">You</span><s x-text="w.chosen"></s></div>
                  <div class="xq-rv-row"><span class="lbl">Correct</span>
                    <button class="xq-chipbtn" @click="play(w.url)" x-text="w.correct"></button></div>
                </li>
              </template>
            </ul>
          </section>

          <section class="xq-panel" x-show="rightIds.length">
            <h3>Right answers <span class="xq-n ok" x-text="rightIds.length"></span></h3>
            <div class="xq-rights">
              <template x-for="r in rightList" :key="r.id">
                <button class="xq-chipbtn ok" @click="play(r.url)"><i>✓</i><span x-text="r.text"></span></button>
              </template>
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>

  <div class="xq-foot">
    <button class="xq-round" @click="restart()" aria-label="Start again with all questions" title="Start again">↻</button>
    <button class="xq-round" @click="replay()" :disabled="!canReplay" aria-label="Listen again" title="Listen again">${SPK}</button>
    <button class="xq-main" @click="main()" :disabled="mainOff" x-text="mainLabel"></button>
  </div>
</div>`,
  );

  /* ---- the Alpine component ---- */
  document.addEventListener("alpine:init", () => {
    Alpine.data("exprQuiz", () => ({
      open: false,
      pushed: false, // opened by a link in this page, so Back closes it
      title: (document.querySelector("h1")?.textContent || "Expressions").trim(),
      problems,
      ASK,
      round: [],
      pos: 0,
      results: {}, // id -> { ok, tag, chosen }
      practice: false,
      view: "q", // "q" | "results"
      opts: [],
      bank: [],
      placed: [],
      sel: null,
      revealed: false,
      fb: null,
      cap,
      play,

      init() {
        window.addEventListener("hashchange", () => {
          if (location.hash === "#quiz") this.pushed = true;
          this.sync();
        });
        this.sync();
      },
      sync() {
        const want = location.hash === "#quiz";
        if (want && !this.open) this.show();
        else if (!want && this.open) this.hide();
      },
      show() {
        this.open = true;
        document.documentElement.classList.add("xq-lock");
        if (!this.round.length) this.start(order(), false);
        else if (this.view === "q" && !this.revealed) this.$nextTick(() => this.autoplay());
      },
      hide() {
        this.open = false;
        document.documentElement.classList.remove("xq-lock");
        player.pause();
      },
      close() {
        if (this.pushed) {
          this.pushed = false;
          history.back(); // -> hashchange -> hide()
          return;
        }
        try {
          history.replaceState(null, "", location.href.split("#")[0]);
        } catch (e) {
          location.hash = "";
        }
        this.hide();
      },

      get q() {
        return QS[this.round[this.pos]];
      },
      start(ids, practice) {
        this.round = ids;
        this.pos = 0;
        this.results = {};
        this.practice = practice;
        this.view = ids.length ? "q" : "results";
        if (ids.length) this.load();
      },
      restart() {
        this.start(order(), false);
      },
      load() {
        const q = this.q;
        this.sel = null;
        this.revealed = false;
        this.fb = null;
        this.placed = [];
        this.opts = q.opts ? shuffle(q.opts.map((o, k) => ({ ...o, k }))) : [];
        this.bank = q.tiles ? scramble(q.tiles) : [];
        this.$nextTick(() => {
          if (this.$refs.body) this.$refs.body.scrollTop = 0;
          this.autoplay();
        });
      },
      autoplay() {
        const q = this.q;
        if (!this.open || !q) return;
        if (q.type === "reply") play(q.prompt.url);
        if (q.type === "judge") play(q.phrase.url);
      },

      select(v) {
        if (!this.revealed) this.sel = v;
      },
      put(t) {
        if (this.revealed || t.used) return;
        t.used = true;
        this.placed.push(t);
      },
      take(i) {
        if (this.revealed) return;
        const [t] = this.placed.splice(i, 1);
        if (t) t.used = false;
      },

      get canCheck() {
        const q = this.q;
        return !!q && (q.type === "build" ? this.placed.length > 0 : this.sel !== null);
      },
      check() {
        const q = this.q;
        let ok, tag = null, note, chosen, line = "";
        if (q.type === "say" || q.type === "reply") {
          const o = this.opts.find((x) => x.k === this.sel);
          ok = o.ok;
          note = o.note;
          chosen = o.text;
          if (!ok) tag = o.tag;
        } else if (q.type === "build") {
          const built = this.placed.map((t) => t.w).join(" ");
          const n = norm(built);
          ok = n === q.target || q.also.includes(n);
          chosen = cap(built) + q.end;
          if (ok) note = q.note;
          else {
            const d = this.placed.find((t) => t.decoy);
            tag = d ? d.tag : "words";
            note = d ? d.note : "Look at the word order.";
            line = q.answer.en;
          }
        } else {
          const saidOk = this.sel === "ok";
          ok = saidOk === q.ok;
          note = q.note;
          chosen = saidOk ? "OK" : "Not OK";
          if (!ok) tag = q.tag;
        }
        const head =
          (ok ? "✓ Right!" : "✗ Not quite.") + (q.type === "judge" ? (q.ok ? " It's OK." : " It's not OK.") : "");
        this.results[q.id] = { ok, tag, chosen };
        this.revealed = true;
        this.fb = { ok, head, line, note, url: q.answer && q.answer.url };
        if (q.type !== "judge") play(q.answer.url);
        this.$nextTick(() => {
          const el = this.$root.querySelector(".xq-fb");
          if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      },
      next() {
        this.pos++;
        if (this.pos >= this.round.length) {
          this.view = "results";
          player.pause();
          this.$nextTick(() => this.$refs.body && (this.$refs.body.scrollTop = 0));
        } else this.load();
      },
      main() {
        if (this.view === "results") {
          const redo = this.wrongIds;
          if (redo.length) this.start(shuffle(redo), true);
          else this.start(order(), false);
        } else if (!this.revealed) {
          if (this.canCheck) this.check();
        } else this.next();
      },
      get mainLabel() {
        if (this.view === "results") return this.wrongIds.length ? `Practice these (${this.wrongIds.length})` : "Play again";
        if (!this.revealed) return "Check";
        return this.pos === this.round.length - 1 ? "See results" : "Next";
      },
      get mainOff() {
        return this.view === "q" && !this.revealed && !this.canCheck;
      },
      get canReplay() {
        const q = this.q;
        if (this.view !== "q" || !q) return false;
        if (q.type === "reply") return !!q.prompt.url;
        if (q.type === "judge") return !!q.phrase.url;
        return this.revealed && !!q.answer.url;
      },
      replay() {
        const q = this.q;
        if (!this.canReplay) return;
        play(q.type === "reply" ? q.prompt.url : q.type === "judge" ? q.phrase.url : q.answer.url);
      },

      onKey(e) {
        if (!this.open) return;
        if (e.key === "Escape") return this.close();
        const onButton = e.target && e.target.closest && e.target.closest("button, a");
        if (e.key === "Enter" && !onButton) {
          e.preventDefault();
          return this.main();
        }
        if (this.view !== "q" || this.revealed) return;
        const q = this.q;
        const n = Number(e.key);
        if (n >= 1 && n <= 9) {
          if (q.type === "judge" && n <= 2) this.select(n === 1 ? "ok" : "no");
          else if (q.opts && this.opts[n - 1]) this.select(this.opts[n - 1].k);
        } else if (e.key === "Backspace" && q.type === "build" && this.placed.length) {
          e.preventDefault();
          this.take(this.placed.length - 1);
        }
      },

      /* ---- classes ---- */
      dot(k) {
        const r = this.results[this.round[k]];
        return r ? (r.ok ? "right" : "wrong") : k === this.pos ? "now" : "";
      },
      optClass(o) {
        if (!this.revealed) return { sel: this.sel === o.k };
        return { right: o.ok, wrong: !o.ok && this.sel === o.k, dim: !o.ok && this.sel !== o.k };
      },
      mark(o) {
        if (!this.revealed) return "";
        return o.ok ? "✓" : this.sel === o.k ? "✗" : "";
      },
      jClass(isOk) {
        const v = isOk ? "ok" : "no";
        if (!this.revealed) return { sel: this.sel === v };
        const right = isOk === this.q.ok;
        return { right, wrong: !right && this.sel === v, dim: !right && this.sel !== v };
      },
      lineClass() {
        if (!this.revealed) return {};
        return this.results[this.q.id].ok ? "right" : "wrong";
      },

      /* ---- results ---- */
      get wrongIds() {
        return this.round.filter((id) => this.results[id] && !this.results[id].ok);
      },
      get rightIds() {
        return this.round.filter((id) => this.results[id] && this.results[id].ok);
      },
      get pct() {
        return this.round.length ? Math.round((100 * this.rightIds.length) / this.round.length) : 0;
      },
      get grade() {
        return GRADES.find(([min]) => this.pct >= min)[1];
      },
      get tips() {
        const out = [];
        for (const [tag, text] of Object.entries(TAGS)) {
          const hit = this.wrongIds.filter((id) => this.results[id].tag === tag);
          if (hit.length) out.push({ tag, text, phrases: hit.map((id) => answerText(QS[id])) });
        }
        return out;
      },
      get wrongList() {
        return this.wrongIds.map((id) => {
          const q = QS[id];
          return {
            id,
            label: label(q),
            chosen: this.results[id].chosen,
            correct: answerText(q),
            url: answerUrl(q),
          };
        });
      },
      get rightList() {
        return this.rightIds.map((id) => ({ id, text: answerText(QS[id]), url: answerUrl(QS[id]) }));
      },
    }));
  });
})();
