const asset = (p) => new URL(p, import.meta.url).toString();

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="game">
    <section class="start-screen" id="startScreen">
      <div class="logo">5/7 コナモンの日</div>
      <h1>返せ！<br>たこ焼き職人</h1>
      <p class="lead">
        焼き色がちょうどいい瞬間にタップ！<br>
        早すぎると生焼け、遅すぎると焦げるぞ。
      </p>
      <button class="primary-btn" id="startBtn">焼き始める</button>
    </section>

    <section class="play-screen hidden" id="playScreen">
      <header class="hud">
        <div>
          <span class="label">SCORE</span>
          <strong id="score">0</strong>
        </div>
        <div>
          <span class="label">COMBO</span>
          <strong id="combo">0</strong>
        </div>
        <div>
          <span class="label">TIME</span>
          <strong id="time">30</strong>
        </div>
      </header>

      <div class="message" id="message">焼き色を見極めろ！</div>

      <div class="pan">
        <div class="holes" id="holes"></div>
      </div>

      <div class="gauge-wrap">
        <div class="gauge-label">焼き色ゲージ</div>
        <div class="gauge">
          <div class="zone raw-zone"></div>
          <div class="zone good-zone"></div>
          <div class="zone burnt-zone"></div>
          <div class="marker" id="marker"></div>
        </div>
        <div class="gauge-text">
          <span>生焼け</span>
          <span>今！</span>
          <span>焦げ</span>
        </div>
      </div>

      <button class="tap-btn" id="tapBtn">返す！</button>
    </section>

    <section class="result-screen hidden" id="resultScreen">
      <div class="logo">結果発表</div>
      <h2 id="rankTitle">たこ焼き見習い</h2>
      <p class="result-score">
        SCORE <strong id="finalScore">0</strong>
      </p>
      <p class="result-text" id="resultText"></p>
      <button class="primary-btn" id="retryBtn">もう一回焼く</button>
    </section>
  </main>
