const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const shieldEl = document.getElementById("shield");
const messageEl = document.getElementById("message");

const startScreen = document.getElementById("startScreen");
const resultScreen = document.getElementById("resultScreen");
const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const rankTitle = document.getElementById("rankTitle");
const resultText = document.getElementById("resultText");

const GAME_TIME = 30;
const MAX_SHIELD = 100;

let width = 0;
let height = 0;
let dpr = 1;
let isMobile = false;

let state = "ready";
let score = 0;
let shield = MAX_SHIELD;
let timeLeft = GAME_TIME;
let lastTime = 0;
let spawnTimer = 0;
let obstacleTimer = 0;
let messageTimer = 0;

let pointer = {
  x: 0,
  y: 0,
};

let stars = [];
let enemies = [];
let bullets = [];
let explosions = [];
let obstacles = [];

let audioReady = false;
let bgm = null;
let audioCtx = null;
let shotOscillatorSupported = true;

function setupAudio() {
  if (audioReady) return;

  bgm = new Audio(asset("./assets/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = 0.5;

  bgm.play().catch(() => {
    // BGM未配置または自動再生制限の場合は無視
  });

  audioReady = true;
}

function beep(type = "shot") {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "shot") {
      osc.frequency.setValueAtTime(920, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, audioCtx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
      osc.type = "square";
      osc.start();
      osc.stop(audioCtx.currentTime + 0.07);
    }

    if (type === "hit") {
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, audioCtx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.type = "sawtooth";
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    }

    if (type === "damage") {
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      osc.frequency.setValueAtTime(90, audioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
      osc.type = "triangle";
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    }
  } catch (e) {
    shotOscillatorSupported = false;
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  isMobile = width < 768;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  pointer.x = width / 2;
  pointer.y = height * 0.58;
}

function resetGame() {
  score = 0;
  shield = MAX_SHIELD;
  timeLeft = GAME_TIME;
  lastTime = performance.now();
  spawnTimer = 0.15;
  obstacleTimer = 1.1;
  messageTimer = 0;

  stars = createStars(isMobile ? 90 : 130);
  enemies = [];
  bullets = [];
  explosions = [];
  obstacles = [];

  pointer.x = width / 2;
  pointer.y = height * 0.58;

  for (let i = 0; i < 2; i++) {
    spawnEnemy(0.7 + i * 0.18);
  }

  updateHud();
}

function startGame() {
  setupAudio();
  resetGame();
  state = "playing";
  startScreen.classList.add("screen--hidden");
  resultScreen.classList.add("screen--hidden");
  showMessage("LOCK ON");
}

function finishGame() {
  if (state === "result") return;
  state = "result";

  const rank = getRank(score, shield);
  rankTitle.textContent = rank.title;
  resultText.innerHTML = `
    SCORE：${String(score).padStart(6, "0")}<br>
    SHIELD：${Math.max(0, Math.round(shield))}<br>
    ${rank.text}
  `;

  resultScreen.classList.remove("screen--hidden");
}

function getRank(finalScore, finalShield) {
  if (finalScore >= 9000 && finalShield >= 50) {
    return {
      title: "初期3Dを理解した者",
      text: "粗い線だけで銀河を見た。完全に適性があります。",
    };
  }

  if (finalScore >= 6500) {
    return {
      title: "銀河の松村",
      text: "だいたい全部撃ち落としました。かなり宇宙です。",
    };
  }

  if (finalScore >= 4200) {
    return {
      title: "ワイヤーフレームの希望",
      text: "線だけの世界ではかなり戦えていました。",
    };
  }

  if (finalScore >= 2200) {
    return {
      title: "だいたい宇宙にいる人",
      text: "宇宙にはいました。戦闘はこれからです。",
    };
  }

  return {
    title: "見習いパイロット",
    text: "まずは照準を中央に戻すところから始めましょう。",
  };
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: random(-1.2, 1.2),
    y: random(-0.8, 0.8),
    z: random(0.08, 1),
    speed: random(0.22, 0.82),
  }));
}

function spawnEnemy(z = 1.05) {
  const size = random(0.07, 0.115);
  enemies.push({
    x: random(-0.62, 0.62),
    y: random(-0.36, 0.34),
    z,
    size,
    rot: random(0, Math.PI * 2),
    rotSpeed: random(-2.4, 2.4),
    speed: random(0.2, 0.32),
    wobble: random(0, Math.PI * 2),
  });
}

function spawnObstacle() {
  obstacles.push({
    x: random(-0.72, 0.72),
    y: random(-0.42, 0.42),
    z: 1.08,
    size: random(0.08, 0.14),
    speed: random(0.22, 0.36),
    rot: random(0, Math.PI * 2),
    rotSpeed: random(-1.5, 1.5),
  });
}

