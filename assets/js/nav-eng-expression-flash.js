/* ---------------------------------------------------------------
   Hamburger sidebar for the English expression flashcard pages
   (eng/expressions/<topic>.html). Inserts the menu markup into <body>
   and lists every expression category. Styled by pimsleur.css on the
   card pages, and by nav-eng-expression.css on the typing quizzes
   (<topic>_quiz.html), which also load this menu.
   Add new categories by extending CATEGORIES below; quiz: "<file>" adds
   a "✍️ Quiz" link under the category.
--------------------------------------------------------------- */
(function () {
  const CATEGORIES = [
    { label: "👋 Greetings & Goodbyes", href: "greet_goodbye.html", quiz: "greet_goodbye_quiz.html" },
    { label: "🙏 Thanking", href: "thank.html" },
    { label: "🙇 Apology", href: "apology.html" },
    { label: "😮 Exclamations", href: "exclamation.html" },
    { label: "🤔 Not Understanding", href: "not_understanding.html" },
    { label: "🙋 Asking", href: "ask.html" },
    { label: "🤝 Offering & Accepting", href: "offer_accept.html" },
    { label: "🙅 Polite Refusal", href: "polite_refusal.html" },
    { label: "❤️ Likes & Dislikes", href: "likes_dislikes.html" },
    { label: "💬 Opinions", href: "opinion.html" },
    { label: "☕ Small Talk", href: "small_talk.html" },
  ];

  // ── Insert hamburger, overlay and sidebar ──
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <button id="hamburger" aria-label="Open menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <div id="sidebar-overlay"></div>
    <nav id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">English Expressions</div>
        <div class="sidebar-subtitle">Categories</div>
      </div>
      <div class="sidebar-scroll" id="sidebar-scroll"></div>
    </nav>`,
  );

  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const scroll = document.getElementById("sidebar-scroll");

  function setOpen(open) {
    sidebar.classList.toggle("open", open);
    overlay.classList.toggle("visible", open);
    hamburger.classList.toggle("open", open);
  }
  hamburger.addEventListener("click", () =>
    setOpen(!sidebar.classList.contains("open")),
  );
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // ── Category list; the current page's entry is highlighted ──
  // The live site serves pages without ".html" in the URL.
  const stem = (name) => name.replace(/\.html$/, "");
  const currentFile = stem(location.pathname.split("/").pop());
  const list = document.createElement("div");
  list.className = "lessons-list open";

  function addLink(label, href, indent) {
    const a = document.createElement("a");
    a.className = "lesson-link";
    a.textContent = label;
    a.href = href;
    if (indent) a.style.paddingLeft = "56px";
    if (currentFile === stem(href)) {
      a.classList.add("active");
    }
    list.appendChild(a);
  }
  CATEGORIES.forEach((cat) => {
    addLink(cat.label, cat.href);
    if (cat.quiz) addLink("✍️ Quiz", cat.quiz, true);
  });

  // Quiz pages (ytstory.css layout): make room in the header for the button.
  const stage = document.querySelector(".stage");
  if (stage) stage.classList.add("has-lesson-nav");

  scroll.appendChild(list);

  const active = list.querySelector(".active");
  if (active) active.scrollIntoView({ block: "center" });
})();
