/*
  French grammar menu: a hamburger button (top left) that opens a slide-in
  panel with a link to the grammar index and one collapsible menu per folder
  of fr/grammar, each listing that folder's pages.

  Self-contained: it builds its own Shadow DOM, so it needs no CSS/Bootstrap
  and the host page's styles cannot affect it. Links are resolved from this
  script's own location, so it works from any folder depth and from file://.

  The MENU block below is generated: edit nothing between the markers, run
      python fr/grammar/update_nav_grammar.py
  after adding, renaming or deleting a grammar page.
*/
(() => {
  /* BEGIN MENU DATA */
  const MENU = [
    {
      label: "Adjectives",
      pages: [
        {
          t: "Adjectives in Everyday Speech",
          h: "adjectives.html",
        },
      ],
      groups: [],
      dir: "adjective",
    },
    {
      label: "Adverbs",
      pages: [
        {
          t: "Adverbs in Everyday Speech",
          h: "adverbs.html",
        },
        {
          t: "La prononciation de «plus» — French Grammar",
          h: "plus.html",
        },
        {
          t: "The Many Uses of « plus »",
          h: "plus_usage.html",
        },
      ],
      groups: [],
      dir: "adverb",
    },
    {
      label: "Articles",
      pages: [
        {
          t: "Articles in Everyday Speech",
          h: "articles.html",
        },
      ],
      groups: [],
      dir: "article",
    },
    {
      label: "Comparatives",
      pages: [
        {
          t: "Comparatives in Everyday Speech",
          h: "comparatives.html",
        },
      ],
      groups: [],
      dir: "comparative",
    },
    {
      label: "Gerund",
      pages: [
        {
          t: "Gerund in Everyday Speech",
          h: "gerund.html",
        },
      ],
      groups: [],
      dir: "gerund",
    },
    {
      label: "Imperatives",
      pages: [
        {
          t: "Imperatives in Everyday Speech",
          h: "imperatives.html",
        },
      ],
      groups: [],
      dir: "imperative",
    },
    {
      label: "Linking words",
      pages: [
        {
          t: "Linking Words in Everyday Speech",
          h: "connectors.html",
        },
      ],
      groups: [],
      dir: "connector",
    },
    {
      label: "Negation",
      pages: [
        {
          t: "Negation in Everyday Speech",
          h: "negation.html",
        },
      ],
      groups: [],
      dir: "negation",
    },
    {
      label: "Nouns",
      pages: [
        {
          t: "Nouns in Everyday Speech",
          h: "nouns.html",
        },
        {
          t: "Les animaux",
          h: "animals.html",
        },
        {
          t: "À l'école",
          h: "atSchool.html",
        },
        {
          t: "Le Corps Humain (body)",
          h: "body.html",
        },
        {
          t: "La Maison et le Jardin - French Learning Hub",
          h: "house.html",
        },
        {
          t: "Body - Hotspots",
          h: "hs-body.html",
        },
        {
          t: "Medical Terms - Hotspots",
          h: "hs-healthProf.html",
        },
        {
          t: "House - Hotspots",
          h: "hs-house.html",
        },
        {
          t: "Kitchen - Hotspots",
          h: "hs-kitchen.html",
        },
        {
          t: "Landforms - Hotspots",
          h: "hs-landform.html",
        },
        {
          t: "Kitchen Icicle",
          h: "kitchen-icicle.html",
        },
        {
          t: "La Cuisine - French Learning Hub",
          h: "kitchen.html",
        },
        {
          t: "Les Reliefs - French Learning Hub",
          h: "landforms.html",
        },
        {
          t: "Landforms - Dictation",
          h: "landforms_dictation.html",
        },
        {
          t: "Landforms - match",
          h: "landforms_match.html",
        },
        {
          t: "Mind Map - Kitchen",
          h: "me-kitchen.html",
        },
        {
          t: "Mind Map - Landforms",
          h: "me-landforms.html",
        },
        {
          t: "Le Corps Humain",
          h: "slides-body.html",
        },
        {
          t: "La Maison et le Jardin",
          h: "slides-house.html",
        },
        {
          t: "Les Reliefs",
          h: "slides-landform.html",
        },
        {
          t: "Human Body",
          h: "video-body.html",
        },
        {
          t: "Home & Garden",
          h: "video-house.html",
        },
        {
          t: "Landforms",
          h: "video-landforms.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-alors)",
          h: "vocab-alors.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-bien)",
          h: "vocab-bien.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-book)",
          h: "vocab-book.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-chopsticks)",
          h: "vocab-chopsticks.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-cutlery)",
          h: "vocab-cutlery.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-eye)",
          h: "vocab-eye.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-fork)",
          h: "vocab-fork.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-knife)",
          h: "vocab-knife.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-nouveau)",
          h: "vocab-nouveau.html",
        },
        {
          t: "Collocation Web: Le Couteau (vocab-spoon)",
          h: "vocab-spoon.html",
        },
        {
          t: "Collocation Web: Le Couteau",
          h: "vocab-voir.html",
        },
      ],
      groups: [
        {
          label: "Cooking",
          pages: [
            {
              t: "Collocation Web: La Fourchette (collo-cooktop)",
              h: "collo-cooktop.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-kettle)",
              h: "collo-kettle.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-microwave)",
              h: "collo-microwave.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-oven)",
              h: "collo-oven.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-range hood)",
              h: "collo-range hood.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-rice cooker)",
              h: "collo-rice cooker.html",
            },
            {
              t: "Collocation Web: La Fourchette (collo-toaster oven)",
              h: "collo-toaster oven.html",
            },
            {
              t: "Collocation Web: La Fourchette",
              h: "collo-toaster.html",
            },
          ],
          groups: [],
          dir: "cooking",
        },
        {
          label: "Single",
          pages: [
            {
              t: "Les animaux",
              h: "animals.html",
            },
            {
              t: "À l'école",
              h: "atSchool.html",
            },
          ],
          groups: [],
          dir: "single",
        },
        {
          label: "Utensils",
          pages: [
            {
              t: "Utensils Flipcards",
              h: "anki_noun.html",
            },
            {
              t: "Verbs Flipcards",
              h: "anki_verb.html",
            },
            {
              t: "Collocation Web: Les Baguettes",
              h: "chopsticks.html",
            },
            {
              t: "Cloze Test: Table Manners",
              h: "cloze.html",
            },
            {
              t: "Venn",
              h: "coupant.html",
            },
            {
              t: "Create",
              h: "create.html",
            },
            {
              t: "Collocation Web: Les Couverts",
              h: "cutlery.html",
            },
            {
              t: "Collocation Web: La Fourchette",
              h: "fork.html",
            },
            {
              t: "Utensils",
              h: "hotspot.html",
            },
            {
              t: "Collocation Web: Le Couteau",
              h: "knife.html",
            },
            {
              t: "Listening Test: Dual Voice",
              h: "listen-master.html",
            },
            {
              t: "Smart Dictation - 10 Levels",
              h: "listen.html",
            },
            {
              t: "Reading Comprehension",
              h: "read.html",
            },
            {
              t: "Sentence Scramble: Table Manners",
              h: "reorder.html",
            },
            {
              t: "Interactive Dialogue (rolePlay1)",
              h: "rolePlay1.html",
            },
            {
              t: "Interactive Dialogue",
              h: "rolePlay2.html",
            },
            {
              t: "Collocation Web: La cuillère",
              h: "spoon.html",
            },
            {
              t: "Translation Quiz",
              h: "translation.html",
            },
            {
              t: "Interactive Venn (Drag & Drop)",
              h: "venn.html",
            },
          ],
          groups: [],
          dir: "utensils",
        },
      ],
      dir: "noun",
    },
    {
      label: "Numbers & quantity",
      pages: [
        {
          t: "Numbers, Time and Quantity in Everyday Speech",
          h: "numbers.html",
        },
      ],
      groups: [],
      dir: "quantity",
    },
    {
      label: "Others",
      pages: [
        {
          t: "Y / EN Quiz (french-y-en-exercise1)",
          h: "french-y-en-exercise1.html",
        },
        {
          t: "Y / EN Quiz",
          h: "french-y-en-exercise2.html",
        },
        {
          t: "Pronouns: Y and En",
          h: "french-y-en.html",
        },
        {
          t: "Mastering French Pronouns - Interactive Lesson",
          h: "pronouns.html",
        },
      ],
      groups: [],
      dir: "others",
    },
    {
      label: "Passive",
      pages: [
        {
          t: "Passive in Everyday Speech",
          h: "passive.html",
        },
      ],
      groups: [],
      dir: "passive",
    },
    {
      label: "Prepositions",
      pages: [
        {
          t: "Prepositions in Everyday Speech",
          h: "prepositions.html",
        },
      ],
      groups: [],
      dir: "preposition",
    },
    {
      label: "Pronouns",
      pages: [
        {
          t: "Pronouns in Everyday Speech",
          h: "pronouns.html",
        },
      ],
      groups: [],
      dir: "pronoun",
    },
    {
      label: "Questions",
      pages: [
        {
          t: "Questions in Everyday Speech",
          h: "questions.html",
        },
      ],
      groups: [],
      dir: "question",
    },
    {
      label: "Reported speech",
      pages: [
        {
          t: "Reported Speech in Everyday French",
          h: "reported-speech.html",
        },
      ],
      groups: [],
      dir: "reported",
    },
    {
      label: "Si-clauses",
      pages: [
        {
          t: "Si-Clauses in Everyday Speech",
          h: "si-clauses.html",
        },
      ],
      groups: [],
      dir: "condition",
    },
    {
      label: "Subjunctive",
      pages: [
        {
          t: "Subjunctive in Everyday Speech",
          h: "subjunctive.html",
        },
      ],
      groups: [],
      dir: "subjunctive",
    },
    {
      label: "Tenses",
      pages: [
        {
          t: "Présent de l’indicatif",
          h: "index.html",
        },
        {
          t: "Conditionnel présent",
          h: "conditionnel.html",
        },
        {
          t: "Application Interactive : Le Futur Simple",
          h: "ex-futur-simple.html",
        },
        {
          t: "Interactive French Present Tense Practice",
          h: "ex-present.html",
        },
        {
          t: "Sentence Builder",
          h: "exercice.html",
        },
        {
          t: "Present Tense - Flash Cards",
          h: "fc-present.html",
        },
        {
          t: "Futur simple de l'indicatif",
          h: "futur-simple.html",
        },
        {
          t: "Futur Proche",
          h: "future.html",
        },
        {
          t: "Imparfait",
          h: "imparfait.html",
        },
        {
          t: "Mind Map - Conditionnel Présent Tense",
          h: "me-conditionnel-present.html",
        },
        {
          t: "Mind Map - Futur Proche Tense",
          h: "me-futur-proche.html",
        },
        {
          t: "Mind Map - Imparfait Tense",
          h: "me-imparfait.html",
        },
        {
          t: "Mind Map - Passé Composé Tense",
          h: "me-passe-compose.html",
        },
        {
          t: "Mind Map - Present Tense (me-plus-que-parfait)",
          h: "me-plus-que-parfait.html",
        },
        {
          t: "Mind Map - Present Tense",
          h: "me-present.html",
        },
        {
          t: "Mind Map - Subjonctif Tense",
          h: "me-subjonctif.html",
        },
        {
          t: "Passé composé",
          h: "passe.html",
        },
        {
          t: "Plus-que-parfait",
          h: "plus-que-parfait.html",
        },
        {
          t: "Présent de l'indicatif (present)",
          h: "present.html",
        },
        {
          t: "Présent de l'indicatif (slides-present)",
          h: "slides-present.html",
        },
        {
          t: "Subjonctif présent",
          h: "subjonctif.html",
        },
        {
          t: "Présent de l'indicatif",
          h: "video-present.html",
        },
      ],
      groups: [],
      dir: "tense",
    },
    {
      label: "Verbs",
      pages: [
        {
          t: "Verbs in Everyday Speech",
          h: "verbs.html",
        },
        {
          t: "Collocation Web: Les Tâches Quotidiennes",
          h: "index.html",
        },
        {
          t: "Collocation Web: Les Actions du Quotidien (daily)",
          h: "daily.html",
        },
        {
          t: "Collocation Web: Les Travaux de Jardinage",
          h: "garden.html",
        },
        {
          t: "Collocation Web: Les Actions du Quotidien",
          h: "routine.html",
        },
      ],
      groups: [],
      dir: "verb",
    },
  ];
  /* END MENU DATA */

  if (window.__grammarNav) return;
  window.__grammarNav = true;

  const me = document.currentScript;
  const root = new URL("../../fr/grammar/", me ? me.src : location.href);
  const here = decodeURIComponent(location.pathname).replace(/\/$/, "");

  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const urlFor = (parts) =>
    new URL(parts.map(encodeURIComponent).join("/"), root);
  const isHere = (u) => decodeURIComponent(u.pathname) === here;

  // Build one group; returns {html, open} where open = contains current page.
  function group(g, path, depth) {
    const here_ = [];
    let open = false;
    const pages = g.pages
      .map((p) => {
        const u = urlFor([...path, p.h]);
        const cur = isHere(u);
        if (cur) open = true;
        return `<a class="page${cur ? " cur" : ""}" href="${esc(u.href)}"${cur ? ' aria-current="page"' : ""}>${esc(p.t)}</a>`;
      })
      .join("");
    const subs = g.groups
      .map((s) => {
        const r = group(s, [...path, s.dir], depth + 1);
        if (r.open) open = true;
        return r.html;
      })
      .join("");
    const count =
      g.pages.length + g.groups.reduce((n, s) => n + s.pages.length, 0);
    const html =
      `<details class="grp d${depth}"${open ? " open" : ""}>` +
      `<summary><span>${esc(g.label)}</span><em>${count}</em></summary>` +
      `<div class="kids">${pages}${subs}</div></details>`;
    return { html, open, here_ };
  }

  const indexUrl = new URL("index.html", root);
  const indexCur =
    isHere(indexUrl) ||
    here === decodeURIComponent(root.pathname).replace(/\/$/, "");
  const body = MENU.map((g) => group(g, [g.dir], 0).html).join("");

  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .btn {
      position: fixed; top: 12px; left: 12px; z-index: 2147483000;
      width: 44px; height: 44px; padding: 0; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
      background: rgba(15, 23, 42, .88); border: 1px solid rgba(255,255,255,.35); border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,.3); backdrop-filter: blur(4px);
    }
    .btn:hover { background: rgba(15, 23, 42, 1); }
    .btn:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }
    .btn i { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; transition: transform .2s, opacity .2s; }
    .shade { position: fixed; inset: 0; z-index: 2147483001; background: rgba(0,0,0,.45); opacity: 0; visibility: hidden; transition: opacity .2s, visibility .2s; }
    .panel {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 2147483002;
      width: min(320px, 88vw); overflow-y: auto; overscroll-behavior: contain;
      background: #0f172a; color: #e2e8f0; box-shadow: 4px 0 24px rgba(0,0,0,.4);
      font: 15px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      transform: translateX(-102%); visibility: hidden; transition: transform .22s ease, visibility .22s;
    }
    :host(.open) .panel { transform: none; visibility: visible; }
    :host(.open) .shade { opacity: 1; visibility: visible; }
    .top { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 10px 16px; border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: #0f172a; z-index: 1; }
    .top b { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; }
    .x { background: none; border: 0; color: #cbd5e1; font-size: 26px; line-height: 1; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
    .x:hover { background: #1e293b; color: #fff; }
    nav { padding: 10px 10px 24px; }
    a { color: inherit; text-decoration: none; display: block; }
    .home { display: flex; align-items: center; gap: 10px; padding: 11px 12px; margin-bottom: 8px; border-radius: 8px; background: #0e7490; color: #fff; font-weight: 600; }
    .home:hover { background: #0891b2; }
    .home.cur { outline: 2px solid #fbbf24; }
    details { margin: 2px 0; }
    summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; font-weight: 600; color: #f1f5f9; user-select: none; }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: ""; width: 7px; height: 7px; border-right: 2px solid #94a3b8; border-bottom: 2px solid #94a3b8; transform: rotate(-45deg); transition: transform .15s; flex: none; margin-right: 2px; }
    details[open] > summary::before { transform: rotate(45deg); }
    summary:hover { background: #1e293b; }
    summary span { flex: 1; }
    summary em { font-style: normal; font-size: 12px; color: #94a3b8; background: #1e293b; border-radius: 999px; padding: 1px 8px; }
    .kids { margin: 2px 0 6px 14px; padding-left: 8px; border-left: 1px solid #334155; }
    .page { padding: 7px 10px; border-radius: 6px; color: #cbd5e1; font-size: 14px; overflow-wrap: anywhere; }
    .page:hover { background: #1e293b; color: #fff; }
    .page.cur { background: #164e63; color: #fff; font-weight: 600; box-shadow: inset 3px 0 0 #fbbf24; }
    .d1 > summary { font-weight: 500; font-size: 14px; color: #cbd5e1; padding: 7px 10px; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `;

  const host = document.createElement("div");
  host.id = "grammar-nav";
  const sh = host.attachShadow({ mode: "open" });
  sh.innerHTML = `
    <style>${css}</style>
    <button class="btn" type="button" aria-label="Open grammar menu" aria-expanded="false" aria-controls="panel"><i></i><i></i><i></i></button>
    <div class="shade"></div>
    <aside class="panel" id="panel" aria-label="French grammar menu">
      <div class="top"><b>French Grammar</b><button class="x" type="button" aria-label="Close menu">&times;</button></div>
      <nav>
        <a class="home${indexCur ? " cur" : ""}" href="${esc(indexUrl.href)}">&#8962;&nbsp; Grammar index</a>
        ${body}
      </nav>
    </aside>`;

  const btn = sh.querySelector(".btn");
  const toggle = (open) => {
    host.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute(
      "aria-label",
      open ? "Close grammar menu" : "Open grammar menu",
    );
    if (open) {
      const cur = sh.querySelector(".page.cur");
      if (cur) cur.scrollIntoView({ block: "center" });
    }
  };
  btn.addEventListener("click", () => toggle(!host.classList.contains("open")));
  sh.querySelector(".shade").addEventListener("click", () => toggle(false));
  sh.querySelector(".x").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && host.classList.contains("open")) {
      toggle(false);
      btn.focus();
    }
  });

  const mount = () => document.body.appendChild(host);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
