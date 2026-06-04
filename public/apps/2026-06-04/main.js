const mouth = document.getElementById("mouth");
const toothGrid = document.getElementById("toothGrid");
const brush = document.getElementById("brush");
const foamLayer = document.getElementById("foamLayer");
const timeLeftEl = document.getElementById("timeLeft");
const scoreEl = document.getElementById("score");
const paceEl = document.getElementById("pace");
const commentEl = document.getElementById("comment");
const startBtn = document.getElementById("startBtn");
const brushBtn = document.getElementById("brushBtn");
const retryBtn = document.getElementById("retryBtn");
const resultPanel = document.getElementById("resultPanel");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");

const gauges = {
  front: document.getElementById("frontGauge"),
  left: document.getElementById("leftGauge"),
  right: document.getElementById("rightGauge"),
  gum: document.getElementById("gumGauge"),
};

const teeth = [];
const zoneScore = {
  front: 0,
  left: 0,
  right: 0,
  gum: 0,
};

let active = false;
let startedAt = 0;
let lastTick = 0;
let lastMotionAt = 0;
let strokeCount = 0;
let rhythmScore = 0;
let tooHardCount = 0;
let pointerDown = false;
let fallbackLoopId = 0;
let lastBrushX = 50;
let lastBrushY = 52;
let lastDirection = 0;
let lastAccel = 0;
let finished = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => Math.random() * (max - min) + min;

function createTeeth() {
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const tooth = document.createElement("span");
      tooth.className = "tooth";
      tooth.dataset.clean = "0";
      tooth.style.setProperty("--delay", `${(row * 8 + col) * 0.025}s`);
      toothGrid.appendChild(tooth);
      teeth.push({ el: tooth, row, col, clean: 0 });
    }
  }
}

function setBrushPosition(x, y, tilt = 0) {
  lastBrushX = clamp(x, 9, 91);
  lastBrushY = clamp(y, 18, 82);
  brush.style.left = `${lastBrushX}%`;
  brush.style.top = `${lastBrushY}%`;
  brush.style.transform = `translate(-32%, -50%) rotate(${tilt}deg)`;
}

function getZone(x, y) {
  if (y < 33 || y > 67) return "gum";
  if (x < 34) return "left";
  if (x > 66) return "right";
  return "front";
}

function makeFoam(x, y, amount = 1) {
  for (let i = 0; i < amount; i += 1) {
    const foam = document.createElement("i");
    foam.className = "foam";
    foam.style.left = `${clamp(x + random(-6, 6), 4, 96)}%`;
    foam.style.top = `${clamp(y + random(-8, 8), 8, 92)}%`;
    foam.style.setProperty("--size", `${random(8, 18)}px`);
    foam.style.setProperty("--drift", `${random(-18, 18)}px`);
    foamLayer.appendChild(foam);
    setTimeout(() => foam.remove(), 950);
  }
}

function cleanNearbyTeeth(x, y, force) {
  const normalizedCol = (x / 100) * 8;
  const targetRow = y < 50 ? 0 : 1;

  teeth.forEach((tooth) => {
    const dx = Math.abs(tooth.col + 0.5 - normalizedCol);
    const dy = Math.abs(tooth.row - targetRow);
    const reach = force > 8 ? 1.65 : 1.25;

    if (dx <= reach && dy <= 0.75) {
      tooth.clean = clamp(tooth.clean + force * 0.022, 0, 1);
      tooth.el.dataset.clean = tooth.clean > 0.72 ? "1" : tooth.clean > 0.36 ? "0.5" : "0";
      tooth.el.style.setProperty("--shine", tooth.clean.toFixed(2));
    }
  });
}

