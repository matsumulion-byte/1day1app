const asset = (p) => new URL(p, import.meta.url).toString();

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultModal = document.getElementById("resultModal");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");

const road = document.getElementById("road");
const player = document.getElementById("player");
const distanceText = document.getElementById("distanceText");
const speedText = document.getElementById("speedText");

const resultTitle = document.getElementById("resultTitle");
const resultDistance = document.getElementById("resultDistance");
const resultComment = document.getElementById("resultComment");

let bgm = null;

const lanePositions = [18, 50, 82];

let lane = 1;
let running = false;
let distance = 0;
let speed = 3.2;
let spawnTimer = 0;
let lastTime = 0;
let rafId = null;
let enemies = [];
let isDragging = false;
let touchStartX = 0;

const enemyTypes = [
  { className: "car-red", label: "" },
  { className: "car-blue", label: "" },
  { className: "car-white", label: "" },
  { className: "car-bus", label: "" },
  { className: "car-truck", label: "" },
];

function setupAudio() {
  if (bgm) return;

  bgm = new Audio(asset("./assets/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = 0.45;

  bgm.addEventListener("error", () => {
    bgm = null;
  });
}

function playBgm() {
  if (!bgm) return;
  bgm.currentTime = 0;
  bgm.play().catch(() => {});
}

function stopBgm() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

function setPlayerLane() {
  player.style.left = `${lanePositions[lane]}%`;
}

function moveLeft() {
  if (!running) return;
  lane = Math.max(0, lane - 1);
  setPlayerLane();
}

function moveRight() {
  if (!running) return;
  lane = Math.min(2, lane + 1);
  setPlayerLane();
}

function startGame() {
  setupAudio();

  startScreen.classList.add("hidden");
  resultModal.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  clearObjects();

  lane = 1;
  running = true;
  distance = 0;
  speed = 3.2;
  spawnTimer = 0;
  lastTime = performance.now();

  setPlayerLane();
  updateHud();
  playBgm();

  rafId = requestAnimationFrame(loop);
}

function endGame() {
  if (!running) return;

  running = false;
  cancelAnimationFrame(rafId);
  stopBgm();

  const result = getResult(distance);

  resultTitle.innerHTML = result.title;
  resultDistance.textContent = `${Math.floor(distance)}m`;
  resultComment.textContent = result.comment;

  resultModal.classList.remove("hidden");
}

function clearObjects() {
  enemies.forEach((obj) => obj.el.remove());
  enemies = [];
}

function updateHud() {
  distanceText.textContent = `${Math.floor(distance)}m`;

  if (speed < 4.4) {
    speedText.textContent = "低速";
  } else if (speed < 5.8) {
    speedText.textContent = "混雑";
  } else if (speed < 7.4) {
    speedText.textContent = "狂気";
  } else {
    speedText.textContent = "帰省";
  }

  const roadSpeed = Math.max(0.24, 0.7 - speed * 0.055);
  road.style.setProperty("--road-speed", `${roadSpeed}s`);
  road.querySelectorAll("*");
}

function spawnEnemy() {
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const enemyLane = Math.floor(Math.random() * 3);

  const el = document.createElement("div");
  el.className = `enemy-car ${type.className}`;
  el.style.left = `${lanePositions[enemyLane]}%`;
  el.style.top = "-130px";

  road.appendChild(el);

  enemies.push({
    el,
    lane: enemyLane,
    y: -130,
    height: type.className === "car-bus" ? 118 : 96,
  });
}

function loop(now) {
  if (!running) return;

  const dt = Math.min(32, now - lastTime);
  lastTime = now;

  const dtRatio = dt / 16.67;

  distance += speed * dtRatio;
  speed += 0.0026 * dtRatio;
  spawnTimer -= dt;

  const spawnInterval = Math.max(420, 950 - distance * 0.22);

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = spawnInterval;
  }

  moveObjects(dtRatio);
  checkCollision();
  updateHud();

  rafId = requestAnimationFrame(loop);
}

function moveObjects(dtRatio) {
  const objectSpeed = speed * 1.65 * dtRatio;

  enemies.forEach((enemy) => {
    enemy.y += objectSpeed;
    enemy.el.style.top = `${enemy.y}px`;
  });

  enemies = enemies.filter((enemy) => {
    if (enemy.y > window.innerHeight + 160) {
      enemy.el.remove();
      return false;
    }
    return true;
  });
}

function checkCollision() {
  const playerRect = player.getBoundingClientRect();

  for (const enemy of enemies) {
    const rect = enemy.el.getBoundingClientRect();

    if (isHit(playerRect, rect, 12)) {
      endGame();
      return;
    }
  }
}

function isHit(a, b, margin = 0) {
  return !(
    a.right - margin < b.left + margin ||
    a.left + margin > b.right - margin ||
    a.bottom - margin < b.top + margin ||
    a.top + margin > b.bottom - margin
  );
}

function getResult(m) {
  if (m < 500) {
    return {
      title: "まだ家の前",
      comment: "出発したという事実だけが残った。",
    };
  }

  if (m < 1000) {
    return {
      title: "近所のコンビニで終了",
      comment: "ここでアイスを買って帰る判断もある。",
    };
  }

  if (m < 3000) {
    return {
      title: "サービスエリアに吸い込まれた人",
      comment: "目的地よりSAの記憶の方が濃い。",
    };
  }

  if (m <5000) {
    return {
      title: "渋滞の概念を理解した人",
      comment: "車は進んでいない。でも心は少し進んだ。",
    };
  }

  if (m < 10000) {
    return {
      title: "海老名を越えし者",
      comment: "ここから先は選ばれた者だけの領域。",
    };
  }

  if (m < 15000) {
    return {
      title: "GWに車で出る判断をした人",
      comment: "勇気と無謀は、だいたい同じ顔をしている。",
    };
  }

  return {
    title: "移動そのものになった人",
    comment: "目的地はもう問題ではない。あなたが道路です。",
  };
}

function handleKeyDown(e) {
  if (e.key === "ArrowLeft") moveLeft();
  if (e.key === "ArrowRight") moveRight();
}

function handleTouchStart(e) {
  if (!running) return;
  isDragging = true;
  touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
  if (!running || !isDragging) return;

  const currentX = e.touches[0].clientX;
  const diff = currentX - touchStartX;

  if (Math.abs(diff) > 42) {
    if (diff > 0) {
      moveRight();
    } else {
      moveLeft();
    }

    touchStartX = currentX;
  }
}

function handleTouchEnd() {
  isDragging = false;
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
leftButton.addEventListener("click", moveLeft);
rightButton.addEventListener("click", moveRight);
window.addEventListener("keydown", handleKeyDown);

road.addEventListener("touchstart", handleTouchStart, { passive: true });
road.addEventListener("touchmove", handleTouchMove, { passive: true });
road.addEventListener("touchend", handleTouchEnd);

setPlayerLane();