function shoot(x = pointer.x, y = pointer.y) {
  if (state !== "playing") return;

  pointer.x = clamp(x, 14, width - 14);
  pointer.y = clamp(y, height * 0.13, height - 20);

  bullets.push({
    x: pointer.x,
    y: pointer.y,
    life: 0.2,
    maxLife: 0.2,
  });

  if (shotOscillatorSupported) beep("shot");

  let best = null;
  let bestDist = Infinity;

  for (const enemy of enemies) {
    const p = project(enemy.x, enemy.y, enemy.z);
    const hitR = enemy.size * p.sizeScale * 1.25;
    const dist = Math.hypot(pointer.x - p.x, pointer.y - p.y);

    if (dist < hitR && dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }

  if (best) {
    score += Math.round(500 + (1.1 - best.z) * 700);
    explosions.push({
      x: best.x,
      y: best.y,
      z: best.z,
      life: 0.4,
      maxLife: 0.4,
      size: best.size,
    });

    enemies = enemies.filter((enemy) => enemy !== best);
    showMessage("ENEMY DOWN");
    if (shotOscillatorSupported) beep("hit");
  }

  updateHud();
}

function damage(amount) {
  shield -= amount;
  shield = Math.max(0, shield);
  showMessage("SHIELD LOW");
  if (shotOscillatorSupported) beep("damage");

  if (shield <= 0) {
    finishGame();
  }

  updateHud();
}

function update(dt) {
  if (state !== "playing") return;

  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    finishGame();
  }

  spawnTimer -= dt;
  obstacleTimer -= dt;
  messageTimer -= dt;

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = isMobile ? random(1.0, 1.45) : random(0.75, 1.15);
  }

  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = isMobile ? random(2.8, 4.0) : random(2.0, 3.0);
  }

  for (const star of stars) {
    star.z -= star.speed * dt;
    if (star.z <= 0.02) {
      star.x = random(-1.2, 1.2);
      star.y = random(-0.8, 0.8);
      star.z = 1;
      star.speed = random(0.22, 0.82);
    }
  }

  for (const enemy of enemies) {
    enemy.z -= enemy.speed * dt;
    enemy.rot += enemy.rotSpeed * dt;
    enemy.wobble += dt * 2.1;
    enemy.x += Math.sin(enemy.wobble) * 0.001;
  }

  enemies = enemies.filter((enemy) => {
    if (enemy.z <= 0.08) {
      damage(10);
      return false;
    }
    return true;
  });

  for (const obstacle of obstacles) {
    obstacle.z -= obstacle.speed * dt;
    obstacle.rot += obstacle.rotSpeed * dt;
  }

  obstacles = obstacles.filter((obstacle) => {
    if (obstacle.z <= 0.08) {
      damage(16);
      return false;
    }
    return true;
  });

  for (const bullet of bullets) {
    bullet.life -= dt;
  }
  bullets = bullets.filter((bullet) => bullet.life > 0);

  for (const explosion of explosions) {
    explosion.life -= dt;
  }
  explosions = explosions.filter((explosion) => explosion.life > 0);

  if (messageTimer <= 0) {
    messageEl.classList.remove("is-show");
  }

  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  drawBackgroundGrid();
  drawStars();

  const drawableObjects = [
    ...obstacles.map((item) => ({ type: "obstacle", item })),
    ...enemies.map((item) => ({ type: "enemy", item })),
    ...explosions.map((item) => ({ type: "explosion", item })),
  ].sort((a, b) => b.item.z - a.item.z);

  for (const obj of drawableObjects) {
    if (obj.type === "obstacle") drawObstacle(obj.item);
    if (obj.type === "enemy") drawEnemy(obj.item);
    if (obj.type === "explosion") drawExplosion(obj.item);
  }

  drawBullets();
  drawCrosshair();
  drawVignette();
}

