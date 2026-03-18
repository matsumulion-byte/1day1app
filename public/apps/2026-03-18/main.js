const asset = (p) => new URL(p, import.meta.url).toString();

const GAME_DURATION = 30_000;
const GHOST_FADE_IN = 2000;
const GHOST_HOLD_MIN = 800;
const GHOST_HOLD_MAX = 1200;
const GHOST_FADE_OUT = 2000;
const NEXT_DELAY_MIN = 700;
const NEXT_DELAY_MAX = 1400;

const SPAWN_POINTS = [
  { x: 0.17, y: 0.2, size: 0.22 },
  { x: 0.74, y: 0.18, size: 0.2 },
  { x: 0.5, y: 0.25, size: 0.26 },
  { x: 0.27, y: 0.42, size: 0.28 },
  { x: 0.76, y: 0.4, size: 0.24 },
  { x: 0.52, y: 0.52, size: 0.3 },
  { x: 0.18, y: 0.66, size: 0.34 },
  { x: 0.8, y: 0.67, size: 0.32 },
];

const game = document.getElementById("game");
const ghost = document.getElementById("ghost");
const startOverlay = document.getElementById("startOverlay");
const resultOverlay = document.getElementById("resultOverlay");
const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const timeText = document.getElementById("timeText");
const scoreText = document.getElementById("scoreText");
const finalScore = document.getElementById("finalScore");
const finalComment = document.getElementById("finalComment");
const message = document.getElementById("message");
const tapFlash = document.getElementById("tapFlash");

const audio = new Audio(asset("./assets/bgm.mp3"));
audio.loop = false;
audio.preload = "auto";
audio.playsInline = true;

game.style.backgroundImage = `
  linear-gradient(rgba(7, 14, 18, 0.14), rgba(7, 14, 18, 0.22)),
  url("${asset("./assets/bg.png")}")
`;
ghost.src = asset("./assets/ghost-matsumura.png");

let score = 0;
let isPlaying = false;
let startTime = 0;
let timeRaf = 0;
let spawnTimeout = 0;
let phaseTimeout = 0;
let hideTimeout = 0;
let activeGhost = false;
let ghostHit = false;
let currentPointIndex = -1;
let currentScaleBase = 1;
let floatRaf = 0;
let ghostStartAt = 0;
let matchedSpawnCount = 0;

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clearTimers() {
  window.clearTimeout(spawnTimeout);
  window.clearTimeout(phaseTimeout);
  window.clearTimeout(hideTimeout);
  cancelAnimationFrame(timeRaf);
  cancelAnimationFrame(floatRaf);
}

function resetGhost() {
  activeGhost = false;
  ghostHit = false;
  ghost.style.display = "none";
  ghost.style.opacity = "0";
  ghost.style.pointerEvents = "none";
  ghost.style.transform = "translate(-50%, -50%) scale(1)";
  ghost.removeAttribute("data-active");
}

function updateHud() {
  scoreText.textContent = String(score);
}

function showMessage(text, duration = 600) {
  message.textContent = text;
  message.classList.add("show");
  window.clearTimeout(showMessage._timer);
  showMessage._timer = window.setTimeout(() => {
    message.classList.remove("show");
  }, duration);
}

function flashAt(clientX, clientY) {
  const rect = game.getBoundingClientRect();
  tapFlash.style.left = `${clientX - rect.left}px`;
  tapFlash.style.top = `${clientY - rect.top}px`;
  tapFlash.classList.remove("show");
  void tapFlash.offsetWidth;
  tapFlash.classList.add("show");
}

function getResultComment(found) {
  if (found <= 1) return "ほぼ見えていない。まだこの旅館に馴染めていない。";
  if (found <= 3) return "気配は感じている。何かがいることだけはわかる。";
  if (found <= 5) return "かなり霊感が強い。うっすら松村を捉えている。";
  if (found <= 7) return "旅館側から認識されている。もう向こうも見つけている。";
  return "完全に通じ合っている。たぶん精霊松村の方から寄ってきている。";
}

function chooseSpawnPoint() {
  let idx = Math.floor(Math.random() * SPAWN_POINTS.length);
  if (SPAWN_POINTS.length > 1 && idx === currentPointIndex) {
    idx = (idx + 1 + Math.floor(Math.random() * (SPAWN_POINTS.length - 1))) % SPAWN_POINTS.length;
  }
  currentPointIndex = idx;
  return SPAWN_POINTS[idx];
}

function animateGhostFloat() {
  if (!activeGhost || !isPlaying) return;

  const elapsed = performance.now() - ghostStartAt;
  const bobY = Math.sin(elapsed * 0.0015) * 3.2;
  const bobX = Math.cos(elapsed * 0.0011) * 1.6;
  const scaleJitter = Math.sin(elapsed * 0.0013) * 0.012;

  ghost.style.transform = `translate(calc(-50% + ${bobX}px), calc(-50% + ${bobY}px)) scale(${currentScaleBase + scaleJitter})`;
  floatRaf = requestAnimationFrame(animateGhostFloat);
}

