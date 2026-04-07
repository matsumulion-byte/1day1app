const asset = (p) => new URL(p, import.meta.url).toString();

const app = document.querySelector(".app");
const wheel = document.getElementById("wheel");
const stage = document.getElementById("stage");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const commentText = document.getElementById("commentText");
const pumpButton = document.getElementById("pumpButton");
const stopButton = document.getElementById("stopButton");
const retryButton = document.getElementById("retryButton");
const burstFlash = document.getElementById("burstFlash");
const airLines = document.getElementById("airLines");

const STORAGE_KEY = "tire-chicken-best-v2";

const state = {
  pressure: 0,
  score: 0,
  best: 0,
  pumping: false,
  playing: true,
  burst: false,
  rafId: 0,
  lastTime: 0,
};

function normalizeScore(value) {
  return clamp(Math.floor(value), 0, 100);
}

function loadBest() {
  const savedBest = Number(localStorage.getItem(STORAGE_KEY) || 0);
  state.best = Number.isFinite(savedBest) ? normalizeScore(savedBest) : 0;
  if (state.best !== savedBest) {
    localStorage.setItem(STORAGE_KEY, String(state.best));
  }
  bestValue.textContent = String(state.best);
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.best));
    bestValue.textContent = String(state.best);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function burstChance(pressure) {
  if (pressure < 72) return 0;
  if (pressure < 82) return 0.004;
  if (pressure < 88) return 0.012;
  if (pressure < 93) return 0.028;
  if (pressure < 97) return 0.06;
  if (pressure < 100) return 0.13;
  if (pressure < 104) return 0.22;
  return 1;
}

function getResultLabel(score, burst) {
  if (burst) return "爆散マン";
  if (score < 50) return "ビビり空気圧";
  if (score < 75) return "一般ドライバー";
  if (score < 90) return "空気圧職人";
  if (score < 98) return "命知らず";
  return "バーストの神";
}

function updateUI() {
  const pressure = clamp(state.pressure, 0, 110);
  scoreValue.textContent = state.playing ? "--" : String(state.score);
  commentText.textContent = state.playing
    ? "押してる間だけ空気が入る。いつ止める？"
    : `結果：${getResultLabel(state.score, state.burst)} / ${commentText.dataset.resultText || ""}`;

  const scale = 1 + pressure / 260;
  const squish = pressure >= 88 ? 1 + (pressure - 88) / 500 : 1;
  wheel.style.transform = `scale(${scale}, ${scale * squish})`;

  if (pressure >= 82 && state.playing) {
    app.classList.add("danger");
    stage.classList.add("is-shaking");
  } else {
    app.classList.remove("danger");
    stage.classList.remove("is-shaking");
  }
}

function finishGame(burst = false) {
  state.playing = false;
  state.burst = burst;
  state.pumping = false;
  airLines.classList.remove("active");

  if (burst) {
    app.classList.add("dead");
    burstFlash.classList.remove("active");
    void burstFlash.offsetWidth;
    burstFlash.classList.add("active");
    state.score = normalizeScore(state.pressure);
    commentText.dataset.resultText = `タイヤが耐えきれなかった（${Math.floor(state.pressure)}%）。`;
  } else {
    state.score = normalizeScore(state.pressure);
    commentText.dataset.resultText = `ギリギリで止めた（${Math.floor(state.pressure)}%）。`;
  }

  saveBest();
  updateUI();

  pumpButton.disabled = true;
  stopButton.disabled = true;
  retryButton.hidden = false;
}

function resetGame() {
  state.pressure = 0;
  state.score = 0;
  state.pumping = false;
  state.playing = true;
  state.burst = false;
  state.lastTime = 0;

  app.classList.remove("danger", "dead");
  stage.classList.remove("is-shaking");
  burstFlash.classList.remove("active");
  airLines.classList.remove("active");
  wheel.style.transform = "scale(1)";

  commentText.dataset.resultText = "";
  commentText.textContent = "押してる間だけ空気が入る。いつ止める？";

  pumpButton.disabled = false;
  stopButton.disabled = false;
  retryButton.hidden = true;

  updateUI();
}

function tick(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const delta = Math.min(32, timestamp - state.lastTime);
  state.lastTime = timestamp;

  if (state.playing && state.pumping) {
    // 長押し時の上昇量
    state.pressure += delta * 0.04;

    // 危険域のドキドキ感を少し出す
    if (state.pressure >= 80) {
      state.pressure += Math.random() * 0.12;
    }

    state.pressure = clamp(state.pressure, 0, 100);

    const chancePerFrame = burstChance(state.pressure);
    if (Math.random() < chancePerFrame) {
      finishGame(true);
    }
  }

  updateUI();
  state.rafId = requestAnimationFrame(tick);
}

function startPump() {
  if (!state.playing) return;
  state.pumping = true;
  airLines.classList.add("active");
}

function stopPump() {
  state.pumping = false;
  airLines.classList.remove("active");
}

pumpButton.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startPump();
});

window.addEventListener("pointerup", stopPump);
window.addEventListener("pointercancel", stopPump);
window.addEventListener("pointerleave", stopPump);

stopButton.addEventListener("click", () => {
  if (!state.playing) return;
  finishGame(false);
});

retryButton.addEventListener("click", resetGame);

loadBest();
resetGame();
state.rafId = requestAnimationFrame(tick);

// 使わないけど、このプロジェクトのルールに合わせて残しておく
void asset;