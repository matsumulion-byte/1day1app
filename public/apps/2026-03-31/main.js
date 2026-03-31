const asset = (p) => new URL(p, import.meta.url).toString();

const QUESTION_COUNT = 5;
const LABELS = ["A", "B", "C"];

// 問題のズレ幅候補
const OFFSET_SETS = [
  [-4, 0, 4],
  [-6, 0, 6],
  [-3, 0, 5],
  [-5, 0, 3],
  [-8, 0, 8],
  [-2, 0, 2],
];

// 使っていないが、今後背景SEなどを足したくなった時用。
// ルール上ヘルパーは毎回入れておく。
void asset;

const els = {
  startScreen: document.getElementById("start-screen"),
  gameScreen: document.getElementById("game-screen"),
  resultScreen: document.getElementById("result-screen"),
  startBtn: document.getElementById("start-btn"),
  progress: document.getElementById("progress"),
  score: document.getElementById("score"),
  listenGrid: document.getElementById("listen-grid"),
  answerGrid: document.getElementById("answer-grid"),
  feedback: document.getElementById("feedback"),
  nextBtn: document.getElementById("next-btn"),
  resultTitle: document.getElementById("result-title"),
  resultScore: document.getElementById("result-score"),
  resultComment: document.getElementById("result-comment"),
  retryBtn: document.getElementById("retry-btn"),
  shareBtn: document.getElementById("share-btn"),
};

let audioCtx = null;
let currentIndex = 0;
let correctCount = 0;
let currentQuestion = null;
let answered = false;

function ensureAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    return audioCtx.resume();
  }
  return Promise.resolve();
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickOffsetSet(index) {
  const baseSet = OFFSET_SETS[index % OFFSET_SETS.length];
  return shuffle(baseSet);
}

function createQuestion(index) {
  const offsets = pickOffsetSet(index);
  const freqs = offsets.map((offset) => 440 + offset);
  const correctIndex = freqs.findIndex((freq) => freq === 440);
  return {
    freqs,
    correctIndex,
  };
}

function playTone(freq) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  // 純粋なsineよりちょい楽器っぽくする
  osc1.type = "triangle";
  osc2.type = "sine";

  osc1.frequency.setValueAtTime(freq, now);
  osc2.frequency.setValueAtTime(freq * 2, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(filter);
  filter.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.75);
  osc2.stop(now + 0.75);
}

function setScreen(screenName) {
  els.startScreen.classList.add("hidden");
  els.gameScreen.classList.add("hidden");
  els.resultScreen.classList.add("hidden");

  if (screenName === "start") els.startScreen.classList.remove("hidden");
  if (screenName === "game") els.gameScreen.classList.remove("hidden");
  if (screenName === "result") els.resultScreen.classList.remove("hidden");
}

function renderQuestion() {
  currentQuestion = createQuestion(currentIndex);
  answered = false;

  els.progress.textContent = `Q${currentIndex + 1} / ${QUESTION_COUNT}`;
  els.score.textContent = `Score: ${correctCount}`;
  els.feedback.textContent = "";
  els.nextBtn.classList.add("hidden");

  els.listenGrid.innerHTML = "";
  els.answerGrid.innerHTML = "";

  LABELS.forEach((label, index) => {
    const listenBtn = document.createElement("button");
    listenBtn.className = "listen-btn";
    listenBtn.type = "button";
    listenBtn.innerHTML = `<div>${label}</div><small>音を聴く</small>`;
    listenBtn.addEventListener("click", async () => {
      await ensureAudioContext();
      playTone(currentQuestion.freqs[index]);
    });
    els.listenGrid.appendChild(listenBtn);

    const answerBtn = document.createElement("button");
    answerBtn.className = "answer-btn";
    answerBtn.type = "button";
    answerBtn.textContent = `${label} が 440Hz`;
    answerBtn.addEventListener("click", () => answerQuestion(index));
    els.answerGrid.appendChild(answerBtn);
  });
}

