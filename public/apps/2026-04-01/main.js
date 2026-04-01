const ASSET_BASE = "/apps/2026-04-01";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const stage = document.getElementById("stage");
const strapRoot = document.getElementById("strapRoot");
const strapEl = document.getElementById("strap");
const charmWrap = document.getElementById("charmWrap");
const charmEl = document.getElementById("charm");
const hintEl = document.getElementById("hint");
const limitFill = document.getElementById("limitFill");
const gameoverEl = document.getElementById("gameover");
const retryBtn = document.getElementById("retryBtn");

charmEl.src = asset("./assets/matsumura.png");

const BASE_STRAP = 170;
const CHARM_SIZE = 150;
const CHARM_TOP_OFFSET = Math.round(CHARM_SIZE * (2 / 150));

const DRAG_FOLLOW = 0.32;
const SPRING = 0.14;
const DAMPING = 0.9;

const SWAY_FOLLOW = 0.22;
const SWAY_SPRING = 0.1;
const SWAY_DAMPING = 0.91;

const BREAK_MIN = 250;
const BREAK_MAX = 330;
const MAX_VISUAL_PULL = 420;

let dragging = false;
let gameover = false;
let activePointerId = null;
let dragStartY = 0;
let dragStartX = 0;
let dragBaseStretch = 0;
let dragBaseSway = 0;

let stretch = 0;
let velocity = 0;
let targetStretch = 0;

let sway = 0;
let swayVelocity = 0;
let targetSway = 0;

let breakPoint = 0;

let flyX = 0;
let flyY = 0;
let flyVX = 0;
let flyVY = 0;
let flyRot = 0;
let flyRotV = 0;

function randomBreakPoint() {
  return BREAK_MIN + Math.random() * (BREAK_MAX - BREAK_MIN);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setHint(text) {
  hintEl.textContent = text;
}

function startDrag(e) {
  if (gameover) return;

  dragging = true;
  activePointerId = e.pointerId;

  dragStartY = e.clientY;
  dragStartX = e.clientX;
  dragBaseStretch = stretch;
  dragBaseSway = sway;

  setHint("そのまま引っ張る");

  try {
    charmEl.setPointerCapture(e.pointerId);
  } catch {}
}

function moveDrag(e) {
  if (!dragging) return;
  if (e.pointerId !== activePointerId) return;

  const dy = e.clientY - dragStartY;
  const dx = e.clientX - dragStartX;

  targetStretch = clamp(dragBaseStretch + dy, 0, MAX_VISUAL_PULL + 100);
  targetSway = clamp(dragBaseSway + dx * 0.35, -80, 80);
}

function endDrag(e) {
  if (!dragging) return;
  if (e.pointerId !== activePointerId) return;

  dragging = false;
  activePointerId = null;
  targetStretch = 0;
  targetSway = 0;
}

function doBreak() {
  gameover = true;
  dragging = false;
  activePointerId = null;

  strapEl.style.opacity = "0";

  flyX = sway;
  flyY = stretch;
  flyVX = sway * 0.08 + (Math.random() * 6 - 3);
  flyVY = -12 - Math.random() * 4;
  flyRot = 0;
  flyRotV = Math.random() * 12 - 6;

  setHint("切れた");
  gameoverEl.classList.remove("hidden");
}

function resetGame() {
  dragging = false;
  gameover = false;
  activePointerId = null;

  stretch = 0;
  velocity = 0;
  targetStretch = 0;

  sway = 0;
  swayVelocity = 0;
  targetSway = 0;

  flyX = 0;
  flyY = 0;
  flyVX = 0;
  flyVY = 0;
  flyRot = 0;
  flyRotV = 0;

  breakPoint = randomBreakPoint();

  strapEl.style.opacity = "1";
  strapEl.classList.remove("danger");
  gameoverEl.classList.add("hidden");
  limitFill.style.height = "0%";
  setHint("松村を下に引っ張る");

  render();
}

function updatePhysics() {
  if (gameover) {
    flyVY += 0.45;
    flyX += flyVX;
    flyY += flyVY;
    flyRot += flyRotV;
    return;
  }

  if (dragging) {
    const nextStretch = stretch + (targetStretch - stretch) * DRAG_FOLLOW;
    velocity = nextStretch - stretch;
    stretch = nextStretch;

    const nextSway = sway + (targetSway - sway) * SWAY_FOLLOW;
    swayVelocity = nextSway - sway;
    sway = nextSway;
  } else {
    velocity += -stretch * SPRING;
    velocity *= DAMPING;
    stretch += velocity;

    swayVelocity += -sway * SWAY_SPRING;
    swayVelocity *= SWAY_DAMPING;
    sway += swayVelocity;

    if (Math.abs(stretch) < 0.05 && Math.abs(velocity) < 0.05) {
      stretch = 0;
      velocity = 0;
    }

    if (Math.abs(sway) < 0.05 && Math.abs(swayVelocity) < 0.05) {
      sway = 0;
      swayVelocity = 0;
    }
  }

  stretch = Math.max(0, stretch);

  const ratio = stretch / breakPoint;
  strapEl.classList.toggle("danger", ratio >= 0.8);
  limitFill.style.height = `${clamp(ratio * 100, 0, 100)}%`;

  if (!gameover) {
    if (ratio >= 0.95) {
      setHint("やばい");
    } else if (ratio >= 0.8) {
      setHint("ちょっと危ない");
    } else if (dragging) {
      setHint("そのまま引っ張る");
    } else {
      setHint("松村を下に引っ張る");
    }
  }

  if (stretch >= breakPoint) {
    doBreak();
  }
}

function render() {
  if (!gameover) {
    const pullY = clamp(stretch, 0, MAX_VISUAL_PULL);
    const pullX = sway;

    const length = Math.sqrt(pullX * pullX + pullY * pullY);
    const strapLength = BASE_STRAP + length;

    const ratio = clamp(stretch / breakPoint, 0, 1.2);
    const strapWidth = ratio > 0.84 ? 6 - (ratio - 0.84) * 10 : 6;
    strapEl.style.height = `${strapLength}px`;
    strapEl.style.width = `${clamp(strapWidth, 2.8, 6)}px`;

    // 紐を先端方向へ回転
    const angle = Math.atan2(-pullX, pullY) * (180 / Math.PI);
    strapRoot.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    // 画像は紐の先端に置く
    charmWrap.style.top = `${strapLength - 10}px`;
    charmWrap.style.transform = `translateX(-50%) rotate(${-angle * 0.35}deg)`;

    const scaleX = 1 + clamp(ratio - 0.72, 0, 0.3) * 0.22;
    const scaleY = 1 - clamp(ratio - 0.72, 0, 0.3) * 0.1;
    charmEl.style.transform = `scale(${scaleX}, ${scaleY})`;
  } else {
    strapRoot.style.transform = `translateX(-50%) rotate(0deg)`;
    charmWrap.style.top = `${BASE_STRAP - 10}px`;
    charmWrap.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${flyRot}deg)`;
    charmEl.style.transform = "scale(1)";
  }
}

function loop() {
  updatePhysics();
  render();
  requestAnimationFrame(loop);
}

charmEl.addEventListener("pointerdown", startDrag);
window.addEventListener("pointermove", moveDrag, { passive: false });
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
retryBtn.addEventListener("click", resetGame);

resetGame();
loop();