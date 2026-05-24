const ASSET_BASE = "/apps/2026-05-24";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const caption = document.getElementById("caption");
const message = document.getElementById("message");
const startButton = document.getElementById("startButton");
const resultModal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const restartButton = document.getElementById("restartButton");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.42;

let W = 0;
let H = 0;
let dpr = 1;

let started = false;
let completed = false;
let items = [];
let effects = [];
let golfParts = [];
let lastCaption = "";
let captionTimer = null;

const totalTarget = 34;

const developmentMessages = [
  "景観がよくなりました。",
  "見通しがよくなりました。",
  "管理しやすい自然になりました。",
  "プレーしやすい緑になりました。",
  "自然の凹凸をなくしました。",
  "緑地としての価値が向上しました。",
  "芝の品質が均一化されました。",
  "開放感が生まれました。",
];

const lostMessages = {
  tree: [
    "フクロウが戻らなくなりました。",
    "リスの巣がなくなりました。",
    "キツツキの音がしなくなりました。",
    "日陰がなくなりました。",
    "古い木にいた虫が消えました。",
    "セミの声が減りました。",
  ],
  bush: [
    "バッタが減りました。",
    "カマキリの隠れ場所がなくなりました。",
    "名前のわからない草がなくなりました。",
    "それを食べる虫も減りました。",
    "草むらの気配が消えました。",
    "小さな通り道が途切れました。",
  ],
  flower: [
    "ミツバチが別の場所へ行きました。",
    "蝶が通り過ぎるだけになりました。",
    "花粉を運ぶ虫が減りました。",
    "春に咲くものがひとつ減りました。",
    "種が落ちる場所がなくなりました。",
  ],
  pond: [
    "フナが絶滅しました。",
    "カエルの声が消えました。",
    "ヤゴの居場所がなくなりました。",
    "水草が確認できなくなりました。",
    "メダカがいなくなりました。",
    "トンボが来なくなりました。",
  ],
  log: [
    "虫のすみかがなくなりました。",
    "朽ち木にいたものが消えました。",
    "土に還る前に片づけました。",
    "菌類の居場所が減りました。",
  ],
  nest: [
    "野鳥の巣が空になりました。",
    "タヌキが山側へ移動しました。",
    "ヘビが見えなくなりました。",
    "イタチが道路を渡りました。",
    "生きものの気配が減りました。",
  ],
};

const itemTypes = [
  { type: "tree", label: "木", count: 10 },
  { type: "bush", label: "草むら", count: 8 },
  { type: "flower", label: "花", count: 6 },
  { type: "pond", label: "水辺", count: 4 },
  { type: "log", label: "倒木", count: 3 },
  { type: "nest", label: "巣", count: 3 },
];

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = rect.width;
  H = rect.height;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!items.length) {
    setup();
  }
}

window.addEventListener("resize", resize);

function setup() {
  completed = false;
  items = [];
  effects = [];
  golfParts = [];

  for (const group of itemTypes) {
    for (let i = 0; i < group.count; i++) {
      items.push(createItem(group.type));
    }
  }

  updateProgress();
  draw();
}

function createItem(type) {
  const safeTop = H * 0.18;
  const safeBottom = H * 0.82;
  const margin = 34;

  let x = margin + Math.random() * (W - margin * 2);
  let y = safeTop + Math.random() * (safeBottom - safeTop);

  let attempts = 0;
  while (attempts < 80) {
    const tooClose = items.some((it) => Math.hypot(it.x - x, it.y - y) < 42);
    if (!tooClose) break;
    x = margin + Math.random() * (W - margin * 2);
    y = safeTop + Math.random() * (safeBottom - safeTop);
    attempts++;
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type,
    x,
    y,
    r: getRadius(type),
    alive: true,
    scale: 1,
    rot: Math.random() * Math.PI * 2,
  };
}

function getRadius(type) {
  if (type === "tree") return 25;
  if (type === "pond") return 31;
  if (type === "bush") return 23;
  if (type === "flower") return 20;
  if (type === "log") return 23;
  if (type === "nest") return 21;
  return 22;
}

function startGame() {
  started = true;
  completed = false;
  startButton.classList.add("hidden");
  resultModal.classList.add("hidden");
  message.textContent = "自然物をタップして、自然豊かなゴルフ場に整備しましょう。";
  setup();

  if (bgm.paused) {
    bgm.play().catch(() => {});
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    if (!started || completed) return;

    const p = getPointer(e);
    const target = findTarget(p.x, p.y);

    if (!target) {
      message.textContent = "そこはまだ整備対象ではありません。";
      addTapRipple(p.x, p.y, "miss");
      return;
    }

    develop(target);
  },
  { passive: false }
);