function addStroke({ x, y, force, direction }) {
  if (!active) return;

  const zone = getZone(x, y);
  const safeForce = clamp(force, 1, 15);
  const directionChanged = direction !== 0 && lastDirection !== 0 && direction !== lastDirection;

  zoneScore[zone] += safeForce * (directionChanged ? 0.22 : 0.12);
  rhythmScore += directionChanged ? 1.4 : 0.34;
  strokeCount += directionChanged ? 1 : 0.35;

  if (safeForce > 11.5) {
    tooHardCount += 1;
    mouth.classList.add("too-hard");
    setTimeout(() => mouth.classList.remove("too-hard"), 150);
  }

  cleanNearbyTeeth(x, y, safeForce);
  makeFoam(x, y, directionChanged ? 2 : 1);
  setBrushPosition(x, y, direction * 10);

  if (direction !== 0) lastDirection = direction;
  lastMotionAt = performance.now();
  updateHud();
}

function updateHud() {
  const elapsed = active ? (performance.now() - startedAt) / 1000 : 0;
  const left = finished ? 0 : active ? clamp(10 - elapsed, 0, 10) : 10;
  const coverage = Object.values(zoneScore).reduce((sum, value) => sum + Math.min(value, 24), 0);
  const cleanAverage = teeth.reduce((sum, tooth) => sum + tooth.clean, 0) / teeth.length;
  const score = Math.round(clamp(coverage * 2.1 + cleanAverage * 34 + rhythmScore - tooHardCount * 1.6, 0, 100));
  const pace = strokeCount < 1 ? "--" : Math.round((strokeCount / Math.max(elapsed, 1)) * 10) / 10;

  timeLeftEl.textContent = left.toFixed(1);
  scoreEl.textContent = String(score);
  paceEl.textContent = typeof pace === "number" ? String(pace) : pace;

  Object.entries(gauges).forEach(([zone, gauge]) => {
    gauge.style.transform = `scaleX(${clamp(zoneScore[zone] / 24, 0, 1)})`;
  });

  if (!active) return;

  const lowestZone = Object.entries(zoneScore).sort((a, b) => a[1] - b[1])[0][0];
  const zoneName = { front: "前歯", left: "左奥", right: "右奥", gum: "歯ぐき" }[lowestZone];
  if (tooHardCount >= 5) {
    commentEl.textContent = "力が強いです。歯ブラシが少し怯えています。";
  } else if (left < 3) {
    commentEl.textContent = "ラストです。みがき残しに追い込みを。";
  } else {
    commentEl.textContent = `${zoneName}がまだ甘めです。そこです。`;
  }
}

function getResult() {
  const values = Object.values(zoneScore);
  const minZone = Math.min(...values);
  const cleanAverage = teeth.reduce((sum, tooth) => sum + tooth.clean, 0) / teeth.length;
  const balance = minZone / Math.max(...values, 1);
  const score = Number(scoreEl.textContent);

  if (score >= 92 && balance > 0.72 && tooHardCount <= 2) {
    return {
      title: "歯ぐきの守護者",
      text: "全体をやさしく行けています。歯科衛生士さんに見せたい手つきです。",
    };
  }

  if (score >= 78 && cleanAverage > 0.68) {
    return {
      title: "前歯の光職人",
      text: "かなり良いです。あと少しだけ奥歯へ旅をしてください。",
    };
  }

  if (tooHardCount >= 7) {
    return {
      title: "歯ブラシ武闘派",
      text: "気合いは満点です。ただ、歯は倒す相手ではありません。",
    };
  }

  if (zoneScore.gum > zoneScore.front + 8) {
    return {
      title: "歯ぐきの風",
      text: "境目への意識が高いです。前歯も少しだけ主役にしてあげてください。",
    };
  }

  if (score >= 56) {
    return {
      title: "奥歯に甘い人",
      text: "雰囲気は合っています。奥のほうに、まだ静かな抵抗勢力がいます。",
    };
  }

  return {
    title: "寝る前にもう一回",
    text: "今日は予選落ちです。口内会議で再審請求してください。",
  };
}

function finish() {
  finished = true;
  updateHud();
  active = false;
  window.cancelAnimationFrame(fallbackLoopId);
  startBtn.disabled = false;
  startBtn.textContent = "診断開始";
  brushBtn.disabled = true;
  timeLeftEl.textContent = "0.0";

  const result = getResult();
  resultTitleEl.textContent = result.title;
  resultTextEl.textContent = result.text;
  resultPanel.classList.remove("hidden");
  commentEl.textContent = "判定が出ました。異議申し立ては、もう一回でお願いします。";
}

