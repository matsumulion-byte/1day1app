const asset = (p) => new URL(p, import.meta.url).toString();
const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.55;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const touchArea = document.getElementById("touchArea");
const holdText = document.getElementById("holdText");

const heightText = document.getElementById("heightText");
const windText = document.getElementById("windText");
const resultLabel = document.getElementById("resultLabel");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const heightResult = document.getElementById("heightResult");

const GAME_HEIGHT = 4300;
const CLEAR_HEIGHT = 3850;

let W = 0;
let H = 0;
let dpr = 1;

let state = "ready";
let lastTime = 0;
let animationId = null;

let player;
let cameraY;
let maxHeight;
let windCount;
let combo;
let score;
let bestCombo;
let tapCooldown;
let hitCooldown;
let clearTimer;
let flash;
let shake;
let message;
let messageTimer;

let winds = [];
let obstacles = [];
let clouds = [];
let stars = [];
let particles = [];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  const isPc = window.matchMedia("(min-width: 700px)").matches;
  W = isPc ? Math.min(430, window.innerWidth) : window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function worldY(y) {
  return y - cameraY;
}

function initReadyScreen() {
  player = {
    x: W * 0.5,
    y: GAME_HEIGHT - 150,
    vx: 105,
    vy: 0,
    r: 26,
    angle: 0,
  };

  cameraY = GAME_HEIGHT - H;
  maxHeight = 0;
  windCount = 0;
  combo = 0;
  score = 0;
  bestCombo = 0;
  tapCooldown = 0;
  hitCooldown = 0;
  clearTimer = 0;
  flash = 0;
  shake = 0;
  message = "";
  messageTimer = 0;

  winds = [];
  obstacles = [];
  clouds = [];
  stars = [];
  particles = [];

  createStage();
  updateHud();

  state = "ready";
  startPanel.classList.remove("hidden");
  resultPanel.classList.add("hidden");
  touchArea.classList.add("hidden");

  draw();
}

function resetGame() {
  player = {
    x: W * 0.5,
    y: GAME_HEIGHT - 150,
    vx: 105,
    vy: 0,
    r: 26,
    angle: 0,
  };

  cameraY = GAME_HEIGHT - H;
  maxHeight = 0;
  windCount = 0;
  combo = 0;
  score = 0;
  bestCombo = 0;
  tapCooldown = 0;
  hitCooldown = 0;
  clearTimer = 0;
  flash = 0;
  shake = 0;
  message = "";
  messageTimer = 0;

  winds = [];
  obstacles = [];
  clouds = [];
  stars = [];
  particles = [];

  createStage();
  updateHud();

  startPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  touchArea.classList.remove("hidden");
  touchArea.classList.remove("active");
  holdText.textContent = "タップで跳ねる";
}

