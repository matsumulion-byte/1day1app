const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const snapshot = document.getElementById("snapshot");
const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");

const startBtn = document.getElementById("startBtn");
const shotBtn = document.getElementById("shotBtn");
const retryBtn = document.getElementById("retryBtn");
const saveBtn = document.getElementById("saveBtn");

const chips = [...document.querySelectorAll(".chip")];

const state = {
  stream: null,
  mode: "dali",
  running: false,
  rafId: 0,
  capturedDataUrl: "",
  frameCount: 0,
  renderW: 720,
  renderH: 960,
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  state.renderW = canvas.width;
  state.renderH = canvas.height;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setMode(mode) {
  state.mode = mode;
  chips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.mode === mode);
  });

  if (mode === "dali") {
    hintEl.textContent = "顔を中央に置くと、下側からゆがみます。";
  } else {
    hintEl.textContent = "筆致のようなうねりと色の荒さで、絵画っぽく見せます。";
  }
}

async function startCamera() {
  if (state.stream) {
    stopCamera();
  }

  try {
    setStatus("カメラを起動中...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1080 },
        height: { ideal: 1440 },
      },
      audio: false,
    });

    state.stream = stream;
    video.srcObject = stream;

    await video.play();

    resizeCanvas();
    state.running = true;
    snapshot.classList.remove("is-visible");
    snapshot.removeAttribute("src");
    state.capturedDataUrl = "";

    shotBtn.disabled = false;
    retryBtn.disabled = true;
    saveBtn.disabled = true;

    setStatus("顔を中央に置いてください");
    render();
  } catch (error) {
    console.error(error);
    setStatus("カメラを起動できませんでした");
  }
}

function stopCamera() {
  state.running = false;
  cancelAnimationFrame(state.rafId);

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}

function render() {
  if (!state.running) return;

  if (video.readyState >= 2) {
    if (state.mode === "dali") {
      drawDali();
    } else {
      drawGogh();
    }
  }

  state.frameCount += 1;
  state.rafId = requestAnimationFrame(render);
}

function coverDrawParams(srcW, srcH, destW, destH) {
  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  let sw, sh, sx, sy;
  if (srcRatio > destRatio) {
    sh = srcH;
    sw = sh * destRatio;
    sx = (srcW - sw) * 0.5;
    sy = 0;
  } else {
    sw = srcW;
    sh = sw / destRatio;
    sx = 0;
    sy = (srcH - sh) * 0.5;
  }

  return { sx, sy, sw, sh };
}

function drawMirroredBase() {
  const w = canvas.width;
  const h = canvas.height;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh) return;

  const { sx, sy, sw, sh } = coverDrawParams(vw, vh, w, h);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

