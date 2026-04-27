const asset = (p) => new URL(p, import.meta.url).toString();

const socratesImg = document.getElementById("socratesImg");
const startPanel = document.getElementById("startPanel");
const questionPanel = document.getElementById("questionPanel");
const worryInput = document.getElementById("worryInput");
const startBtn = document.getElementById("startBtn");
const stepText = document.getElementById("stepText");
const barFill = document.getElementById("barFill");
const questionText = document.getElementById("questionText");
const answerButtons = document.getElementById("answerButtons");
const resultModal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const retryBtn = document.getElementById("retryBtn");

socratesImg.src = asset("./assets/socrates.png");

let bgm = null;
try {
  bgm = new Audio(asset("./assets/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = 0.35;
} catch (e) {
  bgm = null;
}

const questions = [
  {
    text: "それは本当に問題ですか？",
    answers: [
      { label: "問題です", score: 0 },
      { label: "問題な気がします", score: 1 },
      { label: "もうわかりません", score: 2 },
    ],
  },
  {
    text: "あなたがそう思っているだけでは？",
    answers: [
      { label: "そうかもしれません", score: 2 },
      { label: "いや、実際そうです", score: 0 },
      { label: "言い方が嫌です", score: 1 },
    ],
  },
  {
    text: "そもそも、なぜ答えが必要なのですか？",
    answers: [
      { label: "必要だからです", score: 0 },
      { label: "急に怖いです", score: 1 },
      { label: "答えとは何ですか", score: 2 },
    ],
  },
  {
    text: "では、あなたは何から逃げているのですか？",
    answers: [
      { label: "逃げてません", score: 0 },
      { label: "ちょっと逃げてます", score: 1 },
      { label: "質問が重いです", score: 2 },
    ],
  },
  {
    text: "最後に聞きます。本当に聞いてよかったですか？",
    answers: [
      { label: "後悔しています", score: 0 },
      { label: "今じゃない気がします", score: 1 },
      { label: "なんだかんだでスッキリしました", score: 2 },
    ],
  },
];

const results = [
  "なんで質問したんだろって後悔した人",
  "今じゃない気がしてきた人",
  "松村がちょっと嫌いになった人",
  "途中で概念になった人",
  "なんだかんだでスッキリした人",
];

let current = 0;
let totalScore = 0;

function startGame() {
  const input = worryInput.value.trim();

  if (!input) {
    worryInput.value = "";
    worryInput.placeholder = "まず相談したいことを書いてください（例：友達ができない / お金がない）";
    worryInput.focus();
    return;
  }

  current = 0;
  totalScore = 0;

  startPanel.classList.add("hidden");
  questionPanel.classList.remove("hidden");

  if (bgm) {
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
  }

  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];

  stepText.textContent = `問 ${current + 1} / ${questions.length}`;
  barFill.style.width = `${((current + 1) / questions.length) * 100}%`;
  questionText.textContent = q.text;

  answerButtons.innerHTML = "";

  q.answers.forEach((answer) => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = answer.label;

    btn.addEventListener("click", () => {
      totalScore += answer.score;
      current += 1;

      if (current >= questions.length) {
        showResult();
      } else {
        renderQuestion();
      }
    });

    answerButtons.appendChild(btn);
  });
}

function showResult() {
  questionPanel.classList.add("hidden");

  const index = Math.min(
    results.length - 1,
    Math.floor((totalScore / 10) * results.length)
  );

  resultText.textContent = results[index];
  resultModal.classList.remove("hidden");

  if (bgm) {
    bgm.pause();
  }
}

function retry() {
  resultModal.classList.add("hidden");
  startPanel.classList.remove("hidden");
  questionPanel.classList.add("hidden");
  worryInput.focus();
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", retry);