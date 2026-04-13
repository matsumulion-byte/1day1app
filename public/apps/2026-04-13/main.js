const asset = (p) => new URL(p, import.meta.url).toString();

const MAX_FILL = 100;
const OVERFLOW_POINT = 100;
const SAFE_START = 78;
const PERFECT_START = 93;
const PERFECT_END = 94;
const TOTAL_TIME = 15;

const coffeeEl = document.getElementById('coffee');
const foamEl = document.getElementById('foam');
const surfaceEl = document.getElementById('surface');
const spillEl = document.getElementById('spill');
const streamEl = document.getElementById('stream');
const pourBtn = document.getElementById('pourBtn');
const restartBtn = document.getElementById('restartBtn');
const retryBtn = document.getElementById('retryBtn');
const timeText = document.getElementById('timeText');
const rankText = document.getElementById('rankText');
const messageEl = document.getElementById('message');
const resultEl = document.getElementById('result');
const resultRankEl = document.getElementById('resultRank');
const resultScoreEl = document.getElementById('resultScore');
const resultTextEl = document.getElementById('resultText');

const state = {
  fill: 0,
  isPouring: false,
  isEnded: false,
  startAt: 0,
  lastAt: 0,
  remain: TOTAL_TIME,
  rafId: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPourSpeed(fill) {
  // 最初はやや早め、終盤はシビアに。
  if (fill < 50) return 20;
  if (fill < 75) return 14;
  if (fill < 88) return 10;
  if (fill < 96) return 7;
  return 5.5;
}

function getRank(fill, overflow = false, timeout = false) {
  if (overflow) {
    return {
      label: 'あふれた…',
      score: 0,
      text: '赤線を越えてしまった。焦りは禁物。',
    };
  }

  if (timeout) {
    const score = Math.round(clamp(fill / PERFECT_END, 0, 1) * 70);
    return {
      label: fill >= SAFE_START ? '時間切れの職人' : 'まだ薄い',
      score,
      text: '時間内に仕上げきれなかったが、途中のコントロールは悪くない。',
    };
  }

  if (fill >= PERFECT_START && fill <= PERFECT_END) {
    const score = 100 - Math.round((PERFECT_END - fill) * 2);
    return {
      label: '神の一杯',
      score: clamp(score, 95, 100),
      text: '表面張力ギリギリ。喫茶店の主も黙る精度。',
    };
  }

  if (fill >= 89) {
    return {
      label: '名バリスタ',
      score: 84 + Math.round((fill - 89) * 1.2),
      text: 'かなり良い。あと少しで伝説の領域。',
    };
  }

  if (fill >= SAFE_START) {
    return {
      label: '見習い店員',
      score: 72 + Math.round((fill - SAFE_START) * 1.0),
      text: '悪くない。もう少し攻めてもよかった。',
    };
  }

  if (fill >= 50) {
    return {
      label: '慎重派',
      score: 45 + Math.round((fill - 50) * 1.2),
      text: '安全運転。喫茶店としては少し物足りない。',
    };
  }

  return {
    label: 'ほぼ空',
    score: Math.round(fill * 0.8),
    text: 'ほとんど注げていない。緊張しすぎたかもしれない。',
  };
}

function updateVisuals() {
  const fill = clamp(state.fill, 0, 115);
  const liquidBottom = 8;
  const liquidHeight = fill * 0.75;

  coffeeEl.style.height = `${liquidHeight}%`;
  surfaceEl.style.bottom = `${liquidBottom + liquidHeight}%`;
  surfaceEl.style.height = fill > 3 ? '8px' : '0px';

  foamEl.style.bottom = `${liquidBottom + liquidHeight}%`;
  foamEl.style.height = fill > 8 ? '18px' : '0px';
  foamEl.style.opacity = fill > 8 ? '1' : '0';

  if (fill > OVERFLOW_POINT) {
    spillEl.style.height = `${Math.min(14, (fill - OVERFLOW_POINT) * 4)}%`;
    spillEl.style.opacity = '1';
  } else {
    spillEl.style.height = '0%';
    spillEl.style.opacity = '0';
  }

  const cupRect = document.querySelector('.cup-wrap').getBoundingClientRect();
  const stageRect = document.querySelector('.stage').getBoundingClientRect();
  const streamTop = stageRect.height * 0.145;
  const streamHeight =
    cupRect.top - stageRect.top + cupRect.height * 0.15 - streamTop;
  streamEl.style.height = `${Math.max(0, streamHeight)}px`;
  streamEl.style.opacity = state.isPouring && !state.isEnded ? '0.95' : '0';

  const rank = getRank(clamp(state.fill, 0, 100));
  rankText.textContent = state.isEnded ? '-' : rank.label;
}

function endGame({ overflow = false, timeout = false } = {}) {
  if (state.isEnded) return;
  state.isEnded = true;
  state.isPouring = false;
  streamEl.style.opacity = '0';

  const result = getRank(clamp(state.fill, 0, 100), overflow, timeout);
  rankText.textContent = result.label;
  messageEl.textContent = overflow
    ? '入れすぎた。赤線の手前で止めるのがコツ。'
    : timeout
      ? '時間切れ。次はもう少し攻めていい。'
      : 'いい止め方。かなりうまい。';

  resultRankEl.textContent = result.label;
  resultScoreEl.textContent = `${clamp(result.score, 0, 100)}%`;
  resultTextEl.textContent = result.text;
  resultEl.classList.remove('hidden');
}

function tick(now) {
  if (!state.lastAt) state.lastAt = now;
  const dt = (now - state.lastAt) / 1000;
  state.lastAt = now;

  if (!state.isEnded) {
    state.remain = Math.max(0, TOTAL_TIME - (now - state.startAt) / 1000);
    timeText.textContent = state.remain.toFixed(1);

    if (state.isPouring) {
      state.fill += getPourSpeed(state.fill) * dt;
      if (state.fill > 102) {
        updateVisuals();
        endGame({ overflow: true });
      }
    }

    if (state.remain <= 0) {
      updateVisuals();
      endGame({ timeout: true });
    }
  }

  updateVisuals();
  state.rafId = requestAnimationFrame(tick);
}

function startPour(event) {
  event.preventDefault();
  if (state.isEnded) return;
  state.isPouring = true;
  messageEl.textContent =
    state.fill < 72
      ? 'まだいける。赤線の手前まで攻めろ。'
      : 'ここからは慎重に。';
}

function stopPour(event) {
  event?.preventDefault?.();
  if (state.isEnded) return;
  state.isPouring = false;

  const result = getRank(clamp(state.fill, 0, 100));
  rankText.textContent = result.label;

  if (state.fill <= 1) {
    messageEl.textContent = 'ほとんど注げていない。もう一度。';
    return;
  }

  endGame();
}

function resetGame() {
  state.fill = 0;
  state.isPouring = false;
  state.isEnded = false;
  state.startAt = performance.now();
  state.lastAt = 0;
  state.remain = TOTAL_TIME;
  timeText.textContent = TOTAL_TIME.toFixed(1);
  rankText.textContent = '-';
  messageEl.textContent =
    '長押しで注ぐ。離すと止まる。表面張力ギリギリで止めろ。';
  resultEl.classList.add('hidden');
  updateVisuals();
}

function bindPressEvents(el) {
  el.addEventListener('pointerdown', startPour);
  el.addEventListener('pointerup', stopPour);
  el.addEventListener('pointercancel', stopPour);
  el.addEventListener('lostpointercapture', stopPour);

  el.addEventListener('pointerleave', (e) => {
    if (state.isPouring) stopPour(e);
  });

  // iOS系の保険
  el.addEventListener('touchstart', startPour, { passive: false });
  el.addEventListener('touchend', stopPour, { passive: false });
}

bindPressEvents(pourBtn);
restartBtn.addEventListener('click', resetGame);
retryBtn.addEventListener('click', resetGame);
window.addEventListener('resize', updateVisuals);

resetGame();
state.rafId = requestAnimationFrame(tick);

// 将来BGM等を足すとき用。今は未使用でもルールに沿ってヘルパーを保持。
void asset;