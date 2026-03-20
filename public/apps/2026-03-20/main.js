const asset = (p) => new URL(p, import.meta.url).toString();

const stageLabel = document.getElementById('stageLabel');
const timerEl = document.getElementById('timer');

const startScreen = document.getElementById('startScreen');
const playScreen = document.getElementById('playScreen');
const resultScreen = document.getElementById('resultScreen');

const startButton = document.getElementById('startButton');
const retryButton = document.getElementById('retryButton');

const imageWrap = document.getElementById('imageWrap');
const bgImage = document.getElementById('bgImage');
const matsumuraImage = document.getElementById('matsumuraImage');
const flash = document.getElementById('flash');
const message = document.getElementById('message');

const resultTitle = document.getElementById('resultTitle');
const resultScore = document.getElementById('resultScore');
const resultText = document.getElementById('resultText');

const STAGE_TIME = 10;
// 松村の当たり判定/表示サイズを少しだけ大きくする
const MATSUMURA_SCALE = 1.15;

const stages = [
  {
    name: 'パンダ展示',
    bg: asset('./assets/panda_bg.png'),
    matsumura: asset('./assets/panda_matsumura.png'),
    // x,y,w は背景画像に対する割合
    spot: { x: 0.57, y: 0.55, w: 0.16 },
  },
  {
    name: 'ゴリラ展示',
    bg: asset('./assets/gorilla_bg.png'),
    matsumura: asset('./assets/gorilla_matsumura.png'),
    spot: { x: 0.19, y: 0.68, w: 0.19 },
  },
  {
    name: 'ハシビロコウ展示',
    bg: asset('./assets/shoebill_bg.png'),
    matsumura: asset('./assets/shoebill_matsumura.png'),
    spot: { x: 0.76, y: 0.42, w: 0.12 },
  },
];

let currentStageIndex = 0;
let score = 0;
let timeLeft = STAGE_TIME;
let rafId = 0;
let lastTimestamp = 0;
let stageLocked = false;
let currentRect = null;

function showScreen(name) {
  startScreen.classList.remove('active');
  playScreen.classList.remove('active');
  resultScreen.classList.remove('active');

  if (name === 'start') startScreen.classList.add('active');
  if (name === 'play') playScreen.classList.add('active');
  if (name === 'result') resultScreen.classList.add('active');
}

function setMessage(text) {
  message.textContent = text;
  message.classList.add('show');
}

function clearMessage() {
  message.classList.remove('show');
}

function flashOnce(type) {
  flash.className = 'flash';
  flash.classList.add(type === 'good' ? 'show--good' : 'show--bad');
  setTimeout(() => {
    flash.className = 'flash';
  }, 180);
}

function updateTimer() {
  timerEl.textContent = timeLeft.toFixed(1);
}

function updateStageLabel() {
  stageLabel.textContent = `STAGE ${currentStageIndex + 1} / ${stages.length}`;
}

function placeMatsumura() {
  const stage = stages[currentStageIndex];
  const wrapRect = imageWrap.getBoundingClientRect();

  const bgNaturalW = bgImage.naturalWidth || 1;
  const bgNaturalH = bgImage.naturalHeight || 1;

  const wrapW = wrapRect.width;
  const wrapH = wrapRect.height;

  const bgAspect = bgNaturalW / bgNaturalH;
  const wrapAspect = wrapW / wrapH;

  let renderW;
  let renderH;
  let offsetX;
  let offsetY;

  if (wrapAspect > bgAspect) {
    renderW = wrapW;
    renderH = wrapW / bgAspect;
    offsetX = 0;
    offsetY = (wrapH - renderH) / 2;
  } else {
    renderH = wrapH;
    renderW = wrapH * bgAspect;
    offsetY = 0;
    offsetX = (wrapW - renderW) / 2;
  }

  const x = offsetX + renderW * stage.spot.x;
  const y = offsetY + renderH * stage.spot.y;
  const width = renderW * stage.spot.w;

  matsumuraImage.style.left = `${x}px`;
  matsumuraImage.style.top = `${y}px`;
  matsumuraImage.style.width = `${width * MATSUMURA_SCALE}px`;

  requestAnimationFrame(() => {
    const rect = matsumuraImage.getBoundingClientRect();
    const hostRect = imageWrap.getBoundingClientRect();

    currentRect = {
      left: rect.left - hostRect.left,
      top: rect.top - hostRect.top,
      right: rect.right - hostRect.left,
      bottom: rect.bottom - hostRect.top,
    };
  });
}

