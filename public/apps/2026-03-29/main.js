const ASSET_BASE = "/apps/2026-03-29";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events,
  Mouse,
  MouseConstraint,
  Vector
} = Matter;

const worldEl = document.getElementById("world");
const scoreEl = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const overlayEl = document.getElementById("overlay");
const gameoverPanelEl = document.getElementById("gameoverPanel");
const finalScoreTextEl = document.getElementById("finalScoreText");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const dropBtn = document.getElementById("dropBtn");
const nextCanvas = document.getElementById("nextCanvas");
const centerGuide = document.getElementById("centerGuide");
const gameoverLineEl = document.getElementById("gameoverLine");

const nextCtx = nextCanvas.getContext("2d");

const DPR = Math.min(window.devicePixelRatio || 1, 2);

/** next プレビュー canvas の論理サイズ（CSS px）。DPR スケール後の描画座標と一致させる */
const NEXT_PREVIEW_SIZE = 84;

const STAGES = [
  { key: 1, radius: 28, score: 5, image: asset("./assets/marimo.png") },
  { key: 2, radius: 36, score: 10, image: asset("./assets/marimo.png") },
  { key: 3, radius: 44, score: 18, image: asset("./assets/marimo.png") },
  { key: 4, radius: 52, score: 28, image: asset("./assets/marimo.png") },
  { key: 5, radius: 62, score: 42, image: asset("./assets/marimo.png") },
  { key: 6, radius: 72, score: 60, image: asset("./assets/marimo.png") },
  { key: 7, radius: 84, score: 85, image: asset("./assets/marimo.png") },
  { key: 8, radius: 98, score: 120, image: asset("./assets/marimo.png") },
  { key: 9, radius: 114, score: 170, image: asset("./assets/marimo.png") },
  { key: 10, radius: 132, score: 240, image: asset("./assets/marimo.png") },
  { key: 11, radius: 152, score: 340, image: asset("./assets/marimo-final.png") }
];

const SPAWN_KEYS = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];

const images = new Map();
let assetsReady = false;

let engine;
let render;
let runner;
let walls = [];
let mouseConstraint = null;

let worldWidth = 0;
let worldHeight = 0;
let dropX = 0;
let score = 0;
let isStarted = false;
let isGameOver = false;
let canDrop = true;
let nextKey = 1;
let pendingMergeKeys = new Set();

const audio = new Audio(asset("./assets/bgm.mp3"));
audio.loop = true;
audio.volume = 0.55;
audio.preload = "auto";

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStage(key) {
  return STAGES.find((s) => s.key === key);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function preloadAssets() {
  const promises = STAGES.map(async (stage) => {
    const img = await loadImage(stage.image);
    images.set(stage.key, img);
  });
  await Promise.all(promises);
  assetsReady = true;
}

function createEngine() {
  engine = Engine.create({
    gravity: { x: 0, y: 1.02 }
  });

  engine.world.gravity.scale = 0.00125;
}

function createRenderer() {
  render = Render.create({
    element: worldEl,
    engine,
    options: {
      width: worldWidth,
      height: worldHeight,
      wireframes: false,
      background: "transparent",
      pixelRatio: DPR
    }
  });

  Render.run(render);
}

function createRunner() {
  runner = Runner.create();
  Runner.run(runner, engine);
}

function createWalls() {
  const thickness = 60;
  const floor = Bodies.rectangle(
    worldWidth / 2,
    worldHeight + thickness / 2 - 8,
    worldWidth,
    thickness,
    { isStatic: true, label: "floor", render: { visible: false } }
  );

  const leftWall = Bodies.rectangle(
    -thickness / 2 + 8,
    worldHeight / 2,
    thickness,
    worldHeight * 2,
    { isStatic: true, label: "wall", render: { visible: false } }
  );

  const rightWall = Bodies.rectangle(
    worldWidth + thickness / 2 - 8,
    worldHeight / 2,
    thickness,
    worldHeight * 2,
    { isStatic: true, label: "wall", render: { visible: false } }
  );

  walls = [floor, leftWall, rightWall];
  Composite.add(engine.world, walls);
}

function createMouseControl() {
  const mouse = Mouse.create(render.canvas);
  mouse.pixelRatio = DPR;

  mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.02,
      render: { visible: false }
    }
  });

  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;
}

function setResponsiveLayout() {
  const rect = worldEl.getBoundingClientRect();
  worldWidth = Math.floor(rect.width);
  worldHeight = Math.floor(rect.height);

  dropX = worldWidth / 2;

  centerGuide.style.left = `${dropX}px`;

  const overY = Math.max(140, worldHeight * 0.24);
  gameoverLineEl.style.top = `${overY}px`;
}