function getPointer(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function findTarget(x, y) {
  const aliveItems = items.filter((item) => item.alive);
  for (let i = aliveItems.length - 1; i >= 0; i--) {
    const item = aliveItems[i];
    const d = Math.hypot(item.x - x, item.y - y);
    if (d <= item.r + 12) return item;
  }
  return null;
}

function develop(item) {
  item.alive = false;

  addDevelopEffect(item.x, item.y, item.type);

  const lost = randomFrom(lostMessages[item.type]);
  showCaption(lost);
  lastCaption = lost;

  message.textContent = randomFrom(developmentMessages);

  updateProgress();
  maybeAddCourseFeature();

  if (getProgress() >= 100) {
    complete();
  }
}

function maybeAddCourseFeature() {
  const p = getProgress();

  const addOnce = (name, data) => {
    if (!golfParts.some((part) => part.feature === name)) {
      golfParts.push({ feature: name, ...data });
    }
  };

  if (p >= 8) {
    addOnce("teeGround", {
      type: "teeGround",
      x: W * 0.5,
      y: H * 0.78,
      r: 42,
    });
  }

  if (p >= 18) {
    addOnce("fairwayMain", {
      type: "fairwayMain",
      points: [
        { x: W * 0.5, y: H * 0.78 },
        { x: W * 0.34, y: H * 0.64 },
        { x: W * 0.62, y: H * 0.5 },
        { x: W * 0.45, y: H * 0.36 },
        { x: W * 0.54, y: H * 0.24 },
      ],
    });
  }

  if (p >= 34) {
    addOnce("roughLeft", {
      type: "roughArea",
      x: W * 0.24,
      y: H * 0.48,
      r: 72,
      rot: -0.4,
    });

    addOnce("roughRight", {
      type: "roughArea",
      x: W * 0.76,
      y: H * 0.52,
      r: 78,
      rot: 0.3,
    });
  }

  if (p >= 48) {
    addOnce("bunkerLeft", {
      type: "bunker",
      x: W * 0.33,
      y: H * 0.33,
      r: 35,
      rot: -0.4,
    });

    addOnce("bunkerRight", {
      type: "bunker",
      x: W * 0.68,
      y: H * 0.31,
      r: 31,
      rot: 0.5,
    });
  }

  if (p >= 62) {
    addOnce("cartPath", {
      type: "cartPath",
      points: [
        { x: W * 0.86, y: H * 0.82 },
        { x: W * 0.78, y: H * 0.66 },
        { x: W * 0.84, y: H * 0.52 },
        { x: W * 0.72, y: H * 0.36 },
        { x: W * 0.66, y: H * 0.2 },
      ],
    });
  }

  if (p >= 74) {
    addOnce("decorativePond", {
      type: "decorativePond",
      x: W * 0.22,
      y: H * 0.64,
      r: 42,
      rot: 0.4,
    });
  }

  if (p >= 84) {
    addOnce("green", {
      type: "courseGreen",
      x: W * 0.54,
      y: H * 0.24,
      r: 68,
      rot: 0.16,
    });
  }

  if (p >= 92) {
    addOnce("cup", {
      type: "cup",
      x: W * 0.54,
      y: H * 0.24,
    });

    addOnce("flagSign", {
      type: "sign",
      x: W * 0.18,
      y: H * 0.2,
    });
  }
}

function getProgress() {
  const developed = items.filter((item) => !item.alive).length;
  return Math.min(100, Math.round((developed / totalTarget) * 100));
}

function updateProgress() {
  const p = getProgress();
  progressText.textContent = `${p}%`;
  progressFill.style.width = `${p}%`;
}

function showCaption(text) {
  clearTimeout(captionTimer);
  caption.textContent = text;
  caption.classList.remove("hidden");
  caption.style.animation = "none";
  caption.offsetHeight;
  caption.style.animation = "";

  captionTimer = setTimeout(() => {
    caption.classList.add("hidden");
  }, 1450);
}

function addDevelopEffect(x, y, type) {
  const color =
    type === "pond"
      ? "#74c7e6"
      : type === "flower"
        ? "#f8d1df"
        : type === "tree"
          ? "#2f6d32"
          : "#d7b982";

  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 3.4;
    effects.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function addTapRipple(x, y, mode) {
  effects.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.7,
    color: mode === "miss" ? "#ffffff" : "#f5e76d",
    size: 12,
    ripple: true,
  });
}

