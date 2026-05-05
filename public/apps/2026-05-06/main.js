const asset = (p) => new URL(p, import.meta.url).toString();

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const viewCanvas = document.getElementById("viewCanvas");
const viewCtx = viewCanvas.getContext("2d");

const mapCanvas = document.getElementById("mapCanvas");
const mapCtx = mapCanvas.getContext("2d");

const timeText = document.getElementById("timeText");
const stepText = document.getElementById("stepText");
const depthText = document.getElementById("depthText");
const facingText = document.getElementById("facingText");
const hintText = document.getElementById("hintText");
const message = document.getElementById("message");

const resultTitle = document.getElementById("resultTitle");
const resultRank = document.getElementById("resultRank");
const resultDetail = document.getElementById("resultDetail");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const forwardBtn = document.getElementById("forwardBtn");

const MAZE_SIZE = 13;
const TIME_LIMIT = 60;

const DIRS = [
  { name: "NORTH", dx: 0, dy: -1 },
  { name: "EAST", dx: 1, dy: 0 },
  { name: "SOUTH", dx: 0, dy: 1 },
  { name: "WEST", dx: -1, dy: 0 },
];

let maze = [];
let player = { x: 1, y: 1, dir: 1 };
let exit = { x: MAZE_SIZE - 2, y: MAZE_SIZE - 2 };

let timeLeft = TIME_LIMIT;
let steps = 0;
let gameTimer = null;
let gameOver = false;
let audioCtx = null;
let masterGain = null;

function showScreen(screen) {
  titleScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function generateMaze(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));

  function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function carve(x, y) {
    grid[y][x] = 0;

    const dirs = shuffle([
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ]);

    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;

      if (nx <= 0 || ny <= 0 || nx >= size - 1 || ny >= size - 1) continue;
      if (grid[ny][nx] === 0) continue;

      grid[y + d.dy / 2][x + d.dx / 2] = 0;
      carve(nx, ny);
    }
  }

  carve(1, 1);

  grid[size - 2][size - 2] = 0;
  grid[size - 2][size - 1] = 0;

  return grid;
}

function resetGame() {
  maze = generateMaze(MAZE_SIZE);
  player = { x: 1, y: 1, dir: 1 };
  exit = { x: MAZE_SIZE - 1, y: MAZE_SIZE - 2 };
  timeLeft = TIME_LIMIT;
  steps = 0;
  gameOver = false;

  timeText.textContent = timeLeft;
  stepText.textContent = steps;
  depthText.textContent = "B1F";
  message.textContent = "石の匂いがする……";

  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    if (gameOver) return;

    timeLeft -= 1;
    timeText.textContent = timeLeft;

    if (timeLeft <= 10) {
      message.textContent = "迷宮が閉じようとしている……";
    }

    if (timeLeft <= 0) {
      finish(false);
    }

    render();
  }, 1000);

  showScreen(gameScreen);
  startAmbient();
  render();
}

function startAmbient() {
  if (audioCtx) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.035;
    masterGain.connect(audioCtx.destination);

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();

    osc1.type = "sawtooth";
    osc2.type = "sine";
    osc1.frequency.value = 58;
    osc2.frequency.value = 92;

    filter.type = "lowpass";
    filter.frequency.value = 360;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);

    osc1.start();
    osc2.start();
  } catch (e) {
    audioCtx = null;
  }
}

function playStepSound(ok = true) {
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = ok ? "square" : "sawtooth";
  osc.frequency.setValueAtTime(ok ? 130 : 70, now);
  osc.frequency.exponentialRampToValueAtTime(ok ? 65 : 38, now + 0.08);

  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.11);
}

function isWall(x, y) {
  if (x < 0 || y < 0 || x >= MAZE_SIZE || y >= MAZE_SIZE) return true;
  return maze[y][x] === 1;
}

function isExit(x, y) {
  return x === exit.x && y === exit.y;
}

function turnLeft() {
  if (gameOver) return;
  player.dir = (player.dir + 3) % 4;
  message.textContent = "向きを変えた。";
  playStepSound(true);
  render();
}

function turnRight() {
  if (gameOver) return;
  player.dir = (player.dir + 1) % 4;
  message.textContent = "向きを変えた。";
  playStepSound(true);
  render();
}

