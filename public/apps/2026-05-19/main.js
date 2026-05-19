const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const timeText = document.getElementById("timeText");
const hardText = document.getElementById("hardText");
const flatText = document.getElementById("flatText");

const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const trowel = document.getElementById("trowel");

const GAME_TIME = 26;
const GRID = 44;
const TARGET = 0.5;
const SCORE_MARGIN = 2; // 端の初期段差はスコアから除外（見た目はそのまま）

// draw() のローラー跡・CSS見た目と同じ寸法（キャンバスCSS px）
const ROLLER_LEN = 92;
const ROLLER_THICK = 34;
const ROLLER_HALF_LEN = ROLLER_LEN / 2;
const ROLLER_HALF_THICK = ROLLER_THICK / 2;

let heights = [];
let worked = [];
let stones = [];
let bubbles = [];
let strokes = [];
let running = false;
let startedAt = 0;
let lastFrame = 0;
let pointerDown = false;
let lastPointer = null;
let flatness = 0;
let rawFlatness = 0;
let hardness = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function initField() {
  heights = [];
  worked = [];

  for (let y = 0; y < GRID; y++) {
    const row = [];
    const workRow = [];

    for (let x = 0; x < GRID; x++) {
      const edge =
        x < 3 || y < 3 || x > GRID - 4 || y > GRID - 4
          ? rand(-0.08, 0.14)
          : 0;

      const wave =
        Math.sin(x * 0.55 + y * 0.21) * 0.06 +
        Math.cos(y * 0.5) * 0.04;

      row.push(clamp(TARGET + rand(-0.18, 0.18) + wave + edge, 0, 1));
      workRow.push(0);
    }

    heights.push(row);
    worked.push(workRow);
  }

  stones = Array.from({ length: 10 }, () => ({
    x: rand(0.08, 0.92),
    y: rand(0.12, 0.9),
    r: rand(0.012, 0.022),
    buried: rand(0.38, 0.65),
  }));

  bubbles = Array.from({ length: 15 }, () => ({
    x: rand(0.08, 0.92),
    y: rand(0.1, 0.9),
    r: rand(0.01, 0.025),
    popped: false,
  }));

  strokes = [];
  hardness = 0;
  flatness = 0;
  rawFlatness = 0;
  updateStatus(GAME_TIME);
}

function updateStatus(timeLeft) {
  timeText.textContent = timeLeft.toFixed(1);
  hardText.textContent = `${Math.round(hardness * 100)}%`;
  flatText.textContent = `${Math.round(flatness)}%`;
}

function getGameRect() {
  return canvas.getBoundingClientRect();
}

function getCanvasPoint(e) {
  const rect = getGameRect();
  const source = e.touches?.[0] || e.changedTouches?.[0] || e;

  return {
    x: source.clientX - rect.left,
    y: source.clientY - rect.top,
    w: rect.width,
    h: rect.height,
    rect,
  };
}

