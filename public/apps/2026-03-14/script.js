const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

const clearBtn = document.getElementById("clearBtn");
const diagnoseBtn = document.getElementById("diagnoseBtn");
const retryBtn = document.getElementById("retryBtn");
const miniStatus = document.getElementById("miniStatus");
const resultCard = document.getElementById("resultCard");

const resultTitle = document.getElementById("resultTitle");
const scoreValue = document.getElementById("scoreValue");
const resultBody = document.getElementById("resultBody");
const resultSub = document.getElementById("resultSub");

const metricRoundness = document.getElementById("metricRoundness");
const metricClosure = document.getElementById("metricClosure");
const metricSpeed = document.getElementById("metricSpeed");
const metricStability = document.getElementById("metricStability");
const metricDirection = document.getElementById("metricDirection");

let points = [];
let isDrawing = false;
let hasDrawn = false;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  redraw();
}

function clearCanvas() {
  points = [];
  isDrawing = false;
  hasDrawn = false;
  resultCard.classList.add("is-hidden");
  miniStatus.textContent =
    "できるだけ一筆で、最後は始点の近くまで戻ると診断しやすいです。";
  redraw();
}

function redraw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  drawGuideCircle(w, h);

  if (!points.length) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGuideCircle(w, h) {
  const r = Math.min(w, h) * 0.3;
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(216, 194, 173, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    t: performance.now(),
  };
}

function startDraw(e) {
  e.preventDefault();
  const p = getPos(e);
  isDrawing = true;
  hasDrawn = true;
  points = [p];
  resultCard.classList.add("is-hidden");
  miniStatus.textContent = "解析できる丸を目指して、そのまま一周どうぞ。";
  redraw();
}

function moveDraw(e) {
  if (!isDrawing) return;
  e.preventDefault();

  const p = getPos(e);
  const prev = points[points.length - 1];
  const dx = p.x - prev.x;
  const dy = p.y - prev.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 2) return;

  points.push(p);
  redraw();
}

function endDraw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  isDrawing = false;

  if (points.length < 10) {
    miniStatus.textContent = "もう少し大きく、はっきり丸を描くと診断できます。";
  } else {
    miniStatus.textContent = "描けました。「診断する」を押してください。";
  }
}

function getPathLength(arr) {
  let len = 0;
  for (let i = 1; i < arr.length; i++) {
    len += Math.hypot(arr[i].x - arr[i - 1].x, arr[i].y - arr[i - 1].y);
  }
  return len;
}

