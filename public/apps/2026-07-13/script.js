const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameArea = document.getElementById("gameArea");
const briefing = document.getElementById("briefing");
const countdown = document.getElementById("countdown");
const countdownNumber = document.getElementById("countdownNumber");
const result = document.getElementById("result");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const distanceEl = document.getElementById("distance");
const objectiveEl = document.getElementById("objective");
const soundButton = document.getElementById("soundButton");

let width = 0;
let height = 0;
let dpr = 1;
let state = "briefing";
let lastTime = 0;
let timeLeft = 60;
let minDistance = Infinity;
let targetSide = 1;
let dataCollected = false;
let muted = false;
let audioContext = null;
let pointerStartX = null;
let fanTimer = 5;
let fanForce = 0;
let sparkles = [];

const input = { up: false, down: false, left: false, right: false };
const agent = { x: 0, y: 58, vx: 0, vy: 0, angle: 0, angularVelocity: 0 };

function resize() {
  const rect = gameArea.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state !== "playing") agent.x = width / 2;
}

function resetGame() {
  state = "countdown";
  timeLeft = 60;
  minDistance = Infinity;
  dataCollected = false;
  targetSide = Math.random() > .5 ? 1 : -1;
  fanTimer = 4 + Math.random() * 2;
  fanForce = 0;
  sparkles = [];
  Object.assign(agent, { x: width / 2, y: 58, vx: 0, vy: 0, angle: 0, angularVelocity: 0 });
  Object.keys(input).forEach(key => { input[key] = false; });
  result.hidden = true;
  countdown.hidden = false;
  countdown.classList.remove("burn");
  statusEl.textContent = "BRIEFING";
  objectiveEl.textContent = "MEMORIZE THE MISSION";
  distanceEl.textContent = "—";
  timerEl.textContent = "60.0";

  let count = 5;
  countdownNumber.textContent = count;
  tone(440, .05, .025);
  const id = setInterval(() => {
    count -= 1;
    countdownNumber.textContent = Math.max(0, count);
    if (count > 0) tone(440 + (5 - count) * 55, .05, .025);
    if (count <= 0) {
      clearInterval(id);
      countdown.classList.add("burn");
      tone(180, .18, .05);
      setTimeout(() => {
        countdown.hidden = true;
        countdown.classList.remove("burn");
        state = "playing";
        statusEl.textContent = "INFILTRATING";
        objectiveEl.textContent = "DESCEND / STEAL THE DATA";
      }, 420);
    }
  }, 700);
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
  } catch { /* audio is optional */ }
}

function playerDimensions() {
  return { bodyW: 16, bodyH: 46, headR: 9, reach: 28 };
}

function terminalPosition() {
  return { x: width / 2 + targetSide * Math.min(width * .31, 128), y: height - 70 };
}

