/* ---------------------------------------------------------------
   Collapsed lessons menu for the YouTube-story reader pages.
   Inserts a hamburger toggle + accordion dropdown (Level 1, Level 2, …)
   into the page header. Add new lessons by extending LEVELS below.
--------------------------------------------------------------- */
(function () {
  const LEVELS = [
    {
      name: "Level 1",
      lessons: [
        { title: "Alphabet A–Z", href: "1.1_ABC.html" },
        { title: "Alphabet A–Z: Story Quiz", href: "1.1_ABC_storyquiz.html" },
        { title: "Words", href: "1.2_words.html" },
        { title: "Words: Story Quiz", href: "1.2_words_storyquiz.html" },
        { title: "A or An", href: "1.3_aORan.html" },
        { title: "A or An: Story Quiz", href: "1.3_aORan_storyquiz.html" },
        { title: "What is it?", href: "1.4_what.html" },
        { title: "What is it? Story Quiz", href: "1.4_what_storyquiz.html" },
        { title: "This and That", href: "1.5_thisThat.html" },
        { title: "This and That: Story Quiz", href: "1.5_thisThat_storyquiz.html" },
        { title: "Singular and Plural", href: "1.6_singularPlural.html" },
        { title: "Singular and Plural: Story Quiz", href: "1.6_singularPlural_storyquiz.html" },
        { title: "What are they?", href: "1.7_they.html" },
        { title: "What are they? Story Quiz", href: "1.7_they_storyquiz.html" },
        { title: "These and Those", href: "1.8_theseThose.html" },
        { title: "These and Those: Story Quiz", href: "1.8_theseThose_storyquiz.html" },
        { title: "Do you have...?", href: "1.9_doYouHave.html" },
        { title: "Do you have...? Story Quiz", href: "1.9_doYouHave_storyquiz.html" },
        { title: "I have. I don't have.", href: "1.10_iHave.html" },
        { title: "I have. I don't have: Story Quiz", href: "1.10_iHave_storyquiz.html" },
        { title: "He has. She has.", href: "1.11_heSheHas.html" },
        { title: "He has. She has: Story Quiz", href: "1.11_heSheHas_storyquiz.html" },
        { title: "He doesn't have. She doesn't have.", href: "1.12_doesnt.html" },
        { title: "He doesn't have. She doesn't have: Story Quiz", href: "1.12_doesnt_storyquiz.html" },
      ],
    },
    {
      name: "Level 2",
      lessons: [
        { title: "A Busy Morning", href: "2.1_busyMorning.html" },
        { title: "A Busy Morning: Quiz", href: "2.1_busyMorning_quiz.html" },
        { title: "A Busy Morning: Story Quiz", href: "2.1_busyMorning_storyquiz.html" },
        { title: "Where Are My Shoes?", href: "2.2_whereShoes.html" },
        { title: "Where Are My Shoes? Story Quiz", href: "2.2_whereShoes_storyquiz.html" },
        { title: "I’m Hungry", href: "2.3_breakfast.html" },
        { title: "I’m Hungry: Story Quiz", href: "2.3_breakfast_storyquiz.html" },
        { title: "Let's get ready", href: "2.4_getReady.html" },
        { title: "Let's get ready: Story Quiz", href: "2.4_getReady_storyquiz.html" },
        { title: "We're Late!", href: "2.5_late.html" },
        { title: "We're Late! Story Quiz", href: "2.5_late_storyquiz.html" },
        { title: "After School", href: "2.6_afterSchool.html" },
        { title: "After School: Story Quiz", href: "2.6_afterSchool_storyquiz.html" },
        { title: "Clean Up, Please", href: "2.7_clean.html" },
        { title: "Clean Up, Please: Story Quiz", href: "2.7_clean_storyquiz.html" },
        { title: "What Do You Want to Do?", href: "2.8_do.html" },
        { title: "What Do You Want to Do? Story Quiz", href: "2.8_do_storyquiz.html" },
        { title: "I'm tired", href: "2.9_tired.html" },
        { title: "I'm tired: Story Quiz", href: "2.9_tired_storyquiz.html" },
        { title: "What a day!", href: "2.10_day.html" },
        { title: "What a day! Story Quiz", href: "2.10_day_storyquiz.html" },
        { title: "We're Going to the Zoo!", href: "2.11_zoo.html" },
        { title: "We're Going to the Zoo! Story Quiz", href: "2.11_zoo_storyquiz.html" },
      ],
    },
    {
      name: "Vocabulary",
      lessons: [
        { title: "At School", href: "voc_atSchool.html" },
        { title: "At School: Quiz", href: "voc_atSchool_quiz.html" },
        { title: "At School: Mixed Quiz", href: "voc_atSchool_quiz_mix.html" },
        { title: "At School: Story Quiz", href: "voc_atSchool_storyquiz.html" },
        { title: "Animals", href: "voc_animals_1.html" },
        { title: "Animals: Quiz", href: "voc_animals_1_quiz.html" },
        { title: "Animals: Story Quiz", href: "voc_animals_1_storyquiz.html" },
        { title: "More Animals", href: "voc_animals_2.html" },
        { title: "More Animals: Quiz", href: "voc_animals_2_quiz.html" },
        { title: "More Animals: Story Quiz", href: "voc_animals_2_storyquiz.html" },
        { title: "My Family", href: "voc_family.html" },
        { title: "My Family: Story Quiz", href: "voc_family_storyquiz.html" },
        { title: "What Time Is It?", href: "time.html" },
        { title: "What Time Is It? Quiz", href: "time_quiz.html" },
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
