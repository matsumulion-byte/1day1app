const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d");

const previewCanvas = document.getElementById("photoPreviewCanvas");
const previewCtx = previewCanvas.getContext("2d");

const nameInput = document.getElementById("nameInput");
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const zoomRange = document.getElementById("zoomRange");
const generateBtn = document.getElementById("generateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const saveBtn = document.getElementById("saveBtn");
const textResult = document.getElementById("textResult");

const W = canvas.width;
const H = canvas.height;

let uploadedImage = null;
let uploadedImageUrl = "";
let lastGenerated = null;

let photoTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  baseScale: 1
};

let dragState = {
  active: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0
};

const catchphrases = [
  "この春、推すしかない新星",
  "透明感、ついにデビュー級",
  "目が合った時点で負けです",
  "日常を少しだけ狂わせる逸材",
  "気づいたら最推しになっている",
  "まだ誰のものでもない輝き",
  "あまりに早い、運命の初現場",
  "かわいいだけでは終わらない",
  "静かに強い、新しい光",
  "正統派の顔をした事件"
];

const roles = [
  "王道キラキラ担当",
  "クールミステリアス担当",
  "あざとさ特化担当",
  "センター圧つよ担当",
  "沼らせ笑顔担当",
  "天然トラブルメーカー担当",
  "無自覚天才担当",
  "清楚に見えて危険担当",
  "ギャップ破壊担当",
  "ライブで化ける担当"
];

const groups = [
  "Lumière Parade",
  "MILKY SPARK",
  "NEON BLOOM",
  "Pinky Orbit",
  "RIBBON PLANET",
  "星屑ステップ",
  "トキメキ装置",
  "放課後シンフォニー",
  "きらめき未満",
  "恋する流星群"
];

const profileLines = [
  "趣味：朝焼けを見ること",
  "趣味：コンビニスイーツの新作チェック",
  "趣味：意味深な視線を送ること",
  "特技：3秒でファンを増やすこと",
  "特技：ライブカメラを見つけること",
  "特技：なぜか記憶に残ること",
  "チャームポイント：目が合った気がするところ",
  "チャームポイント：たまに雑になるところ",
  "チャームポイント：笑うと急に幼いところ",
  "口ぐせ：まだ本気出してないです"
];

const auraWords = [
  "圧倒的透明感",
  "天性のスター性",
  "危険なかわいさ",
  "春限定の破壊力",
  "静かな支配力",
  "無限の初恋感",
  "万人受けしないのに刺さる",
  "信じられない主人公感"
];

function randItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fitName(name) {
  const trimmed = name.trim();
  return trimmed || "NO NAME";
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = reject;
    img.src = url;
  });
}

function roundedRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCoverMetrics(img, boxW, boxH, zoom = 1) {
  const baseScale = Math.max(boxW / img.width, boxH / img.height);
  const scale = baseScale * zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const minOffsetX = Math.min(0, boxW - drawW);
  const maxOffsetX = 0;
  const minOffsetY = Math.min(0, boxH - drawH);
  const maxOffsetY = 0;

  return {
    baseScale,
    scale,
    drawW,
    drawH,
    minOffsetX,
    maxOffsetX,
    minOffsetY,
    maxOffsetY
  };
}

