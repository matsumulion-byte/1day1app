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
let exit = { x: MAZE_SIZE - 1, y: MAZE_SIZE - 2 };

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
  message.textContent = "石造りの迷宮に入った。";

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

    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = 62;

    filter.type = "lowpass";
    filter.frequency.value = 360;

    osc.connect(filter);
    filter.connect(masterGain);
    osc.start();
  } catch (e) {
    audioCtx = null;
  }
}

function playStepSound(ok = true) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = ok ? "triangle" : "sawtooth";
  osc.frequency.setValueAtTime(ok ? 130 : 70, now);
  osc.frequency.exponentialRampToValueAtTime(ok ? 72 : 42, now + 0.08);

  gain.gain.setValueAtTime(ok ? 0.07 : 0.11, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
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
  message.textContent = "左を向いた。";
  playStepSound(true);
  render();
}

function turnRight() {
  if (gameOver) return;
  player.dir = (player.dir + 1) % 4;
  message.textContent = "右を向いた。";
  playStepSound(true);
  render();
}

function moveForward() {
  if (gameOver) return;

  const d = DIRS[player.dir];
  const nx = player.x + d.dx;
  const ny = player.y + d.dy;

  if (isWall(nx, ny)) {
    message.textContent = "壁だ。これ以上は進めない。";
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
      "湿った空気が流れている。",
      "遠くで水滴の音がした。",
      "壁に古い傷がある。",
      "通路の奥がかすかに光った。",
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
  viewCanvas.style.transform = "translateX(-5px)";
  setTimeout(() => {
    viewCanvas.style.transform = "translateX(5px)";
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
    hintText.textContent = "少し空気が軽い";
  } else {
    hintText.textContent = "まだ迷宮の奥にいる";
  }
}

function renderView() {
  const w = viewCanvas.width;
  const h = viewCanvas.height;

  viewCtx.clearRect(0, 0, w, h);

  drawBackground(w, h);

  const layers = [
    { depth: 5, rect: [292, 282, 428, 438], alpha: 0.38 },
    { depth: 4, rect: [252, 238, 468, 490], alpha: 0.48 },
    { depth: 3, rect: [198, 184, 522, 554], alpha: 0.62 },
    { depth: 2, rect: [126, 112, 594, 638], alpha: 0.78 },
    { depth: 1, rect: [34, 36, 686, 706], alpha: 1.0 },
  ];

  /*
    奥から手前へ描画。
    ただし「空間の四角枠」は描かず、壁がある場所だけ描く。
  */
  for (const layer of layers) {
    drawDepthLayer(layer);
  }

  drawVignette(w, h);
}

function drawBackground(w, h) {
  // 天井
  const ceiling = viewCtx.createLinearGradient(0, 0, 0, h * 0.5);
  ceiling.addColorStop(0, "#17120d");
  ceiling.addColorStop(1, "#2a2117");
  viewCtx.fillStyle = ceiling;
  viewCtx.fillRect(0, 0, w, h * 0.5);

  // 床
  const floor = viewCtx.createLinearGradient(0, h * 0.5, 0, h);
  floor.addColorStop(0, "#302619");
  floor.addColorStop(1, "#100c08");
  viewCtx.fillStyle = floor;
  viewCtx.fillRect(0, h * 0.5, w, h * 0.5);

  // 奥行き線はかなり薄くする
  viewCtx.strokeStyle = "rgba(230, 190, 105, 0.08)";
  viewCtx.lineWidth = 1;

  viewCtx.beginPath();
  viewCtx.moveTo(0, h);
  viewCtx.lineTo(w / 2, h / 2);
  viewCtx.lineTo(w, h);
  viewCtx.stroke();

  viewCtx.beginPath();
  viewCtx.moveTo(0, 0);
  viewCtx.lineTo(w / 2, h / 2);
  viewCtx.lineTo(w, 0);
  viewCtx.stroke();
}

function drawDepthLayer(layer) {
  const { depth, rect, alpha } = layer;
  const [l, t, r, b] = rect;

  const front = cellAt(depth, 0);
  const left = cellAt(depth - 1, -1);
  const right = cellAt(depth - 1, 1);

  const prevRect = getLayerRect(depth - 1);
  const currentRect = getLayerRect(depth);

  // 左右の壁だけを面で描く
  if (left === 1) {
    drawSideWall(prevRect, currentRect, "left", alpha);
  }

  if (right === 1) {
    drawSideWall(prevRect, currentRect, "right", alpha);
  }

  // 正面に壁がある場合は、そこで視界を止める
  if (front === 1) {
    drawFrontWall(l, t, r, b, alpha);
    return;
  }

  if (front === 2) {
    drawExit(l, t, r, b, alpha);
    return;
  }

  // 前が開いている場合だけ、かなり薄い奥行きガイドを出す
  drawSubtleDepthGuide(l, t, r, b, alpha);
}

function getLayerRect(depth) {
  const rects = {
    0: [-40, -20, 760, 760],
    1: [34, 36, 686, 706],
    2: [126, 112, 594, 638],
    3: [198, 184, 522, 554],
    4: [252, 238, 468, 490],
    5: [292, 282, 428, 438],
  };

  return rects[Math.max(0, Math.min(5, depth))];
}

function drawOpenFrame(l, t, r, b, alpha) {
  viewCtx.strokeStyle = `rgba(236, 196, 112, ${alpha * 0.48})`;
  viewCtx.lineWidth = Math.max(2, 6 * alpha);
  viewCtx.strokeRect(l, t, r - l, b - t);
  // 通路の奥を少し明るくする
  viewCtx.fillStyle = `rgba(222, 177, 94, ${alpha * 0.035})`;
  viewCtx.fillRect(l, t, r - l, b - t);
}

function drawSubtleDepthGuide(l, t, r, b, alpha) {
  // 空間の枠線ではなく、通路の奥行きを薄く示すだけ
  viewCtx.strokeStyle = `rgba(236, 196, 112, ${alpha * 0.16})`;
  viewCtx.lineWidth = 1.5;

  // 上辺・下辺だけ薄く出す。四角で囲まない。
  viewCtx.beginPath();
  viewCtx.moveTo(l, t);
  viewCtx.lineTo(r, t);
  viewCtx.moveTo(l, b);
  viewCtx.lineTo(r, b);
  viewCtx.stroke();
}

function drawFrontWall(l, t, r, b, alpha) {
  const g = viewCtx.createLinearGradient(l, t, r, b);
  g.addColorStop(0, `rgba(64, 54, 40, ${alpha})`);
  g.addColorStop(0.5, `rgba(104, 88, 63, ${alpha})`);
  g.addColorStop(1, `rgba(39, 32, 24, ${alpha})`);

  viewCtx.fillStyle = g;
  viewCtx.fillRect(l, t, r - l, b - t);

  // 石の模様は控えめにする
  viewCtx.strokeStyle = `rgba(19, 15, 11, ${alpha * 0.42})`;
  viewCtx.lineWidth = 2;

  const rows = 4;
  const cols = 4;
  const width = r - l;
  const height = b - t;

  for (let y = 1; y < rows; y++) {
    const yy = t + (height / rows) * y;
    viewCtx.beginPath();
    viewCtx.moveTo(l, yy);
    viewCtx.lineTo(r, yy);
    viewCtx.stroke();
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 1; x < cols; x++) {
      const xx = l + (width / cols) * x + (y % 2 ? width / cols / 2 : 0);
      const y1 = t + (height / rows) * y;
      const y2 = t + (height / rows) * (y + 1);

      viewCtx.beginPath();
      viewCtx.moveTo(xx, y1);
      viewCtx.lineTo(xx, y2);
      viewCtx.stroke();
    }
  }

  viewCtx.strokeStyle = `rgba(250, 212, 129, ${alpha * 0.65})`;
  viewCtx.lineWidth = 4;
  viewCtx.strokeRect(l, t, r - l, b - t);
}

function drawSideWall(prevRect, currentRect, side, alpha) {
  const [pl, pt, pr, pb] = prevRect;
  const [cl, ct, cr, cb] = currentRect;

  viewCtx.beginPath();

  if (side === "left") {
    viewCtx.moveTo(pl, pt);
    viewCtx.lineTo(cl, ct);
    viewCtx.lineTo(cl, cb);
    viewCtx.lineTo(pl, pb);
  } else {
    viewCtx.moveTo(pr, pt);
    viewCtx.lineTo(cr, ct);
    viewCtx.lineTo(cr, cb);
    viewCtx.lineTo(pr, pb);
  }

  viewCtx.closePath();

  const g = viewCtx.createLinearGradient(
    side === "left" ? pl : pr,
    pt,
    side === "left" ? cl : cr,
    cb
  );

  g.addColorStop(0, `rgba(40, 32, 23, ${alpha})`);
  g.addColorStop(0.55, `rgba(82, 68, 47, ${alpha})`);
  g.addColorStop(1, `rgba(25, 20, 15, ${alpha})`);

  viewCtx.fillStyle = g;
  viewCtx.fill();

  viewCtx.strokeStyle = `rgba(236, 196, 112, ${alpha * 0.38})`;
  viewCtx.lineWidth = 3;
  viewCtx.stroke();
}

function drawExit(l, t, r, b, alpha) {
  drawFrontWall(l, t, r, b, alpha * 0.75);

  const cx = (l + r) / 2;
  const cy = (t + b) / 2;
  const width = (r - l) * 0.5;
  const height = (b - t) * 0.72;

  const glow = viewCtx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(width, height));
  glow.addColorStop(0, `rgba(255, 240, 170, ${alpha})`);
  glow.addColorStop(0.35, `rgba(255, 191, 80, ${alpha * 0.62})`);
  glow.addColorStop(1, "rgba(255, 191, 80, 0)");

  viewCtx.fillStyle = glow;
  viewCtx.fillRect(l, t, r - l, b - t);

  viewCtx.fillStyle = `rgba(255, 229, 140, ${alpha})`;
  viewCtx.fillRect(cx - width / 2, cy - height / 2, width, height);

  viewCtx.fillStyle = `rgba(255, 251, 214, ${alpha})`;
  viewCtx.fillRect(cx - width / 5, cy - height / 2, width / 2.5, height);
}

