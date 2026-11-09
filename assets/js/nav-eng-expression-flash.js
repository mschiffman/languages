/* ---------------------------------------------------------------
   Hamburger sidebar for the English expression flashcard pages
   (eng/expressions/<topic>.html). Inserts the menu markup into <body>
   and lists every expression category. Styled by pimsleur.css.
   Add new categories by extending CATEGORIES below.
--------------------------------------------------------------- */
(function () {
  const CATEGORIES = [
    { label: "👋 Greetings & Goodbyes", href: "greet_goodbye.html" },
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

  CATEGORIES.forEach((cat) => {
    const a = document.createElement("a");
    a.className = "lesson-link";
    a.textContent = cat.label;
    a.href = cat.href;
    if (currentFile === stem(cat.href)) {
      a.classList.add("active");
    }
    list.appendChild(a);
  });

  scroll.appendChild(list);

  const active = list.querySelector(".active");
  if (active) active.scrollIntoView({ block: "center" });
})();
