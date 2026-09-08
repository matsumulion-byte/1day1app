"use strict";

// Questions are kept separate so the set can be replaced or extended easily.
const QUESTIONS = ["CAT", "HELLO", "BANANA", "MATSUMURA", "INTERNATIONAL"];

const RESULT_MESSAGES = [
  { maxSeconds: 15, text: "日本語に惑わされていません。" },
  { maxSeconds: 30, text: "なかなかの識字力です。" },
  { maxSeconds: 60, text: "カタカナに引っ張られています。" },
  { maxSeconds: Infinity, text: "日本語として読もうとしすぎです。" },
];

const CORRECT_DELAY_MS = 950;
const FONT_TEST_STRING = QUESTIONS.join("");

const elements = {
  startScreen: document.querySelector("#startScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  resultScreen: document.querySelector("#resultScreen"),
  startButton: document.querySelector("#startButton"),
  startButtonLabel: document.querySelector("#startButtonLabel"),
  fontError: document.querySelector("#fontError"),
  questionNumber: document.querySelector("#questionNumber"),
  questionWord: document.querySelector("#questionWord"),
  feedback: document.querySelector("#feedback"),
  answerForm: document.querySelector("#answerForm"),
  answerInput: document.querySelector("#answerInput"),
  answerButton: document.querySelector("#answerButton"),
  timerOutput: document.querySelector("#timerOutput"),
  finalTime: document.querySelector("#finalTime"),
  resultComment: document.querySelector("#resultComment"),
  retryButton: document.querySelector("#retryButton"),
};

let currentQuestion = 0;
let startedAt = 0;
let elapsedSeconds = 0;
let timerFrame = 0;
let isComposing = false;
let isTransitioning = false;

function setScreen(activeScreen) {
  [elements.startScreen, elements.gameScreen, elements.resultScreen].forEach((screen) => {
    const isActive = screen === activeScreen;
    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
  });
}

function normalizeAnswer(value) {
  return value.normalize("NFKC").trim().toUpperCase();
}

function formatTime(seconds) {
  return seconds.toFixed(1);
}

function updateTimer(now) {
  elapsedSeconds = (now - startedAt) / 1000;
  elements.timerOutput.value = formatTime(elapsedSeconds);
  timerFrame = requestAnimationFrame(updateTimer);
}

function showQuestion() {
  const answer = QUESTIONS[currentQuestion];
  elements.questionNumber.textContent = String(currentQuestion + 1);
  elements.questionWord.textContent = answer;
  elements.questionWord.classList.remove("is-revealed");
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.answerInput.value = "";
  elements.answerInput.disabled = false;
  elements.answerButton.disabled = false;
  isTransitioning = false;
  elements.answerInput.focus({ preventScroll: true });
}

function startGame() {
  cancelAnimationFrame(timerFrame);
  currentQuestion = 0;
  elapsedSeconds = 0;
  elements.timerOutput.value = "0.0";
  setScreen(elements.gameScreen);
  showQuestion();

  // Start at the first frame in which question one is visibly painted.
  requestAnimationFrame((now) => {
    startedAt = now;
    timerFrame = requestAnimationFrame(updateTimer);
  });
}

function finishGame(now) {
  cancelAnimationFrame(timerFrame);
  elapsedSeconds = (now - startedAt) / 1000;

  window.setTimeout(() => {
    elements.finalTime.textContent = formatTime(elapsedSeconds);
    const message = RESULT_MESSAGES.find((result) => elapsedSeconds <= result.maxSeconds);
    elements.resultComment.textContent = message.text;
    setScreen(elements.resultScreen);
  }, CORRECT_DELAY_MS);
}

function markCorrect() {
  isTransitioning = true;
  elements.answerInput.disabled = true;
  elements.answerButton.disabled = true;
  elements.questionWord.classList.add("is-revealed");
  elements.feedback.textContent = "正解！";

  if (currentQuestion === QUESTIONS.length - 1) {
    finishGame(performance.now());
    return;
  }

  window.setTimeout(() => {
    currentQuestion += 1;
    showQuestion();
  }, CORRECT_DELAY_MS);
}

function handleAnswer(event) {
  event.preventDefault();
  if (isComposing || isTransitioning) return;

  const submitted = normalizeAnswer(elements.answerInput.value);
  const correct = normalizeAnswer(QUESTIONS[currentQuestion]);

  if (submitted === correct) {
    markCorrect();
    return;
  }

  elements.feedback.textContent = "ちがいます";
  elements.feedback.className = "feedback is-wrong";
  elements.answerInput.select();
}

async function prepareFont() {
  try {
    if (!document.fonts?.load) throw new Error("Font Loading API is unavailable");
    await document.fonts.load('48px "Electroharmonix"', FONT_TEST_STRING);
    if (!document.fonts.check('48px "Electroharmonix"', FONT_TEST_STRING)) {
      throw new Error("Electroharmonix did not load");
    }
    elements.startButton.disabled = false;
    elements.startButtonLabel.textContent = "START";
  } catch (error) {
    console.error(error);
    elements.startButton.hidden = true;
    elements.fontError.hidden = false;
  }
}

elements.startButton.addEventListener("click", startGame);
elements.retryButton.addEventListener("click", startGame);
elements.answerForm.addEventListener("submit", handleAnswer);
elements.answerInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
elements.answerInput.addEventListener("compositionend", () => {
  isComposing = false;
});
elements.answerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing || isComposing) return;
  event.preventDefault();
  elements.answerForm.requestSubmit();
});
elements.answerInput.addEventListener("input", () => {
  if (elements.feedback.classList.contains("is-wrong")) {
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";
  }
});

document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

prepareFont();
