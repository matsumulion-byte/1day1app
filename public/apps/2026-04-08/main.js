const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const percentEl = document.getElementById("percent");
const speedEl = document.getElementById("speed");
const ctrlButtons = [...document.querySelectorAll(".ctrl")];

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.preload = "auto";
bgm.volume = 0.7;

const GRID = 24;
const SIZE = canvas.width;
const CELL = SIZE / GRID;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let state = null;
let lastTime = 0;
let acc = 0;
let animationId = 0;

function createState() {
  const totalCells = GRID * GRID;
  const x = Math.floor(GRID / 2);
  const y = Math.floor(GRID / 2);

  const visited = new Set();
  visited.add(`${x},${y}`);

  return {
    phase: "ready",
    mower: { x, y },
    dir: "right",
    nextDir: "right",
    visited,
    totalCells,
    covered: 1,
    percent: (1 / totalCells) * 100,
    elapsed: 0,
    moveInterval: 220,
    minInterval: 72,
    speedStep: 10,
    speedTimer: 0,
    resultText: "",
  };
}

function resetGame() {
  state = createState();
  updateHud();
  draw();
}

function updateHud() {
  percentEl.textContent = `${state.percent.toFixed(1)}%`;

  const speedRatio = 220 / state.moveInterval;
  speedEl.textContent = `${speedRatio.toFixed(1)}x`;
}

function setDirection(dir) {
  if (!state || state.phase !== "playing") return;

  const current = DIRS[state.dir];
  const next = DIRS[dir];

  if (current.x + next.x === 0 && current.y + next.y === 0) return;
  state.nextDir = dir;
}

function inBounds(x, y) {
  return x >= 0 && x < GRID && y >= 0 && y < GRID;
}

function keyFor(x, y) {
  return `${x},${y}`;
}

function moveStep() {
  state.dir = state.nextDir;

  const nextX = state.mower.x + DIRS[state.dir].x;
  const nextY = state.mower.y + DIRS[state.dir].y;

  const blocked =
    !inBounds(nextX, nextY) || state.visited.has(keyFor(nextX, nextY));

  if (blocked) {
    finishGame();
    return;
  }

  state.mower.x = nextX;
  state.mower.y = nextY;
  state.visited.add(keyFor(nextX, nextY));
  state.covered = state.visited.size;
  state.percent = (state.covered / state.totalCells) * 100;
  updateHud();

  if (state.covered >= state.totalCells) {
    finishGame(true);
  }
}

function finishGame(perfect = false) {
  state.phase = "gameover";
  const p = state.percent;

  if (perfect) {
    state.resultText = `完全芝刈り達成。${p.toFixed(1)}%`;
  } else if (p >= 90) {
    state.resultText = `芝職人。${p.toFixed(1)}% 刈れた`;
  } else if (p >= 75) {
    state.resultText = `かなり上手い。${p.toFixed(1)}%`;
  } else if (p >= 50) {
    state.resultText = `まずまず。${p.toFixed(1)}%`;
  } else {
    state.resultText = `まだ青い。${p.toFixed(1)}%`;
  }

  overlay.querySelector("h2").textContent = "ゲームオーバー";
  overlay.querySelector("p").innerHTML = `${state.resultText}<br />もう一回やる？`;
  startBtn.textContent = "リトライ";
  overlay.classList.add("show");

  bgm.pause();
  bgm.currentTime = 0;
  draw();
}

function update(delta) {
  if (!state || state.phase !== "playing") return;

  state.elapsed += delta;
  state.speedTimer += delta;

  if (state.speedTimer >= 3000) {
    state.speedTimer = 0;
    state.moveInterval = Math.max(
      state.minInterval,
      state.moveInterval - state.speedStep
    );
    updateHud();
  }

  acc += delta;
  while (acc >= state.moveInterval) {
    acc -= state.moveInterval;
    moveStep();
    if (state.phase !== "playing") break;
  }
}

function drawGrassCell(col, row, cut = false) {
  const x = col * CELL;
  const y = row * CELL;

  if (!cut) {
    ctx.fillStyle = (col + row) % 2 === 0 ? "#67bc50" : "#61b44c";
    ctx.fillRect(x, y, CELL, CELL);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2);
    ctx.lineTo(x + 8, y + CELL - 3);
    ctx.moveTo(x + 12, y + 3);
    ctx.lineTo(x + 16, y + CELL - 2);
    ctx.moveTo(x + 20, y + 2);
    ctx.lineTo(x + 24, y + CELL - 4);
    ctx.stroke();
    return;
  }

  ctx.fillStyle = (col + row) % 2 === 0 ? "#9bce74" : "#90c76c";
  ctx.fillRect(x, y, CELL, CELL);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = -CELL; i < CELL * 2; i += 10) {
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + CELL, y + CELL);
  }
  ctx.stroke();
}

function drawGrid() {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      drawGrassCell(x, y, state.visited.has(keyFor(x, y)));
    }
  }
}

function drawMower() {
  const px = state.mower.x * CELL;
  const py = state.mower.y * CELL;
  const pad = CELL * 0.14;

  ctx.save();
  ctx.translate(px + CELL / 2, py + CELL / 2);

  const angleMap = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  };
  ctx.rotate(angleMap[state.dir]);

  ctx.fillStyle = "#1f2b23";
  ctx.fillRect(-CELL * 0.28, -CELL * 0.18, CELL * 0.56, CELL * 0.36);

  ctx.fillStyle = "#e54646";
  ctx.fillRect(-CELL * 0.18, -CELL * 0.24, CELL * 0.32, CELL * 0.18);

  ctx.strokeStyle = "#1f2b23";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-CELL * 0.16, -CELL * 0.12);
  ctx.lineTo(-CELL * 0.34, -CELL * 0.34);
  ctx.stroke();

  ctx.fillStyle = "#0f1612";
  ctx.beginPath();
  ctx.arc(-CELL * 0.18, CELL * 0.18, CELL * 0.1, 0, Math.PI * 2);
  ctx.arc(CELL * 0.18, CELL * 0.18, CELL * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(-CELL * 0.06, -CELL * 0.2, CELL * 0.14, CELL * 0.1);

  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2);
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawMower();

  ctx.strokeStyle = "rgba(21, 40, 24, 0.15)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);
}

function drawStartHint() {
  if (!state || state.phase === "playing") return;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(
    state.mower.x * CELL + CELL / 2,
    state.mower.y * CELL + CELL / 2,
    CELL * 0.66,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function draw() {
  drawFrame();
  drawStartHint();
}

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const delta = ts - lastTime;
  lastTime = ts;

  update(delta);
  draw();

  animationId = requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  state.phase = "playing";
  overlay.classList.remove("show");
  overlay.querySelector("h2").textContent = "芝刈りスネーク";
  overlay.querySelector("p").innerHTML =
    "矢印キー / WASD / 下のボタンで移動。<br />通ったマスは刈られて通れません。<br />時間が経つほどスピードアップします。";
  startBtn.textContent = "スタート";

  acc = 0;
  lastTime = 0;

  bgm.currentTime = 0;
  bgm.play().catch(() => {});
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "arrowup" || key === "w") setDirection("up");
  else if (key === "arrowdown" || key === "s") setDirection("down");
  else if (key === "arrowleft" || key === "a") setDirection("left");
  else if (key === "arrowright" || key === "d") setDirection("right");
});

for (const btn of ctrlButtons) {
  const dir = btn.dataset.dir;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setDirection(dir);
  });
}

startBtn.addEventListener("click", () => {
  startGame();
});

resetGame();
animationId = requestAnimationFrame(loop);