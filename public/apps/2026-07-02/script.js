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

const W = canvas.width;
const H = canvas.height;
const lanes = [95, 175, 255, 335, 415];
const diverX = [115, 240, 365, 490, 615, 750];
const keys = new Set();

let state = "ready";
let score = 0;
let pearls = 0;
let lives = 3;
let pos = 0;
let carrying = false;
let lastMove = 0;
let invincibleUntil = 0;
let startedAt = 0;
let raf = 0;
let audioOn = false;
let audioCtx = null;

const arms = [
  { lane: 0, side: "right", phase: 0.1, speed: 1.18, length: 0 },
  { lane: 1, side: "left", phase: 1.4, speed: 1.34, length: 0 },
  { lane: 2, side: "right", phase: 2.3, speed: 1.52, length: 0 },
  { lane: 3, side: "left", phase: 0.7, speed: 1.42, length: 0 },
  { lane: 4, side: "right", phase: 1.9, speed: 1.65, length: 0 },
  { lane: 2, side: "left", phase: 3.1, speed: 1.08, length: 0 },
];

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
  pos = 0;
  carrying = false;
  startedAt = performance.now();
  invincibleUntil = performance.now() + 900;
  messageEl.textContent = "右で巣へ進む。真珠を取ったら左で船へ戻る。";
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

  pos = Math.max(0, Math.min(diverX.length - 1, pos + dir));
  invincibleUntil = Math.max(invincibleUntil, now + 170);
  beep(dir > 0 ? 520 : 390, 0.035);

  if (!carrying && pos > 0 && pos < diverX.length - 1) {
    messageEl.textContent = "そのまま右へ。巣の前まで行くと真珠を取る。";
  } else if (carrying && pos > 0) {
    messageEl.textContent = "真珠を持った。左へ戻れ。ここからタコ足に捕まる。";
  }

  if (pos === diverX.length - 1 && !carrying) {
    carrying = true;
    score += 120;
    messageEl.textContent = "盗った。帰れ。すぐ帰れ。";
    beep(880, 0.08, "triangle");
  }

  if (pos === 0 && carrying) {
    carrying = false;
    pearls += 1;
    score += 420 + pearls * 35;
    messageEl.textContent = pearls % 3 === 0 ? "タコが明らかに怒っている。" : "納品完了。もう一個いける。";
    beep(1040, 0.1, "triangle");
    updateHud();
  }
}

function hitTest(now) {
  if (!carrying) return false;
  if (now < invincibleUntil || pos === 0 || pos === diverX.length - 1) return false;

  const x = diverX[pos];
  const diverTop = lanes[Math.min(pos - 1, lanes.length - 1)] - 18;
  const diverBottom = diverTop + 62;

  return arms.some((arm) => {
    const y = lanes[arm.lane];
    if (y < diverTop || y > diverBottom) return false;
    const reach = arm.length;
    const tipSize = 86;
    if (arm.side === "left") {
      const tip = 94 + reach;
      return x < 500 && x > tip - tipSize && x < tip + 12;
    }
    const tip = W - 94 - reach;
    return x > 350 && x > tip - 12 && x < tip + tipSize;
  });
}

function crash(now) {
  lives -= 1;
  carrying = false;
  pos = 0;
  invincibleUntil = now + 1300;
  messageEl.textContent = lives > 0 ? "捕まった。真珠は没収。" : "海底勤務、終了。";
  beep(120, 0.18, "sawtooth");
  updateHud();

  if (lives <= 0) {
    state = "over";
    const rank = score >= 3600 ? "伝説の真珠泥棒" : score >= 2200 ? "まあまあ悪い潜水夫" : "タコの見習い";
    messageEl.textContent = `GAME OVER / ${rank}`;
    startBtn.textContent = "AGAIN";
  }
}

