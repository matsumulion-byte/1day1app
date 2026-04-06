const asset = (p) => new URL(p, import.meta.url).toString();
void asset;

const STAGES = [
  { dust: 2, applySpeed: 0.02 },
  { dust: 3, applySpeed: 0.024 },
  { dust: 4, applySpeed: 0.03 },
];

const state = {
  stageIndex: 0,
  phase: "dust", // dust | align | applying | bubble | result
  offsetX: 0,
  dragStartX: 0,
  startOffsetX: 0,
  pointerId: null,
  progress: 0,
  applyRaf: 0,

  dusts: [],
  bubbles: [],
  resolvedDustCount: 0,
  resolvedBubbleCount: 0,

  alignmentPenalty: 0,
  dustPenalty: 0,
  finishedScore: 0,
};

const stageText = document.getElementById("stageText");
const scoreText = document.getElementById("scoreText");
const phone = document.getElementById("phone");
const film = document.getElementById("film");
const tab = document.getElementById("tab");
const dustLayer = document.getElementById("dustLayer");
const bubbleLayer = document.getElementById("bubbleLayer");
const message = document.getElementById("message");
const qualityBar = document.getElementById("qualityBar");
const actionBtn = document.getElementById("actionBtn");

const helpBtn = document.getElementById("helpBtn");
const helpDialog = document.getElementById("helpDialog");
const closeHelpBtn = document.getElementById("closeHelpBtn");

const resultDialog = document.getElementById("resultDialog");
const resultEmoji = document.getElementById("resultEmoji");
const resultTitle = document.getElementById("resultTitle");
const resultBody = document.getElementById("resultBody");
const closeResultBtn = document.getElementById("closeResultBtn");

const stageScores = [];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function setMessage(text) {
  message.textContent = text;
}

function setQualityBar(value) {
  qualityBar.style.width = `${clamp(value, 0, 100)}%`;
}

function updateFilmVisual() {
  film.style.setProperty("--offset-x", `${state.offsetX}px`);
  film.style.setProperty("--progress", `${state.progress}`);
  const tilt = Math.max(0, 18 - Math.abs(state.offsetX) * 0.35);
  film.style.setProperty("--tilt", `${tilt}px`);
}

function resetStage() {
  cancelAnimationFrame(state.applyRaf);

  state.phase = "dust";
  state.offsetX = rand(-24, 24);
  state.dragStartX = 0;
  state.startOffsetX = 0;
  state.pointerId = null;
  state.progress = 0;

  state.dusts = [];
  state.bubbles = [];
  state.resolvedDustCount = 0;
  state.resolvedBubbleCount = 0;

  state.alignmentPenalty = 0;
  state.dustPenalty = 0;
  state.finishedScore = 0;

  stageText.textContent = `${state.stageIndex + 1} / ${STAGES.length}`;
  scoreText.textContent = "-";
  actionBtn.disabled = true;
  actionBtn.textContent = state.stageIndex === STAGES.length - 1 ? "結果を見る" : "次へ";
  phone.classList.remove("is-done", "is-bad");

  dustLayer.innerHTML = "";
  bubbleLayer.innerHTML = "";

  film.className = "film film--hidden";
  updateFilmVisual();

  createDusts(STAGES[state.stageIndex].dust);
  setMessage("まずはホコリを画面外へ払ってください。");
  setQualityBar(8);
}

function createDusts(count) {
  state.dusts = [];

  for (let i = 0; i < count; i += 1) {
    const dust = {
      id: `dust-${state.stageIndex}-${i}-${Date.now()}`,
      x: rand(18, 76),
      y: rand(18, 78),
      removed: false,
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startDustX: 0,
      startDustY: 0,
      el: null,
    };

    const el = document.createElement("div");
    el.className = "dust";
    el.style.left = `${dust.x}%`;
    el.style.top = `${dust.y}%`;

    el.addEventListener("pointerdown", (e) => {
      if (state.phase !== "dust" || dust.removed) return;
      dust.dragging = true;
      dust.pointerId = e.pointerId;
      dust.startX = e.clientX;
      dust.startY = e.clientY;
      dust.startDustX = dust.x;
      dust.startDustY = dust.y;
      el.setPointerCapture?.(e.pointerId);
    });

    dust.el = el;
    dustLayer.appendChild(el);
    state.dusts.push(dust);
  }
}

function handleDustMove(clientX, clientY, pointerId) {
  if (state.phase !== "dust") return;

  for (const dust of state.dusts) {
    if (!dust.dragging || dust.pointerId !== pointerId || dust.removed) continue;

    const dx = clientX - dust.startX;
    const dy = clientY - dust.startY;

    dust.x = clamp(dust.startDustX + dx / 3.2, -8, 106);
    dust.y = clamp(dust.startDustY + dy / 5.4, -8, 106);

    dust.el.style.left = `${dust.x}%`;
    dust.el.style.top = `${dust.y}%`;

    const isOut =
      dust.x <= 0 || dust.x >= 100 || dust.y <= 0 || dust.y >= 100;

    if (isOut) {
      dust.removed = true;
      dust.dragging = false;
      dust.el.remove();
      state.resolvedDustCount += 1;

      const cleanedRatio = state.resolvedDustCount / state.dusts.length;
      setQualityBar(8 + cleanedRatio * 18);

      if (state.resolvedDustCount === state.dusts.length) {
        startAlignPhase();
      }
    }
  }
}

