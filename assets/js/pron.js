// Play audio function
function playAudio(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.play();
  }
}

if (typeof window !== "undefined") {
  window.playAudio = playAudio;
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
  openAudioBtn.addEventListener("click", function () {
    audioWindow.style.display = "block";
  });

  closeAudioBtn.addEventListener("click", function () {
    audioWindow.style.display = "none";
    audioElement.pause();
  });

  // Audio controls
  playBtn.addEventListener("click", function () {
    audioElement.play();
  });

  pauseBtn.addEventListener("click", function () {
    audioElement.pause();
  });

  stopBtn.addEventListener("click", function () {
    audioElement.pause();
    audioElement.currentTime = 0;
    progressBar.value = 0;
  });

  // Update progress bar
  audioElement.addEventListener("timeupdate", function () {
    const progress = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.value = progress;
  });

  // Seek functionality
  progressBar.addEventListener("input", function () {
    const time = (progressBar.value / 100) * audioElement.duration;
    audioElement.currentTime = time;
  });

  // Draggable audio player
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  const header = document.getElementById("audioPlayerHeader");

  header.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

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

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
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
