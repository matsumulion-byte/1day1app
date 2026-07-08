const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const banner = document.querySelector("#banner");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const slowButton = document.querySelector("#slowButton");
const levelLabel = document.querySelector("#levelLabel");
const keyLabel = document.querySelector("#keyLabel");
const timeLabel = document.querySelector("#timeLabel");

const W = 960;
const H = 620;
const keys = new Set();
const pointer = { up: false, down: false, left: false, right: false };
const touchBlockTargets = [document.body, document.querySelector(".stage-wrap"), document.querySelector(".controls")];

const levels = [
  {
    start: { x: 72, y: 548 },
    key: { x: 820, y: 95 },
    exit: { x: 884, y: 535, w: 50, h: 64 },
    walls: [
      { x: 0, y: 0, w: W, h: 24 }, { x: 0, y: H - 24, w: W, h: 24 },
      { x: 0, y: 0, w: 24, h: H }, { x: W - 24, y: 0, w: 24, h: H },
      { x: 130, y: 120, w: 230, h: 38 }, { x: 510, y: 96, w: 54, h: 210 },
      { x: 220, y: 320, w: 320, h: 44 }, { x: 675, y: 270, w: 42, h: 230 },
      { x: 92, y: 448, w: 150, h: 38 }, { x: 365, y: 488, w: 210, h: 38 }
    ],
    shadows: [
      { x: 56, y: 70, w: 90, h: 80 }, { x: 392, y: 390, w: 100, h: 82 },
      { x: 760, y: 382, w: 72, h: 92 }
    ],
    cameras: [
      { x: 84, y: 84, base: 0.15, swing: 0.9, speed: 0.95, range: 250, fov: 0.56 },
      { x: 882, y: 152, base: 2.72, swing: 0.75, speed: 1.2, range: 285, fov: 0.5 },
      { x: 440, y: 594, base: -1.6, swing: 0.85, speed: 0.85, range: 275, fov: 0.52 }
    ]
  },
  {
    start: { x: 72, y: 72 },
    key: { x: 482, y: 542 },
    exit: { x: 878, y: 62, w: 56, h: 66 },
    walls: [
      { x: 0, y: 0, w: W, h: 24 }, { x: 0, y: H - 24, w: W, h: 24 },
      { x: 0, y: 0, w: 24, h: H }, { x: W - 24, y: 0, w: 24, h: H },
      { x: 158, y: 76, w: 44, h: 285 }, { x: 318, y: 0, w: 40, h: 225 },
      { x: 318, y: 330, w: 40, h: 220 }, { x: 506, y: 120, w: 46, h: 370 },
      { x: 694, y: 82, w: 46, h: 285 }, { x: 620, y: 456, w: 248, h: 42 }
    ],
    shadows: [
      { x: 232, y: 246, w: 68, h: 86 }, { x: 392, y: 68, w: 86, h: 72 },
      { x: 770, y: 252, w: 88, h: 86 }, { x: 98, y: 452, w: 92, h: 74 }
    ],
    cameras: [
      { x: 258, y: 574, base: -1.15, swing: 1.15, speed: 1.3, range: 265, fov: 0.48 },
      { x: 606, y: 60, base: 1.65, swing: 1.1, speed: 1.0, range: 310, fov: 0.46 },
      { x: 900, y: 548, base: -2.28, swing: 0.8, speed: 1.42, range: 300, fov: 0.5 },
      { x: 62, y: 280, base: 0, swing: 0.95, speed: 0.8, range: 245, fov: 0.54 }
    ]
  }
];

const state = {
  playing: false,
  won: false,
  level: 0,
  time: 0,
  last: 0,
  caughtTimer: 0,
  hasKey: false,
  player: { x: 72, y: 548, r: 14 }
};

function resetLevel(keepTime = false) {
  const level = levels[state.level];
  state.player.x = level.start.x;
  state.player.y = level.start.y;
  state.hasKey = false;
  state.caughtTimer = 0;
  state.won = false;
  if (!keepTime) state.time = 0;
  updateHud();
}