function createStage() {
  let lastX = W * 0.5;

  for (let y = GAME_HEIGHT - 420; y > 360; y -= rand(250, 330)) {
    const nextX = clamp(lastX + rand(-120, 120), 82, W - 82);
    winds.push({
      x: nextX,
      y,
      rx: rand(62, 78),
      ry: rand(34, 42),
      used: false,
      phase: rand(0, Math.PI * 2),
    });
    lastX = nextX;
  }

  for (let y = GAME_HEIGHT - 700; y > 600; y -= rand(360, 520)) {
    const type = Math.random() < 0.5 ? "wire" : "bird";

    if (type === "wire") {
      const gapX = rand(95, W - 95);
      obstacles.push({
        type,
        y,
        gapX,
        gapW: rand(115, 145),
      });
    } else {
      obstacles.push({
        type,
        x: rand(60, W - 60),
        y,
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  for (let i = 0; i < 44; i++) {
    clouds.push({
      x: rand(-50, W + 50),
      y: rand(0, GAME_HEIGHT),
      s: rand(0.5, 1.35),
      a: rand(0.2, 0.62),
    });
  }

  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rand(0, W),
      y: rand(0, 1300),
      s: rand(1, 2.5),
      a: rand(0.25, 0.9),
    });
  }
}

function startGame() {
  resetGame();
  state = "playing";
  lastTime = performance.now();

  bgm.currentTime = 0;
  bgm.play().catch(() => {});

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  update(dt);
  draw();

  animationId = requestAnimationFrame(loop);
}

function update(dt) {
  if (state !== "playing" && state !== "clear") return;

  if (tapCooldown > 0) tapCooldown -= dt;
  if (hitCooldown > 0) hitCooldown -= dt;
  if (messageTimer > 0) messageTimer -= dt;
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt * 1.4;

  updateParticles(dt);

  if (state === "playing") {
    const gravity = 760;
    player.vy += gravity * dt;
    player.vy = clamp(player.vy, -680, 640);

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < 36) {
      player.x = 36;
      player.vx = Math.abs(player.vx);
    }

    if (player.x > W - 36) {
      player.x = W - 36;
      player.vx = -Math.abs(player.vx);
    }

    const sway = Math.sin(performance.now() * 0.003) * 18;
    player.x += sway * dt;

    const currentHeight = clamp(GAME_HEIGHT - player.y - 90, 0, GAME_HEIGHT);
    maxHeight = Math.max(maxHeight, currentHeight);

    checkWindRings();
    checkObstacles();

    const targetCameraY = clamp(player.y - H * 0.58, 0, GAME_HEIGHT - H);
    cameraY += (targetCameraY - cameraY) * 0.07;

    if (player.y > cameraY + H + 80 || player.y > GAME_HEIGHT - 65) {
      endGame(false);
    }

    if (maxHeight >= CLEAR_HEIGHT) {
      startClear();
    }
  }

  if (state === "clear") {
    clearTimer += dt;
    player.y -= 420 * dt;
    player.x += Math.sin(clearTimer * 8) * 48 * dt;

    const targetCameraY = clamp(player.y - H * 0.52, 0, GAME_HEIGHT - H);
    cameraY += (targetCameraY - cameraY) * 0.08;

    if (clearTimer > 2.5) {
      endGame(true);
    }
  }

  updateHud();
}

function tapJump() {
  if (state !== "playing") return;
  if (tapCooldown > 0) return;

  tapCooldown = 0.13;

  player.vy = Math.min(player.vy, -355);
  player.vx += player.vx > 0 ? 8 : -8;
  player.vx = clamp(player.vx, -145, 145);

  touchArea.classList.add("active");
  setTimeout(() => touchArea.classList.remove("active"), 90);

  spawnParticles(player.x, player.y + 22, 8, "#ffffff", 1.2);
}

function checkWindRings() {
  for (const wind of winds) {
    if (wind.used) continue;

    const dx = player.x - wind.x;
    const dy = player.y - wind.y;

    const hit =
      Math.abs(dx) < wind.rx &&
      Math.abs(dy) < wind.ry;

    if (!hit) continue;

    wind.used = true;
    windCount += 1;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const ringScore = 100 + Math.max(0, combo - 1) * 50;
    score += ringScore;

    const comboBonus = Math.min(combo, 6) * 38;
    player.vy = -570 - comboBonus;
    player.vx += dx < 0 ? -28 : 28;
    player.vx = clamp(player.vx, -165, 165);

    flash = 0.22;
    shake = 0.1;

    if (combo >= 3) {
      message = `${combo}連続 +${ringScore}`;
      messageTimer = 0.8;
    } else {
      message = `+${ringScore}`;
      messageTimer = 0.55;
    }

    spawnParticles(wind.x, wind.y, 26 + combo * 3, "#ffffff", 2.4);
    spawnParticles(wind.x, wind.y, 12, "#fbbf24", 2.1);
  }

  for (const wind of winds) {
    if (wind.used) continue;

    if (player.y < wind.y - wind.ry - 80) {
      wind.used = true;
      combo = 0;
      message = "風を逃した";
      messageTimer = 0.45;
      break;
    }
  }
}