function update(dt) {
  if (state !== "playing") return;
  timeLeft -= dt;
  if (timeLeft <= 0) return finish(false, "時間切れ。", "警備システムが再起動した。");

  fanTimer -= dt;
  if (fanTimer <= 0) {
    fanForce = (Math.random() > .5 ? 1 : -1) * (28 + Math.random() * 22);
    fanTimer = 5 + Math.random() * 4;
    setTimeout(() => { fanForce = 0; }, 1200);
    tone(95, .28, .018);
  }

  const vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const descendAccel = vertical > 0 ? 52 : vertical < 0 ? -68 : -agent.vy * 3.8;
  agent.vy += descendAccel * dt;
  agent.vy = Math.max(-82, Math.min(64, agent.vy));
  agent.y += agent.vy * dt;

  agent.vx += (horizontal * 105 + fanForce - agent.vx * 2.4) * dt;
  agent.vx = Math.max(-70, Math.min(70, agent.vx));
  agent.x += agent.vx * dt;
  agent.x = Math.max(38, Math.min(width - 38, agent.x));

  const targetAngle = agent.vx * .0055;
  agent.angularVelocity += ((targetAngle - agent.angle) * 13 - agent.angularVelocity * 4.2) * dt;
  agent.angle += agent.angularVelocity * dt;
  agent.y = Math.max(48, agent.y);

  const dims = playerDimensions();
  const lowest = agent.y + dims.bodyH + dims.headR;
  const floorY = height - 25;
  const floorDistance = floorY - lowest;
  minDistance = Math.min(minDistance, floorDistance);
  distanceEl.textContent = `${Math.max(0, floorDistance).toFixed(0)}cm`;
  distanceEl.style.color = floorDistance < 38 ? "#ff463f" : "";

  const terminal = terminalPosition();
  const handX = agent.x + Math.sin(agent.angle) * dims.reach + targetSide * 17;
  const handY = agent.y + 39;
  const nearTerminal = Math.hypot(handX - terminal.x, handY - terminal.y) < 52;
  if (!dataCollected && nearTerminal) {
    dataCollected = true;
    sparkles = Array.from({ length: 18 }, () => ({ x: terminal.x, y: terminal.y, vx: (Math.random() - .5) * 90, vy: -Math.random() * 80, life: 1 }));
    statusEl.textContent = "DATA SECURED";
    objectiveEl.textContent = "DATA SECURED / RETURN TO CEILING";
    tone(880, .18, .05);
  }

  sparkles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.8; });
  sparkles = sparkles.filter(p => p.life > 0);

  if (floorDistance <= 0) finish(false, "接触を検知。", "床のセンサーが作動した。");
  if (dataCollected && agent.y <= 52) finish(true, "痕跡なし。", "機密データを回収し、誰にも見つからず脱出した。");

  timerEl.textContent = Math.max(0, timeLeft).toFixed(1);
}

function finish(success, title, message) {
  if (state !== "playing") return;
  state = success ? "complete" : "failed";
  Object.keys(input).forEach(key => { input[key] = false; });
  document.body.classList.toggle("alarm", !success);
  document.getElementById("resultKicker").textContent = success ? "MISSION COMPLETE" : "MISSION FAILED";
  document.getElementById("resultKicker").style.color = success ? "#c9ff42" : "#ff463f";
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultText").textContent = message;
  document.getElementById("closestStat").textContent = Number.isFinite(minDistance) ? `${Math.max(0, minDistance).toFixed(0)}cm` : "—";
  document.getElementById("timeStat").textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
  statusEl.textContent = success ? "EXTRACTED" : "COMPROMISED";
  tone(success ? 740 : 120, success ? .4 : .6, .06);
  setTimeout(() => {
    result.hidden = false;
    document.body.classList.remove("alarm");
  }, 420);
}

