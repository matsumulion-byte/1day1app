const ASSET_BASE = "/apps/2026-03-26";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const roundEl = document.getElementById("round");
const messageEl = document.getElementById("message");
const overlayEl = document.getElementById("overlay");
const overlayMessageEl = document.getElementById("overlayMessage");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const W = canvas.width;
const H = canvas.height;

const {
  Engine,
  World,
  Bodies,
  Body,
  Composite,
  Events,
} = window.Matter;

const matsumuraImg = new Image();
matsumuraImg.src = asset("./assets/matsumura.png");

const engine = Engine.create();
engine.gravity.y = 0.9;
const world = engine.world;

const state = {
  round: 1,
  maxRound: 3,
  phase: "idle", // idle, drawing, falling, success, gameover, clear
  line: null,
  lineBody: null,
  lineHits: 0,
  canDraw: false,
  drawing: false,
  fallers: [],
};

const matsumura = {
  x: W / 2,
  y: H - 78,
  w: 88,
  h: 110,
  hitR: 30,
};

const walls = [
  Bodies.rectangle(W / 2, H + 20, W, 40, { isStatic: true, label: "floor" }),
  Bodies.rectangle(-20, H / 2, 40, H, { isStatic: true, label: "wall" }),
  Bodies.rectangle(W + 20, H / 2, 40, H, { isStatic: true, label: "wall" }),
];

World.add(world, walls);

function setMessage(text) {
  messageEl.textContent = text;
}

function setOverlayMessage(text) {
  overlayMessageEl.textContent = text;
}

function clearBodies() {
  if (state.lineBody) {
    World.remove(world, state.lineBody);
    state.lineBody = null;
  }

  for (const f of state.fallers) {
    World.remove(world, f.body);
  }
  state.fallers = [];
}

function resetGame() {
  clearBodies();

  state.round = 1;
  state.phase = "idle";
  state.line = null;
  state.lineHits = 0;
  state.canDraw = false;
  state.drawing = false;

  roundEl.textContent = "1";
  setMessage("線を1本描いて松村を守れ！");
  setOverlayMessage("線を引いて開始");
  overlayEl.classList.remove("hidden");
  startBtn.textContent = "スタート";
}

function startRound() {
  clearBodies();

  state.line = null;
  state.lineHits = 0;
  state.canDraw = true;
  state.drawing = false;
  state.phase = "drawing";

  roundEl.textContent = String(state.round);
  overlayEl.classList.add("hidden");
  setOverlayMessage("");
  setMessage("短い線を1本だけ描ける！");
}

function nextRoundOrClear() {
  clearBodies();

  if (state.round >= state.maxRound) {
    state.phase = "clear";
    setMessage("クリア！");
    setOverlayMessage("クリア！");
    overlayEl.classList.remove("hidden");
    startBtn.textContent = "もう一回";
    return;
  }

  state.phase = "success";
  setMessage("SAFE! 次のラウンドへ");

  setTimeout(() => {
    state.round += 1;
    startRound();
  }, 900);
}

function gameOver() {
  if (state.phase === "gameover") return;
  state.phase = "gameover";
  state.canDraw = false;
  clearBodies();
  setMessage("OUT...");
  setOverlayMessage("OUT...");
  overlayEl.classList.remove("hidden");
  startBtn.textContent = "リトライ";
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

function clampToGameArea(p) {
  return {
    x: Math.max(20, Math.min(W - 20, p.x)),
    y: Math.max(90, Math.min(H - 240, p.y)),
  };
}

function startDraw(e) {
  if (!state.canDraw || state.phase !== "drawing") return;
  e.preventDefault();

  const p = clampToGameArea(getCanvasPos(e));
  state.drawing = true;
  state.line = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
}

function moveDraw(e) {
  if (!state.drawing || !state.line) return;
  e.preventDefault();

  const p = clampToGameArea(getCanvasPos(e));

  // 最大長さを短くする
  const maxLen = 110;
  const dx = p.x - state.line.x1;
  const dy = p.y - state.line.y1;
  const len = Math.hypot(dx, dy);

  if (len <= maxLen) {
    state.line.x2 = p.x;
    state.line.y2 = p.y;
  } else {
    const r = maxLen / len;
    state.line.x2 = state.line.x1 + dx * r;
    state.line.y2 = state.line.y1 + dy * r;
  }
}

function endDraw() {
  if (!state.drawing || !state.line) return;
  state.drawing = false;

  const len = lineLength(state.line);
  if (len < 35) {
    state.line = null;
    setMessage("もう少し長く描いて！");
    return;
  }

  createLineBody(state.line);
  state.canDraw = false;

  setMessage("落ちてくる！");
  setTimeout(() => {
    if (state.phase === "drawing") beginFall();
  }, 350);
}

function lineLength(line) {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

function createLineBody(line) {
  if (state.lineBody) {
    World.remove(world, state.lineBody);
    state.lineBody = null;
  }

  const cx = (line.x1 + line.x2) / 2;
  const cy = (line.y1 + line.y2) / 2;
  const len = lineLength(line);
  const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);

  state.lineBody = Bodies.rectangle(cx, cy, len, 10, {
    isStatic: true,
    angle,
    restitution: 0.85,
    friction: 0.001,
    label: "guardLine",
  });

  World.add(world, state.lineBody);
}

function beginFall() {
  state.phase = "falling";
  state.fallers = createFallers(state.round);
  World.add(
    world,
    state.fallers.map((f) => f.body)
  );
  setMessage(`落下物 ${state.round} 個！ 線は1回で壊れる`);
}

function createFallers(count) {
  const patterns = {
    1: [matsumura.x],
    2: [matsumura.x - 46, matsumura.x + 46],
    3: [matsumura.x - 62, matsumura.x, matsumura.x + 62],
  };
  const yPatterns = {
    1: [-40],
    2: [-40, -110],
    3: [-40, -110, -260],
  };

  const xs = patterns[count] ?? [matsumura.x];
  const ys = yPatterns[count] ?? xs.map((_, i) => -40 - i * 70);

  return xs.map((x, i) => {
    const size = 18 + i * 2;

    const body = Bodies.circle(x, ys[i], size, {
      restitution: 0.55,
      friction: 0.02,
      frictionAir: 0.01,
      density: 0.0015,
      label: "faller",
    });

    return {
      spawnX: x,
      r: size,
      body,
      color: ["#ff6b6b", "#ff9f43", "#f368e0"][i % 3],
      resolved: false,
    };
  });
}

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;

    const lineBody =
      a.label === "guardLine" ? a : b.label === "guardLine" ? b : null;

    const fallerBody = a.label === "faller" ? a : b.label === "faller" ? b : null;

    if (!lineBody || !fallerBody || !state.lineBody) continue;

    state.lineHits += 1;

    const linePos = state.lineBody.position;
    const hitPos = fallerBody.position;

    // 当たった位置が線の左か右かでズレ方向を変える
    const dir = hitPos.x < linePos.x ? -1 : 1;

    // ヒット数が増えるほどズレやすくする
    const shiftX = dir * (8 + state.lineHits * 2);
    const shiftY = 4 + state.lineHits * 1.2;
    const rotate = dir * 0.06;

    Body.setPosition(state.lineBody, {
      x: linePos.x + shiftX,
      y: linePos.y + shiftY,
    });

    Body.setAngle(state.lineBody, state.lineBody.angle + rotate);
  }
});

