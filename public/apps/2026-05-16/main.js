const asset = (p) => new URL(p, import.meta.url).toString();

const stage = document.getElementById("stage");
const puppet = document.getElementById("puppet");
const head = document.getElementById("head");
const mouth = document.getElementById("mouth");

const poseWave = document.getElementById("poseWave");
const poseNod = document.getElementById("poseNod");
const poseReset = document.getElementById("poseReset");

let pointerId = null;
let dragging = false;

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

let velocityX = 0;
let velocityY = 0;

let mouthOpen = 0;
let mouthTarget = 0;

let idleTick = 0;
let lastTapAt = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setPuppetVars() {
  const dx = currentX;
  const dy = currentY;

  const rot = clamp(dx * 0.08, -14, 14);
  const headRot = clamp(dx * 0.11 + velocityX * 0.08, -18, 18);

  const armL = clamp(-18 - dy * 0.12 - dx * 0.04 + velocityY * 0.08, -92, 42);
  const armR = clamp(18 - dy * 0.12 + dx * 0.04 + velocityY * 0.08, -42, 92);

  const eyeX = clamp(dx * 0.035, -5, 5);
  const eyeY = clamp(dy * 0.025, -4, 4);

  const squash = clamp(1 - Math.abs(velocityY) * 0.0008, 0.965, 1.025);

  puppet.style.setProperty("--x", `${dx}px`);
  puppet.style.setProperty("--y", `${dy}px`);
  puppet.style.setProperty("--rot", `${rot}deg`);
  puppet.style.setProperty("--headRot", `${headRot}deg`);
  puppet.style.setProperty("--armL", `${armL}deg`);
  puppet.style.setProperty("--armR", `${armR}deg`);
  puppet.style.setProperty("--eyeX", `${eyeX}px`);
  puppet.style.setProperty("--eyeY", `${eyeY}px`);
  puppet.style.setProperty("--squash", squash.toFixed(3));
  puppet.style.setProperty("--mouth", mouthOpen.toFixed(2));
}

function openMouth(strength = 1) {
  mouthTarget = clamp(strength, 0, 1);
  puppet.classList.add("talking");

  window.clearTimeout(openMouth.timer);
  openMouth.timer = window.setTimeout(() => {
    mouthTarget = 0;
    puppet.classList.remove("talking");
  }, 260);
}

function burstMove(type) {
  puppet.classList.remove("waving", "nodding");

  if (type === "wave") {
    puppet.classList.add("waving");
    window.setTimeout(() => puppet.classList.remove("waving"), 1300);
    return;
  }

  if (type === "nod") {
    puppet.classList.add("nodding");
    openMouth(0.45);
    window.setTimeout(() => puppet.classList.remove("nodding"), 1100);
  }
}

function resetPuppet() {
  targetX = 0;
  targetY = 0;
  velocityX = 0;
  velocityY = 0;
  mouthTarget = 0;
  puppet.classList.remove("talking", "waving", "nodding");
}

function getStagePoint(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height * 0.62,
  };
}

stage.addEventListener("pointerdown", (event) => {
  pointerId = event.pointerId;
  dragging = true;
  stage.setPointerCapture(pointerId);

  const point = getStagePoint(event);
  targetX = clamp(point.x, -105, 105);
  targetY = clamp(point.y, -125, 65);

  const now = Date.now();
  if (now - lastTapAt < 280) {
    burstMove("wave");
  } else {
    openMouth(1);
  }
  lastTapAt = now;
});

stage.addEventListener("pointermove", (event) => {
  if (!dragging || event.pointerId !== pointerId) return;

  const point = getStagePoint(event);
  targetX = clamp(point.x, -115, 115);
  targetY = clamp(point.y, -135, 70);

  const intensity = clamp(Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0), 0, 42);
  if (intensity > 18) {
    openMouth(0.55);
  }
});

stage.addEventListener("pointerup", (event) => {
  if (event.pointerId !== pointerId) return;
  dragging = false;
  pointerId = null;
});

stage.addEventListener("pointercancel", () => {
  dragging = false;
  pointerId = null;
});

poseWave.addEventListener("click", () => {
  burstMove("wave");
});

poseNod.addEventListener("click", () => {
  burstMove("nod");
});

poseReset.addEventListener("click", () => {
  resetPuppet();
});

function animate() {
  idleTick += 1;

  if (!dragging) {
    targetX += Math.sin(idleTick * 0.024) * 0.09;
    targetY += Math.sin(idleTick * 0.031) * 0.04;
    targetX *= 0.992;
    targetY *= 0.992;
  }

  const prevX = currentX;
  const prevY = currentY;

  currentX += (targetX - currentX) * 0.16;
  currentY += (targetY - currentY) * 0.16;

  velocityX = currentX - prevX;
  velocityY = currentY - prevY;

  mouthOpen += (mouthTarget - mouthOpen) * 0.35;

  if (!dragging && Math.random() < 0.006) {
    openMouth(Math.random() * 0.45 + 0.2);
  }

  setPuppetVars();

  requestAnimationFrame(animate);
}

animate();