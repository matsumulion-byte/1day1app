const canvas = document.getElementById("coasterCanvas");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
const runButton = document.getElementById("runButton");
const undoButton = document.getElementById("undoButton");
const clearButton = document.getElementById("clearButton");
const speedInput = document.getElementById("speedInput");
const lengthValue = document.getElementById("lengthValue");
const dropValue = document.getElementById("dropValue");
const ratingValue = document.getElementById("ratingValue");
const resultCard = document.getElementById("resultCard");
const resultGrade = document.getElementById("resultGrade");
const resultTitle = document.getElementById("resultTitle");
const resultComment = document.getElementById("resultComment");

let points = [];
let history = [];
let drawing = false;
let running = false;
let progress = 0;
let lastTime = 0;
let carLean = 0;

const pointer = { x: 0, y: 0 };

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pushPoint(point) {
  const last = points[points.length - 1];
  if (!last || distance(last, point) > 7) {
    points.push(point);
    updateStats();
  }
}

function beginDraw(event) {
  event.preventDefault();
  running = false;
  hideResult();
  drawing = true;
  history.push(points.slice());
  const point = getPoint(event);
  points = [point];
  pointer.x = point.x;
  pointer.y = point.y;
  hint.classList.add("hidden");
  updateStats();
  draw();
}

function moveDraw(event) {
  if (!drawing) return;
  event.preventDefault();
  const point = getPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
  pushPoint(point);
  draw();
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  points = smoothPath(points);
  updateStats();
  draw();
}

function smoothPath(source) {
  if (source.length < 4) return source;
  return source.map((point, index) => {
    if (index === 0 || index === source.length - 1) return point;
    const prev = source[index - 1];
    const next = source[index + 1];
    return {
      x: point.x * 0.5 + prev.x * 0.25 + next.x * 0.25,
      y: point.y * 0.5 + prev.y * 0.25 + next.y * 0.25
    };
  });
}

