const asset = (p) => new URL(p, import.meta.url).toString();

const els = {
  tempText: document.getElementById("tempText"),
  barFill: document.getElementById("barFill"),
  matsumura: document.getElementById("matsumura"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  retryBtn: document.getElementById("retryBtn"),
  modal: document.getElementById("modal"),
  resultTemp: document.getElementById("resultTemp"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  closeModal: document.getElementById("closeModal"),
  bgm: document.getElementById("bgm"),
};

els.matsumura.src = asset("./assets/matsumura-bath.png");
els.bgm.src = asset("./assets/bgm.mp3");

let rafId = null;
let startedAt = 0;
let currentTemp = 36.0;
let isPlaying = false;

const MIN_TEMP = 36.0;
const MAX_TEMP = 45.0;
const TARGET_TEMP = 42.0;

const resultRules = [
  {
    test: (t) => Math.abs(t - TARGET_TEMP) <= 0.05,
    title: "神の湯加減",
    text: "42.0℃ほぼジャスト。これはもう職人技。",
  },
  {
    test: (t) => Math.abs(t - TARGET_TEMP) <= 0.15,
    title: "最高の風呂",
    text: "松村、かなり仕上がっています。",
  },
  {
    test: (t) => Math.abs(t - TARGET_TEMP) <= 0.35,
    title: "いい湯",
    text: "だいぶ良い。普通に入れる。",
  },
  {
    test: (t) => t >= 40.8 && t < 41.65,
    title: "ちょいぬる",
    text: "悪くないけど、勝負からは逃げました。",
  },
  {
    test: (t) => t < 40.8,
    title: "ぬるすぎ",
    text: "松村、まだ温まっていません。",
  },
  {
    test: (t) => t > 42.35 && t < 42.8,
    title: "攻めすぎ",
    text: "松村、平気な顔をしていますが内心きついです。",
  },
  {
    test: (t) => t >= 42.8,
    title: "茹で松村",
    text: "完全にやりすぎ。これは風呂ではなく調理。",
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateDisplay(temp) {
  const fixed = temp.toFixed(1);
  const percent = ((temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 100;

  els.tempText.textContent = `${fixed}℃`;
  els.barFill.style.width = `${clamp(percent, 0, 100)}%`;

  if (temp >= 43) {
    document.body.classList.add("danger");
  } else {
    document.body.classList.remove("danger");
  }
}

function calcTemp(elapsed) {
  const seconds = elapsed / 1000;

  // 42℃到達がだいたい3.2〜3.8秒。後半ほど一気に熱くなる
  const base = MIN_TEMP + seconds * 1.35;
  const accel = Math.pow(seconds, 1.85) * 0.32;
  const wave = Math.sin(seconds * 9.5) * 0.12;

  return clamp(base + accel + wave, MIN_TEMP, MAX_TEMP);
}

function tick(now) {
  const elapsed = now - startedAt;
  currentTemp = calcTemp(elapsed);
  updateDisplay(currentTemp);

  if (currentTemp >= MAX_TEMP) {
    stopGame();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function startGame() {
  cancelAnimationFrame(rafId);

  isPlaying = true;
  startedAt = performance.now();
  currentTemp = MIN_TEMP;

  els.startBtn.classList.add("hidden");
  els.retryBtn.classList.add("hidden");
  els.stopBtn.disabled = false;
  els.modal.classList.add("hidden");

  updateDisplay(currentTemp);

  els.bgm.currentTime = 0;
  els.bgm.volume = 0.45;
  els.bgm.play().catch(() => {});

  rafId = requestAnimationFrame(tick);
}

function stopGame() {
  if (!isPlaying) return;

  isPlaying = false;
  cancelAnimationFrame(rafId);

  els.stopBtn.disabled = true;
  els.retryBtn.classList.remove("hidden");

  const result = getResult(currentTemp);
  showResult(currentTemp, result);
}

function getResult(temp) {
  return resultRules.find((rule) => rule.test(temp)) || resultRules[resultRules.length - 1];
}

function showResult(temp, result) {
  els.resultTemp.textContent = `${temp.toFixed(1)}℃`;
  els.resultTitle.textContent = result.title;
  els.resultText.textContent = result.text;
  els.modal.classList.remove("hidden");
}

function resetGame() {
  cancelAnimationFrame(rafId);

  isPlaying = false;
  currentTemp = MIN_TEMP;

  els.startBtn.classList.remove("hidden");
  els.retryBtn.classList.add("hidden");
  els.stopBtn.disabled = true;
  els.modal.classList.add("hidden");

  updateDisplay(currentTemp);
}

els.startBtn.addEventListener("click", startGame);
els.stopBtn.addEventListener("click", stopGame);
els.retryBtn.addEventListener("click", resetGame);
els.closeModal.addEventListener("click", () => {
  els.modal.classList.add("hidden");
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (isPlaying) stopGame();
  }
});

updateDisplay(currentTemp); 