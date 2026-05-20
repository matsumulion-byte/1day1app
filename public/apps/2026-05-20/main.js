// main.js
const asset = (p) => new URL(p, import.meta.url).toString();

const targetText = document.getElementById("targetText");
const roundText = document.getElementById("roundText");
const scaleDisplay = document.getElementById("scaleDisplay");
const powder = document.getElementById("powder");
const powderStream = document.getElementById("powderStream");
const pourButton = document.getElementById("pourButton");
const nextButton = document.getElementById("nextButton");
const message = document.getElementById("message");
const subMessage = document.getElementById("subMessage");
const history = document.getElementById("history");
const resultModal = document.getElementById("resultModal");
const finalTitle = document.getElementById("finalTitle");
const finalText = document.getElementById("finalText");
const restartButton = document.getElementById("restartButton");
const soundButton = document.getElementById("soundButton");
const bgm = document.getElementById("bgm");

if (bgm) bgm.src = asset("./assets/bgm.mp3");

let isBgmOn = false;

const TARGETS = [35, 50, 75, 100, 120, 150, 180];
const MAX_ROUND = 3;

let round = 1;
let target = 100;
let amount = 0;
let isPressing = false;
let isJudged = false;
let pressStart = 0;
let rafId = null;
let results = [];

function pickTarget() {
  const candidates = TARGETS.filter((v) => v !== target);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function initGame() {
  round = 1;
  amount = 0;
  results = [];
  isPressing = false;
  isJudged = false;
  target = pickTarget();

  history.innerHTML = "";
  resultModal.classList.add("hidden");

  setupRound();
}

function setupRound() {
  amount = 0;
  isPressing = false;
  isJudged = false;
  target = pickTarget();

  roundText.textContent = `${round} / ${MAX_ROUND}`;
  targetText.textContent = target;
  scaleDisplay.textContent = "--- g";
  powder.style.height = "0%";
  powderStream.classList.remove("active");

  pourButton.classList.remove("hidden", "pressing");
  nextButton.classList.add("hidden");

  message.textContent = "目標を見て、感覚だけで止めてください。";
  subMessage.textContent = "計量結果は離すまで表示されません。";
}

function startPour(e) {
  e.preventDefault();

  if (!isBgmOn && bgm) {
    toggleBgm();
  }

  if (isJudged || isPressing) return;

  isPressing = true;
  pressStart = performance.now();
  pourButton.classList.add("pressing");
  powderStream.classList.add("active");

  message.textContent = "投入中……";
  subMessage.textContent = "離した瞬間に計量します。";

  rafId = requestAnimationFrame(updatePour);
}

function updatePour(now) {
  if (!isPressing) return;

  const holdTime = Math.max(0, now - pressStart);

  // 長押しするほど少しずつ勢いが増す
  const speed = 0.34 + holdTime * 0.00095;

  // 微妙な揺らぎ。完全一定だと作業感が強いので少しだけクセを入れる
  const wobble = 0.86 + Math.random() * 0.36;

  amount += speed * wobble;

  if (amount > 230) {
    amount = 230;
    stopPour();
    return;
  }

  const fillRate = Math.min(100, (amount / 200) * 100);
  powder.style.height = `${fillRate}%`;

  rafId = requestAnimationFrame(updatePour);
}

function stopPour(e) {
  if (e) e.preventDefault();
  if (!isPressing || isJudged) return;

  isPressing = false;
  isJudged = true;

  cancelAnimationFrame(rafId);
  pourButton.classList.remove("pressing");
  powderStream.classList.remove("active");

  const result = Math.round(amount);
  const diff = Math.abs(result - target);
  const judge = getJudge(diff);

  scaleDisplay.textContent = `${result} g`;
  message.textContent = judge.title;
  subMessage.textContent = `目標 ${target}g / 結果 ${result}g / 誤差 ${diff}g`;

  results.push({
    round,
    target,
    result,
    diff,
    title: judge.title
  });

  renderHistory();

  pourButton.classList.add("hidden");

  if (round >= MAX_ROUND) {
    setTimeout(showFinalResult, 650);
  } else {
    nextButton.classList.remove("hidden");
  }
}

function getJudge(diff) {
  if (diff <= 2) {
    return { title: "神の目分量" };
  }

  if (diff <= 5) {
    return { title: "ほぼ正解" };
  }

  if (diff <= 10) {
    return { title: "家庭科の希望" };
  }

  if (diff <= 20) {
    return { title: "だいたいで生きている" };
  }

  return { title: "レシピを読め" };
}

function renderHistory() {
  history.innerHTML = results
    .map((item) => {
      return `
        <div class="history-row">
          <span>${item.round}回目</span>
          <span>${item.target}g → <b>${item.result}g</b></span>
          <span>誤差 ${item.diff}g</span>
        </div>
      `;
    })
    .join("");
}

function goNextRound() {
  round += 1;
  setupRound();
}

function showFinalResult() {
  const totalDiff = results.reduce((sum, item) => sum + item.diff, 0);
  const avgDiff = totalDiff / results.length;
  const title = getFinalTitle(avgDiff);

  finalTitle.textContent = title;
  finalText.textContent = `3回の平均誤差は ${avgDiff.toFixed(1)}g。${getFinalComment(avgDiff)}`;

  resultModal.classList.remove("hidden");
}

function getFinalTitle(avgDiff) {
  if (avgDiff <= 2) return "計量神";
  if (avgDiff <= 5) return "目分量の申し子";
  if (avgDiff <= 10) return "ほぼパティシエ";
  if (avgDiff <= 20) return "だいたい職人";
  return "レシピを読め";
}

function getFinalComment(avgDiff) {
  if (avgDiff <= 2) return "もうスケールを使わなくてもいいかもしれません。";
  if (avgDiff <= 5) return "かなりいい感覚です。粉ものに愛されています。";
  if (avgDiff <= 10) return "料理なら許される範囲です。お菓子作りは少し怖いです。";
  if (avgDiff <= 20) return "雰囲気で生きています。でも家庭料理ならそれも味です。";
  return "目分量というより、祈りに近いです。";
}

pourButton.addEventListener("pointerdown", startPour);
pourButton.addEventListener("pointerup", stopPour);
pourButton.addEventListener("pointercancel", stopPour);
pourButton.addEventListener("pointerleave", stopPour);

nextButton.addEventListener("click", goNextRound);
restartButton.addEventListener("click", initGame);

document.addEventListener(
  "touchmove",
  (e) => {
    if (isPressing) e.preventDefault();
  },
  { passive: false }
);

async function toggleBgm() {
  if (!bgm) return;

  if (isBgmOn) {
    bgm.pause();
    isBgmOn = false;
    soundButton.textContent = "BGM OFF";
    soundButton.classList.remove("on");
    return;
  }

  try {
    bgm.volume = 0.45;
    await bgm.play();
    isBgmOn = true;
    soundButton.textContent = "BGM ON";
    soundButton.classList.add("on");
  } catch (error) {
    console.warn("BGM playback failed:", error);
    isBgmOn = false;
    soundButton.textContent = "BGM OFF";
    soundButton.classList.remove("on");
  }
}

soundButton.addEventListener("click", toggleBgm);

initGame();