function pathLength() {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

function updateStats() {
  const length = pathLength();
  const ys = points.map((point) => point.y);
  const drop = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  const loops = countLoops();
  lengthValue.textContent = `${Math.round(length / 5)}m`;
  dropValue.textContent = `${Math.round(drop / 4)}m`;

  if (points.length < 8) {
    ratingValue.textContent = "待機中";
  } else if (loops > 0) {
    ratingValue.textContent = "絶叫";
  } else if (drop > 150) {
    ratingValue.textContent = "急降下";
  } else if (length > 700) {
    ratingValue.textContent = "長旅";
  } else {
    ratingValue.textContent = "爽快";
  }
}

function getCourseMetrics() {
  const length = pathLength();
  const ys = points.map((point) => point.y);
  const drop = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  const loops = countLoops();
  let turns = 0;

  for (let i = 2; i < points.length; i += 1) {
    const angleA = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
    const angleB = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    let diff = Math.abs(angleB - angleA);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    turns += diff;
  }

  return { length, drop, loops, turns };
}

function getFinalRating() {
  const metrics = getCourseMetrics();
  const lengthScore = Math.min(34, metrics.length / 24);
  const dropScore = Math.min(28, metrics.drop / 7);
  const turnScore = Math.min(24, metrics.turns * 4.5);
  const loopScore = Math.min(14, metrics.loops * 7);
  const rawScore = Math.round(lengthScore + dropScore + turnScore + loopScore);
  const score = Math.max(10, Math.min(100, rawScore));

  let grade = "C";
  let title = "ほのぼの遊園地";
  let comment = "ゆったり走れて、初めてのお客さんにもやさしいコースです。";

  if (score >= 88) {
    grade = "S";
    title = "絶叫設計士";
    comment = "落差、曲線、勢いがそろった名物コース。行列ができます。";
  } else if (score >= 72) {
    grade = "A";
    title = "急降下マイスター";
    comment = "スピード感がしっかりあります。あと一癖で伝説級です。";
  } else if (score >= 55) {
    grade = "B";
    title = "爽快クルーザー";
    comment = "気持ちよく流れるコースです。大きな山を足すとさらに盛り上がります。";
  }

  if (metrics.loops > 0 && score >= 70) {
    title = "ループ職人";
    comment = "ぐるっと回る大胆さが光ります。安全バーをぎゅっと握りたいコースです。";
  }

  return { grade, title, comment, score };
}

function showResult() {
  const rating = getFinalRating();
  resultGrade.textContent = rating.grade;
  resultTitle.textContent = `${rating.title} ${rating.score}点`;
  resultComment.textContent = rating.comment;
  resultCard.classList.add("show");
}

function hideResult() {
  resultCard.classList.remove("show");
}

function countLoops() {
  if (points.length < 24) return 0;
  let turns = 0;
  let previousAngle = null;
  for (let i = 1; i < points.length; i += 1) {
    const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    if (previousAngle !== null) {
      let diff = angle - previousAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      turns += diff;
    }
    previousAngle = angle;
  }
  return Math.floor(Math.abs(turns) / (Math.PI * 1.8));
}

function drawBackground(width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 173) + 30) % width;
    const y = 34 + ((i * 61) % Math.max(80, height * 0.42));
    drawCloud(x, y, 22 + (i % 3) * 8);
  }

  ctx.fillStyle = "#37884f";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.76);
  for (let x = 0; x <= width; x += 60) {
    ctx.lineTo(x, height * 0.76 + Math.sin(x * 0.018) * 18);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.65, 0, Math.PI * 2);
  ctx.arc(x + size * 0.55, y - size * 0.18, size * 0.82, 0, Math.PI * 2);
  ctx.arc(x + size * 1.16, y, size * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

function drawRails() {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(28, 36, 48, 0.18)";
  ctx.lineWidth = 18;
  strokePath();

  ctx.strokeStyle = "#2d3542";
  ctx.lineWidth = 8;
  strokePath();

  ctx.strokeStyle = "#f5c84c";
  ctx.lineWidth = 3;
  strokePath();

  ctx.strokeStyle = "rgba(28, 36, 48, 0.52)";
  ctx.lineWidth = 2;
  for (let i = 8; i < points.length; i += 9) {
    const prev = points[i - 1];
    const current = points[i];
    const angle = Math.atan2(current.y - prev.y, current.x - prev.x) + Math.PI / 2;
    const size = 13;
    ctx.beginPath();
    ctx.moveTo(current.x + Math.cos(angle) * size, current.y + Math.sin(angle) * size);
    ctx.lineTo(current.x - Math.cos(angle) * size, current.y - Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.restore();
}

function strokePath() {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function pointAtProgress(target) {
  if (points.length < 2) return null;
  let traveled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const segment = distance(points[i - 1], points[i]);
    if (traveled + segment >= target) {
      const ratio = (target - traveled) / segment;
      const x = points[i - 1].x + (points[i].x - points[i - 1].x) * ratio;
      const y = points[i - 1].y + (points[i].y - points[i - 1].y) * ratio;
      const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
      return { x, y, angle };
    }
    traveled += segment;
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return { x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

function drawCar() {
  const position = pointAtProgress(progress);
  if (!position) return;
  carLean += (position.angle - carLean) * 0.2;

  ctx.save();
  ctx.translate(position.x, position.y - 16);
  ctx.rotate(carLean);
  ctx.fillStyle = "#ef4d3a";
  ctx.strokeStyle = "#1c2430";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-20, -10, 40, 20, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffe7ad";
  ctx.fillRect(-10, -17, 20, 10);
  ctx.strokeRect(-10, -17, 20, 10);

  ctx.fillStyle = "#1c2430";
  ctx.beginPath();
  ctx.arc(-12, 12, 5, 0, Math.PI * 2);
  ctx.arc(12, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStartFinish() {
  if (points.length < 2) return;
  const first = points[0];
  const last = points[points.length - 1];
  drawFlag(first.x, first.y, "#2e8c65");
  drawFlag(last.x, last.y, "#ef4d3a");
}

function drawFlag(x, y, color) {
  ctx.save();
  ctx.strokeStyle = "#1c2430";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 44);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 44);
  ctx.lineTo(x + 34, y - 36);
  ctx.lineTo(x, y - 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  drawRails();
  drawStartFinish();
  if (running || points.length > 1) drawCar();
}

function animate(time) {
  if (!running) return;
  const elapsed = Math.min(40, time - lastTime || 16);
  lastTime = time;
  const length = pathLength();
  progress += elapsed * Number(speedInput.value) * 0.22;
  if (progress >= length) {
    progress = length;
    running = false;
    runButton.textContent = "もう一回";
    showResult();
  }
  draw();
  if (running) requestAnimationFrame(animate);
}

function runCoaster() {
  if (points.length < 8) return;
  running = true;
  hideResult();
  progress = 0;
  lastTime = 0;
  carLean = 0;
  runButton.textContent = "走行中";
  requestAnimationFrame(animate);
}

function undo() {
  running = false;
  hideResult();
  if (history.length > 0) {
    points = history.pop();
  } else {
    points = [];
  }
  progress = 0;
  hint.classList.toggle("hidden", points.length > 0);
  runButton.textContent = "発車";
  updateStats();
  draw();
}

function clearTrack() {
  running = false;
  hideResult();
  history.push(points.slice());
  points = [];
  progress = 0;
  hint.classList.remove("hidden");
  runButton.textContent = "発車";
  updateStats();
  draw();
}

canvas.addEventListener("pointerdown", beginDraw);
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointercancel", endDraw);
runButton.addEventListener("click", runCoaster);
undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearTrack);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