function drawLCDBackground() {
  ctx.fillStyle = "#b7caa4";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(16, 37, 31, 0.055)";
  for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 2);

  ctx.strokeStyle = "rgba(16, 37, 31, 0.16)";
  ctx.lineWidth = 3;
  for (const y of lanes) {
    ctx.beginPath();
    ctx.moveTo(90, y + 50);
    ctx.lineTo(795, y + 50);
    ctx.stroke();
  }

  ctx.fillStyle = "#10251f";
  ctx.font = "900 18px monospace";
  ctx.fillText("GO RIGHT: STEAL", 118, 530);
  ctx.fillText("GO LEFT: ESCAPE", 540, 530);
  ctx.beginPath();
  ctx.moveTo(296, 524);
  ctx.lineTo(382, 524);
  ctx.lineTo(364, 512);
  ctx.moveTo(604, 524);
  ctx.lineTo(518, 524);
  ctx.lineTo(536, 512);
  ctx.strokeStyle = "#10251f";
  ctx.lineWidth = 7;
  ctx.stroke();
}

function drawCave() {
  ctx.fillStyle = "#5a6d55";
  ctx.fillRect(0, 0, 84, H);
  ctx.fillRect(W - 84, 0, 84, H);
  ctx.fillStyle = "#10251f";
  ctx.font = "900 24px monospace";
  ctx.fillText("BOAT", 18, 54);
  ctx.fillText("DEN", W - 66, 54);

  ctx.fillStyle = "#10251f";
  ctx.beginPath();
  ctx.arc(W - 42, 278, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b7caa4";
  ctx.beginPath();
  ctx.arc(W - 56, 256, 14, 0, Math.PI * 2);
  ctx.arc(W - 24, 256, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10251f";
  ctx.fillRect(W - 57, 251, 7, 12);
  ctx.fillRect(W - 25, 251, 7, 12);
}

function drawArms(t) {
  ctx.lineCap = "round";
  arms.forEach((arm, index) => {
    const danger = 0.5 + pearls * 0.035;
    const wave = (Math.sin(t * arm.speed + arm.phase) + 1) / 2;
    arm.length = 42 + Math.pow(wave, 1.35) * (300 + index * 10 + danger * 32);
    const y = lanes[arm.lane] + 20;
    const fromX = arm.side === "left" ? 86 : W - 86;
    const toX = arm.side === "left" ? fromX + arm.length : fromX - arm.length;

    ctx.strokeStyle = "#10251f";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.quadraticCurveTo((fromX + toX) / 2, y + Math.sin(t * 2 + index) * 28, toX, y);
    ctx.stroke();

    ctx.fillStyle = "#b7caa4";
    for (let i = 42; i < arm.length - 20; i += 46) {
      const dotX = arm.side === "left" ? fromX + i : fromX - i;
      ctx.beginPath();
      ctx.arc(dotX, y + 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawDiver(now) {
  const x = diverX[pos];
  const y = pos === 0 ? 454 : pos === diverX.length - 1 ? 112 : lanes[pos - 1] + 20;
  const blink = now < invincibleUntil && Math.floor(now / 90) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = "#10251f";
  ctx.fillRect(x - 17, y - 18, 34, 42);
  ctx.fillRect(x - 24, y + 18, 48, 14);
  ctx.fillRect(x - 11, y + 32, 8, 30);
  ctx.fillRect(x + 4, y + 32, 8, 30);
  ctx.fillStyle = "#b7caa4";
  ctx.fillRect(x - 10, y - 8, 20, 9);

  if (carrying) {
    ctx.fillStyle = "#f8f2cf";
    ctx.beginPath();
    ctx.arc(x + 27, y - 8, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10251f";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawTreasure() {
  ctx.fillStyle = "#10251f";
  ctx.fillRect(W - 158, 432, 86, 52);
  ctx.fillStyle = "#f8f2cf";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(W - 142 + i * 16, 425 + (i % 2) * 8, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw(now) {
  const elapsed = (now - startedAt) / 1000;
  drawLCDBackground();
  drawCave();
  drawTreasure();
  drawArms(elapsed);
  drawDiver(now);

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
  if (keys.has("ArrowLeft") || keys.has("a")) move(-1);
  if (keys.has("ArrowRight") || keys.has("d")) move(1);

  if (state === "playing") {
    score += Math.max(0, pearls);
    if (hitTest(now)) crash(now);
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

draw(performance.now());
