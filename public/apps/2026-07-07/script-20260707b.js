const wishInput = document.getElementById("wishInput");
const preview = document.getElementById("preview");
const previewText = document.getElementById("previewText");
const swatches = Array.from(document.querySelectorAll(".swatch"));
const hangBtn = document.getElementById("hangBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const hangingArea = document.getElementById("hangingArea");
const statusEl = document.getElementById("status");

const positions = [
  { left: 28, top: 290 },
  { left: 56, top: 262 },
  { left: 39, top: 360 },
  { left: 64, top: 412 },
  { left: 22, top: 452 },
  { left: 47, top: 500 },
  { left: 70, top: 512 }
];

let selectedColor = "sakura";
let placedCount = 0;

function getWish() {
  return wishInput.value.trim() || "星に願いを";
}

function syncPreview() {
  previewText.textContent = getWish();
}

function setColor(color) {
  selectedColor = color;
  preview.className = `tanzaku color-${color}`;
  swatches.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color === color);
  });
}

function hangTanzaku() {
  wishInput.blur();
  const wish = getWish();
  const position = positions[placedCount % positions.length];
  const offset = Math.floor(placedCount / positions.length) * 14;
  const tanzaku = document.createElement("button");
  tanzaku.type = "button";
  tanzaku.className = `tanzaku hanging color-${selectedColor}`;
  tanzaku.style.left = `${position.left + (offset % 10)}%`;
  tanzaku.style.top = `${position.top + offset}px`;
  tanzaku.setAttribute("aria-label", `短冊: ${wish}`);
  tanzaku.innerHTML = `<span class="hole"></span><span class="wish-text"></span>`;
  tanzaku.querySelector(".wish-text").textContent = wish;
  tanzaku.addEventListener("click", () => {
    tanzaku.remove();
    statusEl.textContent = "短冊をひとつ外しました。";
  });
  hangingArea.appendChild(tanzaku);
  placedCount += 1;
  statusEl.textContent = "短冊を笹に飾りました。短冊をタップすると外せます。";
}

function clearTanzaku() {
  hangingArea.innerHTML = "";
  placedCount = 0;
  statusEl.textContent = "笹の飾りを外しました。";
}

function downloadTanzaku() {
  const canvas = document.createElement("canvas");
  const scale = 3;
  canvas.width = 360 * scale;
  canvas.height = 720 * scale;
  const ctx = canvas.getContext("2d");
  const colors = {
    sakura: ["#ffc1d2", "#ff8fb0", "#d96f91"],
    lemon: ["#fff0a8", "#ffe077", "#d3ad3d"],
    mizu: ["#b9ebff", "#82d7ff", "#459dca"],
    fuji: ["#ddcaff", "#c9a8ff", "#9471d7"],
    wakaba: ["#c9f0a8", "#a7e27a", "#6fac48"]
  };
  const [light, base, shadow] = colors[selectedColor];

  ctx.scale(scale, scale);
  ctx.fillStyle = "#071528";
  ctx.fillRect(0, 0, 360, 720);

  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(180, 44);
  ctx.lineTo(180, 106);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(102, 104, 258, 610);
  gradient.addColorStop(0, light);
  gradient.addColorStop(1, base);
  roundRect(ctx, 102, 104, 156, 520, 12);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.fillStyle = shadow;
  ctx.fillRect(102, 600, 156, 24);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let y = 140; y < 580; y += 48) {
    ctx.beginPath();
    ctx.arc(132 + ((y / 48) % 3) * 36, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(7,21,40,0.72)";
  ctx.beginPath();
  ctx.arc(180, 142, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#243040";
  ctx.font = "700 26px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawVerticalText(ctx, getWish(), 188, 188, 34, 360);

  const link = document.createElement("a");
  link.download = "tanabata-tanzaku.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  statusEl.textContent = "短冊PNGを保存しました。";
}

function drawVerticalText(ctx, text, x, y, lineHeight, maxHeight) {
  const chars = Array.from(text).slice(0, 42);
  let currentY = y;
  let currentX = x;
  chars.forEach((char) => {
    if (currentY > y + maxHeight) {
      currentY = y;
      currentX -= lineHeight;
    }
    ctx.fillText(char, currentX, currentY);
    currentY += lineHeight;
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

wishInput.addEventListener("input", syncPreview);
swatches.forEach((button) => {
  button.addEventListener("click", () => setColor(button.dataset.color));
});
hangBtn.addEventListener("click", hangTanzaku);
downloadBtn.addEventListener("click", downloadTanzaku);
clearBtn.addEventListener("click", clearTanzaku);

syncPreview();