function getBoundingBox(arr) {
  const xs = arr.map((p) => p.x);
  const ys = arr.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function getCenter(arr) {
  let sumX = 0;
  let sumY = 0;
  for (const p of arr) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / arr.length,
    y: sumY / arr.length,
  };
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values, avg) {
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toScore01(value) {
  return clamp(value, 0, 1);
}

function directionOfPath(arr, center) {
  let crossSum = 0;
  for (let i = 1; i < arr.length; i++) {
    const ax = arr[i - 1].x - center.x;
    const ay = arr[i - 1].y - center.y;
    const bx = arr[i].x - center.x;
    const by = arr[i].y - center.y;
    crossSum += ax * by - ay * bx;
  }
  return crossSum >= 0 ? "反時計回り" : "時計回り";
}

function analyzeCircle(arr) {
  const bbox = getBoundingBox(arr);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const size = (width + height) / 2;
  const center = getCenter(arr);

  const distances = arr.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
  const avgRadius = mean(distances);
  const radiusStd = std(distances, avgRadius);

  const roundness = toScore01(1 - radiusStd / Math.max(avgRadius * 0.28, 1));

  const start = arr[0];
  const end = arr[arr.length - 1];
  const closureDist = Math.hypot(end.x - start.x, end.y - start.y);
  const closure = toScore01(1 - closureDist / Math.max(size * 0.6, 1));

  const aspectRatio = Math.min(width, height) / Math.max(width, height || 1);
  const ellipseScore = toScore01((aspectRatio - 0.55) / 0.45);

  const totalTime = Math.max(arr[arr.length - 1].t - arr[0].t, 1);
  const pathLength = getPathLength(arr);
  const speed = pathLength / totalTime; // px per ms

  const speedScore = clamp((speed - 0.08) / 0.35, 0, 1);

  let jitterSum = 0;
  let turnCount = 0;
  for (let i = 2; i < arr.length; i++) {
    const v1x = arr[i - 1].x - arr[i - 2].x;
    const v1y = arr[i - 1].y - arr[i - 2].y;
    const v2x = arr[i].x - arr[i - 1].x;
    const v2y = arr[i].y - arr[i - 1].y;

    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    if (mag1 < 1 || mag2 < 1) continue;

    const dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
    const angle = Math.acos(clamp(dot, -1, 1));
    jitterSum += angle;
    turnCount++;
  }

  const avgTurn = turnCount ? jitterSum / turnCount : 0;
  const stability = toScore01(1 - avgTurn / 0.9);

  const direction = directionOfPath(arr, center);

  const score =
    roundness * 34 +
    closure * 22 +
    ellipseScore * 16 +
    speedScore * 12 +
    stability * 16;

  return {
    width,
    height,
    size,
    center,
    roundness,
    closure,
    ellipseScore,
    speedScore,
    stability,
    direction,
    score: Math.round(clamp(score, 0, 100)),
    totalTime,
    speed,
    aspectRatio,
  };
}

function labelByScore(value) {
  if (value >= 0.85) return "かなり高い";
  if (value >= 0.65) return "高め";
  if (value >= 0.45) return "ふつう";
  if (value >= 0.25) return "やや低め";
  return "かなり個性的";
}

function speedLabel(value) {
  if (value >= 0.8) return "かなり速い";
  if (value >= 0.55) return "速め";
  if (value >= 0.3) return "ふつう";
  return "じっくり";
}

function stabilityLabel(value) {
  if (value >= 0.8) return "かなり安定";
  if (value >= 0.55) return "安定";
  if (value >= 0.3) return "やや揺れる";
  return "かなり揺れる";
}

function pickType(data) {
  const sizeRatio = data.size / Math.min(canvas.clientWidth, canvas.clientHeight);

  if (data.roundness >= 0.75 && data.closure >= 0.7 && data.stability >= 0.65) {
    return {
      title: "きっちりマル村",
      body:
        "あなたは整っていない状態を、そのままにしておくのが少し苦手なタイプです。雑に始めるより、ちゃんと形にしてから進みたい。仕事でも会話でも、最終的に辻褄が合っていることを大事にします。",
      sub:
        "丁寧で信頼されやすい一方、適当な進行を見ると心の中でわりとイラついています。",
    };
  }

  if (data.speedScore >= 0.72 && data.closure < 0.55) {
    return {
      title: "勢いのマル村",
      body:
        "あなたは考え込むより先に手が動く直感型です。完成度より初速が強く、まずやることで景色を変えていくタイプ。細部はあとからなんとかする精神がかなりあります。",
      sub:
        "推進力は武器ですが、閉じる前に次へ行きがちなので、最後のひと詰めだけ意識するとさらに強いです。",
    };
  }

  if (data.closure < 0.38) {
    return {
      title: "余白のマル村",
      body:
        "あなたは全部をきっちり閉じきらない、抜け感のある人です。物事にも人にも余白を残せるので、一緒にいて息苦しくなりにくいタイプ。答えを急がず、曖昧さも一度受け止められます。",
      sub:
        "やさしさとセンスがある反面、決断を先送りしやすいところもあります。",
    };
  }

  if (data.stability < 0.32) {
    return {
      title: "ふるえマル村",
      body:
        "あなたは慎重で、状況の空気をよく読んで動くタイプです。雑に飛び込むより、一度確かめてから進みたい。緊張しやすさはあるものの、そのぶん失敗を減らす力があります。",
      sub:
        "本当はかなり負けず嫌いで、表に出さずにじわじわ頑張る人です。",
    };
  }

  if (sizeRatio >= 0.72 && data.speedScore >= 0.45) {
    return {
      title: "のびのびマル村",
      body:
        "あなたはスケール感の大きい、おおらかタイプです。細かいズレにあまり囚われず、全体の雰囲気や勢いを優先できます。周囲からは『なんか楽しそうな人』に見られやすいはずです。",
      sub:
        "一緒にいると気楽ですが、締切直前だけ急に困ることがあります。",
    };
  }

  if (data.roundness >= 0.62 && data.speedScore < 0.35) {
    return {
      title: "職人マル村",
      body:
        "あなたは観察しながら精度を上げていく職人タイプです。派手さより再現性を重視し、ちゃんとしたものを着地させる力があります。結果として、静かに評価されることが多いです。",
      sub:
        "即断即決の派手さはなくても、任せると安心な人として見られやすいです。",
    };
  }

  if (data.direction === "時計回り" && data.speedScore >= 0.4) {
    return {
      title: "攻略型マル村",
      body:
        "あなたは感覚だけでなく、地味に攻略法を見つけるのが得意なタイプです。ノリで見えて、内側では『どうすれば勝てるか』をずっと考えています。",
      sub:
        "雑に見せて実は計算している、ちょっと油断ならない人です。",
    };
  }

  return {
    title: "感性派マル村",
    body:
      "あなたは正しさよりも、今の自分の感覚を大事にするタイプです。多少いびつでも、その時の勢いや空気感を形にするのがうまい人。説明しづらい魅力があります。",
    sub:
      "理屈で整いすぎたものより、ちょっとクセのあるものに惹かれやすいはずです。",
  };
}

function diagnose() {
  if (!hasDrawn || points.length < 12) {
    miniStatus.textContent = "診断するには、もう少ししっかり丸を描いてください。";
    return;
  }

  const analysis = analyzeCircle(points);
  const result = pickType(analysis);

  resultTitle.textContent = result.title;
  scoreValue.textContent = `${analysis.score}点`;
  resultBody.textContent = result.body;
  resultSub.textContent = result.sub;

  metricRoundness.textContent = labelByScore(
    (analysis.roundness + analysis.ellipseScore) / 2
  );
  metricClosure.textContent = labelByScore(analysis.closure);
  metricSpeed.textContent = speedLabel(analysis.speedScore);
  metricStability.textContent = stabilityLabel(analysis.stability);
  metricDirection.textContent = analysis.direction;

  resultCard.classList.remove("is-hidden");
  miniStatus.textContent = "診断完了。丸にはちゃんと性格が出ていました。";
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

canvas.addEventListener("pointerdown", startDraw);
canvas.addEventListener("pointermove", moveDraw);
window.addEventListener("pointerup", endDraw);
window.addEventListener("pointercancel", endDraw);

clearBtn.addEventListener("click", clearCanvas);
retryBtn.addEventListener("click", clearCanvas);
diagnoseBtn.addEventListener("click", diagnose);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
clearCanvas();