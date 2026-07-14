const TOTAL_ROUNDS = 4;
const GAME_DURATION = 40;
const MISS_PENALTY = 2;

const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");
const monitor = document.getElementById("monitor");
const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const roundDisplay = document.getElementById("roundDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const instructionText = document.getElementById("instructionText");
const signalDisplay = document.getElementById("signalDisplay");
const statusLamp = document.getElementById("statusLamp");
const hintButton = document.getElementById("hintButton");
const hintCount = document.getElementById("hintCount");
const hitMarker = document.getElementById("hitMarker");
const ledElements = [...document.querySelectorAll(".meter-leds i")];
const soundButton = document.getElementById("soundButton");

let width = 0;
let height = 0;
let dpr = 1;
let state = "title";
let lastTime = 0;
let timeLeft = GAME_DURATION;
let round = 1;
let score = 0;
let hits = 0;
let misses = 0;
let hintAvailable = true;
let muted = false;
let audioContext = null;
let scanProgress = 0;
let scanDirection = 1;
let flashTimer = 0;
let target = { x: 0, y: 0 };
let cloudGroups = [];
let stars = [];

function resize() {
  const rect = monitor.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === "playing") generateObservation();
  else drawStandby();
}

function showScreen(screen) {
  titleScreen.hidden = screen !== "title";
  gameScreen.hidden = screen !== "game";
  resultScreen.hidden = screen !== "result";
}

