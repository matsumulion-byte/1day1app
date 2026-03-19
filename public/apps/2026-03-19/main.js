const asset = (p) => new URL(p, import.meta.url).toString();

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const saveBtn = document.getElementById("saveBtn");
const flipBtn = document.getElementById("flipBtn");
const scoreEl = document.getElementById("score");
const wigButtons = [...document.querySelectorAll(".wig-btn")];

const wigs = {
  bob: await loadImage(asset("./assets/bob.png")),
  long: await loadImage(asset("./assets/long.png")),
  afro: await loadImage(asset("./assets/afro.png")),
};

const wigConfig = {
  bob: { scale: 2.80, tall: 1.02, anchorY: 0.22 },
  long: { scale: 3.95, tall: 1.32, anchorY: 0.33 },
  afro: { scale: 2.78, tall: 0.95, anchorY: 0.02 },
};

let currentWig = "bob";
let stream = null;
let facingMode = "user";
let rafId = 0;
let busy = false;
let latestLandmarks = null;
let faceMesh = null;

for (const btn of wigButtons) {
  btn.addEventListener("click", () => {
    currentWig = btn.dataset.wig;
    wigButtons.forEach((b) => b.classList.toggle("active", b === btn));
  });
}

startBtn.addEventListener("click", startCamera);
flipBtn.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  await restartCamera();
});

saveBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `wig-day-${Date.now()}.png`;
  a.click();
});

setupFaceMesh();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function setupFaceMesh() {
  faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  faceMesh.onResults((results) => {
    latestLandmarks = results.multiFaceLandmarks?.[0] ?? null;
  });
}

async function startCamera() {
  try {
    await openCamera();
    startOverlay.style.display = "none";
    startLoop();
  } catch (err) {
    console.error(err);
    alert("カメラを起動できませんでした。権限設定を確認してください。");
  }
}

async function restartCamera() {
  stopCamera();
  await openCamera();
}

async function openCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  video.srcObject = stream;
  await video.play();
  resizeCanvas();
}

function stopCamera() {
  cancelAnimationFrame(rafId);
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
}

function startLoop() {
  cancelAnimationFrame(rafId);

  const tick = async () => {
    rafId = requestAnimationFrame(tick);

    if (video.readyState < 2) return;

    if (!busy) {
      busy = true;
      try {
        await faceMesh.send({ image: video });
      } catch (err) {
        console.error(err);
      } finally {
        busy = false;
      }
    }

    drawScene();
  };

  tick();
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawScene() {
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  if (video.videoWidth && video.videoHeight) {
    drawCoverMirrored(video, ctx, cw, ch);
  }

  if (!latestLandmarks) {
    scoreEl.textContent = "似合ってる度: --";
    return;
  }

  const map = getCoverMap(video.videoWidth, video.videoHeight, cw, ch);
  const lm = latestLandmarks;

  const left = landmarkToCanvas(lm[234], map, true);
  const right = landmarkToCanvas(lm[454], map, true);
  const top = landmarkToCanvas(lm[10], map, true);

  // 左右反転後の座標をそのまま使うと角度がひっくり返るので反転補正
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const faceWidth = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const cfg = wigConfig[currentWig];
  const wig = wigs[currentWig];

  const wigW = faceWidth * cfg.scale;
  const wigH = wigW * (wig.naturalHeight / wig.naturalWidth) * cfg.tall;

  // 頭頂(10)基準だと上に行きすぎるので少し下げる
  const centerX = top.x;
  const centerY = top.y + wigH * cfg.anchorY;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.drawImage(wig, -wigW / 2, -wigH / 2, wigW, wigH);
  ctx.restore();

  const score = calcSuitScore(lm, map, faceWidth, cw, ch);
  scoreEl.textContent = `似合ってる度: ${score}`;
}

function drawCoverMirrored(source, context, destW, destH) {
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  if (!sw || !sh) return;

  const srcRatio = sw / sh;
  const destRatio = destW / destH;

  let sx = 0, sy = 0, sWidth = sw, sHeight = sh;

  if (srcRatio > destRatio) {
    sWidth = sh * destRatio;
    sx = (sw - sWidth) / 2;
  } else {
    sHeight = sw / destRatio;
    sy = (sh - sHeight) / 2;
  }

  context.save();
  context.translate(destW, 0);
  context.scale(-1, 1);
  context.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, destW, destH);
  context.restore();
}

function getCoverMap(srcW, srcH, destW, destH) {
  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  let sx = 0,
    sy = 0,
    sWidth = srcW,
    sHeight = srcH;

  if (srcRatio > destRatio) {
    sWidth = srcH * destRatio;
    sx = (srcW - sWidth) / 2;
  } else {
    sHeight = srcW / destRatio;
    sy = (srcH - sHeight) / 2;
  }

  return { sx, sy, sWidth, sHeight, destW, destH };
}

function landmarkToCanvas(p, map, mirrored = true) {
  // 元のvideo座標
  const vx = p.x * video.videoWidth;
  const vy = p.y * video.videoHeight;

  // coverトリミング後の座標へ変換
  let x = ((vx - map.sx) / map.sWidth) * map.destW;
  let y = ((vy - map.sy) / map.sHeight) * map.destH;

  if (mirrored) {
    x = map.destW - x;
  }

  return { x, y };
}

function calcSuitScore(lm, map, faceWidth, cw, ch) {
  const nose = landmarkToCanvas(lm[1], map, true);
  const chin = landmarkToCanvas(lm[152], map, true);

  const centerBias = 1 - Math.min(Math.abs(nose.x - cw / 2) / (cw * 0.5), 1);
  const verticalBias = 1 - Math.min(Math.abs(chin.y - ch * 0.68) / (ch * 0.68), 1);
  const sizeBias = 1 - Math.min(Math.abs(faceWidth - cw * 0.30) / (cw * 0.30), 1);

  const raw = centerBias * 0.4 + verticalBias * 0.25 + sizeBias * 0.35;
  return Math.round(40 + raw * 60);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}