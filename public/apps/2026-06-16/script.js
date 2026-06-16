const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");

const gravityButton = document.getElementById("gravityButton");
const shuffleButton = document.getElementById("shuffleButton");
const resetButton = document.getElementById("resetButton");
const modeText = document.getElementById("modeText");
const gravityValue = document.getElementById("gravityValue");
const buttonIcon = document.getElementById("buttonIcon");
const buttonLabel = document.getElementById("buttonLabel");

const world = {
  width: 1000,
  height: 600,
  floorY: 520,
  gravity: 0.34,
  targetGravity: 0.34,
  zeroG: false,
  dpr: 1,
  lastTime: 0,
  objects: [],
  drag: null,
  layoutScale: 1,
};

const objectSpecs = [
  { name: "sofa", rx: 0.31, base: 0, w: 190, h: 70, color: "#3d6f73", accent: "#31595c", mass: 2.6 },
  { name: "table", rx: 0.67, base: 0, w: 178, h: 28, color: "#6b4a35", accent: "#4d3526", mass: 2.4 },
  { name: "chair", rx: 0.82, base: 0, w: 92, h: 110, color: "#b5663f", accent: "#79462e", mass: 1.9 },
  { name: "bookA", rx: 0.59, base: 0.18, w: 78, h: 22, color: "#d95b4c", accent: "#f2d6a4", mass: 0.9 },
  { name: "bookB", rx: 0.72, base: 0.2, w: 68, h: 24, color: "#2f6f8f", accent: "#f2d6a4", mass: 0.85 },
  { name: "mug", rx: 0.77, base: 0.22, w: 42, h: 48, color: "#f1e5cc", accent: "#2f6f8f", mass: 0.8 },
  { name: "plant", rx: 0.9, base: 0, w: 58, h: 92, color: "#2f7a50", accent: "#8b583a", mass: 1.1 },
  { name: "clock", rx: 0.48, base: 0, w: 54, h: 54, color: "#f2c35a", accent: "#24302d", mass: 0.72 },
  { name: "remote", rx: 0.4, base: 0.15, w: 88, h: 24, color: "#252b2a", accent: "#dbe2db", mass: 0.65 },
  { name: "pillow", rx: 0.16, base: 0.42, w: 76, h: 50, color: "#e6b7a6", accent: "#c98578", mass: 0.7 },
  { name: "ball", rx: 0.7, base: 0, w: 48, h: 48, color: "#d96836", accent: "#f7d46d", mass: 0.55 },
  { name: "slipper", rx: 0.47, base: 0, w: 72, h: 30, color: "#80624d", accent: "#b89370", mass: 0.58 },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeObject(spec) {
  const scale = world.layoutScale;
  const w = spec.w * scale;
  const h = spec.h * scale;
  const x = Math.min(Math.max(world.width * spec.rx, w / 2 + 12), world.width - w / 2 - 12);
  const y = world.floorY - h / 2 - spec.base * 118 * scale;

  return {
    ...spec,
    x,
    y,
    w,
    h,
    homeX: x,
    homeY: y,
    vx: 0,
    vy: 0,
    angle: spec.angle || 0,
    va: 0,
    asleep: true,
    restitution: spec.name === "ball" ? 0.74 : 0.34,
    friction: 0.985,
    radius: Math.max(w, h) * 0.5,
  };
}

function resetRoom() {
  world.objects = objectSpecs.map(makeObject);
  world.gravity = 0.34;
  world.targetGravity = 0.34;
  world.zeroG = false;
  world.drag = null;
  updateMode();
}

function updateMode() {
  document.body.classList.toggle("zero-g", world.zeroG);
  gravityButton.setAttribute("aria-pressed", String(world.zeroG));
  modeText.textContent = world.zeroG ? "ZERO GRAVITY" : "GRAVITY ON";
  gravityValue.textContent = world.zeroG ? "0.00G" : "1.00G";
  buttonIcon.textContent = world.zeroG ? "↑" : "↓";
  buttonLabel.textContent = world.zeroG ? "重力を戻す" : "重力を切る";
}

function toggleGravity() {
  world.zeroG = !world.zeroG;
  world.targetGravity = world.zeroG ? 0 : 0.34;
  updateMode();

  for (const item of world.objects) {
    item.asleep = false;
    if (world.zeroG) {
      item.vx += rand(-1.25, 1.25) / item.mass;
      item.vy += rand(-4.2, -1.2) / item.mass;
      item.va += rand(-0.04, 0.04) / item.mass;
    } else {
      item.vx += rand(-0.5, 0.5) / item.mass;
      item.vy += rand(0.8, 2.8);
      item.va += rand(-0.03, 0.03);
    }
  }
}

function nudgeRoom() {
  for (const item of world.objects) {
    item.asleep = false;
    item.vx += rand(-2.2, 2.2) / item.mass;
    item.vy += rand(-2.7, 0.7) / item.mass;
    item.va += rand(-0.055, 0.055) / item.mass;
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const oldWidth = world.width;
  const oldHeight = world.height;
  world.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * world.dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * world.dpr));
  ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  world.width = rect.width;
  world.height = rect.height;
  world.floorY = world.height * 0.7;
  world.layoutScale = Math.min(1, Math.max(0.62, world.width / 560));

  if (world.objects.length && oldWidth && oldHeight) {
    const scaleX = world.width / oldWidth;
    const scaleY = world.height / oldHeight;
    for (const item of world.objects) {
      item.x *= scaleX;
      item.y *= scaleY;
      item.homeX *= scaleX;
      item.homeY *= scaleY;
    }
  }
}

