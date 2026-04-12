const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("launchCanvas");
const ctx = canvas.getContext("2d");

const phaseLabelEl = document.getElementById("phaseLabel");
const phaseTitleEl = document.getElementById("phaseTitle");
const phaseDescEl = document.getElementById("phaseDesc");
const meterNeedleEl = document.getElementById("meterNeedle");
const meterMinEl = document.getElementById("meterMin");
const meterMidEl = document.getElementById("meterMid");
const meterMaxEl = document.getElementById("meterMax");
const meterTargetEl = document.querySelector(".meter__target");
const angleScoreEl = document.getElementById("angleScore");
const powerScoreEl = document.getElementById("powerScore");
const timingScoreEl = document.getElementById("timingScore");
const actionBtn = document.getElementById("actionBtn");
const countdownEl = document.getElementById("countdown");
const soundToggleBtn = document.getElementById("soundToggle");

const W = 720;
const H = 1280;
canvas.width = W;
canvas.height = H;

const phases = {
  intro: "intro",
  angle: "angle",
  power: "power",
  timing: "timing",
  launch: "launch",
  result: "result",
};

const state = {
  phase: phases.intro,
  phaseStartAt: 0,
  needlePos: 0.5,
  angleValue: 0,
  powerValue: 0,
  timingValue: 0,
  scores: {
    angle: null,
    power: null,
    timing: null,
  },
  rocket: {
    x: W * 0.5,
    y: H * 0.64,
    angleDeg: 0,
    scale: 1,
    flame: 0,
    shake: 0,
    trail: [],
  },
  launch: {
    started: false,
    exploded: false,
    finished: false,
    progress: 0,
    height: 0,
    horizontalDrift: 0,
    quality: 0,
    resultTitle: "",
    resultBody: "",
  },
  stars: [],
  smoke: [],
  resizeRatio: 1,
  audioEnabled: false,
};

let lastTime = 0;
let rafId = 0;
let audioCtx = null;
let bgmGain = null;
let bgmOsc = null;

function createStars() {
  state.stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 2.2 + 0.6,
    a: Math.random() * 0.7 + 0.25,
    tw: Math.random() * 2 + 0.5,
  }));
}

function resetSmoke() {
  state.smoke = [];
}

function resetGame() {
  state.phase = phases.intro;
  state.phaseStartAt = performance.now();
  state.needlePos = 0.5;
  state.angleValue = 0;
  state.powerValue = 0;
  state.timingValue = 0;
  state.scores.angle = null;
  state.scores.power = null;
  state.scores.timing = null;

  state.rocket.x = W * 0.5;
  state.rocket.y = H * 0.64;
  state.rocket.angleDeg = 0;
  state.rocket.scale = 1;
  state.rocket.flame = 0;
  state.rocket.shake = 0;
  state.rocket.trail = [];

  state.launch.started = false;
  state.launch.exploded = false;
  state.launch.finished = false;
  state.launch.progress = 0;
  state.launch.height = 0;
  state.launch.horizontalDrift = 0;
  state.launch.quality = 0;
  state.launch.resultTitle = "";
  state.launch.resultBody = "";

  updatePhaseUI();
  updateMiniScores();
  resetSmoke();
}

function fitCanvas() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = Math.min(vw / W, vh / H);
  state.resizeRatio = ratio;
}

function updateMiniScores() {
  angleScoreEl.textContent = state.scores.angle ?? "--";
  powerScoreEl.textContent = state.scores.power ?? "--";
  timingScoreEl.textContent = state.scores.timing ?? "--";
}

