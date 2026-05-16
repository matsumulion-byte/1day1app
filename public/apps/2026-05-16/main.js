const asset = (p) => new URL(p, import.meta.url).toString();

const stage = document.getElementById("stage");
const puppet = document.getElementById("puppet");

const poseTalk = document.getElementById("poseTalk");
const poseNod = document.getElementById("poseNod");
const poseReset = document.getElementById("poseReset");

let pointerId = null;
let dragging = false;

let dragStartX = 0;
let dragStartY = 0;
let dragX = 0;
let dragY = 0;

let targetLean = 0;
let currentLean = 0;

let targetLift = 0;
let currentLift = 0;

let targetMouth = 0;
let currentMouth = 0;

let idle = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function preventGestureZoom() {
  document.addEventListener("gesturestart", (event) => event.preventDefault());
  document.addEventListener("gesturechange", (event) => event.preventDefault());
  document.addEventListener("gestureend", (event) => event.preventDefault());

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 320) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

preventGestureZoom();

function setVars() {
  puppet.style.setProperty("--x", `${currentLean * 0.35}px`);
  puppet.style.setProperty("--y", `${currentLift}px`);
  puppet.style.setProperty("--rot", `${currentLean * 0.06}deg`);
  puppet.style.setProperty("--headRot", `${currentLean * 0.18}deg`);
  puppet.style.setProperty("--eyeX", `${clamp(currentLean * 0.035, -5, 5)}px`);
  puppet.style.setProperty("--eyeY", `${clamp(currentLift * -0.035, -4, 4)}px`);
  puppet.style.setProperty("--mouth", currentMouth.toFixed(2));
  puppet.style.setProperty("--squash", `${clamp(1 - Math.abs(currentLift) * 0.0009, 0.97, 1.02)}`);
}

function openMouth(power = 1) {
  targetMouth = clamp(power, 0, 1);
  puppet.classList.add("talking");

  window.clearTimeout(openMouth.timer);
  openMouth.timer = window.setTimeout(() => {
    targetMouth = 0;
    puppet.classList.remove("talking");
  }, 220);
}

function nod() {
  puppet.classList.add("nodding");
  openMouth(0.45);

  window.setTimeout(() => {
    puppet.classList.remove("nodding");
  }, 900);
}

function resetPuppet() {
  dragging = false;

  targetLean = 0;
  targetLift = 0;
  targetMouth = 0;

  puppet.classList.remove("talking", "nodding");
}

stage.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  pointerId = event.pointerId;
  dragging = true;

  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragX = 0;
  dragY = 0;

  stage.setPointerCapture(pointerId);

  openMouth(1);
});

stage.addEventListener("pointermove", (event) => {
  if (!dragging || event.pointerId !== pointerId) return;

  event.preventDefault();

  dragX = event.clientX - dragStartX;
  dragY = event.clientY - dragStartY;

  targetLean = clamp(dragX, -95, 95);
  targetLift = clamp(dragY * 0.25, -22, 20);

  if (Math.abs(dragX) + Math.abs(dragY) > 44) {
    openMouth(0.45);
  }
});

stage.addEventListener("pointerup", (event) => {
  if (event.pointerId !== pointerId) return;

  event.preventDefault();

  dragging = false;
  pointerId = null;

  targetLean *= 0.35;
  targetLift *= 0.2;
});

stage.addEventListener("pointercancel", () => {
  dragging = false;
  pointerId = null;

  targetLean = 0;
  targetLift = 0;
});

stage.addEventListener("click", (event) => {
  event.preventDefault();
  openMouth(1);
});

poseTalk.addEventListener("click", (event) => {
  event.preventDefault();
  openMouth(1);
});

poseNod.addEventListener("click", (event) => {
  event.preventDefault();
  nod();
});

poseReset.addEventListener("click", (event) => {
  event.preventDefault();
  resetPuppet();
});

function animate() {
  idle += 1;

  if (!dragging) {
    targetLean += Math.sin(idle * 0.035) * 0.12;
    targetLean *= 0.965;

    targetLift += Math.sin(idle * 0.042) * 0.04;
    targetLift *= 0.96;

    if (Math.random() < 0.004) {
      openMouth(Math.random() * 0.35 + 0.15);
    }
  }

  currentLean += (targetLean - currentLean) * 0.18;
  currentLift += (targetLift - currentLift) * 0.18;
  currentMouth += (targetMouth - currentMouth) * 0.32;

  setVars();
  requestAnimationFrame(animate);
}

animate();