function handleDustUp(pointerId) {
  for (const dust of state.dusts) {
    if (dust.pointerId === pointerId) {
      dust.dragging = false;
      dust.pointerId = null;
    }
  }
}

function startAlignPhase() {
  state.phase = "align";
  film.className = "film film--align";
  updateFilmVisual();
  setMessage("下のタブを左右に動かして位置を合わせてください。");
  setQualityBar(28);
}

function startAlign(pointerX, pointerId) {
  if (state.phase !== "align") return;
  state.pointerId = pointerId;
  state.dragStartX = pointerX;
  state.startOffsetX = state.offsetX;
}

function moveAlign(pointerX, pointerId) {
  if (state.phase !== "align" || pointerId !== state.pointerId) return;

  const delta = pointerX - state.dragStartX;
  state.offsetX = clamp(state.startOffsetX + delta, -48, 48);
  updateFilmVisual();

  const liveQuality = Math.max(0, 100 - Math.abs(state.offsetX) * 2);
  setQualityBar(28 + liveQuality * 0.32);
}

function endAlign(pointerId) {
  if (state.phase !== "align" || pointerId !== state.pointerId) return;
  state.pointerId = null;
  startApplying();
}

function startApplying() {
  state.phase = "applying";
  film.className = "film film--apply";
  setMessage("貼り付け中…");
  state.alignmentPenalty = Math.abs(state.offsetX) * 1.25;

  const stage = STAGES[state.stageIndex];

  const tick = () => {
    state.progress = clamp(state.progress + stage.applySpeed, 0, 1);
    updateFilmVisual();

    const progressQuality =
      48 + state.progress * 22 - state.alignmentPenalty * 0.18;
    setQualityBar(progressQuality);

    if (state.progress >= 1) {
      state.progress = 1;
      updateFilmVisual();
      finishApplying();
      return;
    }

    state.applyRaf = requestAnimationFrame(tick);
  };

  state.applyRaf = requestAnimationFrame(tick);
}

function finishApplying() {
  film.className = "film film--done";
  spawnBubbles();
  state.phase = "bubble";

  if (state.bubbles.length === 0) {
    setMessage("かなりうまく貼れました。気泡なしです。");
    finishStage();
  } else {
    setMessage("気泡を端まで押し出して消してください。");
  }
}

function bubbleTouchesEdge(bubble) {
  return (
    bubble.x <= 1 ||
    bubble.x + bubble.w >= 99 ||
    bubble.y <= 1 ||
    bubble.y + bubble.h >= 99
  );
}

function spawnBubbles() {
  bubbleLayer.innerHTML = "";
  state.bubbles = [];

  const offsetSeverity = Math.abs(state.offsetX);
  const bubbleCount = clamp(Math.round(offsetSeverity / 16) + 1, 1, 4);

  for (let i = 0; i < bubbleCount; i += 1) {
    const typeRoll = Math.random();
    const sizeClass =
      typeRoll > 0.72 ? "bubble--big" : typeRoll > 0.35 ? "" : "bubble--small";

    const w = sizeClass === "bubble--big" ? 14 : sizeClass === "bubble--small" ? 7 : 10;
    const h = sizeClass === "bubble--big" ? 7.5 : sizeClass === "bubble--small" ? 4.5 : 5.5;

    const bubble = {
      x: rand(14, 70),
      y: rand(12, 76),
      w,
      h,
      sizeClass,
      el: null,
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startBubbleX: 0,
      startBubbleY: 0,
      removed: false,
    };

    const el = document.createElement("div");
    el.className = `bubble ${sizeClass}`.trim();
    el.style.left = `${bubble.x}%`;
    el.style.top = `${bubble.y}%`;

    el.addEventListener("pointerdown", (e) => {
      if (state.phase !== "bubble" || bubble.removed) return;
      bubble.dragging = true;
      bubble.pointerId = e.pointerId;
      bubble.startX = e.clientX;
      bubble.startY = e.clientY;
      bubble.startBubbleX = bubble.x;
      bubble.startBubbleY = bubble.y;
      el.setPointerCapture?.(e.pointerId);
    });

    bubble.el = el;
    bubbleLayer.appendChild(el);
    state.bubbles.push(bubble);
  }
}

function handleBubbleMove(clientX, clientY, pointerId) {
  if (state.phase !== "bubble") return;

  for (const bubble of state.bubbles) {
    if (!bubble.dragging || bubble.pointerId !== pointerId || bubble.removed) continue;

    const dx = clientX - bubble.startX;
    const dy = clientY - bubble.startY;

    bubble.x = clamp(bubble.startBubbleX + dx / 3.2, -4, 102 - bubble.w);
    bubble.y = clamp(bubble.startBubbleY + dy / 5.0, -4, 102 - bubble.h);

    bubble.el.style.left = `${bubble.x}%`;
    bubble.el.style.top = `${bubble.y}%`;

    if (bubbleTouchesEdge(bubble)) {
      bubble.removed = true;
      bubble.dragging = false;
      bubble.el.remove();
      state.resolvedBubbleCount += 1;
      updateBubbleProgress();
      checkBubbleClear();
    }
  }
}

