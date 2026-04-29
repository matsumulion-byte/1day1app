const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("poster");
const ctx = canvas.getContext("2d");

const photoInput = document.getElementById("photoInput");
const nameInput = document.getElementById("nameInput");
const copySelect = document.getElementById("copySelect");
const randomBtn = document.getElementById("randomBtn");
const makeBtn = document.getElementById("makeBtn");
const saveBtn = document.getElementById("saveBtn");

let userImage = null;

const copies = [
  "一家に一枚！",
  "ナウなヤングに大評判！",
  "信頼の品質！",
  "町内会も認めた逸品！",
  "暮らしに昭和の味わい！",
  "お茶の間騒然！",
  "これは便利と評判です！",
  "奥様もびっくり！",
  "毎日の暮らしに新提案！",
  "使って納得のこの一品！"
];

photoInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    userImage = img;
    URL.revokeObjectURL(url);
    drawPoster();
  };
  img.src = url;
});

nameInput.addEventListener("input", drawPoster);
copySelect.addEventListener("change", drawPoster);

randomBtn.addEventListener("click", () => {
  const copy = copies[Math.floor(Math.random() * copies.length)];
  let option = [...copySelect.options].find(o => o.value === copy);

  if (!option) {
    option = new Option(copy, copy);
    copySelect.add(option);
  }

  copySelect.value = copy;
  drawPoster();
});

makeBtn.addEventListener("click", drawPoster);

saveBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "showa-retro-sign.png";
  a.click();
});

function drawPoster() {
  const name = nameInput.value.trim() || "松村";
  const copy = copySelect.value || "一家に一枚！";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTinBase();
  drawBackgroundBlocks();
  drawPhotoArea();
  drawTexts(name, copy);
  drawBadge(copy);
  drawRust();
  drawScratches();
  drawScrewHoles();
  drawNoise();
  drawSideSlogan();
}

function drawTinBase() {
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#f6e7bd");
  g.addColorStop(0.5, "#e8c98e");
  g.addColorStop(1, "#b87834");

  roundRect(28, 28, 844, 1144, 38);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.lineWidth = 18;
  ctx.strokeStyle = "#5b2b18";
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = "#d7a54b";
  ctx.stroke();
}

function drawBackgroundBlocks() {
  ctx.save();

  ctx.fillStyle = "#123f64";
  ctx.beginPath();
  ctx.moveTo(52, 62);
  ctx.lineTo(848, 62);
  ctx.lineTo(730, 440);
  ctx.lineTo(52, 370);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#b51f17";
  ctx.beginPath();
  ctx.moveTo(52, 690);
  ctx.lineTo(848, 615);
  ctx.lineTo(848, 1078);
  ctx.lineTo(52, 1078);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 243, 197, .85)";
  ctx.beginPath();
  ctx.moveTo(72, 455);
  ctx.lineTo(825, 420);
  ctx.lineTo(825, 640);
  ctx.lineTo(72, 700);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPhotoArea() {
  const x = 138;
  const y = 345;
  const w = 624;
  const h = 470;

  ctx.save();

  roundRect(x, y, w, h, 28);
  ctx.clip();

  if (userImage) {
    drawCoverImage(userImage, x, y, w, h);

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(244, 192, 108, .28)";
    ctx.fillRect(x, y, w, h);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(20, 20, 20, .08)";
    for (let i = 0; i < h; i += 5) {
      ctx.fillRect(x, y + i, w, 1);
    }
  } else {
    ctx.fillStyle = "#ead3a0";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#8d6b3c";
    ctx.font = "900 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("写真を選んでください", x + w / 2, y + h / 2);
  }

  ctx.restore();

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#f7e8bd";
  roundRect(x, y, w, h, 28);
  ctx.stroke();
}

