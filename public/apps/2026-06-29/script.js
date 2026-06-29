const startScreen = document.getElementById("startScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const timeEl = document.getElementById("time");
const fansEl = document.getElementById("fans");
const lanesEl = document.getElementById("lanes");
const walkersEl = document.getElementById("walkers");
const messageEl = document.getElementById("message");
const touchPadsEl = document.getElementById("touchPads");
const resultRankEl = document.getElementById("resultRank");
const resultTitleEl = document.getElementById("resultTitle");
const resultScoreEl = document.getElementById("resultScore");
const resultMessageEl = document.getElementById("resultMessage");

const keys = ["a", "s", "d", "f"];
const labels = ["A", "S", "D", "F"];
const symbols = ["♪", "●", "★", "♬"];
const colors = ["red", "blue", "green", ""];
const band = ["J", "P", "G", "R"];

let lanes = [];
let pads = [];
let notes = [];
let score = 0;
let combo = 0;
let bestCombo = 0;
let fans = 100;
let time = 45;
let progress = 0;
let running = false;
let lastFrame = 0;
let spawnTimer = 0;
let beatTimer = 0;
let countdownTimer = null;
let messageTimer = null;
let animationId = null;

function buildStage() {
  lanesEl.innerHTML = "";
  touchPadsEl.innerHTML = "";
  walkersEl.innerHTML = "";
  lanes = [];
  pads = [];

  labels.forEach((label, index) => {
    const lane = document.createElement("div");
    lane.className = "lane";
    lane.dataset.lane = String(index);
    lanesEl.appendChild(lane);
    lanes.push(lane);

    const pad = document.createElement("button");
    pad.className = "pad";
    pad.textContent = label;
    pad.type = "button";
    pad.addEventListener("pointerdown", () => hitLane(index));
    touchPadsEl.appendChild(pad);
    pads.push(pad);
  });

  band.forEach((initial, index) => {
    const walker = document.createElement("div");
    walker.className = "walker";
    walker.style.left = `${11 + index * 7}%`;
    walker.innerHTML = `
      <div class="head"></div>
      <div class="body">${initial}</div>
      <div class="legs"></div>
    `;
    walkersEl.appendChild(walker);
  });
}

function startGame() {
  clearInterval(countdownTimer);
  cancelAnimationFrame(animationId);

  notes.forEach(note => note.el.remove());
  notes = [];
  score = 0;
  combo = 0;
  bestCombo = 0;
  fans = 100;
  time = 45;
  progress = 0;
  running = true;
  lastFrame = performance.now();
  spawnTimer = 0.2;
  beatTimer = 0;

  startScreen.classList.remove("active");
  resultScreen.classList.remove("active");
  setMessage("白線に重なった瞬間を叩こう");
  renderHud();
  updateWalkers();

  countdownTimer = setInterval(() => {
    time -= 1;
    if (time <= 0) {
      endGame();
    }
    renderHud();
  }, 1000);

  animationId = requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;

  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  spawnTimer -= delta;
  beatTimer += delta;

  if (spawnTimer <= 0) {
    spawnNote();
    const pace = Math.max(0.36, 0.72 - progress * 0.003 - bestCombo * 0.003);
    spawnTimer = pace + Math.random() * 0.34;
  }

  if (beatTimer > 0.48) {
    document.body.style.backgroundPosition = `${Math.random() * 8}px 0`;
    beatTimer = 0;
  }

  updateNotes(delta);
  animationId = requestAnimationFrame(loop);
}

function spawnNote() {
  const laneIndex = Math.floor(Math.random() * 4);
  const note = document.createElement("div");
  const color = colors[Math.floor(Math.random() * colors.length)];
  note.className = `note ${color}`;
  note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  lanes[laneIndex].appendChild(note);

  notes.push({
    el: note,
    lane: laneIndex,
    y: -60,
    speed: 250 + progress * 1.5 + Math.random() * 70,
    hit: false
  });
}

function updateNotes(delta) {
  const roadHeight = lanesEl.getBoundingClientRect().height;

  notes.forEach(note => {
    note.y += note.speed * delta;
    note.el.style.top = `${note.y}px`;
  });

  const before = notes.length;
  notes = notes.filter(note => {
    if (note.hit) return false;

    if (note.y > roadHeight - 18) {
      note.el.remove();
      miss("通り過ぎた");
      return false;
    }

    return true;
  });

  if (before !== notes.length) renderHud();
}

function hitLane(laneIndex) {
  if (!running) return;

  flash(laneIndex);
  const roadHeight = lanesEl.getBoundingClientRect().height;
  const target = roadHeight - 72;
  const candidates = notes
    .filter(note => note.lane === laneIndex && !note.hit)
    .map(note => ({ note, distance: Math.abs(note.y - target) }))
    .sort((a, b) => a.distance - b.distance);

  if (!candidates.length || candidates[0].distance > 76) {
    miss("空振り");
    renderHud();
    return;
  }

  const { note, distance } = candidates[0];
  note.hit = true;
  note.el.classList.add("hit");
  setTimeout(() => note.el.remove(), 160);

  const perfect = distance <= 25;
  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  fans = Math.min(100, fans + (perfect ? 2 : 1));
  progress = Math.min(100, progress + (perfect ? 4.2 : 2.6) + Math.min(combo, 12) * 0.1);
  score += (perfect ? 160 : 95) + combo * 9;

  setMessage(perfect ? "PERFECT!" : "GOOD!");
  updateWalkers();
  renderHud();

  if (progress >= 100) {
    endGame();
  }
}

function miss(reason) {
  combo = 0;
  fans = Math.max(0, fans - 8);
  score = Math.max(0, score - 30);
  setMessage(`${reason} - keep the beat`);

  if (fans <= 0) {
    endGame();
  }
}

function flash(index) {
  lanes[index].classList.add("flash");
  pads[index].classList.add("active");
  setTimeout(() => {
    lanes[index].classList.remove("flash");
    pads[index].classList.remove("active");
  }, 120);
}

function updateWalkers() {
  const walkers = [...walkersEl.children];
  walkers.forEach((walker, index) => {
    const offset = 11 + index * 7 + progress * 0.72;
    walker.style.left = `${Math.min(92, offset)}%`;
  });
}

function renderHud() {
  scoreEl.textContent = Math.round(score).toLocaleString();
  comboEl.textContent = String(combo);
  timeEl.textContent = String(Math.max(0, time));
  fansEl.textContent = `${Math.round(fans)}%`;
}

function setMessage(text) {
  messageEl.textContent = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    messageEl.textContent = "A S D F で白線ジャストを狙え";
  }, 1100);
}

