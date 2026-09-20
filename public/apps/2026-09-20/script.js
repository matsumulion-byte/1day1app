'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('preview'), ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const source = document.createElement('canvas');
  const face = document.createElement('canvas');
  const background = document.createElement('canvas');
  background.width = W; background.height = H;
  const defaults = { size: 72, opacity: 42, position: 44, blur: 30, divinity: 45 };
  const names = { day: '青空', sunset: '夕焼け', night: '夜空' };
  let sky = 'day', seed = Math.random() * 4294967296 >>> 0;
  let detection = null, generated = false, busy = false, modelPromise = null, frame = 0;
  const parameters = () => Object.fromEntries(Object.keys(defaults).map(key => [key, Number($(key).value)]));
  function status(message = '', error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error', error);
  }
  function setBusy(value, message = '') {
    busy = value;
    $('loading').hidden = !value;
    $('loading-text').textContent = message;
    canvas.setAttribute('aria-busy', String(value));
    document.querySelectorAll('.controls button, .controls input').forEach(el => { el.disabled = value; });
    $('sky-options').disabled = value;
    $('create').disabled = value || !detection;
  }
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  function randomGenerator(s) {
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  // Elliptical radial gradients keep clouds soft even in browsers without Canvas filters.
  function mist(c, x, y, rx, ry, color, alpha) {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const gradient = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(.4, `rgba(${color},${alpha * .7})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = gradient; c.fillRect(-1, -1, 2, 2); c.restore();
  }
  function cloud(c, x, y, width, alpha, rnd, color = '255,255,255') {
    for (let j = 0; j < 13; j++) {
      const r = width * (.12 + rnd() * .14);
      mist(c, x + (rnd() - .5) * width, y + (rnd() - .5) * width * .16, r * 1.7, r * .6, color, alpha);
    }
  }
  function drawBackground() {
    const c = background.getContext('2d'), rnd = randomGenerator(seed);
    const gradient = c.createLinearGradient(0, 0, 0, H);
    const palette = sky === 'day' ? ['#408fc8', '#9bcdeb', '#dbeef5'] : sky === 'sunset' ? ['#4b4b7b', '#be8094', '#ffd4a0'] : ['#070e21', '#172746', '#3a4866'];
    gradient.addColorStop(0, palette[0]); gradient.addColorStop(.58, palette[1]); gradient.addColorStop(1, palette[2]);
    c.fillStyle = gradient; c.fillRect(0, 0, W, H);
    if (sky === 'night') {
      for (let i = 0; i < 160; i++) {
        const x = rnd() * W, y = rnd() * H * .88, r = .6 + rnd() * 1.8;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = `rgba(232,241,255,${.2 + rnd() * .65})`; c.fill();
        if (i % 19 === 0) mist(c, x, y, 10, 10, '203,222,255', .25);
      }
      mist(c, W * .8, H * .16, 110, 110, '216,229,255', .1);
    } else {
      mist(c, W * .78, H * (sky === 'sunset' ? .7 : .15), 380, 360, sky === 'sunset' ? '255,213,155' : '255,255,255', .34);
    }
    const cloudColor = sky === 'sunset' ? '255,208,184' : sky === 'night' ? '135,160,200' : '255,255,255';
    for (let i = 0; i < 10; i++) {
      cloud(c, rnd() * W, H * (.13 + rnd() * .85), W * (.3 + rnd() * .45), sky === 'night' ? .065 : .25, rnd, cloudColor);
    }
    // A low bank of cloud gives the oversized face a sense of distance.
    for (let i = 0; i < 5; i++) cloud(c, rnd() * W, H * (.86 + rnd() * .16), W * .8, sky === 'night' ? .09 : .32, rnd, cloudColor);
  }
  function prepareFace() {
    if (!detection) return;
    const b = detection.box, p = parameters();
    // Pad around the detected box, retaining its centre when the photo edge clips it.
    const sw = b.width * 1.5, sh = b.height * 1.65;
    const sx = b.x + b.width / 2 - sw / 2, sy = b.y + b.height * .45 - sh / 2;
    face.width = 640; face.height = Math.round(640 * sh / sw);
    const c = face.getContext('2d');
    c.drawImage(source, sx, sy, sw, sh, 0, 0, face.width, face.height);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = sky === 'day' ? 'rgba(133,195,232,.18)' : sky === 'sunset' ? 'rgba(227,157,164,.22)' : 'rgba(125,162,222,.30)';
    c.fillRect(0, 0, face.width, face.height);
    c.globalCompositeOperation = 'destination-in';
    c.save(); c.translate(face.width / 2, face.height / 2); c.scale(face.width / 2, face.height / 2);
    const mask = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    mask.addColorStop(0, '#fff'); mask.addColorStop(.64 - p.blur / 250, '#fff');
    mask.addColorStop(.82, 'rgba(255,255,255,.42)'); mask.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = mask; c.fillRect(-1, -1, 2, 2); c.restore();
    c.globalCompositeOperation = 'source-over';
  }
  function render() {
    frame = 0;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(background, 0, 0);
    if (!generated || !detection) return;
    const p = parameters(), fw = W * p.size / 100, fh = fw * face.height / face.width;
    const x = (W - fw) / 2, y = H * p.position / 100 - fh / 2;
    const light = p.divinity / 100, alpha = (1 - p.opacity / 100) * (sky === 'day' ? .86 : 1);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    mist(ctx, W / 2, y + fh * .4, fw * .72, fh * .7, '224,238,255', light * .28);
    if (light > 0) {
      ctx.save(); ctx.translate(W / 2, y + fh * .37); ctx.scale(fw * .53, fh * .49);
      const halo = ctx.createRadialGradient(0, 0, .6, 0, 0, 1.2);
      halo.addColorStop(0, 'transparent'); halo.addColorStop(.4, `rgba(245,241,218,${light * .2})`); halo.addColorStop(.54, `rgba(255,248,218,${light * .35})`); halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo; ctx.fillRect(-1.2, -1.2, 2.4, 2.4); ctx.restore();
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = alpha;
    // Feathering above always applies; supported browsers also soften interior details.
    ctx.filter = `blur(${p.blur * .045}px) saturate(.72) contrast(.92) brightness(${sky === 'night' ? 1.22 : 1.08})`;
    ctx.drawImage(face, x, y, fw, fh);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = alpha * .3;
    ctx.drawImage(face, x, y, fw, fh); ctx.restore();
    const rnd = randomGenerator(seed ^ 2147483647);
    cloud(ctx, W * .48, y + fh * .85, fw * 1.2, light * (sky === 'night' ? .08 : .22), rnd, sky === 'sunset' ? '255,207,185' : '226,241,255');
  }
  function scheduleRender() { if (!frame) frame = requestAnimationFrame(render); }
  function updateRanges() {
    Object.keys(defaults).forEach(key => {
      const input = $(key); $(key + '-value').value = `${input.value}%`;
      input.style.setProperty('--progress', `${(input.value - input.min) / (input.max - input.min) * 100}%`);
    });
  }
  function loadLibrary() {
    if (window.faceapi) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); reject(new Error('network')); }, 30000);
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); window.faceapi ? resolve() : reject(new Error('network')); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('network')); };
      document.head.appendChild(script);
    });
  }
  async function loadModel() {
    if (!modelPromise) {
      modelPromise = (async () => {
        await loadLibrary();
        const base = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const manifestResponse = await fetch(base + 'tiny_face_detector_model-weights_manifest.json', { signal: controller.signal });
          if (!manifestResponse.ok) throw new Error('network');
          const manifest = await manifestResponse.json();
          const parts = await Promise.all(manifest.flatMap(group => group.paths).map(async path => {
            const response = await fetch(base + path, { signal: controller.signal });
            if (!response.ok) throw new Error('network');
            return new Uint8Array(await response.arrayBuffer());
          }));
          const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
          let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
          const weights = faceapi.tf.io.decodeWeights(bytes.buffer, manifest.flatMap(group => group.weights));
          faceapi.nets.tinyFaceDetector.loadFromWeightMap(weights);
        } finally { clearTimeout(timer); }
      })().catch(error => { modelPromise = null; throw error; });
    }
    return modelPromise;
  }
  async function readPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('image');
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      source.width = Math.max(1, Math.round(image.naturalWidth * scale));
      source.height = Math.max(1, Math.round(image.naturalHeight * scale));
      source.getContext('2d').drawImage(image, 0, 0, source.width, source.height);
      $('thumbnail').src = source.toDataURL('image/jpeg', .65);
    } finally { URL.revokeObjectURL(url); }
  }
  async function upload(file) {
    if (!file || busy) return;
    if (file.size > 20 * 1024 * 1024) { status('20MB以下の写真を選んでください。', true); return; }
    if (file.type && !file.type.startsWith('image/')) { status('画像ファイルを選んでください。', true); return; }
    detection = null; generated = false;
    $('adjustments').hidden = true; $('create').hidden = false;
    $('empty-caption').hidden = false; $('photo-info').hidden = true;
    canvas.setAttribute('aria-label', '選択した空の背景プレビュー');
    $('preview-note').textContent = '空はいつでも、あなた待ち。';
    status(); render(); setBusy(true, '写真を読み込んでいます…');
    let stage = 'image';
    try {
      await readPhoto(file);
      $('filename').textContent = file.name; $('photo-info').hidden = false;
      $('face-info').textContent = '顔を確認しています';
      stage = 'model'; $('loading-text').textContent = '顔検出を準備しています…';
      await loadModel();
      stage = 'detect'; $('loading-text').textContent = '写真の中の顔を探しています…';
      await nextPaint();
      let faces = await faceapi.detectAllFaces(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: .4 }));
      if (!faces.length) faces = await faceapi.detectAllFaces(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 800, scoreThreshold: .3 }));
      if (!faces.length) {
        $('face-info').textContent = '顔を検出できませんでした';
        status('顔が見つかりませんでした。別の写真をお試しください', true); return;
      }
      faces.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
      detection = faces[0];
      $('face-info').textContent = faces.length > 1 ? `${faces.length}人の顔を検出・一番大きい顔を使います` : '顔が見つかりました';
      $('upload-label').textContent = '写真を選びなおす';
      status('準備できました。好きな空をえらんで、作成。');
    } catch (error) {
      console.error('写真の準備に失敗しました', error);
      $('face-info').textContent = 'もう一度お試しください';
      status(stage === 'image' ? '写真を読み込めませんでした。JPEG・PNGなどの写真をお試しください。' : stage === 'model' ? '顔検出を読み込めませんでした。通信環境を確認して、写真を選びなおしてください。' : '顔検出に失敗しました。別の写真、または新しいブラウザでお試しください。', true);
    } finally { setBusy(false); }
  }
  $('upload').addEventListener('click', () => $('photo').click());
  $('replace').addEventListener('click', () => $('photo').click());
  $('photo').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; upload(file); });
  $('create').addEventListener('click', async () => {
    if (!detection || busy) return;
    setBusy(true, '空に、浮かべています…');
    try {
      await nextPaint(); generated = true; prepareFace(); render();
      $('empty-caption').hidden = true; $('create').hidden = true; $('adjustments').hidden = false;
      $('preview-note').textContent = 'いた。いつもの空に、あなたがいた。';
      canvas.setAttribute('aria-label', `${names[sky]}に顔が浮かぶ完成画像`);
      status('できました。スライダーで、お好みの存在感に。');
    } catch (error) { generated = false; status('画像の作成に失敗しました。もう一度お試しください。', true); }
    finally { setBusy(false); }
    canvas.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
  document.querySelectorAll('[name="sky"]').forEach(input => input.addEventListener('change', () => {
    sky = input.value; $('sky-caption').textContent = names[sky];
    canvas.setAttribute('aria-label', generated ? `${names[sky]}に顔が浮かぶ完成画像` : `${names[sky]}の背景プレビュー`);
    drawBackground(); prepareFace(); scheduleRender();
  }));
  Object.keys(defaults).forEach(key => $(key).addEventListener('input', () => { updateRanges(); if (key === 'blur') prepareFace(); scheduleRender(); }));
  $('reset').addEventListener('click', () => { Object.entries(defaults).forEach(([key, value]) => { $(key).value = value; }); updateRanges(); prepareFace(); scheduleRender(); status('調整を初期値に戻しました。'); });
  $('regenerate').addEventListener('click', () => { seed = Math.random() * 4294967296 >>> 0; drawBackground(); render(); status('雲と星の配置を変えました。'); });
  $('save').addEventListener('click', () => {
    if (!generated || busy) return;
    try {
      if (frame) cancelAnimationFrame(frame); render();
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a'); link.href = url; link.download = `sora-ni-iru-${sky}-${Date.now()}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      $('save-image').src = url; $('save-dialog').showModal();
      status('PNGを書き出しました。保存できない場合は、表示された画像を長押ししてください。');
    } catch (error) { status('保存に失敗しました。もう一度お試しください。', true); }
  });
  $('close-dialog').addEventListener('click', () => $('save-dialog').close());
  document.addEventListener('dblclick', event => { if (event.target !== $('save-image')) event.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
  document.querySelectorAll('button').forEach(button => button.addEventListener('contextmenu', event => event.preventDefault()));
  updateRanges(); drawBackground(); render();
})();
