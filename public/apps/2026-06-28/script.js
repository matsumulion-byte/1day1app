const startScreen = document.getElementById("startScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const messageEl = document.getElementById("message");
const stackEl = document.getElementById("stack");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");
const finalParfaitEl = document.getElementById("finalParfait");

const correctOrder = [
  { id: "corn", label: "コーンフレーク", emoji: "🥣", className: "corn" },
  { id: "ice", label: "アイス", emoji: "🍨", className: "ice" },
  { id: "cream", label: "生クリーム", emoji: "☁️", className: "cream" },
  { id: "strawberry", label: "いちご", emoji: "🍓", className: "strawberry" },
  { id: "choco", label: "チョコソース", emoji: "🍫", className: "choco" },
];

const badItems = [
  { id: "chikuwa", label: "ちくわ", emoji: "🟫" },
  { id: "karaage", label: "からあげ", emoji: "🍗" },
  { id: "wasabi", label: "わさび", emoji: "🟢" },
  { id: "mozuku", label: "もずく", emoji: "🪱" },
  { id: "matsumura", label: "松村", emoji: "👓" },
];

let score = 0;
let time = 30;
let currentIndex = 0;
let gameActive = false;
let spawnTimer = null;
let countdownTimer = null;
let messageTimer = null;
let stacked = [];

function startGame() {
  clearGame();

  score = 0;
  time = 30;
  currentIndex = 0;
  gameActive = true;
  stacked = [];

  scoreEl.textContent = score;
  timeEl.textContent = time;

  startScreen.classList.remove("active");
  resultScreen.classList.remove("active");

  showMessage("順番通りに積め");

  spawnTimer = setInterval(spawnItem, 720);
  countdownTimer = setInterval(() => {
    time--;
    timeEl.textContent = time;

    if (time <= 0) {
      endGame();
    }
  }, 1000);
}

function clearGame() {
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  document.querySelectorAll(".falling").forEach(el => el.remove());
  stackEl.innerHTML = "";
  hideMessage();
}

function spawnItem() {
  if (!gameActive) return;

  const shouldDropCorrect = Math.random() < 0.48;
  let item;

  if (shouldDropCorrect && currentIndex < correctOrder.length) {
    item = { ...correctOrder[currentIndex], type: "correct" };
  } else {
    const pool = [
      ...correctOrder.filter(item => item.id !== correctOrder[currentIndex]?.id),
      ...badItems
    ];
    item = { ...pool[Math.floor(Math.random() * pool.length)], type: "wrong" };
  }

  const el = document.createElement("div");
  el.className = "falling";
  el.textContent = item.emoji;
  el.dataset.id = item.id;
  el.dataset.label = item.label;

  const size = window.innerWidth < 520 ? 62 : 72;
  const x = Math.random() * (window.innerWidth - size - 20) + 10;
  const duration = Math.random() * 1600 + 3000;

  el.style.left = `${x}px`;
  el.style.top = `-90px`;

  document.body.appendChild(el);

  const start = performance.now();

  function fall(now) {
    if (!gameActive || !el.isConnected) return;

    const progress = (now - start) / duration;
    const y = -90 + progress * (window.innerHeight + 140);
    el.style.top = `${y}px`;

    if (progress >= 1) {
      el.remove();
      return;
    }

    requestAnimationFrame(fall);
  }

  requestAnimationFrame(fall);

  el.addEventListener("pointerdown", () => {
    pickItem(item, el);
  });
}

function pickItem(item, el) {
  if (!gameActive) return;

  el.remove();

  const expected = correctOrder[currentIndex];

  if (expected && item.id === expected.id) {
    score += 100;
    currentIndex++;
    stacked.push(item);
    addLayer(item, false);
    scoreEl.textContent = score;

    if (currentIndex >= correctOrder.length) {
      score += Math.max(0, time) * 10;
      scoreEl.textContent = score;
      showMessage("パーフェクト！");
      setTimeout(endGame, 450);
    } else {
      showMessage(`正解。次は「${correctOrder[currentIndex].label}」`);
    }
  } else {
    score = Math.max(0, score - 50);
    scoreEl.textContent = score;
    addLayer(item, true);

    if (badItems.some(bad => bad.id === item.id)) {
      showMessage(`${item.label}はパフェじゃない`);
    } else if (expected) {
      showMessage(`まだ${expected.label}の時間です`);
    } else {
      showMessage("もう何も入れるな");
    }
  }
}

function addLayer(item, isBad) {
  const layer = document.createElement("div");
  layer.className = `layer ${isBad ? "bad" : item.className}`;
  layer.textContent = item.emoji;
  stackEl.appendChild(layer);

  const layers = stackEl.querySelectorAll(".layer");
  if (layers.length > 8) {
    layers[0].remove();
  }
}

function showMessage(text) {
  clearTimeout(messageTimer);
  messageEl.textContent = text;
  messageEl.classList.add("show");

  messageTimer = setTimeout(() => {
    hideMessage();
  }, 1200);
}

function hideMessage() {
  messageEl.classList.remove("show");
}

function endGame() {
  if (!gameActive) return;

  gameActive = false;
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  document.querySelectorAll(".falling").forEach(el => el.remove());

  const completed = currentIndex >= correctOrder.length;

  if (completed && score >= 500) {
    resultTitleEl.textContent = "完全試合パフェ";
    resultTextEl.innerHTML = `パーフェクトパフェ完成！<br>これはもう完全試合です。<br>SCORE：${score}`;
    finalParfaitEl.textContent = "🥣🍨☁️🍓🍫";
  } else if (currentIndex >= 3) {
    resultTitleEl.textContent = "ほぼパフェ";
    resultTextEl.innerHTML = `かなりパフェ。<br>でも完全ではありません。<br>SCORE：${score}`;
    finalParfaitEl.textContent = stacked.map(item => item.emoji).join("");
  } else {
    resultTitleEl.textContent = "何かの供養";
    resultTextEl.innerHTML = `パフェではなく、何かの供養です。<br>SCORE：${score}`;
    finalParfaitEl.textContent = "🍗🟢👓";
  }

  resultScreen.classList.add("active");
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
