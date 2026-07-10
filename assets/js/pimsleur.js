      // ── Audio playback ──
      document.querySelectorAll(".sound-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          new Audio(btn.dataset.audio).play();
        });
      });

      // ── Sidebar ──
      const hamburger = document.getElementById("hamburger");
      const sidebar = document.getElementById("sidebar");
      const overlay = document.getElementById("sidebar-overlay");

      function openSidebar() {
        sidebar.classList.add("open");
        overlay.classList.add("visible");
        hamburger.classList.add("open");
      }
      function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("visible");
        hamburger.classList.remove("open");
      }

      hamburger.addEventListener("click", () =>
        sidebar.classList.contains("open") ? closeSidebar() : openSidebar(),
      );
      overlay.addEventListener("click", closeSidebar);

      // ── Build level/lesson tree ──
      const scroll = document.getElementById("sidebar-scroll");
      const levels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

      levels.forEach((level, levelIndex) => {
        const levelNum = levelIndex + 1;
        const section = document.createElement("div");
        section.className = "level-section";

        const btn = document.createElement("button");
        btn.className = "level-btn";
        btn.innerHTML = `
          <span class="level-dot"></span>
          <span class="level-label">${level}</span>
          <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>`;

        const list = document.createElement("div");
        list.className = "lessons-list";

        for (let i = 1; i <= 30; i++) {
          const a = document.createElement("a");
          a.className = "lesson-link";
          a.textContent = `Lesson ${String(i).padStart(2, "0")}`;
          a.href = `${levelNum}.${i}.html`;
          list.appendChild(a);
        }

        btn.addEventListener("click", () => {
          btn.classList.toggle("open");
          list.classList.toggle("open");
        });

        section.appendChild(btn);
        section.appendChild(list);
        scroll.appendChild(section);
      });