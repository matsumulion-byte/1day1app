import {
  FilesetResolver,
  ImageSegmenter,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="app">
    <header class="header">
      <h1>Patrick Green Matsumura</h1>
      <p>人物だけ緑になるセントパトリックデーフィルター</p>
    </header>

    <section class="stage">
      <video id="video" playsinline muted></video>
      <canvas id="canvas"></canvas>

      <div class="overlay top">
        <button id="startBtn" class="btn">カメラを開始</button>
        <button id="switchBtn" class="btn sub">イン/アウト切替</button>
      </div>

      <div class="overlay bottom">
        <label class="control">
          <span>緑の強さ</span>
          <input id="power" type="range" min="0" max="100" value="72" />
        </label>

        <label class="control">
          <span>境界ぼかし</span>
          <input id="softness" type="range" min="0" max="8" value="2" />
        </label>
      </div>

      <div id="status" class="status">待機中</div>
    </section>
  </main>
`;

const video = document.querySelector('#video');
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const startBtn = document.querySelector('#startBtn');
const switchBtn = document.querySelector('#switchBtn');
const powerInput = document.querySelector('#power');
const softnessInput = document.querySelector('#softness');
const statusEl = document.querySelector('#status');

let segmenter = null;
let stream = null;
let facingMode = 'user';
let animationId = 0;
let lastVideoTime = -1;
let running = false;

async function createSegmenter() {
  statusEl.textContent = 'モデル読込中…';

  const visionFiles = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  segmenter = await ImageSegmenter.createFromOptions(visionFiles, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  statusEl.textContent = 'モデル準備完了';
}

async function startCamera() {
  stopCamera();

  statusEl.textContent = 'カメラ起動中…';

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 720 },
      height: { ideal: 1280 },
    },
    audio: false,
  });

  video.srcObject = stream;
  await video.play();

  resizeStage();
  running = true;
  lastVideoTime = -1;
  render();

  statusEl.textContent = '人物だけ緑化中';
}

function stopCamera() {
  running = false;
  cancelAnimationFrame(animationId);

  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
}

function resizeStage() {
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 1280;
  canvas.width = vw;
  canvas.height = vh;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applyGreenFilter(frameImageData, maskArray, width, height) {
  const data = frameImageData.data;
  const power = Number(powerInput.value) / 100;
  const soft = Number(softnessInput.value);

  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const category = maskArray[px];
    const isPerson = category === 0;

    if (!isPerson) continue;

    let alpha = power;

    if (soft > 0) {
      const x = px % width;
      const y = Math.floor(px / width);

      let edgeHits = 0;
      for (let oy = -soft; oy <= soft; oy++) {
        for (let ox = -soft; ox <= soft; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (maskArray[nIdx] !== 0) edgeHits++;
        }
      }

      if (edgeHits > 0) alpha *= 0.7;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    const targetR = luminance * 0.22;
    const targetG = clamp(luminance * 1.25 + 50, 0, 255);
    const targetB = luminance * 0.28;

    data[i] = r * (1 - alpha) + targetR * alpha;
    data[i + 1] = g * (1 - alpha) + targetG * alpha;
    data[i + 2] = b * (1 - alpha) + targetB * alpha;
  }

  return frameImageData;
}

function drawDecoration() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 180, 80, 0.10)');
  grad.addColorStop(1, 'rgba(0, 80, 30, 0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.font = `${Math.max(20, w * 0.04)}px sans-serif`;
  ctx.textAlign = 'center';

  for (let i = 0; i < 10; i++) {
    const x = ((i + 1) / 11) * w;
    const y = 40 + Math.sin(performance.now() / 600 + i) * 10;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('☘', x, y);
  }

  ctx.restore();
}

function render() {
  if (!running || !segmenter) return;

  if (video.readyState < 2) {
    animationId = requestAnimationFrame(render);
    return;
  }

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    resizeStage();
  }

  if (video.currentTime === lastVideoTime) {
    animationId = requestAnimationFrame(render);
    return;
  }
  lastVideoTime = video.currentTime;

  const nowMs = performance.now();

  segmenter.segmentForVideo(video, nowMs, (result) => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const categoryMask = result.categoryMask;
    if (!categoryMask) {
      drawDecoration();
      animationId = requestAnimationFrame(render);
      return;
    }

    const mask = categoryMask.getAsUint8Array();
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const filtered = applyGreenFilter(frame, mask, canvas.width, canvas.height);
    ctx.putImageData(filtered, 0, 0);

    drawDecoration();
  });

  animationId = requestAnimationFrame(render);
}

startBtn.addEventListener('click', async () => {
  try {
    startBtn.disabled = true;

    if (!segmenter) {
      await createSegmenter();
    }

    await startCamera();
  } catch (error) {
    console.error(error);
    statusEl.textContent = '起動に失敗しました';
  } finally {
    startBtn.disabled = false;
  }
});

switchBtn.addEventListener('click', async () => {
  try {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (segmenter) {
      await startCamera();
    }
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'カメラ切替に失敗しました';
  }
});

window.addEventListener('resize', resizeStage);
window.addEventListener('beforeunload', stopCamera);