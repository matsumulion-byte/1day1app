import {
    FaceDetector,
    FilesetResolver
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  
  const asset = (p) => new URL(p, import.meta.url).toString();
  
  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");
  const addBtn = document.getElementById("addBtn");
  const switchBtn = document.getElementById("switchBtn");
  const statusEl = document.getElementById("status");
  
  let detector = null;
  let stream = null;
  let useFrontCamera = true;
  let rafId = 0;
  let lastVideoTime = -1;
  
  let foamBoost = 0;
  let stableFace = null;
  let lastFaceAt = 0;
  
  const drips = [];
  const sparkles = [];
  
  function setStatus(text) {
    statusEl.textContent = text;
  }
  
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  
  function videoToScreenRect(bbox) {
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const cw = canvas.width;
    const ch = canvas.height;
  
    const videoAspect = vw / vh;
    const canvasAspect = cw / ch;
  
    let drawW, drawH, offsetX, offsetY;
  
    if (videoAspect > canvasAspect) {
      drawH = ch;
      drawW = drawH * videoAspect;
      offsetX = (cw - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = cw;
      drawH = drawW / videoAspect;
      offsetX = 0;
      offsetY = (ch - drawH) / 2;
    }
  
    let x = offsetX + (bbox.originX / vw) * drawW;
    const y = offsetY + (bbox.originY / vh) * drawH;
    const w = (bbox.width / vw) * drawW;
    const h = (bbox.height / vh) * drawH;
  
    if (useFrontCamera) {
      x = cw - (x + w);
    }
  
    return { x, y, w, h };
  }
  
  function smoothFace(nextFace) {
    if (!stableFace) {
      stableFace = { ...nextFace };
      return stableFace;
    }
  
    const t = 0.24;
    stableFace.x = lerp(stableFace.x, nextFace.x, t);
    stableFace.y = lerp(stableFace.y, nextFace.y, t);
    stableFace.w = lerp(stableFace.w, nextFace.w, t);
    stableFace.h = lerp(stableFace.h, nextFace.h, t);
    return stableFace;
  }
  
  function spawnDrip(face, count = 2) {
    const radiusBase = face.w * 0.06;
    for (let i = 0; i < count; i++) {
      drips.push({
        x: face.x + face.w * (0.2 + Math.random() * 0.6),
        y: face.y - face.h * 0.08 + Math.random() * 10,
        vy: 1.2 + Math.random() * 1.8,
        r: radiusBase * (0.55 + Math.random() * 0.7),
        life: 40 + Math.random() * 25
      });
    }
  }
  
  function spawnSparkles(face, count = 8) {
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x: face.x + face.w * (0.1 + Math.random() * 0.8),
        y: face.y - face.h * (0.25 + Math.random() * 0.25),
        vx: (-0.6 + Math.random() * 1.2) * 0.8,
        vy: (-0.6 + Math.random() * 1.2) * 0.8,
        r: 1 + Math.random() * 2,
        life: 20 + Math.random() * 20
      });
    }
  }
  
  function addFoam() {
    foamBoost = clamp(foamBoost + 0.18, 0, 1.8);
    if (stableFace) {
      spawnDrip(stableFace, 3);
      spawnSparkles(stableFace, 12);
    }
  }
  
  function updateParticles() {
    for (let i = drips.length - 1; i >= 0; i--) {
      const p = drips[i];
      p.y += p.vy * (canvas.height / 844);
      p.life -= 1;
      if (p.life <= 0) drips.splice(i, 1);
    }
  
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) sparkles.splice(i, 1);
    }
  
    foamBoost = Math.max(0, foamBoost - 0.0025);
  }
  
  function drawBubble(x, y, r, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
  
    const g = ctx.createRadialGradient(
      x - r * 0.25,
      y - r * 0.25,
      r * 0.15,
      x,
      y,
      r
    );
    g.addColorStop(0, "rgba(255,255,255,0.98)");
    g.addColorStop(0.7, "rgba(248,250,255,0.92)");
    g.addColorStop(1, "rgba(234,240,255,0.72)");
  
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  
    ctx.restore();
  }
  
  function drawFoam(face) {
    const centerX = face.x + face.w * 0.5;
    const baseY = face.y - face.h * 0.1;
    const width = face.w * (1.1 + foamBoost * 0.12);
    const height = face.h * (0.42 + foamBoost * 0.22);
  
    const bigCount = Math.round(7 + foamBoost * 7);
    const smallCount = Math.round(10 + foamBoost * 12);
  
    for (let i = 0; i < bigCount; i++) {
      const t = bigCount === 1 ? 0.5 : i / (bigCount - 1);
      const x = centerX - width * 0.5 + width * t;
      const wave = Math.sin(t * Math.PI) * height;
      const y = baseY - wave * 0.55 + Math.sin((performance.now() * 0.002) + i) * 2;
      const r = face.w * (0.075 + Math.random() * 0.02) + foamBoost * face.w * 0.03;
      drawBubble(x, y, r, 0.96);
    }
  
    for (let i = 0; i < smallCount; i++) {
      const x = centerX + (-0.5 + Math.random()) * width * 0.95;
      const y = baseY - Math.random() * height;
      const r = face.w * (0.03 + Math.random() * 0.05) + foamBoost * face.w * 0.01;
      drawBubble(x, y, r, 0.9);
    }
  
    // 額ぎわの泡
    for (let i = 0; i < 6; i++) {
      const x = face.x + face.w * (0.1 + i * 0.16);
      const y = face.y + face.h * (0.02 + Math.sin(i) * 0.015);
      const r = face.w * 0.04;
      drawBubble(x, y, r, 0.88);
    }
  }
  
  function drawDrips() {
    drips.forEach((p) => {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
  
      ctx.beginPath();
      ctx.moveTo(p.x - p.r * 0.25, p.y - p.r * 0.3);
      ctx.quadraticCurveTo(p.x, p.y - p.r * 1.55, p.x + p.r * 0.25, p.y - p.r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }
  
  function drawSparkles() {
    sparkles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  
  function drawNoFaceGuide() {
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    const w = cw * 0.42;
    const h = ch * 0.34;
    const x = (cw - w) / 2;
    const y = ch * 0.2;
    const r = 30;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  
  async function setupDetector() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
  
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.6
    });
  }
  
  async function startCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  
    setStatus("カメラを起動中…");
  
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: useFrontCamera ? "user" : "environment",
        width: { ideal: 720 },
        height: { ideal: 1280 }
      }
    });
  
    video.srcObject = stream;
    await video.play();
    setStatus("顔を画面中央に入れてください");
  }
  
  function render() {
    rafId = requestAnimationFrame(render);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    if (!detector || video.readyState < 2) return;
  
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = detector.detectForVideo(video, performance.now());
  
      if (result.detections?.length) {
        const best = result.detections
          .map((d) => videoToScreenRect(d.boundingBox))
          .sort((a, b) => b.w * b.h - a.w * a.h)[0];
  
        smoothFace(best);
        lastFaceAt = performance.now();
      }
    }
  
    const hasRecentFace = stableFace && performance.now() - lastFaceAt < 350;
  
    if (hasRecentFace) {
      drawFoam(stableFace);
  
      // たまに少し垂れる
      if (Math.random() < 0.03 + foamBoost * 0.02) {
        spawnDrip(stableFace, 1);
      }
  
      setStatus(foamBoost > 1.1 ? "泡立ちすぎです" : "タップで泡を盛れます");
    } else {
      drawNoFaceGuide();
      setStatus("顔を画面中央に入れてください");
    }
  
    updateParticles();
    drawDrips();
    drawSparkles();
  }
  
  async function boot() {
    resizeCanvas();
  
    try {
      await setupDetector();
      await startCamera();
      render();
    } catch (err) {
      console.error(err);
      setStatus("カメラまたは顔検出の起動に失敗しました");
    }
  }
  
  addBtn.addEventListener("click", addFoam);
  window.addEventListener("pointerdown", (e) => {
    const isButton = e.target.closest(".btn");
    if (!isButton) addFoam();
  });
  
  switchBtn.addEventListener("click", async () => {
    useFrontCamera = !useFrontCamera;
    cancelAnimationFrame(rafId);
    rafId = 0;
    stableFace = null;
    lastFaceAt = 0;
    lastVideoTime = -1;
    await startCamera();
    render();
  });
  
  window.addEventListener("resize", resizeCanvas);
  
  boot();