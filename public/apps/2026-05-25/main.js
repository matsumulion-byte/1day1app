const ASSET_BASE = "/apps/2026-05-25";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const itemImg = (file, className = "") => {
  const cls = ["object-img", className].filter(Boolean).join(" ");
  return `<img class="${cls}" src="${asset(`./assets/${file}`)}" alt="" decoding="async">`;
};

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const holesEl = document.getElementById("holes");
const timeText = document.getElementById("timeText");
const scoreText = document.getElementById("scoreText");
const missText = document.getElementById("missText");
const messageEl = document.getElementById("message");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const finalScore = document.getElementById("finalScore");
const finalMiss = document.getElementById("finalMiss");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.62;

const GAME_TIME = 30;
const MAX_MISS = 3;
const HOLE_COUNT = 5;

const targetMessages = [
  "GOOD確認",
  "親指です",
  "肯定を回収",
  "前向きな手",
  "それだけ叩け",
];

const wrongMessages = [
  "それはちくわです",
  "骨に希望を見るな",
  "ソーセージを信じるな",
  "スプーンは親指ではない",
  "ただの棒です",
  "GOODって書いてあるだけです",
  "バナナに意味を持たせるな",
  "煙を叩くな",
];

const missMessages = [
  "親指は沈みました",
  "GOODは溶けました",
  "肯定の機会を逃しました",
  "世界を肯定しそこねました",
];

const items = [
  {
    id: "thumb",
    type: "target",
    label: "サムズアップ",
    html: itemImg("thumb.png", "thumb-img"),
    weight: 28,
  },
  {
    id: "choki",
    type: "wrong",
    label: "チョキ",
    html: itemImg("choki.png"),
    weight: 14,
  },
  {
    id: "down",
    type: "wrong",
    label: "サムズダウン",
    html: itemImg("down.png"),
    weight: 12,
  },
  {
    id: "pa",
    type: "wrong",
    label: "パー",
    html: itemImg("pa.png"),
    weight: 12,
  },
  {
    id: "leg",
    type: "wrong",
    label: "足",
    html: itemImg("leg.png"),
    weight: 12,
  },
];

let holes = [];
let score = 0;
let miss = 0;
let timeLeft = GAME_TIME;
let isPlaying = false;

let tickTimer = null;
let spawnTimer = null;
let currentItems = new Map();

function initHoles() {
  holesEl.innerHTML = "";
  holes = [];

  for (let i = 0; i < HOLE_COUNT; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.dataset.index = String(i);

    const mouth = document.createElement("div");
    mouth.className = "hole-mouth";

    hole.appendChild(mouth);
    holesEl.appendChild(hole);
    holes.push(hole);
  }
}

function weightedPick(list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of list) {
    r -= item.weight;
    if (r <= 0) return item;
  }

  return list[0];
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function playBgm() {
  bgm.play().catch(() => {
    // ブラウザの自動再生制限対策。ユーザー操作後に再度呼ばれるので無視。
  });
}

function startGame() {
  playBgm();

  score = 0;
  miss = 0;
  timeLeft = GAME_TIME;
  isPlaying = true;

  currentItems.clear();
  holes.forEach((hole) => {
    hole.querySelectorAll(".item, .hit").forEach((el) => el.remove());
  });

  updateHud();
  setMessage("親指だけ叩け");

  titleScreen.style.display = "none";
  resultScreen.style.display = "none";
  resultScreen.setAttribute("aria-hidden", "true");

  gameScreen.style.display = "grid";
  gameScreen.setAttribute("aria-hidden", "false");

  clearInterval(tickTimer);
  clearTimeout(spawnTimer);

  tickTimer = setInterval(() => {
    timeLeft -= 1;
    updateHud();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  scheduleSpawn(350);
}

function scheduleSpawn(delay = null) {
  if (!isPlaying) return;

  const speed = getCurrentSpeed();
  const nextDelay = delay ?? Math.max(250, speed.delay + Math.random() * 160 - 80);

  spawnTimer = setTimeout(() => {
    spawnItem();
    scheduleSpawn();
  }, nextDelay);
}

function getCurrentSpeed() {
  const progress = 1 - timeLeft / GAME_TIME;

  return {
    delay: 760 - progress * 360,
    visible: 960 - progress * 430,
  };
}

function getEmptyHoleIndex() {
  const empty = holes
    .map((_, index) => index)
    .filter((index) => !currentItems.has(index));

  if (empty.length === 0) return null;
  return randomChoice(empty);
}

function spawnItem() {
  if (!isPlaying) return;

  const holeIndex = getEmptyHoleIndex();
  if (holeIndex === null) return;

  const hole = holes[holeIndex];
  const itemData = weightedPick(items);
  const speed = getCurrentSpeed();

  const itemBtn = document.createElement("button");
  itemBtn.className = "item";
  itemBtn.type = "button";
  itemBtn.setAttribute("aria-label", itemData.label);
  itemBtn.innerHTML = itemData.html;

  const instance = {
    holeIndex,
    data: itemData,
    el: itemBtn,
    hit: false,
    timeoutId: null,
  };

  currentItems.set(holeIndex, instance);
  hole.appendChild(itemBtn);

  requestAnimationFrame(() => {
    itemBtn.classList.add("up");
  });

  itemBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handleTap(instance);
  }, { passive: false });

  instance.timeoutId = setTimeout(() => {
    if (!isPlaying || instance.hit) return;

    if (instance.data.type === "target") {
      addMiss("missed");
      showPop(hole, "MISS", true);
      setMessage(randomChoice(missMessages), "bad");
    }

    hideItem(instance);
  }, speed.visible);
}

