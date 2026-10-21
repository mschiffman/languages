/* ---------------------------------------------------------------
   Hamburger sidebar for the phonetic flashcard pages
   (fr/enunciation/<sound>/index.html). Same links as nav-enun.js,
   styled by pimsleur.css like the expression flashcard menu.
   Add new sounds by extending SECTIONS below; dir is the folder
   name under fr/enunciation/.
--------------------------------------------------------------- */
(function () {
  const pathParts = location.pathname.split("/").filter(Boolean);
  const enunIndex = pathParts.indexOf("enunciation");
  const rootParts = enunIndex >= 2 ? pathParts.slice(0, enunIndex - 1) : [];
  const rootPrefix = `/${rootParts.join("/")}${rootParts.length ? "/" : ""}`;
  const enunPrefix =
    enunIndex >= 0 ? `/${pathParts.slice(0, enunIndex + 1).join("/")}/` : "/";

  const sound = (dir, label) => ({
    label,
    href: `${enunPrefix}${dir}/index.html`,
    dir,
  });

  const SECTIONS = [
    {
      name: "Phonetic Rules",
      links: [
        { label: "🗣️ Consonants", href: `${enunPrefix}consonant.html` },
        { label: "👄 Oral Vowels", href: `${enunPrefix}vowel.html` },
        { label: "👃 Nasal Vowels", href: `${enunPrefix}nasal.html` },
        { label: "🔗 Liaison", href: `${enunPrefix}liaison.html` },
      ],
    },
    {
      name: "Vowels",
      links: [
        sound("i", "/i/"),
        sound("e", "/e/"),
        sound("ε", "/ɛ/"),
        sound("a", "/a/"),
        sound("ɑ", "/ɑ/"),
        sound("ə", "/ə/"),
        sound("œ", "/œ/"),
        sound("ø", "/ø/"),
        sound("ɔ", "/ɔ/"),
        sound("o", "/o/"),
        sound("u", "/u/"),
        sound("y", "/y/"),
      ],
    },
    {
      name: "Nasal Vowels",
      links: [
        sound("ɛ̃", "/ɛ̃/"),
        sound("œ̃", "/œ̃/"),
        sound("ɑ̃", "/ɑ̃/"),
        sound("ɔ̃", "/ɔ̃/"),
      ],
    },
    {
      name: "Consonants",
      links: [sound("r", "/ʀ/"), sound("ɲ", "/ɲ/"), sound("ɥ", "/ɥ/")],
    },
    {
      name: "Other French Resources",
      links: [
        { label: "French Main", href: `${rootPrefix}french.html` },
        {
          label: "French Expressions",
          href: `${rootPrefix}fr/expression/archive.html`,
        },
        {
          label: "French Pronunciation",
          href: `${rootPrefix}fr/pron/RFI260202/index.html`,
        },
        { label: "Reading Practice", href: `${rootPrefix}fr/reading/index.html` },
        { label: "French Grammar", href: `${rootPrefix}fr/grammar/index.html` },
        { label: "French Jokes", href: `${rootPrefix}comedy/index.html` },
      ],
    },
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
        <div class="sidebar-title">Phonetic Practice</div>
        <div class="sidebar-subtitle">French Sounds</div>
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

  // ── Home link, then one accordion per section ──
  // Folder names are IPA, so compare the decoded, NFC-normalized folder.
  const nfc = (s) => {
    try {
      return decodeURIComponent(s).normalize("NFC");
    } catch {
      return s.normalize("NFC");
    }
  };
  const currentDir = enunIndex >= 0 ? nfc(pathParts[enunIndex + 1] || "") : "";

  const home = document.createElement("a");
  home.className = "lesson-link";
  home.style.paddingLeft = "16px";
  home.textContent = "🏠 Home";
  home.href = `${rootPrefix}index.html`;
  scroll.appendChild(home);

  SECTIONS.forEach((sec) => {
    const section = document.createElement("div");
    section.className = "level-section";

    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.innerHTML = `
      <span class="level-dot"></span>
      <span class="level-label">${sec.name}</span>
      <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>`;

    const list = document.createElement("div");
    list.className = "lessons-list";

    sec.links.forEach((link) => {
      const a = document.createElement("a");
      a.className = "lesson-link";
      a.textContent = link.label;
      a.href = link.href;
      if (link.dir && nfc(link.dir) === currentDir) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
      list.appendChild(a);
    });

    // Open the section holding the current sound.
    if (list.querySelector(".active")) {
      btn.classList.add("open");
      list.classList.add("open");
    }

    btn.addEventListener("click", () => {
      btn.classList.toggle("open");
      list.classList.toggle("open");
    });

    section.appendChild(btn);
    section.appendChild(list);
    scroll.appendChild(section);
  });
})();
