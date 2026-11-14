/* ---------------------------------------------------------------
   Collapsed stories menu for the science / human body reader pages.
   Inserts a hamburger toggle + accordion dropdown into the page header.
   Styled by ytstory.css (same classes as nav-aesop.js).
   Add new lessons by extending GROUPS below.
--------------------------------------------------------------- */
(function () {
  const GROUPS = [
    {
      name: "Science",
      lessons: [
        { title: "Why Is the Sky Blue?", href: "s1.1_sky.html" },
        { title: "Sky: Story Quiz", href: "s1.1_sky_storyquiz.html" },
        { title: "Why Is the Grass Green?", href: "s1.2_grass.html" },
        { title: "Grass: Story Quiz", href: "s1.2_grass_storyquiz.html" },
        { title: "How Do Seeds Grow?", href: "s1.3_seeds.html" },
        { title: "Seeds: Story Quiz", href: "s1.3_seeds_storyquiz.html" },
        { title: "How Do Plants Make Food?", href: "s1.4_plantFood.html" },
        { title: "Plant Food: Story Quiz", href: "s1.4_plantFood_storyquiz.html" },
        { title: "Why Do We Have Day and Night?", href: "s1.5_dayNight.html" },
        { title: "Day and Night: Story Quiz", href: "s1.5_dayNight_storyquiz.html" },
        { title: "How Do Bees Make Honey?", href: "s1.6_beesHoney.html" },
        { title: "Bees: Story Quiz", href: "s1.6_beesHoney_storyquiz.html" },
        { title: "A Visit to the Ant City", href: "s1.7_leafcutterAnt.html" },
        { title: "Ant City: Story Quiz", href: "s1.7_leafcutterAnt_storyquiz.html" },
        { title: "The Birds That Built an Apartment Building!", href: "s1.8_weaver.html" },
        { title: "Weaver Birds: Story Quiz", href: "s1.8_weaver_storyquiz.html" },
        { title: "The Beavers: Nature's Engineers", href: "s1.9_beavers.html" },
        { title: "Beavers: Story Quiz", href: "s1.9_beavers_storyquiz.html" },
        { title: "The Playful Otters of the River", href: "s2.0_otters.html" },
        { title: "Otters: Story Quiz", href: "s2.0_otters_storyquiz.html" },
        { title: "A Visit to Prairie Dog Town", href: "s2.1_prairieDog.html" },
        { title: "Prairie Dogs: Story Quiz", href: "s2.1_prairieDog_storyquiz.html" },
        { title: "How Does a Rainbow Appear in the Sky?", href: "s2.2_rainbow.html" },
        { title: "Rainbow: Quiz", href: "s2.2_rainbow_quiz.html" },
        { title: "Rainbow: Story Quiz", href: "s2.2_rainbow_storyquiz.html" },
        { title: "The Plant That Eats Insects!", href: "s2.3_pitcher.html" },
        { title: "Pitcher Plant: Story Quiz", href: "s2.3_pitcher_storyquiz.html" },
        { title: "The Secret World Beneath Our Feet", href: "s2.4_underground.html" },
        { title: "Underground: Story Quiz", href: "s2.4_underground_storyquiz.html" },
        { title: "The Golden Treasure from an Ancient Tree!", href: "s2.5_amber.html" },
        { title: "Amber: Story Quiz", href: "s2.5_amber_storyquiz.html" },
        { title: "The Apple That Asked a Question", href: "s2.6_newton.html" },
        { title: "Newton: Story Quiz", href: "s2.6_newton_storyquiz.html" },
      ],
    },
    {
      name: "Science (French)",
      lessons: [
        { title: "Le monde secret sous nos pieds", href: "s2.4_sousTerre.html" },
        { title: "Le monde secret sous nos pieds : quiz", href: "s2.4_sousTerre_storyquiz.html" },
      ],
    },
    {
      name: "Human Body",
      lessons: [
        { title: "Your Amazing Heart", href: "hb1.1_heart.html" },
        { title: "Your Amazing Heart: Story Quiz", href: "hb1.1_heart_storyquiz.html" },
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
