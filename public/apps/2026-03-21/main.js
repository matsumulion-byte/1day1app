const asset = (p) => new URL(p, import.meta.url).toString();

const AUDIO_URL = asset("./assets/loop.mp3");

const recordEl = document.getElementById("record");
const startButton = document.getElementById("startButton");
const playToggle = document.getElementById("playToggle");
const modeToggle = document.getElementById("modeToggle");
const speedText = document.getElementById("speedText");
const directionText = document.getElementById("directionText");
const scratchText = document.getElementById("scratchText");

const state = {
  isReady: false,
  isDragging: false,
  autoSpin: true,
  wildMode: false,

  angleDeg: 0,
  velocityDeg: 0,
  lastPointerAngle: 0,
  lastPointerTime: 0,
  lastInstantVelocity: 0,
  scratchForward: true,
  scratchCount: 0,
  lastScratchGrainUiTime: 0,

  audioContext: null,
  audioBuffer: null,

  playhead: 0,             // sec
  grainTimer: 0,
  grainInterval: 0.018,    // sec
  grainSize: 0.09,         // sec
  lastFrameTime: 0,
  reverseBuffer: null,
  voiceBus: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap(value, max) {
  let v = value % max;
  if (v < 0) v += max;
  return v;
}

function normalizeDeg(deg) {
  let v = deg % 360;
  if (v < 0) v += 360;
  return v;
}

function shortestDeltaDeg(next, prev) {
  let d = next - prev;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function getPointerAngleDeg(clientX, clientY) {
  const rect = recordEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function createReverseBuffer(ctx, buffer) {
  const reversed = ctx.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const src = buffer.getChannelData(ch);
    const dst = reversed.getChannelData(ch);
    for (let i = 0; i < src.length; i += 1) {
      dst[i] = src[src.length - 1 - i];
    }
  }
  return reversed;
}

async function setupAudio() {
  if (state.isReady) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();

  const response = await fetch(AUDIO_URL);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  state.audioContext = audioContext;
  state.audioBuffer = audioBuffer;
  state.reverseBuffer = createReverseBuffer(audioContext, audioBuffer);

  const voiceBus = audioContext.createGain();
  voiceBus.gain.value = 0.98;
  const comp = audioContext.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 10;
  comp.ratio.value = 1.6;
  comp.attack.value = 0.012;
  comp.release.value = 0.22;
  voiceBus.connect(comp);
  comp.connect(audioContext.destination);
  state.voiceBus = voiceBus;

  state.playhead = 0;
  state.isReady = true;
}

function updateRecordVisual() {
  recordEl.style.transform = `rotate(${state.angleDeg}deg)`;
}

function updateHud() {
  speedText.textContent = Math.abs(state.velocityDeg / 60).toFixed(2);

  if (Math.abs(state.velocityDeg) < 0.12) {
    directionText.textContent = "STOP";
  } else if (state.velocityDeg > 0) {
    directionText.textContent = "FWD";
  } else {
    directionText.textContent = "REV";
  }

  scratchText.textContent = String(state.scratchCount);
}

function triggerGrain() {
  if (!state.audioContext || !state.audioBuffer || !state.reverseBuffer) return;

  const absVel = Math.abs(state.velocityDeg);
  const scratching = state.isDragging;
  const gateVel = scratching
    ? Math.max(absVel, Math.abs(state.lastInstantVelocity) * 0.38)
    : absVel;
  if (gateVel < (scratching ? 0.05 : 0.25)) return;

  const ctx = state.audioContext;
  const buffer = state.audioBuffer;
  const reversed = state.reverseBuffer;
  const duration = buffer.duration;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  const forward = scratching ? state.scratchForward : state.velocityDeg >= 0;
  const velForTone = scratching
    ? Math.max(absVel, Math.abs(state.lastInstantVelocity))
    : absVel;

  const grainDuration = scratching
    ? clamp(0.052 - velForTone * 0.0015, 0.022, 0.048)
    : state.grainSize;

  let rate = 1;
  if (scratching) {
    const iv = Math.abs(state.lastInstantVelocity);
    rate = clamp(0.58 + iv * 0.072, 0.52, 1.88);
  }
  source.buffer = forward ? buffer : reversed;
  source.playbackRate.value = rate;
  const wallDur = grainDuration / rate;

  const now = ctx.currentTime;

  let filterOut = source;
  if (scratching) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 55;
    hp.Q.value = 0.7;
    source.connect(hp);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = state.wildMode ? 12800 : 14500;
    lp.Q.value = 0.67;
    hp.connect(lp);
    filterOut = lp;
  } else {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = state.wildMode ? 9000 : 12000;
    lp.Q.value = 0.7;
    source.connect(lp);
    filterOut = lp;
  }

  const peakGain = scratching
    ? clamp(0.42 + velForTone / 12, 0.36, 0.68)
    : clamp(0.18 + absVel / 18, 0.17, 0.46);
  const attack = scratching ? 0.0006 : 0.004;
  const release = scratching ? 0.018 : 0.05;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + attack);
  gain.gain.setValueAtTime(peakGain, now + Math.max(attack, wallDur - release));
  gain.gain.linearRampToValueAtTime(0, now + wallDur);

  filterOut.connect(gain);
  gain.connect(state.voiceBus ?? ctx.destination);

  let offset;

  if (forward) {
    offset = clamp(
      state.playhead,
      0,
      Math.max(0, duration - grainDuration - 0.002)
    );
  } else {
    const reversePlayhead = duration - state.playhead - grainDuration;
    offset = clamp(
      reversePlayhead,
      0,
      Math.max(0, duration - grainDuration - 0.002)
    );
  }

  source.start(now, offset, grainDuration);
  source.stop(now + wallDur + 0.015);
}

