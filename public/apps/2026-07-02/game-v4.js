const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const pearlsEl = document.getElementById("pearls");
const livesEl = document.getElementById("lives");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const soundBtn = document.getElementById("soundBtn");

document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });

const W = canvas.width;
const H = canvas.height;
const laneX = [96, 222, 348, 474, 600, 726];
const playerY = 438;
const dangerY = 382;
const keys = new Set();

let state = "ready";
let score = 0;
let pearls = 0;
let lives = 3;
let lane = 0;
let pearlLane = 5;
let lastMove = 0;
let invincibleUntil = 0;
let startedAt = 0;
let raf = 0;
let audioOn = false;
let audioCtx = null;

const tentacles = laneX.slice(1).map((x, index) => ({
  x,
  lane: index + 1,
  phase: index * 1.17,
  speed: 0.92 + index * 0.11,
  reach: 0,
  warning: false,
  danger: false,
}));

function tentacleForLane(index) {
  return tentacles.find((tentacle) => tentacle.lane === index);
}

function beep(freq, length = 0.06, type = "square") {
  if (!audioOn) return;
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + length);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + length);
}

function resetGame() {
  state = "playing";
  score = 0;
  pearls = 0;
  lives = 3;
  lane = 0;
  pearlLane = 5;
  startedAt = performance.now();
  invincibleUntil = performance.now() + 1000;
  messageEl.textContent = "左端のHOMEは安全。右へ出て真珠を取り、触手の真下を避ける。";
  startBtn.textContent = "RESTART";
  updateHud();
  cancelAnimationFrame(raf);
  loop(performance.now());
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(4, "0");
  pearlsEl.textContent = pearls;
  livesEl.textContent = lives;
}

function move(dir) {
  if (state !== "playing") {
    resetGame();
    return;
  }

  const now = performance.now();
  if (now - lastMove < 105) return;
  lastMove = now;
  lane = Math.max(0, Math.min(laneX.length - 1, lane + dir));
  const tentacle = tentacleForLane(lane);
  messageEl.textContent = lane === 0
    ? "HOMEは安全。触手が引いた列を選んで外へ出る。"
    : tentacle?.danger
      ? "そこは触手の真下。HOMEか隣のSAFE列へ逃げろ。"
      : "赤い列を避けて、光っている真珠の列へ。";
  beep(dir > 0 ? 520 : 390, 0.035);
  collectPearl();
}

function collectPearl() {
  const tentacle = tentacleForLane(lane);
  if (lane !== pearlLane || tentacle?.danger) return;

  pearls += 1;
  score += 300 + pearls * 40;
  pearlLane = pickPearlLane();
  messageEl.textContent = "取った。次の光る列へ。ただし赤い列には入るな。";
  beep(940, 0.09, "triangle");
  updateHud();
}

function pickPearlLane() {
  const safeLanes = tentacles
    .filter((tentacle) => !tentacle.danger && tentacle.lane !== lane)
    .map((tentacle) => tentacle.lane);
  if (safeLanes.length) {
    return safeLanes[Math.floor(Math.random() * safeLanes.length)];
  }
  return Math.max(1, (lane + 2) % laneX.length);
}

function updateTentacles(now) {
  const t = (now - startedAt) / 1000;
  tentacles.forEach((tentacle, index) => {
    const aggression = Math.min(1.35, 1 + pearls * 0.035);
    const wave = (Math.sin(t * tentacle.speed * aggression + tentacle.phase) + 1) / 2;
    const snap = Math.pow(wave, 1.85);
    tentacle.reach = 38 + snap * (300 + index * 10);
    const tip = 112 + tentacle.reach;
    tentacle.warning = tip > dangerY - 72;
    tentacle.danger = tip > dangerY;
  });
}

function crash(now) {
  lives -= 1;
  lane = 0;
  invincibleUntil = now + 1200;
  messageEl.textContent = lives > 0 ? "捕まった。HOMEからやり直し。" : "GAME OVER / タコの勝ち";
  beep(120, 0.18, "sawtooth");
  updateHud();

  if (lives <= 0) {
    state = "over";
    startBtn.textContent = "AGAIN";
  }
}

function drawLCDBackground() {
  ctx.fillStyle = "#b7caa4";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(16, 37, 31, 0.055)";
  for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 2);

  ctx.fillStyle = "#10251f";
  ctx.font = "900 18px monospace";
  ctx.fillText("MOVE UNDER SAFE COLUMNS", 95, 526);

  ctx.strokeStyle = "#10251f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(154, dangerY);
  ctx.lineTo(772, dangerY);
  ctx.stroke();
  ctx.font = "900 13px monospace";
  ctx.fillText("HIT LINE", 724, dangerY + 4);
}