function updatePhaseUI() {
  switch (state.phase) {
    case phases.intro:
      phaseLabelEl.textContent = "MISSION";
      phaseTitleEl.textContent = "ロケットを打ち上げろ";
      phaseDescEl.textContent =
        "3つの調整を成功させて宇宙へ。まずはスタート。";
      actionBtn.textContent = "START";
      showMeter(false);
      break;

    case phases.angle:
      phaseLabelEl.textContent = "PHASE 1";
      phaseTitleEl.textContent = "角度をあわせろ";
      phaseDescEl.textContent = "中央付近でタップ。まっすぐ飛ばせ。";
      actionBtn.textContent = "STOP ANGLE";
      meterMinEl.textContent = "-18°";
      meterMidEl.textContent = "90°";
      meterMaxEl.textContent = "+18°";
      meterTargetEl.classList.remove("is-right");
      showMeter(true);
      break;

    case phases.power:
      phaseLabelEl.textContent = "PHASE 2";
      phaseTitleEl.textContent = "推力をあわせろ";
      phaseDescEl.textContent = "弱すぎても強すぎてもダメ。";
      actionBtn.textContent = "LOCK POWER";
      meterMinEl.textContent = "LOW";
      meterMidEl.textContent = "BEST";
      meterMaxEl.textContent = "DANGER";
      meterTargetEl.classList.remove("is-right");
      showMeter(true);
      break;

    case phases.timing:
      phaseLabelEl.textContent = "PHASE 3";
      phaseTitleEl.textContent = "点火タイミング";
      phaseDescEl.textContent = "COUNTDOWN が 0 になった瞬間にタップ。";
      actionBtn.textContent = "IGNITION";
      meterTargetEl.classList.add("is-right");
      meterMinEl.textContent = "3";
      meterMidEl.textContent = "1";
      meterMaxEl.textContent = "0";
      showMeter(true);
      break;

    case phases.launch:
      phaseLabelEl.textContent = "LAUNCH";
      phaseTitleEl.textContent = "発射中...";
      phaseDescEl.textContent = "結果を見届けろ。";
      actionBtn.textContent = "LAUNCHING...";
      actionBtn.disabled = true;
      showMeter(false);
      break;

    case phases.result:
      phaseLabelEl.textContent = "RESULT";
      phaseTitleEl.textContent = state.launch.resultTitle;
      phaseDescEl.textContent = state.launch.resultBody;
      actionBtn.textContent = "RETRY";
      actionBtn.disabled = false;
      showMeter(false);
      break;

    default:
      break;
  }

  if (state.phase !== phases.launch) {
    actionBtn.disabled = false;
  }
}

