const TOTAL_ROUNDS = 1;
const TARGET_FREQ = 440.0;
const MIN_FREQ = 437.0;
const MAX_FREQ = 443.0;

const els = {
  round: document.getElementById("round"),
  score: document.getElementById("score"),
  message: document.getElementById("message"),
  playCurrentBtn: document.getElementById("playCurrentBtn"),
  playReferenceBtn: document.getElementById("playReferenceBtn"),
  stopBtn: document.getElementById("stopBtn"),
  judgeBtn: document.getElementById("judgeBtn"),
  adjustBtns: [...document.querySelectorAll(".adjust-btn")],
  app: document.querySelector(".app"),
  resultPanel: document.getElementById("resultPanel"),
  finalDetail: document.getElementById("finalDetail"),
  finalFreq: document.getElementById("finalFreq"),
  finalTitle: document.getElementById("finalTitle"),
  finalScore: document.getElementById("finalScore"),
  finalText: document.getElementById("finalText"),
  restartBtn: document.getElementById("restartBtn"),
};

let audioCtx = null;
let currentOsc = null;
let currentGain = null;

const state = {
  round: 1,
  score: 0,
  currentFreq: 440.0,
  isFinished: false,
};

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setMessage(text, type = "") {
  els.message.textContent = text;
  els.message.className = "message";
  if (type) els.message.classList.add(type);
}

function updateHeader() {
  els.round.textContent = state.round;
  els.score.textContent = state.score;
}

function getRandomStartFreq() {
  while (true) {
    const value = round1(MIN_FREQ + Math.random() * (MAX_FREQ - MIN_FREQ));
    if (Math.abs(value - TARGET_FREQ) >= 0.6) return value;
  }
}

function setupRound() {
  state.currentFreq = getRandomStartFreq();
  stopTone();
  updateHeader();
  setMessage("まずは今の音と440.0Hzを聴き比べよう。");
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }
  if (audioCtx.state === "suspended") {
    return audioCtx.resume();
  }
  return Promise.resolve();
}

function stopTone() {
  if (currentOsc && audioCtx) {
    const now = audioCtx.currentTime;
    currentGain.gain.cancelScheduledValues(now);
    currentGain.gain.setValueAtTime(currentGain.gain.value, now);
    currentGain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
    currentOsc.stop(now + 0.04);
    currentOsc = null;
    currentGain = null;
  }
}

async function playTone(freq) {
  await ensureAudio();
  stopTone();

  currentOsc = audioCtx.createOscillator();
  currentGain = audioCtx.createGain();

  currentOsc.type = "sine";
  currentOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  currentGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  currentGain.gain.linearRampToValueAtTime(0.16, audioCtx.currentTime + 0.03);

  currentOsc.connect(currentGain);
  currentGain.connect(audioCtx.destination);

  currentOsc.start();
}

function addFreq(step) {
  if (state.isFinished) return;
  state.currentFreq = round1(clamp(state.currentFreq + step, MIN_FREQ, MAX_FREQ));
}

function judgeRound() {
  if (state.isFinished) return;

  stopTone();

  const diff = round1(Math.abs(state.currentFreq - TARGET_FREQ));
  let addScore = 0;
  let text = "";
  let type = "bad";

  if (state.currentFreq === TARGET_FREQ) {
    addScore = 100;
    text = "大成功！ 440.0Hzぴったり。完璧です。";
    type = "great";
  } else if (diff <= 0.3) {
    addScore = 60;
    text = `成功！ 目標との差は ${diff.toFixed(1)}Hz。`;
    type = "good";
  } else {
    text = `失敗… 目標との差は ${diff.toFixed(1)}Hz。`;
    type = "bad";
  }

  state.score += addScore;
  updateHeader();
  setMessage(text, type);

  if (state.round >= TOTAL_ROUNDS) {
    state.isFinished = true;
    els.judgeBtn.disabled = true;
    els.adjustBtns.forEach((btn) => (btn.disabled = true));
    showFinalResult(text, type, state.currentFreq);
    return;
  }

  state.round += 1;
  els.judgeBtn.disabled = true;
  els.adjustBtns.forEach((btn) => (btn.disabled = true));

  setTimeout(() => {
    els.judgeBtn.disabled = false;
    els.adjustBtns.forEach((btn) => (btn.disabled = false));
    setupRound();
  }, 1400);
}

function showFinalResult(judgeText, judgeType, freqHz) {
  els.app.classList.add("game-finished");
  els.resultPanel.classList.remove("hidden");
  els.finalDetail.textContent = judgeText;
  els.finalDetail.className = "final-detail";
  if (judgeType) els.finalDetail.classList.add(judgeType);
  els.finalFreq.textContent = `あなたが決めた音：${freqHz.toFixed(1)} Hz（目標 440.0 Hz）`;
  els.finalScore.textContent = `スコア：${state.score} / 100`;

  if (state.score >= 100) {
    els.finalTitle.textContent = "伝説の調律マスター";
    els.finalText.textContent = "440.0 Hzぴったり。完璧です。";
  } else if (state.score >= 60) {
    els.finalTitle.textContent = "調律マスター";
    els.finalText.textContent = "目標に十分近づけました。";
  } else {
    els.finalTitle.textContent = "自由な耳の持ち主";
    els.finalText.textContent =
      "440.0 Hzの基準を、もう少し耳に染み込ませていこう。";
  }

  requestAnimationFrame(() => {
    els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function restartGame() {
  stopTone();
  state.round = 1;
  state.score = 0;
  state.isFinished = false;
  els.app.classList.remove("game-finished");
  els.resultPanel.classList.add("hidden");
  els.judgeBtn.disabled = false;
  els.adjustBtns.forEach((btn) => (btn.disabled = false));
  setupRound();
}

els.playCurrentBtn.addEventListener("click", () => {
  playTone(state.currentFreq);
});

els.playReferenceBtn.addEventListener("click", () => {
  playTone(TARGET_FREQ);
});

els.stopBtn.addEventListener("click", () => {
  stopTone();
});

els.adjustBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    addFreq(Number(btn.dataset.step));
  });
});

els.judgeBtn.addEventListener("click", () => {
  judgeRound();
});

els.restartBtn.addEventListener("click", () => {
  restartGame();
});

window.addEventListener("visibilitychange", () => {
  if (document.hidden) stopTone();
});

window.addEventListener("pagehide", () => {
  stopTone();
});

setupRound();