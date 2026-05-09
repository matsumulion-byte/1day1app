const asset = (p) => new URL(p, import.meta.url).toString();

const gameArea = document.getElementById("gameArea");
const sky = gameArea.querySelector(".sky");
const tower = document.getElementById("tower");
const cone = document.getElementById("cone");
const fallingIce = document.getElementById("fallingIce");
const soundButton = document.getElementById("soundButton");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("finalScore");
const resultTextEl = document.getElementById("resultText");
const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const ICE_WIDTH = 58;
const ICE_HEIGHT = 50;
const CONE_WIDTH = 66;
const BASE_Y_OFFSET = 16;
const CONE_TOP_FROM_BOTTOM = 82;
const STACK_STEP = 34;

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

const flavors = [
  "#fff0a8", // バニラ
  "#f3a0b6", // ストロベリー
  "#8a5635", // チョコ
  "#8de0bf", // チョコミント
  "#9fd36b", // 抹茶
  "#b79cff", // ブルーベリー
  "#f5b26b", // キャラメル
  "#dff6ff", // ラムネ
];

let areaRect;
let running = false;
let score = 0;
let coneX = 0;
let targetConeX = 0;
let falling = null;
let stacked = [];
let animationId = null;
let lastTime = 0;
let tilt = 0;
let soundEnabled = true;

function resetGame() {
  cancelAnimationFrame(animationId);

  areaRect = sky.getBoundingClientRect();
  running = false;
  score = 0;
  coneX = areaRect.width / 2;
  targetConeX = coneX;
  falling = null;
  stacked = [];
  tilt = 0;
  lastTime = 0;

  scoreEl.textContent = "0";
  fallingIce.style.top = "-120px";
  fallingIce.style.left = "50%";
  tower.style.left = `${coneX}px`;
  tower.style.transform = "translateX(-50%) rotate(0deg)";

  [...tower.querySelectorAll(".ice")].forEach((el) => el.remove());

  resultPanel.classList.add("hidden");
}

function startGame() {
  resetGame();
  startPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");

  if (soundEnabled) {
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
  }

  running = true;
  spawnIce();
  animationId = requestAnimationFrame(loop);
}

function spawnIce() {
  areaRect = sky.getBoundingClientRect();

  const margin = 44;
  const x = random(margin, areaRect.width - margin);
  const color = flavors[Math.floor(Math.random() * flavors.length)];

  falling = {
    x,
    y: -90,
    vy: 190 + Math.min(score * 8, 120),
    color,
    wobble: random(-0.5, 0.5),
  };

  fallingIce.innerHTML = `<span class="shine"></span>`;
  fallingIce.style.background = color;
  fallingIce.style.left = `${falling.x}px`;
  fallingIce.style.top = `${falling.y}px`;
}

function loop(time) {
  if (!running) return;

  if (!lastTime) lastTime = time;
  const dt = Math.min((time - lastTime) / 1000, 0.032);
  lastTime = time;

  updateCone(dt);
  updateFalling(dt);

  animationId = requestAnimationFrame(loop);
}

function updateCone(dt) {
  const ease = 1 - Math.pow(0.001, dt);
  coneX += (targetConeX - coneX) * ease;

  const minX = CONE_WIDTH / 2 + 14;
  const maxX = areaRect.width - CONE_WIDTH / 2 - 14;
  coneX = clamp(coneX, minX, maxX);

  tower.style.left = `${coneX}px`;

  const lean = stacked.reduce((sum, ice) => sum + ice.offset, 0) * 0.035;
  tilt += (lean - tilt) * 0.08;
  tower.style.transform = `translateX(-50%) rotate(${tilt}deg)`;
}

function updateFalling(dt) {
  if (!falling) return;

  falling.y += falling.vy * dt;
  falling.x += Math.sin(performance.now() * 0.004) * falling.wobble;

  fallingIce.style.left = `${falling.x}px`;
  fallingIce.style.top = `${falling.y}px`;

  const catchY = getCatchY();
  const fallingBottom = falling.y + ICE_HEIGHT;

  if (fallingBottom >= catchY) {
    const targetX = getTopX();
    const tolerance = Math.max(18, 30 - score * 0.28);
    const diff = falling.x - targetX;

    if (Math.abs(diff) <= tolerance) {
      stackIce(diff, falling.color);
      spawnIce();
    } else {
      gameOver();
    }
  }

  if (falling.y > areaRect.height + 60) {
    gameOver();
  }
}

function stackIce(diff, color) {
  score += 1;
  scoreEl.textContent = String(score);

  const offset = clamp(diff * 0.45, -24, 24);
  const previousOffset = stacked.length ? stacked[stacked.length - 1].offset : 0;
  const totalOffset = clamp(previousOffset + offset, -44, 44);

  stacked.push({
    offset: totalOffset,
    color,
  });

  const ice = document.createElement("div");
  ice.className = "ice";
  ice.innerHTML = `<span class="shine"></span>`;
  ice.style.background = color;

  const bottom = CONE_TOP_FROM_BOTTOM + (stacked.length - 1) * STACK_STEP;
  ice.style.bottom = `${bottom}px`;
  ice.style.transform = `translateX(calc(-50% + ${totalOffset}px)) rotate(${totalOffset * 0.16}deg)`;

  tower.appendChild(ice);

  tower.classList.remove("shake");
  void tower.offsetWidth;
  tower.classList.add("shake");

  if (score >= 7) {
    const danger = Math.abs(totalOffset) + Math.abs(tilt) * 4;
    if (danger > 58) {
      setTimeout(gameOver, 160);
    }
  }
}

function getCatchY() {
  const towerBottomY = areaRect.height - BASE_Y_OFFSET;
  const topHeight = CONE_TOP_FROM_BOTTOM + stacked.length * STACK_STEP;
  return towerBottomY - topHeight + 12;
}

function getTopX() {
  if (!stacked.length) return coneX;

  const top = stacked[stacked.length - 1];
  return coneX + top.offset;
}

function gameOver() {
  if (!running) return;

  running = false;
  cancelAnimationFrame(animationId);
  bgm.pause();

  finalScoreEl.textContent = String(score);
  resultTextEl.textContent = getResultText(score);
  resultPanel.classList.remove("hidden");
}

function getResultText(n) {
  if (n <= 0) return "コーンだけで帰宅";
  if (n <= 2) return "普通においしい";
  if (n <= 4) return "アイス屋の新人";
  if (n <= 6) return "だいぶ積める人";
  if (n <= 9) return "アイス積み職人";
  if (n <= 12) return "冷凍庫に祀られる人";
  return "アイスクリームの日の王";
}

function movePointer(clientX) {
  areaRect = sky.getBoundingClientRect();
  targetConeX = clientX - areaRect.left;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

sky.addEventListener("pointermove", (event) => {
  movePointer(event.clientX);
});

sky.addEventListener("pointerdown", (event) => {
  movePointer(event.clientX);
});

window.addEventListener("keydown", (event) => {
  if (!running) return;

  if (event.key === "ArrowLeft") {
    targetConeX -= 34;
  }

  if (event.key === "ArrowRight") {
    targetConeX += 34;
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.classList.toggle("is-muted", !soundEnabled);
  soundButton.textContent = soundEnabled ? "♪" : "×";

  if (!soundEnabled) {
    bgm.pause();
    return;
  }

  if (running) {
    bgm.play().catch(() => {});
  }
});

window.addEventListener("resize", () => {
  areaRect = sky.getBoundingClientRect();
  targetConeX = clamp(targetConeX, 40, areaRect.width - 40);
  coneX = clamp(coneX, 40, areaRect.width - 40);
});

resetGame();