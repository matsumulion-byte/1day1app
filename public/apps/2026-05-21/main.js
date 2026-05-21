const ASSET_BASE = "/apps/2026-05-21";

const game = document.getElementById("game");
const progressEl = document.getElementById("progress");
const statusEl = document.getElementById("status");
const overlay = document.getElementById("overlay");
const bubble = document.getElementById("bubble");
const hideBtn = document.getElementById("hideBtn");
const player = document.getElementById("player");
const bgm = document.getElementById("bgm");

if (bgm && !bgm.currentSrc) {
  bgm.src = `${ASSET_BASE}/assets/bgm.mp3`;
}

let playing = false;
let paused = false;
let canHide = false;
let hideCount = 0;
let nextEventAt = 0;
let failTimer = null;

const CLEAR_COUNT = 5;

document.getElementById("start").addEventListener("click", () => {
  void start();
});

async function playBgm() {
  if (!bgm) return;

  try {
    bgm.volume = 0.45;
    bgm.currentTime = 0;

    if (bgm.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      await new Promise((resolve, reject) => {
        const onReady = () => {
          bgm.removeEventListener("canplaythrough", onReady);
          bgm.removeEventListener("error", onError);
          resolve();
        };
        const onError = () => {
          bgm.removeEventListener("canplaythrough", onReady);
          bgm.removeEventListener("error", onError);
          reject(new Error("BGM load failed"));
        };
        bgm.addEventListener("canplaythrough", onReady, { once: true });
        bgm.addEventListener("error", onError, { once: true });
        bgm.load();
      });
    }

    await bgm.play();
  } catch (error) {
    console.warn("BGM playback failed:", error);
  }
}

function stopBgm() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

async function start() {
  playing = true;
  paused = false;
  canHide = false;
  hideCount = 0;
  nextEventAt = performance.now() + random(1500, 2800);

  await playBgm();

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