function updateEffects() {
  effects.forEach((e) => {
    if (!e.ripple) {
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.94;
      e.vy *= 0.94;
    } else {
      e.size += 2.4;
    }
    e.life -= 0.028;
  });

  effects = effects.filter((e) => e.life > 0);
}

function complete() {
  completed = true;

  setTimeout(() => {
    resultText.textContent = [
      "自然豊かなゴルフ場ができました。",
      "",
      "フナは絶滅しました。",
      "フクロウは戻りませんでした。",
      "野草は芝に統一されました。",
      "",
      "ナイスコースです。",
    ].join("\n");

    resultModal.classList.remove("hidden");
  }, 700);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawGolfParts();
  drawItems();
  drawEffects();

  requestAnimationFrame(() => {
    updateEffects();
    draw();
  });
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#7bc96c");
  grad.addColorStop(0.48, "#66b957");
  grad.addColorStop(1, "#4e9d45");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;

  for (let y = -40; y < H + 80; y += 28) {
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(W + 40, y + 28);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 5;
  roundRect(ctx, 12, 12, W - 24, H - 24, 24);
  ctx.stroke();
  ctx.restore();
}

function drawGolfParts() {
  const layers = [
    "roughArea",
    "fairwayMain",
    "teeGround",
    "decorativePond",
    "bunker",
    "cartPath",
    "courseGreen",
    "cup",
    "sign",
  ];

  for (const layer of layers) {
    for (const part of golfParts) {
      if (part.type !== layer) continue;

      if (part.type === "roughArea") {
        drawBlob(part.x, part.y, part.r, "#4b9643", part.rot);
      }

      if (part.type === "fairwayMain") {
        drawFairway(part.points);
      }

      if (part.type === "teeGround") {
        drawTeeGround(part);
      }

      if (part.type === "decorativePond") {
        drawBlob(part.x, part.y, part.r, "#57b8d8", part.rot);
        drawPondHighlight(part.x, part.y, part.r);
      }

      if (part.type === "bunker") {
        drawBunker(part);
      }

      if (part.type === "cartPath") {
        drawCartPath(part.points);
      }

      if (part.type === "courseGreen") {
        drawBlob(part.x, part.y, part.r, "#8ee96f", part.rot);
        drawGreenRings(part.x, part.y, part.r);
      }

      if (part.type === "cup") {
        drawCup(part.x, part.y);
      }

      if (part.type === "sign") {
        drawGolfSign(part.x, part.y);
      }
    }
  }
}

function drawItems() {
  items
    .filter((item) => item.alive)
    .sort((a, b) => a.y - b.y)
    .forEach((item) => {
      if (item.type === "tree") drawTree(item);
      if (item.type === "bush") drawBush(item);
      if (item.type === "flower") drawFlower(item);
      if (item.type === "pond") drawPond(item);
      if (item.type === "log") drawLog(item);
      if (item.type === "nest") drawNest(item);
    });
}

function drawTree(item) {
  const { x, y, r } = item;

  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.75, r * 0.55, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7b4b2a";
  ctx.fillRect(x - 5, y - 2, 10, r * 0.82);

  ctx.fillStyle = "#245f2d";
  drawCircle(x - 11, y - 12, r * 0.58);
  drawCircle(x + 10, y - 12, r * 0.62);
  drawCircle(x, y - 25, r * 0.68);
  drawCircle(x, y - 6, r * 0.56);

  ctx.fillStyle = "#2f7b37";
  drawCircle(x - 4, y - 26, r * 0.33);

  ctx.restore();
}

function drawBush(item) {
  const { x, y, r } = item;
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 12, r * 0.72, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#377d31";
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 + item.rot;
    drawCircle(x + Math.cos(a) * 9, y + Math.sin(a) * 5, r * 0.42);
  }

  ctx.fillStyle = "#4a9a3d";
  drawCircle(x, y - 2, r * 0.48);

  ctx.restore();
}

function drawFlower(item) {
  const { x, y, r } = item;
  ctx.save();

  ctx.strokeStyle = "#2f7b37";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 16);
  ctx.lineTo(x, y - 4);
  ctx.stroke();

  const colors = ["#f4d35e", "#ff8fab", "#f72585", "#f7ede2"];
  ctx.fillStyle = colors[Math.floor(Math.abs(Math.sin(item.x)) * colors.length)];

  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(a) * 8,
      y - 9 + Math.sin(a) * 8,
      6,
      9,
      a,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.fillStyle = "#6b4f1d";
  drawCircle(x, y - 9, 5);

  ctx.restore();
}

