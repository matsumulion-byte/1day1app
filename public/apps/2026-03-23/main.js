const asset = (p) => new URL(p, import.meta.url).toString();

/**
 * 画像の answer はプレイヤーが押すべき2択
 * - "kuma"
 * - "matsumura"
 *
 * kind は内部的な4分類
 * - "kuma"
 * - "matsumura"
 * - "matsumuraLikeKuma"
 * - "kumaLikeMatsumura"
 */
const IMAGE_POOL = [
  {
    src: asset("./assets/kuma-01.png"),
    kind: "kuma",
    answer: "kuma",
  },
  {
    src: asset("./assets/matsumura-01.png"),
    kind: "matsumura",
    answer: "matsumura",
  },
  {
    src: asset("./assets/matsumura-kuma-01.png"),
    kind: "matsumuraLikeKuma",
    answer: "kuma",
  },

  {
    src: asset("./assets/kuma-matsumura-01.png"),
    kind: "kumaLikeMatsumura",
    answer: "matsumura",
  },
];

const GAME_DURATION = 30_000;
const QUESTION_DURATION = 1150;
const LAST_FIVE_SECONDS = 5000;

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const timeText = document.getElementById("timeText");
const scoreText = document.getElementById("scoreText");
const countText = document.getElementById("countText");

const questionImage = document.getElementById("questionImage");
const imageCard = document.getElementById("imageCard");
const flashLabel = document.getElementById("flashLabel");

const kumaBtn = document.getElementById("kumaBtn");
const matsumuraBtn = document.getElementById("matsumuraBtn");

const resultType = document.getElementById("resultType");
const resultSub = document.getElementById("resultSub");
const finalScore = document.getElementById("finalScore");
const finalCorrect = document.getElementById("finalCorrect");
const finalAnswered = document.getElementById("finalAnswered");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.preload = "auto";
bgm.volume = 0.55;

const seTap = new Audio(asset("./assets/se-tap.mp3"));
seTap.preload = "auto";
seTap.volume = 0.8;

const seOk = new Audio(asset("./assets/se-ok.mp3"));
seOk.preload = "auto";
seOk.volume = 0.9;

const seNg = new Audio(asset("./assets/se-ng.mp3"));
seNg.preload = "auto";
seNg.volume = 0.85;

const seLast5 = new Audio(asset("./assets/se-last5.mp3"));
seLast5.preload = "auto";
seLast5.volume = 0.9;

const seResult = new Audio(asset("./assets/se-result.mp3"));
seResult.preload = "auto";
seResult.volume = 0.9;

const state = {
  isPlaying: false,
  startAt: 0,
  rafId: 0,
  questionTimer: 0,
  currentQuestion: null,
  questionDeck: [],
  score: 0,
  correct: 0,
  answered: 0,
  totalShown: 0,
  choiceKuma: 0,
  choiceMatsumura: 0,
  hasPlayedLast5: false,
};

function showScreen(name) {
  startScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  resultScreen.classList.remove("active");

  startScreen.setAttribute("aria-hidden", "true");
  gameScreen.setAttribute("aria-hidden", "true");
  resultScreen.setAttribute("aria-hidden", "true");

  if (name === "start") {
    startScreen.classList.add("active");
    startScreen.setAttribute("aria-hidden", "false");
  } else if (name === "game") {
    gameScreen.classList.add("active");
    gameScreen.setAttribute("aria-hidden", "false");
  } else {
    resultScreen.classList.add("active");
    resultScreen.setAttribute("aria-hidden", "false");
  }
}

function resetState() {
  state.isPlaying = false;
  state.startAt = 0;
  state.rafId = 0;
  state.questionTimer = 0;
  state.currentQuestion = null;
  state.questionDeck = [];
  state.score = 0;
  state.correct = 0;
  state.answered = 0;
  state.totalShown = 0;
  state.choiceKuma = 0;
  state.choiceMatsumura = 0;
  state.hasPlayedLast5 = false;

  flashLabel.className = "flash-label";
  flashLabel.textContent = "";
  scoreText.textContent = "0";
  countText.textContent = "0";
  timeText.textContent = "30.0";
  questionImage.removeAttribute("src");
  questionImage.alt = "問題画像";
  setButtonsEnabled(false);
}

function setButtonsEnabled(enabled) {
  kumaBtn.disabled = !enabled;
  matsumuraBtn.disabled = !enabled;
}

function playSe(audio) {
  try {
    audio.currentTime = 0;
    audio.play();
  } catch {
    // no-op
  }
}

async function startAudio() {
  try {
    bgm.currentTime = 0;
    bgm.volume = 0.55;
    await bgm.play();
  } catch {
    // ブラウザ制限で失敗してもゲーム自体は続行
  }
}