function drawBackgroundGrid() {
  ctx.save();

  ctx.strokeStyle = "rgba(70, 255, 140, 0.18)";
  ctx.lineWidth = 1;

  const horizonY = height * (isMobile ? 0.46 : 0.5);
  const centerX = width / 2;

  for (let i = -9; i <= 9; i++) {
    const x = centerX + i * width * 0.095;
    ctx.beginPath();
    ctx.moveTo(centerX, horizonY);
    ctx.lineTo(x, height + 40);
    ctx.stroke();
  }

  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const y = horizonY + Math.pow(t, 2.1) * height * 0.5;
    const half = Math.pow(t, 1.28) * width * 0.78;
    ctx.beginPath();
    ctx.moveTo(centerX - half, y);
    ctx.lineTo(centerX + half, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStars() {
  ctx.save();
  ctx.fillStyle = "rgba(225, 255, 232, 0.92)";

  for (const star of stars) {
    const p = project(star.x, star.y, star.z);
    const size = Math.max(1, (1 - star.z) * 3.4);
    ctx.globalAlpha = 0.35 + (1 - star.z) * 0.65;
    ctx.fillRect(p.x, p.y, size, size);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(enemy) {
  const p = project(enemy.x, enemy.y, enemy.z);
  const s = enemy.size * p.sizeScale;
  const hitR = enemy.size * p.sizeScale * 1.25;

  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.strokeStyle = "rgba(255, 80, 80, 0.28)";
  ctx.lineWidth = 1;
  ctx.shadowColor = "rgba(255, 60, 60, 0.45)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, hitR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(enemy.rot);

  ctx.strokeStyle = "rgba(255, 70, 70, 0.96)";
  ctx.lineWidth = Math.max(1.4, s * 0.035);
  ctx.shadowColor = "rgba(255, 60, 60, 0.9)";
  ctx.shadowBlur = 10;

  const points = [
    [0, -s],
    [s * 0.86, s * 0.55],
    [s * 0.22, s * 0.3],
    [0, s * 0.95],
    [-s * 0.22, s * 0.3],
    [-s * 0.86, s * 0.55],
  ];

  drawPolygon(points, true);

  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s * 0.95);
  ctx.moveTo(-s * 0.86, s * 0.55);
  ctx.lineTo(s * 0.86, s * 0.55);
  ctx.moveTo(-s * 0.22, s * 0.3);
  ctx.lineTo(s * 0.22, s * 0.3);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obstacle) {
  const p = project(obstacle.x, obstacle.y, obstacle.z);
  const s = obstacle.size * p.sizeScale;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(obstacle.rot);

  ctx.strokeStyle = "rgba(255, 210, 80, 0.9)";
  ctx.lineWidth = Math.max(1.2, s * 0.025);
  ctx.shadowColor = "rgba(255, 180, 40, 0.8)";
  ctx.shadowBlur = 8;

  const points = [];
  const count = 7;

  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    const r = s * (0.72 + (i % 2) * 0.24);
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  drawPolygon(points, true);

  for (let i = 0; i < count; i++) {
    const [x, y] = points[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawExplosion(explosion) {
  const p = project(explosion.x, explosion.y, explosion.z);
  const progress = 1 - explosion.life / explosion.maxLife;
  const s = explosion.size * p.sizeScale * (0.5 + progress * 2.4);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = `rgba(180, 255, 200, ${1 - progress})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(120, 255, 170, 0.9)";
  ctx.shadowBlur = 16;

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, s * (0.45 + i * 0.28), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2);
    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBullets() {
  ctx.save();

  for (const bullet of bullets) {
    const progress = 1 - bullet.life / bullet.maxLife;
    const alpha = bullet.life / bullet.maxLife;

    ctx.strokeStyle = `rgba(180, 255, 210, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(140, 255, 180, 1)";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(width / 2, height * 0.9);
    ctx.lineTo(
      bullet.x + (bullet.x - width / 2) * progress * 0.08,
      bullet.y + (bullet.y - height * 0.9) * progress * 0.08
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawCrosshair() {
  const x = pointer.x;
  const y = pointer.y;
  const r = Math.min(width, height) * 0.055;

  ctx.save();
  ctx.strokeStyle = "rgba(170, 255, 200, 0.96)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(120, 255, 170, 0.9)";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - r * 1.55, y);
  ctx.lineTo(x - r * 0.55, y);
  ctx.moveTo(x + r * 0.55, y);
  ctx.lineTo(x + r * 1.55, y);
  ctx.moveTo(x, y - r * 1.55);
  ctx.lineTo(x, y - r * 0.55);
  ctx.moveTo(x, y + r * 0.55);
  ctx.lineTo(x, y + r * 1.55);
  ctx.stroke();

  ctx.fillStyle = "rgba(170, 255, 200, 0.96)";
  ctx.fillRect(x - 1, y - 1, 2, 2);

  ctx.restore();
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.58)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawPolygon(points, close = true) {
  ctx.beginPath();

  points.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  if (close) ctx.closePath();
  ctx.stroke();
}

function project(x, y, z) {
  const focal = Math.min(width, height) * (isMobile ? 1.02 : 0.86);
  const safeZ = Math.max(0.08, z);
  const scale = focal / (safeZ * 900);

  return {
    x: width / 2 + x * scale * 900,
    y: height * (isMobile ? 0.48 : 0.5) + y * scale * 900,
    scale,
    sizeScale: scale * 900,
  };
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(6, "0");
  timeEl.textContent = timeLeft.toFixed(1);
  shieldEl.textContent = String(Math.max(0, Math.round(shield))).padStart(3, "0");
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("is-show");
  messageTimer = 0.85;
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  shoot(x, y);
});

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);

resize();
resetGame();
requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(loop);
});

let lastTouchTime = 0;

document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    if (now - lastTouchTime <= 320) {
      event.preventDefault();
    }
    lastTouchTime = now;
  },
  { passive: false }
);

document.addEventListener(
  "dblclick",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);
