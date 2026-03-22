// Vercel用：/YYYY-MM-DD/ でアクセスしたときにアセットを正しく解決（別日アプリと同パターン）
const DATE_SEGMENT = (location.pathname.match(/\d{4}-\d{2}-\d{2}/) || [""])[0];
const DATE_BASE = DATE_SEGMENT ? `/${DATE_SEGMENT}/` : "/";
const asset = (p) => {
  const clean = String(p || "").replace(/^\.?\//, "");
  return `${DATE_BASE}${clean}`;
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const goalEl = document.getElementById("goal");
const timeEl = document.getElementById("time");
const messageEl = document.getElementById("message");
const startButton = document.getElementById("startButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");

const DPR = Math.min(window.devicePixelRatio || 1, 2);

const BASE_W = 390;
const BASE_H = 844;

const GAME_TIME = 30;
const GOAL = 10;
const ACTIVE_COUNT = 4;

goalEl.textContent = String(GOAL);

let width = BASE_W;
let height = BASE_H;
let viewScale = 1;
let offsetX = 0;
let offsetY = 0;

let matsumuraImg = null;
let matsumuraReady = false;

let started = false;
let ended = false;
let score = 0;
let timeLeft = GAME_TIME;
let lastTime = 0;
let timerAcc = 0;
let captureFlash = 0;
let resultTitle = "";
let resultText = "";

let jets = {
  left: false,
  right: false,
};

const world = {
  tank: { x: 0, y: 0, w: 0, h: 0, radius: 26 },
  waterTop: 0,
  box: { x: 0, y: 0, w: 0, h: 0 },
  jetLeft: { x: 0, y: 0, w: 0, h: 0 },
  jetRight: { x: 0, y: 0, w: 0, h: 0 },
};

const particles = [];
const matsumuras = [];
const captured = [];

class Particle {
  constructor(x, y, dir = 0) {
    this.x = x;
    this.y = y;
    this.r = rand(2, 6);
    this.vx = rand(-0.5, 0.5) + dir * rand(0.8, 1.8);
    this.vy = rand(-4.6, -2.2);
    this.alpha = rand(0.25, 0.7);
    this.life = rand(0.5, 1.1);
    this.maxLife = this.life;
  }

  update(dt) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const t = Math.max(this.life / this.maxLife, 0);
    ctx.save();
    ctx.globalAlpha = this.alpha * t;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * (0.7 + 0.3 * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Matsumura {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    const area = spawnArea();
    this.w = world.tank.w * 0.12;
    this.h = this.w * 1.12;
    this.x = area.x + rand(0, area.w - this.w);
    this.y = area.y + rand(0, area.h - this.h);
    this.vx = rand(-0.4, 0.4);
    this.vy = rand(-0.2, 0.2);
    this.rot = rand(-0.18, 0.18);
    this.vr = rand(-0.008, 0.008);
    this.bob = rand(0, Math.PI * 2);
    this.captured = false;
    this.captureT = 0;

    if (!initial) {
      this.y = world.tank.y + world.tank.h - this.h - rand(6, 30);
      this.vy = rand(-0.3, 0.1);
    }
  }

  update(dt) {
    if (this.captured) {
      this.captureT += dt * 5;
      return;
    }

    const gravity = 0.038;
    const damping = 0.995;
    const horizontalJitter = 0.018;

    this.vy += gravity;
    this.vx += Math.sin(performance.now() * 0.001 + this.bob) * 0.002;
    this.vx += rand(-horizontalJitter, horizontalJitter);

    const leftPower = jets.left ? getJetInfluence(this, world.jetLeft, "left") : 0;
    const rightPower = jets.right ? getJetInfluence(this, world.jetRight, "right") : 0;

    if (leftPower > 0) {
      this.vy -= 0.06 + leftPower * 0.09;
      this.vx += 0.018 + leftPower * 0.05;
      this.vr += 0.0008 + leftPower * 0.002;
    }

    if (rightPower > 0) {
      this.vy -= 0.06 + rightPower * 0.09;
      this.vx -= 0.018 + rightPower * 0.05;
      this.vr -= 0.0008 + rightPower * 0.002;
    }

    this.vx *= damping;
    this.vy *= 0.998;
    this.vr *= 0.99;

    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.rot += this.vr * 60 * dt;

    const left = world.tank.x + 10;
    const right = world.tank.x + world.tank.w - this.w - 10;
    const top = world.waterTop + 6;
    const bottom = world.tank.y + world.tank.h - this.h - 10;

    if (this.x < left) {
      this.x = left;
      this.vx *= -0.7;
    }
    if (this.x > right) {
      this.x = right;
      this.vx *= -0.7;
    }
    if (this.y < top) {
      this.y = top;
      this.vy *= -0.35;
    }
    if (this.y > bottom) {
      this.y = bottom;
      this.vy *= -0.28;
      this.vx *= 0.96;
    }

    applyBoxAttraction(this);

    if (isInBox(this)) {
      capture(this);
    }
  }

  draw(ctx) {
    if (this.captured) return;

    ctx.save();
    ctx.translate(this.x + this.w * 0.5, this.y + this.h * 0.5);
    ctx.rotate(this.rot + Math.sin(performance.now() * 0.002 + this.bob) * 0.04);

    if (matsumuraReady && matsumuraImg) {
      ctx.drawImage(matsumuraImg, -this.w * 0.5, -this.h * 0.5, this.w, this.h);
    } else {
      drawFallbackMatsumura(ctx, this.w, this.h);
    }

    ctx.restore();
  }
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(320, Math.floor(rect.width));
  const cssH = Math.max(420, Math.floor(rect.height));

  canvas.width = Math.floor(cssW * DPR);
  canvas.height = Math.floor(cssH * DPR);

  const scaleX = cssW / BASE_W;
  const scaleY = cssH / BASE_H;
  viewScale = Math.min(scaleX, scaleY);

  offsetX = (cssW - BASE_W * viewScale) * 0.5;
  offsetY = (cssH - BASE_H * viewScale) * 0.5;

  width = BASE_W;
  height = BASE_H;

  layoutWorld();

  matsumuras.forEach((m) => m.reset(true));
}

function layoutWorld() {
  const padX = width * 0.055;
  const padTop = height * 0.05;
  const padBottom = height * 0.035;

  world.tank.x = padX;
  world.tank.y = padTop;
  world.tank.w = width - padX * 2;
  world.tank.h = height - padTop - padBottom;
  world.tank.radius = Math.min(28, world.tank.w * 0.06);

  world.waterTop = world.tank.y + world.tank.h * 0.16;

  world.box.w = world.tank.w * 0.34;
  world.box.h = world.tank.h * 0.12;
  world.box.x = world.tank.x + (world.tank.w - world.box.w) * 0.5;
  world.box.y = world.tank.y + world.tank.h * 0.14;

  world.jetLeft.w = world.tank.w * 0.34;
  world.jetLeft.h = world.tank.h * 0.88;
  world.jetLeft.x = world.tank.x + world.tank.w * 0.01;
  world.jetLeft.y = world.tank.y + world.tank.h - world.jetLeft.h - 6;

  world.jetRight.w = world.tank.w * 0.34;
  world.jetRight.h = world.tank.h * 0.88;
  world.jetRight.x = world.tank.x + world.tank.w - world.jetRight.w - world.tank.w * 0.01;
  world.jetRight.y = world.tank.y + world.tank.h - world.jetRight.h - 6;
}

function spawnArea() {
  return {
    x: world.tank.x + 18,
    y: world.tank.y + world.tank.h * 0.45,
    w: world.tank.w - 36,
    h: world.tank.h * 0.42,
  };
}

function getJetInfluence(m, jet, side) {
  const cx = m.x + m.w * 0.5;
  const cy = m.y + m.h * 0.6;

  const jetCenterX = jet.x + jet.w * 0.5;
  const jetTop = jet.y;
  const jetBottom = jet.y + jet.h;

  if (cy < jetTop || cy > jetBottom) return 0;

  const expandX = jet.w * 0.42;
  const left = jet.x - expandX;
  const right = jet.x + jet.w + expandX;

  if (cx < left || cx > right) return 0;

  const horizontalRange = jet.w * 0.5 + expandX;
  const dx = Math.abs(cx - jetCenterX);
  const horizontalFactor = 1 - Math.min(dx / horizontalRange, 1);

  const verticalFactor = 1 - Math.min((cy - jetTop) / jet.h, 1);

  const sideBias =
    side === "left"
      ? 1 - Math.max(0, (cx - jetCenterX) / horizontalRange) * 0.35
      : 1 - Math.max(0, (jetCenterX - cx) / horizontalRange) * 0.35;

  return Math.max(0, horizontalFactor * 0.75 + verticalFactor * 0.25) * sideBias;
}

function isInBox(m) {
  const cx = m.x + m.w * 0.5;
  const cy = m.y + m.h * 0.55;
  return (
    cx > world.box.x + world.box.w * 0.18 &&
    cx < world.box.x + world.box.w * 0.82 &&
    cy > world.box.y + world.box.h * 0.12 &&
    cy < world.box.y + world.box.h * 0.84
  );
}

function applyBoxAttraction(m) {
  const boxCenterX = world.box.x + world.box.w * 0.5;
  const boxCenterY = world.box.y + world.box.h * 0.52;
  const selfCenterX = m.x + m.w * 0.5;
  const selfCenterY = m.y + m.h * 0.5;

  const dx = boxCenterX - selfCenterX;
  const dy = boxCenterY - selfCenterY;

  const nearX = Math.abs(dx) < world.box.w * 0.42;
  const nearY = Math.abs(dy) < world.box.h * 1.2;

  if (nearX && nearY && selfCenterY < boxCenterY + world.box.h * 0.4) {
    m.vx += dx * 0.0009;
    m.vy += dy * 0.0006;
  }
}

function capture(m) {
  m.captured = true;
  score += 1;
  scoreEl.textContent = String(score);
  captureFlash = 0.55;

  captured.push({
    x: world.box.x + 12 + ((captured.length % 3) * (world.box.w - 24)) / 3,
    y: world.box.y + 10 + Math.floor(captured.length / 3) * (world.box.h * 0.36),
    w: world.box.w * 0.16,
    h: world.box.w * 0.18,
    rot: rand(-0.18, 0.18),
  });

  for (let i = 0; i < 16; i += 1) {
    particles.push(
      new Particle(
        m.x + m.w * 0.5 + rand(-8, 8),
        m.y + m.h * 0.45 + rand(-8, 8),
        rand(-0.3, 0.3),
      ),
    );
  }

  setTimeout(() => {
    const index = matsumuras.indexOf(m);
    if (index >= 0) {
      matsumuras[index] = new Matsumura();
    }
  }, 50);

  if (score >= GOAL) {
    finish(true);
  }
}

function resetGame() {
  started = true;
  ended = false;
  jets.left = false;
  jets.right = false;
  score = 0;
  timeLeft = GAME_TIME;
  timerAcc = 0;
  captureFlash = 0;
  lastTime = 0;
  particles.length = 0;
  matsumuras.length = 0;
  captured.length = 0;

  scoreEl.textContent = "0";
  timeEl.textContent = String(GAME_TIME);

  for (let i = 0; i < ACTIVE_COUNT; i += 1) {
    matsumuras.push(new Matsumura());
  }

  leftButton.classList.remove("is-active");
  rightButton.classList.remove("is-active");
  messageEl.hidden = true;
}

function finish(success) {
  if (ended) return;

  ended = true;
  started = false;
  jets.left = false;
  jets.right = false;
  leftButton.classList.remove("is-active");
  rightButton.classList.remove("is-active");

  resultTitle = success ? "クリア" : "終了";
  resultText = success
    ? `松村を${score}人収容しました。`
    : `松村を${score}人しか入れられませんでした。`;

  showResult();
}

function showResult() {
  messageEl.hidden = false;
  messageEl.querySelector(".message__lead").textContent = ended ? "RESULT" : "左右で噴射";
  messageEl.querySelector(".message__title").textContent = resultTitle || "ミニ松村を箱に入れろ";
  messageEl.querySelector(".message__text").innerHTML = ended
    ? `${resultText}<br />もう一回やりますか。`
    : `下のLEFT / RIGHTを長押しすると水流が出ます。<br />30秒で10人入れたらクリアです。`;
  startButton.textContent = ended ? "RETRY" : "START";
}

function emitJetParticles() {
  if (ended) return;

  if (jets.left) {
    for (let i = 0; i < 4; i += 1) {
      particles.push(
        new Particle(
          rand(world.jetLeft.x + 8, world.jetLeft.x + world.jetLeft.w - 8),
          world.tank.y + world.tank.h - 16 + rand(-4, 4),
          0.4,
        ),
      );
    }
  }

  if (jets.right) {
    for (let i = 0; i < 4; i += 1) {
      particles.push(
        new Particle(
          rand(world.jetRight.x + 8, world.jetRight.x + world.jetRight.w - 8),
          world.tank.y + world.tank.h - 16 + rand(-4, 4),
          -0.4,
        ),
      );
    }
  }
}

function update(dt) {
  if (!started || ended) return;

  timerAcc += dt;
  if (timerAcc >= 1) {
    timerAcc -= 1;
    timeLeft -= 1;
    timeEl.textContent = String(Math.max(timeLeft, 0));
    if (timeLeft <= 0) {
      finish(score >= GOAL);
      return;
    }
  }

  captureFlash = Math.max(0, captureFlash - dt);

  emitJetParticles();

  matsumuras.forEach((m) => m.update(dt));

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);

  const { x, y, w, h, radius } = world.tank;

  ctx.save();

  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const topGrad = ctx.createLinearGradient(0, y, 0, y + h);
  topGrad.addColorStop(0, "rgba(255,255,255,0.52)");
  topGrad.addColorStop(0.16, "rgba(212,241,255,0.36)");
  topGrad.addColorStop(1, "rgba(78,183,255,0.22)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(x, y, w, h);

  const waterGrad = ctx.createLinearGradient(0, world.waterTop, 0, y + h);
  waterGrad.addColorStop(0, "rgba(173, 228, 255, 0.18)");
  waterGrad.addColorStop(1, "rgba(77, 181, 255, 0.42)");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(x, world.waterTop, w, y + h - world.waterTop);

  drawWaterSurface();
  drawJet(world.jetLeft, jets.left, "left");
  drawJet(world.jetRight, jets.right, "right");
  drawBubbleDecor();

  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  ctx.strokeStyle = "rgba(32, 91, 131, 0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, radius - 4);
  ctx.stroke();

  drawBox();

  if (captureFlash > 0) {
    ctx.save();
    ctx.globalAlpha = captureFlash * 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawWaterSurface() {
  const left = world.tank.x;
  const right = world.tank.x + world.tank.w;
  const y = world.waterTop;
  const t = performance.now() * 0.0016;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, y);

  const steps = 12;
  for (let i = 0; i <= steps; i += 1) {
    const px = left + (world.tank.w / steps) * i;
    const py = y + Math.sin(t * 2 + i * 0.9) * 3;
    ctx.lineTo(px, py);
  }

  ctx.lineTo(right, y + 16);
  ctx.lineTo(left, y + 16);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, y, 0, y + 18);
  grad.addColorStop(0, "rgba(255,255,255,0.72)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y);
  for (let i = 0; i <= steps; i += 1) {
    const px = left + (world.tank.w / steps) * i;
    const py = y + Math.sin(t * 2 + i * 0.9) * 3;
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawJet(jet, active, side) {
  if (!active || ended) return;

  const t = performance.now() * 0.003;
  const { x, y, w, h } = jet;
  const lean = side === "left" ? 18 : -18;

  ctx.save();

  const grad = ctx.createLinearGradient(0, y + h, 0, y);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.14)");
  grad.addColorStop(0.75, "rgba(255,255,255,0.34)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + h);
  ctx.quadraticCurveTo(
    x + w * 0.28 + lean + Math.sin(t) * 6,
    y + h * 0.45,
    x + w * 0.42 + lean,
    y,
  );
  ctx.lineTo(x + w * 0.58 + lean, y);
  ctx.quadraticCurveTo(
    x + w * 0.72 + lean + Math.cos(t * 1.2) * 6,
    y + h * 0.45,
    x + w * 0.78,
    y + h,
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.44)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 3; i += 1) {
    const startX = side === "left" ? x + w * 0.3 + i * 8 : x + w * 0.7 - i * 8;
    const endX = side === "left" ? x + w * 0.5 + lean * 0.7 : x + w * 0.5 + lean * 0.7;

    ctx.beginPath();
    ctx.moveTo(startX, y + h);
    ctx.quadraticCurveTo(
      x + w * 0.5 + lean + Math.sin(t + i) * 8,
      y + h * 0.45,
      endX,
      y + 10,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawBubbleDecor() {
  const t = performance.now() * 0.001;
  for (let i = 0; i < 10; i += 1) {
    const bx = world.tank.x + 20 + ((world.tank.w - 40) / 9) * i + Math.sin(t + i) * 8;
    const by = world.tank.y + world.tank.h - 30 - ((i * 43 + t * 30) % (world.tank.h * 0.68));
    const r = 4 + (i % 3);
    ctx.save();
    ctx.globalAlpha = 0.18 + (i % 4) * 0.05;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBox() {
  const { x, y, w, h } = world.box;

  ctx.save();

  ctx.fillStyle = "#efc17a";
  roundRect(ctx, x, y + h * 0.22, w, h * 0.78, 12);
  ctx.fill();

  ctx.fillStyle = "#f7d49c";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h * 0.24);
  ctx.lineTo(x + w * 0.36, y);
  ctx.lineTo(x + w * 0.5, y + h * 0.18);
  ctx.lineTo(x + w * 0.15, y + h * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + w - 10, y + h * 0.24);
  ctx.lineTo(x + w * 0.64, y);
  ctx.lineTo(x + w * 0.5, y + h * 0.18);
  ctx.lineTo(x + w * 0.85, y + h * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#be8c4b";
  roundRect(ctx, x + 8, y + h * 0.33, w - 16, h * 0.26, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(110, 73, 28, 0.42)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y + h * 0.22, w, h * 0.78, 12);
  ctx.stroke();

  captured.forEach((item) => {
    ctx.save();
    ctx.translate(item.x + item.w * 0.5, item.y + item.h * 0.5);
    ctx.rotate(item.rot);
    if (matsumuraReady && matsumuraImg) {
      ctx.drawImage(matsumuraImg, -item.w * 0.5, -item.h * 0.5, item.w, item.h);
    } else {
      drawFallbackMatsumura(ctx, item.w, item.h);
    }
    ctx.restore();
  });

  ctx.restore();
}

function drawFallbackMatsumura(ctx, w, h) {
  ctx.save();

  ctx.fillStyle = "#1c3750";
  ctx.beginPath();
  ctx.arc(0, -h * 0.18, w * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#325b7d";
  roundRect(ctx, -w * 0.18, -h * 0.02, w * 0.36, h * 0.42, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-w * 0.07, -h * 0.2, w * 0.024, 0, Math.PI * 2);
  ctx.arc(w * 0.07, -h * 0.2, w * 0.024, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMatsumuras() {
  matsumuras.forEach((m) => m.draw(ctx));
}

function drawParticles() {
  particles.forEach((p) => p.draw(ctx));
}

function drawFooterText() {
  ctx.save();
  ctx.fillStyle = "rgba(23, 52, 74, 0.44)";
  ctx.font = "700 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("左右の長押しで水流を出す", width * 0.5, height - 14);
  ctx.restore();
}

function draw() {
  const cssW = canvas.width / DPR;
  const cssH = canvas.height / DPR;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(viewScale, viewScale);

  drawBackground();
  drawMatsumuras();
  drawParticles();
  drawFooterText();

  ctx.restore();
}

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.033);
  lastTime = ts;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadAssets() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      matsumuraImg = img;
      matsumuraReady = true;
      resolve();
    };
    img.onerror = () => {
      matsumuraReady = false;
      resolve();
    };
    img.src = asset("./assets/matsumura-mini.png");
  });
}

function setJet(side, on) {
  if (ended || !started) return;
  jets[side] = on;

  if (side === "left") {
    leftButton.classList.toggle("is-active", on);
  } else {
    rightButton.classList.toggle("is-active", on);
  }
}

function bindPress(button, side) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setJet(side, true);
  });

  button.addEventListener("pointerup", (e) => {
    e.preventDefault();
    setJet(side, false);
  });

  button.addEventListener("pointerleave", (e) => {
    e.preventDefault();
    setJet(side, false);
  });

  button.addEventListener("pointercancel", (e) => {
    e.preventDefault();
    setJet(side, false);
  });
}

function bindControls() {
  bindPress(leftButton, "left");
  bindPress(rightButton, "right");

  startButton.addEventListener("click", () => {
    resetGame();
  });

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", () => {
    setTimeout(resize, 50);
  });
}

async function init() {
  bindControls();
  await loadAssets();
  resize();
  showResult();
  requestAnimationFrame(loop);
}

init();