function clampPhotoOffsets() {
  if (!uploadedImage) return;

  const metrics = getCoverMetrics(
    uploadedImage,
    previewCanvas.width,
    previewCanvas.height,
    photoTransform.zoom
  );

  photoTransform.baseScale = metrics.baseScale;
  photoTransform.offsetX = clamp(
    photoTransform.offsetX,
    metrics.minOffsetX,
    metrics.maxOffsetX
  );
  photoTransform.offsetY = clamp(
    photoTransform.offsetY,
    metrics.minOffsetY,
    metrics.maxOffsetY
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetPhotoTransform() {
  if (!uploadedImage) return;

  photoTransform.zoom = Number(zoomRange.value) || 1;

  const metrics = getCoverMetrics(
    uploadedImage,
    previewCanvas.width,
    previewCanvas.height,
    photoTransform.zoom
  );

  photoTransform.baseScale = metrics.baseScale;
  photoTransform.offsetX = (previewCanvas.width - metrics.drawW) / 2;
  photoTransform.offsetY = (previewCanvas.height - metrics.drawH) / 2;
  clampPhotoOffsets();
}

function drawImageWithTransform(context, img, boxX, boxY, boxW, boxH, radius) {
  const metrics = getCoverMetrics(img, boxW, boxH, photoTransform.zoom);

  const previewRatioX = boxW / previewCanvas.width;
  const previewRatioY = boxH / previewCanvas.height;

  const offsetX = photoTransform.offsetX * previewRatioX;
  const offsetY = photoTransform.offsetY * previewRatioY;

  context.save();
  roundedRect(context, boxX, boxY, boxW, boxH, radius);
  context.clip();
  context.drawImage(
    img,
    boxX + offsetX,
    boxY + offsetY,
    metrics.drawW * previewRatioX,
    metrics.drawH * previewRatioY
  );

  const overlay = context.createLinearGradient(0, boxY, 0, boxY + boxH);
  overlay.addColorStop(0, "rgba(255,255,255,0.08)");
  overlay.addColorStop(0.55, "rgba(255,255,255,0)");
  overlay.addColorStop(1, "rgba(8,10,24,0.42)");
  context.fillStyle = overlay;
  context.fillRect(boxX, boxY, boxW, boxH);

  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.lineWidth = 3;
  roundedRect(context, boxX, boxY, boxW, boxH, radius);
  context.stroke();
}

function renderPreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (!uploadedImage) return;

  const metrics = getCoverMetrics(
    uploadedImage,
    previewCanvas.width,
    previewCanvas.height,
    photoTransform.zoom
  );

  previewCtx.drawImage(
    uploadedImage,
    photoTransform.offsetX,
    photoTransform.offsetY,
    metrics.drawW,
    metrics.drawH
  );

  previewCtx.save();
  previewCtx.strokeStyle = "rgba(255,255,255,0.22)";
  previewCtx.lineWidth = 4;
  previewCtx.strokeRect(2, 2, previewCanvas.width - 4, previewCanvas.height - 4);
  previewCtx.restore();
}

function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#24143f");
  bg.addColorStop(0.55, "#11172f");
  bg.addColorStop(1, "#160b20");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 40 + Math.random() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = Math.random() > 0.5 ? "255,95,195" : "124,140,255";
    g.addColorStop(0, `rgba(${hue},0.25)`);
    g.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 120; i += 1) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(255,255,255,${0.18 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkles() {
  for (let i = 0; i < 18; i += 1) {
    const x = 80 + Math.random() * (W - 160);
    const y = 80 + Math.random() * (H - 160);
    const r = 8 + Math.random() * 10;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPhoto(img) {
  drawImageWithTransform(ctx, img, 110, 180, 860, 760, 38);
}

function drawBadges(data) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundedRect(ctx, 110, 80, 230, 58, 29);
  ctx.fill();

  ctx.font = "700 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("2026.04.05 DEBUT", 136, 118);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundedRect(ctx, 684, 88, 286, 52, 26);
  ctx.fill();

  ctx.font = "700 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd4f0";
  ctx.fillText(data.group, 827, 122);
  ctx.textAlign = "left";

  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  let currentY = y;

  for (let i = 0; i < chars.length; i += 1) {
    const testLine = line + chars[i];
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, currentY);
}

function drawBottomPanel(data) {
  const panelX = 70;
  const panelY = 900;
  const panelW = 940;
  const panelH = 380;

  ctx.save();
  ctx.fillStyle = "rgba(7,8,17,0.58)";
  roundedRect(ctx, panelX, panelY, panelW, panelH, 42);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  roundedRect(ctx, panelX, panelY, panelW, panelH, 42);
  ctx.stroke();

  ctx.fillStyle = "#ffd4f0";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("NEW IDOL", 118, 974);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 86px sans-serif";
  ctx.fillText(data.name, 112, 1072);

  ctx.fillStyle = "#f5f7ff";
  ctx.font = "700 42px sans-serif";
  wrapText(data.catchphrase, 112, 1144, 850, 56);

  ctx.fillStyle = "#9bd9ff";
  ctx.font = "700 30px sans-serif";
  ctx.fillText(data.role, 114, 1232);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 26px sans-serif";
  ctx.fillText(data.profile, 114, 1276);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = "700 24px sans-serif";
  ctx.fillText(data.aura, 964, 1232);
  ctx.fillText("COMING SOON", 964, 1276);
  ctx.textAlign = "left";

  ctx.restore();
}

function drawFrame() {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(255,95,195,0.85)");
  grad.addColorStop(1, "rgba(124,140,255,0.85)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 12;
  roundedRect(ctx, 20, 20, W - 40, H - 40, 42);
  ctx.stroke();
  ctx.restore();
}

function createGeneratedData() {
  return {
    name: fitName(nameInput.value),
    catchphrase: randItem(catchphrases),
    role: randItem(roles),
    group: randItem(groups),
    profile: randItem(profileLines),
    aura: randItem(auraWords)
  };
}

function drawPoster(data) {
  drawBackground();
  drawPhoto(uploadedImage);
  drawSparkles();
  drawBadges(data);
  drawBottomPanel(data);
  drawFrame();
}

function renderTextResult(data) {
  textResult.innerHTML = `
    <ul>
      <li><strong>グループ名：</strong>${escapeHtml(data.group)}</li>
      <li><strong>キャッチコピー：</strong>${escapeHtml(data.catchphrase)}</li>
      <li><strong>担当：</strong>${escapeHtml(data.role)}</li>
      <li><strong>一言プロフィール：</strong>${escapeHtml(data.profile)}</li>
      <li><strong>オーラ：</strong>${escapeHtml(data.aura)}</li>
    </ul>
  `;
}

function resetCanvasPlaceholder() {
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#23163d");
  grad.addColorStop(1, "#10192e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundedRect(ctx, 90, 120, 900, 700, 36);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "700 74px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("IDOL DEBUT", W / 2, 960);

  ctx.font = "500 38px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("写真と名前を入れて告知を生成", W / 2, 1034);
  ctx.textAlign = "left";
}

function setPreviewReadyState(isReady) {
  photoPreview.classList.toggle("is-empty", !isReady);
}

function getPointerPosition(event) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * previewCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * previewCanvas.height
  };
}

function startDrag(event) {
  if (!uploadedImage) return;

  const pos = getPointerPosition(event);
  dragState.active = true;
  dragState.startX = pos.x;
  dragState.startY = pos.y;
  dragState.startOffsetX = photoTransform.offsetX;
  dragState.startOffsetY = photoTransform.offsetY;

  photoPreview.classList.add("is-dragging");
  previewCanvas.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!dragState.active || !uploadedImage) return;

  const pos = getPointerPosition(event);
  const dx = pos.x - dragState.startX;
  const dy = pos.y - dragState.startY;

  photoTransform.offsetX = dragState.startOffsetX + dx;
  photoTransform.offsetY = dragState.startOffsetY + dy;
  clampPhotoOffsets();
  renderPreview();

  if (lastGenerated) {
    drawPoster(lastGenerated);
  }
}

function endDrag(event) {
  if (!dragState.active) return;
  dragState.active = false;
  photoPreview.classList.remove("is-dragging");
  previewCanvas.releasePointerCapture?.(event.pointerId);
}

async function handlePhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }

    const { img, url } = await readFileAsImage(file);
    uploadedImage = img;
    uploadedImageUrl = url;

    setPreviewReadyState(true);
    resetPhotoTransform();
    renderPreview();

    if (lastGenerated) {
      drawPoster(lastGenerated);
    }
  } catch (error) {
    console.error(error);
    alert("画像の読み込みに失敗しました。別の画像で試してください。");
  }
}