function checkHitMatsumura() {
  for (const f of state.fallers) {
    const p = f.body.position;
    const hit =
      Math.hypot(p.x - matsumura.x, p.y - (matsumura.y - 8)) <
      f.r + matsumura.hitR;

    if (hit) {
      gameOver();
      return true;
    }
  }
  return false;
}

function checkRoundClear() {
  if (state.phase !== "falling") return;

  let allStopped = true;
  let allNearlyMotionless = true;

  for (const f of state.fallers) {
    if (f.resolved) continue;

    const v = f.body.velocity;
    const speed = Math.hypot(v.x, v.y);
    const p = f.body.position;

    // 画面外に出たものは処理済み
    if (p.y > H + 100 || p.x < -100 || p.x > W + 100) {
      f.resolved = true;
      World.remove(world, f.body);
      continue;
    }

    // 十分遅く、床付近まで来ていたら停止扱い
    const nearFloor = p.y > H - 140;
    const stopped = speed < 0.18;
    const nearlyMotionless = speed < 0.06;

    if (!(nearFloor && stopped)) {
      allStopped = false;
    }
    if (!nearlyMotionless) {
      allNearlyMotionless = false;
    }
  }

  const activeFallers = state.fallers.filter((f) => !f.resolved);

  if (activeFallers.length === 0 || allStopped || allNearlyMotionless) {
    nextRoundOrClear();
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#d7ecff");
  grad.addColorStop(1, "#f8fbff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#d8c7a3";
  ctx.fillRect(0, H - 110, W, 110);

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - 110);
  ctx.lineTo(W, H - 110);
  ctx.stroke();
}

function drawLinePreview() {
  if (state.lineBody) {
    const pos = state.lineBody.position;
    const angle = state.lineBody.angle;
    const len = state.lineBody.bounds.max.x - state.lineBody.bounds.min.x;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (!state.line) return;

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(state.line.x1, state.line.y1);
  ctx.lineTo(state.line.x2, state.line.y2);
  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(state.line.x1, state.line.y1);
  ctx.lineTo(state.line.x2, state.line.y2);
  ctx.stroke();
}

function drawFallers() {
  for (const f of state.fallers) {
    const p = f.body.position;

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(p.x, H - 92, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, f.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", p.x, p.y + 4);
  }
}

function drawGuide() {
  if (state.phase !== "drawing") return;

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillRect(22, 18, W - 44, 46);

  ctx.fillStyle = "#222";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("短い線を1本だけ描けます", W / 2, 47);
}

function drawMatsumura() {
  const x = matsumura.x;
  const y = matsumura.y;

  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.beginPath();
  ctx.ellipse(x, y + 36, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  if (matsumuraImg.complete && matsumuraImg.naturalWidth > 0) {
    const maxW = matsumura.w;
    const maxH = matsumura.h;
    const ratio = Math.min(
      maxW / matsumuraImg.naturalWidth,
      maxH / matsumuraImg.naturalHeight
    );
    const drawW = matsumuraImg.naturalWidth * ratio;
    const drawH = matsumuraImg.naturalHeight * ratio;

    ctx.drawImage(
      matsumuraImg,
      x - drawW / 2,
      y - drawH / 2 + 10,
      drawW,
      drawH
    );
  } else {
    ctx.fillStyle = "#2f6fed";
    ctx.fillRect(x - 22, y + 4, 44, 42);

    ctx.fillStyle = "#ffd8b1";
    ctx.beginPath();
    ctx.arc(x, y - 10, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#222";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("松村", x, y + 78);
}

function loop() {
  Engine.update(engine, 1000 / 60);

  drawBackground();
  drawGuide();
  drawLinePreview();
  drawMatsumura();
  drawFallers();

  if (state.phase === "falling") {
    if (!checkHitMatsumura()) {
      checkRoundClear();
    }
  }

  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", startDraw);
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointercancel", endDraw);
canvas.addEventListener("pointerleave", endDraw);

startBtn.addEventListener("click", () => {
  if (state.phase === "gameover" || state.phase === "clear") {
    state.round = 1;
  }
  startRound();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

resetGame();
requestAnimationFrame(loop);