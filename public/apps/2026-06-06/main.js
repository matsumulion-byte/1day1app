const pond = document.getElementById("pond");
const frog = document.getElementById("frog");
const messageEl = document.getElementById("message");
const timeLeftEl = document.getElementById("timeLeft");
const leafLeftEl = document.getElementById("leafLeft");
const jumpCountEl = document.getElementById("jumpCount");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const resultPanel = document.getElementById("resultPanel");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");

const START = { x: 13, y: 82 };
const GOAL = { x: 86, y: 17 };
const MAX_DISTANCE = 29;
const MAX_LEAVES = 12;
const TIME_LIMIT = 30;

let active = false;
let finished = false;
let startedAt = 0;
let timerId = 0;
let leaves = [];
let frogPos = { ...START };
let jumpCount = 0;
let leafLeft = MAX_LEAVES;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function setFrogPosition(pos) {
  frogPos = { x: clamp(pos.x, 7, 93), y: clamp(pos.y, 9, 91) };
  frog.style.left = `${frogPos.x}%`;
  frog.style.top = `${frogPos.y}%`;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function clearLeaves() {
  leaves.forEach((leaf) => leaf.el.remove());
  leaves = [];
}

function updateHud() {
  const elapsed = active ? (performance.now() - startedAt) / 1000 : 0;
  const left = finished ? 0 : active ? clamp(Math.ceil(TIME_LIMIT - elapsed), 0, TIME_LIMIT) : TIME_LIMIT;
  timeLeftEl.textContent = String(left);
  leafLeftEl.textContent = String(leafLeft);
  jumpCountEl.textContent = String(jumpCount);
}

function showResult(title, text) {
  resultTitleEl.textContent = title;
  resultTextEl.textContent = text;
  resultPanel.classList.remove("hidden");
}

function hideResult() {
  resultPanel.classList.add("hidden");
}

function endGame({ won }) {
  if (finished) return;

  finished = true;
  active = false;
  window.clearInterval(timerId);
  startBtn.disabled = false;
  startBtn.textContent = "もう一回";
  updateHud();

  if (won) {
    const spare = leafLeft;
    if (spare >= 5) {
      showResult("帰宅の達人", "最小限の葉っぱで帰れました。池の設計者みたいです。");
    } else if (jumpCount <= 7) {
      showResult("雨の日の案内人", "ちょうどいい道を作れました。かえるも納得しています。");
    } else {
      showResult("遠回り帰宅", "たくさん跳びましたが、帰れたので全部よしです。");
    }
    setMessage("おうちに到着しました。ケロっと成功です。");
    return;
  }

  if (leafLeft <= 0) {
    showResult("葉っぱ切れ", "池の途中で予算が尽きました。次は少し近めに置くとよさそうです。");
    setMessage("葉っぱがなくなりました。やり直して道を短くしましょう。");
  } else {
    showResult("雨宿り延長", "時間切れです。かえるは一旦、葉っぱの下で待っています。");
    setMessage("時間切れです。次はもう少し大胆に跳ばせましょう。");
  }
}

function tick() {
  updateHud();
  if (!active) return;

  const elapsed = (performance.now() - startedAt) / 1000;
  if (elapsed >= TIME_LIMIT) {
    endGame({ won: false });
  }
}

function createLeaf(pos, reachable) {
  const leaf = document.createElement("button");
  leaf.type = "button";
  leaf.className = `leaf ${reachable ? "is-reachable" : "is-far"}`;
  leaf.style.left = `${pos.x}%`;
  leaf.style.top = `${pos.y}%`;
  leaf.style.transform = `translate(-50%, -50%) rotate(${Math.round(pos.x * 3 + pos.y * 2) % 90 - 45}deg)`;
  leaf.setAttribute("aria-label", "葉っぱ");
  pond.appendChild(leaf);
  return leaf;
}

function markReachableLeaves() {
  leaves.forEach((leaf) => {
    const reachable = distance(frogPos, leaf) <= MAX_DISTANCE;
    leaf.el.classList.toggle("is-reachable", reachable);
    leaf.el.classList.toggle("is-far", !reachable);
  });
}

function jumpTo(pos) {
  if (!active || finished) return;

  jumpCount += 1;
  frog.classList.remove("jumping");
  void frog.offsetWidth;
  frog.classList.add("jumping");
  setFrogPosition(pos);
  markReachableLeaves();
  updateHud();

  const toGoal = distance(frogPos, GOAL);
  if (toGoal <= 18) {
    setTimeout(() => endGame({ won: true }), 220);
  } else if (toGoal <= MAX_DISTANCE) {
    setMessage("おうちが見えてきました。近くに葉っぱを置けば帰れます。");
  } else {
    setMessage("いいジャンプです。次の葉っぱを置きましょう。");
  }
}

function placeLeaf(pos) {
  if (!active || finished) return;

  const nearestLeaf = leaves.some((leaf) => distance(leaf, pos) < 7);
  if (nearestLeaf) {
    setMessage("葉っぱが近すぎます。少し離して置いてください。");
    return;
  }

  if (leafLeft <= 0) {
    endGame({ won: false });
    return;
  }

  const reachable = distance(frogPos, pos) <= MAX_DISTANCE;
  const el = createLeaf(pos, reachable);
  const leaf = { ...pos, el };
  leaves.push(leaf);
  leafLeft -= 1;
  updateHud();

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    if (distance(frogPos, leaf) > MAX_DISTANCE) {
      setMessage("そこは遠すぎます。今の位置から届く葉っぱを選びましょう。");
      return;
    }
    jumpTo(leaf);
  });

  if (reachable) {
    setMessage("届く葉っぱです。もう一度タップするとジャンプします。");
  } else {
    setMessage("そこは少し遠いです。近くにも葉っぱを置きましょう。");
  }

  if (leafLeft <= 0 && distance(frogPos, GOAL) > MAX_DISTANCE) {
    setTimeout(() => {
      if (!finished && leafLeft <= 0) endGame({ won: false });
    }, 700);
  }
}

function getPondPoint(event) {
  const rect = pond.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function resetGame() {
  active = false;
  finished = false;
  window.clearInterval(timerId);
  clearLeaves();
  leafLeft = MAX_LEAVES;
  jumpCount = 0;
  setFrogPosition(START);
  hideResult();
  startBtn.disabled = false;
  startBtn.textContent = "スタート";
  setMessage("葉っぱを置いて、かえるをおうちまで帰してください。");
  updateHud();
}

function startGame() {
  resetGame();
  active = true;
  startedAt = performance.now();
  startBtn.disabled = true;
  startBtn.textContent = "帰宅中";
  setMessage("池をタップして葉っぱを置きます。届く葉っぱをタップするとジャンプします。");
  updateHud();
  timerId = window.setInterval(tick, 200);
}

pond.addEventListener("click", (event) => {
  if (event.target.closest(".leaf")) return;
  const point = getPondPoint(event);
  if (distance(point, GOAL) < 8) {
    if (distance(frogPos, GOAL) <= MAX_DISTANCE) {
      jumpTo(GOAL);
      return;
    }
    setMessage("おうちは葉っぱではありません。少し手前に置きましょう。");
    return;
  }
  placeLeaf(point);
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

resetGame();
