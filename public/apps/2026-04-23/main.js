const asset = (p) => new URL(p, import.meta.url).toString();

const OBI_TEXTS = [
  "大丈夫。松村の攻略本だよ。",
  "全松が泣いた",
  "松村大絶賛",
  "これは一家に一冊必要ですね（松村）",
  "松村界隈、待望の一冊",
  "令和最新版・松村入門",
  "読めば松村がわかる",
  "ついに松村を読む時が来た",
  "松村書店、今月の推し",
  "一旦、全員読んでください（松村）",
];

const titleInput = document.getElementById("titleInput");
const authorInput = document.getElementById("authorInput");
const imageInput = document.getElementById("imageInput");
const imageRow = document.getElementById("imageRow");

const generateBtn = document.getElementById("generateBtn");
const rerollBtn = document.getElementById("rerollBtn");
const saveBtn = document.getElementById("saveBtn");

const bookCard = document.getElementById("bookCard");
const bookTitle = document.getElementById("bookTitle");
const bookAuthor = document.getElementById("bookAuthor");
const obiText = document.getElementById("obiText");

const photoPreview = document.getElementById("photoPreview");
const photoPlaceholder = document.getElementById("photoPlaceholder");

let currentImageUrl = "";
let currentObiIndex = 0;

function getSelectedMode() {
  const checked = document.querySelector('input[name="coverMode"]:checked');
  return checked ? checked.value : "photo";
}

function randomIndex(exclude = -1) {
  if (OBI_TEXTS.length <= 1) return 0;
  let idx = Math.floor(Math.random() * OBI_TEXTS.length);
  while (idx === exclude) {
    idx = Math.floor(Math.random() * OBI_TEXTS.length);
  }
  return idx;
}

function sanitizeText(value, fallback) {
  const text = (value || "").trim();
  return text || fallback;
}

function updateModeUI() {
  const mode = getSelectedMode();
  const isPhoto = mode === "photo";
  imageRow.style.display = isPhoto ? "block" : "none";
  bookCard.classList.toggle("book--photo", isPhoto);
  bookCard.classList.toggle("book--plain", !isPhoto);
}

function updatePhotoPreview() {
  if (currentImageUrl) {
    photoPreview.src = currentImageUrl;
    photoPreview.classList.add("is-visible");
    photoPlaceholder.classList.add("is-hidden");
  } else {
    photoPreview.removeAttribute("src");
    photoPreview.classList.remove("is-visible");
    photoPlaceholder.classList.remove("is-hidden");
  }
}

function applyBookData({ title, author, obi, mode }) {
  bookTitle.textContent = title;
  bookAuthor.textContent = author;
  obiText.textContent = obi;

  bookCard.classList.toggle("book--photo", mode === "photo");
  bookCard.classList.toggle("book--plain", mode === "plain");
}

function generateCover(changeObiOnly = false) {
  const mode = getSelectedMode();
  const title = sanitizeText(titleInput.value, "ここにタイトルが入ります");
  const author = sanitizeText(authorInput.value, "著者名");

  if (!changeObiOnly) {
    currentObiIndex = randomIndex();
  } else {
    currentObiIndex = randomIndex(currentObiIndex);
  }

  applyBookData({
    title,
    author,
    obi: OBI_TEXTS[currentObiIndex],
    mode,
  });

  updateModeUI();
  updatePhotoPreview();
}

function handleImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    currentImageUrl = "";
    updatePhotoPreview();
    return;
  }

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }

  currentImageUrl = URL.createObjectURL(file);
  updatePhotoPreview();
}

