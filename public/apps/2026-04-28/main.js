const asset = (p) => new URL(p, import.meta.url).toString();

const cans = [...document.querySelectorAll(".can")];
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const roundEl = document.getElementById("round");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const modal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");

const positions = [20, 50, 80];

let round = 1;
let score = 0;
let targetIndex = 0;
let canPositions = [0, 1, 2];
let accepting = false;

const roundSettings = {
  1: { swaps: 7, speed: 430, text: "まだ見える。たぶん。" },
  2: { swaps: 11, speed: 260, text: "少し怪しくなってきた。" },
  3: { swaps: 18, speed: 105, text: "これはもう缶の残像。" },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function layoutCans() {
  cans.forEach((can, i) => {
    const pos = canPositions[i];
    can.style.left = `${positions[pos]}%`;
    can.style.top = pos === 1 ? "58px" : "76px";
    can.style.zIndex = pos === 1 ? 3 : 2;
  });
}

function resetClasses() {
  cans.forEach((can) => {
    can.classList.remove("target", "correct", "wrong", "disabled");
  });
}

function setDisabled(disabled) {
  cans.forEach((can) => can.classList.toggle("disabled", disabled));
}

function pickTarget() {
  targetIndex = Math.floor(Math.random() * cans.length);
}

function randomSwap() {
  let a = Math.floor(Math.random() * 3);
  let b = Math.floor(Math.random() * 3);

  while (a === b) {
    b = Math.floor(Math.random() * 3);
  }

  const canA = canPositions.indexOf(a);
  const canB = canPositions.indexOf(b);

  [canPositions[canA], canPositions[canB]] = [canPositions[canB], canPositions[canA]];
}

async function playRound() {
  accepting = false;
  startBtn.disabled = true;
  resetClasses();
  setDisabled(true);

  roundEl.textContent = round;
  scoreEl.textContent = score;

  canPositions = [0, 1, 2];
  layoutCans();

  pickTarget();

  messageEl.textContent = "当たり缶を覚えてください";
  cans[targetIndex].classList.add("target");

  await sleep(1100);

  cans[targetIndex].classList.remove("target");
  messageEl.textContent = roundSettings[round].text;

  await sleep(450);

  const { swaps, speed } = roundSettings[round];

  for (let i = 0; i < swaps; i++) {
    randomSwap();
    layoutCans();
    await sleep(speed);
  }

  messageEl.textContent = "当たりだと思う缶を選んでください";
  accepting = true;
  setDisabled(false);
}

async function handleSelect(index) {
  if (!accepting) return;

  accepting = false;
  setDisabled(true);

  const selected = Number(index);
  const isCorrect = selected === targetIndex;

  if (isCorrect) {
    score++;
    cans[selected].classList.add("correct");
    messageEl.textContent = "正解。缶の気配を追えている。";
  } else {
    cans[selected].classList.add("wrong");
    cans[targetIndex].classList.add("correct");
    messageEl.textContent = "不正解。当たり缶はそこでした。";
  }

  scoreEl.textContent = score;

  await sleep(1300);

  if (round >= 3) {
    showResult();
  } else {
    round++;
    playRound();
  }
}

function showResult() {
  let title = "";
  let text = "";

  if (score === 3) {
    title = "缶の軌道が見えている人";
    text = "もはや自販機側の人間です。";
  } else if (score === 2) {
    title = "炭酸の気配を感じた人";
    text = "見えてはいないけど、何かを感じています。";
  } else if (score === 1) {
    title = "だいたい雰囲気で選んだ人";
    text = "人生の大半をそれで乗り切っています。";
  } else {
    title = "自販機にも裏切られる人";
    text = "押したボタンと違う飲み物が出てきそうです。";
  }

  resultTitle.textContent = title;
  resultText.textContent = `3ラウンド中 ${score} 問正解。${text}`;
  modal.classList.remove("hidden");
}

function resetGame() {
  round = 1;
  score = 0;
  roundEl.textContent = round;
  scoreEl.textContent = score;
  messageEl.textContent = "当たり缶を覚えてください";
  modal.classList.add("hidden");
  resetClasses();
  canPositions = [0, 1, 2];
  layoutCans();
  startBtn.disabled = false;
}

cans.forEach((can) => {
  can.addEventListener("click", () => {
    handleSelect(can.dataset.index);
  });
});

startBtn.addEventListener("click", playRound);
retryBtn.addEventListener("click", resetGame);

layoutCans();
setDisabled(true);