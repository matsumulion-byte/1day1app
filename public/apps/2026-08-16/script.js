(() => {
  "use strict";

  const canvas = document.getElementById("sceneCanvas");
  const ctx = canvas.getContext("2d");
  const frame = document.getElementById("sceneFrame");
  const form = document.getElementById("fireForm");
  const input = document.getElementById("wishInput");
  const count = document.getElementById("charCount");
  const error = document.getElementById("errorMessage");
  const igniteButton = document.getElementById("igniteButton");
  const igniteLabel = document.getElementById("igniteLabel");
  const resultPanel = document.getElementById("resultPanel");
  const resultText = document.getElementById("resultText");
  const retryButton = document.getElementById("retryButton");
  const saveButton = document.getElementById("saveButton");

  const WORLD_W = 1000;
  const WORLD_H = 720;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dpr = 1;
  let particles = [];
  let embers = [];
  let currentText = "";
  let ignitionStart = 0;
  let ignitionDuration = reduceMotion ? 100 : 3100;
  let isIgniting = false;
  let isLit = false;
  let lastTime = 0;

  const stars = Array.from({ length: 54 }, (_, i) => ({
    x: ((i * 137.5 + 43) % 960) + 20,
    y: ((i * 79.3 + 21) % 300) + 18,
    r: .45 + (i % 5) * .16,
    a: .12 + (i % 7) * .035
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }

  function setWorldTransform(targetCtx, width, height) {
    targetCtx.setTransform(width / WORLD_W, 0, 0, height / WORLD_H, 0, 0);
  }

  function drawScene(targetCtx, width, height, now, progress = 0, watermark = false) {
    targetCtx.save();
    setWorldTransform(targetCtx, width, height);
    const sky = targetCtx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, isIgniting ? "#030812" : "#071527");
    sky.addColorStop(.52, isIgniting ? "#09101a" : "#101d2c");
    sky.addColorStop(1, "#090d10");
    targetCtx.fillStyle = sky;
    targetCtx.fillRect(0, 0, WORLD_W, WORLD_H);

    const haze = targetCtx.createRadialGradient(490, 330, 20, 490, 330, 440);
    haze.addColorStop(0, "rgba(129,145,161,.10)");
    haze.addColorStop(1, "rgba(10,18,28,0)");
    targetCtx.fillStyle = haze;
    targetCtx.fillRect(0, 0, WORLD_W, 540);

    targetCtx.fillStyle = "rgba(224,232,239,.65)";
    for (const s of stars) {
      targetCtx.globalAlpha = s.a + Math.sin(now * .0004 + s.x) * .04;
      targetCtx.beginPath(); targetCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2); targetCtx.fill();
    }
    targetCtx.globalAlpha = 1;

    drawMountain(targetCtx);
    drawTown(targetCtx);
    if (particles.length) drawFires(targetCtx, now, progress);
    if (watermark) {
      targetCtx.fillStyle = "rgba(246,241,231,.72)";
      targetCtx.font = '500 22px "Yu Mincho", serif';
      targetCtx.letterSpacing = "3px";
      targetCtx.fillText("送り火メーカー", 44, 55);
    }
    targetCtx.restore();
  }

  function drawMountain(c) {
    c.fillStyle = "#10191b";
    c.beginPath();
    c.moveTo(-30, 518); c.lineTo(90, 426); c.lineTo(185, 448); c.lineTo(315, 332);
    c.lineTo(410, 368); c.lineTo(535, 232); c.lineTo(622, 298); c.lineTo(710, 278);
    c.lineTo(805, 374); c.lineTo(865, 356); c.lineTo(1035, 476); c.lineTo(1035, 720); c.lineTo(-30, 720); c.closePath(); c.fill();
    const slope = c.createLinearGradient(400, 285, 620, 680);
    slope.addColorStop(0, "rgba(38,52,48,.48)"); slope.addColorStop(1, "rgba(5,9,9,.9)");
    c.fillStyle = slope; c.fill();
    c.fillStyle = "rgba(70,83,76,.12)";
    c.beginPath(); c.moveTo(535,232); c.lineTo(622,298); c.lineTo(492,615); c.lineTo(260,640); c.closePath(); c.fill();
    c.fillStyle = "rgba(145,155,153,.055)";
    c.fillRect(0, 556, WORLD_W, 72);
  }

  function drawTown(c) {
    c.fillStyle = "#050809"; c.fillRect(0, 635, WORLD_W, 85);
    for (let i = 0; i < 58; i++) {
      const x = (i * 83 + 17) % WORLD_W;
      const y = 648 + ((i * 29) % 52);
      c.fillStyle = i % 6 === 0 ? "rgba(255,184,92,.28)" : "rgba(210,174,118,.11)";
      c.fillRect(x, y, i % 4 ? 2 : 3, 1.5);
    }
    const mist = c.createLinearGradient(0, 610, 0, 720);
    mist.addColorStop(0, "rgba(136,151,156,.07)"); mist.addColorStop(1, "rgba(5,8,10,0)");
    c.fillStyle = mist; c.fillRect(0,610,WORLD_W,110);
  }

  function createParticles(text) {
    const mask = document.createElement("canvas");
    mask.width = WORLD_W; mask.height = 320;
    const m = mask.getContext("2d", { willReadFrequently: true });
    const len = [...text].length;
    let fontSize = len <= 2 ? 250 : len <= 5 ? 158 : Math.max(66, 740 / len);
    let targetWidth = len <= 2 ? 790 : len <= 5 ? 900 : 1030;
    m.font = `900 ${fontSize}px "Hiragino Sans", "Yu Gothic", sans-serif`;
    const measured = m.measureText(text).width;
    if (measured > targetWidth) fontSize *= targetWidth / measured;
    m.font = `900 ${fontSize}px "Hiragino Sans", "Yu Gothic", sans-serif`;
    m.textAlign = "center"; m.textBaseline = "middle";
    m.fillStyle = "#fff";
    m.fillText(text, WORLD_W / 2, 162);
    const data = m.getImageData(0, 0, WORLD_W, 320).data;
    const gap = len <= 2 ? 8 : len <= 5 ? 7 : 6;
    const fresh = [];
    for (let y = 4; y < 316; y += gap) {
      for (let x = 2; x < WORLD_W - 2; x += gap) {
        if (data[(y * WORLD_W + x) * 4 + 3] > 90 && Math.random() > .18) {
          const centerBias = 1 - Math.abs(x - WORLD_W / 2) / (WORLD_W / 2);
          fresh.push({
            x, y: y + 355, size: 1.35 + Math.random() * 2.6,
            phase: Math.random() * Math.PI * 2,
            speed: .0012 + Math.random() * .0024,
            delay: Math.random() * .56 + (1 - centerBias) * .12,
            heat: Math.random(), drift: .6 + Math.random() * 1.8
          });
        }
      }
    }
    particles = fresh;
    embers = Array.from({ length: Math.min(80, Math.floor(fresh.length / 8)) }, () => ({
      source: fresh[Math.floor(Math.random() * fresh.length)], phase: Math.random() * 10, speed: .5 + Math.random()
    }));
  }

  function drawFires(c, now, progress) {
    c.save(); c.globalCompositeOperation = "lighter";
    for (const p of particles) {
      const visible = Math.max(0, Math.min(1, (progress - p.delay) * 5));
      if (!visible) continue;
      const flicker = .62 + Math.sin(now * p.speed + p.phase) * .19 + Math.sin(now * p.speed * 2.7 + p.phase) * .11;
      const x = p.x + Math.sin(now * .0015 + p.phase) * p.drift;
      const y = p.y + Math.cos(now * .0019 + p.phase) * p.drift - Math.max(0, Math.sin(now * .002 + p.phase)) * 2;
      const power = visible * Math.max(.25, flicker);
      c.fillStyle = `rgba(255,76,12,${.09 * power})`;
      c.beginPath(); c.arc(x, y, p.size * 4.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,136,28,${.55 * power})`;
      c.beginPath(); c.arc(x, y, p.size * 1.85, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,231,133,${(.62 + p.heat * .3) * power})`;
      c.beginPath(); c.arc(x, y - p.size * .25, p.size * .63, 0, Math.PI * 2); c.fill();
    }
    if (progress > .72) {
      for (const e of embers) {
        const rise = (now * .018 * e.speed + e.phase * 23) % 65;
        const a = (1 - rise / 65) * .28;
        c.fillStyle = `rgba(255,145,50,${a})`;
        c.beginPath(); c.arc(e.source.x + Math.sin(rise * .13 + e.phase) * 5, e.source.y - rise, 1.1, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }

  function render(now = performance.now()) {
    if (canvas.width === 0) resize();
    let progress = isLit ? 1 : 0;
    if (isIgniting) {
      progress = Math.min(1, (now - ignitionStart) / ignitionDuration);
      if (progress >= 1) finishIgnition();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScene(ctx, canvas.width, canvas.height, now, progress);
    lastTime = now;
    requestAnimationFrame(render);
  }

  function finishIgnition() {
    isIgniting = false; isLit = true;
    frame.classList.remove("igniting");
    form.hidden = true; resultPanel.hidden = false;
    resultText.textContent = `「${currentText}」を送りました。`;
  }

  function ignite(text) {
    currentText = text;
    createParticles(text);
    isLit = false; isIgniting = true;
    ignitionStart = performance.now();
    igniteButton.disabled = true;
    igniteLabel.textContent = "点火中…";
    frame.classList.add("igniting");
    error.textContent = "";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.replace(/[\r\n]/g, "").trim();
    input.value = text;
    count.textContent = [...text].length;
    if (!text) {
      error.textContent = "送りたいものを入力してください。";
      input.focus(); return;
    }
    ignite(text);
  });

  input.addEventListener("input", () => {
    const clean = input.value.replace(/[\r\n]/g, "");
    const chars = [...clean].slice(0, 12);
    input.value = chars.join("");
    count.textContent = chars.length;
    if (chars.length) error.textContent = "";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.shiftKey) event.preventDefault();
  });

  retryButton.addEventListener("click", () => {
    isLit = false; particles = []; embers = [];
    resultPanel.hidden = true; form.hidden = false;
    igniteButton.disabled = false; igniteLabel.textContent = "点火する";
    input.select(); input.focus();
  });

  saveButton.addEventListener("click", () => {
    const output = document.createElement("canvas");
    output.width = 1080; output.height = 1080;
    const out = output.getContext("2d");
    out.fillStyle = "#07101d"; out.fillRect(0, 0, 1080, 1080);
    const art = document.createElement("canvas");
    art.width = 1080; art.height = 778;
    drawScene(art.getContext("2d"), art.width, art.height, lastTime || performance.now(), 1, true);
    out.drawImage(art, 0, 151);
    const topFade = out.createLinearGradient(0, 0, 0, 220);
    topFade.addColorStop(0, "#07101d"); topFade.addColorStop(1, "rgba(7,16,29,0)");
    out.fillStyle = topFade; out.fillRect(0, 0, 1080, 220);
    out.fillStyle = "rgba(246,241,231,.76)";
    out.font = '500 29px "Yu Mincho", serif'; out.textAlign = "center";
    out.fillText("送り火メーカー", 540, 92);
    const bottomFade = out.createLinearGradient(0, 850, 0, 1080);
    bottomFade.addColorStop(0, "rgba(5,8,10,0)"); bottomFade.addColorStop(1, "#05080a");
    out.fillStyle = bottomFade; out.fillRect(0, 850, 1080, 230);
    const link = document.createElement("a");
    link.download = `送り火-${currentText}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  });

  new ResizeObserver(resize).observe(canvas);
  addEventListener("orientationchange", resize);
  requestAnimationFrame(render);
})();
