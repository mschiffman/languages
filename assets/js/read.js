function playAudio(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.play();
  }
}

function toggleTranslations() {
  document
    .querySelectorAll(".english-text")
    .forEach((element) => element.classList.toggle("d-none"));
}

function toggleGlossary() {
  document
    .querySelectorAll(".glossary-section")
    .forEach((element) => element.classList.toggle("d-none"));
}

if (typeof window !== "undefined") {
  window.playAudio = playAudio;
  window.toggleTranslations = toggleTranslations;
  window.toggleGlossary = toggleGlossary;
}

document.addEventListener("DOMContentLoaded", () => {
  const openAudioBtn = document.getElementById("openAudio");
  const closeAudioBtn = document.getElementById("closeAudio");
  const audioWindow = document.getElementById("audioPlayerWindow");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const audioElement = document.getElementById("audioElement");
  const progressBar = document.getElementById("progressBar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const leftSidebar = document.getElementById("leftSidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  const setSidebarState = (isOpen) => {
    if (!hamburgerBtn || !leftSidebar) {
      return;
    }
    leftSidebar.classList.toggle("active", isOpen);
    hamburgerBtn.classList.toggle("active", isOpen);
    document.body.classList.toggle("sidebar-open", isOpen);
    if (sidebarOverlay) {
      sidebarOverlay.classList.toggle("active", isOpen);
    }
  };

  const closeSidebar = () => setSidebarState(false);

  if (hamburgerBtn && leftSidebar) {
    const toggleSidebar = () => {
      const shouldOpen = !leftSidebar.classList.contains("active");
      setSidebarState(shouldOpen);
    };

    hamburgerBtn.addEventListener("click", toggleSidebar);
    closeSidebar();

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    });
  }

  if (
    openAudioBtn &&
    closeAudioBtn &&
    audioWindow &&
    playBtn &&
    pauseBtn &&
    stopBtn &&
    audioElement &&
    progressBar
  ) {
    openAudioBtn.addEventListener("click", () => {
      audioWindow.style.display = "block";
    });

    closeAudioBtn.addEventListener("click", () => {
      audioWindow.style.display = "none";
      audioElement.pause();
    });

    playBtn.addEventListener("click", () => {
      audioElement.play();
    });

    pauseBtn.addEventListener("click", () => {
      audioElement.pause();
    });

    stopBtn.addEventListener("click", () => {
      audioElement.pause();
      audioElement.currentTime = 0;
      progressBar.value = 0;
    });

    audioElement.addEventListener("timeupdate", () => {
      const progress = (audioElement.currentTime / audioElement.duration) * 100;
      progressBar.value = progress;
    });

    progressBar.addEventListener("input", () => {
      const time = (progressBar.value / 100) * audioElement.duration;
      audioElement.currentTime = time;
    });

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    const header = document.getElementById("audioPlayerHeader");

    const setTranslate = (xPos, yPos, el) => {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    };

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (header && (e.target === header || header.contains(e.target))) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, audioWindow);
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    if (header) {
      header.addEventListener("mousedown", dragStart);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", dragEnd);
    }
  }

  const chunks = document.querySelectorAll(".chunk");
  let activeChunk = null;

  chunks.forEach((span, index) => {
    span.addEventListener("click", () => {
      if (index === chunks.length - 1) {
        chunks.forEach((chunk) => {
          chunk.classList.remove("active");
        });
        activeChunk = null;
      } else {
        if (activeChunk && activeChunk !== span) {
          activeChunk.classList.remove("active");
        }
        span.classList.add("active");
        activeChunk = span;
      }
    });
  });

  document.querySelectorAll(".sidebar-dropdown-toggle").forEach((button) => {
    const dropdown = button.closest(".sidebar-dropdown");
    const isOpen = dropdown.classList.contains("open");
    button.setAttribute("aria-expanded", isOpen);
    button.addEventListener("click", () => {
      const nowOpen = dropdown.classList.toggle("open");
      button.setAttribute("aria-expanded", nowOpen);
    });
  });

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });

          document
            .querySelectorAll(".sidebar-link")
            .forEach((sidebarLink) => sidebarLink.classList.remove("active"));
          this.classList.add("active");
        }
      }

      closeSidebar();
    });
  });

  const scrollTopBtn = document.getElementById("scrollTopBtn");

  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollTopBtn.classList.add("show");
      } else {
        scrollTopBtn.classList.remove("show");
      }
    });

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (window.AOS) {
    AOS.init({
      duration: 600,
      once: true,
      offset: 120,
    });
  }

  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  tooltipTriggerList.forEach(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );
});