`;

const startScreen = document.querySelector("#startScreen");
const playScreen = document.querySelector("#playScreen");
const resultScreen = document.querySelector("#resultScreen");

const startBtn = document.querySelector("#startBtn");
const retryBtn = document.querySelector("#retryBtn");
const tapBtn = document.querySelector("#tapBtn");

const holesEl = document.querySelector("#holes");
const markerEl = document.querySelector("#marker");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const timeEl = document.querySelector("#time");
const messageEl = document.querySelector("#message");

const rankTitleEl = document.querySelector("#rankTitle");
const finalScoreEl = document.querySelector("#finalScore");
const resultTextEl = document.querySelector("#resultText");

const TAKOYAKI_COUNT = 12;
const GAME_TIME = 30;

let takoyaki = [];
let score = 0;
let combo = 0;
let timeLeft = GAME_TIME;
let activeIndex = 0;
let gaugeValue = 0;
let gaugeSpeed = 0.018;
let gaugeDirection = 1;
let gameTimer = null;
let frameId = null;
let isPlaying = false;

function createTakoyaki() {
  holesEl.innerHTML = "";
  takoyaki = [];

  for (let i = 0; i < TAKOYAKI_COUNT; i++) {
    const item = document.createElement("button");
    item.className = "takoyaki";
    item.type = "button";
    item.innerHTML = `
      <span class="takoyaki-body"></span>
      <span class="sauce"></span>
      <span class="aonori"></span>
      <span class="shine"></span>
      <span class="steam"></span>
    `;

    holesEl.appendChild(item);

    takoyaki.push({
      el: item,
      state: "waiting",
    });
  }
}

function resetGame() {
  score = 0;
  combo = 0;
  timeLeft = GAME_TIME;
  activeIndex = 0;
  gaugeValue = 0;
  gaugeSpeed = 0.018;
  gaugeDirection = 1;
  isPlaying = true;

  scoreEl.textContent = score;
  comboEl.textContent = combo;
  timeEl.textContent = timeLeft;
  messageEl.textContent = "焼き色を見極めろ！";

  createTakoyaki();
  activateTakoyaki(0);
}

function showScreen(screen) {
  startScreen.classList.add("hidden");
  playScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function playBgm() {
  bgm.currentTime = 0;
  bgm.play().catch(() => {
    // iOS/Safariなどで再生がブロックされた場合は何もしない
  });
}

function stopBgm() {
  bgm.pause();
  bgm.currentTime = 0;
}

function startGame() {
  resetGame();
  showScreen(playScreen);
  playBgm();

  clearInterval(gameTimer);
  cancelAnimationFrame(frameId);

  gameTimer = setInterval(() => {
    timeLeft -= 1;
    timeEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      finishGame();
    }
  }, 1000);

  loop();
}

function activateTakoyaki(index) {
  takoyaki.forEach((t) => t.el.classList.remove("active"));

  if (!takoyaki[index]) {
    activeIndex = 0;
  } else {
    activeIndex = index;
  }

  const current = takoyaki[activeIndex];

  if (current.state !== "done") {
    current.el.classList.add("active");
  }

  gaugeValue = 0;
  gaugeDirection = 1;

  // 後半ほど少しだけ難しくする
  const progress = 1 - timeLeft / GAME_TIME;
  gaugeSpeed = 0.018 + progress * 0.016 + Math.min(combo, 10) * 0.001;
}

function loop() {
  if (!isPlaying) return;

  gaugeValue += gaugeSpeed * gaugeDirection;

  if (gaugeValue >= 1) {
    gaugeValue = 1;
    gaugeDirection = -1;
  }

  if (gaugeValue <= 0) {
    gaugeValue = 0;
    gaugeDirection = 1;
  }

  markerEl.style.left = `${gaugeValue * 100}%`;

  updateActiveColor();

  frameId = requestAnimationFrame(loop);
}

function updateActiveColor() {
  const current = takoyaki[activeIndex];
  if (!current || current.state === "done") return;

  const body = current.el.querySelector(".takoyaki-body");

  if (gaugeValue < 0.42) {
    body.style.setProperty("--bake", "#f4d08d");
    body.style.setProperty("--spot", "rgba(255,255,255,.45)");
  } else if (gaugeValue < 0.68) {
    body.style.setProperty("--bake", "#c9782b");
    body.style.setProperty("--spot", "rgba(92,42,12,.28)");
  } else {
    body.style.setProperty("--bake", "#4a2515");
    body.style.setProperty("--spot", "rgba(0,0,0,.4)");
  }
}

function flipTakoyaki() {
  if (!isPlaying) return;

  const current = takoyaki[activeIndex];
  if (!current || current.state === "done") return;

  current.el.classList.remove("active");

  let point = 0;
  let resultClass = "";
  let text = "";

  if (gaugeValue >= 0.46 && gaugeValue <= 0.64) {
    combo += 1;
    point = 100 + combo * 20;
    resultClass = "success";
    text = combo >= 3 ? `${combo}連続成功！いい焼き色！` : "いい焼き色！";
  } else if (gaugeValue >= 0.40 && gaugeValue < 0.46 || gaugeValue > 0.64 && gaugeValue <= 0.70) {
    combo = 0;
    point = 40;
    resultClass = "ok";
    text = "まあまあ。職人の道は続く。";
  } else if (gaugeValue < 0.40) {
    combo = 0;
    point = 0;
    resultClass = "raw";
    text = "早い！中がまだ粉！";
  } else {
    combo = 0;
    point = 0;
    resultClass = "burnt";
    text = "遅い！完全に焦げた！";
  }

  score += point;
  current.state = "done";
  current.el.classList.add("done", resultClass);

  scoreEl.textContent = score;
  comboEl.textContent = combo;
  messageEl.textContent = text;

  const next = findNextTakoyaki();

  if (next === -1) {
    createTakoyaki();
    activateTakoyaki(0);
  } else {
    activateTakoyaki(next);
  }
}

function findNextTakoyaki() {
  for (let i = 1; i <= TAKOYAKI_COUNT; i++) {
    const nextIndex = (activeIndex + i) % TAKOYAKI_COUNT;
    if (takoyaki[nextIndex].state !== "done") {
      return nextIndex;
    }
  }

  return -1;
}

function finishGame() {
  isPlaying = false;
  clearInterval(gameTimer);
  cancelAnimationFrame(frameId);
  stopBgm();

  finalScoreEl.textContent = score;

  let rank = "";
  let text = "";

  if (score >= 2800) {
    rank = "伝説のたこ焼き職人";
    text = "焼き色、返し、間。すべてが完璧。屋台に行列ができています。";
  } else if (score >= 2000) {
    rank = "かなりのたこ焼き職人";
    text = "外カリ中トロにかなり近い。もう少しで暖簾分けです。";
  } else if (score >= 1200) {
    rank = "たこ焼き見習い";
    text = "悪くない焼き加減。まだ粉と会話する余地があります。";
  } else {
    rank = "粉を見つめる人";
    text = "たこ焼きになる前の何かを大量に生み出しました。";
  }

  rankTitleEl.textContent = rank;
  resultTextEl.textContent = text;

  showScreen(resultScreen);
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
tapBtn.addEventListener("click", flipTakoyaki);

window.addEventListener(
  "touchmove",
  (e) => {
    if (isPlaying) e.preventDefault();
  },
  { passive: false }
);