function stopGameLoop() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }
  if (state.questionTimer) {
    clearTimeout(state.questionTimer);
    state.questionTimer = 0;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextQuestion() {
  if (!state.isPlaying) return;

  // 4種類を1セットとしてシャッフルし、尽きたら再シャッフルして繰り返す
  if (state.questionDeck.length === 0) {
    state.questionDeck = shuffle(IMAGE_POOL);
  }
  const picked = state.questionDeck.pop();

  state.currentQuestion = picked;
  state.totalShown += 1;

  questionImage.src = picked.src;
  questionImage.alt = picked.kind;
  countText.textContent = String(state.totalShown);

  flashLabel.className = "flash-label";
  flashLabel.textContent = "";

  setButtonsEnabled(true);

  state.questionTimer = window.setTimeout(() => {
    if (!state.isPlaying) return;
    state.currentQuestion = null;
    setButtonsEnabled(false);
    nextQuestion();
  }, QUESTION_DURATION);
}

function showJudge(text, isGood) {
  flashLabel.textContent = text;
  flashLabel.className = `flash-label show ${isGood ? "good" : "bad"}`;
}

function answerCurrent(choice) {
  if (!state.isPlaying || !state.currentQuestion) return;

  playSe(seTap);

  const q = state.currentQuestion;
  const isCorrect = q.answer === choice;

  if (choice === "kuma") {
    state.choiceKuma += 1;
  } else {
    state.choiceMatsumura += 1;
  }

  state.answered += 1;

  if (isCorrect) {
    state.score += 100;
    state.correct += 1;
    playSe(seOk);
    showJudge(choice === "kuma" ? "クマ！" : "松村！", true);
  } else {
    state.score = Math.max(0, state.score - 50);
    playSe(seNg);
    showJudge(choice === "kuma" ? "いや、松村" : "いや、クマ", false);
  }

  scoreText.textContent = String(state.score);
  setButtonsEnabled(false);

  clearTimeout(state.questionTimer);
  state.questionTimer = window.setTimeout(() => {
    if (!state.isPlaying) return;
    state.currentQuestion = null;
    nextQuestion();
  }, 220);
}

function updateLoop() {
  if (!state.isPlaying) return;

  const elapsed = performance.now() - state.startAt;
  const remaining = Math.max(0, GAME_DURATION - elapsed);
  timeText.textContent = (remaining / 1000).toFixed(1);

  if (!state.hasPlayedLast5 && remaining <= LAST_FIVE_SECONDS) {
    state.hasPlayedLast5 = true;
    playSe(seLast5);
    imageCard.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.01)" },
        { transform: "scale(1)" },
      ],
      { duration: 250, iterations: 4 }
    );
  }

  if (remaining <= 0) {
    finishGame();
    return;
  }

  state.rafId = requestAnimationFrame(updateLoop);
}

function getDiagnosis() {
  if (state.choiceKuma > state.choiceMatsumura) {
    return {
      type: "クマ",
      sub: "野生の勘で判定しています。",
    };
  }

  if (state.choiceMatsumura > state.choiceKuma) {
    return {
      type: "松村",
      sub: "ヒゲと気配に反応しています。",
    };
  }

  if (state.correct >= Math.ceil(state.answered / 2)) {
    return {
      type: "松村",
      sub: "迷いながらも人間寄りに着地しました。",
    };
  }

  return {
    type: "クマ",
    sub: "最後は毛並みの力を信じました。",
  };
}

function finishGame() {
  state.isPlaying = false;
  stopGameLoop();
  setButtonsEnabled(false);

  const diagnosis = getDiagnosis();

  resultType.textContent = diagnosis.type;
  resultSub.textContent = diagnosis.sub;
  finalScore.textContent = String(state.score);
  finalCorrect.textContent = String(state.correct);
  finalAnswered.textContent = String(state.answered);

  bgm.volume = 0.28;
  playSe(seResult);
  showScreen("result");
}

async function startGame() {
  resetState();
  showScreen("game");

  await startAudio();

  state.isPlaying = true;
  state.startAt = performance.now();

  nextQuestion();
  updateLoop();
}

function backToTitle() {
  stopGameLoop();
  state.isPlaying = false;

  try {
    bgm.pause();
    bgm.currentTime = 0;
  } catch {
    // no-op
  }

  resetState();
  showScreen("start");
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", backToTitle);

kumaBtn.addEventListener("click", () => answerCurrent("kuma"));
matsumuraBtn.addEventListener("click", () => answerCurrent("matsumura"));

document.addEventListener("keydown", (e) => {
  if (!state.isPlaying) return;

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    answerCurrent("kuma");
  } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    answerCurrent("matsumura");
  }
});

window.addEventListener("pagehide", () => {
  stopGameLoop();
  try {
    bgm.pause();
  } catch {
    // no-op
  }
});

resetState();
showScreen("start");

// 先読み
shuffle(IMAGE_POOL).forEach((item) => {
  const img = new Image();
  img.src = item.src;
});