function moveForward() {
  if (gameOver) return;

  const d = DIRS[player.dir];
  const nx = player.x + d.dx;
  const ny = player.y + d.dy;

  if (isWall(nx, ny)) {
    message.textContent = "壁だ。冷たい石が行く手を塞ぐ。";
    playStepSound(false);
    renderShake();
    return;
  }

  player.x = nx;
  player.y = ny;
  steps += 1;
  stepText.textContent = steps;

  playStepSound(true);

  if (isExit(player.x, player.y)) {
    finish(true);
    return;
  }

  const dist = Math.abs(player.x - exit.x) + Math.abs(player.y - exit.y);
  if (dist <= 3) {
    message.textContent = "出口の光が近い。";
  } else if (Math.random() < 0.25) {
    const lines = [
      "遠くで水滴の音がした。",
      "壁に古い傷跡がある。",
      "背後から風が吹いた気がする。",
      "どこかで扉が閉まる音がした。",
    ];
    message.textContent = lines[Math.floor(Math.random() * lines.length)];
  } else {
    message.textContent = "前へ進んだ。";
  }

  render();
}

function finish(success) {
  gameOver = true;
  clearInterval(gameTimer);

  if (success) {
    const remain = timeLeft;
    resultTitle.textContent = "脱出成功";

    let rank = "";
    if (remain >= 45) rank = "迷宮を作った側の人";
    else if (remain >= 30) rank = "出口に愛された人";
    else if (remain >= 15) rank = "普通に脱出した人";
    else rank = "なんか出られた人";

    resultRank.textContent = rank;
    resultDetail.textContent = `残り${remain}秒、${steps}歩で脱出しました。`;
  } else {
    resultTitle.textContent = "迷宮閉鎖";
    resultRank.textContent = "まだ迷路にいる人";
    resultDetail.textContent = `${steps}歩進みましたが、出口には届きませんでした。`;
  }

  showScreen(resultScreen);
}

function renderShake() {
  const original = viewCanvas.style.transform;
  viewCanvas.style.transform = "translateX(-4px)";
  setTimeout(() => {
    viewCanvas.style.transform = "translateX(4px)";
  }, 40);
  setTimeout(() => {
    viewCanvas.style.transform = original;
  }, 90);
  render();
}

function rotateOffset(forward, side) {
  const d = DIRS[player.dir];
  const right = DIRS[(player.dir + 1) % 4];

  return {
    x: player.x + d.dx * forward + right.dx * side,
    y: player.y + d.dy * forward + right.dy * side,
  };
}

function cellAt(forward, side = 0) {
  const p = rotateOffset(forward, side);
  if (isExit(p.x, p.y)) return 2;
  return isWall(p.x, p.y) ? 1 : 0;
}

function render() {
  renderView();
  renderMap();
  updateHudText();
}

function updateHudText() {
  facingText.textContent = DIRS[player.dir].name;

  const dist = Math.abs(player.x - exit.x) + Math.abs(player.y - exit.y);
  if (dist <= 2) {
    hintText.textContent = "出口の光がすぐ近くにある";
  } else if (dist <= 5) {
    hintText.textContent = "空気が少し軽い";
  } else {
    hintText.textContent = "まだ深い迷宮の中";
  }
}

function renderView() {
  const w = viewCanvas.width;
  const h = viewCanvas.height;

  viewCtx.clearRect(0, 0, w, h);

  drawBackground(w, h);

  const layers = [
    { z: 5, rect: [276, 266, 444, 454], alpha: 0.34 },
    { z: 4, rect: [232, 226, 488, 500], alpha: 0.46 },
    { z: 3, rect: [180, 176, 540, 560], alpha: 0.58 },
    { z: 2, rect: [116, 112, 604, 632], alpha: 0.74 },
    { z: 1, rect: [40, 44, 680, 704], alpha: 0.95 },
  ];

  for (const layer of layers) {
    drawLayer(layer);
  }

  drawVignette(w, h);
}

