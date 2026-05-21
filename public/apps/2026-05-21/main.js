const asset = (p) => new URL(p, import.meta.url).toString();

const ASSET_BASE = "/apps/2026-05-21";
const BGM_SRC = `${ASSET_BASE}/assets/bgm.mp3`;

const game = document.getElementById("game");
const progressEl = document.getElementById("progress");
const statusEl = document.getElementById("status");
const overlay = document.getElementById("overlay");
const bubble = document.getElementById("bubble");
const hideBtn = document.getElementById("hideBtn");
const player = document.getElementById("player");
const bgm = document.getElementById("bgm");

if (bgm) {
  bgm.src = BGM_SRC;
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.45;

  bgm.addEventListener("error", () => {
    console.warn("BGM primary src failed, retry with asset URL");
    bgm.src = asset("./assets/bgm.mp3");
    bgm.load();
  });

  window.addEventListener("load", () => {
    bgm.load();
  });
}

let playing = false;
let paused = false;
let canHide = false;
let hideCount = 0;
let nextEventAt = 0;
let failTimer = null;
let gameStarted = false;

const CLEAR_COUNT = 5;

function playBgmFromGesture() {
  if (!bgm) return;

  bgm.muted = false;
  bgm.volume = 0.45;

  const tryPlay = () => {
    if (bgm.readyState >= HTMLMediaElement.HAVE_METADATA) {
      try {
        bgm.currentTime = 0;
      } catch (_) {
        /* not ready yet */
      }
    }
    return bgm.play();
  };

  const playPromise = tryPlay();
  if (!playPromise) return;

  playPromise.catch((err) => {
    console.warn("BGM play failed:", err, bgm.src);
    bgm.addEventListener(
      "canplay",
      () => {
        tryPlay().catch((e) => console.warn("BGM retry failed:", e, bgm.src));
      },
      { once: true }
    );
    bgm.load();
  });
}

function stopBgm() {
  if (!bgm) return;
  bgm.pause();
  try {
    bgm.currentTime = 0;
  } catch (_) {
    /* ignore */
  }
}

function handleStart() {
  if (gameStarted) return;
  gameStarted = true;

  playBgmFromGesture();
  start();
}

const startBtn = document.getElementById("start");
startBtn.addEventListener("click", handleStart);

function start() {
  playing = true;
  paused = false;
  canHide = false;
  hideCount = 0;
  nextEventAt = performance.now() + random(1500, 2800);

  overlay.classList.add("hide");
  hideBtn.disabled = true;
  player.classList.remove("hidden");
  bubble.className = "";
  bubble.textContent = "……？";
  game.classList.remove("paused");

  updateHud("容疑者を尾行しろ");
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!playing) return;

  if (!paused && now >= nextEventAt) {
    startDanger();
  }

  requestAnimationFrame(loop);
}

function startDanger() {
  paused = true;
  canHide = true;

  game.classList.add("paused");
  hideBtn.disabled = false;

  bubble.textContent = "……？";
  bubble.className = "show";
  updateHud("隠れろ");

  failTimer = setTimeout(() => {
    if (!playing || !canHide) return;

    bubble.textContent = "見たぞ";
    bubble.className = "show danger";
    finish("バレた", "隠れるのが遅かった。");
  }, 850);
}

function successHide() {
  clearTimeout(failTimer);

  canHide = false;
  hideBtn.disabled = true;
  hideCount += 1;

  player.classList.add("hidden");
  bubble.textContent = "セーフ";
  bubble.className = "show";
  updateHud(`隠れた ${hideCount}/${CLEAR_COUNT}`);

  setTimeout(() => {
    if (!playing) return;

    if (hideCount >= CLEAR_COUNT) {
      finish("証拠をつかんだ", "最後までバレずに尾行できた。");
      return;
    }

    player.classList.remove("hidden");
    bubble.className = "";
    bubble.textContent = "……？";
    paused = false;
    game.classList.remove("paused");
    hideBtn.disabled = true;
    nextEventAt = performance.now() + random(1200, 2400);
    updateHud("容疑者を尾行しろ");
  }, 650);
}

hideBtn.addEventListener("click", () => {
  if (!playing || !canHide) return;
  successHide();
});

function finish(title, text) {
  playing = false;
  canHide = false;
  paused = true;
  clearTimeout(failTimer);

  stopBgm();

  game.classList.add("paused");
  hideBtn.disabled = true;

  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">CASE CLOSED</p>
      <h1>${title}</h1>
      <p>${text}</p>
      <button id="retry" type="button">もう一度</button>
    </div>
  `;

  overlay.classList.remove("hide");

  document.getElementById("retry").addEventListener("click", () => {
    location.reload();
  });
}

function updateHud(status) {
  progressEl.textContent = `${hideCount}/${CLEAR_COUNT}`;
  statusEl.textContent = status;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}