function drawDirectionGuide() {
  // 進行方向をわかりやすくする床の矢印
  viewCtx.fillStyle = "rgba(245, 207, 125, 0.22)";
  viewCtx.beginPath();
  viewCtx.moveTo(360, 455);
  viewCtx.lineTo(328, 525);
  viewCtx.lineTo(350, 518);
  viewCtx.lineTo(350, 612);
  viewCtx.lineTo(370, 612);
  viewCtx.lineTo(370, 518);
  viewCtx.lineTo(392, 525);
  viewCtx.closePath();
  viewCtx.fill();
}

function drawVignette(w, h) {
  const g = viewCtx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, 520);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.72, "rgba(0,0,0,0.16)");
  g.addColorStop(1, "rgba(0,0,0,0.56)");

  viewCtx.fillStyle = g;
  viewCtx.fillRect(0, 0, w, h);

  viewCtx.strokeStyle = "rgba(244, 207, 121, 0.5)";
  viewCtx.lineWidth = 8;
  viewCtx.strokeRect(8, 8, w - 16, h - 16);
}

function renderMap() {
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const cell = w / MAZE_SIZE;

  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = "#050403";
  mapCtx.fillRect(0, 0, w, h);

  const radius = 5;

  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      const visible = Math.abs(x - player.x) + Math.abs(y - player.y) <= radius;
      if (!visible) continue;

      if (maze[y][x] === 1) {
        mapCtx.fillStyle = "rgba(150, 120, 66, 0.9)";
      } else {
        mapCtx.fillStyle = "rgba(44, 36, 24, 1)";
      }

      mapCtx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }

  mapCtx.fillStyle = "rgba(255, 230, 120, 1)";
  mapCtx.fillRect(exit.x * cell, exit.y * cell, cell - 1, cell - 1);

  mapCtx.fillStyle = "#ffffff";
  mapCtx.beginPath();
  mapCtx.arc(player.x * cell + cell / 2, player.y * cell + cell / 2, cell * 0.4, 0, Math.PI * 2);
  mapCtx.fill();

  const d = DIRS[player.dir];
  mapCtx.strokeStyle = "#ffffff";
  mapCtx.lineWidth = 3;
  mapCtx.beginPath();
  mapCtx.moveTo(player.x * cell + cell / 2, player.y * cell + cell / 2);
  mapCtx.lineTo(
    player.x * cell + cell / 2 + d.dx * cell * 0.65,
    player.y * cell + cell / 2 + d.dy * cell * 0.65
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