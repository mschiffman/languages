/* ---------------------------------------------------------------
   Collapsed stories menu for the story reader pages (fairy tales etc.).
   Inserts a hamburger toggle + accordion dropdown into the page header.
   Styled by ytstory.css (same classes as nav-aesop.js).
   Add new stories by extending GROUPS below.
--------------------------------------------------------------- */
(function () {
  const GROUPS = [
    {
      name: "Stories",
      lessons: [{ title: "Jack and the Beanstalk", href: "Jack_beanstalk.html" }],
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
  toggle.setAttribute("aria-label", "Stories menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<span class="hamburger-icon"></span>';
  menu.appendChild(toggle);

  const dropdown = document.createElement("div");
  dropdown.className = "nav-dropdown";

  GROUPS.forEach((group) => {
    // Open by default: the only group, or the one holding the current page.
    const open =
      GROUPS.length === 1 || group.lessons.some((l) => l.href === currentFile);

    const groupBtn = document.createElement("button");
    groupBtn.type = "button";
    groupBtn.className = "nav-level-btn";
    groupBtn.textContent = group.name;
    groupBtn.setAttribute("aria-expanded", open ? "true" : "false");

    const sublist = document.createElement("ul");
    sublist.className = "nav-sublist";
    if (!open) sublist.hidden = true;

    group.lessons.forEach((lesson) => {
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

    groupBtn.addEventListener("click", () => {
      const isHidden = sublist.hidden;
      dropdown
        .querySelectorAll(".nav-sublist")
        .forEach((el) => (el.hidden = true));
      dropdown
        .querySelectorAll(".nav-level-btn")
        .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      if (isHidden) {
        sublist.hidden = false;
        groupBtn.setAttribute("aria-expanded", "true");
      }
    });

    dropdown.appendChild(groupBtn);
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