function onPointerDown(event) {
  if (!state.isReady) return;

  state.isDragging = true;
  recordEl.setPointerCapture(event.pointerId);

  state.lastPointerAngle = getPointerAngleDeg(event.clientX, event.clientY);
  state.lastPointerTime = performance.now();
  state.lastInstantVelocity = 0;
  state.lastScratchGrainUiTime = 0;
}

function onPointerMove(event) {
  if (!state.isDragging || !state.isReady) return;

  const now = performance.now();
  const nextAngle = getPointerAngleDeg(event.clientX, event.clientY);
  const deltaAngle = shortestDeltaDeg(nextAngle, state.lastPointerAngle);
  const deltaTime = Math.max(8, now - state.lastPointerTime);

  state.angleDeg = normalizeDeg(state.angleDeg + deltaAngle);

  const instantVelocity = deltaAngle / (deltaTime / 16.6667);
  state.lastInstantVelocity = instantVelocity;
  state.scratchForward = instantVelocity >= 0;

  // ドラッグ時は往復の向きが音にすぐ出るよう瞬間速度を強めに混ぜる
  const velBlend = 0.22;
  const velInstant = 0.78;
  state.velocityDeg =
    state.velocityDeg * velBlend + instantVelocity * velInstant;

  if (state.audioBuffer) {
    const dur = state.audioBuffer.duration;
    state.playhead = wrap(state.playhead + (deltaAngle / 360) * dur, dur);
  }

  const minDelta = state.wildMode ? 0.95 : 1.15;
  const throttleMs = state.wildMode ? 7 : 10;
  if (
    state.audioContext &&
    state.audioBuffer &&
    Math.abs(deltaAngle) >= minDelta
  ) {
    const tUi = performance.now();
    if (tUi - state.lastScratchGrainUiTime >= throttleMs) {
      state.lastScratchGrainUiTime = tUi;
      triggerGrain();
    }
  }

  if (Math.abs(deltaAngle) > 1.2) {
    state.scratchCount += 1;
  }

  state.lastPointerAngle = nextAngle;
  state.lastPointerTime = now;

  updateRecordVisual();
  updateHud();
}

function onPointerUp(event) {
  if (!state.isDragging) return;
  state.isDragging = false;
  state.lastInstantVelocity = 0;
  recordEl.releasePointerCapture(event.pointerId);
}

function tick(ts) {
  if (!state.lastFrameTime) state.lastFrameTime = ts;
  const dt = Math.min(0.05, (ts - state.lastFrameTime) / 1000);
  state.lastFrameTime = ts;

  if (!state.isDragging) {
    if (state.autoSpin) {
      const target = state.wildMode ? 5.6 : 4.8;
      state.velocityDeg += (target - state.velocityDeg) * 0.08;
    } else {
      state.velocityDeg *= 0.9;
      if (Math.abs(state.velocityDeg) < 0.02) state.velocityDeg = 0;
    }

    state.angleDeg = normalizeDeg(state.angleDeg + state.velocityDeg);
  }

  if (state.audioBuffer && !state.isDragging) {
    // オートスピンの目標角速度のとき playhead が壁時計 1 秒に対し 1 秒進む（スロー再生にならない）
    const targetVel = state.wildMode ? 5.6 : 4.8;
    state.playhead = wrap(
      state.playhead + (state.velocityDeg / targetVel) * dt,
      state.audioBuffer.duration
    );
  }

  const grainGate = state.isDragging
    ? Math.max(Math.abs(state.velocityDeg), Math.abs(state.lastInstantVelocity) * 0.38)
    : Math.abs(state.velocityDeg);

  if (state.isReady && grainGate > (state.isDragging ? 0.05 : 0.25)) {
    if (!state.isDragging) {
      state.grainTimer += dt;
      while (state.grainTimer >= state.grainInterval) {
        state.grainTimer -= state.grainInterval;
        triggerGrain();
      }
    }
  } else {
    state.grainTimer = 0;
  }

  updateRecordVisual();
  updateHud();
  requestAnimationFrame(tick);
}

startButton.addEventListener("click", async () => {
  try {
    await setupAudio();
    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }
    startButton.classList.add("is-started");
  } catch (error) {
    console.error(error);
    startButton.textContent = "AUDIO LOAD ERROR";
  }
});

playToggle.addEventListener("click", () => {
  state.autoSpin = !state.autoSpin;
  playToggle.textContent = state.autoSpin ? "AUTO SPIN ON" : "AUTO SPIN OFF";
});

modeToggle.addEventListener("click", () => {
  state.wildMode = !state.wildMode;
  modeToggle.textContent = state.wildMode ? "WILD MODE" : "NORMAL MODE";

  state.grainInterval = state.wildMode ? 0.015 : 0.018;
  state.grainSize = state.wildMode ? 0.1 : 0.09;
});

recordEl.addEventListener("pointerdown", onPointerDown);
recordEl.addEventListener("pointermove", onPointerMove);
recordEl.addEventListener("pointerup", onPointerUp);
recordEl.addEventListener("pointercancel", onPointerUp);

updateHud();
updateRecordVisual();
requestAnimationFrame(tick);