function startGame() {
  state = "playing";
  timeLeft = GAME_DURATION;
  round = 1;
  score = 0;
  hits = 0;
  misses = 0;
  hintAvailable = true;
  hintButton.disabled = false;
  hintCount.textContent = "×1";
  showScreen("game");
  resize();
  generateObservation();
  updateHud();
  toneSequence([220, 330, 440], 75);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function generateObservation() {
  const earthRadius = Math.min(width, height) * 0.39;
  const centerX = width * 0.52;
  const centerY = height * 0.47;
  const angle = Math.random() * Math.PI * 2;
  const distance = earthRadius * (0.25 + Math.random() * 0.46);
  target = {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance * 0.78,
  };

  cloudGroups = [];
  for (let i = 0; i < 9 + round * 2; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * earthRadius * 0.88;
    cloudGroups.push({
      x: centerX + Math.cos(a) * r,
      y: centerY + Math.sin(a) * r * 0.78,
      size: 8 + Math.random() * 18,
      stretch: 1.2 + Math.random() * 1.8,
      alpha: 0.18 + Math.random() * 0.32,
    });
  }

  stars = Array.from({ length: 34 }, () => ({ x: Math.random() * width, y: Math.random() * height, a: 0.1 + Math.random() * 0.35 }));
  scanProgress = scanDirection > 0 ? 0 : 1;
  instructionText.textContent = "受信データを走査中...";
  statusLamp.className = "status-lamp";
}

function loop(now) {
  if (state !== "playing") return;
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  timeLeft = Math.max(0, timeLeft - dt);
  if (timeLeft <= 0) return finishGame(false);

  scanProgress += scanDirection * dt * 0.29;
  if (scanProgress >= 1 || scanProgress <= 0) {
    scanProgress = Math.max(0, Math.min(1, scanProgress));
    scanDirection *= -1;
  }
  flashTimer = Math.max(0, flashTimer - dt);
  updateHud();
  drawObservation();
  requestAnimationFrame(loop);
}

function updateHud() {
  roundDisplay.textContent = `${round} / ${TOTAL_ROUNDS}`;
  timeDisplay.textContent = timeLeft.toFixed(1);
  scoreDisplay.textContent = String(score).padStart(4, "0");
  const signal = Math.round(18 + Math.abs(Math.sin(scanProgress * Math.PI)) * 82);
  signalDisplay.textContent = `SIGNAL ${String(signal).padStart(2, "0")}%`;
  const lit = Math.ceil(signal / 12.5);
  ledElements.forEach((led, index) => led.classList.toggle("on", index < lit));
  timeDisplay.style.color = timeLeft < 10 ? "#ed5d4e" : "";
}

function drawStandby() {
  if (!width || !height) return;
  ctx.fillStyle = "#071009";
  ctx.fillRect(0, 0, width, height);
}

function drawObservation() {
  ctx.fillStyle = "#050a07";
  ctx.fillRect(0, 0, width, height);
  stars.forEach(star => {
    ctx.fillStyle = `rgba(182,225,165,${star.a})`;
    ctx.fillRect(star.x, star.y, 1.5, 1.5);
  });

  const radius = Math.min(width, height) * 0.39;
  const cx = width * 0.52;
  const cy = height * 0.47;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const earthGradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.28, radius * 0.1, cx, cy, radius);
  earthGradient.addColorStop(0, "#44634a");
  earthGradient.addColorStop(0.72, "#203b29");
  earthGradient.addColorStop(1, "#0a1710");
  ctx.fillStyle = earthGradient;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  drawGrid(cx, cy, radius);
  drawAbstractLand(cx, cy, radius);
  cloudGroups.forEach(drawCloudGroup);
  drawTyphoon(target.x, target.y, 15 + round * 1.5);

  const scanX = width * scanProgress;
  const veilStart = scanDirection > 0 ? scanX : 0;
  const veilWidth = scanDirection > 0 ? width - scanX : scanX;
  ctx.fillStyle = "rgba(2,9,4,.54)";
  ctx.fillRect(veilStart, 0, veilWidth, height);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "#c8ffab";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(202,255,178,.95)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width * scanProgress, 0);
  ctx.lineTo(width * scanProgress, height);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(150,215,125,.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(197,255,168,${flashTimer * 0.38})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawGrid(cx, cy, radius) {
  ctx.strokeStyle = "rgba(154,210,139,.13)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * (1 - Math.abs(i) * 0.07), radius * (0.18 + Math.abs(i) * 0.1), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * (0.2 + Math.abs(i) * 0.09), radius, i * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAbstractLand(cx, cy, radius) {
  ctx.fillStyle = "rgba(116,150,105,.28)";
  ctx.beginPath();
  ctx.moveTo(cx - radius * .62, cy - radius * .52);
  ctx.bezierCurveTo(cx - radius * .2, cy - radius * .75, cx + radius * .08, cy - radius * .52, cx + radius * .02, cy - radius * .18);
  ctx.bezierCurveTo(cx - radius * .08, cy + radius * .06, cx + radius * .36, cy + radius * .18, cx + radius * .2, cy + radius * .55);
  ctx.bezierCurveTo(cx - radius * .08, cy + radius * .68, cx - radius * .55, cy + radius * .28, cx - radius * .62, cy - radius * .52);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + radius * .48, cy + radius * .35, radius * .2, radius * .09, -.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudGroup(cloud) {
  ctx.save();
  ctx.translate(cloud.x, cloud.y);
  ctx.scale(cloud.stretch, 1);
  ctx.fillStyle = `rgba(210,235,201,${cloud.alpha})`;
  for (let i = 0; i < 5; i += 1) {
    const angle = i * 1.8;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * cloud.size * .65, Math.sin(angle) * cloud.size * .35, cloud.size * (.42 + i * .035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTyphoon(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(228,246,221,.8)";
  ctx.lineCap = "round";
  for (let arm = 0; arm < 4; arm += 1) {
    ctx.beginPath();
    for (let step = 0; step < 38; step += 1) {
      const t = step / 37;
      const angle = arm * Math.PI / 2 + t * Math.PI * 1.45;
      const r = 5 + t * size * 2.8;
      const px = Math.cos(angle) * r * 1.2;
      const py = Math.sin(angle) * r * .72;
      if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = Math.max(2, size * .25 - arm * .35);
    ctx.globalAlpha = .34 - arm * .035;
    ctx.stroke();
  }
  ctx.globalAlpha = .95;
  ctx.fillStyle = "#071009";
  ctx.beginPath();
  ctx.arc(0, 0, 5 + round, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(224,245,216,.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function handleObservation(clientX, clientY) {
  if (state !== "playing") return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const distance = Math.hypot(x - target.x, y - target.y);
  const tolerance = Math.max(24, 42 - round * 3);

  if (distance <= tolerance) {
    hits += 1;
    const accuracyBonus = Math.max(0, Math.round((1 - distance / tolerance) * 400));
    score += 700 + accuracyBonus + Math.round(timeLeft * 6);
    flashTimer = .35;
    showHitMarker(x, y);
    statusLamp.className = "status-lamp locked";
    instructionText.textContent = `台風の目を捕捉！ +${700 + accuracyBonus}`;
    toneSequence([520, 680, 880], 65);
    state = "transition";
    setTimeout(() => {
      if (round >= TOTAL_ROUNDS) return finishGame(true);
      round += 1;
      scanDirection *= -1;
      generateObservation();
      state = "playing";
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }, 750);
  } else {
    misses += 1;
    timeLeft = Math.max(0, timeLeft - MISS_PENALTY);
    instructionText.textContent = `雲の渦ではありません −${MISS_PENALTY}秒`;
    statusLamp.className = "status-lamp alert";
    monitor.classList.remove("error");
    void monitor.offsetWidth;
    monitor.classList.add("error");
    tone(105, .18, .055);
    setTimeout(() => {
      monitor.classList.remove("error");
      if (state === "playing") statusLamp.className = "status-lamp";
    }, 500);
  }
}

function showHitMarker(x, y) {
  hitMarker.style.left = `${x}px`;
  hitMarker.style.top = `${y}px`;
  hitMarker.classList.remove("show");
  void hitMarker.offsetWidth;
  hitMarker.classList.add("show");
}

function useHint() {
  if (!hintAvailable || state !== "playing") return;
  hintAvailable = false;
  hintButton.disabled = true;
  hintCount.textContent = "×0";
  instructionText.textContent = "衛星解析：対象海域を強調中";
  monitor.classList.add("hinting");
  showHitMarker(target.x, target.y);
  tone(740, .12, .035);
  setTimeout(() => monitor.classList.remove("hinting"), 1400);
}

function finishGame(cleared) {
  if (state === "result") return;
  state = "result";
  const timeBonus = cleared ? Math.round(timeLeft * 30) : 0;
  score += timeBonus;
  const rank = hits === TOTAL_ROUNDS && misses === 0 && timeLeft > 18 ? "S" : hits === TOTAL_ROUNDS && misses <= 2 ? "A" : hits >= 3 ? "B" : "C";
  const titles = { S: "宇宙の雲読み名人", A: "一級気象観測員", B: "雲を読む観測員", C: "観測訓練生" };
  document.getElementById("rankBadge").textContent = rank;
  document.getElementById("resultTitle").textContent = titles[rank];
  document.getElementById("finalScore").textContent = String(score).padStart(4, "0");
  document.getElementById("resultSummary").textContent = `${hits}個の台風を捕捉 / 誤報 ${misses}回${timeBonus ? ` / 時間ボーナス +${timeBonus}` : ""}`;
  showScreen("result");
  toneSequence(cleared ? [392, 523, 659, 784] : [220, 165, 110], 110);
}

function tone(frequency, duration, volume = .035) {
  if (muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* 効果音は任意機能 */ }
}

function toneSequence(notes, intervalMs) {
  notes.forEach((note, index) => setTimeout(() => tone(note, .08), index * intervalMs));
}

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("retryButton").addEventListener("click", startGame);
hintButton.addEventListener("click", useHint);
soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
  soundButton.setAttribute("aria-label", muted ? "効果音をオンにする" : "効果音をオフにする");
  if (!muted) tone(440, .07);
});

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  handleObservation(event.clientX, event.clientY);
});
canvas.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && state === "playing") {
    event.preventDefault();
    // キーボード操作では画面中央を観測します。
    const rect = canvas.getBoundingClientRect();
    handleObservation(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
});

window.addEventListener("resize", resize);
document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", event => {
  if (event.target.closest("button, canvas, .monitor")) event.preventDefault();
});

requestAnimationFrame(resize);
