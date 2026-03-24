const asset = (p) => new URL(p, import.meta.url).toString();

const GAME_SECONDS = 40;
const BLINK_INTERVAL_MIN = 1200;
const BLINK_INTERVAL_MAX = 3200;
const BLINK_DURATION = 180;

const OPEN_SRC = asset("./assets/matsumura-open.png");
const CLOSED_SRC = asset("./assets/matsumura-closed.png");
const BGM_SRC = asset("./assets/bgm.mp3");

const stage = document.getElementById("stage");
const dolls = [...document.querySelectorAll(".doll")];
const dollImages = [...document.querySelectorAll(".doll-img")];
const timeText = document.getElementById("timeText");
const progressBar = document.getElementById("progressBar");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const bgm = document.getElementById("bgm");

let targetIndex = 0;
let isPlaying = false;
let isFinished = false;
let remaining = GAME_SECONDS;
let rafId = null;
let timerStart = 0;
let blinkTimeoutId = null;
let blinkEndTimeoutId = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setMessage(html) {
  message.innerHTML = `<p>${html}</p>`;
}

function setAllOpen() {
  dollImages.forEach((img) => {
    img.src = OPEN_SRC;
  });
}

function resetDolls() {
  dolls.forEach((doll) => {
    doll.classList.remove("blinking", "correct", "wrong", "target");
    doll.disabled = true;
  });
  setAllOpen();
}

function applyImages() {
  dollImages.forEach((img, index) => {
    img.src = OPEN_SRC;
    img.alt = `松村 ${index + 1}`;
    img.draggable = false;
  });
}

function pickTarget() {
  targetIndex = randomInt(0, dolls.length - 1);
}

function updateTimeUI(secondsLeft) {
  timeText.textContent = String(Math.ceil(secondsLeft));
  const ratio = Math.max(0, Math.min(1, secondsLeft / GAME_SECONDS));
  progressBar.style.transform = `scaleX(${ratio})`;
}

function clearBlinkTimers() {
  if (blinkTimeoutId) {
    clearTimeout(blinkTimeoutId);
    blinkTimeoutId = null;
  }
  if (blinkEndTimeoutId) {
    clearTimeout(blinkEndTimeoutId);
    blinkEndTimeoutId = null;
  }
}

function stopBgm() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

async function startBgm() {
  if (!bgm) return;
  bgm.src = BGM_SRC;
  bgm.currentTime = 0;
  try {
    await bgm.play();
  } catch (error) {
    console.warn("BGMの再生を開始できませんでした", error);
  }
}

function blinkOnce() {
  if (!isPlaying || isFinished) return;

  const target = dolls[targetIndex];
  const targetImg = dollImages[targetIndex];
  if (!target || !targetImg) return;

  target.classList.add("blinking");
  targetImg.src = CLOSED_SRC;

  blinkEndTimeoutId = setTimeout(() => {
    target.classList.remove("blinking");
    targetImg.src = OPEN_SRC;
    scheduleNextBlink();
  }, BLINK_DURATION);
}

function scheduleNextBlink() {
  if (!isPlaying || isFinished) return;

  const wait = randomInt(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX);
  blinkTimeoutId = setTimeout(() => {
    blinkOnce();
  }, wait);
}

function finishGame({ cleared }) {
  if (isFinished) return;

  isFinished = true;
  isPlaying = false;

  clearBlinkTimers();
  stopBgm();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  dolls.forEach((doll) => {
    doll.disabled = true;
    doll.classList.remove("blinking");
  });

  setAllOpen();

  const target = dolls[targetIndex];
  if (target) {
    target.classList.add("target");
    if (cleared) target.classList.add("correct");
  }

  if (cleared) {
    setMessage("<strong>見つけた。</strong><br>その松村、マネキンじゃないです。");
  } else {
    setMessage("見逃しました。<br>全員マネキンに見えてきますね。");
    timeText.textContent = "0";
    progressBar.style.transform = "scaleX(0)";
  }

  startBtn.classList.add("hidden");
  retryBtn.classList.remove("hidden");
}

function tick(now) {
  if (!isPlaying || isFinished) return;

  const elapsed = (now - timerStart) / 1000;
  remaining = GAME_SECONDS - elapsed;
  updateTimeUI(Math.max(0, remaining));

  if (remaining <= 0) {
    finishGame({ cleared: false });
    return;
  }

  rafId = requestAnimationFrame(tick);
}

async function startGame() {
  clearBlinkTimers();

  isPlaying = true;
  isFinished = false;
  remaining = GAME_SECONDS;
  timerStart = performance.now();

  pickTarget();
  resetDolls();

  dolls.forEach((doll) => {
    doll.disabled = false;
  });

  updateTimeUI(GAME_SECONDS);
  setMessage("まばたきした松村をタップ");
  stage.classList.remove("hidden");
  startBtn.classList.add("hidden");
  retryBtn.classList.add("hidden");

  await startBgm();
  scheduleNextBlink();
  rafId = requestAnimationFrame(tick);
}

function resetGame() {
  clearBlinkTimers();
  stopBgm();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  isPlaying = false;
  isFinished = false;
  remaining = GAME_SECONDS;

  resetDolls();
  updateTimeUI(GAME_SECONDS);
  setMessage("スタートを押すと始まります");

  stage.classList.remove("hidden");
  startBtn.classList.remove("hidden");
  retryBtn.classList.add("hidden");
}

function onDollClick(event) {
  if (!isPlaying || isFinished) return;

  const doll = event.currentTarget;
  const index = Number(doll.dataset.index);

  if (index === targetIndex) {
    finishGame({ cleared: true });
    return;
  }

  doll.classList.remove("wrong");
  void doll.offsetWidth;
  doll.classList.add("wrong");
  setMessage("それはただの松村です。");
}

function preloadImages() {
  const openImg = new Image();
  const closedImg = new Image();
  openImg.src = OPEN_SRC;
  closedImg.src = CLOSED_SRC;
}

function initAudio() {
  if (!bgm) return;
  bgm.src = BGM_SRC;
  bgm.loop = true;
  bgm.preload = "auto";
}

function init() {
  preloadImages();
  initAudio();
  applyImages();
  resetGame();

  dolls.forEach((doll) => {
    doll.addEventListener("click", onDollClick);
  });

  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", resetGame);
}

init();