function drawRoom() {
  const floorY = height - 25;
  ctx.fillStyle = "#dfe5e1";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(41,55,49,.11)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 34) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, floorY); ctx.stroke();
  }
  for (let y = 18; y < floorY; y += 34) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  ctx.fillStyle = "#0d1314";
  ctx.fillRect(0, 0, width, 24);
  ctx.fillStyle = "#293331";
  ctx.fillRect(width / 2 - 50, 0, 100, 13);
  ctx.fillStyle = "#819089";
  for (let x = width / 2 - 42; x < width / 2 + 43; x += 12) ctx.fillRect(x, 4, 7, 2);

  ctx.fillStyle = "#111819";
  ctx.fillRect(0, floorY, width, 25);
  ctx.strokeStyle = "rgba(255,70,63,.6)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(width, floorY); ctx.stroke();
  for (let x = -height; x < width; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x + 30, floorY); ctx.stroke();
  }

  ctx.fillStyle = "rgba(20,28,27,.8)";
  ctx.font = "700 9px ui-monospace, monospace";
  ctx.fillText("THERMAL / PRESSURE SENSITIVE FLOOR", 12, floorY - 9);

  const fanOn = Math.abs(fanForce) > 0;
  ctx.save();
  ctx.translate(fanForce > 0 ? 22 : width - 22, height * .42);
  ctx.scale(fanForce > 0 ? 1 : -1, 1);
  ctx.strokeStyle = fanOn ? "#ff463f" : "#6e7a74";
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -24, 20, 48);
  if (fanOn) {
    ctx.globalAlpha = .35;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(15, -16 + i * 11); ctx.lineTo(70, -16 + i * 11); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTerminal() {
  const terminal = terminalPosition();
  ctx.save();
  ctx.translate(terminal.x, terminal.y);
  ctx.fillStyle = "#182020";
  ctx.fillRect(-27, -17, 54, 34);
  ctx.strokeStyle = dataCollected ? "#51605a" : "#c9ff42";
  ctx.lineWidth = 2;
  ctx.strokeRect(-27, -17, 54, 34);
  ctx.fillStyle = dataCollected ? "#303b37" : "#c9ff42";
  ctx.fillRect(-16, -6, 32, 12);
  ctx.fillStyle = "#111";
  ctx.font = "700 6px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(dataCollected ? "EMPTY" : "DATA", 0, -1);
  ctx.restore();
}

function drawAgent() {
  const top = 18;
  ctx.save();
  ctx.strokeStyle = "#121718";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(width / 2, top); ctx.lineTo(agent.x, agent.y - 12); ctx.stroke();

  ctx.translate(agent.x, agent.y);
  ctx.rotate(agent.angle);
  ctx.fillStyle = "#0b1011";
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-8, 8, 16, 43);
  ctx.fillStyle = "#20292a";
  ctx.fillRect(-9, 16, 18, 8);
  ctx.strokeStyle = "#0b1011";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, 18); ctx.lineTo(-22, 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, 18); ctx.lineTo(22 * targetSide, 43); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 49); ctx.lineTo(-13, 66); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 49); ctx.lineTo(13, 66); ctx.stroke();
  ctx.fillStyle = "#c9ff42";
  ctx.fillRect(-5, 27, 10, 4);
  ctx.restore();

  sparkles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = "#c9ff42";
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawRoom();
  drawTerminal();
  drawAgent();
}

function frame(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, .033);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function setControl(name, value, button) {
  if (!(name in input)) return;
  input[name] = value;
  button?.classList.toggle("active", value);
}

document.querySelectorAll("[data-control]").forEach(button => {
  const name = button.dataset.control;
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    setControl(name, true, button);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
    button.addEventListener(type, () => setControl(name, false, button));
  });
});

gameArea.addEventListener("pointerdown", event => {
  if (state !== "playing" || event.target !== canvas) return;
  event.preventDefault();
  pointerStartX = event.clientX;
  input.down = true;
  gameArea.setPointerCapture?.(event.pointerId);
});
gameArea.addEventListener("pointermove", event => {
  if (pointerStartX === null || state !== "playing") return;
  event.preventDefault();
  const delta = event.clientX - pointerStartX;
  input.left = delta < -12;
  input.right = delta > 12;
});
function releaseGamePointer() {
  pointerStartX = null;
  input.down = false;
  input.left = false;
  input.right = false;
}
gameArea.addEventListener("pointerup", releaseGamePointer);
gameArea.addEventListener("pointercancel", releaseGamePointer);

const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
window.addEventListener("keydown", event => { if (keyMap[event.key]) { event.preventDefault(); input[keyMap[event.key]] = true; } });
window.addEventListener("keyup", event => { if (keyMap[event.key]) input[keyMap[event.key]] = false; });

document.getElementById("startButton").addEventListener("click", () => {
  briefing.hidden = true;
  resetGame();
});
document.getElementById("retryButton").addEventListener("click", resetGame);
soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
});

document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", event => {
  if (event.target.closest("button, canvas, .game-area")) event.preventDefault();
});
document.addEventListener("dragstart", event => event.preventDefault());
window.addEventListener("blur", () => Object.keys(input).forEach(key => { input[key] = false; }));
window.addEventListener("resize", resize);

resize();
requestAnimationFrame(frame);
