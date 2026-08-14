// 画像はこの配列だけを編集すれば追加・差し替えできます。
const SWIMMER_IMAGES = [
  "/apps/2026-08-14/assets/matsumura_idle.png",
  "/apps/2026-08-14/assets/matsumura_crawl.png",
  "/apps/2026-08-14/assets/matsumura_butterfly.png",
  "/apps/2026-08-14/assets/matsumura_backstroke.png",
  "/apps/2026-08-14/assets/matsumura_streamline.png",
  "/apps/2026-08-14/assets/matsumura_kickboard.png",
  "/apps/2026-08-14/assets/matsumura_wave.png",
];
const DROWNING_IMAGE = "/apps/2026-08-14/assets/matsumura_drowning.png";
const GAME_SECONDS = 30;

const screens = {
  start: document.querySelector("#startScreen"),
  game: document.querySelector("#gameScreen"),
  result: document.querySelector("#resultScreen"),
};
const pool = document.querySelector("#pool");
const swimmerLayer = document.querySelector("#swimmerLayer");
const toast = document.querySelector("#toast");
const comboPop = document.querySelector("#comboPop");
const ui = {
  time: document.querySelector("#timeValue"), score: document.querySelector("#scoreValue"),
  combo: document.querySelector("#comboValue"), miss: document.querySelector("#missValue"),
};

let state = {};
let timerId = null;
let audioContext = null;

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("hidden", key !== name));
}

function startGame() {
  clearInterval(timerId);
  state = { time: GAME_SECONDS, score: 0, combo: 0, maxCombo: 0, misses: 0, rescued: 0, active: true };
  updateHud();
  showScreen("game");
  buildRound();
  timerId = setInterval(() => {
    state.time -= 1;
    updateHud();
    if (state.time <= 0) endGame();
  }, 1000);
}

function updateHud() {
  ui.time.textContent = state.time;
  ui.score.textContent = state.score;
  ui.combo.textContent = state.combo;
  ui.miss.textContent = state.misses;
  ui.time.parentElement.classList.toggle("urgent", state.time <= 5);
}

function buildRound() {
  swimmerLayer.replaceChildren();
  const elapsed = GAME_SECONDS - state.time;
  const count = Math.min(25, 15 + Math.floor(elapsed / 3));
  const drowningIndex = Math.floor(Math.random() * count);

  for (let index = 0; index < count; index += 1) {
    const isDrowning = index === drowningIndex;
    const swimmer = document.createElement("button");
    const img = document.createElement("img");
    const mobile = window.innerWidth < 650;
    const size = random(mobile ? 50 : 68, mobile ? 76 : 116);
    const x = random(1, 91);
    const y = random(4, 84);

    swimmer.type = "button";
    swimmer.className = `swimmer${isDrowning ? " drowning" : ""}${Math.random() > .72 ? " moving" : ""}`;
    swimmer.setAttribute("aria-label", isDrowning ? "苦しそうな松村" : "泳いでいる松村");
    swimmer.style.cssText = `left:${x}%;top:${y}%;--size:${size}px;--angle:${random(-12, 12)}deg;--flip:${Math.random() > .5 ? -1 : 1};--speed:${random(16, 29) / 10}s;--delay:-${random(0, 20) / 10}s;--drift:${random(4, 8)}s;--move:${random(-18, 18)}px;z-index:${Math.floor(y) + 5}`;
    img.src = isDrowning ? DROWNING_IMAGE : SWIMMER_IMAGES[Math.floor(Math.random() * SWIMMER_IMAGES.length)];
    img.alt = "";
    swimmer.append(img);
    swimmer.addEventListener("click", () => handlePick(isDrowning, swimmer));
    swimmerLayer.append(swimmer);
  }
}

function handlePick(isDrowning, swimmer) {
  if (!state.active || swimmer.disabled) return;
  if (isDrowning) {
    swimmer.disabled = true;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.rescued += 1;
    const bonus = state.combo >= 2 ? (state.combo - 1) * 10 : 0;
    state.score += 100 + bonus;
    notify(bonus ? `救助成功！ +${100 + bonus}` : "救助成功！ +100", "success");
    if (state.combo >= 2) showCombo();
    pool.classList.add("flash-good");
    playTone(true);
    setTimeout(() => state.active && buildRound(), 360);
  } else {
    swimmer.disabled = true;
    state.score = Math.max(0, state.score - 50);
    state.combo = 0;
    state.misses += 1;
    notify(["それは元気な松村！", "ただ泳いでるだけ！", "救助、いりません！"][Math.floor(Math.random() * 3)], "miss");
    pool.classList.add("flash-bad");
    playTone(false);
    setTimeout(() => { swimmer.disabled = false; }, 450);
  }
  updateHud();
  setTimeout(() => pool.classList.remove("flash-good", "flash-bad"), 380);
}

function notify(message, type) {
  toast.className = `toast ${type}`;
  toast.textContent = message;
  void toast.offsetWidth;
  toast.classList.add("show");
}

function showCombo() {
  comboPop.textContent = `${state.combo} COMBO!`;
  comboPop.classList.remove("show");
  void comboPop.offsetWidth;
  comboPop.classList.add("show");
}

// Web Audio APIによる軽い効果音。音声ファイルに差し替える場合はここを変更。
function playTone(success) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = success ? "sine" : "sawtooth";
    oscillator.frequency.setValueAtTime(success ? 520 : 170, audioContext.currentTime);
    if (success) oscillator.frequency.exponentialRampToValueAtTime(920, audioContext.currentTime + .12);
    gain.gain.setValueAtTime(.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .19);
  } catch (_) { /* 音声非対応でもゲームは続行 */ }
}

function endGame() {
  state.active = false;
  clearInterval(timerId);
  swimmerLayer.replaceChildren();
  const rank = state.score <= 300 ? "見てただけ監視員" : state.score <= 700 ? "見習い監視員" : state.score <= 1200 ? "一人前監視員" : "松村救助隊長";
  const share = `プール監視員で ${state.score}点！ 松村を${state.rescued}人救助しました！ #プール監視員 #松村を探せ`;
  document.querySelector("#finalScore").textContent = state.score;
  document.querySelector("#rank").textContent = rank;
  document.querySelector("#rescuedValue").textContent = `${state.rescued}人`;
  document.querySelector("#maxComboValue").textContent = state.maxCombo;
  document.querySelector("#finalMissValue").textContent = `${state.misses}回`;
  document.querySelector("#shareText").textContent = share;
  document.querySelector("#shareButton").dataset.text = share;
  showScreen("result");
}

async function shareResult() {
  const text = document.querySelector("#shareButton").dataset.text;
  try {
    if (navigator.share) await navigator.share({ title: "プール監視員", text });
    else { await navigator.clipboard.writeText(text); document.querySelector("#shareButton").textContent = "コピーしました！"; }
  } catch (_) { /* シェアキャンセル */ }
}

function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

document.querySelector("#startButton").addEventListener("click", startGame);
document.querySelector("#retryButton").addEventListener("click", startGame);
document.querySelector("#shareButton").addEventListener("click", shareResult);
