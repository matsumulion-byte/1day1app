const asset = (p) => new URL(p, import.meta.url).toString();

const questions = [
  {
    text: "朝起きた時の気分は？",
    choices: [
      { label: "すぐ起きる", scores: [2, 0, 1, 1, 0, 0, 1, 0] },
      { label: "あと5分を3回やる", scores: [0, 1, 2, 0, 1, 0, 2, 1] },
      { label: "夢の続きを見たい", scores: [0, 2, 2, 1, 0, 1, 1, 0] },
      { label: "枕の匂いを確認する", scores: [0, 1, 0, 0, 1, 0, 3, 0] },
    ],
  },
  {
    text: "移動中に一番起こりがちなのは？",
    choices: [
      { label: "電車をちょうど逃す", scores: [2, 0, 0, 2, 1, 0, 0, 0] },
      { label: "イヤホンが絡まっている", scores: [0, 3, 0, 0, 1, 0, 0, 1] },
      { label: "道を歩いているだけで時間感覚がズレる", scores: [0, 0, 0, 3, 0, 0, 0, 0] },
      { label: "なんとなく地面の様子が気になる", scores: [0, 0, 0, 0, 3, 0, 0, 0] },
    ],
  },
  {
    text: "気づくとやってしまうことは？",
    choices: [
      { label: "人の話を一回通してから考える", scores: [2, 0, 1, 0, 0, 0, 0, 0] },
      { label: "なんでもとりあえず検索する", scores: [0, 0, 3, 0, 0, 0, 0, 0] },
      { label: "左右の並びが気になる", scores: [3, 0, 0, 0, 0, 0, 0, 0] },
      { label: "靴下の片方がない気がする", scores: [0, 0, 0, 0, 0, 0, 0, 3] },
    ],
  },
  {
    text: "一番落ち着く場所は？",
    choices: [
      { label: "ちょうど真ん中ではない場所", scores: [3, 0, 0, 1, 0, 0, 0, 0] },
      { label: "画面の向こう側", scores: [0, 0, 3, 0, 0, 0, 0, 0] },
      { label: "ファミレスの通路を走る猫ちゃんの近く", scores: [0, 0, 0, 0, 0, 3, 0, 0] },
      { label: "枕の近辺", scores: [0, 0, 0, 0, 0, 0, 3, 1] },
    ],
  },
  {
    text: "あなたが密かに動かしていそうなのは？",
    choices: [
      { label: "世界の基準", scores: [0, 0, 0, 3, 0, 0, 0, 0] },
      { label: "大陸の下のやつ", scores: [0, 0, 0, 0, 3, 0, 0, 0] },
      { label: "よくわからない会話の流れ", scores: [2, 0, 2, 0, 0, 0, 0, 0] },
      { label: "身の回りの小さな違和感", scores: [0, 2, 0, 0, 0, 1, 1, 3] },
    ],
  },
];

const results = [
  {
    title: "左から二番目の人",
    desc: "端ではない。\nでも真ん中でもない。\nなぜかそこにいる。",
  },
  {
    title: "イヤホンを絡ませる人",
    desc: "しまう時は静かだが、\n取り出す時だけ仕事をする。",
  },
  {
    title: "ChatGPTの中の人",
    desc: "だいたいそれっぽく返す。\nたまに妙に自信がある。",
  },
  {
    title: "標準時子午線",
    desc: "少し動くだけで広範囲に影響が出る。\n本人にその自覚はあまりない。",
  },
  {
    title: "プレートを移動させる人",
    desc: "とてもゆっくりだが、\nやっていることはかなり大きい。",
  },
  {
    title: "ファミレスの猫ちゃんをコントロールする人",
    desc: "料理を運ばせたり、\n戻らせたりしている。",
  },
  {
    title: "枕に匂いをつける人",
    desc: "嫌ではない。\nでも誰のものかはわからない。",
  },
  {
    title: "靴下を片方隠す人",
    desc: "全部はやらない。\n片方だけで十分だと知っている。",
  },
];

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const startBtn = document.getElementById("start-btn");
const retryBtn = document.getElementById("retry-btn");

const questionCount = document.getElementById("question-count");
const questionText = document.getElementById("question-text");
const choicesEl = document.getElementById("choices");
const progressFill = document.getElementById("progress-fill");

const resultTitle = document.getElementById("result-title");
const resultDesc = document.getElementById("result-desc");
const startVisual = document.getElementById("start-visual");

let currentQuestionIndex = 0;
let scoreBoard = [];

function initScores() {
  scoreBoard = new Array(results.length).fill(0);
}

function showScreen(target) {
  [startScreen, quizScreen, resultScreen].forEach((screen) => {
    screen.classList.remove("active");
  });
  target.classList.add("active");
}

function renderQuestion() {
  const q = questions[currentQuestionIndex];
  const currentNum = currentQuestionIndex + 1;
  const total = questions.length;
  const progress = (currentNum / total) * 100;

  questionCount.textContent = `${currentNum} / ${total}`;
  questionText.textContent = q.text;
  progressFill.style.width = `${progress}%`;

  choicesEl.innerHTML = "";

  q.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.type = "button";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      applyScores(choice.scores);
      nextStep();
    });
    choicesEl.appendChild(btn);
  });
}

function applyScores(scores) {
  scores.forEach((point, index) => {
    scoreBoard[index] += point;
  });
}

function nextStep() {
  currentQuestionIndex += 1;

  if (currentQuestionIndex >= questions.length) {
    showResult();
    return;
  }

  renderQuestion();
}

function pickResult() {
  const maxScore = Math.max(...scoreBoard);
  const candidateIndexes = scoreBoard
    .map((score, index) => ({ score, index }))
    .filter((item) => item.score === maxScore)
    .map((item) => item.index);

  const selectedIndex =
    candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];

  return results[selectedIndex];
}

function showResult() {
  const result = pickResult();
  resultTitle.textContent = result.title;
  resultDesc.textContent = result.desc;
  showScreen(resultScreen);
}

function startQuiz() {
  currentQuestionIndex = 0;
  initScores();
  showScreen(quizScreen);
  renderQuestion();
}

startBtn.addEventListener("click", startQuiz);
retryBtn.addEventListener("click", startQuiz);

startVisual.src = asset("./assets/hello-work-matsumura.png");

initScores();
showScreen(startScreen);