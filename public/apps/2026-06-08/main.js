const plate = document.getElementById("plate");
const foodLayer = document.getElementById("foodLayer");
const spillLayer = document.getElementById("spillLayer");
const foodBar = document.getElementById("foodBar");
const timeLeftEl = document.getElementById("timeLeft");
const dishCountEl = document.getElementById("dishCount");
const balanceScoreEl = document.getElementById("balanceScore");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");
const retryBtn = document.getElementById("retryBtn");
const bgm = document.getElementById("bgm");

const LIMIT = 12;
const ROUND_SECONDS = 30;

const foods = [
  { id: "karaage", name: "唐揚げ", icon: "🍗", color: "#d88a32", group: "brown", weight: 13, fullness: 14, score: 18, size: 58 },
  { id: "potato", name: "ポテト", icon: "🍟", color: "#f0c94d", group: "yellow", weight: 8, fullness: 9, score: 11, size: 54 },
  { id: "curry", name: "カレー", icon: "🍛", color: "#a86224", group: "brown", weight: 16, fullness: 18, score: 20, size: 82 },
  { id: "salad", name: "サラダ", icon: "🥗", color: "#62b85f", group: "green", weight: 5, fullness: 5, score: 12, size: 62 },
  { id: "sushi", name: "寿司", icon: "🍣", color: "#f7f2dc", group: "white", weight: 7, fullness: 7, score: 15, size: 58 },
  { id: "roast", name: "ロースト肉", icon: "🥩", color: "#b94d35", group: "red", weight: 17, fullness: 16, score: 23, size: 72 },
  { id: "pudding", name: "プリン", icon: "🍮", color: "#f4d46a", group: "yellow", weight: 6, fullness: 8, score: 20, size: 58 },
  { id: "soup", name: "スープ", icon: "🥣", color: "#d66339", group: "red", weight: 12, fullness: 10, score: 14, size: 68 },
  { id: "bread", name: "パン", icon: "🥐", color: "#d6a15e", group: "brown", weight: 6, fullness: 8, score: 10, size: 58 },
  { id: "fruit", name: "フルーツ", icon: "🍓", color: "#e96d86", group: "pink", weight: 4, fullness: 4, score: 14, size: 54 },
  { id: "pasta", name: "パスタ", icon: "🍝", color: "#e9b84d", group: "yellow", weight: 11, fullness: 12, score: 16, size: 72 },
  { id: "fish", name: "焼き魚", icon: "🐟", color: "#9fb0b1", group: "white", weight: 10, fullness: 9, score: 16, size: 68 }
];

const messages = [
  "中央から外へ、いい感じに埋まってきました。",
  "茶色が増えたら、野菜かフルーツで逃げましょう。",
  "プリンは最後まで守るとちょっと偉いです。",
  "端に重いものを置くと皿が傾きます。",
  "彩りが増えるとスコアが伸びます。",
  "欲張るほど、皿のふちが忙しくなります。"
];

const plateSpots = [
  { x: 0, y: 16 },
  { x: -58, y: -28 },
  { x: 58, y: -30 },
  { x: -72, y: 38 },
  { x: 72, y: 36 },
  { x: 0, y: -70 },
  { x: -18, y: 82 },
  { x: 34, y: 70 },
  { x: -96, y: -2 },
  { x: 96, y: 0 },
  { x: -34, y: -92 },
  { x: 42, y: -92 }
];

let items = [];
let spills = [];
let timeLeft = ROUND_SECONDS;
let timerId = null;
let running = false;
let lastTapAt = 0;

bgm.loop = true;
bgm.volume = 0.38;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setupFoodButtons() {
  foodBar.innerHTML = "";
  for (const food of foods) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "food-btn";
    button.dataset.food = food.id;
    button.innerHTML = `<span class="icon">${food.icon}</span><span class="name">${food.name}</span>`;
    button.addEventListener("click", () => addFood(food.id));
    foodBar.append(button);
  }
}

function startGame() {
  items = [];
  spills = [];
  timeLeft = ROUND_SECONDS;
  running = true;
  foodLayer.innerHTML = "";
  spillLayer.innerHTML = "";
  resultEl.classList.add("hidden");
  messageEl.textContent = "一周目から本気でいきます。";
  setButtonsDisabled(false);
  updateStats();
  playBgm();

  if (timerId) {
    clearInterval(timerId);
  }
  timerId = setInterval(() => {
    timeLeft -= 1;
    updateStats();
    if (timeLeft <= 0) {
      finishGame();
    }
  }, 1000);
}