function endGame() {
  if (!running) return;

  running = false;
  clearInterval(countdownTimer);
  cancelAnimationFrame(animationId);

  const crossed = progress >= 100;
  const finalScore = Math.round(score + fans * 8 + bestCombo * 22 + Math.max(0, time) * 35);
  let rank = "B-SIDE";
  let title = "もう一度リハーサル";
  let message = `最高コンボ ${bestCombo}。横断率 ${Math.round(progress)}%。`;

  if (crossed && finalScore >= 7800) {
    rank = "ROOFTOP";
    title = "伝説の横断成功";
    message = `最高コンボ ${bestCombo}。ファン熱量 ${Math.round(fans)}%。`;
  } else if (crossed) {
    rank = "HIT SINGLE";
    title = "無事に向こう側へ";
    message = `最高コンボ ${bestCombo}。最後までビートをつないだ。`;
  } else if (fans <= 0) {
    rank = "NOISE";
    title = "観客が帰った";
    message = `最高コンボ ${bestCombo}。次は白線をよく見よう。`;
  }

  resultRankEl.textContent = rank;
  resultTitleEl.textContent = title;
  resultScoreEl.textContent = finalScore.toLocaleString();
  resultMessageEl.textContent = message;
  resultScreen.classList.add("active");
}

document.addEventListener("keydown", event => {
  const index = keys.indexOf(event.key.toLowerCase());
  if (index >= 0) {
    event.preventDefault();
    hitLane(index);
  }

  if ((event.key === "Enter" || event.key === " ") && !running) {
    event.preventDefault();
    startGame();
  }
});

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
buildStage();
renderHud();
updateWalkers();