function showMeter(show) {
  const meter = document.querySelector(".meter");
  meter.style.display = show ? "block" : "none";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function scoreFromCenterDistance(distance) {
  const score = Math.round(clamp(100 - distance * 200, 0, 100));
  return score;
}

function phaseElapsed(now) {
  return (now - state.phaseStartAt) / 1000;
}

function setPhase(nextPhase) {
  state.phase = nextPhase;
  state.phaseStartAt = performance.now();
  if (nextPhase === phases.angle) {
    state.needlePos = 0.5;
  }
  if (nextPhase === phases.power) {
    state.needlePos = 0.08;
  }
  if (nextPhase === phases.timing) {
    state.needlePos = 0;
    showCountdown("");
  }
  if (nextPhase === phases.launch) {
    prepareLaunch();
  }
  updatePhaseUI();
}

function showCountdown(text) {
  countdownEl.textContent = text;
  if (text) {
    countdownEl.classList.add("is-show");
    countdownEl.setAttribute("aria-hidden", "false");
  } else {
    countdownEl.classList.remove("is-show");
    countdownEl.setAttribute("aria-hidden", "true");
  }
}

function prepareLaunch() {
  state.rocket.angleDeg = state.angleValue;
  state.launch.started = true;
  state.launch.exploded = false;
  state.launch.finished = false;
  state.launch.progress = 0;
  state.launch.height = 0;
  state.launch.horizontalDrift = state.angleValue * 3.2;
  state.launch.quality =
    (state.scores.angle + state.scores.power + state.scores.timing) / 3;
  state.rocket.flame = 1;
  state.rocket.y = H * 0.68;
  playBeep(240, 0.06, 0.05);
}

function finalizeLaunchResult() {
  const avg = state.launch.quality;
  const absAngle = Math.abs(state.angleValue);
  const power = state.powerValue;
  const timing = state.timingValue;

  if (power > 0.9) {
    state.launch.resultTitle = "爆発";
    state.launch.resultBody = "推力が高すぎた。発射直後に空中分解した。";
    return;
  }

  if (power < 0.22) {
    state.launch.resultTitle = "失速";
    state.launch.resultBody = "推力不足。少し浮いてから静かに落ちた。";
    return;
  }

  if (Math.abs(timing) > 0.18) {
    state.launch.resultTitle = "点火失敗";
    state.launch.resultBody = "タイミングがずれて機体が暴れた。";
    return;
  }

  if (absAngle > 12) {
    state.launch.resultTitle = "斜め飛行";
    state.launch.resultBody = "打ち上がったが軌道が逸れて消えていった。";
    return;
  }

  if (avg >= 88) {
    state.launch.resultTitle = "大成功";
    state.launch.resultBody = "見事に宇宙到達。かなりきれいな打ち上げ。";
    return;
  }

  if (avg >= 72) {
    state.launch.resultTitle = "成功";
    state.launch.resultBody = "多少ぶれたが、ちゃんと打ち上がった。";
    return;
  }

  state.launch.resultTitle = "ぎりぎり成功";
  state.launch.resultBody = "危なっかしかったが、なんとか飛んだ。";
}

function onAction() {
  switch (state.phase) {
    case phases.intro:
      setPhase(phases.angle);
      break;

    case phases.angle: {
      const distance = Math.abs(state.needlePos - 0.5);
      const score = scoreFromCenterDistance(distance);
      state.scores.angle = score;
      state.angleValue = (state.needlePos - 0.5) * 36;
      updateMiniScores();
      playBeep(700, 0.06, 0.03);
      setPhase(phases.power);
      break;
    }

    case phases.power: {
      const distance = Math.abs(state.needlePos - 0.5);
      const score = scoreFromCenterDistance(distance);
      state.scores.power = score;
      state.powerValue = state.needlePos;
      updateMiniScores();
      playBeep(560, 0.06, 0.03);
      setPhase(phases.timing);
      break;
    }

    case phases.timing: {
      const zeroPoint = 1;
      const distance = Math.abs(state.needlePos - zeroPoint);
      const score = Math.round(clamp(100 - distance * 300, 0, 100));
      state.scores.timing = score;
      state.timingValue = state.needlePos - zeroPoint;
      updateMiniScores();
      playBeep(840, 0.08, 0.03);
      showCountdown("");
      setPhase(phases.launch);
      break;
    }

    case phases.result:
      resetGame();
      break;

    default:
      break;
  }
}

actionBtn.addEventListener("click", onAction);
canvas.addEventListener("click", () => {
  if (
    state.phase === phases.angle ||
    state.phase === phases.power ||
    state.phase === phases.timing
  ) {
    onAction();
  }
});

function updatePhaseLogic(now) {
  if (state.phase === phases.angle) {
    const t = phaseElapsed(now);
    state.needlePos = 0.5 + Math.sin(t * 2.8) * 0.4;
  }

  if (state.phase === phases.power) {
    const t = phaseElapsed(now);
    state.needlePos = (Math.sin(t * 4.2 - 0.8) + 1) * 0.5;
  }

  if (state.phase === phases.timing) {
    const t = phaseElapsed(now);
    const duration = 3;
    const p = clamp(t / duration, 0, 1);
    state.needlePos = p;

    const remain = Math.ceil(duration - t);
    if (t < duration) {
      showCountdown(String(remain));
    } else if (t < duration + 0.24) {
      showCountdown("0");
    } else {
      showCountdown("MISS");
      state.scores.timing = 0;
      state.timingValue = 0.5;
      updateMiniScores();
      setPhase(phases.launch);
    }
  }

  if (state.phase === phases.launch) {
    const t = phaseElapsed(now);
    updateLaunch(t);
  }

  if (state.phase === phases.result) {
    state.rocket.flame = 0;
  }

  const needleX = `${state.needlePos * 100}%`;
  meterNeedleEl.style.left = `calc(${needleX} - 4px)`;
}

function updateLaunch(t) {
  const rocket = state.rocket;
  const launch = state.launch;

  if (launch.finished) return;

  const power = state.powerValue;
  const timingAbs = Math.abs(state.timingValue);
  const angleAbs = Math.abs(state.angleValue);

  if (power > 0.9 && t > 0.5) {
    launch.exploded = true;
    rocket.flame = 0.5;
    spawnExplosion();
    launch.finished = true;
    finalizeLaunchResult();
    setTimeout(() => {
      state.phase = phases.result;
      updatePhaseUI();
    }, 700);
    return;
  }

  if (power < 0.22) {
    const p = clamp(t / 1.6, 0, 1);
    rocket.y = H * 0.68 - Math.sin(p * Math.PI) * 80;
    rocket.angleDeg = state.angleValue * 0.6;
    rocket.flame = 0.45;
    if (p >= 1) {
      launch.finished = true;
      finalizeLaunchResult();
      state.phase = phases.result;
      updatePhaseUI();
    }
    emitSmoke(rocket.x, rocket.y + 120, 2);
    return;
  }

  const baseDuration = 3.2;
  const progress = clamp(t / baseDuration, 0, 1);
  launch.progress = progress;

  const riseBoost = 0.78 + power * 0.55 - timingAbs * 0.25 - angleAbs * 0.01;
  const rise = easeOutCubic(progress) * H * clamp(riseBoost, 0.36, 1.05);

  rocket.y = H * 0.68 - rise;
  rocket.x = W * 0.5 + state.launch.horizontalDrift * progress * 10;
  rocket.angleDeg = state.angleValue * (1 - progress * 0.3) + Math.sin(t * 8) * timingAbs * 14;
  rocket.flame = 0.8 + Math.sin(t * 30) * 0.1;

  emitSmoke(rocket.x, rocket.y + 120, 3);

  if (progress >= 1) {
    launch.finished = true;
    finalizeLaunchResult();
    state.phase = phases.result;
    updatePhaseUI();
  }
}

function emitSmoke(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    state.smoke.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 2.4 + 1.8,
      life: 1,
      size: Math.random() * 18 + 24,
    });
  }
}