function handleBubbleUp(pointerId) {
  for (const bubble of state.bubbles) {
    if (bubble.pointerId === pointerId) {
      bubble.dragging = false;
      bubble.pointerId = null;
    }
  }
}

function updateBubbleProgress() {
  const total = state.bubbles.length || 1;
  const remain = total - state.resolvedBubbleCount;
  const bubblePenalty = remain * 14;
  const scoreEstimate = clamp(100 - state.alignmentPenalty - bubblePenalty, 0, 100);
  setQualityBar(scoreEstimate);
}

function checkBubbleClear() {
  const remaining = state.bubbles.filter((bubble) => !bubble.removed).length;
  if (remaining === 0) {
    finishStage();
  }
}

function finishStage() {
  state.phase = "result";

  const remaining = state.bubbles.filter((bubble) => !bubble.removed).length;
  const bubblePenalty = remaining * 14;
  const score = clamp(
    Math.round(100 - state.alignmentPenalty - bubblePenalty),
    0,
    100
  );

  state.finishedScore = score;
  setQualityBar(score);
  scoreText.textContent = String(score);

  actionBtn.disabled = false;
  actionBtn.textContent =
    state.stageIndex === STAGES.length - 1 ? "結果を見る" : "次へ";

  if (score >= 85) {
    setMessage("かなりきれいに貼れました。");
    phone.classList.remove("is-bad");
    void phone.offsetWidth;
    phone.classList.add("is-done");
  } else if (score >= 60) {
    setMessage("まあまあです。ちょっと気になるけど使えます。");
    phone.classList.remove("is-bad");
    void phone.offsetWidth;
    phone.classList.add("is-done");
  } else {
    setMessage("気になる仕上がりです。貼り直したくなります。");
    phone.classList.remove("is-done");
    void phone.offsetWidth;
    phone.classList.add("is-bad");
  }
}

function showFinalResult() {
  const scores = stageScores.length ? stageScores : [state.finishedScore];
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  if (avg >= 85) {
    resultEmoji.textContent = "🏆";
    resultTitle.textContent = "職人";
    resultBody.textContent = `平均 ${avg} 点。かなり信用できる貼り方です。`;
  } else if (avg >= 65) {
    resultEmoji.textContent = "✨";
    resultTitle.textContent = "見習い上級";
    resultBody.textContent = `平均 ${avg} 点。だいぶうまいですが、たまにズレます。`;
  } else {
    resultEmoji.textContent = "😐";
    resultTitle.textContent = "貼り直したい";
    resultBody.textContent = `平均 ${avg} 点。毎回ちょっと気になります。`;
  }

  resultDialog.showModal();
}

function nextAction() {
  if (state.phase !== "result") return;

  stageScores[state.stageIndex] = state.finishedScore;

  if (state.stageIndex < STAGES.length - 1) {
    state.stageIndex += 1;
    resetStage();
    return;
  }

  showFinalResult();
}

tab.addEventListener("pointerdown", (e) => {
  startAlign(e.clientX, e.pointerId);
});

window.addEventListener(
  "pointermove",
  (e) => {
    handleDustMove(e.clientX, e.clientY, e.pointerId);
    moveAlign(e.clientX, e.pointerId);
    handleBubbleMove(e.clientX, e.clientY, e.pointerId);
  },
  { passive: false }
);

window.addEventListener("pointerup", (e) => {
  handleDustUp(e.pointerId);
  endAlign(e.pointerId);
  handleBubbleUp(e.pointerId);
});

window.addEventListener("pointercancel", (e) => {
  handleDustUp(e.pointerId);
  endAlign(e.pointerId);
  handleBubbleUp(e.pointerId);
});

actionBtn.addEventListener("click", nextAction);

helpBtn.addEventListener("click", () => helpDialog.showModal());
closeHelpBtn.addEventListener("click", () => helpDialog.close());

closeResultBtn.addEventListener("click", () => {
  resultDialog.close();
  state.stageIndex = 0;
  stageScores.length = 0;
  resetStage();
});

helpDialog.addEventListener("click", (e) => {
  const rect = helpDialog.getBoundingClientRect();
  const inside =
    rect.left <= e.clientX &&
    e.clientX <= rect.right &&
    rect.top <= e.clientY &&
    e.clientY <= rect.bottom;

  if (!inside) helpDialog.close();
});

resultDialog.addEventListener("click", (e) => {
  const rect = resultDialog.getBoundingClientRect();
  const inside =
    rect.left <= e.clientX &&
    e.clientX <= rect.right &&
    rect.top <= e.clientY &&
    e.clientY <= rect.bottom;

  if (!inside) resultDialog.close();
});

document.addEventListener(
  "touchmove",
  (e) => {
    if (["dust", "align", "bubble"].includes(state.phase)) {
      e.preventDefault();
    }
  },
  { passive: false }
);

resetStage();