function stepPhysics(dt) {
  const frameScale = Math.min(dt / 16.67, 2.2);
  world.gravity += (world.targetGravity - world.gravity) * 0.055;

  for (const item of world.objects) {
    if (world.drag?.item === item) continue;
    if (item.asleep && !world.zeroG) continue;

    const airDrift = world.zeroG ? 0.015 : 0;
    item.vx += Math.sin(performance.now() * 0.0007 + item.homeX) * airDrift / item.mass;
    item.vy += world.gravity * frameScale;
    item.x += item.vx * frameScale;
    item.y += item.vy * frameScale;
    item.angle += item.va * frameScale;

    const halfW = item.w / 2;
    const halfH = item.h / 2;
    const floor = world.floorY - halfH;
    const ceiling = halfH + 12;
    const left = halfW + 10;
    const right = world.width - halfW - 10;

    if (item.x < left) {
      item.x = left;
      item.vx = Math.abs(item.vx) * item.restitution;
      item.va *= -0.7;
    }

    if (item.x > right) {
      item.x = right;
      item.vx = -Math.abs(item.vx) * item.restitution;
      item.va *= -0.7;
    }

    if (item.y < ceiling) {
      item.y = ceiling;
      item.vy = Math.abs(item.vy) * item.restitution;
    }

    if (item.y > floor) {
      item.y = floor;
      if (!world.zeroG && Math.abs(item.vy) < 1.2) {
        item.vx = 0;
        item.vy = 0;
        item.va = 0;
        item.asleep = true;
      } else {
        item.vy = -Math.abs(item.vy) * item.restitution;
        item.vx *= 0.88;
        item.va *= 0.76;
      }
    }

    item.vx *= item.friction;
    item.vy *= item.friction;
    item.va *= 0.992;
  }

  if (world.zeroG || world.objects.some((item) => !item.asleep)) {
    resolveCollisions();
  }
}

function resolveCollisions() {
  for (let i = 0; i < world.objects.length; i += 1) {
    for (let j = i + 1; j < world.objects.length; j += 1) {
      const a = world.objects[i];
      const b = world.objects[j];
      if (!world.zeroG && a.asleep && b.asleep) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = (a.radius + b.radius) * 0.54;
      const distSq = dx * dx + dy * dy;

      if (distSq <= 0 || distSq > minDist * minDist) continue;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      const totalMass = a.mass + b.mass;

      a.x -= nx * overlap * (b.mass / totalMass) * 0.62;
      a.y -= ny * overlap * (b.mass / totalMass) * 0.62;
      b.x += nx * overlap * (a.mass / totalMass) * 0.62;
      b.y += ny * overlap * (a.mass / totalMass) * 0.62;

      const relativeVx = b.vx - a.vx;
      const relativeVy = b.vy - a.vy;
      const speed = relativeVx * nx + relativeVy * ny;
      if (speed > 0) continue;

      const impulse = (-1.15 * speed) / (1 / a.mass + 1 / b.mass);
      a.vx -= (impulse * nx) / a.mass;
      a.vy -= (impulse * ny) / a.mass;
      b.vx += (impulse * nx) / b.mass;
      b.vy += (impulse * ny) / b.mass;
      if (world.zeroG || Math.abs(speed) > 0.12) {
        a.asleep = false;
        b.asleep = false;
        a.va += rand(-0.008, 0.008);
        b.va += rand(-0.008, 0.008);
      }
    }
  }
}

