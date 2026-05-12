document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll('[data-aos="fade-up"]')
    .forEach((el) => el.setAttribute("data-aos", "fade-up"));

  AOS.init({
    once: true,
    duration: 650,
    easing: "ease-out",
  });

  // Language column toggle
  const langBtns = document.querySelectorAll(".lang-toggle .btn");
  const colEN = document.querySelectorAll(".col-en");
  const colFR = document.querySelectorAll(".col-fr");
  function setCols(mode) {
    if (mode === "en") {
      colEN.forEach((td) => (td.parentElement.style.display = ""));
      colFR.forEach((td) => (td.style.display = "none"));
      document
        .querySelectorAll("thead .col-fr")
        .forEach((th) => (th.style.display = "none"));
      document
        .querySelectorAll("thead .col-en")
        .forEach((th) => (th.style.display = ""));
    } else if (mode === "fr") {
      colEN.forEach((td) => (td.style.display = "none"));
      colFR.forEach((td) => (td.parentElement.style.display = ""));
      document
        .querySelectorAll("thead .col-fr")
        .forEach((th) => (th.style.display = ""));
      document
        .querySelectorAll("thead .col-en")
        .forEach((th) => (th.style.display = "none"));
    } else {
      colEN.forEach((td) => (td.style.display = ""));
      colFR.forEach((td) => (td.style.display = ""));
      document
        .querySelectorAll("thead .col-fr")
        .forEach((th) => (th.style.display = ""));
      document
        .querySelectorAll("thead .col-en")
        .forEach((th) => (th.style.display = ""));
    }
  }
  langBtns.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      langBtns.forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      setCols(e.currentTarget.dataset.col);
    })
  );

  // Keep section buttons active while their panel is open
  document.querySelectorAll(".toggle-btn[data-bs-target]").forEach((btn) => {
    const targetSelector = btn.getAttribute("data-bs-target");
    if (!targetSelector) return;

    const target = document.querySelector(targetSelector);
    if (!target) return;

    if (target.classList.contains("show")) {
      btn.classList.add("active");
    }

    target.addEventListener("show.bs.collapse", () => {
      btn.classList.add("active");
    });
    target.addEventListener("hide.bs.collapse", () => {
      btn.classList.remove("active");
    });
  });

  // Search filter
  const search = document.getElementById("search");
  const rows = Array.from(document.querySelectorAll("tbody tr"));
  function filter(q) {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    rows.forEach((tr) => {
      const txt = tr.innerText.toLowerCase();
      const ok = terms.every((t) => txt.includes(t));
      tr.style.display = ok ? "" : "none";
    });
  }
  search?.addEventListener("input", (e) => filter(e.target.value));
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === "Escape") {
      search.value = "";
      filter("");
    }
  });

  // Convert inline example spans in Notes column into dropdown lists
  const noteCells = document.querySelectorAll("table tbody tr td:nth-child(3)");
  noteCells.forEach((cell) => {
    const exampleSpans = Array.from(
      cell.querySelectorAll('span[data-bs-toggle="tooltip"]')
    );
    if (!exampleSpans.length) return;

    const dropdown = document.createElement("div");
    dropdown.className = "dropdown note-example-dropdown mt-2";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-sm btn-outline-light dropdown-toggle";
    toggle.dataset.bsToggle = "dropdown";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent =
      exampleSpans.length > 1 ? "Show examples" : "Show example";

    const menu = document.createElement("ul");
    menu.className = "dropdown-menu note-example-menu";
    menu.setAttribute("role", "menu");

    exampleSpans.forEach((span) => {
      const item = document.createElement("li");
      const itemContent = document.createElement("span");
      itemContent.className = "dropdown-item-text note-example-item";

      const exampleText = document.createElement("span");
      exampleText.className = "note-example-text";
      exampleText.innerHTML = span.innerHTML.trim();
      itemContent.appendChild(exampleText);

      const title = span.getAttribute("title");
      if (title) {
        const meta = document.createElement("small");
        meta.className = "note-example-meta d-block mt-1";
        meta.textContent = title;
        itemContent.appendChild(meta);
      }

      span.removeAttribute("data-bs-toggle");
      span.removeAttribute("title");
      span.remove();

      item.appendChild(itemContent);
      menu.appendChild(item);
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(menu);
    cell.appendChild(dropdown);
  });

  const scrollTopBtn = document.getElementById("scrollTop");
  if (scrollTopBtn) {
    const toggleScrollTop = () => {
      const offset = window.scrollY || document.documentElement.scrollTop || 0;
      const shouldShow = offset > 280;
      scrollTopBtn.classList.toggle("visible", shouldShow);
    };
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", toggleScrollTop, { passive: true });
    toggleScrollTop();
  }
});

// Store button positions
const buttonPositions = new Map();

// Get all toggle buttons
const toggleButtons = document.querySelectorAll('[data-bs-toggle="collapse"]');

toggleButtons.forEach((btn) => {
  const targetId = btn.getAttribute("data-bs-target");
  const target = document.querySelector(targetId);

  if (!target) return;

  // Add AOS attribute to target if not already present
  if (!target.hasAttribute("data-aos")) {
    target.setAttribute("data-aos", "fade-up");
  }

  // On button click
  btn.addEventListener("click", function () {
    // If currently expanded (about to collapse), save position
    if (this.getAttribute("aria-expanded") === "true") {
      buttonPositions.set(
        targetId,
        btn.getBoundingClientRect().top + window.scrollY
      );
    }
  });

  // When content is shown (expanded)
  target.addEventListener("shown.bs.collapse", function () {
    // Refresh AOS to trigger animation
    target.classList.remove("aos-animate");
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Trigger AOS animation
      target.classList.add("aos-animate");
      if (typeof AOS !== "undefined") {
        AOS.refresh();
      }
    }, 100);
  });

  // When content is hidden (collapsed)
  target.addEventListener("hidden.bs.collapse", function () {
    const savedPosition = buttonPositions.get(targetId);
    if (savedPosition !== undefined) {
      window.scrollTo({ top: savedPosition, behavior: "smooth" });
    }
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) =>
      new bootstrap.Tooltip(tooltipTriggerEl, { placement: "top" })
  );
});
