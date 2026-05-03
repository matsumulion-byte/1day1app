const asset = (p) => new URL(p, import.meta.url).toString();

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const timeText = document.getElementById("timeText");
const scoreText = document.getElementById("scoreText");
const comboText = document.getElementById("comboText");
const comboBanner = document.getElementById("comboBanner");

const trashCard = document.getElementById("trashCard");
const trashIcon = document.getElementById("trashIcon");
const trashName = document.getElementById("trashName");
const judgeText = document.getElementById("judgeText");

const finalScore = document.getElementById("finalScore");
const resultTitle = document.getElementById("resultTitle");
const resultComment = document.getElementById("resultComment");

const answerButtons = [...document.querySelectorAll(".answer-btn")];

const GAME_TIME = 30;

const trashItems = [
  // 燃やすごみ
  { name: "生ごみ", icon: "🥬", category: "burn" },
  { name: "紙くず", icon: "📄", category: "burn" },
  { name: "革の財布", icon: "👛", category: "burn" },
  { name: "ぬいぐるみ", icon: "🧸", category: "burn" },
  { name: "靴", icon: "👟", category: "burn" },
  { name: "CD", icon: "💿", category: "burn" },
  { name: "ビデオテープ", icon: "📼", category: "burn" },
  { name: "保冷剤", icon: "🧊", category: "burn" },
  { name: "ゴム手袋", icon: "🧤", category: "burn" },
  { name: "使い捨てカイロ", icon: "🔥", category: "burn" },

  // 燃やさないごみ
  { name: "割れた皿", icon: "🍽️", category: "nonburn" },
  { name: "マグカップ", icon: "☕", category: "nonburn" },
  { name: "電球", icon: "💡", category: "nonburn" },
  { name: "フライパン", icon: "🍳", category: "nonburn" },
  { name: "ハサミ", icon: "✂️", category: "nonburn" },
  { name: "乾電池", icon: "🔋", category: "nonburn" },
  { name: "傘", icon: "☂️", category: "nonburn" },
  { name: "ドライヤー", icon: "🌬️", category: "nonburn" },
  { name: "小型家電", icon: "📻", category: "nonburn" },
  { name: "アルミホイル", icon: "🥡", category: "nonburn" },

  // 資源
  { name: "新聞", icon: "📰", category: "resource" },
  { name: "雑誌", icon: "📚", category: "resource" },
  { name: "段ボール", icon: "📦", category: "resource" },
  { name: "空き缶", icon: "🥫", category: "resource" },
  { name: "空きびん", icon: "🍾", category: "resource" },
  { name: "ペットボトル", icon: "🧴", category: "resource" },
  { name: "牛乳パック", icon: "🥛", category: "resource" },
  { name: "古着", icon: "👕", category: "resource" },
  { name: "紙箱", icon: "🎁", category: "resource" },
  { name: "食品トレー", icon: "🍱", category: "resource" },

  // 粗大ごみ
  { name: "椅子", icon: "🪑", category: "oversized" },
  { name: "テーブル", icon: "🛋️", category: "oversized" },
  { name: "布団", icon: "🛏️", category: "oversized" },
  { name: "自転車", icon: "🚲", category: "oversized" },
  { name: "スーツケース", icon: "🧳", category: "oversized" },
  { name: "カラーボックス", icon: "🗄️", category: "oversized" },
  { name: "電子レンジ", icon: "📺", category: "oversized" },
  { name: "物干し竿", icon: "🎋", category: "oversized" },
  { name: "姿見", icon: "🪞", category: "oversized" },
  { name: "扇風機", icon: "🌀", category: "oversized" },
];

const categoryLabels = {
  burn: "燃やすごみ",
  nonburn: "燃やさないごみ",
  resource: "資源",
  oversized: "粗大ごみ",
};

let timeLeft = GAME_TIME;
let score = 0;
let combo = 0;
let timerId = null;
let currentItem = null;
let usedQueue = [];
let isAnswering = false;

function showScreen(screen) {
  [startScreen, gameScreen, resultScreen].forEach((el) => {
    el.classList.remove("active");
  });
  screen.classList.add("active");
}

function startGame() {
  timeLeft = GAME_TIME;
  score = 0;
  combo = 0;
  usedQueue = [];
  isAnswering = false;

  updateStatus();
  showScreen(gameScreen);
  nextTrash();

  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft -= 1;
    updateStatus();

    if (timeLeft <= 0) {
      finishGame();
    }
  }, 1000);
}

function updateStatus() {
  timeText.textContent = timeLeft;
  scoreText.textContent = score;
  comboText.textContent = combo;

  if (combo >= 5) {
    comboBanner.classList.add("show");
  } else {
    comboBanner.classList.remove("show");
  }
}

function nextTrash() {
  isAnswering = false;
  judgeText.textContent = "";
  judgeText.className = "judge-text";

  trashCard.classList.remove("correct", "wrong", "pop");
  void trashCard.offsetWidth;
  trashCard.classList.add("pop");

  currentItem = pickTrashItem();
  trashIcon.textContent = currentItem.icon;
  trashName.textContent = currentItem.name;
}

function pickTrashItem() {
  if (usedQueue.length >= trashItems.length) {
    usedQueue = [];
  }

  const candidates = trashItems.filter((item) => !usedQueue.includes(item.name));
  const index = Math.floor(Math.random() * candidates.length);
  const item = candidates[index];

  usedQueue.push(item.name);
  return item;
}

function handleAnswer(selectedCategory) {
  if (isAnswering || timeLeft <= 0) return;
  isAnswering = true;

  const isCorrect = selectedCategory === currentItem.category;

  if (isCorrect) {
    score += 1;
    combo += 1;
    judgeText.textContent = "正解！";
    judgeText.classList.add("correct");
    trashCard.classList.add("correct");
  } else {
    score = Math.max(0, score - 1);
    combo = 0;
    judgeText.textContent = `違う！ 正解は「${categoryLabels[currentItem.category]}」`;
    judgeText.classList.add("wrong");
    trashCard.classList.add("wrong");
  }

  updateStatus();

  setTimeout(() => {
    if (timeLeft > 0) {
      nextTrash();
    }
  }, isCorrect ? 430 : 720);
}

function finishGame() {
  clearInterval(timerId);
  timerId = null;

  finalScore.textContent = score;

  const result = getResult(score);
  resultTitle.textContent = result.title;
  resultComment.innerHTML = result.comment;

  showScreen(resultScreen);
}

function getResult(value) {
  if (value >= 20) {
    return {
      title: "清掃局の申し子",
      comment: "この街の分別は、<br>あなたに任せていい。",
    };
  }

  if (value >= 15) {
    return {
      title: "分別優等生",
      comment: "かなり正確。<br>ごみ袋の前で迷わない人です。",
    };
  }

  if (value >= 10) {
    return {
      title: "だいたい東京で暮らせる人",
      comment: "日常生活には問題なし。<br>たまに自治体サイトを見れば大丈夫。",
    };
  }

  if (value >= 5) {
    return {
      title: "燃やせばいいと思ってる人",
      comment: "勢いはある。<br>ただし清掃局には緊張が走っています。",
    };
  }

  return {
    title: "回収日に町内をざわつかせる人",
    comment: "まずは落ち着いて、<br>ごみ出しカレンダーを見よう。",
  };
}

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAnswer(button.dataset.category);
  });
});

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);