function checkObstacles() {
  if (hitCooldown > 0) return;

  for (const o of obstacles) {
    if (o.type === "wire") {
      const y = o.y;
      const gapLeft = o.gapX - o.gapW * 0.5;
      const gapRight = o.gapX + o.gapW * 0.5;

      const nearY = Math.abs(player.y - y) < 18;
      const inGap = player.x > gapLeft && player.x < gapRight;

      if (nearY && !inGap) {
        damage();
        return;
      }
    }

    if (o.type === "bird") {
      const bx = o.x + Math.sin(performance.now() * 0.0025 + o.phase) * 34;
      const by = o.y + Math.sin(performance.now() * 0.003 + o.phase) * 8;
      const d = Math.hypot(player.x - bx, player.y - by);

      if (d < 34) {
        damage();
        return;
      }
    }
  }
}

function damage() {
  hitCooldown = 0.85;

  const penalty = 200;
  score = Math.max(0, score - penalty);

  combo = 0;
  player.vy = 330;
  player.vx *= -0.85;

  shake = 0.22;
  flash = 0.12;
  message = `-${penalty}`;
  messageTimer = 0.65;

  spawnParticles(player.x, player.y, 18, "#ef4444", 1.8);
}

function startClear() {
  state = "clear";
  clearTimer = 0;
  flash = 0.85;
  shake = 0.25;

  score += 1000;

  touchArea.classList.add("hidden");
  message = "登竜成功 +1000";
  messageTimer = 1.3;

  spawnParticles(player.x, player.y, 60, "#fbbf24", 3);
}

function endGame(cleared) {
  if (state === "result") return;

  bgm.pause();

  state = "result";
  touchArea.classList.add("hidden");

  const h = Math.floor(maxHeight);
  const heightBonus = Math.floor(maxHeight * 0.2);
  score += heightBonus;
  const finalScore = Math.floor(score);

  if (cleared) {
    resultLabel.textContent = "登竜成功";
    resultTitle.textContent = "空の向こうへ";
    resultText.textContent = `高度ボーナス +${heightBonus}。最高コンボは${bestCombo}連続。`;
  } else if (finalScore >= 2600) {
    resultLabel.textContent = "結果";
    resultTitle.textContent = "ほぼ空の住人";
    resultText.textContent = `かなり良い上昇。最高コンボは${bestCombo}連続。`;
  } else if (finalScore >= 1700) {
    resultLabel.textContent = "結果";
    resultTitle.textContent = "雲に触れた鯉";
    resultText.textContent = `風のリングは見えてきた。最高コンボは${bestCombo}連続。`;
  } else if (finalScore >= 900) {
    resultLabel.textContent = "結果";
    resultTitle.textContent = "町内上昇魚";
    resultText.textContent = "まずまずの上昇。障害物を避けると点が伸びる。";
  } else {
    resultLabel.textContent = "結果";
    resultTitle.textContent = "まだ庭先の鯉";
    resultText.textContent = "風リングを連続でくぐるとスコアが伸びる。";
  }

  heightResult.textContent = `${finalScore}`;

  setTimeout(() => {
    resultPanel.classList.remove("hidden");
  }, cleared ? 800 : 250);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 240 * dt;
    p.life -= dt;
  }

  particles = particles.filter((p) => p.life > 0);
}

function spawnParticles(x, y, count, color, power) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(40, 130) * power;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: rand(2, 5),
      color,
      life: rand(0.35, 0.85),
      maxLife: 0.85,
    });
  }
}

function updateHud() {
  heightText.textContent = `${Math.floor(maxHeight)}m`;
  windText.textContent = `${Math.floor(score)}`;
}

function draw() {
  ctx.save();

  if (shake > 0) {
    ctx.translate(rand(-6, 6) * shake * 6, rand(-6, 6) * shake * 6);
  }

  drawBackground();
  drawStageObjects();
  drawGoalGate();
  drawParticles();
  drawPlayer();
  drawMessage();
  drawFlash();

  ctx.restore();
}

