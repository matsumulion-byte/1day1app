// 息判定は端末差が大きいため、この3値を調整ポイントとしてまとめています。
const BLOW_THRESHOLD = 0.075;
const RELEASE_THRESHOLD = 0.045;
const REQUIRED_SUSTAIN_MS = 450;
const DUST_REDUCTION_PER_SECOND = 24;

const screens = {
  title: document.getElementById("titleScreen"),
  play: document.getElementById("playScreen"),
  boot: document.getElementById("bootScreen"),
  result: document.getElementById("resultScreen"),
};

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const soundButton = document.getElementById("soundButton");
const blowButton = document.getElementById("blowButton");
const playField = document.getElementById("playField");
const cartridge = document.getElementById("cartridge");
const dustLayer = document.getElementById("dustLayer");
const dustBar = document.getElementById("dustBar");
const dustPercent = document.getElementById("dustPercent");
const dustGauge = document.querySelector(".dust-gauge");
const volumeBar = document.getElementById("volumeBar");
const micStatus = document.getElementById("micStatus");
const particleLayer = document.getElementById("dustParticles");
const bootText = document.getElementById("bootText");

let audioContext = null;
let analyser = null;
let micStream = null;
let timeData = null;
let dust = 100;
let state = "title";
let aboveThresholdSince = null;
let lastFrame = performance.now();
let fallbackBlowing = false;
let muted = false;
let lastParticleAt = 0;

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
}

async function startGame() {
  state = "play";
  dust = 100;
  aboveThresholdSince = null;
  cartridge.classList.remove("cleared");
  updateDustUI();
  showScreen("play");
  tone(220, 0.07);

  try {
    // 権限ダイアログが放置されても、ゲームを止めたままにしない。
    const micReady = await Promise.race([
      prepareMicrophone().then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 4000)),
    ]);
    if (!micReady) throw new Error("Microphone permission timed out");
    micStatus.textContent = "準備OK！ 息を長めに吹いてください";
    blowButton.hidden = true;
  } catch (error) {
    // 権限拒否・非対応時もゲームとデザインを体験できる代替操作。
    micStatus.textContent = "マイクが使えません。ボタンを長押し！";
    blowButton.hidden = false;
  }

  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}

async function prepareMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone API unavailable");
  if (micStream) return;

  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.35;
  audioContext.createMediaStreamSource(micStream).connect(analyser);
  timeData = new Uint8Array(analyser.fftSize);
}

function getVolume() {
  if (!analyser || !timeData) return 0;
  analyser.getByteTimeDomainData(timeData);
  let sumSquares = 0;
  for (const sample of timeData) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / timeData.length);
}

function gameLoop(now) {
  if (state !== "play") return;
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  const micVolume = getVolume();
  const effectiveVolume = fallbackBlowing ? BLOW_THRESHOLD * 1.35 : micVolume;
  const level = Math.min(100, (effectiveVolume / (BLOW_THRESHOLD * 1.7)) * 100);
  volumeBar.style.width = `${level}%`;
  volumeBar.style.background = effectiveVolume >= BLOW_THRESHOLD ? "#e0c24c" : "#70a04c";

  const nowMs = performance.now();
  if (effectiveVolume >= BLOW_THRESHOLD) {
    aboveThresholdSince ??= nowMs;
  } else if (effectiveVolume < RELEASE_THRESHOLD) {
    aboveThresholdSince = null;
  }

  const sustained = aboveThresholdSince !== null && nowMs - aboveThresholdSince >= REQUIRED_SUSTAIN_MS;
  playField.classList.toggle("blowing", sustained);

  if (sustained) {
    dust = Math.max(0, dust - DUST_REDUCTION_PER_SECOND * deltaSeconds);
    updateDustUI();
    micStatus.textContent = "その調子！ フーーーーー！";
    if (nowMs - lastParticleAt > 85) {
      createDustParticle();
      lastParticleAt = nowMs;
    }
    if (dust <= 0) return clearGame();
  } else if (aboveThresholdSince !== null) {
    micStatus.textContent = "もう少し長く… フーーー！";
  } else if (!blowButton.hidden) {
    micStatus.textContent = "ボタンを長押しして吹いてください";
  } else {
    micStatus.textContent = "息を長めに吹いてください";
  }

  requestAnimationFrame(gameLoop);
}

function updateDustUI() {
  const rounded = Math.ceil(dust);
  dustPercent.textContent = `${rounded}%`;
  dustBar.style.width = `${dust}%`;
  dustLayer.style.opacity = String(Math.max(0, dust / 100));
  dustGauge.setAttribute("aria-valuenow", String(rounded));
}

function createDustParticle() {
  const particle = document.createElement("i");
  particle.className = "dust-particle";
  particle.style.left = `${35 + Math.random() * 38}%`;
  particle.style.top = `${35 + Math.random() * 40}%`;
  particle.style.animationDuration = `${0.6 + Math.random() * 0.55}s`;
  particleLayer.appendChild(particle);
  particle.addEventListener("animationend", () => particle.remove(), { once: true });
}

function clearGame() {
  state = "clear";
  playField.classList.remove("blowing");
  cartridge.classList.add("cleared");
  dust = 0;
  updateDustUI();
  toneSequence([523, 659, 784, 1047], 90);

  setTimeout(() => {
    showScreen("boot");
    bootText.textContent = "・・・";
    setTimeout(() => {
      screens.boot.classList.add("flash");
      bootText.textContent = "GAME START!";
      toneSequence([262, 330, 392, 523, 659], 110);
      setTimeout(() => {
        screens.boot.classList.remove("flash");
        showScreen("result");
        state = "result";
      }, 1500);
    }, 1200);
  }, 900);
}

function tone(frequency, duration, volume = 0.045) {
  if (muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* 効果音は任意機能 */ }
}

function toneSequence(notes, intervalMs) {
  notes.forEach((note, index) => setTimeout(() => tone(note, 0.09), index * intervalMs));
}

function setFallbackBlowing(active) {
  fallbackBlowing = active;
  blowButton.classList.toggle("active", active);
  if (!active) aboveThresholdSince = null;
}

function resetToTitle() {
  state = "title";
  fallbackBlowing = false;
  playField.classList.remove("blowing");
  showScreen("title");
  tone(165, 0.08);
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", resetToTitle);
soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
  soundButton.setAttribute("aria-label", muted ? "効果音をオンにする" : "効果音をオフにする");
  if (!muted) tone(330, 0.06);
});

blowButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  blowButton.setPointerCapture?.(event.pointerId);
  setFallbackBlowing(true);
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
  blowButton.addEventListener(eventName, () => setFallbackBlowing(false));
});

document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (event) => {
  if (event.target.closest("button, .play-field")) event.preventDefault();
});