function updateHud() {
  levelLabel.textContent = `LEVEL ${state.level + 1}`;
  keyLabel.textContent = `KEY ${state.hasKey ? 1 : 0}/1`;
  timeLabel.textContent = state.time.toFixed(1).padStart(4, "0");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectHitCircle(rect, circle) {
  const x = clamp(circle.x, rect.x, rect.x + rect.w);
  const y = clamp(circle.y, rect.y, rect.y + rect.h);
  return (circle.x - x) ** 2 + (circle.y - y) ** 2 < circle.r ** 2;
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function movePlayer(dx, dy) {
  const level = levels[state.level];
  const nextX = { ...state.player, x: state.player.x + dx };
  if (!level.walls.some((wall) => rectHitCircle(wall, nextX))) state.player.x = nextX.x;
  const nextY = { ...state.player, y: state.player.y + dy };
  if (!level.walls.some((wall) => rectHitCircle(wall, nextY))) state.player.y = nextY.y;
}

function angleDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function cameraAngle(camera, t) {
  return camera.base + Math.sin(t * camera.speed) * camera.swing;
}

function seenByCamera(camera, t) {
  const level = levels[state.level];
  if (level.shadows.some((shadow) => pointInRect(state.player, shadow))) return false;
  const dx = state.player.x - camera.x;
  const dy = state.player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > camera.range) return false;
  const targetAngle = Math.atan2(dy, dx);
  return Math.abs(angleDiff(targetAngle, cameraAngle(camera, t))) < camera.fov;
}

function update(dt) {
  if (!state.playing) return;
  state.time += dt;

  const slow = keys.has("shift") || slowButton.classList.contains("active");
  const speed = slow ? 112 : 178;
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowup") || keys.has("w") || pointer.up) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s") || pointer.down) dy += 1;
  if (keys.has("arrowleft") || keys.has("a") || pointer.left) dx -= 1;
  if (keys.has("arrowright") || keys.has("d") || pointer.right) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    movePlayer((dx / len) * speed * dt, (dy / len) * speed * dt);
  }

  const level = levels[state.level];
  if (!state.hasKey && Math.hypot(state.player.x - level.key.x, state.player.y - level.key.y) < 34) {
    state.hasKey = true;
  }

  const seen = level.cameras.some((camera) => seenByCamera(camera, state.time));
  state.caughtTimer = seen ? state.caughtTimer + dt : Math.max(0, state.caughtTimer - dt * 1.8);
  if (state.caughtTimer > 0.68) {
    banner.classList.remove("hidden");
    banner.querySelector("strong").textContent = "録画に映った";
    banner.querySelector("span").textContent = "物陰でやり過ごすか、慎重歩きでタイミングを合わせよう";
    startButton.textContent = "RETRY";
    state.playing = false;
    resetLevel(true);
  }

  if (state.hasKey && pointInRect(state.player, level.exit)) {
    if (state.level < levels.length - 1) {
      state.level += 1;
      resetLevel(true);
    } else {
      state.playing = false;
      state.won = true;
      banner.classList.remove("hidden");
      banner.querySelector("strong").textContent = "監視網を突破";
      banner.querySelector("span").textContent = `クリアタイム ${state.time.toFixed(1)} 秒`;
      startButton.textContent = "PLAY AGAIN";
    }
  }

  updateHud();
}

function drawRect(rect, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  }
}