function drawBackground() {
  const progress = 1 - cameraY / (GAME_HEIGHT - H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (progress < 0.35) {
    grad.addColorStop(0, "#72ceff");
    grad.addColorStop(0.62, "#dbf5ff");
    grad.addColorStop(1, "#ffffff");
  } else if (progress < 0.72) {
    grad.addColorStop(0, "#48aef5");
    grad.addColorStop(0.58, "#bcecff");
    grad.addColorStop(1, "#ffffff");
  } else {
    grad.addColorStop(0, "#18265c");
    grad.addColorStop(0.52, "#4f7dde");
    grad.addColorStop(1, "#c7efff");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (cameraY > GAME_HEIGHT - H - 120) {
    drawGround();
  }

  for (const s of stars) {
    const sy = worldY(s.y);
    if (sy < -20 || sy > H + 20) continue;

    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, sy, s.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const c of clouds) {
    const cy = worldY(c.y);
    if (cy < -100 || cy > H + 100) continue;
    drawCloud(c.x, cy, c.s, c.a);
  }
}

function drawGround() {
  const y = worldY(GAME_HEIGHT - 62);

  ctx.fillStyle = "#70c050";
  ctx.fillRect(0, y, W, H - y);

  for (let x = 18; x < W; x += 72) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30, y - 58);
    ctx.lineTo(x + 60, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x + 26, y - 26, 10, 26);
  }
}

function drawStageObjects() {
  for (const wind of winds) {
    const y = worldY(wind.y);
    if (y < -120 || y > H + 120) continue;
    drawWindRing(wind, y);
  }

  for (const o of obstacles) {
    const y = worldY(o.y);
    if (y < -120 || y > H + 120) continue;

    if (o.type === "wire") drawWire(o, y);
    if (o.type === "bird") drawBird(o, y);
  }
}

function drawWindRing(wind, y) {
  const pulse = Math.sin(performance.now() * 0.006 + wind.phase) * 4;
  const rx = wind.rx + pulse;
  const ry = wind.ry + pulse * 0.35;

  ctx.save();
  ctx.translate(wind.x, y);

  ctx.globalAlpha = wind.used ? 0.22 : 0.95;

  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = wind.used ? "rgba(148,163,184,.7)" : "rgba(56,189,248,.95)";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 13, ry - 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (!wind.used) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("風", 0, 4);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWire(o, y) {
  const gapLeft = o.gapX - o.gapW * 0.5;
  const gapRight = o.gapX + o.gapW * 0.5;

  ctx.save();
  ctx.strokeStyle = "rgba(36, 54, 74, 0.7)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(gapLeft, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(gapRight, y);
  ctx.lineTo(W, y);
  ctx.stroke();

  ctx.fillStyle = "rgba(36, 54, 74, 0.4)";
  ctx.fillRect(8, y - 26, 5, 52);
  ctx.fillRect(W - 13, y - 26, 5, 52);

  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = "900 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("すきま", o.gapX, y - 13);

  ctx.restore();
}

function drawBird(o, y) {
  const x = o.x + Math.sin(performance.now() * 0.0025 + o.phase) * 34;
  const flap = Math.sin(performance.now() * 0.014 + o.phase) * 9;

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = "#24364a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.quadraticCurveTo(-10, -15 - flap, 0, 0);
  ctx.quadraticCurveTo(12, -15 + flap, 26, 0);
  ctx.stroke();

  ctx.restore();
}

function drawCloud(x, y, s = 1, a = 0.55) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = a;
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.arc(-28, 8, 22, 0, Math.PI * 2);
  ctx.arc(-8, -4, 28, 0, Math.PI * 2);
  ctx.arc(22, 6, 24, 0, Math.PI * 2);
  ctx.arc(44, 14, 16, 0, Math.PI * 2);
  ctx.fillRect(-42, 8, 92, 24);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGoalGate() {
  const y = worldY(GAME_HEIGHT - CLEAR_HEIGHT - 90);
  if (y < -180 || y > H + 130) return;

  ctx.save();
  ctx.translate(W / 2, y);

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 82, Math.PI * 0.12, Math.PI * 0.88, true);
  ctx.stroke();

  ctx.fillStyle = "#fff4bd";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("空のてっぺん", 0, 12);

  ctx.restore();
}