function handleTap(instance) {
  if (!isPlaying || instance.hit) return;

  instance.hit = true;
  clearTimeout(instance.timeoutId);

  const hole = holes[instance.holeIndex];

  if (instance.data.type === "target") {
    score += 1;
    showPop(hole, "GOOD", false);
    setMessage(randomChoice(targetMessages), "good");
  } else {
    addMiss("wrong");
    showPop(hole, "MISS", true);
    setMessage(getWrongMessage(instance.data.id), "bad");
  }

  updateHud();
  hideItem(instance);

  if (miss >= MAX_MISS) {
    setTimeout(endGame, 280);
  }
}

function getWrongMessage(id) {
  const fixed = {
    choki: "それはチョキです",
    down: "それは逆です",
    pa: "パーは親指ではない",
    leg: "足は親指ではない",
  };

  return fixed[id] ?? randomChoice(wrongMessages);
}

function hideItem(instance) {
  const { holeIndex, el } = instance;

  el.classList.remove("up");
  el.classList.add("down");

  setTimeout(() => {
    el.remove();
    currentItems.delete(holeIndex);
  }, 170);
}

function addMiss() {
  miss += 1;
  updateHud();
}

function showPop(hole, text, isMiss) {
  const pop = document.createElement("div");
  pop.className = isMiss ? "hit miss-pop" : "hit";
  pop.textContent = text;

  hole.appendChild(pop);

  setTimeout(() => {
    pop.remove();
  }, 460);
}

function updateHud() {
  timeText.textContent = String(Math.max(0, timeLeft));
  scoreText.textContent = String(score);
  missText.textContent = `${miss}/${MAX_MISS}`;
}

function endGame() {
  if (!isPlaying) return;

  isPlaying = false;
  clearInterval(tickTimer);
  clearTimeout(spawnTimer);

  currentItems.forEach((instance) => {
    clearTimeout(instance.timeoutId);
    hideItem(instance);
  });

  setTimeout(() => {
    showResult();
  }, 320);
}

function showResult() {
  gameScreen.style.display = "none";
  gameScreen.setAttribute("aria-hidden", "true");

  resultScreen.style.display = "grid";
  resultScreen.setAttribute("aria-hidden", "false");

  finalScore.textContent = String(score);
  finalMiss.textContent = String(miss);

  const result = getResult(score, miss);
  resultTitle.textContent = result.title;
  resultText.textContent = result.text;
}

function getResult(goodCount, missCount) {
  if (missCount === 0 && goodCount >= 12) {
    return {
      title: "親指鑑定士",
      text: "溶鉱炉の中から、前向きな手だけを正確に見抜きました。",
    };
  }

  if (goodCount >= 10 && missCount <= 1) {
    return {
      title: "ほぼ前向き",
      text: "少しだけ変なものを叩きましたが、だいたい親指を信じられています。",
    };
  }

  if (goodCount >= 7 && missCount <= 2) {
    return {
      title: "かなり怪しい親指係",
      text: "親指とちくわの区別が、ところどころ曖昧でした。",
    };
  }

  if (missCount >= MAX_MISS) {
    return {
      title: "なんでも肯定する人",
      text: "ソーセージにも、骨にも、煙にも、等しく希望を見出しました。",
    };
  }

  if (goodCount <= 4) {
    return {
      title: "溶鉱炉を眺めていた人",
      text: "親指は何度か現れましたが、だいたい沈んでいきました。",
    };
  }

  return {
    title: "チャンスに弱い",
    text: "親指は見えていました。押す覚悟だけが足りませんでした。",
  };
}

function preventZoom() {
  let lastTouchEnd = 0;

  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 350) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("gesturestart", (event) => {
    event.preventDefault();
  });
}

initHoles();
preventZoom();

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);