const asset = (p) => new URL(p, import.meta.url).toString();

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultModal = document.getElementById("resultModal");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const soundBtn = document.getElementById("soundBtn");

const field = document.getElementById("field");
const scoreText = document.getElementById("scoreText");
const comboText = document.getElementById("comboText");
const timeText = document.getElementById("timeText");
const comboLabel = document.getElementById("comboLabel");

const finalScore = document.getElementById("finalScore");
const rankTitle = document.getElementById("rankTitle");
const resultText = document.getElementById("resultText");
const maxComboText = document.getElementById("maxComboText");
const goodCountText = document.getElementById("goodCountText");
const missCountText = document.getElementById("missCountText");

const GAME_TIME = 30;
const MAX_ITEMS = 12;

let score = 0;
let combo = 0;
let maxCombo = 0;
let goodCount = 0;
let missCount = 0;
let timeLeft = GAME_TIME;
let isPlaying = false;
let spawnTimer = null;
let countdownTimer = null;
let difficultyTimer = null;
let spawnInterval = 720;
let bgm = null;
let soundEnabled = true;

const itemTypes = {
  good: {
    className: "good",
    icon: "🌱",
    point: 10,
    label: "+10",
    weight: 62,
  },
  gold: {
    className: "gold",
    icon: "🍃",
    point: 30,
    label: "+30",
    weight: 8,
  },
  bad: {
    className: "bad",
    icon: "🍂",
    point: -10,
    label: "-10",
    weight: 20,
  },
  bug: {
    className: "bug",
    icon: "🐛",
    point: -20,
    label: "-20",
    weight: 10,
  },
};

const comboMessages = [
  { count: 0, text: "新芽を摘め" },
  { count: 3, text: "手つきが良い" },
  { count: 6, text: "茶畑に馴染んできた" },
  { count: 10, text: "一芯二葉が見えている" },
  { count: 15, text: "完全に職人" },
  { count: 22, text: "茶葉の声を聞く者" },
];

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
soundBtn.addEventListener("click", toggleSound);

function startGame() {
  resetGame();

  startScreen.classList.add("hidden");
  resultModal.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  isPlaying = true;
  updateHud();
  setupBgm();
  playBgm();

  for (let i = 0; i < 6; i++) {
    setTimeout(spawnItem, i * 120);
  }

  startSpawnLoop();

  countdownTimer = setInterval(() => {
    timeLeft -= 1;
    updateHud();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  difficultyTimer = setInterval(() => {
    spawnInterval = Math.max(330, spawnInterval - 55);
    startSpawnLoop();
  }, 4000);
}

function resetGame() {
  score = 0;
  combo = 0;
  maxCombo = 0;
  goodCount = 0;
  missCount = 0;
  timeLeft = GAME_TIME;
  spawnInterval = 720;
  isPlaying = false;

  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  clearInterval(difficultyTimer);

  field.querySelectorAll(".tea-item, .float-text").forEach((el) => el.remove());

  comboLabel.textContent = "新芽を摘め";
  comboLabel.classList.remove("pop");
}

function startSpawnLoop() {
  clearInterval(spawnTimer);

  spawnTimer = setInterval(() => {
    if (!isPlaying) return;

    const currentItems = field.querySelectorAll(".tea-item").length;

    if (currentItems < MAX_ITEMS) {
      spawnItem();
    }
  }, spawnInterval);
}

function spawnItem() {
  if (!isPlaying) return;

  const typeKey = pickItemType();
  const type = itemTypes[typeKey];

  const item = document.createElement("button");
  item.type = "button";
  item.className = `tea-item ${type.className}`;
  item.dataset.type = typeKey;
  item.setAttribute("aria-label", typeKey);

  const visual = document.createElement("span");
  visual.className = "tea-visual";
  visual.textContent = type.icon;
  item.appendChild(visual);

  const pos = getRandomPosition();
  item.style.left = `${pos.x}%`;
  item.style.top = `${pos.y}%`;
  item.style.animationDuration = `${random(0.8, 1.35)}s`;

  item.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pickItem(item, e.clientX, e.clientY);
  }, { passive: false });

  field.appendChild(item);

  const lifetime = typeKey === "gold" ? 1050 : random(1400, 2200);

  setTimeout(() => {
    if (item.isConnected) {
      item.remove();
    }
  }, lifetime);
}

function pickItemType() {
  const entries = Object.entries(itemTypes);
  const total = entries.reduce((sum, [, item]) => sum + item.weight, 0);
  let rand = Math.random() * total;

  for (const [key, item] of entries) {
    rand -= item.weight;
    if (rand <= 0) return key;
  }

  return "good";
}

