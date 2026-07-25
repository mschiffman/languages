// Shared behavior for fr/everyday/topics/*.html pages:
// audio player controls, transcript note tooltip, examples toggle,
// and markdown-to-HTML content loading.

const AUDIO_HOST = "https://languages.rmlives.com/lessons/everyday";
const AUDIO_VERSION = "2607250726";

function initTopicPage(topic) {
  // Global function to play audio, invoked from onclick="playAudio('...')"
  // attributes embedded in the rendered markdown content.
  window.playAudio = function (phrase) {
    const audioElement = document.getElementById("audioElement");
    const audioWindow = document.getElementById("audioPlayerWindow");
    const filename = phrase.trim().replace(/'/g, "_");
    audioElement.src = `${AUDIO_HOST}/${topic}/${filename}.mp3?v=${AUDIO_VERSION}`;
    audioWindow.style.display = "block";
    audioElement.play().catch((error) => {
      console.error("Error playing audio:", error);
    });
  };

  // Audio player controls (play / pause / stop / seek / drag)
  document.addEventListener("DOMContentLoaded", () => {
    const openAudioBtn = document.getElementById("openAudio");
    const closeAudioBtn = document.getElementById("closeAudio");
    const audioWindow = document.getElementById("audioPlayerWindow");
    const playBtn = document.getElementById("playBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const stopBtn = document.getElementById("stopBtn");
    const audioElement = document.getElementById("audioElement");
    const progressBar = document.getElementById("progressBar");

    openAudioBtn.addEventListener("click", () => {
      audioElement.src = `${AUDIO_HOST}/${topic}/audio.mp3?v=${AUDIO_VERSION}`;
      audioWindow.style.display = "block";
    });

    // Transcript note button (hover handled by CSS; click toggles for touch devices)
    const noteWrapper = document.querySelector(".note-wrapper");
    const noteBtn = document.getElementById("noteBtn");
    noteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      noteWrapper.classList.toggle("active");
    });
    document.addEventListener("click", () => {
      noteWrapper.classList.remove("active");
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
      progressBar.value =
        (audioElement.currentTime / audioElement.duration) * 100 || 0;
    });

    progressBar.addEventListener("input", () => {
      audioElement.currentTime =
        (progressBar.value / 100) * audioElement.duration;
    });

    // Draggable player window
    let isDragging = false;
    let currentX = 0,
      currentY = 0,
      initialX = 0,
      initialY = 0,
      xOffset = 0,
      yOffset = 0;
    const header = document.getElementById("audioPlayerHeader");

    header.addEventListener("mousedown", (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        audioWindow.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener("mouseup", () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    });
  });

  // 1. Fetch the markdown file
  fetch(`${topic}.md`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not find ${topic}.md file`);
      }
      return response.text();
    })
    .then((text) => {
      // 2. Convert markdown to HTML using Marked.js
      document.getElementById("content").innerHTML = marked.parse(text);

      // 3. Post-processing: Add cursor pointer to elements with onclick
      document.querySelectorAll("[onclick^='playAudio']").forEach((el) => {
        el.style.cursor = "pointer";
        el.classList.add("audio-trigger");
      });

      // 4. Add click handlers for examples buttons
      document.querySelectorAll(".examples-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const panel = document.getElementById(this.dataset.target);
          if (panel) {
            panel.classList.toggle("visible");
          }
        });
      });
    })
    .catch((error) => {
      document.getElementById("content").innerHTML =
        `<p style="color:red; font-weight:bold;">Error: ${error.message}. <br>
                (Note: You must view this via a local server, not by double-clicking the file.)</p>`;
    });
}
