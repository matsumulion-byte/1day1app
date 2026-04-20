const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: true });

const timeText = document.getElementById("timeText");
const coverText = document.getElementById("coverText");
const missText = document.getElementById("missText");

const startOverlay = document.getElementById("startOverlay");
const resultOverlay = document.getElementById("resultOverlay");
const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");

const resultRank = document.getElementById("resultRank");
const resultScore = document.getElementById("resultScore");
const resultCover = document.getElementById("resultCover");
const resultBalance = document.getElementById("resultBalance");
const resultMiss = document.getElementById("resultMiss");

const panImg = new Image();
panImg.src = asset("./assets/pan.png");

const JAM_COLOR = "#c92f4f";
const JAM_SHINE = "rgba(255, 215, 225, 0.28)";
const GAME_TIME = 15;

let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let viewW = 0;
let viewH = 0;

let isPlaying = false;
let isPointerDown = false;
let lastTime = 0;
let elapsed = 0;

let breadRect = null;
let playableRect = null;

let paintCanvas = document.createElement("canvas");
let paintCtx = paintCanvas.getContext("2d", { willReadFrequently: true });

let strokePoints = [];
let drips = [];
let sparkle = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  viewW = Math.max(1, Math.round(rect.width));
  viewH = Math.max(1, Math.round(rect.height));
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  paintCanvas.width = viewW;
  paintCanvas.height = viewH;
  paintCtx = paintCanvas.getContext("2d", { willReadFrequently: true });

  layoutBread();
  drawFrame();
}

function layoutBread() {
  const maxW = viewW * 0.86;
  const maxH = viewH * 0.74;
  const imgRatio = 1; // 今回ほぼ正方形前提
  let w = maxW;
  let h = w / imgRatio;

  if (h > maxH) {
    h = maxH;
    w = h * imgRatio;
  }

  const x = (viewW - w) / 2;
  const y = viewH * 0.14;

  breadRect = { x, y, w, h };

  // 見た目より少し内側を「きれいにぬるべき範囲」にする
  playableRect = {
    x: x + w * 0.09,
    y: y + h * 0.07,
    w: w * 0.82,
    h: h * 0.84,
  };
}

function resetGame() {
  elapsed = 0;
  isPlaying = false;
  isPointerDown = false;
  strokePoints = [];
  drips = [];
  sparkle = [];
  clearPaint();
  updateHud(0, 0);
  drawFrame();
  resultOverlay.hidden = true;
}