function getRandomPosition() {
  return {
    x: random(10, 90),
    y: random(12, 91),
  };
}

function pickItem(item, clientX, clientY) {
  if (!isPlaying || !item.isConnected) return;

  const typeKey = item.dataset.type;
  const type = itemTypes[typeKey];

  item.remove();

  if (typeKey === "good" || typeKey === "gold") {
    const comboBonus = combo >= 10 ? 8 : combo >= 5 ? 4 : 0;
    const addPoint = type.point + comboBonus;

    score += addPoint;
    combo += 1;
    goodCount += 1;
    maxCombo = Math.max(maxCombo, combo);

    showFloatText(clientX, clientY, `+${addPoint}`);
    setComboLabel();
    tinyVibration(18);
  } else {
    score = Math.max(0, score + type.point);
    combo = 0;
    missCount += 1;

    showFloatText(clientX, clientY, type.label, true);
    comboLabel.textContent = typeKey === "bug" ? "虫は摘むな" : "それは古い葉";
    popComboLabel();
    tinyVibration([40, 30, 40]);
  }

  updateHud();
}

function setComboLabel() {
  const message = comboMessages
    .slice()
    .reverse()
    .find((item) => combo >= item.count);

  comboLabel.textContent = message ? message.text : "新芽を摘め";
  popComboLabel();
}

function popComboLabel() {
  comboLabel.classList.remove("pop");
  void comboLabel.offsetWidth;
  comboLabel.classList.add("pop");
}

function showFloatText(clientX, clientY, text, isMinus = false) {
  const rect = field.getBoundingClientRect();

  const el = document.createElement("div");
  el.className = `float-text ${isMinus ? "minus" : ""}`;
  el.textContent = text;
  el.style.left = `${clientX - rect.left}px`;
  el.style.top = `${clientY - rect.top}px`;

  field.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 750);
}

function updateHud() {
  scoreText.textContent = score;
  comboText.textContent = combo;
  timeText.textContent = timeLeft;
}

function endGame() {
  isPlaying = false;

  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  clearInterval(difficultyTimer);

  field.querySelectorAll(".tea-item").forEach((el) => el.remove());

  pauseBgm();
  showResult();
}

function showResult() {
  const rank = getRank(score);

  finalScore.textContent = score;
  rankTitle.textContent = rank.title;
  resultText.textContent = rank.text;
  maxComboText.textContent = maxCombo;
  goodCountText.textContent = goodCount;
  missCountText.textContent = missCount;

  resultModal.classList.remove("hidden");
}

function getRank(value) {
  if (value >= 360) {
    return {
      title: "伝説の茶摘み名人",
      text: "茶葉が自分から手に吸い寄せられている。もう畑側の存在。",
    };
  }

  if (value >= 260) {
    return {
      title: "八十八夜マスター",
      text: "新芽だけを見抜く眼力。茶畑でかなり信頼されるタイプ。",
    };
  }

  if (value >= 170) {
    return {
      title: "新茶職人",
      text: "十分うまい。たまに勢いで関係ないものも摘むが、全体として優秀。",
    };
  }

  if (value >= 90) {
    return {
      title: "見習い茶摘み人",
      text: "気持ちはある。新芽と古い葉の違いは、なんとなくわかってきた。",
    };
  }

  if (value >= 30) {
    return {
      title: "茶畑観光客",
      text: "茶摘みというより、茶畑に来てテンションが上がった人。",
    };
  }

  return {
    title: "葉っぱに翻弄された人",
    text: "茶葉、虫、古い葉。すべてが同じに見えている。今日は見学でいい。",
  };
}

function setupBgm() {
  if (bgm) return;

  bgm = new Audio(asset("./assets/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = 0.45;

  bgm.addEventListener("error", () => {
    soundEnabled = false;
    soundBtn.classList.add("muted");
  });
}

function playBgm() {
  if (!bgm || !soundEnabled) return;

  bgm.currentTime = 0;
  bgm.play().catch(() => {
    soundEnabled = false;
    soundBtn.classList.add("muted");
  });
}

function pauseBgm() {
  if (!bgm) return;
  bgm.pause();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.classList.toggle("muted", !soundEnabled);

  if (!bgm) return;

  if (soundEnabled && isPlaying) {
    bgm.play().catch(() => {});
  } else {
    bgm.pause();
  }
}

function tinyVibration(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}