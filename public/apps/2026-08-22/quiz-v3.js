(() => {
  "use strict";

  const questions = [
    { answer: "わんまんうんてん", mask: "◯ん◯ん◯ん◯◯", image: "/apps/2026-08-22/images/q1-one-man.png", alt: "ワンマン表示のある昔ながらの路面電車" },
    { answer: "まんいんでんしゃ", mask: "◯ん◯ん◯ん◯◯", image: "/apps/2026-08-22/images/q2-crowded.png", alt: "窓越しに大勢の乗客が見える、混雑した昔ながらの路面電車" },
    { answer: "きんろうかんしゃ", mask: "◯ん◯◯◯んしゃ", image: "/apps/2026-08-22/images/q3-holiday.png", alt: "車両前面に日の丸の小旗を掲げた昔ながらの路面電車" },
    { answer: "あんぜんうんてん", mask: "◯ん◯ん◯ん◯◯", image: "/apps/2026-08-22/images/q4-safety.png", alt: "横断歩道の手前で運転士が指差し確認をする昔ながらの路面電車" },
    { answer: "ちんちんでんしゃ", mask: "◯ん◯ん◯ん◯◯", image: "/apps/2026-08-22/images/q5-tram.png", alt: "街中を走る普通の昔ながらの路面電車" }
  ];

  const tramAnswer = "ちんちんでんしゃ";
  const quiz = document.querySelector("#quiz");
  const result = document.querySelector("#result");
  const progress = document.querySelector("#progress");
  const mask = document.querySelector("#mask");
  const image = document.querySelector("#question-image");
  const form = document.querySelector("#answer-form");
  const input = document.querySelector("#answer");
  const submitButton = document.querySelector("#submit-button");
  const feedback = document.querySelector("#feedback");
  const correctAnswer = document.querySelector("#correct-answer");
  const nextButton = document.querySelector("#next-button");
  const count = document.querySelector("#tram-count strong");
  const restartButton = document.querySelector("#restart-button");

  let current = 0;
  let tramCount = 0;
  let solved = false;

  function normalize(value) {
    return value.trim().replace(/[ァ-ヶ]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60)
    );
  }

  function renderQuestion() {
    const question = questions[current];
    solved = false;
    progress.textContent = `第${current + 1}問 / ${questions.length}`;
    mask.textContent = question.mask;
    image.src = question.image;
    image.alt = question.alt;
    input.value = "";
    input.disabled = false;
    submitButton.disabled = false;
    feedback.textContent = "";
    feedback.className = "feedback";
    correctAnswer.textContent = "";
    nextButton.hidden = true;
    quiz.classList.remove("is-entering");
    void quiz.offsetWidth;
    quiz.classList.add("is-entering");
  }

  function showResult() {
    quiz.hidden = true;
    result.hidden = false;
    count.textContent = String(tramCount);
    restartButton.focus({ preventScroll: true });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (solved) return;

    const answer = normalize(input.value);
    if (answer === tramAnswer) tramCount += 1;

    solved = true;
    if (answer !== questions[current].answer) {
      feedback.textContent = "違います";
      feedback.className = "feedback incorrect";
    } else {
      feedback.textContent = "正解！";
      feedback.className = "feedback correct";
    }

    correctAnswer.textContent = questions[current].answer;
    document.body.classList.remove("is-answering");
    input.disabled = true;
    submitButton.disabled = true;
    nextButton.hidden = false;
    nextButton.focus({ preventScroll: true });
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    form.requestSubmit();
  });

  input.addEventListener("focus", () => {
    document.body.classList.add("is-answering");
    window.setTimeout(() => quiz.scrollIntoView({ block: "start" }), 80);
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (document.activeElement !== input) {
        document.body.classList.remove("is-answering");
      }
    }, 180);
  });

  nextButton.addEventListener("click", () => {
    current += 1;
    if (current >= questions.length) showResult();
    else renderQuestion();
  });

  restartButton.addEventListener("click", () => {
    current = 0;
    tramCount = 0;
    result.hidden = true;
    quiz.hidden = false;
    renderQuestion();
  });

  document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest("button, .photo-frame")) event.preventDefault();
  });

  renderQuestion();
})();