function fade(el, from, to, duration, done) {
  const started = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - started) / duration);
    const eased = t * t * (3 - 2 * t);
    const value = from + (to - from) * eased;
    el.style.opacity = String(value);

    if (t < 1) {
      phaseTimeout = requestAnimationFrame(tick);
    } else if (done) {
      done();
    }
  }

  phaseTimeout = requestAnimationFrame(tick);
}

function hideGhostAndQueueNext() {
  if (!activeGhost) {
    queueNextSpawn();
    return;
  }

  fade(
    ghost,
    Number(ghost.style.opacity || 0),
    0,
    GHOST_FADE_OUT,
    () => {
      resetGhost();
      queueNextSpawn();
    }
  );
}

function queueNextSpawn() {
  if (!isPlaying) return;

  const elapsed = performance.now() - startTime;
  if (elapsed >= GAME_DURATION - 800) return;

  const delay = randomRange(NEXT_DELAY_MIN, NEXT_DELAY_MAX);
  spawnTimeout = window.setTimeout(() => {
    spawnGhost();
  }, delay);
}

function spawnGhost() {
  if (!isPlaying) return;

  activeGhost = true;
  ghostHit = false;

  const point = chooseSpawnPoint();
  const sizeJitter = randomRange(-0.03, 0.05);
  const maxOpacity = randomRange(0.18, 0.28);

  currentScaleBase = 0.96 + randomRange(0, 0.03);
  ghostStartAt = performance.now();

  ghost.style.display = "block";
  ghost.style.left = `${point.x * 100}%`;
  ghost.style.top = `${point.y * 100}%`;
  ghost.style.width = `${(point.size + sizeJitter) * 100}%`;
  ghost.style.opacity = "0";
  ghost.style.pointerEvents = "auto";
  ghost.style.transform = `translate(-50%, -50%) scale(${currentScaleBase})`;
  ghost.dataset.active = "true";

  matchedSpawnCount += 1;
  animateGhostFloat();

  fade(ghost, 0, maxOpacity, GHOST_FADE_IN, () => {
    const hold = randomRange(GHOST_HOLD_MIN, GHOST_HOLD_MAX);
    hideTimeout = window.setTimeout(() => {
      hideGhostAndQueueNext();
    }, hold);
  });
}

function handleGhostTap(event) {
  if (!isPlaying || !activeGhost || ghostHit) return;

  ghostHit = true;
  score += 1;
  updateHud();
  flashAt(event.clientX, event.clientY);
  showMessage("…いた", 520);

  window.clearTimeout(hideTimeout);
  fade(
    ghost,
    Number(ghost.style.opacity || 0),
    0,
    260,
    () => {
      resetGhost();
      queueNextSpawn();
    }
  );
}

function handleMissTap(event) {
  if (!isPlaying) return;
  if (event.target === ghost) return;

  score = Math.max(0, score - 1);
  updateHud();
  flashAt(event.clientX, event.clientY);
  showMessage("気のせい", 420);
}

function updateTimer() {
  if (!isPlaying) return;

  const elapsed = performance.now() - startTime;
  const remain = Math.max(0, GAME_DURATION - elapsed);
  timeText.textContent = (remain / 1000).toFixed(1);

  if (remain <= 0) {
    finishGame();
    return;
  }

  timeRaf = requestAnimationFrame(updateTimer);
}

function startGame() {
  clearTimers();
  resetGhost();

  score = 0;
  matchedSpawnCount = 0;
  isPlaying = true;
  startTime = performance.now();

  updateHud();
  timeText.textContent = "30.0";
  showOverlay(startOverlay, false);
  showOverlay(resultOverlay, false);

  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // no-op
  }

  updateTimer();

  spawnTimeout = window.setTimeout(() => {
    spawnGhost();
  }, 900);
}

function finishGame() {
  if (!isPlaying) return;

  isPlaying = false;
  clearTimers();
  resetGhost();

  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // no-op
  }

  finalScore.textContent = String(score);
  finalComment.textContent = getResultComment(score);
  timeText.textContent = "0.0";
  showOverlay(resultOverlay, true);
}

function showOverlay(el, show) {
  el.classList.toggle("overlay--show", show);
}

ghost.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  handleGhostTap(event);
});

game.addEventListener("pointerdown", (event) => {
  if (!isPlaying) return;
  handleMissTap(event);
});

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);

audio.addEventListener("ended", () => {
  if (isPlaying) {
    finishGame();
  }
});

updateHud();
timeText.textContent = "30.0";