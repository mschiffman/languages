// Audio Configuration
const config = window.AUDIO_CONFIG || {
  basePath: "/media",
  fullAudio: "full.m4a",
};

// Clip player - single reusable audio element
const clipPlayer = document.getElementById("clipPlayer");

// Play clip by number (pads to 3 digits: 1 -> 001.m4a)
function playClip(clipNumber) {
  if (!clipPlayer) return;
  const id = String(clipNumber).padStart(2, "0");
  clipPlayer.src = `${config.basePath}/${id}.mp3`;
  clipPlayer.play();
}

// Event delegation for all clickable audio elements
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-clip]");
  if (!target) return;
  const clipNumber = target.dataset.clip;
  if (clipNumber) {
    playClip(clipNumber);
  }
});

// Expose for external use if needed
if (typeof window !== "undefined") {
  window.playClip = playClip;
}

// Audio Player Window Controls
document.addEventListener("DOMContentLoaded", function () {
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

  // Set full audio source from config
  if (audioElement) {
    audioElement.src = `${config.basePath}/${config.fullAudio}`;
  }

  const closeSidebarForMobile = () => {
    if (!hamburgerBtn || !leftSidebar) {
      return;
    }
    leftSidebar.classList.remove("active");
    hamburgerBtn.classList.remove("active");
  };

  if (hamburgerBtn && leftSidebar) {
    hamburgerBtn.addEventListener("click", () => {
      const isOpen = leftSidebar.classList.toggle("active");
      hamburgerBtn.classList.toggle("active", isOpen);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        closeSidebarForMobile();
      }
    });

    closeSidebarForMobile();
  }

  // Open/Close audio player
  if (openAudioBtn && audioWindow) {
    openAudioBtn.addEventListener("click", function () {
      audioWindow.style.display = "block";
    });
  }

  if (closeAudioBtn && audioWindow && audioElement) {
    closeAudioBtn.addEventListener("click", function () {
      audioWindow.style.display = "none";
      audioElement.pause();
    });
  }

  // Audio controls
  if (playBtn && audioElement) {
    playBtn.addEventListener("click", function () {
      audioElement.play();
    });
  }

  if (pauseBtn && audioElement) {
    pauseBtn.addEventListener("click", function () {
      audioElement.pause();
    });
  }

  if (stopBtn && audioElement && progressBar) {
    stopBtn.addEventListener("click", function () {
      audioElement.pause();
      audioElement.currentTime = 0;
      progressBar.value = 0;
    });
  }

  // Update progress bar
  if (audioElement && progressBar) {
    audioElement.addEventListener("timeupdate", function () {
      const progress = (audioElement.currentTime / audioElement.duration) * 100;
      progressBar.value = progress || 0;
    });

    // Seek functionality
    progressBar.addEventListener("input", function () {
      const time = (progressBar.value / 100) * audioElement.duration;
      audioElement.currentTime = time;
    });
  }

  // Draggable audio player
  if (audioWindow) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = document.getElementById("audioPlayerHeader");

    if (header) {
      header.addEventListener("mousedown", dragStart);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", dragEnd);
    }

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
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

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  }

  // Chunk highlighting
  const chunks = document.querySelectorAll(".chunk");
  let activeChunk = null;

  chunks.forEach(function (span, index) {
    span.addEventListener("click", function () {
      if (index === chunks.length - 1) {
        chunks.forEach(function (c) {
          c.classList.remove("active");
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

  // Sidebar dropdown toggles
  document.querySelectorAll(".sidebar-dropdown-toggle").forEach((button) => {
    const dropdown = button.closest(".sidebar-dropdown");
    const isOpen = dropdown.classList.contains("open");
    button.setAttribute("aria-expanded", isOpen);
    button.addEventListener("click", () => {
      const nowOpen = dropdown.classList.toggle("open");
      button.setAttribute("aria-expanded", nowOpen);
    });
  });

  // Smooth scrolling for navigation links
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });

          // Update active link
          document
            .querySelectorAll(".sidebar-link")
            .forEach((l) => l.classList.remove("active"));
          this.classList.add("active");
        }
      }

      if (window.innerWidth <= 768) {
        closeSidebarForMobile();
      }
    });
  });
});
