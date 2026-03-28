const ASSET_BASE = "/apps/2026-03-28";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const ASSETS = {
  mitsuba: asset("./assets/mitsuba_matsumura.png"),
  yotsuba: asset("./assets/yotsuba_matsumura.png"),
  bgm: asset("./assets/bgm.mp3"),
};

const GAME_DURATION = 30;
const INITIAL_COUNT = 18;
const REFILL_DELAY = 40;
const WRONG_PENALTY = 1;

const field = document.getElementById("field");
const timeValue = document.getElementById("timeValue");
const scoreValue = document.getElementById("scoreValue");

const startOverlay = document.getElementById("startOverlay");
const finishOverlay = document.getElementById("finishOverlay");
const finalScore = document.getElementById("finalScore");
const finalMessage = document.getElementById("finalMessage");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");

const bgm = new Audio(ASSETS.bgm);
bgm.loop = true;
bgm.preload = "auto";
bgm.volume = 0.42;

let score = 0;
let timeLeft = GAME_DURATION;
let timerId = null;
let running = false;
let activeLeaves = new Set();
let occupiedRects = [];

function updateHud() {
  timeValue.textContent = String(timeLeft);
  scoreValue.textContent = String(score);
}

function difficultyRate() {
  const elapsed = GAME_DURATION - timeLeft;
  if (elapsed < 10) {
    return { min: 84, max: 108, correctRate: 0.22 };
  }
  if (elapsed < 20) {
    return { min: 72, max: 96, correctRate: 0.18 };
  }
  return { min: 60, max: 84, correctRate: 0.15 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clearLeaves() {
  activeLeaves.forEach((leaf) => leaf.remove());
  activeLeaves.clear();
  occupiedRects = [];
}

function resetGame() {
  score = 0;
  timeLeft = GAME_DURATION;
  running = false;

  clearInterval(timerId);
  timerId = null;

  clearLeaves();
  updateHud();

  finishOverlay.classList.remove("show");
}

function stopBgm() {
  bgm.pause();
  bgm.currentTime = 0;
}

async function startBgm() {
  try {
    await bgm.play();
  } catch {
    // iOS等で失敗してもゲーム自体は続行
  }
}

function getFieldRect() {
  return field.getBoundingClientRect();
}

function isOverlapping(a, b, pad = 6) {
  return !(
    a.right + pad < b.left ||
    a.left - pad > b.right ||
    a.bottom + pad < b.top ||
    a.top - pad > b.bottom
  );
}

function findPosition(size) {
  const rect = getFieldRect();
  const margin = 10;
  const topReserved = 10;
  const maxX = rect.width - size - margin;
  const maxY = rect.height - size - margin;

  for (let i = 0; i < 60; i += 1) {
    const x = random(margin, Math.max(margin, maxX));
    const y = random(topReserved, Math.max(topReserved, maxY));
    const candidate = {
      left: x,
      top: y,
      right: x + size,
      bottom: y + size,
    };

    const conflict = occupiedRects.some((r) => isOverlapping(candidate, r));
    if (!conflict) {
      return { x, y, rect: candidate };
    }
  }

  const x = random(margin, Math.max(margin, maxX));
  const y = random(topReserved, Math.max(topReserved, maxY));
  return {
    x,
    y,
    rect: { left: x, top: y, right: x + size, bottom: y + size },
  };
}

function makePop(text, x, y) {
  const pop = document.createElement("div");
  pop.className = "pop";
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  field.appendChild(pop);

  setTimeout(() => {
    pop.remove();
  }, 700);
}

function removeOccupiedRect(target) {
  if (!target?._occupiedRect) return;
  occupiedRects = occupiedRects.filter((rect) => rect !== target._occupiedRect);
}

function spawnLeaf() {
  if (!running) return;

  const diff = difficultyRate();
  const isCorrect = Math.random() < diff.correctRate;
  const size = Math.round(random(diff.min, diff.max));
  const { x, y, rect } = findPosition(size);

  const leaf = document.createElement("img");
  leaf.className = "leaf";
  leaf.src = isCorrect ? ASSETS.mitsuba : ASSETS.yotsuba;
  leaf.alt = isCorrect ? "三つ葉の松村" : "四つ葉の松村";
  leaf.dataset.kind = isCorrect ? "correct" : "wrong";
  leaf.width = size;
  leaf.height = size;
  leaf.style.width = `${size}px`;
  leaf.style.height = `${size}px`;
  leaf.style.left = `${x}px`;
  leaf.style.top = `${y}px`;
  leaf.style.setProperty("--float-duration", `${random(2.2, 3.4).toFixed(2)}s`);
  leaf.style.setProperty("--float-delay", `${random(0, 1.2).toFixed(2)}s`);

  leaf._occupiedRect = rect;
  occupiedRects.push(rect);
  activeLeaves.add(leaf);

  leaf.addEventListener("pointerdown", (event) => {
    if (!running) return;

    event.preventDefault();
    const kind = leaf.dataset.kind;
    const localX = leaf.offsetLeft + leaf.offsetWidth / 2;
    const localY = leaf.offsetTop + leaf.offsetHeight / 2;

    removeOccupiedRect(leaf);

    if (kind === "correct") {
      score += 1;
      leaf.classList.add("hit");
      makePop("+1", localX, localY);
    } else {
      score = Math.max(0, score - WRONG_PENALTY);
      leaf.classList.add("miss");
      makePop("-1", localX, localY);
    }

    updateHud();

    leaf.style.pointerEvents = "none";

    setTimeout(() => {
      activeLeaves.delete(leaf);
      leaf.remove();
      if (running) {
        spawnLeaf();
      }
    }, 150);
  });

  field.appendChild(leaf);
}

function fillInitialLeaves() {
  for (let i = 0; i < INITIAL_COUNT; i += 1) {
    spawnLeaf();
  }
}

function endGame() {
  running = false;
  clearInterval(timerId);
  timerId = null;
  stopBgm();

  activeLeaves.forEach((leaf) => {
    leaf.style.pointerEvents = "none";
  });

  finalScore.textContent = `${score}点`;
  finalMessage.textContent = getResultMessage(score);
  finishOverlay.classList.add("show");
}

function getResultMessage(currentScore) {
  if (currentScore <= 5) {
    return "葉っぱに気を取られています。";
  }
  if (currentScore <= 12) {
    return "松村の気配を感じています。";
  }
  if (currentScore <= 20) {
    return "かなり松村が見えています。";
  }
  return "完全に松村です。";
}

function tick() {
  timeLeft -= 1;
  updateHud();

  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    endGame();
  }
}

async function beginGame() {
  resetGame();
  startOverlay.classList.remove("show");
  finishOverlay.classList.remove("show");
  running = true;

  fillInitialLeaves();
  updateHud();
  await startBgm();

  timerId = setInterval(tick, 1000);
}

function handleResize() {
  if (!running) return;

  const leaves = Array.from(activeLeaves);
  clearLeaves();

  const count = leaves.length || INITIAL_COUNT;
  for (let i = 0; i < count; i += 1) {
    setTimeout(() => {
      if (running) spawnLeaf();
    }, i * REFILL_DELAY);
  }
}

startButton.addEventListener("click", beginGame);
retryButton.addEventListener("click", beginGame);

window.addEventListener("resize", handleResize);

resetGame();