// One-tap audio playback for every .play-btn with a data-audio attribute.
// Files live in the audio/ folder next to these pages. If a clip hasn't been
// uploaded yet, the button switches to a dashed "pending" state instead of failing silently.
(function () {
  let current = null;
  let currentBtn = null;

  document.querySelectorAll(".play-btn[data-audio]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("missing")) return;

      // Stop anything already playing
      if (current) {
        current.pause();
        current.currentTime = 0;
        if (currentBtn) {
          currentBtn.classList.remove("playing");
          currentBtn.textContent = "\u25B6";
        }
        if (currentBtn === btn) { current = null; currentBtn = null; return; }
      }

      const src = /^https?:\/\//.test(btn.dataset.audio)
        ? btn.dataset.audio
        : "audio/" + btn.dataset.audio;
      const audio = new Audio(src);
      current = audio;
      currentBtn = btn;
      btn.classList.add("playing");
      btn.textContent = "\u25A0";

      audio.addEventListener("ended", reset);
      audio.addEventListener("error", function () {
        reset();
        btn.classList.add("missing");
        btn.title = "Audio not uploaded yet: " + btn.dataset.audio;
      });
      audio.play().catch(function () { /* handled by error listener */ });

      function reset() {
        btn.classList.remove("playing");
        btn.textContent = "\u25B6";
        current = null;
        currentBtn = null;
      }
    });
  });
})();
