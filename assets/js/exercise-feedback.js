(function () {
  const state = {
    ignoreAccents: true,
    ignorePunctuation: true,
    dictationStatus: [],
  };

  function addStyles() {
    if (document.getElementById("exercise-feedback-styles")) return;

    const style = document.createElement("style");
    style.id = "exercise-feedback-styles";
    style.textContent = `
      .live-score {
        background: #f8f9fa;
        border: 1px solid #dfe6e9;
        border-radius: 10px;
        margin: 18px 0 22px;
        padding: 12px 14px;
      }
      .live-score-main {
        color: #2c3e50;
        display: flex;
        flex-wrap: wrap;
        font-size: 0.95rem;
        font-weight: 700;
        gap: 10px;
        justify-content: space-between;
      }
      .live-score-breakdown {
        color: #607d8b;
        display: flex;
        flex-wrap: wrap;
        font-size: 0.85rem;
        gap: 12px;
        margin-top: 8px;
      }
      .live-score-bar {
        background: #e9ecef;
        border-radius: 999px;
        height: 8px;
        margin-top: 10px;
        overflow: hidden;
      }
      .live-score-fill {
        background: #27ae60;
        display: block;
        height: 100%;
        transition: width 0.2s ease;
        width: 0;
      }
      .exercise-options {
        color: #455a64;
        display: flex;
        flex-wrap: wrap;
        font-size: 0.9rem;
        gap: 14px;
        margin: 14px 0 6px;
      }
      .exercise-options label {
        align-items: center;
        cursor: pointer;
        display: inline-flex;
        gap: 6px;
      }
      .user-input.ok,
      #user-input.ok {
        background: #eafaf1;
        border-color: #27ae60;
      }
      .user-input.no,
      #user-input.no {
        background: #fdedec;
        border-color: #e74c3c;
      }
      .score-display .score-detail {
        color: #607d8b;
        display: block;
        font-size: 0.95rem;
        font-weight: 600;
        margin-top: 6px;
      }
      .prompt-row {
        align-items: flex-start;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .prompt-row .english-prompt {
        margin-bottom: 0;
      }
      .note-wrapper {
        flex-shrink: 0;
        position: relative;
      }
      .note-btn {
        align-items: center;
        background: linear-gradient(135deg, #e8f4ff, #cce8ff);
        border: none;
        border-radius: 8px;
        color: #3498db;
        cursor: pointer;
        display: flex;
        height: 28px;
        justify-content: center;
        transition: background 0.2s;
        width: 28px;
      }
      .note-btn:hover {
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
      }
      .note-wrapper::after {
        background: white;
        border-radius: 8px;
        bottom: calc(100% + 8px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
        color: #444;
        content: attr(data-note);
        font-family: "Segoe UI", sans-serif;
        font-size: 0.78rem;
        line-height: 1.5;
        opacity: 0;
        padding: 10px 12px;
        pointer-events: none;
        position: absolute;
        right: 0;
        text-align: left;
        transition: opacity 0.2s ease;
        white-space: normal;
        width: 260px;
        z-index: 20;
      }
      .note-wrapper:hover::after {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --- Normalization helpers ------------------------------------------------
  // Everything below is applied symmetrically to BOTH the learner's typed value
  // and every stored answer (see isTextCorrect). Because both sides pass through
  // the identical transform, these steps can only ever make matching MORE
  // forgiving — they cannot invent a wrong "correct".

  // Curly apostrophe (U+2019) -> straight ('). Always applied, so elisions like
  // "j'ai" match whichever apostrophe a source file or a learner's keyboard
  // produces. When "Ignore punctuation" is on, apostrophes are stripped anyway;
  // this matters for the case where a user turns that option OFF.
  function foldApostrophes(text) {
    return text.replace(/\u2019/g, "'");
  }

  // Number words -> digits, so "vingt" matches "20", "cinq ans" matches "5 ans".
  // "un"/"une" are deliberately NOT mapped: they double as articles, and folding
  // them to "1" would hide masculine/feminine agreement (une -> 1 == un -> 1).
  // Compound numbers ("vingt-cinq", "trente et un") are not handled; add the
  // whole compound as its own key here if a specific exercise needs it.
  const NUMBER_WORDS = {
    deux: "2",
    trois: "3",
    quatre: "4",
    cinq: "5",
    six: "6",
    sept: "7",
    huit: "8",
    neuf: "9",
    dix: "10",
    onze: "11",
    douze: "12",
    treize: "13",
    quatorze: "14",
    quinze: "15",
    seize: "16",
    vingt: "20",
    trente: "30",
    quarante: "40",
    cinquante: "50",
    soixante: "60",
    cent: "100",
    mille: "1000",
  };

  // Boundary is a captured non-letter (or start) plus a non-letter lookahead,
  // using \p{L} so accented letters count as letters. This stops "cent" from
  // matching inside "récent", "sept" inside "septembre", "vingt" in "vingtaine",
  // etc. No lookbehind is used, for broad browser support.
  const NUMBER_WORD_RE = new RegExp(
    "([^\\p{L}]|^)(" + Object.keys(NUMBER_WORDS).join("|") + ")(?=[^\\p{L}]|$)",
    "gu",
  );

  function wordsToDigits(text) {
    return text.replace(
      NUMBER_WORD_RE,
      (match, boundary, word) => boundary + NUMBER_WORDS[word],
    );
  }

  // Fold thousands separators so "100 000", "100000" and "100,000" all match.
  // Only a separator followed by a group of EXACTLY three digits is removed, so
  // French decimals like "3,5" are left intact. Loops to catch "1 000 000".
  function foldNumberSeparators(text) {
    let previous;
    do {
      previous = text;
      text = text.replace(/(\d)[ ,](\d{3})(?=\D|$)/g, "$1$2");
    } while (text !== previous);
    return text;
  }

  function normalize(value) {
    let text = value.trim().toLowerCase().replace(/\s+/g, " ");

    // Always-on, independent of the accent/punctuation toggles.
    text = foldApostrophes(text);
    text = wordsToDigits(text);
    text = foldNumberSeparators(text);

    if (state.ignoreAccents) {
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    if (state.ignorePunctuation) {
      text = text
        .replace(/[?!.,;:«»"'’“”()[\]{}¡¿]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    return text;
  }

  function isTextCorrect(value, answers) {
    const normalizedValue = normalize(value);
    return answers.some((answer) => normalize(answer) === normalizedValue);
  }

  function createScoreBox(total) {
    const score = document.createElement("div");
    score.className = "live-score";
    score.innerHTML = `
      <div class="live-score-main">
        <span>Score: <span data-score-correct>0</span> / <span data-score-total>${total}</span></span>
        <span><span data-score-percent>0</span>%</span>
      </div>
      <div class="live-score-breakdown">
        <span>Correct: <span data-score-breakdown-correct>0</span></span>
        <span>Wrong: <span data-score-breakdown-wrong>0</span></span>
        <span>Unanswered: <span data-score-breakdown-unanswered>${total}</span></span>
      </div>
      <div class="live-score-bar"><i class="live-score-fill" data-score-fill></i></div>
    `;
    return score;
  }

  function updateScore(container, counts) {
    const total = counts.correct + counts.wrong + counts.unanswered;
    const percent = total ? Math.round((counts.correct / total) * 100) : 0;

    container.querySelector("[data-score-correct]").textContent =
      counts.correct;
    container.querySelector("[data-score-total]").textContent = total;
    container.querySelector("[data-score-percent]").textContent = percent;
    container.querySelector("[data-score-breakdown-correct]").textContent =
      counts.correct;
    container.querySelector("[data-score-breakdown-wrong]").textContent =
      counts.wrong;
    container.querySelector("[data-score-breakdown-unanswered]").textContent =
      counts.unanswered;
    container.querySelector("[data-score-fill]").style.width = `${percent}%`;
  }

  function createOptionsBox(onChange) {
    const options = document.createElement("div");
    options.className = "exercise-options";
    options.innerHTML = `
      <label><input type="checkbox" data-option="accents" checked /> Accept answers without accents</label>
      <label><input type="checkbox" data-option="punctuation" checked /> Ignore punctuation</label>
    `;

    options.addEventListener("change", (event) => {
      const option = event.target.dataset.option;
      if (option === "accents") state.ignoreAccents = event.target.checked;
      if (option === "punctuation")
        state.ignorePunctuation = event.target.checked;
      onChange();
    });

    return options;
  }

  function initTranslationQuiz() {
    const hasQuestions = typeof questions !== "undefined";
    const hasAnswerKey = typeof answerKey !== "undefined";

    if (
      (!hasQuestions && !hasAnswerKey) ||
      !document.getElementById("quiz-area")
    ) {
      return false;
    }

    addStyles();

    const quizArea = document.getElementById("quiz-area");
    const card = document.querySelector(".translation-card");
    const subtitle = card.querySelector(".subtitle");
    const total = hasQuestions
      ? questions.length
      : quizArea.querySelectorAll(".user-input").length;
    const score = createScoreBox(total);
    const options = createOptionsBox(recheckAll);

    subtitle.insertAdjacentElement("afterend", score);
    quizArea.insertAdjacentElement("afterend", options);

    function renderQuiz() {
      quizArea.innerHTML = questions
        .map(
          (question, index) => `
            <div class="question-block" id="block-${index + 1}">
              <div class="prompt-row">
                <span class="english-prompt">${index + 1}. ${question.english}</span>
                ${
                  question.note
                    ? `<div class="note-wrapper" data-note="${escapeHtml(question.note)}">
                        <button type="button" class="note-btn" title="Notes">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                          </svg>
                        </button>
                      </div>`
                    : ""
                }
              </div>
              <div class="input-wrap">
                <input type="text" class="user-input" id="q${index + 1}" placeholder="Type here..." autocomplete="off" autocapitalize="off" spellcheck="false" />
                <i class="bi bi-check-circle-fill check-icon"></i>
              </div>
              <div class="feedback-msg" id="msg-${index + 1}"></div>
            </div>
          `,
        )
        .join("");

      quizArea.addEventListener("input", (event) => {
        if (event.target.matches(".user-input")) checkOne(event.target, false);
      });
      refreshScore();
    }

    function getAnswers(index) {
      if (hasQuestions) return questions[index].answers;
      return answerKey[`q${index + 1}`] || [];
    }

    function checkOne(input, showCorrection) {
      const index = Number(input.id.replace("q", "")) - 1;
      const blockEl = document.getElementById(`block-${index + 1}`);
      const msgEl = document.getElementById(`msg-${index + 1}`);
      const value = input.value.trim();
      const answers = getAnswers(index);

      input.classList.remove("ok", "no");
      blockEl.classList.remove("correct-block", "wrong-block");
      msgEl.style.display = "none";
      msgEl.innerText = "";

      if (!value) {
        refreshScore();
        return;
      }

      const correct = isTextCorrect(value, answers);
      input.classList.add(correct ? "ok" : "no");
      blockEl.classList.add(correct ? "correct-block" : "wrong-block");
      msgEl.style.display = "block";
      msgEl.style.color = correct ? "#27ae60" : "#c0392b";
      msgEl.innerText = correct
        ? "Correct!"
        : showCorrection
          ? `Correction: "${answers[0]}"`
          : "Not yet";
      refreshScore();
    }

    function refreshScore() {
      const counts = { correct: 0, wrong: 0, unanswered: 0 };
      quizArea.querySelectorAll(".user-input").forEach((input) => {
        if (!input.value.trim()) counts.unanswered++;
        else if (input.classList.contains("ok")) counts.correct++;
        else counts.wrong++;
      });
      updateScore(score, counts);
    }

    function recheckAll(showCorrection = false) {
      quizArea
        .querySelectorAll(".user-input")
        .forEach((input) => checkOne(input, showCorrection));
    }

    window.checkTranslations = function () {
      recheckAll(true);
    };

    window.resetTranslations = function () {
      quizArea.querySelectorAll(".user-input").forEach((input) => {
        input.value = "";
        input.classList.remove("ok", "no");
      });
      quizArea.querySelectorAll(".question-block").forEach((block) => {
        block.classList.remove("correct-block", "wrong-block");
      });
      quizArea.querySelectorAll(".feedback-msg").forEach((message) => {
        message.style.display = "none";
        message.innerText = "";
      });
      refreshScore();
    };

    if (hasQuestions) {
      renderQuiz();
    } else {
      quizArea.addEventListener("input", (event) => {
        if (event.target.matches(".user-input")) checkOne(event.target, false);
      });
      refreshScore();
    }

    return true;
  }

  function initListenMaster() {
    const form = document.getElementById("quiz-form");
    const scoreBox = document.getElementById("score-box");

    if (
      !form ||
      !scoreBox ||
      !document.querySelector(".question-item input[type='radio']")
    ) {
      return false;
    }

    addStyles();

    function markQuestion(item, revealCorrect) {
      item.querySelectorAll("input").forEach((input) => {
        input.classList.remove("correct-answer", "wrong-answer");
      });

      const selected = item.querySelector("input:checked");
      if (!selected) {
        if (revealCorrect) {
          item
            .querySelector('input[value="correct"]')
            .classList.add("correct-answer");
        }
        return "unanswered";
      }

      if (selected.value === "correct") {
        selected.classList.add("correct-answer");
        return "correct";
      }

      selected.classList.add("wrong-answer");
      if (revealCorrect) {
        item
          .querySelector('input[value="correct"]')
          .classList.add("correct-answer");
      }
      return "wrong";
    }

    function refreshScore(revealCorrect = false) {
      const counts = { correct: 0, wrong: 0, unanswered: 0 };
      form.querySelectorAll(".question-item").forEach((item) => {
        counts[markQuestion(item, revealCorrect)]++;
      });

      const total = counts.correct + counts.wrong + counts.unanswered;
      scoreBox.innerHTML = `Score: ${counts.correct} / ${total}<span class="score-detail">Correct: ${counts.correct} | Wrong: ${counts.wrong} | Unanswered: ${counts.unanswered}</span>`;
      scoreBox.style.color =
        counts.correct === total
          ? "#27ae60"
          : counts.correct > total / 2
            ? "#f39c12"
            : "#c0392b";
    }

    form.addEventListener("change", (event) => {
      if (event.target.matches("input[type='radio']")) {
        refreshScore(false);
      }
    });

    window.checkAnswers = function () {
      refreshScore(true);
    };

    window.resetTest = function () {
      form.reset();
      form.querySelectorAll("input").forEach((input) => {
        input.classList.remove("correct-answer", "wrong-answer");
      });
      scoreBox.innerText = "";
      window.scrollTo(0, 0);
    };

    return true;
  }

  function initDictation() {
    const input = document.getElementById("user-input");
    const feedback = document.getElementById("feedback");
    const card = document.querySelector(".dictation-card");

    if (!input || !feedback || typeof sentences === "undefined") return false;

    addStyles();
    state.dictationStatus = new Array(sentences.length).fill("unanswered");

    const score = createScoreBox(sentences.length);
    const options = createOptionsBox(() => checkCurrent(false));
    document
      .querySelector(".level-bar")
      .insertAdjacentElement("afterend", score);
    feedback.insertAdjacentElement("afterend", options);

    function refreshScore() {
      const counts = { correct: 0, wrong: 0, unanswered: 0 };
      state.dictationStatus.forEach((status) => {
        counts[status]++;
      });
      updateScore(score, counts);
    }

    function setCurrentStatus(status) {
      state.dictationStatus[currentIndex] = status;
      input.classList.toggle("ok", status === "correct");
      input.classList.toggle("no", status === "wrong");
      refreshScore();
    }

    function checkCurrent(showDetails) {
      const value = input.value.trim();
      if (!value) {
        setCurrentStatus("unanswered");
        return false;
      }

      const correct = normalize(value) === normalize(sentences[currentIndex]);
      setCurrentStatus(correct ? "correct" : "wrong");

      if (showDetails) {
        feedback.innerHTML = correct
          ? '<span class="diff-correct">Correct!</span>'
          : compareStrings(sentences[currentIndex], value);
      }

      return correct;
    }

    const originalChangeLevel = window.changeLevel;
    window.changeLevel = function (direction) {
      originalChangeLevel(direction);
      input.classList.remove("ok", "no");
      checkCurrent(false);
    };

    document
      .querySelectorAll(".audio-controls .btn-audio")
      .forEach((button) => {
        const clickHandler = button.getAttribute("onclick") || "";
        const match = clickHandler.match(/playAudio\('([^']+)'\)/);

        if (!match) return;

        button.removeAttribute("onclick");
        button.addEventListener("click", () => {
          playAudio(match[1]);
        });
      });

    window.checkDictation = function () {
      if (!input.value.trim()) {
        feedback.innerHTML =
          '<span style="color:#e74c3c">Please type something first!</span>';
        setCurrentStatus("unanswered");
        return;
      }
      checkCurrent(true);
    };

    window.revealAnswer = function () {
      input.value = sentences[currentIndex];
      checkCurrent(true);
    };

    window.resetDictation = function () {
      input.value = "";
      input.classList.remove("ok", "no");
      feedback.innerHTML =
        '<span style="color:#aaa; font-style:italic;">Feedback will appear here...</span>';
      const hintBox = document.getElementById("hint-box");
      hintBox.classList.remove("visible");
      hintBox.innerText = "";
      setCurrentStatus("unanswered");
    };

    input.addEventListener("input", () => checkCurrent(false));
    refreshScore();
    return true;
  }

  initTranslationQuiz() || initListenMaster() || initDictation();
})();