function startGame() {
  resetGame();
  isPlaying = true;
  startOverlay.hidden = true;
  resultOverlay.hidden = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function endGame() {
  isPlaying = false;
  isPointerDown = false;

  const stats = calculateScore();
  const score =
    stats.cover * 0.58 +
    stats.balance * 0.3 +
    Math.max(0, 100 - stats.miss * 1.4) * 0.12;
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  resultRank.textContent = getRank(finalScore);
  resultScore.textContent = `${finalScore}点`;
  resultCover.textContent = `${Math.round(stats.cover)}%`;
  resultBalance.textContent = `${Math.round(stats.balance)}%`;
  resultMiss.textContent = `${Math.round(stats.miss)}%`;

  resultOverlay.hidden = false;
}

function getRank(score) {
  if (score >= 90) return "神ぬり";
  if (score >= 78) return "朝の匠";
  if (score >= 64) return "だいたいおいしい";
  if (score >= 48) return "ベチャ職人";
  return "皿がジャム";
}

function clearPaint() {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
}

function updateHud(cover, miss) {
  const remain = Math.max(0, GAME_TIME - elapsed);
  timeText.textContent = remain.toFixed(1);
  coverText.textContent = `${Math.round(cover)}%`;
  missText.textContent = `${Math.round(miss)}%`;
}

function tick(now) {
  if (!isPlaying) return;

  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;

  updateDrips(dt);
  updateSparkle(dt);

  const stats = calculateScore();
  updateHud(stats.cover, stats.miss);

  drawFrame();

  if (elapsed >= GAME_TIME) {
    endGame();
    return;
  }

  requestAnimationFrame(tick);
}

function drawFrame() {
  ctx.clearRect(0, 0, viewW, viewH);

  drawBackground();
  drawBoardShadow();
  drawBread();
  drawGuideRing();
  drawJam();
  drawDrips();
  drawSparkle();
  drawLabels();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, "#fff1d6");
  g.addColorStop(1, "#ffc86d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  for (let i = 0; i < 8; i += 1) {
    const x = (i / 7) * viewW;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(x, viewH * 0.12 + (i % 2) * 30, 42 + i * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoardShadow() {
  ctx.save();
  ctx.fillStyle = "rgba(123, 69, 16, 0.12)";
  roundRect(
    ctx,
    breadRect.x - 10,
    breadRect.y - 10,
    breadRect.w + 20,
    breadRect.h + 20,
    28
  );
  ctx.fill();
  ctx.restore();
}

function drawBread() {
  if (!panImg.complete) {
    ctx.fillStyle = "#f8ebcf";
    roundRect(ctx, breadRect.x, breadRect.y, breadRect.w, breadRect.h, 28);
    ctx.fill();
    return;
  }

  ctx.drawImage(panImg, breadRect.x, breadRect.y, breadRect.w, breadRect.h);
}

function drawGuideRing() {
  ctx.save();
  ctx.strokeStyle = "rgba(145, 85, 28, 0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  roundRect(
    ctx,
    playableRect.x,
    playableRect.y,
    playableRect.w,
    playableRect.h,
    22
  );
  ctx.stroke();
  ctx.restore();
}

function drawJam() {
  ctx.save();
  ctx.drawImage(paintCanvas, 0, 0);

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = JAM_SHINE;
  ctx.drawImage(paintCanvas, 0, 0);
  ctx.restore();
}

function drawDrips() {
  ctx.save();
  for (const d of drips) {
    ctx.fillStyle = `rgba(180, 28, 60, ${d.alpha})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * 0.78, d.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSparkle() {
  ctx.save();
  for (const s of sparkle) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLabels() {
  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(84, 46, 17, 0.75)";
  ctx.font = "700 16px system-ui, sans-serif";
  ctx.fillText("ぬりエリア", viewW / 2, breadRect.y - 14);

  if (isPlaying) {
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.strokeStyle = "rgba(114,56,17,0.22)";
    ctx.lineWidth = 6;
    ctx.font = "800 18px system-ui, sans-serif";
    const txt = "指でなぞってぬる";
    ctx.strokeText(txt, viewW / 2, viewH - 28);
    ctx.fillText(txt, viewW / 2, viewH - 28);
  }

  ctx.restore();
}

function updateDrips(dt) {
  for (let i = drips.length - 1; i >= 0; i -= 1) {
    const d = drips[i];
    d.y += d.speed * dt;
    d.alpha -= dt * 0.75;
    if (d.alpha <= 0) drips.splice(i, 1);
  }
}

function updateSparkle(dt) {
  for (let i = sparkle.length - 1; i >= 0; i -= 1) {
    const s = sparkle[i];
    s.alpha -= dt * 1.5;
    s.r += dt * 4;
    if (s.alpha <= 0) sparkle.splice(i, 1);
  }
}

function addJamPoint(x, y, speed = 0) {
  const radius = clamp(16 + speed * 0.03, 16, 30);

  const grad = paintCtx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
  grad.addColorStop(0, "rgba(230, 72, 108, 0.92)");
  grad.addColorStop(1, "rgba(180, 24, 59, 0.96)");

  paintCtx.fillStyle = grad;
  paintCtx.beginPath();
  paintCtx.arc(x, y, radius, 0, Math.PI * 2);
  paintCtx.fill();

  paintCtx.fillStyle = "rgba(255, 220, 228, 0.18)";
  paintCtx.beginPath();
  paintCtx.arc(x - radius * 0.18, y - radius * 0.22, radius * 0.25, 0, Math.PI * 2);
  paintCtx.fill();

  if (Math.random() < 0.12) {
    drips.push({
      x: x + rand(-6, 6),
      y: y + rand(3, 8),
      r: rand(3, 7),
      speed: rand(25, 55),
      alpha: rand(0.2, 0.45),
    });
  }

  if (Math.random() < 0.22) {
    sparkle.push({
      x: x + rand(-10, 10),
      y: y + rand(-10, 10),
      r: rand(1.2, 2.4),
      alpha: rand(0.25, 0.6),
    });
  }
}

function paintLine(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 5));
  const speed = dist;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    addJamPoint(x, y, speed);
  }
}

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function pointerDown(e) {
  if (!isPlaying) return;
  isPointerDown = true;
  const p = getCanvasPoint(e);
  strokePoints = [p];
  addJamPoint(p.x, p.y, 0);
}

function pointerMove(e) {
  if (!isPlaying || !isPointerDown) return;
  const p = getCanvasPoint(e);
  const last = strokePoints[strokePoints.length - 1];

  if (last) {
    paintLine(last, p);
  } else {
    addJamPoint(p.x, p.y, 0);
  }

  strokePoints.push(p);
  if (strokePoints.length > 6) strokePoints.shift();
}

function pointerUp() {
  isPointerDown = false;
  strokePoints = [];
}

function calculateScore() {
  if (!paintCanvas.width || !paintCanvas.height || !playableRect) {
    return { cover: 0, miss: 0, balance: 0 };
  }

  const data = paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height).data;

  let insideTotal = 0;
  let insidePainted = 0;
  let outsideTotal = 0;
  let outsidePainted = 0;

  const x0 = Math.floor(playableRect.x);
  const y0 = Math.floor(playableRect.y);
  const x1 = Math.floor(playableRect.x + playableRect.w);
  const y1 = Math.floor(playableRect.y + playableRect.h);

  const sampleStep = 4;

  for (let y = 0; y < paintCanvas.height; y += sampleStep) {
    for (let x = 0; x < paintCanvas.width; x += sampleStep) {
      const idx = (y * paintCanvas.width + x) * 4;
      const alpha = data[idx + 3];
      const painted = alpha > 24;
      const inside = x >= x0 && x < x1 && y >= y0 && y < y1;

      if (inside) {
        insideTotal += 1;
        if (painted) insidePainted += 1;
      } else {
        // パン画像に近い範囲だけを「はみ出し対象」にする
        const inBread =
          x >= breadRect.x &&
          x < breadRect.x + breadRect.w &&
          y >= breadRect.y &&
          y < breadRect.y + breadRect.h;

        if (inBread || distanceToBread(x, y) < 40) {
          outsideTotal += 1;
          if (painted) outsidePainted += 1;
        }
      }
    }
  }

  const cols = 4;
  const rows = 4;
  const cellCoverRates = [];

  for (let ry = 0; ry < rows; ry += 1) {
    for (let rx = 0; rx < cols; rx += 1) {
      const cx = playableRect.x + (playableRect.w / cols) * rx;
      const cy = playableRect.y + (playableRect.h / rows) * ry;
      const cw = playableRect.w / cols;
      const ch = playableRect.h / rows;

      let total = 0;
      let painted = 0;

      for (let y = Math.floor(cy); y < cy + ch; y += sampleStep) {
        for (let x = Math.floor(cx); x < cx + cw; x += sampleStep) {
          const idx = (y * paintCanvas.width + x) * 4;
          total += 1;
          if (data[idx + 3] > 24) painted += 1;
        }
      }

      cellCoverRates.push(total ? painted / total : 0);
    }
  }

  const avg = cellCoverRates.reduce((a, b) => a + b, 0) / cellCoverRates.length;
  const variance =
    cellCoverRates.reduce((a, b) => a + (b - avg) ** 2, 0) / cellCoverRates.length;

  const cover = insideTotal ? (insidePainted / insideTotal) * 100 : 0;
  const miss = outsideTotal ? (outsidePainted / outsideTotal) * 100 : 0;
  const balance = clamp((1 - variance * 7.2) * 100, 0, 100);

  return { cover, miss, balance };
}

function distanceToBread(x, y) {
  const dx =
    x < breadRect.x
      ? breadRect.x - x
      : x > breadRect.x + breadRect.w
        ? x - (breadRect.x + breadRect.w)
        : 0;
  const dy =
    y < breadRect.y
      ? breadRect.y - y
      : y > breadRect.y + breadRect.h
        ? y - (breadRect.y + breadRect.h)
        : 0;
  return Math.hypot(dx, dy);
}

function roundRect(context, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + rr, y);
  context.arcTo(x + w, y, x + w, y + h, rr);
  context.arcTo(x + w, y + h, x, y + h, rr);
  context.arcTo(x, y + h, x, y, rr);
  context.arcTo(x, y, x + w, y, rr);
  context.closePath();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  pointerDown(e);
});

canvas.addEventListener("pointermove", (e) => {
  e.preventDefault();
  pointerMove(e);
});

canvas.addEventListener("pointerup", (e) => {
  e.preventDefault();
  canvas.releasePointerCapture?.(e.pointerId);
  pointerUp();
});

canvas.addEventListener("pointercancel", pointerUp);
canvas.addEventListener("pointerleave", pointerUp);

window.addEventListener("resize", () => {
  resizeCanvas();
  drawFrame();
});

panImg.addEventListener("load", () => {
  resizeCanvas();
  resetGame();
});

resizeCanvas();
resetGame();