document.addEventListener("DOMContentLoaded", () => {
  const wordElements = document.querySelectorAll(".word-info");
  if (!wordElements.length) {
    return;
  }

  const popover = document.createElement("div");
  popover.className = "word-popover";
  document.body.appendChild(popover);

  let activeWord = null;

  const resetPopover = () => {
    popover.classList.remove("is-visible");
    popover.removeAttribute("data-placement");
    popover.innerHTML = "";
    if (activeWord) {
      activeWord.classList.remove("is-active");
      activeWord = null;
    }
  };

  const buildContent = (target) => {
    const meaningText = target.dataset.meaning || "";
    const originText = (target.dataset.origin || "").trim();
    const ipaText = target.getAttribute("title") || "";

    popover.innerHTML = "";

    if (meaningText) {
      const meaningEl = document.createElement("div");
      meaningEl.className = "word-popover__meaning";
      meaningEl.textContent = meaningText;
      popover.appendChild(meaningEl);
    }

    if (ipaText) {
      const ipaEl = document.createElement("div");
      ipaEl.className = "word-popover__ipa";
      ipaEl.textContent = ipaText;
      popover.appendChild(ipaEl);
    }

    if (originText) {
      const divider = document.createElement("hr");
      divider.className = "word-popover__divider";
      popover.appendChild(divider);

      const titleEl = document.createElement("div");
      titleEl.className = "word-popover__section-title";
      titleEl.textContent = "Origin";
      popover.appendChild(titleEl);

      const originEl = document.createElement("div");
      originEl.className = "word-popover__origin";
      originEl.textContent = originText;
      popover.appendChild(originEl);
    }

    if (!meaningText && !ipaText && !originText) {
      const fallbackEl = document.createElement("div");
      fallbackEl.className = "word-popover__meaning";
      fallbackEl.textContent = "No details available.";
      popover.appendChild(fallbackEl);
    }
  };

  const updatePopoverPosition = (target) => {
    if (!target || !popover.classList.contains("is-visible")) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const gap = 12;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    let left = rect.right + gap + scrollLeft;
    let placement = "right";

    if (left + popRect.width > scrollLeft + window.innerWidth) {
      left = rect.left - gap - popRect.width + scrollLeft;
      placement = "left";
    }

    let top = rect.top + rect.height / 2 - popRect.height / 2 + scrollTop;
    const minTop = scrollTop + 8;
    const maxTop = scrollTop + window.innerHeight - popRect.height - 8;

    if (top < minTop) {
      top = minTop;
    } else if (top > maxTop) {
      top = maxTop;
    }

    popover.dataset.placement = placement;
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const showPopover = (target) => {
    activeWord = target;
    activeWord.classList.add("is-active");
    buildContent(target);
    popover.classList.add("is-visible");
    updatePopoverPosition(target);
  };

  wordElements.forEach((word) => {
    word.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (word === activeWord) {
        resetPopover();
        return;
      }

      resetPopover();
      showPopover(word);
    });
  });

  document.addEventListener("click", (event) => {
    if (!activeWord) {
      return;
    }

    if (
      event.target === activeWord ||
      event.target.closest(".word-info") === activeWord ||
      popover.contains(event.target)
    ) {
      return;
    }

    resetPopover();
  });

  window.addEventListener("scroll", () => {
    if (activeWord) {
      updatePopoverPosition(activeWord);
    }
  });

  window.addEventListener("resize", () => {
    if (activeWord) {
      updatePopoverPosition(activeWord);
    }
  });
});
