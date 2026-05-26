import {
    FaceLandmarker,
    FilesetResolver
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  
const ASSET_BASE = "/apps/2026-05-26";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const ctx = overlay.getContext("2d");
  
  const cameraButton = document.getElementById("cameraButton");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const modalRetryButton = document.getElementById("modalRetryButton");
  
  const cameraCover = document.getElementById("cameraCover");
  const statusText = document.getElementById("statusText");
  const timeText = document.getElementById("timeText");
  const eyeText = document.getElementById("eyeText");
  const dangerText = document.getElementById("dangerText");
  const meterFill = document.getElementById("meterFill");
  const meterValue = document.getElementById("meterValue");
  const road = document.querySelector(".road");
  
  const resultModal = document.getElementById("resultModal");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  
  const GAME_DURATION = 24_000;
  const CALIBRATION_DURATION = 1_200;
  const CLOSED_GRACE_MS = 95;
  const FACE_MISSING_LIMIT_MS = 850;
  
  let faceLandmarker = null;
  let cameraReady = false;
  let detectorReady = false;
  
  let gameState = "idle";
  // idle / camera / ready / calibrating / playing / ended
  
  let openEyeBaseline = 0.24;
  let eyeRatio = 0;
  let eyeOpenPercent = 0;
  
  let calibrationStart = 0;
  let calibrationSamples = [];
  
  let gameStart = 0;
  let closedStartedAt = 0;
  let faceMissingStartedAt = 0;
  let lastVideoTime = -1;
  
  const LEFT_EYE = {
    outer: 33,
    inner: 133,
    topA: 159,
    topB: 158,
    bottomA: 145,
    bottomB: 153
  };
  
  const RIGHT_EYE = {
    outer: 263,
    inner: 362,
    topA: 386,
    topB: 385,
    bottomA: 374,
    bottomB: 380
  };
  
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function getEyeRatio(points, eye) {
    const horizontal = distance(points[eye.outer], points[eye.inner]);
    const verticalA = distance(points[eye.topA], points[eye.bottomA]);
    const verticalB = distance(points[eye.topB], points[eye.bottomB]);
    const vertical = (verticalA + verticalB) / 2;
  
    if (!horizontal) return 0;
    return vertical / horizontal;
  }
  
  function getBothEyeRatio(points) {
    const left = getEyeRatio(points, LEFT_EYE);
    const right = getEyeRatio(points, RIGHT_EYE);
    return (left + right) / 2;
  }
  
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  
  function setStatus(text) {
    statusText.textContent = text;
  }
  
  function setDanger(text, warning = false) {
    dangerText.textContent = text;
    dangerText.classList.toggle("warning", warning);
  }
  
  function setMeter(percent) {
    const p = clamp(percent, 0, 100);
    meterFill.style.width = `${p}%`;
    meterValue.textContent = `${Math.round(p)}%`;
    eyeText.textContent = `${Math.round(p)}%`;
  }
  
  function resizeOverlay() {
    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
  
    overlay.width = Math.max(1, Math.floor(rect.width * dpr));
    overlay.height = Math.max(1, Math.floor(rect.height * dpr));
  
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  
  function drawEyeDots(points) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  
    const w = overlay.clientWidth;
    const h = overlay.clientHeight;
  
    const indexes = [
      LEFT_EYE.outer,
      LEFT_EYE.inner,
      LEFT_EYE.topA,
      LEFT_EYE.topB,
      LEFT_EYE.bottomA,
      LEFT_EYE.bottomB,
      RIGHT_EYE.outer,
      RIGHT_EYE.inner,
      RIGHT_EYE.topA,
      RIGHT_EYE.topB,
      RIGHT_EYE.bottomA,
      RIGHT_EYE.bottomB
    ];
  
    ctx.fillStyle = "rgba(231, 212, 107, 0.95)";
  
    for (const index of indexes) {
      const p = points[index];
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  async function setupDetector() {
    setStatus("まばたき検出AIを読み込み中...");
  
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
  
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1
    });
  
    detectorReady = true;
  }
  
  async function setupCamera() {
    setStatus("カメラ許可を待っています...");
  
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 640 }
      },
      audio: false
    });
  
    video.srcObject = stream;
  
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
  
    cameraReady = true;
    cameraCover.classList.add("ready");
    resizeOverlay();
  }
  
  async function initialize() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("このブラウザではカメラが使えません");
      cameraButton.disabled = true;
      return;
    }
  
    cameraButton.disabled = true;
    cameraButton.textContent = "準備中...";
  
    try {
      await Promise.all([setupDetector(), setupCamera()]);
  
      gameState = "ready";
      setStatus("準備完了");
      cameraButton.hidden = true;
      startButton.disabled = false;
      startButton.textContent = "スタート";
      setDanger("スタートしたら24秒まばたき禁止");
      requestAnimationFrame(loop);
    } catch (error) {
      console.error(error);
      cameraButton.disabled = false;
      cameraButton.textContent = "もう一度カメラを許可する";
      setStatus("カメラ、または検出AIの起動に失敗しました");
      setDanger("HTTPS環境、カメラ許可、ブラウザ設定を確認してください", true);
    }
  }
  
  function startCalibration() {
    if (!cameraReady || !detectorReady) return;
  
    gameState = "calibrating";
    calibrationStart = performance.now();
    calibrationSamples = [];
  
    startButton.disabled = true;
    retryButton.hidden = true;
    resultModal.hidden = true;
  
    timeText.textContent = "24.0";
    setMeter(100);
    setDanger("キャリブレーション中：目を開けて正面を見てください");
  }
  
  function startGame() {
    gameState = "playing";
    gameStart = performance.now();
    closedStartedAt = 0;
    faceMissingStartedAt = 0;
  
    road.classList.add("running");
    setDanger("走行中：まばたきするな");
  }
  
  function endGame(type) {
    if (gameState === "ended") return;
  
    gameState = "ended";
    road.classList.remove("running");
    retryButton.hidden = false;
    startButton.disabled = false;
    startButton.textContent = "もう一回";
  
    if (type === "clear") {
      resultKicker.textContent = "FINISH";
      resultTitle.textContent = "完走";
      resultText.textContent =
        "24秒ル・マン完走。目は乾いたが、魂はまだ走っている。";
      setDanger("完走。これは耐久レースです");
    }
  
    if (type === "blink") {
      resultKicker.textContent = "CRASH";
      resultTitle.textContent = "居眠り運転";
      resultText.textContent =
        "まばたきを検知しました。24時間耐久を24秒にしても、眠いものは眠い。";
      setDanger("まばたき検出。クラッシュ", true);
    }
  
    if (type === "missing") {
      resultKicker.textContent = "LOST";
      resultTitle.textContent = "ドライバー失踪";
      resultText.textContent =
        "顔がカメラから外れました。ル・マンではなく逃走中になっています。";
      setDanger("顔が見えませんでした", true);
    }
  
    resultModal.hidden = false;
  }
  
  function updateGame(points, now) {
    const closedThreshold = openEyeBaseline * 0.62;
    const suspiciousThreshold = openEyeBaseline * 0.78;
  
    const isClosed = eyeRatio < closedThreshold;
    const isSuspicious = eyeRatio < suspiciousThreshold;
  
    if (gameState === "calibrating") {
      if (points && eyeRatio > 0.05) {
        calibrationSamples.push(eyeRatio);
        setDanger("キャリブレーション中：目を開けて正面を見てください");
      } else {
        setDanger("顔が見えません。正面を向いてください", true);
      }
  
      const elapsed = now - calibrationStart;
      timeText.textContent = "24.0";
  
      if (elapsed >= CALIBRATION_DURATION) {
        if (calibrationSamples.length < 8) {
          calibrationStart = now;
          calibrationSamples = [];
          setDanger("顔の検出が不安定です。もう一度正面を見てください", true);
          return;
        }
  
        const sorted = [...calibrationSamples].sort((a, b) => a - b);
        const upper = sorted.slice(Math.floor(sorted.length * 0.45));
        openEyeBaseline = upper.reduce((sum, v) => sum + v, 0) / upper.length;
  
        startGame();
      }
  
      return;
    }
  
    if (gameState !== "playing") return;
  
    const elapsed = now - gameStart;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    timeText.textContent = (remaining / 1000).toFixed(1);
  
    if (!points) {
      if (!faceMissingStartedAt) faceMissingStartedAt = now;
  
      if (now - faceMissingStartedAt > FACE_MISSING_LIMIT_MS) {
        endGame("missing");
      } else {
        setDanger("顔が見えません。正面に戻ってください", true);
      }
  
      return;
    }
  
    faceMissingStartedAt = 0;
  
    if (isClosed) {
      if (!closedStartedAt) closedStartedAt = now;
  
      const closedMs = now - closedStartedAt;
      setDanger(`目を閉じています：${Math.round(closedMs)}ms`, true);
  
      if (closedMs > CLOSED_GRACE_MS) {
        endGame("blink");
        return;
      }
    } else {
      closedStartedAt = 0;
  
      if (isSuspicious) {
        setDanger("薄目走法を検知中。危険です", true);
      } else {
        setDanger("走行中：まばたきするな");
      }
    }
  
    if (remaining <= 0) {
      timeText.textContent = "0.0";
      endGame("clear");
    }
  }
  
  function loop() {
    const now = performance.now();
  
    if (
      detectorReady &&
      cameraReady &&
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTime
    ) {
      lastVideoTime = video.currentTime;
  
      const result = faceLandmarker.detectForVideo(video, now);
      const points = result.faceLandmarks?.[0] || null;
  
      if (points) {
        eyeRatio = getBothEyeRatio(points);
  
        const closedThreshold = openEyeBaseline * 0.62;
        const openThreshold = openEyeBaseline * 1.05;
        eyeOpenPercent =
          ((eyeRatio - closedThreshold) / (openThreshold - closedThreshold)) * 100;
  
        setMeter(eyeOpenPercent);
        drawEyeDots(points);
      } else {
        eyeRatio = 0;
        setMeter(0);
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
  
      updateGame(points, now);
    }
  
    requestAnimationFrame(loop);
  }
  
  function retry() {
    resultModal.hidden = true;
    startCalibration();
  }
  
  cameraButton.addEventListener("click", initialize);
  startButton.addEventListener("click", startCalibration);
  retryButton.addEventListener("click", retry);
  modalRetryButton.addEventListener("click", retry);
  
  window.addEventListener("resize", resizeOverlay);
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeOverlay, 300);
  });
  
  document.addEventListener(
    "touchend",
    (event) => {
      if (event.target.closest("button")) return;
      event.preventDefault();
    },
    { passive: false }
  );