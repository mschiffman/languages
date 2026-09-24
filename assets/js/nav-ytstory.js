/* ---------------------------------------------------------------
   Collapsed lessons menu for the YouTube-story reader pages.
   Inserts a hamburger toggle + accordion dropdown (Level 1, Level 2, …)
   into the page header. Add new lessons by extending LEVELS below.
--------------------------------------------------------------- */
(function () {
  const LEVELS = [
    {
      name: "Level 1",
      lessons: [{ title: "Alphabet A–Z", href: "1.1_ABC.html" }],
    },
    {
      name: "Level 2",
      lessons: [
        { title: "A Busy Morning", href: "2.1_busyMorning.html" },
        { title: "Where Are My Shoes?", href: "2.2_whereShoes.html" },
        { title: "I’m Hungry", href: "2.3_breakfast.html" },
        { title: "Let's get ready", href: "2.4_getReady.html" },
        { title: "We're Late!", href: "2.5_late.html" },
        { title: "After School", href: "2.6_afterSchool.html" },
        { title: "Clean Up, Please", href: "2.7_clean.html" },
        { title: "What Do You Want to Do?", href: "2.8_do.html" },
      ],
    },
  ];

  const header = document.querySelector(".stage > header");
  const stage = document.querySelector(".stage");
  if (!header || !stage) return;

  stage.classList.add("has-lesson-nav");

  const currentFile = location.pathname.split("/").pop();

  const menu = document.createElement("div");
  menu.className = "nav-menu";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-label", "Lessons menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<span class="hamburger-icon"></span>';
  menu.appendChild(toggle);

  const dropdown = document.createElement("div");
  dropdown.className = "nav-dropdown";

  LEVELS.forEach((level) => {
    const levelHasCurrent = level.lessons.some((l) => l.href === currentFile);

    const levelBtn = document.createElement("button");
    levelBtn.type = "button";
    levelBtn.className = "nav-level-btn";
    levelBtn.textContent = level.name;
    levelBtn.setAttribute("aria-expanded", levelHasCurrent ? "true" : "false");

    const sublist = document.createElement("ul");
    sublist.className = "nav-sublist";
    if (!levelHasCurrent) sublist.hidden = true;

    if (level.lessons.length) {
      level.lessons.forEach((lesson) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "nav-item";
        a.href = lesson.href;
        a.textContent = lesson.title;
        if (lesson.href === currentFile) {
          a.classList.add("current");
          a.setAttribute("aria-current", "page");
        }
        li.appendChild(a);
        sublist.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.className = "nav-empty";
      span.textContent = "Coming soon";
      li.appendChild(span);
      sublist.appendChild(li);
    }

    levelBtn.addEventListener("click", () => {
      const isHidden = sublist.hidden;
      dropdown
        .querySelectorAll(".nav-sublist")
        .forEach((el) => (el.hidden = true));
      dropdown
        .querySelectorAll(".nav-level-btn")
        .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      if (isHidden) {
        sublist.hidden = false;
        levelBtn.setAttribute("aria-expanded", "true");
      }
    });

    dropdown.appendChild(levelBtn);
    dropdown.appendChild(sublist);
  });

  menu.appendChild(dropdown);
  header.insertBefore(menu, header.firstChild);

  function closeMenu() {
    menu.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !menu.classList.contains("active");
    menu.classList.toggle("active", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
})();
