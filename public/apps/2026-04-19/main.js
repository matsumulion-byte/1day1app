const asset = (p) => new URL(p, import.meta.url).toString();

const TOTAL_QUESTIONS = 5;

const COUNTRIES = [
  { code: "ad", name: "アンドラ" },
  { code: "bb", name: "バルバドス" },
  { code: "eg", name: "エジプト" },
  { code: "bz", name: "ベリーズ" },
  { code: "fr", name: "フランス" },
  { code: "it", name: "イタリア" },
  { code: "me", name: "モンテネグロ" },
  { code: "tm", name: "トルクメニスタン" },
  { code: "ma", name: "モロッコ" },
  { code: "vg", name: "イギリス領ヴァージン諸島" },
];

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const startBtn = document.getElementById("start-btn");
const retryBtn = document.getElementById("retry-btn");
const nextBtn = document.getElementById("next-btn");

const progressEl = document.getElementById("progress");
const scoreEl = document.getElementById("score");
const countryImageEl = document.getElementById("country-image");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");

const resultTitleEl = document.getElementById("result-title");
const resultTextEl = document.getElementById("result-text");

let questions = [];
let currentIndex = 0;
let score = 0;
let answered = false;

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(screen) {
  [startScreen, quizScreen, resultScreen].forEach((el) => {
    el.classList.remove("active");
  });
  screen.classList.add("active");
}

function createChoices(correctCountry) {
  const wrongs = shuffle(
    COUNTRIES.filter((country) => country.code !== correctCountry.code)
  ).slice(0, 3);

  return shuffle([correctCountry, ...wrongs]);
}

function buildQuestionSet() {
  return shuffle(COUNTRIES).slice(0, TOTAL_QUESTIONS);
}

function updateHeader() {
  progressEl.textContent = `${currentIndex + 1} / ${TOTAL_QUESTIONS}`;
  scoreEl.textContent = `正解 ${score}`;
}

function renderQuestion() {
  const question = questions[currentIndex];
  const choices = createChoices(question);

  answered = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  nextBtn.classList.add("hidden");

  updateHeader();

  countryImageEl.src = asset(`./assets/countries/${question.code}.png`);
  countryImageEl.alt = `${question.name}のシルエット`;

  choicesEl.innerHTML = "";

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.textContent = choice.name;
    button.addEventListener("click", () => onSelectChoice(button, choice, question, choices));
    choicesEl.appendChild(button);
  });
}

function onSelectChoice(clickedButton, selectedCountry, correctCountry, allChoices) {
  if (answered) return;
  answered = true;

  const buttons = [...choicesEl.querySelectorAll(".choice-btn")];
  const isCorrect = selectedCountry.code === correctCountry.code;

  if (isCorrect) {
    score += 1;
    scoreEl.textContent = `正解 ${score}`;
    feedbackEl.textContent = "正解";
    feedbackEl.className = "feedback ok";
    clickedButton.classList.add("correct");
  } else {
    feedbackEl.textContent = `不正解。正解は「${correctCountry.name}」`;
    feedbackEl.className = "feedback ng";
    clickedButton.classList.add("wrong");

    buttons.forEach((btn, index) => {
      const choice = allChoices[index];
      if (choice.code === correctCountry.code) {
        btn.classList.add("correct");
      }
    });
  }

  buttons.forEach((btn) => {
    btn.disabled = true;
  });

  nextBtn.classList.remove("hidden");
}

function getResultComment(correctCount) {
  if (correctCount === 5) return "完璧。地図帳を食べて育ったレベル。";
  if (correctCount === 4) return "かなり強い。普通に地図センスあり。";
  if (correctCount === 3) return "なかなか良い感じ。";
  if (correctCount === 2) return "半分弱。知らん国が混ざると厳しい。";
  if (correctCount === 1) return "もう少し。形だけで当てるのは意外とむずかしい。";
  return "0点。たぶん雰囲気で押した。";
}

function showResult() {
  resultTitleEl.textContent = `${score} / ${TOTAL_QUESTIONS}`;
  resultTextEl.textContent = getResultComment(score);
  showScreen(resultScreen);
}

function nextQuestion() {
  currentIndex += 1;

  if (currentIndex >= TOTAL_QUESTIONS) {
    showResult();
    return;
  }

  renderQuestion();
}

function startGame() {
  questions = buildQuestionSet();
  currentIndex = 0;
  score = 0;
  answered = false;

  showScreen(quizScreen);
  renderQuestion();
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", nextQuestion);

showScreen(startScreen);