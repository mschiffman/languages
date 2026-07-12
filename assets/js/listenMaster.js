// Shared logic for listen-master listening comprehension pages.
// Expects a page-specific `audioFiles` object ({ male, female, female_slow })
// to be defined in an inline <script> before this file is loaded.

function setVoice(gender) {
  document.getElementById("audio-source").src = audioFiles[gender];
  document.getElementById("main-player").load();

  // Update Buttons
  const btnMale = document.getElementById("btn-male");
  const btnFemale = document.getElementById("btn-female");
  const btnFemaleSlow = document.getElementById("btn-female-slow");

  // Reset classes
  btnMale.classList.remove("active-male");
  btnFemale.classList.remove("active-female");
  btnFemaleSlow.classList.remove("active-female");

  if (gender === "male") {
    btnMale.classList.add("active-male");
  } else if (gender === "female") {
    btnFemale.classList.add("active-female");
  } else if (gender === "female_slow") {
    btnFemaleSlow.classList.add("active-female");
  }
}

function toggleTranscript() {
  const box = document.getElementById("trans-box");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function checkAnswers() {
  const questions = document.querySelectorAll(".question-item");
  let score = 0;
  let total = questions.length;

  questions.forEach((item) => {
    // Remove old styles
    const inputs = item.querySelectorAll("input");
    inputs.forEach((i) =>
      i.classList.remove("correct-answer", "wrong-answer"),
    );

    const selected = item.querySelector("input:checked");

    if (selected) {
      if (selected.value === "correct") {
        score++;
        selected.classList.add("correct-answer"); // Green
      } else {
        selected.classList.add("wrong-answer"); // Red
        // Highlight correct one
        item
          .querySelector('input[value="correct"]')
          .classList.add("correct-answer");
      }
    } else {
      // Not answered? Show correct anyway
      item
        .querySelector('input[value="correct"]')
        .classList.add("correct-answer");
    }
  });

  const scoreBox = document.getElementById("score-box");
  scoreBox.innerText = `Score: ${score} / ${total}`;
  scoreBox.style.color =
    score === total ? "#27ae60" : score > 5 ? "#f39c12" : "#c0392b";
}

function resetTest() {
  document.getElementById("quiz-form").reset();
  document
    .querySelectorAll("input")
    .forEach((i) => i.classList.remove("correct-answer", "wrong-answer"));
  document.getElementById("score-box").innerText = "";
  window.scrollTo(0, 0);
}