function spawnExplosion() {
  for (let i = 0; i < 42; i += 1) {
    state.smoke.push({
      x: state.rocket.x,
      y: state.rocket.y,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      life: 1,
      size: Math.random() * 20 + 16,
      hot: true,
    });
  }
  playBeep(120, 0.18, 0.12);
}

function updateSmoke(dt) {
  state.smoke = state.smoke
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      vx: p.vx * 0.985,
      vy: p.vy * 0.985 + 0.02,
      life: p.life - dt * (p.hot ? 1.2 : 0.55),
      size: p.size + dt * 26,
    }))
    .filter((p) => p.life > 0);
}

function drawBackground(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#08172b");
  g.addColorStop(0.55, "#0c2140");
  g.addColorStop(1, "#15181f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  state.stars.forEach((s, i) => {
    const a = s.a + Math.sin(now * 0.001 * s.tw + i) * 0.16;
    ctx.globalAlpha = clamp(a, 0.08, 0.95);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  drawGround();
}

function drawGround() {
  const padY = H * 0.83;
  const ground = ctx.createLinearGradient(0, padY, 0, H);
  ground.addColorStop(0, "#32333c");
  ground.addColorStop(1, "#1b1c22");
  ctx.fillStyle = ground;
  ctx.fillRect(0, padY, W, H - padY);

  ctx.fillStyle = "#2e313a";
  ctx.fillRect(W * 0.42, H * 0.7, W * 0.16, H * 0.13);

  ctx.fillStyle = "#555b6b";
  ctx.fillRect(W * 0.485, H * 0.56, 22, H * 0.27);

  ctx.fillStyle = "#3e4656";
  ctx.fillRect(W * 0.36, H * 0.76, W * 0.28, 18);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.5, H * 0.56);
  ctx.lineTo(W * 0.58, H * 0.65);
  ctx.stroke();
}