function drawPlayer() {
  const x = player.x;
  const y = worldY(player.y);

  if (state === "clear") {
    drawDragon(x, y);
    return;
  }

  player.angle = clamp(player.vy * 0.0011, -0.7, 0.7);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);

  if (hitCooldown > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(performance.now() * 0.04) * 0.25;
  }

  drawKoinobori();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawKoinobori() {
  const bodyGrad = ctx.createLinearGradient(-42, 0, 44, 0);
  bodyGrad.addColorStop(0, "#ef4444");
  bodyGrad.addColorStop(0.46, "#ffffff");
  bodyGrad.addColorStop(1, "#ef4444");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-42, -18);
  ctx.quadraticCurveTo(4, -34, 48, -16);
  ctx.quadraticCurveTo(62, 0, 48, 16);
  ctx.quadraticCurveTo(4, 34, -42, 18);
  ctx.quadraticCurveTo(-30, 0, -42, -18);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-42, -18);
  ctx.lineTo(-70, -32);
  ctx.lineTo(-58, 0);
  ctx.lineTo(-70, 32);
  ctx.lineTo(-42, 18);
  ctx.quadraticCurveTo(-30, 0, -42, -18);
  ctx.fill();

  ctx.strokeStyle = "rgba(120,20,20,.22)";
  ctx.lineWidth = 2;

  for (let i = -18; i <= 24; i += 14) {
    ctx.beginPath();
    ctx.arc(i, 0, 15, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
  }

  ctx.fillStyle = "#11345c";
  ctx.beginPath();
  ctx.arc(34, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(50, -7);
  ctx.lineTo(68, 0);
  ctx.lineTo(50, 7);
  ctx.closePath();
  ctx.fill();
}

function drawDragon(x, y) {
  ctx.save();
  ctx.translate(x, y);

  const t = clearTimer;
  const scale = 1 + Math.min(t, 1.2) * 0.35;
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 17;
  ctx.lineCap = "round";

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const px = Math.sin(i * 0.86 + t * 5) * 36;
    const py = i * 17 - 92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.strokeStyle = "#fff1a8";
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, -105, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-9, -111, 6, 0, Math.PI * 2);
  ctx.arc(11, -111, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#11345c";
  ctx.beginPath();
  ctx.arc(-9, -111, 2.5, 0, Math.PI * 2);
  ctx.arc(11, -111, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-14, -130);
  ctx.lineTo(-30, -154);
  ctx.moveTo(14, -130);
  ctx.lineTo(30, -154);
  ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    const y = worldY(p.y);
    const alpha = clamp(p.life / p.maxLife, 0, 1);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawMessage() {
  if (!message || messageTimer <= 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(messageTimer * 2, 0, 1);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(17,52,92,.38)";
  ctx.lineWidth = 5;
  ctx.font = "900 28px system-ui";
  ctx.textAlign = "center";
  ctx.strokeText(message, W / 2, H * 0.28);
  ctx.fillText(message, W / 2, H * 0.28);
  ctx.restore();
}

function drawFlash() {
  if (flash <= 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(flash, 0, 0.5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function onPointerDown(e) {
  if (e.target === startBtn || e.target === retryBtn) return;

  e.preventDefault();

  if (state === "playing") {
    tapJump();
  }
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

window.addEventListener("pointerdown", onPointerDown, { passive: false });

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

window.addEventListener("resize", () => {
  resize();
  if (state === "ready") {
    initReadyScreen();
  }
});

resize();
initReadyScreen();

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