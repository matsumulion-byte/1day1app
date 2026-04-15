const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const resultOverlay = document.getElementById("resultOverlay");
const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const fuelBar = document.getElementById("fuelBar");
const centerGuide = document.getElementById("centerGuide");

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 92;
const PAD_WIDTH = 108;
const PAD_HEIGHT = 10;
const PAD_X = (W - PAD_WIDTH) / 2;

const state = {
  running: false,
  ended: false,
  pointerDown: false,
  lastTime: 0,
  elapsed: 0,
  cameraShake: 0,
  fuel: 100,
  result: null,
  heli: null,
  clouds: [],
  stars: [],
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state.running = false;
  state.ended = false;
  state.pointerDown = false;
  state.lastTime = 0;
  state.elapsed = 0;
  state.cameraShake = 0;
  state.fuel = 100;
  state.result = null;

  state.heli = {
    x: W / 2,
    y: 120,
    vx: 0,
    vy: 0,
    angle: 0,
    rotV: 0,
    bodyW: 70,
    bodyH: 24,
    rotor: 0,
    smoke: [],
  };

  state.clouds = Array.from({ length: 5 }, (_, i) => ({
    x: rand(20, W - 20),
    y: 80 + i * 110 + rand(-20, 20),
    w: rand(68, 120),
    h: rand(18, 28),
    speed: rand(8, 20),
  }));

  state.stars = Array.from({ length: 28 }, () => ({
    x: rand(0, W),
    y: rand(0, GROUND_Y - 140),
    r: rand(0.7, 1.8),
    a: rand(0.3, 0.9),
  }));

  updateFuelBar();
  hideResult();
  centerGuide.textContent = "長押し / Spaceで上昇";
}

function startGame() {
  resetGame();
  state.running = true;
}

function endGame(success, summary) {
  state.running = false;
  state.ended = true;
  state.result = { success, summary };
  showResult(success, summary);
}

function showResult(success, summary) {
  resultOverlay.classList.remove("is-hidden");
  resultBadge.textContent = success ? "SUCCESS" : "CRASH";
  resultBadge.style.color = success ? "#ffd166" : "#ff8d8d";
  resultTitle.textContent = success ? "着陸成功！" : "墜落…";
  resultText.textContent = summary;
}

function hideResult() {
  resultOverlay.classList.add("is-hidden");
}

function updateFuelBar() {
  fuelBar.style.transform = `scaleX(${clamp(state.fuel / 100, 0, 1)})`;
}

function addSmoke(x, y, strong = false) {
  state.heli.smoke.push({
    x: x + rand(-4, 4),
    y: y + rand(-2, 2),
    r: strong ? rand(7, 12) : rand(4, 8),
    life: strong ? rand(0.45, 0.8) : rand(0.25, 0.55),
    maxLife: 1,
    dx: rand(-10, 10),
    dy: rand(8, 18),
  });
}