function drawDali() {
  drawMirroredBase();

  const w = canvas.width;
  const h = canvas.height;

  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  tctx.drawImage(canvas, 0, 0);

  ctx.clearRect(0, 0, w, h);

  const time = state.frameCount * 0.045;
  const faceTop = h * 0.18;
  const meltStart = h * 0.36;
  const faceBottom = h * 0.92;
  const centerX = w * 0.5;

  // 全体の熱ゆらぎ
  for (let y = 0; y < h; y += 2) {
    const globalRate = y / h;
    const heat =
      Math.sin(y * 0.028 + time * 1.8) * (3 + globalRate * 8) +
      Math.sin(y * 0.01 - time * 1.2) * (2 + globalRate * 5);

    ctx.drawImage(
      temp,
      0,
      y,
      w,
      2,
      heat,
      y,
      w,
      2
    );
  }

  // 顔中央〜下部の「垂れ」を強く上描き
  for (let y = Math.floor(meltStart); y < h; y += 2) {
    const rate = Math.min(1, Math.max(0, (y - meltStart) / (faceBottom - meltStart)));
    const ease = Math.pow(rate, 1.35);

    // 中央ほど強くとろける
    const bandRadius = w * (0.24 - ease * 0.06);
    const left = Math.max(0, centerX - bandRadius);
    const bandW = Math.min(w - left, bandRadius * 2);

    // 下に落ちる量
    const drop =
      ease * ease * 80 +
      Math.sin(time * 2 + y * 0.018) * 8 * ease;

    // 左右のうねり
    const sideShift =
      Math.sin(y * 0.032 + time * 2.3) * 26 * ease +
      Math.sin(y * 0.009 - time * 1.6) * 10 * ease;

    // 横に少し広がる
    const stretch = 1 + ease * 0.26;
    const destW = bandW * stretch;
    const destX = centerX - destW / 2 + sideShift;

    ctx.drawImage(
      temp,
      left,
      y,
      bandW,
      2,
      destX,
      y + drop,
      destW,
      2
    );
  }

  // 下端にたまり感を追加
  for (let i = 0; i < 8; i++) {
    const blobX =
      centerX +
      Math.sin(time * 1.4 + i * 0.9) * (w * 0.12) +
      (i - 4) * 10;
    const blobY = h * 0.9 + Math.sin(time * 2 + i) * 8;
    const blobW = 28 + (i % 3) * 10;
    const blobH = 12 + (i % 4) * 6;

    ctx.save();
    ctx.fillStyle = "rgba(242, 214, 150, 0.12)";
    ctx.beginPath();
    ctx.ellipse(blobX, blobY, blobW, blobH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 全体に少し黄味
  ctx.save();
  const warm = ctx.createLinearGradient(0, 0, 0, h);
  warm.addColorStop(0, "rgba(255, 248, 220, 0.04)");
  warm.addColorStop(0.5, "rgba(246, 214, 140, 0.10)");
  warm.addColorStop(1, "rgba(180, 120, 70, 0.08)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 下側に少し影を入れて液体感
  ctx.save();
  const shadow = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shadow.addColorStop(0, "rgba(0,0,0,0)");
  shadow.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.restore();
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function drawGogh() {
  const w = canvas.width;
  const h = canvas.height;

  // 元映像をベースに取得
  drawMirroredBase();

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = w;
  baseCanvas.height = h;
  const bctx = baseCanvas.getContext("2d");
  bctx.drawImage(canvas, 0, 0);

  const baseImage = bctx.getImageData(0, 0, w, h);

  // 油絵化用のソース
  const oilSource = new ImageData(
    new Uint8ClampedArray(baseImage.data),
    baseImage.width,
    baseImage.height
  );
  applyOilTone(oilSource);

  // まず油絵版を全面に描く
  ctx.fillStyle = "#1b2d5a";
  ctx.fillRect(0, 0, w, h);
  paintOilStrokes(oilSource, w, h);

  // 背景寄りの装飾を追加
  drawPainterlyBackground(w, h);
  drawPainterlyStrokes(w, h);

  // 顔中心だけ元映像を少し戻す
  blendFaceBackIn(baseCanvas, w, h);

  // 仕上げの薄い色膜
  ctx.save();
  const glaze = ctx.createLinearGradient(0, 0, w, h);
  glaze.addColorStop(0, "rgba(255, 210, 90, 0.04)");
  glaze.addColorStop(0.45, "rgba(40, 80, 170, 0.02)");
  glaze.addColorStop(1, "rgba(15, 30, 80, 0.06)");
  ctx.fillStyle = glaze;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyOilTone(imageData) {
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    const l = (r + g + b) / 3;

    // 少し黄と青を強める
    if (l > 160) {
      r += 18;
      g += 10;
      b -= 4;
    } else if (l < 95) {
      r -= 4;
      g += 2;
      b += 18;
    } else {
      r += 8;
      g += 2;
      b += 4;
    }

    // 少しだけコントラスト
    const c = l > 128 ? 10 : -8;

    d[i] = clamp(r + c);
    d[i + 1] = clamp(g + c);
    d[i + 2] = clamp(b + c);
  }

  return imageData;
}

function paintOilStrokes(imageData, w, h) {
  const data = imageData.data;
  const t = state.frameCount * 0.03;

  // 下地の大きめストローク
  for (let y = 0; y < h; y += 20) {
    for (let x = 0; x < w; x += 20) {
      const col = sampleAverageColor(data, w, h, x, y, 16);
      const angle =
        Math.sin(x * 0.01 + t) * 0.45 +
        Math.cos(y * 0.015 - t * 0.8) * 0.55;

      drawOilStroke(
        x + randRange(-4, 4),
        y + randRange(-4, 4),
        20 + randRange(-4, 7),
        9 + randRange(-2, 3),
        angle,
        col,
        0.82
      );
    }
  }

  // 中間の細かいストローク
  for (let y = 0; y < h; y += 12) {
    for (let x = 0; x < w; x += 12) {
      const col = sampleAverageColor(data, w, h, x, y, 8);
      const angle =
        Math.sin((x + y) * 0.02 + t * 1.5) * 0.6 +
        Math.cos(y * 0.02) * 0.3;

      drawOilStroke(
        x + randRange(-2.5, 2.5),
        y + randRange(-2.5, 2.5),
        10 + randRange(-2, 4),
        4.5 + randRange(-1, 2),
        angle,
        col,
        0.36
      );
    }
  }

  // ハイライト
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const col = sampleAverageColor(data, w, h, x, y, 6);
    const bright = brighten(col, 16);

    drawOilStroke(
      x,
      y,
      7 + Math.random() * 8,
      2.6 + Math.random() * 1.8,
      Math.random() * Math.PI,
      bright,
      0.16
    );
  }
}

function drawPainterlyBackground(w, h) {
  const t = state.frameCount * 0.01;

  ctx.save();

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(56, 92, 175, 0.12)");
  bg.addColorStop(0.45, "rgba(255, 210, 100, 0.05)");
  bg.addColorStop(1, "rgba(26, 44, 98, 0.12)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 12; i++) {
    const yBase = h * (0.1 + i * 0.05);
    ctx.beginPath();

    for (let x = 0; x <= w; x += 14) {
      const y =
        yBase +
        Math.sin(x * 0.018 + t * 8 + i * 0.7) * (6 + i * 0.5);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle =
      i % 2 === 0
        ? "rgba(78, 118, 210, 0.10)"
        : "rgba(255, 210, 110, 0.08)";
    ctx.lineWidth = 4 + (i % 3);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.restore();
}

function drawPainterlyStrokes(w, h) {
  const t = state.frameCount * 0.02;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < 110; i++) {
    const baseX =
      ((i * 83.17 + Math.sin(i * 1.2 + t) * 48) % w + w) % w;
    const baseY =
      ((i * 57.41 + Math.cos(i * 1.7 + t * 1.3) * 38) % h + h) % h;

    const len = 14 + (i % 8) * 5;
    const angle = i * 0.41 + Math.sin(t + i * 0.35) * 0.9;

    const x1 = baseX - Math.cos(angle) * len * 0.5;
    const y1 = baseY - Math.sin(angle) * len * 0.5;
    const x2 = baseX + Math.cos(angle) * len * 0.5;
    const y2 = baseY + Math.sin(angle) * len * 0.5;

    const cx = baseX + Math.sin(angle + t * 4) * 10;
    const cy = baseY + Math.cos(angle - t * 3) * 10;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);

    ctx.strokeStyle = i % 3 === 0
      ? "rgba(255, 214, 102, 0.12)"
      : i % 3 === 1
        ? "rgba(72, 122, 210, 0.12)"
        : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 3 + (i % 4);
    ctx.stroke();
  }

  ctx.restore();
}

function blendFaceBackIn(baseCanvas, w, h) {
  const faceCx = w * 0.5;
  const faceCy = h * 0.42;
  const faceRx = w * 0.16;
  const faceRy = h * 0.19;

  ctx.save();

  // 顔の中心だけ自然に戻すためのグラデーションマスク
  const grad = ctx.createRadialGradient(
    faceCx,
    faceCy,
    faceRx * 0.25,
    faceCx,
    faceCy,
    faceRx * 1.35
  );

  grad.addColorStop(0, "rgba(255,255,255,0.78)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.46)");
  grad.addColorStop(0.75, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.globalCompositeOperation = "source-over";

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mctx = maskCanvas.getContext("2d");

  mctx.drawImage(baseCanvas, 0, 0);
  mctx.globalCompositeOperation = "destination-in";
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, w, h);

  // 顔の中心を戻す
  ctx.globalAlpha = 0.92;
  ctx.drawImage(maskCanvas, 0, 0);

  // ほんの少し輪郭線を戻して誰かわかりやすくする
  ctx.globalAlpha = 0.22;
  ctx.filter = "contrast(120%) saturate(105%)";
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.filter = "none";

  ctx.restore();
}

function drawOilStroke(x, y, len, thick, angle, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 本体
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.5, thick * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 明るい筋
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = `rgba(${clamp(color.r + 30)}, ${clamp(color.g + 24)}, ${clamp(color.b + 12)}, 1)`;
  ctx.beginPath();
  ctx.ellipse(-len * 0.08, -thick * 0.12, len * 0.32, thick * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 暗い縁
  ctx.globalAlpha = alpha * 0.18;
  ctx.strokeStyle = `rgba(${clamp(color.r - 28)}, ${clamp(color.g - 24)}, ${clamp(color.b - 20)}, 1)`;
  ctx.lineWidth = Math.max(1, thick * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.48, thick * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function sampleAverageColor(data, w, h, cx, cy, size = 8) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const half = Math.floor(size / 2);

  for (let yy = -half; yy <= half; yy++) {
    for (let xx = -half; xx <= half; xx++) {
      const x = Math.max(0, Math.min(w - 1, Math.round(cx + xx)));
      const y = Math.max(0, Math.min(h - 1, Math.round(cy + yy)));
      const idx = (y * w + x) * 4;

      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function brighten(color, value) {
  return {
    r: clamp(color.r + value),
    g: clamp(color.g + value),
    b: clamp(color.b + Math.round(value * 0.5)),
  };
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function capture() {
  if (!state.running) return;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  state.capturedDataUrl = dataUrl;
  snapshot.src = dataUrl;
  snapshot.classList.add("is-visible");

  state.running = false;
  cancelAnimationFrame(state.rafId);

  shotBtn.disabled = true;
  retryBtn.disabled = false;
  saveBtn.disabled = false;

  setStatus("撮影しました");
}

function retry() {
  if (!state.stream) return;

  snapshot.classList.remove("is-visible");
  snapshot.removeAttribute("src");
  state.capturedDataUrl = "";

  state.running = true;
  shotBtn.disabled = false;
  retryBtn.disabled = true;
  saveBtn.disabled = true;

  setStatus("撮り直しできます");
  render();
}

function saveImage() {
  if (!state.capturedDataUrl) return;

  const link = document.createElement("a");
  const modeLabel = state.mode === "dali" ? "dali" : "gogh";
  link.href = state.capturedDataUrl;
  link.download = `meigafilter_${modeLabel}_${Date.now()}.jpg`;
  link.click();

  setStatus("保存しました");
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    setMode(chip.dataset.mode);
  });
});

startBtn.addEventListener("click", startCamera);
shotBtn.addEventListener("click", capture);
retryBtn.addEventListener("click", retry);
saveBtn.addEventListener("click", saveImage);

window.addEventListener("resize", () => {
  resizeCanvas();
});

window.addEventListener("beforeunload", () => {
  stopCamera();
});

setMode("dali");
resizeCanvas();