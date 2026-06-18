const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const dashButton = document.getElementById("dashButton");
const message = document.getElementById("message");
const scoreText = document.getElementById("scoreText");
const timeText = document.getElementById("timeText");
const comboText = document.getElementById("comboText");
const pads = document.querySelectorAll(".pad");

const field = {
  width: 960,
  height: 540,
};

const player = {
  x: field.width * 0.5,
  y: field.height * 0.58,
  vx: 0,
  vy: 0,
  radius: 48,
  angle: 0,
  dash: 0,
  invincible: 0,
};

const state = {
  running: false,
  score: 0,
  combo: 0,
  timeLeft: 45,
  lastTime: 0,
  spawnTimer: 0,
  enemies: [],
  grains: [],
  trails: [],
  popups: [],
  keys: new Set(),
  touchDirs: new Set(),
};

const enemyTypes = [
  { name: "鮭", color: "#dd6a43", points: 120, speed: 84, radius: 38 },
  { name: "昆布", color: "#364434", points: 140, speed: 76, radius: 38 },
  { name: "明太", color: "#c63742", points: 160, speed: 96, radius: 38 },
  { name: "梅", color: "#b83242", points: -220, speed: 112, radius: 42, bad: true },
];

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const scale = canvas.width / field.width;
  field.height = canvas.height / scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function resetGame() {
  player.x = field.width * 0.5;
  player.y = field.height * 0.58;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
  player.dash = 0;
  player.invincible = 0;
  state.score = 0;
  state.combo = 0;
  state.timeLeft = 45;
  state.spawnTimer = 0;
  state.enemies = [];
  state.grains = [];
  state.trails = [];
  state.popups = [];
  for (let i = 0; i < 7; i += 1) spawnEnemy(true);
  updateHud();
}

function startGame() {
  resetGame();
  state.running = true;
  state.lastTime = performance.now();
  startButton.textContent = "リセット";
  message.classList.add("hidden");
  requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  startButton.textContent = "もう一回";
  message.innerHTML = `<strong>${state.score}点</strong><span>${state.combo >= 8 ? "米の勝ち。" : "まだ転がれる。"}</span>`;
  message.classList.remove("hidden");
}

function updateHud() {
  scoreText.textContent = String(Math.max(0, Math.floor(state.score)));
  timeText.textContent = String(Math.ceil(state.timeLeft));
  comboText.textContent = String(state.combo);
}

function randomEdgePoint() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * field.width, y: -30 };
  if (side === 1) return { x: field.width + 30, y: Math.random() * field.height };
  if (side === 2) return { x: Math.random() * field.width, y: field.height + 30 };
  return { x: -30, y: Math.random() * field.height };
}

function spawnEnemy(inside = false) {
  const base = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const edge = inside
    ? {
        x: 80 + Math.random() * (field.width - 160),
        y: 90 + Math.random() * (field.height - 180),
      }
    : randomEdgePoint();
  state.enemies.push({
    ...base,
    x: edge.x,
    y: edge.y,
    wobble: Math.random() * Math.PI * 2,
  });
}

function inputVector() {
  let x = 0;
  let y = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.touchDirs.has("left")) x -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("d") || state.touchDirs.has("right")) x += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("w") || state.touchDirs.has("up")) y -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("s") || state.touchDirs.has("down")) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function dash() {
  if (!state.running) {
    startGame();
    return;
  }
  player.dash = 0.22;
  dashButton.classList.add("active");
  window.setTimeout(() => dashButton.classList.remove("active"), 130);
}