function handleZoomChange() {
  if (!uploadedImage) return;

  const prevMetrics = getCoverMetrics(
    uploadedImage,
    previewCanvas.width,
    previewCanvas.height,
    photoTransform.zoom
  );

  const centerX = (previewCanvas.width / 2 - photoTransform.offsetX) / prevMetrics.drawW;
  const centerY = (previewCanvas.height / 2 - photoTransform.offsetY) / prevMetrics.drawH;

  photoTransform.zoom = Number(zoomRange.value) || 1;

  const nextMetrics = getCoverMetrics(
    uploadedImage,
    previewCanvas.width,
    previewCanvas.height,
    photoTransform.zoom
  );

  photoTransform.offsetX = previewCanvas.width / 2 - nextMetrics.drawW * centerX;
  photoTransform.offsetY = previewCanvas.height / 2 - nextMetrics.drawH * centerY;

  clampPhotoOffsets();
  renderPreview();

  if (lastGenerated) {
    drawPoster(lastGenerated);
  }
}

function handleGenerate() {
  if (!uploadedImage) {
    alert("写真をアップしてください。");
    return;
  }

  lastGenerated = createGeneratedData();
  drawPoster(lastGenerated);
  renderTextResult(lastGenerated);
  saveBtn.disabled = false;
}

function handleShuffle() {
  if (!uploadedImage) {
    alert("先に写真をアップしてください。");
    return;
  }

  const currentName = fitName(nameInput.value);
  lastGenerated = {
    ...createGeneratedData(),
    name: currentName
  };
  drawPoster(lastGenerated);
  renderTextResult(lastGenerated);
  saveBtn.disabled = false;
}

function handleSave() {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  const fileNameBase = fitName(nameInput.value).replace(/\s+/g, "_");
  link.download = `${fileNameBase || "idol"}_debut_poster.png`;
  link.click();
}

photoInput.addEventListener("change", handlePhotoChange);
zoomRange.addEventListener("input", handleZoomChange);

previewCanvas.addEventListener("pointerdown", startDrag);
previewCanvas.addEventListener("pointermove", moveDrag);
previewCanvas.addEventListener("pointerup", endDrag);
previewCanvas.addEventListener("pointercancel", endDrag);
previewCanvas.addEventListener("pointerleave", endDrag);

generateBtn.addEventListener("click", handleGenerate);
shuffleBtn.addEventListener("click", handleShuffle);
saveBtn.addEventListener("click", handleSave);

setPreviewReadyState(false);
resetCanvasPlaceholder();