function destroyMatter() {
  if (mouseConstraint) {
    Composite.remove(engine.world, mouseConstraint);
    mouseConstraint = null;
  }
  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.textures = {};
    render = null;
  }
  if (runner) {
    Runner.stop(runner);
    runner = null;
  }
  if (engine) {
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    engine = null;
  }
}

function setupMatter() {
  setResponsiveLayout();
  createEngine();
  createRenderer();
  createRunner();
  createWalls();
  createMouseControl();
  hookEvents();
}

function drawStageSprite(ctx, key, size) {
  const img = images.get(key);
  if (!img) return;
  const w = NEXT_PREVIEW_SIZE;
  const h = NEXT_PREVIEW_SIZE;
  const drawSize = Math.min(size, w * 0.94, h * 0.94);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, (w - drawSize) / 2, (h - drawSize) / 2, drawSize, drawSize);
}

function updateNextPreview() {
  const stage = getStage(nextKey);
  if (!stage) return;
  drawStageSprite(nextCtx, nextKey, stage.radius * 1.6);
}

function updateScore() {
  scoreEl.textContent = `${score}`;
}

function randomNextKey() {
  return randChoice(SPAWN_KEYS);
}

function createMarimoBody(x, y, key, opts = {}) {
  const stage = getStage(key);
  const radius = stage.radius;

  const body = Bodies.circle(x, y, radius, {
    label: "marimo",
    restitution: 0.08,
    friction: 0.28,
    frictionAir: 0.03,
    density: 0.0018,
    slop: 0.01,
    render: {
      visible: false
    }
  });

  body.circleRadius = radius;
  body.marimoKey = key;
  body.merged = false;
  body.spawnAt = performance.now();
  body.isNewest = !!opts.isNewest;

  return body;
}

function spawnCurrentAtDropper() {
  if (!canDrop || isGameOver || !isStarted) return;

  const stage = getStage(nextKey);
  const minX = stage.radius + 10;
  const maxX = worldWidth - stage.radius - 10;
  const x = clamp(dropX, minX, maxX);
  const y = 76;

  const body = createMarimoBody(x, y, nextKey, { isNewest: true });
  Composite.add(engine.world, body);

  canDrop = false;
  setTimeout(() => {
    canDrop = true;
  }, 240);

  nextKey = randomNextKey();
  updateNextPreview();
}

function getTopLimitY() {
  const top = parseFloat(gameoverLineEl.style.top || "140");
  return Number.isNaN(top) ? 140 : top;
}

function handleGameOver() {
  if (isGameOver) return;
  isGameOver = true;
  isStarted = false;

  overlayEl.classList.add("hidden");
  gameoverPanelEl.classList.remove("hidden");
  finalScoreTextEl.textContent = `SCORE: ${score}`;

  audio.pause();
}

function mergeBodies(bodyA, bodyB) {
  if (!bodyA || !bodyB) return;
  if (bodyA.isStatic || bodyB.isStatic) return;
  if (bodyA.label !== "marimo" || bodyB.label !== "marimo") return;
  if (bodyA.marimoKey !== bodyB.marimoKey) return;
  if (bodyA.merged || bodyB.merged) return;

  const key = bodyA.marimoKey;
  const stage = getStage(key);
  const nextStage = getStage(key + 1);

  // 最終段階は合体しない
  if (!nextStage) return;
  if (!stage) return;

  const pairKey = [bodyA.id, bodyB.id].sort((a, b) => a - b).join("-");
  if (pendingMergeKeys.has(pairKey)) return;
  pendingMergeKeys.add(pairKey);

  bodyA.merged = true;
  bodyB.merged = true;

  const pos = {
    x: (bodyA.position.x + bodyB.position.x) / 2,
    y: (bodyA.position.y + bodyB.position.y) / 2 - 4
  };

  const vel = {
    x: (bodyA.velocity.x + bodyB.velocity.x) / 2,
    y: (bodyA.velocity.y + bodyB.velocity.y) / 2
  };

  setTimeout(() => {
    const stillA = Composite.get(engine.world, bodyA.id, "body");
    const stillB = Composite.get(engine.world, bodyB.id, "body");

    if (!stillA || !stillB) {
      pendingMergeKeys.delete(pairKey);
      return;
    }

    Composite.remove(engine.world, bodyA);
    Composite.remove(engine.world, bodyB);

    const merged = createMarimoBody(pos.x, pos.y, key + 1);
    Body.setVelocity(merged, vel);
    Composite.add(engine.world, merged);

    score += nextStage.score;
    updateScore();

    pendingMergeKeys.delete(pairKey);
  }, 20);
}