function drawTexts(name, copy) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.translate(450, 185);
  ctx.rotate(-0.07);

  strokeText(`これが`, 0, -68, 50, "#fff0c9", "#7a2616", 9);
  strokeText(`${name}`, 0, 6, fitFontSize(name, 100, 560), "#c92118", "#fff0c9", 12);
  strokeText(`です！`, 0, 102, 56, "#fff0c9", "#7a2616", 9);

  ctx.restore();

  ctx.save();
  ctx.translate(450, 884);
  ctx.rotate(-0.035);
  strokeText(`${name}印の逸品`, 0, 0, fitFontSize(`${name}印の逸品`, 68, 700), "#fff0c9", "#7a2616", 10);
  ctx.restore();

  ctx.save();
  ctx.translate(452, 1012);
  ctx.rotate(-0.07);

  ctx.fillStyle = "#f7e8bd";
  roundRect(-250, -42, 500, 80, 10);
  ctx.fill();

  ctx.fillStyle = "#2c1a0c";
  ctx.font = "900 38px sans-serif";
  ctx.fillText(copy, 0, 0);

  ctx.restore();

  ctx.fillStyle = "#f6d26b";
  ctx.font = "900 24px sans-serif";
  ctx.fillText("SHOWA RETRO SIGN", 450, 1110);
}

function drawSideSlogan() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(780, 265);
  ctx.rotate(Math.PI / 2);
  strokeText("信頼と実績の昭和品質", 0, 0, 34, "#123f64", "#f7e8bd", 8);
  ctx.restore();
}

function drawBadge(copy) {
  ctx.save();
  ctx.translate(176, 980);
  ctx.rotate(-0.12);

  ctx.beginPath();
  ctx.arc(0, 0, 84, 0, Math.PI * 2);
  ctx.fillStyle = "#e3b82f";
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = "#7a2616";
  ctx.stroke();

  ctx.fillStyle = "#123f64";
  ctx.font = "900 31px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("昭和", 0, -20);
  ctx.fillText("名物", 0, 22);

  ctx.restore();
}

function drawRust() {
  ctx.save();

  for (let i = 0; i < 360; i++) {
    const edge = Math.random();
    let x;
    let y;

    if (edge < 0.25) {
      x = rand(30, 870);
      y = rand(28, 90);
    } else if (edge < 0.5) {
      x = rand(30, 870);
      y = rand(1110, 1170);
    } else if (edge < 0.75) {
      x = rand(28, 90);
      y = rand(30, 1170);
    } else {
      x = rand(810, 872);
      y = rand(30, 1170);
    }

    const r = rand(2, 13);
    ctx.globalAlpha = rand(0.15, 0.5);
    ctx.fillStyle = Math.random() > 0.5 ? "#6f2d14" : "#9e4a1e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawScratches() {
  ctx.save();

  ctx.strokeStyle = "rgba(255, 238, 190, .45)";
  ctx.lineWidth = 3;

  for (let i = 0; i < 85; i++) {
    const x = rand(70, 830);
    const y = rand(70, 1120);
    const len = rand(24, 120);
    const angle = rand(-0.8, 0.8);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(70, 32, 12, .22)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 70; i++) {
    const x = rand(60, 840);
    const y = rand(60, 1140);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-50, 50), y + rand(-14, 14));
    ctx.stroke();
  }

  ctx.restore();
}

function drawScrewHoles() {
  const holes = [
    [82, 82],
    [818, 82],
    [82, 1118],
    [818, 1118]
  ];

  holes.forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x - 4, y - 4, 4, x, y, 25);
    g.addColorStop(0, "#2a140a");
    g.addColorStop(0.6, "#070302");
    g.addColorStop(1, "#8a4a20");

    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#120805";
    ctx.fill();
  });
}

function drawNoise() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#2b1607";

  for (let y = 0; y < canvas.height; y += 6) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.restore();
}

function drawCoverImage(img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;

  let sx;
  let sy;
  let sw;
  let sh;

  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function strokeText(text, x, y, size, fill, stroke, lineWidth) {
  ctx.font = `900 ${size}px sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function fitFontSize(text, maxSize, maxWidth) {
  let size = maxSize;
  ctx.font = `900 ${size}px sans-serif`;

  while (ctx.measureText(text).width > maxWidth && size > 32) {
    size -= 4;
    ctx.font = `900 ${size}px sans-serif`;
  }

  return size;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

drawPoster();