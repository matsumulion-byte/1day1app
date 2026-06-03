const bubble = document.getElementById("bubble");
const angleEl = document.getElementById("angle");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const card = document.querySelector(".card");

let active = false;
let smoothedTilt = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getStatusText = (angle) => {
  if (angle <= 0.4) return "水平です";
  if (angle <= 1.2) return "ほぼ水平です";
  if (angle <= 3) return "ちょっと傾いています";
  if (angle <= 7) return "まあまあ傾いています";
  return "かなり傾いています";
};

const updateLevel = (tilt) => {
  const abs = Math.abs(tilt);

  angleEl.textContent = abs.toFixed(1);
  statusEl.textContent = getStatusText(abs);

  const maxTilt = 18;
  const percent = 50 + clamp(tilt / maxTilt, -1, 1) * 40;
  bubble.style.left = `${percent}%`;

  card.classList.toggle("is-level", abs <= 0.4);
};

const handleOrientation = (event) => {
  if (!active) return;

  /*
    beta: 前後の傾き
    gamma: 左右の傾き

    水準器としては左右方向の水平を見たいので gamma を使用。
    スマホを横向きにした場合は beta の方が自然なことがあるため、
    画面向きに応じて見る軸を切り替える。
  */
  const orientation = screen.orientation?.angle ?? window.orientation ?? 0;
  const rawTilt =
    Math.abs(orientation) === 90
      ? event.beta ?? 0
      : event.gamma ?? 0;

  smoothedTilt = smoothedTilt * 0.82 + rawTilt * 0.18;
  updateLevel(smoothedTilt);
};

const requestSensorPermission = async () => {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === "granted";
  }

  return true;
};

const start = async () => {
  try {
    const permitted = await requestSensorPermission();

    if (!permitted) {
      statusEl.textContent = "センサーの使用が許可されませんでした";
      return;
    }

    active = true;
    startBtn.textContent = "測定中";
    startBtn.disabled = true;

    window.addEventListener("deviceorientation", handleOrientation, true);
  } catch (error) {
    statusEl.textContent = "センサーを起動できませんでした";
    console.error(error);
  }
};

startBtn.addEventListener("click", start);