function hookEvents() {
  const tryMergePairs = (event) => {
    for (const pair of event.pairs) {
      mergeBodies(pair.bodyA, pair.bodyB);
    }
  };

  Events.on(engine, "collisionStart", tryMergePairs);
  Events.on(engine, "collisionActive", tryMergePairs);

  Events.on(render, "afterRender", () => {
    drawDropGuide();
    drawMarimos();
  });

  Events.on(engine, "beforeUpdate", () => {
    if (!isStarted || isGameOver) return;

    const bodies = Composite.allBodies(engine.world).filter((b) => b.label === "marimo");
    const limitY = getTopLimitY();

    for (const body of bodies) {
      if (body.position.y < limitY && Math.abs(body.velocity.y) < 0.45 && body.position.y > 20) {
        const age = performance.now() - (body.spawnAt || 0);
        if (age > 1200) {
          handleGameOver();
          return;
        }
      }
    }
  });
}

function drawMarimos() {
  if (!render) return;

  const ctx = render.context;
  const bodies = Composite.allBodies(engine.world).filter((b) => b.label === "marimo");

  for (const body of bodies) {
    const r = body.circleRadius || 20;
    const img = images.get(body.marimoKey);
    if (!img) continue;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
  }
}

function drawDropGuide() {
  if (!render || !isStarted || isGameOver) return;

  const ctx = render.context;
  const stage = getStage(nextKey);
  if (!stage) return;

  const x = clamp(dropX, stage.radius + 8, worldWidth - stage.radius - 8);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(x, 52);
  ctx.lineTo(x, worldHeight - 20);
  ctx.stroke();
  ctx.restore();

  const img = images.get(nextKey);
  if (img) {
    const size = stage.radius * 2;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, x - stage.radius, 24, size, size);
    ctx.restore();
  }
}

function moveDropper(dir) {
  if (!isStarted || isGameOver) return;

  dropX += dir * 22;
  const stage = getStage(nextKey);
  dropX = clamp(dropX, stage.radius + 8, worldWidth - stage.radius - 8);
  centerGuide.style.left = `${dropX}px`;
}

function onKeyDown(e) {
  if (!isStarted || isGameOver) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    moveDropper(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    moveDropper(1);
  } else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") {
    e.preventDefault();
    spawnCurrentAtDropper();
  }
}

function bindControls() {
  leftBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    moveDropper(-1);
  });

  rightBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    moveDropper(1);
  });

  dropBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    spawnCurrentAtDropper();
  });

  window.addEventListener("keydown", onKeyDown);

  worldEl.addEventListener("pointermove", (e) => {
    if (!isStarted || isGameOver) return;
    const rect = worldEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const stage = getStage(nextKey);
    dropX = clamp(x, stage.radius + 8, rect.width - stage.radius - 8);
    centerGuide.style.left = `${dropX}px`;
  });

  worldEl.addEventListener("pointerdown", (e) => {
    if (!isStarted || isGameOver) return;
    if (e.target.closest(".overlay-card")) return;
    const rect = worldEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const stage = getStage(nextKey);
    dropX = clamp(x, stage.radius + 8, rect.width - stage.radius - 8);
    centerGuide.style.left = `${dropX}px`;
    spawnCurrentAtDropper();
  });
}

function clearMarimos() {
  const bodies = Composite.allBodies(engine.world).filter((b) => b.label === "marimo");
  for (const body of bodies) {
    Composite.remove(engine.world, body);
  }
}

function resetGame() {
  isGameOver = false;
  isStarted = false;
  canDrop = true;
  score = 0;
  pendingMergeKeys.clear();
  updateScore();

  if (engine) {
    clearMarimos();
  }

  nextKey = randomNextKey();
  dropX = worldWidth / 2;
  centerGuide.style.left = `${dropX}px`;
  updateNextPreview();

  overlayEl.classList.remove("hidden");
  gameoverPanelEl.classList.add("hidden");
}

async function startGame() {
  if (!assetsReady) return;

  resetGame();
  overlayEl.classList.add("hidden");
  gameoverPanelEl.classList.add("hidden");
  isStarted = true;

  try {
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // 自動再生失敗は無視
  }
}

function rebuild() {
  destroyMatter();
  setupMatter();
  resetGame();
}

function debounce(fn, delay = 120) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const handleResize = debounce(() => {
  rebuild();
}, 140);

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
window.addEventListener("resize", handleResize);

async function init() {
  nextCanvas.width = NEXT_PREVIEW_SIZE * DPR;
  nextCanvas.height = NEXT_PREVIEW_SIZE * DPR;
  nextCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  await preloadAssets();
  setupMatter();
  bindControls();
  resetGame();
}

init();