function update(dt) {
  if (!state.running) return;

  state.elapsed += dt;

  for (const cloud of state.clouds) {
    cloud.x -= cloud.speed * dt;
    if (cloud.x < -cloud.w) {
      cloud.x = W + cloud.w;
      cloud.y = rand(60, GROUND_Y - 180);
      cloud.w = rand(68, 120);
      cloud.h = rand(18, 28);
      cloud.speed = rand(8, 20);
    }
  }

  const heli = state.heli;

  const gravity = 430;
  const thrust = 690;
  // 左右の風をゲーム性として効かせる
  const horizontalDrift = Math.sin(state.elapsed * 0.8) * 7;
  const wind = Math.sin(state.elapsed * 1.3) * 20;

  let ax = horizontalDrift * 0.22;
  let ay = gravity;

  // 離すと少し前のめりになる姿勢制御
  const targetAngle = state.pointerDown ? -0.12 : 0.04;

  if (state.pointerDown && state.fuel > 0) {
    ay -= thrust;
    state.fuel = Math.max(0, state.fuel - dt * 18);
    addSmoke(heli.x - 22, heli.y + 20);
  }

  if (!state.pointerDown) {
    state.fuel = Math.min(100, state.fuel + dt * 3.4);
  }

  heli.vx += ax * dt;
  heli.vy += ay * dt;
  heli.vx += wind * dt;
  if (Math.random() < 0.01) {
    heli.vx += rand(-80, 80);
  }

  heli.vx *= 0.992;
  heli.vy *= 0.998;

  heli.x += heli.vx * dt;
  heli.y += heli.vy * dt;
  heli.angle += (targetAngle - heli.angle) * 4.5 * dt;

  heli.rotor += dt * (state.pointerDown ? 40 : 28);

  heli.x = clamp(heli.x, 40, W - 40);
  heli.angle = clamp(heli.angle, -0.35, 0.35);

  for (let i = heli.smoke.length - 1; i >= 0; i--) {
    const s = heli.smoke[i];
    s.x += s.dx * dt;
    s.y += s.dy * dt;
    s.life -= dt * 1.5;
    if (s.life <= 0) heli.smoke.splice(i, 1);
  }

  updateFuelBar();

  const heliBottom = heli.y + heli.bodyH / 2 + 10;
  const altitude = Math.max(0, GROUND_Y - heliBottom);
  if (altitude < 80) {
    heli.vy += 120 * dt;
  }
  const onPadX = heli.x > PAD_X + 12 && heli.x < PAD_X + PAD_WIDTH - 12;
  const nearGround = heliBottom >= GROUND_Y - 1;

  if (nearGround) {
    const speed = Math.abs(heli.vy);
    const tilt = Math.abs(heli.angle);
    const offset = Math.abs(heli.x - (PAD_X + PAD_WIDTH / 2));

    if (onPadX && speed <= 95 && tilt <= 0.10) {
      heli.y = GROUND_Y - heli.bodyH / 2 - 10;
      heli.vx = 0;
      heli.vy = 0;
      heli.angle = 0;

      const summary = `着地速度 ${speed.toFixed(1)} / 傾き ${tilt.toFixed(2)} / 位置ズレ ${offset.toFixed(1)}px`;
      endGame(true, summary);
      return;
    }

    state.cameraShake = 10;
    for (let i = 0; i < 18; i++) {
      addSmoke(heli.x, GROUND_Y - 10, true);
    }
    const summary = `着地速度 ${speed.toFixed(1)} / 傾き ${tilt.toFixed(2)} / 位置ズレ ${offset.toFixed(1)}px`;
    endGame(false, summary);
    return;
  }

  if (heli.y < 30) {
    heli.y = 30;
    heli.vy = Math.max(0, heli.vy);
  }

  if (state.elapsed > 2.2) {
    centerGuide.textContent = "着陸帯へそっと降ろせ";
  }
}

function drawSky() {
  for (const s of state.stars) {
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const cloud of state.clouds) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, cloud.x, cloud.y, cloud.w, cloud.h, cloud.h / 2);
    ctx.fill();
  }
}

function drawGround() {
  const grad = ctx.createLinearGradient(0, GROUND_Y - 30, 0, H);
  grad.addColorStop(0, "#22323e");
  grad.addColorStop(1, "#0d141c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  ctx.fillStyle = "#6c7f53";
  ctx.fillRect(0, GROUND_Y - 12, W, 12);

  ctx.fillStyle = "#3b4651";
  roundRect(ctx, PAD_X, GROUND_Y - PAD_HEIGHT, PAD_WIDTH, PAD_HEIGHT, 6);
  ctx.fill();

  ctx.strokeStyle = "#f4f7fb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD_X + 18, GROUND_Y - PAD_HEIGHT / 2);
  ctx.lineTo(PAD_X + PAD_WIDTH - 18, GROUND_Y - PAD_HEIGHT / 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let i = 0; i < 10; i++) {
    const x = 12 + i * 42;
    ctx.fillRect(x, GROUND_Y + 26, 18, 4);
  }
}

function drawHeli() {
  const heli = state.heli;

  for (const s of heli.smoke) {
    ctx.globalAlpha = clamp(s.life, 0, 1) * 0.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (1 + (1 - s.life) * 0.8), 0, Math.PI * 2);
    ctx.fillStyle = "#c9d2d8";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(heli.angle);

  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-30, 18);
  ctx.lineTo(-18, 26);
  ctx.lineTo(20, 26);
  ctx.lineTo(32, 18);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-20, 26);
  ctx.lineTo(-28, 34);
  ctx.moveTo(22, 26);
  ctx.lineTo(30, 34);
  ctx.stroke();

  ctx.fillStyle = "#ffcf5a";
  roundRect(ctx, -28, -10, 58, 24, 10);
  ctx.fill();

  ctx.fillStyle = "#8fd0ff";
  roundRect(ctx, -10, -8, 20, 14, 6);
  ctx.fill();

  ctx.fillStyle = "#d95d5d";
  roundRect(ctx, 24, -2, 18, 10, 5);
  ctx.fill();

  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -22);
  ctx.stroke();

  ctx.save();
  ctx.rotate(Math.sin(heli.rotor) * 0.08);
  ctx.strokeStyle = "#dfe7ee";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-42, -22);
  ctx.lineTo(42, -22);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawHUDInCanvas() {
  if (!state.running) return;

  const heli = state.heli;
  const altitude = Math.max(0, GROUND_Y - (heli.y + heli.bodyH / 2 + 10));
  const speed = Math.abs(heli.vy);
  const tilt = Math.abs(heli.angle);

  const panelX = 16;
  const panelY = H - 130;
  const panelW = 132;
  const panelH = 84;

  ctx.fillStyle = "rgba(7, 12, 22, 0.55)";
  roundRect(ctx, panelX, panelY, panelW, panelH, 16);
  ctx.fill();

  ctx.fillStyle = "rgba(244,247,251,0.7)";
  ctx.font = "12px sans-serif";
  ctx.fillText(`ALT  ${altitude.toFixed(0)}`, panelX + 14, panelY + 24);
  ctx.fillText(`SPD  ${speed.toFixed(1)}`, panelX + 14, panelY + 46);
  ctx.fillText(`TILT ${tilt.toFixed(2)}`, panelX + 14, panelY + 68);

  ctx.fillStyle = "rgba(244,247,251,0.4)";
  ctx.font = "11px sans-serif";
  ctx.fillText("SAFE", W - 68, GROUND_Y - 22);

  ctx.strokeStyle = "rgba(126,242,154,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD_X - 10, GROUND_Y - 26, PAD_WIDTH + 20, 20);
}