function update(delta) {
  state.timeLeft = Math.max(0, state.timeLeft - delta);
  if (state.timeLeft <= 0) {
    updateHud();
    endGame();
    return;
  }

  const input = inputVector();
  const accel = player.dash > 0 ? 950 : 560;
  player.vx += input.x * accel * delta;
  player.vy += input.y * accel * delta;
  player.vx *= 0.91;
  player.vy *= 0.91;
  const speed = Math.hypot(player.vx, player.vy);
  const maxSpeed = player.dash > 0 ? 610 : 360;
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }
  player.x += player.vx * delta;
  player.y += player.vy * delta;
  player.angle += (player.vx / player.radius) * delta;
  player.x = Math.max(player.radius, Math.min(field.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(field.height - player.radius, player.y));
  player.dash = Math.max(0, player.dash - delta);
  player.invincible = Math.max(0, player.invincible - delta);
  if (Math.hypot(player.vx, player.vy) > 90) {
    state.trails.push({
      x: player.x,
      y: player.y + 28,
      radius: 9 + Math.random() * 8,
      life: 0.32,
    });
  }

  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0 && state.enemies.length < 13) {
    spawnEnemy();
    state.spawnTimer = Math.max(0.46, 1.1 - state.score / 9000);
  }

  for (const enemy of state.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const chase = enemy.speed + state.score / 260;
    enemy.wobble += delta * 4;
    enemy.x += (dx / distance) * chase * delta + Math.cos(enemy.wobble) * 12 * delta;
    enemy.y += (dy / distance) * chase * delta + Math.sin(enemy.wobble) * 12 * delta;
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance > player.radius + enemy.radius) continue;

    state.enemies.splice(i, 1);
    burst(enemy.x, enemy.y, enemy.color);
    if (enemy.bad && player.invincible <= 0) {
      state.combo = 0;
      state.score = Math.max(0, state.score + enemy.points);
      player.invincible = 0.9;
      player.vx *= -0.65;
      player.vy *= -0.65;
      pop(enemy.x, enemy.y, "梅!", "#b83242");
    } else {
      state.combo += 1;
      state.score += enemy.points + state.combo * 18;
      player.dash = Math.max(player.dash, 0.08);
      pop(enemy.x, enemy.y, `+${enemy.points}`, enemy.color);
    }
    spawnEnemy();
  }

  for (let i = state.grains.length - 1; i >= 0; i -= 1) {
    const grain = state.grains[i];
    grain.life -= delta;
    grain.x += grain.vx * delta;
    grain.y += grain.vy * delta;
    grain.vy += 160 * delta;
    if (grain.life <= 0) state.grains.splice(i, 1);
  }

  for (let i = state.trails.length - 1; i >= 0; i -= 1) {
    state.trails[i].life -= delta;
    if (state.trails[i].life <= 0) state.trails.splice(i, 1);
  }

  for (let i = state.popups.length - 1; i >= 0; i -= 1) {
    const popup = state.popups[i];
    popup.life -= delta;
    popup.y -= 52 * delta;
    if (popup.life <= 0) state.popups.splice(i, 1);
  }

  updateHud();
}

function burst(x, y, color) {
  for (let i = 0; i < 16; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 210;
    state.grains.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.35 + Math.random() * 0.35,
    });
  }
}

function pop(x, y, text, color) {
  state.popups.push({ x, y, text, color, life: 0.62 });
}

function drawField() {
  ctx.clearRect(0, 0, field.width, field.height);
  ctx.fillStyle = "#d74735";
  ctx.fillRect(0, 0, field.width, field.height);
  ctx.fillStyle = "#8f221d";
  ctx.fillRect(0, 0, field.width, 22);
  ctx.fillRect(0, field.height - 22, field.width, 22);
  ctx.fillRect(0, 0, 22, field.height);
  ctx.fillRect(field.width - 22, 0, 22, field.height);

  ctx.fillStyle = "#77aa5d";
  ctx.fillRect(22, 22, field.width - 44, field.height - 44);

  ctx.fillStyle = "rgba(56, 86, 42, 0.16)";
  for (let x = 22; x < field.width - 22; x += 84) {
    ctx.fillRect(x, 22, 18, field.height - 44);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let x = 48; x < field.width - 22; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x - 28, field.height - 22);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 248, 225, 0.28)";
  ctx.beginPath();
  ctx.ellipse(field.width * 0.5, field.height * 0.55, 260, 86, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 248, 225, 0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, field.width - 56, field.height - 56);
  ctx.strokeStyle = "rgba(39, 68, 34, 0.28)";
  ctx.lineWidth = 7;
  ctx.strokeRect(22, 22, field.width - 44, field.height - 44);
}