function smoothAt(px, py, rect = getGameRect(), dragAngle = -0.25) {
  const nx = px / rect.width;
  const ny = py / rect.height;

  const cx = nx * (GRID - 1);
  const cy = ny * (GRID - 1);

  const cellW = rect.width / GRID;
  const cellH = rect.height / GRID;
  const cos = Math.cos(dragAngle);
  const sin = Math.sin(dragAngle);

  const bound = Math.ceil(Math.max(ROLLER_HALF_LEN / cellW, ROLLER_HALF_THICK / cellH)) + 2;
  const basePower = 0.34 * (1 - hardness) + 0.042;

  for (let gy = Math.floor(cy - bound); gy <= Math.ceil(cy + bound); gy++) {
    for (let gx = Math.floor(cx - bound); gx <= Math.ceil(cx + bound); gx++) {
      if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;

      const pixelDx = (gx - cx) * cellW;
      const pixelDy = (gy - cy) * cellH;
      const along = pixelDx * cos + pixelDy * sin;
      const across = -pixelDx * sin + pixelDy * cos;
      const dist = Math.sqrt(
        (along / ROLLER_HALF_LEN) ** 2 + (across / ROLLER_HALF_THICK) ** 2
      );

      if (dist > 1) continue;

      const influence = (1 - dist) * basePower;
      const current = heights[gy][gx];

      worked[gy][gx] += influence * 0.55;

      const overwork = Math.max(0, worked[gy][gx] - 2.8);

      if (overwork > 0) {
        const raw =
          Math.sin(gx * 12.9898 + gy * 78.233 + worked[gy][gx] * 8.3) * 43758.5453;

        const scratch = raw - Math.floor(raw);
        const roughness = (scratch - 0.5) * overwork * 0.006;

        heights[gy][gx] = clamp(
          current + roughness + (TARGET - current) * influence * 0.85,
          0,
          1
        );
      } else {
        heights[gy][gx] = current + (TARGET - current) * influence;
      }
    }
  }

  for (const bubble of bubbles) {
    if (bubble.popped) continue;

    const pixelDx = (bubble.x - nx) * rect.width;
    const pixelDy = (bubble.y - ny) * rect.height;
    const along = pixelDx * cos + pixelDy * sin;
    const across = -pixelDx * sin + pixelDy * cos;
    const d = Math.sqrt(
      (along / ROLLER_HALF_LEN) ** 2 + (across / ROLLER_HALF_THICK) ** 2
    );

    if (d < 1) {
      bubble.popped = true;
    }
  }

  for (const stone of stones) {
    const pixelDx = (stone.x - nx) * rect.width;
    const pixelDy = (stone.y - ny) * rect.height;
    const along = pixelDx * cos + pixelDy * sin;
    const across = -pixelDx * sin + pixelDy * cos;
    const d = Math.sqrt(
      (along / ROLLER_HALF_LEN) ** 2 + (across / ROLLER_HALF_THICK) ** 2
    );

    if (d < 0.85) {
      stone.buried = clamp(stone.buried + 0.045 * (1 - hardness), 0, 1);
    }
  }

  strokes.push({
    x: nx,
    y: ny,
    life: 1,
    angle: dragAngle,
  });

  if (strokes.length > 90) strokes.shift();
}

function calcFlatness() {
  let diff = 0;
  let cells = 0;

  for (let y = SCORE_MARGIN; y < GRID - SCORE_MARGIN; y++) {
    for (let x = SCORE_MARGIN; x < GRID - SCORE_MARGIN; x++) {
      diff += Math.abs(heights[y][x] - TARGET);
      cells++;
    }
  }

  const avgDiff = diff / cells;

  const surfaceScore = clamp(100 - avgDiff * 165, 0, 100);

  const bubblePenalty = bubbles.filter((b) => !b.popped).length * 0.08;

  const stonePenalty = stones.reduce((sum, s) => {
    return sum + (1 - s.buried) * 0.08;
  }, 0);

  const raw = clamp(surfaceScore - bubblePenalty - stonePenalty, 0, 100);
  let score = Math.round(raw);

  if (raw >= 95) {
    score = 100;
  }

  rawFlatness = raw;
  flatness = score;
  return score;
}

