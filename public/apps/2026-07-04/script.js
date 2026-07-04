const canvas = document.getElementById("skyCanvas");
const ctx = canvas.getContext("2d");
const playBtn = document.getElementById("playBtn");
const randomBtn = document.getElementById("randomBtn");
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const timingRange = document.getElementById("timingRange");
const timingText = document.getElementById("timingText");
const colorSwatches = document.getElementById("colorSwatches");
const timeline = document.getElementById("timeline");
const countText = document.getElementById("countText");
const hint = document.getElementById("hint");

const palette = [
  "#ff405c",
  "#f8fbff",
  "#3f8cff",
  "#ffdf72",
  "#35d0a4",
  "#c17cff",
];

const sizeMap = {
  small: { radius: 46, particles: 38 },
  medium: { radius: 64, particles: 54 },
  large: { radius: 84, particles: 72 },
};

let fireworks = [];
let rockets = [];
let sparks = [];
let selectedColor = palette[0];
let selectedSize = "medium";
let activeStep = 0;
let playing = false;
let launchTimers = [];
let lastTime = performance.now();
let audioContext = null;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function addFirework(x, y) {
  if (fireworks.length >= 12) {
    pulseHint("12発まで置けます");
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const step = Number(timingRange.value);
  fireworks.push({
    x: clamp(x, 22, rect.width - 22),
    y: clamp(y, 82, rect.height - 58),
    step,
    color: selectedColor,
    size: selectedSize,
  });

  renderUi();
  pulseHint(`${step}番目に打ち上げ`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pulseHint(text) {
  hint.textContent = text;
  hint.classList.remove("hide");
  clearTimeout(pulseHint.timer);
  pulseHint.timer = setTimeout(() => {
    if (fireworks.length > 0) hint.classList.add("hide");
  }, 1300);
}

function renderUi() {
  countText.textContent = fireworks.length;
  timingText.textContent = timingRange.value;

  timeline.innerHTML = "";
  const sorted = [...fireworks].sort((a, b) => a.step - b.step || a.x - b.x);
  sorted.forEach((fw, index) => {
    const item = document.createElement("li");
    item.textContent = fw.step;
    item.style.background = `linear-gradient(180deg, ${fw.color}, rgba(255,255,255,0.1))`;
    if (playing && fw.step === activeStep) item.classList.add("active");
    item.setAttribute("aria-label", `${index + 1}発目`);
    timeline.appendChild(item);
  });
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#050613");
  gradient.addColorStop(0.6, "#111b35");
  gradient.addColorStop(1, "#202b49");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = 0; i < 42; i++) {
    const x = (i * 83) % width;
    const y = 22 + ((i * 47) % Math.max(120, height * 0.5));
    const alpha = 0.25 + ((i % 4) * 0.13);
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  const skylineTop = height - 48;
  ctx.fillStyle = "#090d1d";
  ctx.fillRect(0, skylineTop + 18, width, 30);
  for (let x = 0; x < width; x += 28) {
    const h = 22 + ((x * 7) % 42);
    ctx.fillRect(x, skylineTop + 18 - h, 18, h + 18);
    if (x % 56 === 0) {
      ctx.fillStyle = "rgba(255,223,114,0.78)";
      ctx.fillRect(x + 5, skylineTop + 28 - h, 3, 4);
      ctx.fillStyle = "#090d1d";
    }
  }
}

function drawMarkers() {
  fireworks.forEach((fw) => {
    ctx.save();
    ctx.translate(fw.x, fw.y);
    ctx.strokeStyle = fw.color;
    ctx.fillStyle = fw.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = "900 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(fw.step, 0, -14);
    ctx.restore();
  });
}

function updateScene(delta) {
  rockets = rockets.filter((rocket) => {
    rocket.age += delta;
    const t = Math.min(rocket.age / rocket.duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    rocket.cx = rocket.startX + (rocket.targetX - rocket.startX) * ease;
    rocket.cy = rocket.startY + (rocket.targetY - rocket.startY) * ease;

    if (t >= 1) {
      explode(rocket.targetX, rocket.targetY, rocket.color, rocket.size);
      popSound(rocket.color);
      return false;
    }
    return true;
  });

  sparks = sparks.filter((spark) => {
    spark.age += delta;
    spark.x += spark.vx * delta;
    spark.y += spark.vy * delta;
    spark.vy += 92 * delta;
    spark.vx *= 0.994;
    spark.life -= delta;
    return spark.life > 0;
  });
}

function drawEffects() {
  rockets.forEach((rocket) => {
    ctx.strokeStyle = rocket.color;
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.moveTo(rocket.cx, rocket.cy);
    ctx.lineTo(rocket.cx, rocket.cy + 28);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  sparks.forEach((spark) => {
    const alpha = Math.max(spark.life / spark.maxLife, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function explode(x, y, color, sizeKey) {
  const config = sizeMap[sizeKey];
  for (let i = 0; i < config.particles; i++) {
    const angle = (Math.PI * 2 * i) / config.particles + Math.random() * 0.12;
    const speed = config.radius * (0.82 + Math.random() * 0.72);
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: Math.random() > 0.22 ? color : palette[Math.floor(Math.random() * palette.length)],
      radius: 2.6 + Math.random() * 2.8,
      life: 0.72 + Math.random() * 0.42,
      maxLife: 1.1,
      age: 0,
    });
  }
}

function launch(fw) {
  const rect = canvas.getBoundingClientRect();
  rockets.push({
    startX: fw.x,
    startY: rect.height - 28,
    targetX: fw.x,
    targetY: fw.y,
    cx: fw.x,
    cy: rect.height - 28,
    color: fw.color,
    size: fw.size,
    age: 0,
    duration: 0.55 + Math.random() * 0.16,
  });
}

function playShow() {
  if (!fireworks.length) {
    randomShow();
  }

  launchTimers.forEach(clearTimeout);
  launchTimers = [];
  activeStep = 0;
  playing = true;
  playBtn.textContent = "再生中";
  pulseHint("ショー開始");

  const steps = [...new Set(fireworks.map((fw) => fw.step))].sort((a, b) => a - b);
  steps.forEach((step, index) => {
    const timer = setTimeout(() => {
      activeStep = step;
      fireworks.filter((fw) => fw.step === step).forEach((fw, i) => {
        setTimeout(() => launch(fw), i * 140);
      });
      renderUi();
    }, index * 760);
    launchTimers.push(timer);
  });

  const endTimer = setTimeout(() => {
    activeStep = 0;
    playing = false;
    playBtn.textContent = "再生";
    renderUi();
    pulseHint("もう一度並べてもOK");
  }, steps.length * 760 + 1200);
  launchTimers.push(endTimer);
}

function randomShow() {
  const rect = canvas.getBoundingClientRect();
  fireworks = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    fireworks.push({
      x: rect.width * (0.12 + Math.random() * 0.76),
      y: rect.height * (0.18 + Math.random() * 0.48),
      step: 1 + Math.floor(i / 2),
      color: palette[i % palette.length],
      size: ["small", "medium", "large"][i % 3],
    });
  }
  renderUi();
  pulseHint("自動ショーを作成");
}

function popSound(color) {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const base = color === "#3f8cff" ? 320 : color === "#ffdf72" ? 520 : 430;
    oscillator.frequency.setValueAtTime(base + Math.random() * 120, audioContext.currentTime);
    oscillator.type = "triangle";
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    audioContext = null;
  }
}

function tick(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  const rect = canvas.getBoundingClientRect();
  updateScene(delta);
  drawBackground(rect.width, rect.height);
  drawMarkers();
  drawEffects();
  requestAnimationFrame(tick);
}

function buildSwatches() {
  palette.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.style.background = color;
    button.setAttribute("aria-label", `色 ${color}`);
    if (color === selectedColor) button.classList.add("active");
    button.addEventListener("click", () => {
      selectedColor = color;
      document.querySelectorAll(".swatch").forEach((swatch) => swatch.classList.remove("active"));
      button.classList.add("active");
    });
    colorSwatches.appendChild(button);
  });
}

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  addFirework(point.x, point.y);
});

timingRange.addEventListener("input", renderUi);

document.querySelectorAll(".sizeBtn").forEach((button) => {
  button.addEventListener("click", () => {
    selectedSize = button.dataset.size;
    document.querySelectorAll(".sizeBtn").forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

playBtn.addEventListener("click", playShow);
randomBtn.addEventListener("click", randomShow);
undoBtn.addEventListener("click", () => {
  fireworks.pop();
  renderUi();
  pulseHint(fireworks.length ? "最後の1発を戻しました" : "夜空をタップして花火を置く");
});
clearBtn.addEventListener("click", () => {
  fireworks = [];
  rockets = [];
  sparks = [];
  renderUi();
  pulseHint("クリアしました");
});

window.addEventListener("resize", resize);

buildSwatches();
resize();
renderUi();
requestAnimationFrame(tick);