function loadStage() {
  const stage = stages[currentStageIndex];
  stageLocked = false;
  timeLeft = STAGE_TIME;
  updateTimer();
  updateStageLabel();
  clearMessage();

  bgImage.src = stage.bg;
  matsumuraImage.src = stage.matsumura;

  let loaded = 0;
  const onAssetLoad = () => {
    loaded += 1;
    if (loaded >= 2) {
      placeMatsumura();
      startLoop();
    }
  };

  bgImage.onload = onAssetLoad;
  matsumuraImage.onload = onAssetLoad;
}

function stopLoop() {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function startLoop() {
  stopLoop();
  lastTimestamp = 0;
  rafId = requestAnimationFrame(tick);
}

function tick(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (!stageLocked) {
    timeLeft -= delta;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimer();
      missStage();
      return;
    }
    updateTimer();
  }

  rafId = requestAnimationFrame(tick);
}

function hitTest(x, y) {
  if (!currentRect) return false;
  return (
    x >= currentRect.left &&
    x <= currentRect.right &&
    y >= currentRect.top &&
    y <= currentRect.bottom
  );
}

function nextStage() {
  currentStageIndex += 1;
  if (currentStageIndex >= stages.length) {
    finishGame();
    return;
  }
  loadStage();
}

function clearToNext(delay = 700) {
  stageLocked = true;
  stopLoop();
  setTimeout(() => {
    nextStage();
  }, delay);
}

function clearStage() {
  if (stageLocked) return;
  stageLocked = true;
  score += 1;
  flashOnce('good');
  setMessage('みつけた！');
  stopLoop();
  setTimeout(() => {
    nextStage();
  }, 700);
}

function missStage() {
  if (stageLocked) return;
  stageLocked = true;
  flashOnce('bad');
  setMessage('見逃した！');
  stopLoop();
  setTimeout(() => {
    nextStage();
  }, 700);
}

function finishGame() {
  showScreen('result');
  resultScore.textContent = `${score} / ${stages.length} 発見`;

  if (score === 3) {
    resultTitle.textContent = '完璧';
    resultText.textContent = 'かなり松村に詳しい';
  } else if (score === 2) {
    resultTitle.textContent = 'おしい';
    resultText.textContent = '松村感知力あり';
  } else if (score === 1) {
    resultTitle.textContent = 'ふつう';
    resultText.textContent = 'ちょっと見逃している';
  } else {
    resultTitle.textContent = '見失い';
    resultText.textContent = '動物しか見ていない';
  }
}

function startGame() {
  currentStageIndex = 0;
  score = 0;
  showScreen('play');
  loadStage();
}

function handleTap(event) {
  if (stageLocked) return;

  const rect = imageWrap.getBoundingClientRect();
  const point = 'touches' in event && event.touches.length
    ? event.touches[0]
    : event;

  const x = point.clientX - rect.left;
  const y = point.clientY - rect.top;

  if (hitTest(x, y)) {
    clearStage();
  } else {
    flashOnce('bad');
    setMessage('ちがう！');
    setTimeout(() => {
      if (!stageLocked) clearMessage();
    }, 350);
  }
}

startButton.addEventListener('click', startGame);
retryButton.addEventListener('click', startGame);

imageWrap.addEventListener('click', handleTap, { passive: true });
imageWrap.addEventListener('touchstart', handleTap, { passive: true });

window.addEventListener('resize', () => {
  if (playScreen.classList.contains('active')) {
    placeMatsumura();
  }
});

showScreen('start');