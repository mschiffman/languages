/* ---------------------------------------------------------------
   Hamburger sidebar for the expression flashcard pages
   (fr/expression/n-*.html). Inserts the menu markup into <body> and
   lists every expression category. Styled by pimsleur.css.
   Add new categories by extending CATEGORIES below; mark the ones that
   have a flashcard page (n-<href>) with flash: true so the menu keeps
   readers on the flashcards.
--------------------------------------------------------------- */
(function () {
  const CATEGORIES = [
    { label: "🥰 Admiration", href: "admiration.html" },
    { label: "👍 Agree", href: "agree.html", flash: true },
    { label: "👎 Disagree", href: "disagree.html" },
    { label: "😤 Annoyance", href: "annoyance.html" },
    { label: "🙏 Apology", href: "apology.html" },
    { label: "🆘 Asking & Offering Help", href: "help.html" },
    { label: "❓ Clarify", href: "clarify.html" },
    { label: "🏆 Compliment", href: "compliment.html" },
    { label: "🎉 Congratulating", href: "congrats.html" },
    { label: "🔗 Connectors", href: "connectors.html" },
    { label: "🧐 Critique", href: "critique.html" },
    { label: "🧭 Directions & Transportation", href: "directions.html" },
    { label: "😲 Disbelief", href: "disbelief.html" },
    { label: "😌 Doucement", href: "doucement.html" },
    { label: "🎉 Excitement", href: "excitement.html" },
    { label: "❗ Exclamation", href: "exclamation.html" },
    { label: "😴 Fatigue & Being Fed Up", href: "fatigue.html" },
    { label: "💐 Gratitude", href: "thank.html" },
    { label: "👋 Greetings & Goodbyes", href: "greetings.html" },
    { label: "🗣️ Idioms", href: "idioms.html" },
    { label: "💭 I Mean", href: "iMean.html", flash: true },
    { label: "🎈 Interjections and Fillers", href: "fillers.html" },
    { label: "🎲 Miscellaneous", href: "miscellaneous.html" },
    { label: "🗳️ Opinion", href: "opinion.html" },
    { label: "😐 Quality Critique", href: "quality.html" },
    { label: "🤗 Reassurance", href: "reassurance.html" },
    { label: "🙅 Refusal", href: "refusal.html", flash: true },
    { label: "😔 Regret", href: "regret.html" },
    { label: "🍽️ Restaurant", href: "restaurant.html" },
    { label: "🌱 Suggestion", href: "suggestion.html" },
    { label: "💡 Understanding", href: "understand.html", flash: true },
    { label: "✨ Et voilà", href: "voila.html" },
    { label: "🎁 Wishes", href: "wishes.html" },
    { label: "🤔 What's Wrong / Checking In", href: "whatswrong.html" },
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
        <div class="sidebar-title">Les Expressions</div>
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

  // ── Category list; n-refusal.html highlights the "refusal.html" entry ──
  const currentFile = location.pathname.split("/").pop();
  const list = document.createElement("div");
  list.className = "lessons-list open";

  CATEGORIES.forEach((cat) => {
    const a = document.createElement("a");
    a.className = "lesson-link";
    a.textContent = cat.label;
    a.href = cat.flash ? "n-" + cat.href : cat.href;
    if (currentFile === cat.href || currentFile === "n-" + cat.href) {
      a.classList.add("active");
    }
    list.appendChild(a);
  });

  scroll.appendChild(list);

  const active = list.querySelector(".active");
  if (active) active.scrollIntoView({ block: "center" });
})();
