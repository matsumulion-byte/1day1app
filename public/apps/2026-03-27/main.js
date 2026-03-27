const ASSET_BASE = "/apps/2026-03-27";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const GAME_TIME = 15;
const SCRATCH_RADIUS_MIN = 14;
const SCRATCH_RADIUS_MAX = 96;
const NOISE_COUNT = 120;
const PETAL_COUNT = 220;

const els = {
  game: document.getElementById("game"),
  bg: document.querySelector(".bg"),
  timer: document.getElementById("timer"),
  meterFill: document.getElementById("meterFill"),
  target: document.getElementById("target"),
  targetImg: document.getElementById("targetImg"),
  canvas: document.getElementById("petalCanvas"),
  intro: document.getElementById("intro"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  startBtn: document.getElementById("startBtn"),
  retryBtn: document.getElementById("retryBtn"),
};

const ctx = els.canvas.getContext("2d");

let audioContext = null;
let analyser = null;
let microphoneSource = null;
let microphoneStream = null;
let audioData = null;

let running = false;
let found = false;
let rafId = null;
let startedAt = 0;
let timeLeft = GAME_TIME;
let breathSmoothed = 0;
let revealProgress = 0;
let pointerX = 0;
let pointerY = 0;
let scratchX = 0;
let scratchY = 0;

const petalSprites = [];
const targetPositions = [
  { x: 0.26, y: 0.56, s: 0.85 },
  { x: 0.72, y: 0.56, s: 0.82 },
  { x: 0.34, y: 0.68, s: 0.88 },
  { x: 0.66, y: 0.67, s: 0.86 },
  { x: 0.48, y: 0.72, s: 0.92 },
  { x: 0.21, y: 0.73, s: 0.8 },
  { x: 0.78, y: 0.73, s: 0.8 },
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setupAssets() {
  els.bg.style.backgroundImage = `url("${asset("./assets/sakura-bg.png")}")`;
  els.targetImg.src = asset("./assets/matsumura.png");
}

function fitCanvas() {
  const rect = els.game.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  els.canvas.width = Math.round(rect.width * dpr);
  els.canvas.height = Math.round(rect.height * dpr);
  els.canvas.style.width = `${rect.width}px`;
  els.canvas.style.height = `${rect.height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  petalSprites.length = 0;
  buildPetalSprites(rect.width, rect.height);
  drawPetalCover();
  placeTarget();
}

function placeTarget() {
  const rect = els.game.getBoundingClientRect();
  const pick = targetPositions[Math.floor(Math.random() * targetPositions.length)];
  const size = Math.round(62 * pick.s);

  els.target.style.width = `${size}px`;
  els.target.style.left = `${Math.round(rect.width * pick.x - size / 2)}px`;
  els.target.style.top = `${Math.round(rect.height * pick.y - size / 2)}px`;
}

function drawPetalShape(x, y, w, h, rot, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(w / 100, h / 70);
  ctx.globalAlpha = alpha;

  const grad = ctx.createLinearGradient(-40, 0, 45, 0);
  grad.addColorStop(0, "#ff74ae");
  grad.addColorStop(0.45, "#ffd3e5");
  grad.addColorStop(1, "#fff8fc");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-42, 1);
  ctx.bezierCurveTo(-34, -28, 5, -39, 33, -22);
  ctx.bezierCurveTo(56, -8, 54, 20, 27, 31);
  ctx.bezierCurveTo(1, 41, -31, 31, -42, 1);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-34, 1);
  ctx.quadraticCurveTo(-4, -6, 20, -10);
  ctx.stroke();

  ctx.restore();
}

function buildPetalSprites(width, height) {
  for (let i = 0; i < PETAL_COUNT; i++) {
    petalSprites.push({
      x: rand(-20, width + 20),
      y: rand(-10, height + 10),
      w: rand(12, 42),
      h: rand(8, 25),
      rot: rand(-1.3, 1.3),
      alpha: rand(0.55, 0.96),
      blur: Math.random() < 0.22 ? rand(0.4, 1.6) : 0,
    });
  }
}

function drawPetalCover() {
  const width = els.game.clientWidth;
  const height = els.game.clientHeight;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#efd7e1";
  ctx.fillRect(0, 0, width, height);

  for (const p of petalSprites) {
    if (p.blur > 0) {
      ctx.save();
      ctx.filter = `blur(${p.blur}px)`;
      drawPetalShape(p.x, p.y, p.w, p.h, p.rot, p.alpha);
      ctx.restore();
    } else {
      drawPetalShape(p.x, p.y, p.w, p.h, p.rot, p.alpha);
    }
  }

  for (let i = 0; i < NOISE_COUNT; i++) {
    ctx.fillStyle =
      Math.random() > 0.5
        ? "rgba(255,188,214,0.35)"
        : "rgba(255,230,240,0.28)";
    const r = rand(1.5, 5.5);
    ctx.beginPath();
    ctx.arc(rand(0, width), rand(0, height), r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

function eraseAt(x, y, radius) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  const gradient = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0.95)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  revealProgress += radius * 0.00008;
}

function getMicLevel() {
  if (!analyser || !audioData) return 0;

  analyser.getByteTimeDomainData(audioData);

  let sum = 0;
  let peak = 0;
  for (let i = 0; i < audioData.length; i++) {
    const v = Math.abs((audioData[i] - 128) / 128);
    sum += v * v;
    if (v > peak) peak = v;
  }

  const rms = Math.sqrt(sum / audioData.length);

  const raw = rms * 1.8 + peak * 0.8;
  const normalized = (raw - 0.015) * 12;

  return clamp(normalized, 0, 1);
}

async function setupMicrophone() {
  if (microphoneStream) {
    return;
  }

  microphoneStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.75;

  microphoneSource.connect(analyser);
  audioData = new Uint8Array(analyser.frequencyBinCount);
}

function resetState(showIntro = true) {
  cancelAnimationFrame(rafId);
  running = false;
  found = false;
  timeLeft = GAME_TIME;
  breathSmoothed = 0;
  revealProgress = 0;

  els.timer.textContent = GAME_TIME.toFixed(1);
  els.meterFill.style.width = "0%";
  els.result.classList.add("hidden");
  els.target.classList.add("hidden");
  els.target.classList.remove("found");

  if (showIntro) {
    els.intro.classList.remove("hidden");
  } else {
    els.intro.classList.add("hidden");
  }

  fitCanvas();
}

async function startGame() {
  try {
    await setupMicrophone();
    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }
  } catch (error) {
    alert("マイクが使えませんでした。ブラウザでマイク許可を確認してください。");
    return;
  }

  resetState(false);

  els.target.classList.remove("hidden");
  running = true;
  startedAt = performance.now();

  const rect = els.game.getBoundingClientRect();
  scratchX = rect.width * 0.5;
  scratchY = rect.height * 0.55;
  pointerX = scratchX;
  pointerY = scratchY;

  rafId = requestAnimationFrame(loop);
}

function endGame(success) {
  running = false;
  cancelAnimationFrame(rafId);
  els.result.classList.remove("hidden");

  if (success) {
    const used = (GAME_TIME - timeLeft).toFixed(1);
    els.resultTitle.textContent = "見つけた！";
    els.resultText.textContent = `発見まで ${used} 秒`;
  } else {
    els.resultTitle.textContent = "見つからない！";
    els.resultText.textContent = "もっと強くフーして花びらを飛ばそう";
  }
}

function burstAroundTarget() {
  const rect = els.game.getBoundingClientRect();
  const tRect = els.target.getBoundingClientRect();
  const cx = tRect.left - rect.left + tRect.width / 2;
  const cy = tRect.top - rect.top + tRect.height / 2;

  for (let i = 0; i < 18; i++) {
    eraseAt(cx + rand(-48, 48), cy + rand(-48, 48), rand(18, 40));
  }
}

function loop(now) {
  if (!running) return;

  const elapsed = (now - startedAt) / 1000;
  timeLeft = Math.max(0, GAME_TIME - elapsed);
  els.timer.textContent = timeLeft.toFixed(1);

  const level = getMicLevel();
  breathSmoothed += (level - breathSmoothed) * 0.42;
  els.meterFill.style.width = `${Math.min(100, breathSmoothed * 100)}%`;

  const t = elapsed;
  const width = els.game.clientWidth;
  const height = els.game.clientHeight;

  pointerX = width * 0.5 + Math.sin(t * 1.25) * width * 0.16;
  pointerY = height * 0.52 + Math.cos(t * 1.75) * height * 0.14;

  scratchX += (pointerX - scratchX) * 0.12;
  scratchY += (pointerY - scratchY) * 0.12;

  scratchX = clamp(scratchX, 0, width);
  scratchY = clamp(scratchY, 0, height);

  if (breathSmoothed > 0.035) {
    const radius =
      SCRATCH_RADIUS_MIN +
      (SCRATCH_RADIUS_MAX - SCRATCH_RADIUS_MIN) *
        Math.min(1, breathSmoothed * 1.15);

    eraseAt(scratchX + rand(-10, 10), scratchY + rand(-10, 10), radius);

    if (breathSmoothed > 0.12) {
      eraseAt(
        scratchX + rand(-26, 26),
        scratchY + rand(-26, 26),
        radius * rand(0.45, 0.75)
      );
    }
  }

  if (timeLeft <= 0) {
    endGame(false);
    return;
  }

  rafId = requestAnimationFrame(loop);
}

function onTargetClick() {
  if (!running || found) return;
  found = true;
  els.target.classList.add("found");
  burstAroundTarget();
  setTimeout(() => endGame(true), 260);
}

els.startBtn.addEventListener("click", startGame);
els.retryBtn.addEventListener("click", startGame);
els.target.addEventListener("click", onTargetClick);

window.addEventListener("resize", () => {
  fitCanvas();
});

setupAssets();
resetState(true);