function tick(now) {
  if (!active) return;
  updateHud();

  if ((now - startedAt) / 1000 >= 10) {
    finish();
    return;
  }

  fallbackLoopId = window.requestAnimationFrame(tick);
}

function reset() {
  active = false;
  finished = false;
  startedAt = 0;
  lastTick = 0;
  lastMotionAt = 0;
  strokeCount = 0;
  rhythmScore = 0;
  tooHardCount = 0;
  lastDirection = 0;
  lastAccel = 0;
  Object.keys(zoneScore).forEach((key) => {
    zoneScore[key] = 0;
  });
  teeth.forEach((tooth) => {
    tooth.clean = 0;
    tooth.el.dataset.clean = "0";
    tooth.el.style.setProperty("--shine", "0");
  });
  setBrushPosition(50, 52, 0);
  resultPanel.classList.add("hidden");
  brushBtn.disabled = true;
  updateHud();
}

async function requestMotionPermission() {
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    try {
      return (await DeviceMotionEvent.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

async function start() {
  reset();
  active = true;
  startedAt = performance.now();
  lastTick = startedAt;
  startBtn.disabled = true;
  startBtn.textContent = "診断中";
  brushBtn.disabled = false;
  commentEl.textContent = "スマホを細かく振るか、口の中をドラッグしてください。";

  const motionOk = await requestMotionPermission();
  if (!motionOk) {
    commentEl.textContent = "センサーは使えませんでした。ドラッグかボタンでいきましょう。";
  }

  fallbackLoopId = window.requestAnimationFrame(tick);
}

function handleMotion(event) {
  if (!active) return;

  const g = event.accelerationIncludingGravity || event.acceleration;
  if (!g || g.x == null || g.y == null) return;

  const now = performance.now();
  const dt = Math.max((now - lastTick) / 1000, 0.016);
  lastTick = now;

  const accel = Math.hypot(g.x || 0, g.y || 0, g.z || 0);
  const delta = Math.abs(accel - lastAccel);
  lastAccel = accel;

  if (delta < 0.75) return;

  const direction = (g.x || 0) >= 0 ? 1 : -1;
  const wave = Math.sin((now - startedAt) / 240);
  const x = 50 + clamp((g.x || 0) * 5.5, -34, 34);
  const y = 50 + wave * 20 + clamp((g.y || 0) * 1.2, -16, 16);
  addStroke({ x, y, force: clamp(delta * 2.2 + 2 / dt, 2, 15), direction });
}

function getPointerPercent(event) {
  const rect = mouth.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function handlePointerMove(event) {
  if (!active || !pointerDown) return;
  const { x, y } = getPointerPercent(event);
  const direction = x > lastBrushX ? 1 : -1;
  const force = Math.hypot(x - lastBrushX, y - lastBrushY) * 0.55 + 2;
  addStroke({ x, y, force, direction });
}

function manualBrush() {
  if (!active) return;
  const direction = lastDirection === 1 ? -1 : 1;
  const x = clamp(lastBrushX + direction * random(8, 18), 15, 85);
  const y = clamp(lastBrushY + random(-13, 13), 24, 76);
  addStroke({ x, y, force: random(5, 9), direction });
}

createTeeth();
reset();

window.addEventListener("devicemotion", handleMotion, true);

mouth.addEventListener("pointerdown", (event) => {
  if (!active) return;
  pointerDown = true;
  mouth.setPointerCapture(event.pointerId);
  const { x, y } = getPointerPercent(event);
  addStroke({ x, y, force: 4, direction: x > lastBrushX ? 1 : -1 });
});

mouth.addEventListener("pointermove", handlePointerMove);

mouth.addEventListener("pointerup", () => {
  pointerDown = false;
});

mouth.addEventListener("pointercancel", () => {
  pointerDown = false;
});

startBtn.addEventListener("click", start);
retryBtn.addEventListener("click", start);
brushBtn.addEventListener("click", manualBrush);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    manualBrush();
  }
});