function drawTrails() {
  for (const trail of state.trails) {
    ctx.globalAlpha = Math.max(0, trail.life / 0.32) * 0.42;
    ctx.fillStyle = "#fff8e9";
    ctx.beginPath();
    ctx.ellipse(trail.x, trail.y, trail.radius * 1.6, trail.radius * 0.72, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOnigiri() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "rgba(35, 38, 28, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 66, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(player.angle);
  ctx.scale(1.22, 1.22);
  if (player.invincible > 0) ctx.globalAlpha = 0.58 + Math.sin(performance.now() / 55) * 0.22;

  ctx.fillStyle = "#fffdf6";
  ctx.strokeStyle = "#ded7c8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(45, 32);
  ctx.quadraticCurveTo(0, 49, -45, 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(218, 207, 188, 0.72)";
  for (const dot of [
    [-12, -16],
    [11, 3],
    [-22, 17],
    [19, 23],
  ]) {
    ctx.beginPath();
    ctx.arc(dot[0], dot[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#20372e";
  ctx.beginPath();
  ctx.roundRect(-16, 8, 32, 38, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  for (let x = -12; x <= 12; x += 8) ctx.fillRect(x, 10, 2, 34);
  ctx.restore();
}

function drawTextLabel(text, y, size = 16) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(32, 33, 29, 0.52)";
  ctx.strokeText(text, 0, y);
  ctx.fillStyle = "#fff8e9";
  ctx.fillText(text, 0, y);
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.bad) {
    ctx.fillStyle = "rgba(32, 33, 29, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.72, enemy.radius * 0.9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b83242";
    ctx.strokeStyle = "#fff8e9";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(99, 14, 30, 0.36)";
    ctx.lineWidth = 3;
    for (const wrinkle of [
      [-12, -1, 12, 0.4],
      [8, 10, 10, -0.7],
      [9, -9, 8, 1.2],
    ]) {
      ctx.save();
      ctx.translate(wrinkle[0], wrinkle[1]);
      ctx.rotate(wrinkle[3]);
      ctx.beginPath();
      ctx.arc(0, 0, wrinkle[2], 0.35, 2.5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.beginPath();
    ctx.arc(-8, -9, 6, 0, Math.PI * 2);
    ctx.fill();
    drawTextLabel("梅", 1, 23);
  } else {
    ctx.rotate(enemy.wobble * 0.18);
    ctx.fillStyle = "rgba(32, 33, 29, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.92, enemy.radius * 1.18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.name === "鮭") {
      const salmon = ctx.createLinearGradient(-34, -14, 34, 15);
      salmon.addColorStop(0, "#f08b59");
      salmon.addColorStop(0.52, "#df6845");
      salmon.addColorStop(1, "#b94834");
      ctx.fillStyle = salmon;
      ctx.strokeStyle = "#fff0d8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-34, -15, 68, 30, 12);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 248, 233, 0.55)";
      ctx.lineWidth = 5;
      for (let x = -23; x <= 20; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, -13);
        ctx.bezierCurveTo(x + 4, -5, x + 7, 5, x + 13, 13);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 235, 198, 0.42)";
      ctx.beginPath();
      ctx.ellipse(-13, -3, 9, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      drawTextLabel("鮭", 0, 16);
    } else if (enemy.name === "昆布") {
      const kombu = ctx.createLinearGradient(-16, -32, 16, 32);
      kombu.addColorStop(0, "#314a3f");
      kombu.addColorStop(0.45, "#20382f");
      kombu.addColorStop(1, "#17271f");
      ctx.fillStyle = kombu;
      ctx.strokeStyle = "#e9f2dc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-16, -32, 32, 64, 9);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      for (let x = -8; x <= 8; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, -27);
        ctx.bezierCurveTo(x + 4, -10, x - 5, 10, x, 27);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(189, 220, 170, 0.22)";
      for (let y = -22; y <= 22; y += 11) {
        ctx.beginPath();
        ctx.ellipse(5, y, 4, 1.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      drawTextLabel("昆", 0, 16);
    } else {
      const mentaiko = ctx.createLinearGradient(-34, -16, 34, 16);
      mentaiko.addColorStop(0, "#f25b5c");
      mentaiko.addColorStop(0.54, "#c63742");
      mentaiko.addColorStop(1, "#8f2531");
      ctx.fillStyle = mentaiko;
      ctx.strokeStyle = "#fff0d8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 211, 118, 0.92)";
      for (let x = -22; x <= 22; x += 8) {
        for (let y = -7; y <= 7; y += 7) {
          ctx.beginPath();
          ctx.arc(x + (y > 0 ? 2 : 0), y + Math.abs(x) * 0.04, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = "rgba(110, 25, 35, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-21, 3);
      ctx.bezierCurveTo(-6, 12, 10, 9, 23, 1);
      ctx.stroke();
      drawTextLabel("明", 0, 16);
    }
  }
  ctx.restore();
}

function drawParticles() {
  for (const grain of state.grains) {
    ctx.globalAlpha = Math.max(0, grain.life / 0.7);
    ctx.fillStyle = grain.color;
    ctx.beginPath();
    ctx.arc(grain.x, grain.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPopups() {
  for (const popup of state.popups) {
    const alpha = Math.max(0, popup.life / 0.62);
    ctx.globalAlpha = alpha;
    ctx.font = "900 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#fff8e9";
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawField();
  drawTrails();
  for (const enemy of state.enemies) drawEnemy(enemy);
  drawParticles();
  drawOnigiri();
  drawPopups();
}

function loop(now) {
  if (!state.running) return;
  const delta = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(delta);
  draw();
  if (state.running) requestAnimationFrame(loop);
}

function setDir(event, active) {
  const dir = event.currentTarget.dataset.dir;
  event.currentTarget.classList.toggle("active", active);
  if (active) state.touchDirs.add(dir);
  else state.touchDirs.delete(dir);
}

window.addEventListener("resize", () => {
  fitCanvas();
  draw();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s"].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === " ") dash();
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

for (const pad of pads) {
  pad.addEventListener("pointerdown", (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDir(event, true);
  });
  pad.addEventListener("pointerup", (event) => setDir(event, false));
  pad.addEventListener("pointercancel", (event) => setDir(event, false));
}

startButton.addEventListener("click", startGame);
dashButton.addEventListener("click", dash);

fitCanvas();
resetGame();
draw();