function roundedRectPath(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRectItem(item, radius = 7) {
  roundedRectPath(-item.w / 2, -item.h / 2, item.w, item.h, radius);
  ctx.fillStyle = item.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(20, 24, 23, 0.22)";
  ctx.stroke();
}

function drawObject(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.angle);
  ctx.shadowColor = "rgba(22, 25, 24, 0.2)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;

  if (item.name === "sofa") {
    drawRectItem(item, 18);
    ctx.fillStyle = item.accent;
    roundedRectPath(-item.w / 2 + 14, -item.h / 2 - 28, item.w - 28, 42, 16);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundedRectPath(-item.w / 2 + 18, -6, item.w - 36, 18, 8);
    ctx.fill();
  } else if (item.name === "table") {
    drawRectItem(item, 6);
    ctx.fillStyle = item.accent;
    ctx.fillRect(-item.w / 2 + 16, 10, 10, 72);
    ctx.fillRect(item.w / 2 - 26, 10, 10, 72);
  } else if (item.name === "chair") {
    drawRectItem(item, 8);
    ctx.fillStyle = item.accent;
    ctx.fillRect(-item.w / 2 + 10, -item.h / 2 - 45, item.w - 20, 48);
    ctx.fillRect(-item.w / 2 + 12, 32, 9, 58);
    ctx.fillRect(item.w / 2 - 21, 32, 9, 58);
  } else if (item.name === "mug") {
    drawRectItem(item, 11);
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(item.w / 2 - 1, 2, 16, -1.1, 1.1);
    ctx.stroke();
  } else if (item.name === "plant") {
    ctx.fillStyle = item.accent;
    roundedRectPath(-20, 12, 40, 40, 7);
    ctx.fill();
    ctx.fillStyle = item.color;
    for (let i = 0; i < 7; i += 1) {
      ctx.save();
      ctx.rotate((i - 3) * 0.42);
      roundedRectPath(-8, -42, 16, 58, 12);
      ctx.fill();
      ctx.restore();
    }
  } else if (item.name === "clock" || item.name === "ball") {
    ctx.beginPath();
    ctx.arc(0, 0, item.w / 2, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(20, 24, 23, 0.24)";
    ctx.stroke();
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(item.name === "clock" ? 0 : 14, item.name === "clock" ? -17 : -12);
    ctx.moveTo(0, 0);
    ctx.lineTo(item.name === "clock" ? 14 : -10, item.name === "clock" ? 8 : 15);
    ctx.stroke();
  } else if (item.name.includes("book")) {
    drawRectItem(item, 4);
    ctx.fillStyle = item.accent;
    ctx.fillRect(-item.w / 2 + 10, -item.h / 2 + 4, 6, item.h - 8);
  } else if (item.name === "remote") {
    drawRectItem(item, 12);
    ctx.fillStyle = item.accent;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(-24 + i * 16, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item.name === "slipper") {
    roundedRectPath(-item.w / 2, -item.h / 2, item.w, item.h, 18);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.fillStyle = item.accent;
    roundedRectPath(-20, -item.h / 2 + 6, 38, 12, 12);
    ctx.fill();
  } else {
    drawRectItem(item, 14);
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(-item.w / 2 + 9, -item.h / 2 + 9, item.w - 18, item.h - 18);
  }

  ctx.restore();
}

function drawShelf() {
  ctx.save();
  const shelfWidth = Math.min(260 * world.layoutScale, world.width * 0.44);
  const shelfHeight = 18 * world.layoutScale;
  const legHeight = 118 * world.layoutScale;
  const legWidth = 10 * world.layoutScale;
  const y = world.floorY - 132 * world.layoutScale;
  const x = Math.min(world.width * 0.46, world.width - shelfWidth - 22);
  ctx.fillStyle = "#6b4a35";
  roundedRectPath(x, y, shelfWidth, shelfHeight, 7 * world.layoutScale);
  ctx.fill();
  ctx.fillStyle = "#4d3526";
  ctx.fillRect(x + 24 * world.layoutScale, y + shelfHeight - 4, legWidth, legHeight);
  ctx.fillRect(x + shelfWidth - 36 * world.layoutScale, y + shelfHeight - 4, legWidth, legHeight);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawShelf();

  const sorted = [...world.objects].sort((a, b) => a.y - b.y);
  for (const item of sorted) {
    drawObject(item);
  }
}

function animate(time) {
  const dt = world.lastTime ? time - world.lastTime : 16.67;
  world.lastTime = time;
  stepPhysics(dt);
  draw();
  requestAnimationFrame(animate);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function findObjectAt(point) {
  for (let i = world.objects.length - 1; i >= 0; i -= 1) {
    const item = world.objects[i];
    const dx = point.x - item.x;
    const dy = point.y - item.y;
    const hitW = item.w * 0.7;
    const hitH = item.h * 0.7;
    if (Math.abs(dx) < hitW && Math.abs(dy) < hitH) return item;
  }

  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  const point = pointerPosition(event);
  const item = findObjectAt(point);
  if (!item) return;

  canvas.setPointerCapture(event.pointerId);
  item.asleep = false;
  world.drag = {
    item,
    offsetX: point.x - item.x,
    offsetY: point.y - item.y,
    lastX: point.x,
    lastY: point.y,
    lastTime: performance.now(),
  };
});

canvas.addEventListener("pointermove", (event) => {
  if (!world.drag) return;
  const point = pointerPosition(event);
  const now = performance.now();
  const dt = Math.max(12, now - world.drag.lastTime);
  const item = world.drag.item;
  item.x = point.x - world.drag.offsetX;
  item.y = point.y - world.drag.offsetY;
  item.vx = ((point.x - world.drag.lastX) / dt) * 16;
  item.vy = ((point.y - world.drag.lastY) / dt) * 16;
  item.va += item.vx * 0.0008;
  world.drag.lastX = point.x;
  world.drag.lastY = point.y;
  world.drag.lastTime = now;
});

canvas.addEventListener("pointerup", () => {
  world.drag = null;
});

canvas.addEventListener("pointercancel", () => {
  world.drag = null;
});

gravityButton.addEventListener("click", toggleGravity);
shuffleButton.addEventListener("click", nudgeRoom);
resetButton.addEventListener("click", resetRoom);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetRoom();
requestAnimationFrame(animate);