function drawBackground(w, h) {
  const g = viewCtx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#070706");
  g.addColorStop(0.5, "#11100e");
  g.addColorStop(1, "#050403");
  viewCtx.fillStyle = g;
  viewCtx.fillRect(0, 0, w, h);

  viewCtx.fillStyle = "#18130d";
  viewCtx.fillRect(0, h * 0.51, w, h * 0.49);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    viewCtx.fillStyle = `rgba(188, 158, 92, ${Math.random() * 0.035})`;
    viewCtx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
}

function drawLayer(layer) {
  const [l, t, r, b] = layer.rect;
  const depth = layer.z;

  const front = cellAt(depth, 0);
  const left = cellAt(depth - 1, -1);
  const right = cellAt(depth - 1, 1);

  const prevRect = getLayerRect(depth - 1);
  const nextRect = getLayerRect(depth);

  if (left === 1) {
    drawSideWall(prevRect, nextRect, "left", layer.alpha);
  }

  if (right === 1) {
    drawSideWall(prevRect, nextRect, "right", layer.alpha);
  }

  if (front === 1) {
    drawFrontWall(l, t, r, b, layer.alpha, false);
  }

  if (front === 2) {
    drawExit(l, t, r, b, layer.alpha);
  }

  if (front === 0) {
    drawCorridorFrame(l, t, r, b, layer.alpha);
  }
}

function getLayerRect(depth) {
  const rects = {
    0: [0, 0, 720, 720],
    1: [40, 44, 680, 704],
    2: [116, 112, 604, 632],
    3: [180, 176, 540, 560],
    4: [232, 226, 488, 500],
    5: [276, 266, 444, 454],
  };

  return rects[Math.max(0, Math.min(5, depth))];
}

function drawCorridorFrame(l, t, r, b, alpha) {
  viewCtx.strokeStyle = `rgba(178, 145, 78, ${alpha * 0.35})`;
  viewCtx.lineWidth = 2;
  viewCtx.strokeRect(l, t, r - l, b - t);
}

function drawFrontWall(l, t, r, b, alpha, isNear) {
  const g = viewCtx.createLinearGradient(l, t, r, b);
  g.addColorStop(0, `rgba(34, 29, 23, ${alpha})`);
  g.addColorStop(0.5, `rgba(65, 57, 45, ${alpha})`);
  g.addColorStop(1, `rgba(20, 17, 13, ${alpha})`);

  viewCtx.fillStyle = g;
  viewCtx.fillRect(l, t, r - l, b - t);

  drawStonePattern(l, t, r, b, alpha);

  viewCtx.strokeStyle = `rgba(214, 181, 107, ${alpha * 0.45})`;
  viewCtx.lineWidth = isNear ? 5 : 3;
  viewCtx.strokeRect(l, t, r - l, b - t);
}

function drawExit(l, t, r, b, alpha) {
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;
  const width = (r - l) * 0.48;
  const height = (b - t) * 0.7;

  drawFrontWall(l, t, r, b, alpha * 0.75, false);

  const glow = viewCtx.createRadialGradient(cx, cy, 5, cx, cy, width);
  glow.addColorStop(0, `rgba(255, 225, 137, ${0.9 * alpha})`);
  glow.addColorStop(0.35, `rgba(230, 158, 60, ${0.4 * alpha})`);
  glow.addColorStop(1, "rgba(230, 158, 60, 0)");

  viewCtx.fillStyle = glow;
  viewCtx.fillRect(l, t, r - l, b - t);

  viewCtx.fillStyle = `rgba(245, 214, 140, ${0.95 * alpha})`;
  viewCtx.fillRect(cx - width / 2, cy - height / 2, width, height);

  viewCtx.fillStyle = `rgba(255, 246, 198, ${0.9 * alpha})`;
  viewCtx.fillRect(cx - width / 4, cy - height / 2, width / 2, height);
}

