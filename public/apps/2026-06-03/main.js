const bubble = document.getElementById("bubble");
const levelTube = document.querySelector(".level-tube");
const angleEl = document.getElementById("angle");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const card = document.querySelector(".card");
const tiltDirectionEl = document.getElementById("tiltDirection");

let active = false;
let smoothedTilt = 0;
let tiltBias = 0;
let lastRawTilt = 0;
let useMotionTilt = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getScreenAngle = () => {
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  return ((angle % 360) + 360) % 360;
};

const isLandscape = () => {
  const angle = getScreenAngle();
  return angle === 90 || angle === 270;
};

const getRawTiltFromOrientation = (event) => {
  if (isLandscape()) {
    return event.beta ?? 0;
  }
  return event.gamma ?? 0;
};

const getRawTiltFromGravity = (x, y, z) => {
  if (isLandscape()) {
    return (Math.atan2(z, -y) * 180) / Math.PI;
  }

  // 平置き（画面が上）のときは y がほぼ 0 になり atan2(x, -y) が暴れる
  if (Math.abs(y) < 3) {
    return (Math.atan2(x, -z) * 180) / Math.PI;
  }

  return (Math.atan2(x, -y) * 180) / Math.PI;
};

const applyDeadZone = (tilt, dead = 0.8) => {
  const abs = Math.abs(tilt);
  if (abs <= dead) return 0;
  const sign = tilt < 0 ? -1 : 1;
  return sign * (abs - dead);
};

const getStatusText = (angle) => {
  if (angle <= 0.5) return "水平です";
  if (angle <= 1.5) return "ほぼ水平です";
  if (angle <= 4) return "少し傾いています";
  if (angle <= 8) return "傾いています";
  return "かなり傾いています";
};

const getDirectionText = (tilt) => {
  const abs = Math.abs(tilt);

  if (abs <= 0.5) {
    return "中央に入っています";
  }

  if (tilt > 0) {
    return "右側が低いです";
  }

  return "左側が低いです";
};

const getBubbleOffsetPx = (tilt) => {
  const abs = Math.abs(tilt);

  if (abs <= 0.5) {
    return 0;
  }

  const maxTilt = 12;
  const direction = tilt < 0 ? -1 : 1;
  const normalized = clamp(abs / maxTilt, 0, 1);
  const softened = Math.sqrt(normalized);

  /*
    実際の水準器と同じく、低い側ではなく高い側へ気泡が寄る。
    右が低い（tilt > 0）→ 気泡は左へ。
  */
  const tubeWidth = levelTube?.offsetWidth ?? 0;
  const maxOffset = tubeWidth * 0.28;

  return -direction * softened * maxOffset;
};

const setBubblePosition = (offsetPx) => {
  bubble.style.left = "50%";
  bubble.style.transform = `translate(calc(-50% + ${offsetPx}px), -50%)`;
};

const updateLevel = (tilt) => {
  const abs = Math.abs(tilt);
  const isLevel = abs <= 0.5;
  const displayAngle = isLevel ? 0 : abs;

  angleEl.textContent = displayAngle.toFixed(1);
  statusEl.textContent = getStatusText(abs);
  tiltDirectionEl.textContent = getDirectionText(tilt);
  setBubblePosition(isLevel ? 0 : getBubbleOffsetPx(tilt));

  card.classList.toggle("is-level", isLevel);
};

const processTiltSample = (rawTilt) => {
  lastRawTilt = rawTilt;
};

const handleOrientation = (event) => {
  if (!active || useMotionTilt) return;
  processTiltSample(getRawTiltFromOrientation(event));
};

const handleMotion = (event) => {
  if (!active) return;

  const g = event.accelerationIncludingGravity;
  if (g?.x == null || g?.y == null || g?.z == null) return;

  useMotionTilt = true;
  processTiltSample(getRawTiltFromGravity(g.x, g.y, g.z));
};

const tick = () => {
  if (!active) return;

  const adjusted = applyDeadZone(lastRawTilt - tiltBias);
  smoothedTilt = smoothedTilt * 0.92 + adjusted * 0.08;
  updateLevel(smoothedTilt);

  requestAnimationFrame(tick);
};

const calibrateTiltBias = () =>
  new Promise((resolve) => {
    const samples = [];
    const started = performance.now();

    const collect = () => {
      samples.push(lastRawTilt);

      if (performance.now() - started < 500) {
        requestAnimationFrame(collect);
      } else {
        tiltBias =
          samples.length > 0
            ? samples.reduce((sum, value) => sum + value, 0) / samples.length
            : 0;
        smoothedTilt = 0;
        resolve();
      }
    };

    requestAnimationFrame(collect);
  });

const requestSensorPermission = async () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (
    isIOS &&
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const result = await DeviceOrientationEvent.requestPermission();
    if (result !== "granted") return false;
  }

  if (
    isIOS &&
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      if (result !== "granted") return false;
    } catch {
      // orientation だけ許可された端末もある
    }
  }

  return true;
};

const addSensorListeners = () => {
  window.addEventListener("deviceorientation", handleOrientation, true);
  window.addEventListener("devicemotion", handleMotion, true);
};

const start = async () => {
  try {
    const permitted = await requestSensorPermission();

    if (!permitted) {
      statusEl.textContent = "センサーの使用が許可されませんでした";
      return;
    }

    active = true;
    useMotionTilt = false;
    startBtn.textContent = "測定中";
    startBtn.disabled = true;
    statusEl.textContent = "水平のまま少しお待ちください…";
    tiltDirectionEl.textContent = "今の向きを基準に調整しています";

    addSensorListeners();
    await calibrateTiltBias();
    setBubblePosition(0);
    requestAnimationFrame(tick);

    statusEl.textContent = "測定中";
    tiltDirectionEl.textContent = "中央に気泡が入ると水平です";
  } catch (error) {
    statusEl.textContent = "センサーを起動できませんでした";
    console.error(error);
  }
};

const recalibrate = () => {
  if (!active) return;
  tiltBias = lastRawTilt;
  smoothedTilt = 0;
  setBubblePosition(0);
  tiltDirectionEl.textContent = "基準を更新しました";
};

card.addEventListener("dblclick", recalibrate);
card.addEventListener(
  "touchend",
  (event) => {
    if (event.detail === 2) recalibrate();
  },
  { passive: true }
);

startBtn.addEventListener("click", start);