function drawOctopus() {
  const headX = W / 2;
  ctx.fillStyle = "#10251f";
  ctx.beginPath();
  ctx.ellipse(headX, 70, 90, 66, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(headX - 66, 118, 24, 0, Math.PI * 2);
  ctx.arc(headX - 24, 130, 24, 0, Math.PI * 2);
  ctx.arc(headX + 24, 130, 24, 0, Math.PI * 2);
  ctx.arc(headX + 66, 118, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b7caa4";
  ctx.beginPath();
  ctx.arc(headX - 30, 54, 15, 0, Math.PI * 2);
  ctx.arc(headX + 30, 54, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10251f";
  ctx.fillRect(headX - 33, 48, 8, 13);
  ctx.fillRect(headX + 27, 48, 8, 13);
  ctx.strokeStyle = "#b7caa4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(headX, 80, 20, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "#10251f";
  ctx.font = "900 16px monospace";
  ctx.fillText("OCTOPUS", headX - 36, 146);
}

function drawLanes() {
  laneX.forEach((x, index) => {
    const tentacle = tentacleForLane(index);
    ctx.fillStyle = index === 0
      ? "rgba(16, 37, 31, 0.2)"
      : tentacle.danger
      ? "rgba(214, 75, 60, 0.28)"
      : tentacle.warning
        ? "rgba(227, 174, 61, 0.22)"
        : "rgba(16, 37, 31, 0.08)";
    ctx.fillRect(x - 42, 124, 84, 350);

    ctx.strokeStyle = index === lane ? "#10251f" : "rgba(16, 37, 31, 0.28)";
    ctx.lineWidth = index === lane ? 5 : 2;
    ctx.strokeRect(x - 42, 124, 84, 350);

    ctx.fillStyle = tentacle?.danger ? "#d64b3c" : "#10251f";
    ctx.font = "900 15px monospace";
    const label = index === 0 ? "HOME" : tentacle.danger ? "DANGER" : tentacle.warning ? "WAIT" : "SAFE";
    ctx.fillText(label, x - 30, 116);
  });
}

function drawTentacles() {
  ctx.lineCap = "round";
  tentacles.forEach((tentacle, index) => {
    const tip = 112 + tentacle.reach;
    ctx.strokeStyle = tentacle.danger ? "#d64b3c" : "#10251f";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(tentacle.x, 112);
    ctx.quadraticCurveTo(tentacle.x + Math.sin(tentacle.phase) * 22, (112 + tip) / 2, tentacle.x, tip);
    ctx.stroke();

    ctx.fillStyle = "#b7caa4";
    for (let y = 144; y < tip - 18; y += 42) {
      ctx.beginPath();
      ctx.arc(tentacle.x + (index % 2 ? 9 : -9), y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = tentacle.danger ? "#d64b3c" : "#10251f";
    ctx.beginPath();
    ctx.arc(tentacle.x, tip, 17, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPearl() {
  const x = laneX[pearlLane];
  ctx.fillStyle = "#f8f2cf";
  ctx.beginPath();
  ctx.arc(x, playerY + 8, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#10251f";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#10251f";
  ctx.font = "900 12px monospace";
  ctx.fillText("PEARL", x - 20, playerY + 42);
}

function drawPlayer(now) {
  const x = laneX[lane];
  const blink = now < invincibleUntil && Math.floor(now / 90) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = "#10251f";
  ctx.fillRect(x - 18, playerY - 28, 36, 46);
  ctx.fillRect(x - 26, playerY + 12, 52, 15);
  ctx.fillRect(x - 12, playerY + 27, 9, 28);
  ctx.fillRect(x + 4, playerY + 27, 9, 28);
  ctx.fillStyle = "#b7caa4";
  ctx.fillRect(x - 10, playerY - 17, 20, 9);
}

function draw(now) {
  drawLCDBackground();
  drawLanes();
  drawOctopus();
  drawTentacles();
  drawPearl();
  drawPlayer(now);

  if (state !== "playing") {
    ctx.fillStyle = "rgba(16, 37, 31, 0.18)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#10251f";
    ctx.font = "900 56px monospace";
    ctx.textAlign = "center";
    ctx.fillText(state === "over" ? "GAME OVER" : "PRESS START", W / 2, H / 2);
    ctx.textAlign = "left";
  }
}

function loop(now) {
  updateTentacles(now);

  if (keys.has("ArrowLeft") || keys.has("a")) move(-1);
  if (keys.has("ArrowRight") || keys.has("d")) move(1);

  if (state === "playing") {
    score += pearls;
    const tentacle = tentacleForLane(lane);
    if (now > invincibleUntil && tentacle?.danger) {
      crash(now);
    }
    collectPearl();
    updateHud();
  }

  draw(now);
  raf = requestAnimationFrame(loop);
}

startBtn.addEventListener("click", resetGame);
leftBtn.addEventListener("pointerdown", () => move(-1));
rightBtn.addEventListener("pointerdown", () => move(1));
soundBtn.addEventListener("click", () => {
  audioOn = !audioOn;
  soundBtn.textContent = audioOn ? "ON" : "♪";
  beep(660, 0.08, "triangle");
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "a", "d", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === " ") resetGame();
  keys.add(event.key);
});

window.addEventListener("keyup", (event) => keys.delete(event.key));

updateTentacles(performance.now());
draw(performance.now());
