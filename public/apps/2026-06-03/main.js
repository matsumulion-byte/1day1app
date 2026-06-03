const bubble = document.getElementById("bubble");
const angleEl = document.getElementById("angle");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const card = document.querySelector(".card");
const tiltDirectionEl = document.getElementById("tiltDirection");

let active = false;
let smoothedTilt = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

const getBubblePosition = (tilt) => {
  const abs = Math.abs(tilt);

  // ほぼ水平なら中央に吸着
  if (abs <= 0.5) {
    return 50;
  }

  /*
    移動をかなりマイルドにする。
    以前は ±18° で左右40%移動。
    今回は ±12° で左右28%移動。
    さらに sqrt で中央付近の動きを少し鈍くする。
  */
  const maxTilt = 12;
  const direction = tilt < 0 ? -1 : 1;
  const normalized = clamp(abs / maxTilt, 0, 1);
  const softened = Math.sqrt(normalized);

  return 50 + direction * softened * 28;
};

const updateLevel = (tilt) => {
  const abs = Math.abs(tilt);
  const displayAngle = abs <= 0.5 ? 0 : abs;

  angleEl.textContent = displayAngle.toFixed(1);
  statusEl.textContent = getStatusText(abs);
  tiltDirectionEl.textContent = getDirectionText(tilt);

  bubble.style.left = `${getBubblePosition(tilt)}%`;

  card.classList.toggle("is-level", abs <= 0.5);
};

const handleOrientation = (event) => {
  if (!active) return;

  const orientation = screen.orientation?.angle ?? window.orientation ?? 0;

  const rawTilt =
    Math.abs(orientation) === 90
      ? event.beta ?? 0
      : event.gamma ?? 0;

  /*
    スムージングを強める。
    数値の反応は残しつつ、気泡がビクビクしにくくなる。
  */
  smoothedTilt = smoothedTilt * 0.92 + rawTilt * 0.08;

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
    tiltDirectionEl.textContent = "中央に気泡が入ると水平です";

    window.addEventListener("deviceorientation", handleOrientation, true);
  } catch (error) {
    statusEl.textContent = "センサーを起動できませんでした";
    console.error(error);
  }
};

startBtn.addEventListener("click", start);