function answerQuestion(selectedIndex) {
  if (answered) return;
  answered = true;

  const buttons = [...els.answerGrid.querySelectorAll(".answer-btn")];
  const isCorrect = selectedIndex === currentQuestion.correctIndex;

  if (isCorrect) {
    correctCount += 1;
    els.feedback.textContent = "正解。ちゃんと A=440 です。";
  } else {
    const correctLabel = LABELS[currentQuestion.correctIndex];
    const correctFreq = currentQuestion.freqs[currentQuestion.correctIndex];
    const selectedFreq = currentQuestion.freqs[selectedIndex];
    els.feedback.textContent =
      `不正解。正解は ${correctLabel}（${correctFreq}Hz）でした。` +
      ` 選んだのは ${selectedFreq}Hz。`;
  }

  buttons.forEach((btn, index) => {
    btn.disabled = true;
    if (index === currentQuestion.correctIndex) {
      btn.classList.add("correct");
    } else if (index === selectedIndex && !isCorrect) {
      btn.classList.add("wrong");
    }
  });

  [...els.listenGrid.querySelectorAll(".listen-btn")].forEach((btn) => {
    btn.disabled = true;
  });

  els.score.textContent = `Score: ${correctCount}`;
  els.nextBtn.classList.remove("hidden");
}

function getResultComment(score) {
  if (score === 5) {
    return {
      title: "ほぼ基準ピッチの住人",
      comment: "かなり聴き分けられています。オケのチューニングでも妙に落ち着いているタイプです。",
    };
  }
  if (score === 4) {
    return {
      title: "だいぶ 440 に強い人",
      comment: "かなり優秀です。なんとなくではなく、ちゃんと音の重心を拾えています。",
    };
  }
  if (score === 3) {
    return {
      title: "そこそこ 440 に近い人",
      comment: "悪くないです。自信満々ではないが、耳はそこそこ信用できます。",
    };
  }
  if (score === 2) {
    return {
      title: "雰囲気で合わせる人",
      comment: "惜しいです。たぶん耳より先に表情で合わせにいっています。",
    };
  }
  if (score === 1) {
    return {
      title: "気持ちで 440 を探す人",
      comment: "やや勘寄りです。ですが、ゼロではないのでまだ望みはあります。",
    };
  }
  return {
    title: "今日の基準ピッチは自由",
    comment: "今回は 440Hz と仲良くなれませんでした。もう一周すると急に当たり始めることがあります。",
  };
}

function showResult() {
  const result = getResultComment(correctCount);
  els.resultTitle.textContent = result.title;
  els.resultScore.textContent = `${QUESTION_COUNT}問中 ${correctCount}問正解`;
  els.resultComment.textContent = result.comment;
  setScreen("result");
}

function nextQuestion() {
  currentIndex += 1;
  if (currentIndex >= QUESTION_COUNT) {
    showResult();
    return;
  }
  renderQuestion();
}

function resetGame() {
  currentIndex = 0;
  correctCount = 0;
  renderQuestion();
  setScreen("game");
}

async function startGame() {
  await ensureAudioContext();
  resetGame();
}

async function copyResult() {
  const text =
    `A=440Hz 当てゲーム\n` +
    `${QUESTION_COUNT}問中 ${correctCount}問正解\n` +
    `${els.resultTitle.textContent}\n` +
    `${els.resultComment.textContent}`;

  try {
    await navigator.clipboard.writeText(text);
    els.shareBtn.textContent = "コピーしました";
    window.setTimeout(() => {
      els.shareBtn.textContent = "結果をコピー";
    }, 1200);
  } catch (error) {
    els.shareBtn.textContent = "コピー失敗";
    window.setTimeout(() => {
      els.shareBtn.textContent = "結果をコピー";
    }, 1200);
  }
}

els.startBtn.addEventListener("click", startGame);
els.nextBtn.addEventListener("click", nextQuestion);
els.retryBtn.addEventListener("click", startGame);
els.shareBtn.addEventListener("click", copyResult);

setScreen("start");