function draw() {
  if (!ctx || !heights.length) return;

  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const cellW = w / GRID;
  const cellH = h / GRID;

  ctx.clearRect(0, 0, w, h);

  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#77736d");
  grd.addColorStop(0.55, "#5e5d59");
  grd.addColorStop(1, "#464643");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = heights[y][x];
      const shade = Math.round(88 + (v - TARGET) * 125);
      const alpha = 0.42 + Math.abs(v - TARGET) * 0.45;

      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
      ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
    }
  }

  ctx.save();

  for (const s of strokes) {
    const x = s.x * w;
    const y = s.y * h;
    const len = ROLLER_LEN;
    const thick = ROLLER_THICK;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.angle);

    const g = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
    g.addColorStop(0, `rgba(220, 218, 210, ${0.06 * s.life})`);
    g.addColorStop(0.5, `rgba(235, 233, 226, ${0.14 * s.life})`);
    g.addColorStop(1, `rgba(60, 60, 58, ${0.05 * s.life})`);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -thick / 2, len, thick, 17);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  for (const bubble of bubbles) {
    if (bubble.popped) continue;

    const x = bubble.x * w;
    const y = bubble.y * h;
    const r = bubble.r * Math.min(w, h);

    ctx.beginPath();
    ctx.fillStyle = "rgba(36, 36, 34, 0.42)";
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(230,230,220,0.24)";
    ctx.lineWidth = 1.5;
    ctx.arc(x - r * 0.15, y - r * 0.18, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const stone of stones) {
    const x = stone.x * w;
    const y = stone.y * h;
    const r = stone.r * Math.min(w, h);
    const alpha = 0.7 * (1 - stone.buried);

    if (alpha <= 0.03) continue;

    ctx.beginPath();
    ctx.fillStyle = `rgba(60, 54, 48, ${alpha})`;
    ctx.ellipse(x, y, r * 1.2, r * 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.18})`;
    ctx.ellipse(x - r * 0.25, y - r * 0.22, r * 0.45, r * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.24)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function updateTrowel(point, visible) {
  if (!visible || !point) {
    trowel.style.opacity = 0;
    return;
  }

  const dx = lastPointer ? point.x - lastPointer.x : 1;
  const dy = lastPointer ? point.y - lastPointer.y : 0;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  trowel.style.opacity = 1;
  trowel.style.transform = `translate(${point.x - 52}px, ${point.y - 23}px) rotate(${angle}deg)`;
}

function startGame() {
  initField();
  running = true;
  pointerDown = false;
  lastPointer = null;
  startedAt = performance.now();
  lastFrame = startedAt;

  startPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");

  requestAnimationFrame(loop);
}

function finishGame() {
  running = false;
  pointerDown = false;
  updateTrowel(null, false);

  calcFlatness();
  const result = getResult(rawFlatness);

  resultTitle.textContent = result.title;
  resultText.textContent = result.text;
  resultPanel.classList.remove("hidden");

  draw();
}

function getResult(score) {
  if (score >= 92) {
    return {
      title: "左官の神",
      text: "ほぼ鏡面。ここまでくると、もうセメント側が緊張しています。",
    };
  }

  if (score >= 80) {
    return {
      title: "現場で褒められる人",
      text: "かなりきれいです。端も中央もだいたい整っています。",
    };
  }

  if (score >= 65) {
    return {
      title: "まあまあ職人",
      text: "多少のムラはありますが、作業としては成立しています。",
    };
  }

  if (score >= 42) {
    return {
      title: "足跡つけた？",
      text: "平らにした形跡はあります。形跡はあります。",
    };
  }

  return {
    title: "これはやり直し",
    text: "ならす前より、気持ちが入ったぶん複雑になりました。",
  };
}

function loop(now) {
  if (!running) return;

  const elapsed = (now - startedAt) / 1000;
  const timeLeft = Math.max(0, GAME_TIME - elapsed);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);

  lastFrame = now;
  const t = clamp(elapsed / GAME_TIME, 0, 1);
  hardness = clamp(t * t * 1.0, 0, 1);

  for (const s of strokes) {
    s.life = Math.max(0, s.life - dt * 0.95);
  }

  strokes = strokes.filter((s) => s.life > 0.02);

  calcFlatness();
  updateStatus(timeLeft);
  draw();

  if (timeLeft <= 0) {
    finishGame();
    return;
  }

  requestAnimationFrame(loop);
}

function handlePointerStart(e) {
  if (!running) return;

  e.preventDefault();

  pointerDown = true;
  const p = getCanvasPoint(e);
  lastPointer = p;

  smoothAt(p.x, p.y, p.rect, -0.25);
  updateTrowel(p, true);
}

function handlePointerMove(e) {
  if (!running || !pointerDown) return;

  e.preventDefault();

  const p = getCanvasPoint(e);

  if (lastPointer) {
    const dx = p.x - lastPointer.x;
    const dy = p.y - lastPointer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dragAngle = Math.atan2(dy, dx);
    const stepPx = Math.max(ROLLER_HALF_THICK * 0.32, 4);
    const steps = Math.max(1, Math.ceil(dist / stepPx));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = lastPointer.x + dx * t;
      const y = lastPointer.y + dy * t;
      smoothAt(x, y, p.rect, dragAngle);
    }
  } else {
    smoothAt(p.x, p.y, p.rect, -0.25);
  }

  updateTrowel(p, true);
  lastPointer = p;
}

function handlePointerEnd(e) {
  if (!running) return;

  e.preventDefault();

  pointerDown = false;
  lastPointer = null;
  updateTrowel(null, false);
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

canvas.addEventListener("pointerdown", handlePointerStart, { passive: false });
canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
canvas.addEventListener("pointerup", handlePointerEnd, { passive: false });
canvas.addEventListener("pointercancel", handlePointerEnd, { passive: false });
canvas.addEventListener("pointerleave", handlePointerEnd, { passive: false });

window.addEventListener("resize", resizeCanvas);

document.addEventListener(
  "touchmove",
  (e) => {
    if (running) e.preventDefault();
  },
  { passive: false }
);

initField();
resizeCanvas();