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
    { label: "🥰 Admiration", href: "admiration.html", flash: true },
    { label: "👍 Agree", href: "agree.html", flash: true },
    { label: "👎 Disagree", href: "disagree.html", flash: true },
    { label: "😤 Annoyance", href: "annoyance.html", flash: true },
    { label: "🙏 Apology", href: "apology.html", flash: true },
    { label: "🆘 Asking & Offering Help", href: "help.html", flash: true },
    { label: "❓ Clarify", href: "clarify.html", flash: true },
    { label: "🏆 Compliment", href: "compliment.html", flash: true },
    { label: "🎉 Congratulating", href: "congrats.html", flash: true },
    { label: "🔗 Connectors", href: "connectors.html", flash: true },
    { label: "🧐 Critique", href: "critique.html", flash: true },
    { label: "🧭 Directions & Transportation", href: "directions.html", flash: true },
    { label: "😲 Disbelief", href: "disbelief.html", flash: true },
    { label: "😌 Doucement", href: "doucement.html", flash: true },
    { label: "🎉 Excitement", href: "excitement.html", flash: true },
    { label: "❗ Exclamation", href: "exclamation.html", flash: true },
    { label: "😴 Fatigue & Being Fed Up", href: "fatigue.html", flash: true },
    { label: "💐 Gratitude", href: "thank.html", flash: true },
    { label: "👋 Greetings & Goodbyes", href: "greetings.html", flash: true },
    { label: "🗣️ Idioms", href: "idioms.html", flash: true },
    { label: "💭 I Mean", href: "iMean.html", flash: true },
    { label: "🎈 Interjections and Fillers", href: "fillers.html", flash: true },
    { label: "🎲 Miscellaneous", href: "miscellaneous.html", flash: true },
    { label: "🗳️ Opinion", href: "opinion.html", flash: true },
    { label: "☕ Offers", href: "offers.html", flash: true },
    { label: "🙋 Permission", href: "permission.html", flash: true },
    { label: "😐 Quality Critique", href: "quality.html", flash: true },
    { label: "🤗 Reassurance", href: "reassurance.html", flash: true },
    { label: "🙅 Refusal", href: "refusal.html", flash: true },
    { label: "😔 Regret", href: "regret.html", flash: true },
    { label: "🍽️ Restaurant", href: "restaurant.html", flash: true },
    { label: "🌱 Suggestion", href: "suggestion.html", flash: true },
    { label: "💡 Understanding", href: "understand.html", flash: true },
    { label: "✨ Et voilà", href: "voila.html", flash: true },
    { label: "🎁 Wishes", href: "wishes.html", flash: true },
    { label: "🤔 What's Wrong / Checking In", href: "whatswrong.html", flash: true },
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