function drawSideWall(prevRect, nextRect, side, alpha) {
  const [pl, pt, pr, pb] = prevRect;
  const [nl, nt, nr, nb] = nextRect;

  viewCtx.beginPath();

  if (side === "left") {
    viewCtx.moveTo(pl, pt);
    viewCtx.lineTo(nl, nt);
    viewCtx.lineTo(nl, nb);
    viewCtx.lineTo(pl, pb);
  } else {
    viewCtx.moveTo(pr, pt);
    viewCtx.lineTo(nr, nt);
    viewCtx.lineTo(nr, nb);
    viewCtx.lineTo(pr, pb);
  }

  viewCtx.closePath();

  const g = viewCtx.createLinearGradient(side === "left" ? pl : pr, pt, side === "left" ? nl : nr, pb);
  g.addColorStop(0, `rgba(21, 18, 14, ${alpha})`);
  g.addColorStop(0.55, `rgba(52, 45, 35, ${alpha})`);
  g.addColorStop(1, `rgba(12, 10, 8, ${alpha})`);

  viewCtx.fillStyle = g;
  viewCtx.fill();

  viewCtx.strokeStyle = `rgba(188, 153, 82, ${alpha * 0.28})`;
  viewCtx.lineWidth = 2;
  viewCtx.stroke();
}

function drawStonePattern(l, t, r, b, alpha) {
  const width = r - l;
  const height = b - t;
  const rows = Math.max(3, Math.floor(height / 42));
  const cols = Math.max(3, Math.floor(width / 68));

  viewCtx.strokeStyle = `rgba(9, 8, 7, ${0.65 * alpha})`;
  viewCtx.lineWidth = 2;

  for (let y = 1; y < rows; y++) {
    const yy = t + (height / rows) * y;
    viewCtx.beginPath();
    viewCtx.moveTo(l, yy);
    viewCtx.lineTo(r, yy);
    viewCtx.stroke();
  }

  for (let y = 0; y < rows; y++) {
    const offset = y % 2 === 0 ? 0 : width / cols / 2;
    for (let x = 1; x < cols; x++) {
      const xx = l + (width / cols) * x + offset;
      const y1 = t + (height / rows) * y;
      const y2 = t + (height / rows) * (y + 1);
      viewCtx.beginPath();
      viewCtx.moveTo(xx, y1);
      viewCtx.lineTo(xx, y2);
      viewCtx.stroke();
    }
  }
}

function drawVignette(w, h) {
  const g = viewCtx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, 520);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.62, "rgba(0,0,0,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0.76)");

  viewCtx.fillStyle = g;
  viewCtx.fillRect(0, 0, w, h);

  viewCtx.strokeStyle = "rgba(234, 194, 101, 0.35)";
  viewCtx.lineWidth = 8;
  viewCtx.strokeRect(8, 8, w - 16, h - 16);
}

function renderMap() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const cell = w / MAZE_SIZE;

  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = "#060504";
  mapCtx.fillRect(0, 0, w, h);

  const radius = 4;

  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      const visible = Math.abs(x - player.x) + Math.abs(y - player.y) <= radius;
      if (!visible) continue;

      if (maze[y][x] === 1) {
        mapCtx.fillStyle = "rgba(113, 91, 50, 0.72)";
      } else {
        mapCtx.fillStyle = "rgba(34, 28, 19, 0.9)";
      }

      mapCtx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }

  mapCtx.fillStyle = "rgba(255, 218, 125, 0.95)";
  mapCtx.fillRect(exit.x * cell, exit.y * cell, cell - 1, cell - 1);

  mapCtx.fillStyle = "#f1dfb4";
  mapCtx.beginPath();
  mapCtx.arc(player.x * cell + cell / 2, player.y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2);
  mapCtx.fill();

  const d = DIRS[player.dir];
  mapCtx.strokeStyle = "#f1dfb4";
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.moveTo(player.x * cell + cell / 2, player.y * cell + cell / 2);
  mapCtx.lineTo(
    player.x * cell + cell / 2 + d.dx * cell * 0.55,
    player.y * cell + cell / 2 + d.dy * cell * 0.55
  );
  mapCtx.stroke();
}

startBtn.addEventListener("click", resetGame);
retryBtn.addEventListener("click", resetGame);

leftBtn.addEventListener("click", turnLeft);
rightBtn.addEventListener("click", turnRight);
forwardBtn.addEventListener("click", moveForward);

window.addEventListener("keydown", (e) => {
  if (gameScreen.classList.contains("hidden")) return;

  if (e.key === "ArrowLeft" || e.key === "a") turnLeft();
  if (e.key === "ArrowRight" || e.key === "d") turnRight();
  if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") moveForward();
});

window.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, { passive: false });

showScreen(titleScreen);