function drawPond(item) {
  const { x, y, r } = item;
  ctx.save();

  drawBlob(x, y, r, "#55b9d6", item.rot);

  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 6, y - 3, r * 0.42, 0.1, Math.PI * 0.9);
  ctx.stroke();

  ctx.fillStyle = "#3c8f4a";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.28, y + r * 0.1, 14, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLog(item) {
  const { x, y, r } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(item.rot * 0.4);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(5, 12, r * 0.86, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#86562f";
  roundRect(ctx, -r * 0.8, -8, r * 1.6, 16, 8);
  ctx.fill();

  ctx.fillStyle = "#b27843";
  ctx.beginPath();
  ctx.arc(-r * 0.8, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6b4024";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-r * 0.8, 0, 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawNest(item) {
  const { x, y, r } = item;
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 12, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#81522e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0.2, Math.PI * 1.85);
  ctx.stroke();

  ctx.strokeStyle = "#5b3924";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + Math.random() * 0.1, y + Math.random() * 0.1, r * (0.42 + i * 0.035), i, Math.PI + i);
    ctx.stroke();
  }

  ctx.fillStyle = "#edf2f4";
  drawCircle(x - 5, y - 2, 5);
  drawCircle(x + 4, y - 1, 5);

  ctx.restore();
}

function drawEffects() {
  for (const e of effects) {
    ctx.save();
    ctx.globalAlpha = Math.max(e.life, 0);

    if (e.ripple) {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawPath(points) {
  ctx.save();
  ctx.strokeStyle = "#d7c58c";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.92;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const mx = (prev.x + current.x) / 2;
    const my = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }

  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

function drawFairway(points) {
  ctx.save();

  ctx.strokeStyle = "#91dc63";
  ctx.lineWidth = 78;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const mx = (current.x + next.x) / 2;
    const my = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, mx, my);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;

  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(points[0].x + i * 14, points[0].y);

    for (let j = 1; j < points.length - 1; j++) {
      const current = points[j];
      const next = points[j + 1];
      const mx = (current.x + next.x) / 2;
      const my = (current.y + next.y) / 2;
      ctx.quadraticCurveTo(current.x + i * 10, current.y, mx + i * 10, my);
    }

    ctx.lineTo(last.x + i * 8, last.y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTeeGround(part) {
  ctx.save();

  drawBlob(part.x, part.y, part.r, "#82d85f", 0.1);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(part.x - 13, part.y + 4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#dfe6d8";
  ctx.fillRect(part.x + 7, part.y - 13, 6, 23);

  ctx.restore();
}

function drawBunker(part) {
  drawBlob(part.x, part.y, part.r, "#ead895", part.rot);

  ctx.save();
  ctx.strokeStyle = "rgba(128, 96, 44, 0.28)";
  ctx.lineWidth = 2;

  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(part.x, part.y + i * 7, part.r * 0.62, part.r * 0.16, part.rot, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCartPath(points) {
  ctx.save();

  ctx.strokeStyle = "#c9b77e";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.96;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const mx = (current.x + next.x) / 2;
    const my = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, mx, my);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

function drawPondHighlight(x, y, r) {
  ctx.save();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 8, y - 4, r * 0.42, 0.1, Math.PI * 0.9);
  ctx.stroke();

  ctx.restore();
}

function drawGreenRings(x, y, r) {
  ctx.save();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.42 + i * 0.16), r * (0.26 + i * 0.11), 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGolfSign(x, y) {
  ctx.save();

  ctx.fillStyle = "#7a4d2b";
  ctx.fillRect(x - 4, y, 8, 46);

  ctx.fillStyle = "#fff4c2";
  roundRect(ctx, x - 48, y - 30, 96, 34, 8);
  ctx.fill();

  ctx.strokeStyle = "#173018";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#173018";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NATURE", x, y - 19);
  ctx.fillText("GOLF", x, y - 7);

  ctx.restore();
}

function drawCup(x, y) {
  ctx.save();

  ctx.fillStyle = "#162016";
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff8dc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 48);
  ctx.stroke();

  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 48);
  ctx.lineTo(x + 38, y - 38);
  ctx.lineTo(x + 2, y - 27);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBlob(x, y, r, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = color;
  ctx.beginPath();

  const points = 18;
  for (let i = 0; i <= points; i++) {
    const a = (Math.PI * 2 * i) / points;
    const wobble = 0.86 + Math.sin(i * 2.1 + x * 0.03) * 0.09 + Math.cos(i * 1.7 + y * 0.03) * 0.07;
    const px = Math.cos(a) * r * wobble * 1.16;
    const py = Math.sin(a) * r * wobble * 0.76;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawCircle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

resize();