function drawStartMessage() {
  if (state.running || state.ended) return;

  ctx.fillStyle = "rgba(8,13,24,0.42)";
  roundRect(ctx, 34, 250, W - 68, 120, 20);
  ctx.fill();

  ctx.fillStyle = "#f4f7fb";
  ctx.textAlign = "center";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("着陸帯に降ろせ", W / 2, 294);

  ctx.fillStyle = "rgba(244,247,251,0.78)";
  ctx.font = "14px sans-serif";
  ctx.fillText("長押しで上昇、離すと降下", W / 2, 328);
  ctx.fillText("速度と傾きが大きいと失敗", W / 2, 352);
  ctx.textAlign = "left";
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  let shakeX = 0;
  let shakeY = 0;
  if (state.cameraShake > 0) {
    shakeX = rand(-state.cameraShake, state.cameraShake);
    shakeY = rand(-state.cameraShake, state.cameraShake);
    state.cameraShake *= 0.88;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawSky();
  drawGround();
  drawHeli();
  drawHUDInCanvas();
  drawStartMessage();

  ctx.restore();
}

function loop(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min((ts - state.lastTime) / 1000, 0.033);
  state.lastTime = ts;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function setPointer(isDown) {
  if (!state.running) return;
  state.pointerDown = isDown;
}

// 右クリックメニューを無効化
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

window.addEventListener("contextmenu", (e) => {
  if (e.target === canvas) e.preventDefault();
});

// 左クリック / タッチ / ペンのみ受ける
canvas.addEventListener("pointerdown", (e) => {
  if (!state.running) return;

  // mouse のときは左クリックのみ
  if (e.pointerType === "mouse" && e.button !== 0) return;

  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  setPointer(true);
});

canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  setPointer(false);
  canvas.releasePointerCapture?.(e.pointerId);
});

canvas.addEventListener("pointercancel", (e) => {
  setPointer(false);
  canvas.releasePointerCapture?.(e.pointerId);
});

canvas.addEventListener("lostpointercapture", () => {
  setPointer(false);
});

canvas.addEventListener("dragstart", (e) => {
  e.preventDefault();
});

canvas.addEventListener("selectstart", (e) => {
  e.preventDefault();
});

window.addEventListener("mouseup", () => {
  setPointer(false);
});

window.addEventListener("blur", () => {
  setPointer(false);
});

// PC向けにスペースキー長押し対応
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    setPointer(true);
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    setPointer(false);
  }
});

startBtn.addEventListener("click", () => {
  startGame();
});

retryBtn.addEventListener("click", () => {
  startGame();
});

resetGame();
draw();
requestAnimationFrame(loop);