function drawSmoke() {
  for (const p of state.smoke) {
    ctx.globalAlpha = clamp(p.life * 0.65, 0, 1);
    ctx.fillStyle = p.hot ? "#ffb27a" : "#cfd5de";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRocket() {
  const { x, y, angleDeg, flame } = state.rocket;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);

  if (flame > 0) {
    ctx.save();
    ctx.translate(0, 105);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(22, 42 + flame * 46, 0, 120 + flame * 44);
    ctx.quadraticCurveTo(-22, 42 + flame * 46, 0, 10);
    ctx.closePath();

    const fg = ctx.createLinearGradient(0, 10, 0, 160);
    fg.addColorStop(0, "#fff7bf");
    fg.addColorStop(0.45, "#ffb347");
    fg.addColorStop(1, "#ff6b3d");
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "#dfe6ef";
  ctx.beginPath();
  ctx.moveTo(0, -110);
  ctx.quadraticCurveTo(38, -50, 34, 54);
  ctx.lineTo(34, 80);
  ctx.lineTo(-34, 80);
  ctx.lineTo(-34, 54);
  ctx.quadraticCurveTo(-38, -50, 0, -110);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff5d5d";
  ctx.beginPath();
  ctx.moveTo(0, -110);
  ctx.lineTo(18, -74);
  ctx.lineTo(-18, -74);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#c9d2dd";
  ctx.fillRect(-12, -56, 24, 110);

  ctx.fillStyle = "#6dc4ff";
  ctx.beginPath();
  ctx.arc(0, -24, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff5d5d";
  ctx.beginPath();
  ctx.moveTo(-34, 56);
  ctx.lineTo(-64, 94);
  ctx.lineTo(-34, 86);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(34, 56);
  ctx.lineTo(64, 94);
  ctx.lineTo(34, 86);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#aeb8c6";
  ctx.fillRect(-22, 78, 44, 18);

  ctx.restore();
}

function drawResultText() {
  if (state.phase !== phases.result && state.phase !== phases.launch) return;

  if (state.phase === phases.launch) return;

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 54px Inter, sans-serif";
  ctx.fillText(state.launch.resultTitle, W / 2, H * 0.19);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "600 24px Inter, sans-serif";
  const avg =
    Math.round((state.scores.angle + state.scores.power + state.scores.timing) / 3);
  ctx.fillText(`TOTAL ${avg}`, W / 2, H * 0.24);
  ctx.restore();
}

function render(now) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(now);
  drawSmoke();
  drawRocket();
  drawResultText();
}

function tick(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.033) : 0.016;
  lastTime = now;

  updatePhaseLogic(now);
  updateSmoke(dt);
  render(now);

  rafId = requestAnimationFrame(tick);
}

function playBeep(freq = 440, duration = 0.08, volume = 0.04) {
  if (!state.audioEnabled) return;
  ensureAudio();

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  if (!bgmGain) {
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(audioCtx.destination);
  }

  if (!bgmOsc) {
    bgmOsc = audioCtx.createOscillator();
    bgmOsc.type = "triangle";
    bgmOsc.frequency.value = 72;
    bgmOsc.connect(bgmGain);
    bgmOsc.start();
  }
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;

  if (state.audioEnabled) {
    ensureAudio();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.2);
    playBeep(660, 0.06, 0.03);
    soundToggleBtn.textContent = "SOUND ON";
  } else {
    if (bgmGain && audioCtx) {
      bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
    }
    soundToggleBtn.textContent = "SOUND OFF";
  }
}

soundToggleBtn.addEventListener("click", toggleAudio);

window.addEventListener("resize", fitCanvas);

createStars();
fitCanvas();
resetGame();
rafId = requestAnimationFrame(tick);

/*
  Optional:
  BGM をファイルに差し替えるなら assets 配下に置いて使えます。
  例:
  const bgm = new Audio(asset("./assets/bgm.mp3"));
  bgm.loop = true;
  bgm.volume = 0.35;
*/