function prepareGame() {
  items = [];
  spills = [];
  timeLeft = ROUND_SECONDS;
  running = false;
  foodLayer.innerHTML = "";
  spillLayer.innerHTML = "";
  resultEl.classList.add("hidden");
  messageEl.textContent = "一周目から本気でいきます。";
  setButtonsDisabled(false);
  plate.style.setProperty("--tilt", "0deg");
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  stopBgm();
  updateStats();
}

function playBgm() {
  if (!bgm.paused) {
    return;
  }
  bgm.currentTime = 0;
  bgm.play().catch(() => {});
}

function stopBgm() {
  bgm.pause();
  bgm.currentTime = 0;
}

function setButtonsDisabled(disabled) {
  for (const button of foodBar.querySelectorAll("button")) {
    button.disabled = disabled;
  }
}

function addFood(foodId) {
  if (!running) {
    startGame();
  }
  if (!running || items.length >= LIMIT) {
    return;
  }

  const food = foods.find((entry) => entry.id === foodId);
  const spot = getPlateSpot(items.length, food);
  const item = {
    ...food,
    uid: `${food.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    x: spot.x,
    y: spot.y,
    rot: spot.rot,
    stack: items.length
  };

  items.push(item);
  renderFood(item);
  settlePlate();
  updateStats();

  const fallen = maybeDropFood();
  if (fallen) {
    messageEl.textContent = `${fallen.name} が皿から逃げました。`;
  } else {
    messageEl.textContent = messages[Math.floor(rand(0, messages.length))];
  }

  if (items.length >= LIMIT) {
    finishGame();
  }
}

function getPlateSpot(index, food) {
  const spot = plateSpots[index % plateSpots.length];
  const lap = Math.floor(index / plateSpots.length);
  const liquidBias = food.id === "curry" || food.id === "soup" || food.id === "pasta" ? 0.55 : 1;
  return {
    x: spot.x * liquidBias + rand(-9, 9) + lap * rand(-8, 8),
    y: spot.y * liquidBias + rand(-7, 7) - lap * 8,
    rot: rand(-13, 13)
  };
}

function renderFood(item) {
  const node = document.createElement("div");
  node.className = `food food-${item.id}`;
  node.dataset.uid = item.uid;
  node.innerHTML = `<span>${item.icon}</span>`;
  node.style.setProperty("--x", item.x.toFixed(1));
  node.style.setProperty("--y", item.y.toFixed(1));
  node.style.setProperty("--rot", `${item.rot.toFixed(1)}deg`);
  node.style.setProperty("--fall-x", `${rand(-130, 130).toFixed(1)}`);
  node.style.setProperty("--size", `${item.size}px`);
  node.style.setProperty("--color", item.color);
  node.style.setProperty("--radius", radiusFor(item.id));
  node.style.zIndex = String(20 + item.stack);
  foodLayer.append(node);
}

function radiusFor(foodId) {
  if (foodId === "sushi" || foodId === "fish" || foodId === "bread" || foodId === "roast") {
    return "28px";
  }
  if (foodId === "curry" || foodId === "soup" || foodId === "pasta") {
    return "38%";
  }
  return "999px";
}

function maybeDropFood() {
  const stability = getStability();
  const risk = Math.max(0, 64 - stability) + Math.max(0, getFullness() - 92) * 0.7;
  if (items.length < 8 || Math.random() * 100 > risk) {
    return null;
  }

  const sorted = [...items].sort((a, b) => {
    const da = Math.hypot(a.x, a.y);
    const db = Math.hypot(b.x, b.y);
    return db - da;
  });
  const fallen = sorted[0];
  items = items.filter((item) => item.uid !== fallen.uid);
  spills.push(fallen);

  const node = foodLayer.querySelector(`[data-uid="${fallen.uid}"]`);
  if (node) {
    node.classList.add("is-falling");
    window.setTimeout(() => node.remove(), 720);
  }
  renderSpill(fallen);
  return fallen;
}

function renderSpill(item) {
  const node = document.createElement("div");
  const table = document.querySelector(".table").getBoundingClientRect();
  node.className = "spill";
  node.innerHTML = `<span>${item.icon}</span>`;
  node.style.left = `${clamp(table.width / 2 + item.x + rand(-100, 100), 32, table.width - 32)}px`;
  node.style.top = `${clamp(table.height / 2 + item.y + rand(120, 210), 40, table.height - 28)}px`;
  node.style.setProperty("--rot", `${rand(-34, 34).toFixed(1)}deg`);
  node.style.setProperty("--size", `${Math.max(38, item.size - 8)}px`);
  node.style.setProperty("--color", item.color);
  node.style.setProperty("--radius", radiusFor(item.id));
  spillLayer.append(node);
}

function settlePlate() {
  const centerX = items.reduce((sum, item) => sum + item.x * item.weight, 0);
  const totalWeight = Math.max(1, items.reduce((sum, item) => sum + item.weight, 0));
  const tilt = clamp(centerX / totalWeight / 4.8, -8, 8);
  plate.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
}

function getFullness() {
  return items.reduce((sum, item) => sum + item.fullness, 0);
}

function getStability() {
  if (items.length === 0) {
    return 100;
  }
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const centerX = items.reduce((sum, item) => sum + item.x * item.weight, 0) / totalWeight;
  const centerY = items.reduce((sum, item) => sum + item.y * item.weight, 0) / totalWeight;
  const edgePenalty = items.reduce((sum, item) => sum + Math.max(0, Math.hypot(item.x, item.y) - 88) * 0.28, 0);
  const fullnessPenalty = Math.max(0, getFullness() - 70) * 0.72;
  const spillPenalty = spills.length * 8;
  return Math.round(clamp(100 - Math.hypot(centerX, centerY) * 0.75 - edgePenalty - fullnessPenalty - spillPenalty, 0, 100));
}

function getColorScore() {
  const groups = new Set(items.map((item) => item.group));
  const brownCount = items.filter((item) => item.group === "brown").length;
  return clamp(groups.size * 12 - Math.max(0, brownCount - 2) * 8, 0, 60);
}

function getScore() {
  const base = items.reduce((sum, item) => sum + item.score, 0);
  return Math.max(0, Math.round(base + getColorScore() + getStability() * 0.9 - spills.length * 18));
}

function updateStats() {
  timeLeftEl.textContent = String(Math.max(0, timeLeft)).padStart(2, "0");
  dishCountEl.textContent = `${items.length}/${LIMIT}`;
  balanceScoreEl.textContent = String(getStability());
}

function finishGame() {
  if (!running) {
    return;
  }
  running = false;
  clearInterval(timerId);
  timerId = null;
  setButtonsDisabled(true);
  stopBgm();
  updateStats();

  const title = getResultTitle();
  resultTitleEl.textContent = title;
  resultTextEl.textContent = `スコア ${getScore()} / 落下 ${spills.length} / 彩り ${getColorScore()}`;
  resultEl.classList.remove("hidden");
}

function getResultTitle() {
  const stability = getStability();
  const fullness = getFullness();
  const brownCount = items.filter((item) => item.group === "brown").length;
  const hasPudding = items.some((item) => item.id === "pudding");
  const hasSalad = items.some((item) => item.id === "salad");

  if (spills.length >= 3) return "皿の限界を知る者";
  if (brownCount >= 5) return "茶色の王";
  if (hasPudding && stability >= 72) return "プリン死守型";
  if (hasSalad && brownCount >= 3) return "野菜で帳尻";
  if (fullness >= 96 && stability >= 65) return "一周目から本気";
  if (stability >= 88 && items.length >= 8) return "ホテル朝食の支配者";
  if (items.length <= 5) return "慎重派の二周目";
  return "ほどほどの名人";
}

document.addEventListener("touchend", (event) => {
  const now = Date.now();
  if (now - lastTapAt < 420) {
    event.preventDefault();
  }
  lastTapAt = now;
}, { passive: false });

document.addEventListener("gesturestart", (event) => {
  event.preventDefault();
});

foodBar.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".food-btn")) {
    playBgm();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    bgm.pause();
  } else if (running) {
    bgm.play().catch(() => {});
  }
});

retryBtn.addEventListener("click", prepareGame);

setupFoodButtons();
prepareGame();