async function saveAsImage() {
  const scale = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
  const rect = bookCard.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);

  const mode = getSelectedMode();

  // Background
  if (mode === "photo") {
    ctx.fillStyle = "#8e887d";
    ctx.fillRect(0, 0, width, height);

    if (currentImageUrl && photoPreview.complete && photoPreview.naturalWidth > 0) {
      drawCoverImage(ctx, photoPreview, width, height);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "rgba(25,25,25,0.12)");
      grad.addColorStop(1, "rgba(25,25,25,0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#c0bbb0");
      grad.addColorStop(1, "#7d776d");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 18, 18, width - 36, height - 36, 10);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = '800 28px sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PHOTO", width / 2, height / 2);
    }
  } else {
    ctx.fillStyle = "#f6f0e4";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#9f2f2f";
    ctx.fillRect(0, 46, width, 12);
    ctx.fillRect(0, height - 42, width, 8);
  }

  // Publisher
  ctx.fillStyle = mode === "photo" ? "rgba(0,0,0,0.72)" : "#213b67";
  ctx.font = '700 12px sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  fillTextWithLetterSpacing(ctx, "松村新書", 16, 14, 1.2);

  // Text blocks
  const title = sanitizeText(titleInput.value, "ここにタイトルが入ります");
  const author = sanitizeText(authorInput.value, "著者名");
  const obi = OBI_TEXTS[currentObiIndex];

  if (mode === "photo") {
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;

    drawWrappedText(ctx, title, 20, height - 120, width - 40, 34, {
      font: '800 30px sans-serif',
      lineHeight: 1.28,
      align: "left",
      color: "#ffffff",
    });

    ctx.font = '700 16px sans-serif';
    ctx.fillText(author, 20, height - 44);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.fillStyle = "#252525";
    drawWrappedText(ctx, title, 34, 106, width - 68, 34, {
      font: '800 32px sans-serif',
      lineHeight: 1.45,
      align: "center",
      color: "#252525",
    });

    ctx.fillStyle = "#353535";
    ctx.font = '700 16px sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(author, width / 2, 250);
  }

  // Obi
  const obiY = Math.round(height * 0.53) - 38;
  const obiH = 76;
  const obiGrad = ctx.createLinearGradient(0, obiY, 0, obiY + obiH);
  obiGrad.addColorStop(0, "#f2ce63");
  obiGrad.addColorStop(1, "#dfb843");
  ctx.fillStyle = obiGrad;
  ctx.fillRect(0, obiY, width, obiH);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, obiY, width, 1);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, obiY + obiH - 1, width, 1);

  drawWrappedText(ctx, obi, 18, obiY + 15, width - 36, 28, {
    font: '900 26px sans-serif',
    lineHeight: 1.3,
    align: "center",
    color: "#111111",
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "matsumura-shinsho-cover.png";
  link.click();
}

function drawCoverImage(ctx, img, width, height) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let dx = 0;
  let dy = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    dx = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    dy = (height - drawHeight) / 2;
  }

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fillTextWithLetterSpacing(ctx, text, x, y, spacing) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, maxFontSize, options = {}) {
  const {
    font = `700 ${maxFontSize}px sans-serif`,
    lineHeight = 1.4,
    align = "left",
    color = "#000",
  } = options;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  const lines = wrapTextByCharacter(ctx, text, maxWidth);
  const fontSizeMatch = font.match(/(\d+)px/);
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : maxFontSize;
  const linePx = fontSize * lineHeight;

  let drawX = x;
  if (align === "center") {
    drawX = x + maxWidth / 2;
  } else if (align === "right") {
    drawX = x + maxWidth;
  }

  lines.forEach((line, i) => {
    ctx.fillText(line, drawX, y + i * linePx);
  });
}

function wrapTextByCharacter(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let current = "";

  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width <= maxWidth || current.length === 0) {
      current = test;
    } else {
      lines.push(current);
      current = ch;
    }
  }

  if (current) lines.push(current);
  return lines;
}

document.querySelectorAll('input[name="coverMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    updateModeUI();
    generateCover(false);
  });
});

imageInput.addEventListener("change", handleImageChange);
generateBtn.addEventListener("click", () => generateCover(false));
rerollBtn.addEventListener("click", () => generateCover(true));
saveBtn.addEventListener("click", saveAsImage);

updateModeUI();
generateCover(false);