function drawCamera(camera) {
  const angle = cameraAngle(camera, state.time);
  const left = angle - camera.fov;
  const right = angle + camera.fov;
  const grad = ctx.createRadialGradient(camera.x, camera.y, 12, camera.x, camera.y, camera.range);
  grad.addColorStop(0, "rgba(255, 209, 102, 0.38)");
  grad.addColorStop(1, "rgba(255, 209, 102, 0)");
  ctx.beginPath();
  ctx.moveTo(camera.x, camera.y);
  ctx.arc(camera.x, camera.y, camera.range, left, right);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#26333a";
  ctx.strokeStyle = "#edf7ef";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-12, -10, 28, 20, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(16, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  const level = levels[state.level];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b1519";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(237, 247, 239, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  drawRect(level.exit, state.hasKey ? "rgba(126, 231, 135, 0.32)" : "rgba(126, 231, 135, 0.08)", "#7ee787");
  ctx.fillStyle = "#7ee787";
  ctx.font = "800 13px system-ui";
  ctx.fillText("EXIT", level.exit.x + 9, level.exit.y + 36);

  level.shadows.forEach((shadow) => drawRect(shadow, "rgba(40, 55, 61, 0.92)", "rgba(237, 247, 239, 0.18)"));
  level.walls.forEach((wall) => drawRect(wall, "#172229", "rgba(237, 247, 239, 0.12)"));
  level.cameras.forEach(drawCamera);

  if (!state.hasKey) {
    ctx.save();
    ctx.translate(level.key.x, level.key.y);
    ctx.rotate(state.time * 1.8);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-5, -14, 10, 20);
    ctx.fillRect(0, 2, 22, 6);
    ctx.fillRect(13, 6, 5, 9);
    ctx.beginPath();
    ctx.arc(0, -16, 9, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  const danger = clamp(state.caughtTimer / 0.68, 0, 1);
  ctx.fillStyle = danger > 0 ? `rgba(255, 92, 119, ${0.15 + danger * 0.32})` : "transparent";
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
  ctx.fillStyle = "#edf7ef";
  ctx.fill();
  ctx.strokeStyle = state.hasKey ? "#ffd166" : "#7ee787";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#0a0f13";
  ctx.beginPath();
  ctx.arc(state.player.x + 5, state.player.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();

  if (danger > 0) {
    ctx.fillStyle = "#ff5c77";
    ctx.font = "900 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("REC", state.player.x, state.player.y - 26);
    ctx.textAlign = "start";
  }
}

function loop(now) {
  const seconds = now / 1000;
  const dt = Math.min(0.033, seconds - state.last || 0);
  state.last = seconds;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  if (state.won) state.level = 0;
  resetLevel(false);
  state.playing = true;
  banner.classList.add("hidden");
  startButton.textContent = "START";
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

document.querySelectorAll(".move").forEach((button) => {
  const dir = button.dataset.dir;
  const set = (value) => {
    pointer[dir] = value;
    button.classList.toggle("active", value);
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    set(true);
  });
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointercancel", () => set(false));
  button.addEventListener("pointerleave", () => set(false));
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

touchBlockTargets.forEach((target) => {
  target?.addEventListener("contextmenu", (event) => event.preventDefault());
  target?.addEventListener("selectstart", (event) => event.preventDefault());
  target?.addEventListener("dragstart", (event) => event.preventDefault());
  target?.addEventListener("dblclick", (event) => event.preventDefault());
});

function releaseTouchControls() {
  Object.keys(pointer).forEach((dir) => {
    pointer[dir] = false;
  });
  document.querySelectorAll(".move.active").forEach((button) => button.classList.remove("active"));
  slowButton.classList.remove("active");
}

slowButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  slowButton.setPointerCapture(event.pointerId);
  slowButton.classList.add("active");
});
slowButton.addEventListener("pointerup", releaseTouchControls);
slowButton.addEventListener("pointercancel", releaseTouchControls);
slowButton.addEventListener("pointerleave", releaseTouchControls);
window.addEventListener("pointerup", releaseTouchControls);
window.addEventListener("blur", releaseTouchControls);
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", () => {
  state.level = 0;
  resetLevel(false);
  state.playing = false;
  banner.classList.remove("hidden");
  banner.querySelector("strong").textContent = "見つからずに鍵を取って出口へ";
  banner.querySelector("span").textContent = "矢印 / WASD で移動、Shift で慎重歩き";
  startButton.textContent = "START";
});

resetLevel(false);
requestAnimationFrame(loop);
