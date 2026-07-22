(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('spaceCanvas');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const intro = $('intro');
  const reticle = $('reticle');
  const countdown = $('countdown');
  const countValue = $('countValue');
  const report = $('report');
  const flash = $('flash');
  const launch = $('launchButton');
  const sizeInput = $('sizeInput');
  const speedInput = $('speedInput');
  const angleInput = $('angleInput');
  const inputs = [sizeInput, speedInput, angleInput];
  let dpr = 1, w = 0, h = 0, phase = 'intro', progress = 0, stars = [];
  let scarOpacity = 0, sound = true, audio, impactFx = null, impactStart = 0, impactTime = 0;
  const jupiterMap = new Image();
  jupiterMap.src = '/apps/2026-07-22/jupiter-map.jpg';

  function parameters() {
    const diameter = Number(sizeInput.value) / 10;
    const speed = Number(speedInput.value);
    const angle = Number(angleInput.value);
    const density = 600;
    const mass = density * Math.PI / 6 * Math.pow(diameter * 1000, 3);
    const energy = .5 * mass * Math.pow(speed * 1000, 2);
    const flight = 9.4 - speed / 15;
    const plume = 3100 * Math.pow(diameter / 1.4, .72) * Math.pow(speed / 60, 1.15) * Math.pow(Math.sin(angle * Math.PI / 180) / Math.sin(43 * Math.PI / 180), .3);
    const scarKm = 8900 * Math.pow(diameter / 1.4, .78) * Math.pow(speed / 60, .62);
    const latitude = -8 + (43 - angle) * .42;
    return { diameter, speed, angle, mass, energy, flight, plume, scarKm, latitude };
  }

  function scientific(value) {
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exponent);
    const superscript = String(exponent).replace(/-/g, '⁻').replace(/0/g, '⁰').replace(/1/g, '¹').replace(/2/g, '²').replace(/3/g, '³').replace(/4/g, '⁴').replace(/5/g, '⁵').replace(/6/g, '⁶').replace(/7/g, '⁷').replace(/8/g, '⁸').replace(/9/g, '⁹');
    return `${mantissa.toFixed(2)} × 10${superscript}`;
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 170 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2, a: .2 + Math.random() * .65 }));
  }

  function jupiter() {
    const mobile = w < 700;
    return { x: mobile ? w * .77 : w * .78, y: mobile ? h * .37 : h * .5, r: mobile ? Math.min(w * .43, h * .28) : Math.min(w * .29, h * .55) };
  }

  function trajectory(t) {
    const p = parameters();
    const j = jupiter();
    const targetX = j.x - j.r * .18;
    const targetY = j.y + (p.latitude / 35) * j.r;
    const startX = w * .04;
    const startY = Math.max(30, Math.min(h - 30, targetY - Math.tan(p.angle * Math.PI / 180) * (targetX - startX) * .34));
    const bend = (p.angle - 43) * 1.6;
    const controlX = w * .46;
    const controlY = (startY + targetY) / 2 - bend;
    const u = 1 - t;
    return {
      x: u * u * startX + 2 * u * t * controlX + t * t * targetX,
      y: u * u * startY + 2 * u * t * controlY + t * t * targetY,
      targetX, targetY
    };
  }

  function drawTrajectoryGuide() {
    if (phase !== 'aim') return;
    ctx.save();
    ctx.setLineDash([5, 8]);
    ctx.strokeStyle = 'rgba(99,230,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const q = trajectory(i / 60);
      if (!i) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    const end = trajectory(1);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,122,61,.8)';
    ctx.beginPath(); ctx.arc(end.x, end.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(end.x - 15, end.y); ctx.lineTo(end.x + 15, end.y); ctx.moveTo(end.x, end.y - 15); ctx.lineTo(end.x, end.y + 15); ctx.stroke();
    ctx.restore();
  }

  function drawImpactScar(j) {
    if (scarOpacity <= 0 || !impactFx) return;
    const p = impactFx;
    const base = j.r * Math.max(.07, Math.min(.19, p.scarKm / 66000));
    const age = Math.max(0, (performance.now() - impactStart) / 1000 - 6.6);
    const windStretch = Math.min(1.7, 1 + age * .018);
    const rotation = -.18;
    const alpha = Math.min(1, scarOpacity);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(rotation); ctx.scale(windStretch, 1);

    // High-altitude soot haze: the broad, soft fan seen around the SL9 sites.
    const haze = ctx.createRadialGradient(-base * .35, 0, base * .08, -base * .2, 0, base * 1.85);
    haze.addColorStop(0, `rgba(18,10,9,${.72 * alpha})`);
    haze.addColorStop(.38, `rgba(38,22,18,${.55 * alpha})`);
    haze.addColorStop(.72, `rgba(75,47,36,${.28 * alpha})`);
    haze.addColorStop(1, 'rgba(75,47,36,0)');
    ctx.fillStyle = haze; ctx.beginPath(); ctx.ellipse(-base * .22, 0, base * 1.85, base * .78, 0, 0, Math.PI * 2); ctx.fill();

    // The asymmetric crescent of plume material falling back downrange.
    ctx.globalAlpha = .78 * alpha; ctx.strokeStyle = '#24130f'; ctx.lineWidth = base * .34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(-base * .28, 0, base * 1.12, base * .48, 0, Math.PI * .18, Math.PI * 1.45); ctx.stroke();
    ctx.globalAlpha = .32 * alpha; ctx.strokeStyle = '#a16d53'; ctx.lineWidth = Math.max(1, base * .08);
    ctx.beginPath(); ctx.ellipse(-base * .28, 0, base * 1.38, base * .61, 0, Math.PI * .15, Math.PI * 1.5); ctx.stroke();

    // Dark central core and warm inner ring.
    const core = ctx.createRadialGradient(base * .08, 0, 0, base * .08, 0, base * .58);
    core.addColorStop(0, `rgba(2,2,3,${.98 * alpha})`); core.addColorStop(.48, `rgba(12,8,8,${.96 * alpha})`); core.addColorStop(.72, `rgba(83,42,27,${.72 * alpha})`); core.addColorStop(1, 'rgba(100,55,36,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(base * .08, 0, base * .66, base * .42, 0, 0, Math.PI * 2); ctx.fill();

    // Irregular clumps make the deposit look atmospheric, not geometrical.
    for (let i = 0; i < 34; i++) {
      const seedA = ((i * 37) % 101) / 101;
      const seedB = ((i * 61 + 17) % 103) / 103;
      const theta = seedA * Math.PI * 2;
      const radius = base * (.18 + seedB * 1.18);
      const x = Math.cos(theta) * radius - base * seedB * .22;
      const y = Math.sin(theta) * radius * .38;
      const r = base * (.018 + ((i * 13) % 11) / 160);
      ctx.globalAlpha = alpha * (.18 + seedB * .38);
      ctx.fillStyle = i % 4 ? '#17100f' : '#7b4c39';
      ctx.beginPath(); ctx.ellipse(x, y, r * (1.2 + seedA), r, theta, 0, Math.PI * 2); ctx.fill();
    }

    // A faint outer pressure-wave ring.
    ctx.globalAlpha = .2 * alpha; ctx.strokeStyle = '#e1b99a'; ctx.lineWidth = 1;
    ctx.setLineDash([base * .08, base * .07]);
    ctx.beginPath(); ctx.ellipse(-base * .12, 0, base * 1.62, base * .69, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawJupiter() {
    const j = jupiter();
    ctx.save(); ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#b27a4f'; ctx.fillRect(j.x - j.r, j.y - j.r, j.r * 2, j.r * 2);
    if (jupiterMap.complete && jupiterMap.naturalWidth) {
      const strips = Math.max(100, Math.floor(j.r * .85));
      const rotation = (Date.now() / 180000) % 1;
      for (let i = 0; i < strips; i++) {
        const nx = (i + .5) / strips * 2 - 1;
        const lon = Math.asin(nx) / Math.PI + .5;
        const sourceX = ((lon + rotation) % 1) * jupiterMap.naturalWidth;
        const dx = j.x - j.r + i * (j.r * 2 / strips);
        const stripW = j.r * 2 / strips + 1;
        ctx.drawImage(jupiterMap, sourceX, 0, Math.max(1, jupiterMap.naturalWidth / strips), jupiterMap.naturalHeight, dx, j.y - j.r, stripW, j.r * 2);
      }
    }
    drawImpactScar(j);
    ctx.restore();
    const shade = ctx.createRadialGradient(j.x - j.r * .25, j.y - j.r * .25, j.r * .15, j.x, j.y, j.r * 1.1);
    shade.addColorStop(.35, 'transparent'); shade.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,.3)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawImpactSequence() {
    if (phase !== 'impact' || !impactFx) return;
    const p = impactFx, j = jupiter(), t = impactTime;
    const outwardX = (p.x - j.x) / j.r, outwardY = (p.y - j.y) / j.r;
    const mag = Math.hypot(outwardX, outwardY) || 1;
    const ux = outwardX / mag, uy = outwardY / mag;
    ctx.save();
    if (t < 1.25) {
      const k = t / 1.25, radius = (10 + p.diameter * 18) * (1 + k * 1.8);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      glow.addColorStop(0, '#ffffff'); glow.addColorStop(.18, '#fff7b0'); glow.addColorStop(.5, `rgba(255,112,34,${1-k*.4})`); glow.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    }
    if (t >= .7 && t < 5.6) {
      const k = Math.min(1, (t - .7) / 2.7), fall = Math.max(0, (t - 3.4) / 2.2);
      const height = j.r * (.15 + .38 * k) * (1 - fall * .34);
      const tipX = p.x + ux * height, tipY = p.y + uy * height;
      const plume = ctx.createLinearGradient(p.x, p.y, tipX, tipY);
      plume.addColorStop(0, 'rgba(255,94,28,.15)'); plume.addColorStop(.35, 'rgba(255,177,78,.7)'); plume.addColorStop(1, 'rgba(245,235,218,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = plume; ctx.lineCap = 'round'; ctx.lineWidth = 8 + p.diameter * 9;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + ux * height * .6 - uy * 12, p.y + uy * height * .6 + ux * 12, tipX, tipY); ctx.stroke();
      for (let i = 0; i < 28; i++) {
        const seed = ((i * 47) % 29) / 29, spread = (seed - .5) * (.25 + fall * .5);
        const a = Math.min(1, k * 1.8) * (1 - fall * .55);
        const dist = height * (.22 + ((i * 19) % 23) / 26);
        const px = p.x + ux * dist - uy * dist * spread, py = p.y + uy * dist + ux * dist * spread;
        ctx.globalAlpha = a * (.25 + seed * .55); ctx.fillStyle = i % 3 ? '#ff9b4a' : '#fff4cf';
        ctx.beginPath(); ctx.arc(px, py, 1 + seed * 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (t >= 3.2 && t < 7.2) {
      const k = Math.min(1, (t - 3.2) / 3.2);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = (1-k) * .8;
      ctx.strokeStyle = '#ff8b43'; ctx.lineWidth = 3 + p.diameter * 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, j.r * (.03 + k * .15), j.r * (.012 + k * .06), .15, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 20; i++) {
        const a = i / 19 * Math.PI * 1.45 + .4;
        const radius = j.r * k * (.05 + (i % 5) * .018);
        const px = p.x + Math.cos(a) * radius, py = p.y + Math.sin(a) * radius * .42;
        ctx.globalAlpha = (1-k) * .7; ctx.fillStyle = '#ffb66d'; ctx.fillRect(px, py, 2, 2);
      }
    }
    ctx.restore();
  }

  function drawComet() {
    if (phase !== 'flight') return;
    const p = parameters();
    const eased = 1 - Math.pow(1 - progress, 1.65);
    const q = trajectory(eased);
    const back = trajectory(Math.max(0, eased - .07));
    const tailScale = 65 + p.speed * 1.15;
    const vx = q.x - back.x, vy = q.y - back.y, len = Math.hypot(vx, vy) || 1;
    const tx = q.x - vx / len * tailScale, ty = q.y - vy / len * tailScale;
    const grad = ctx.createLinearGradient(q.x, q.y, tx, ty); grad.addColorStop(0, 'rgba(210,248,255,.98)'); grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad; ctx.lineWidth = 3 + p.diameter * 2.2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#8beaff'; ctx.shadowBlur = 14 + p.diameter * 8;
    ctx.beginPath(); ctx.arc(q.x, q.y, 2 + p.diameter * 3.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  function frame() {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, w, h);
    stars.forEach(s => { ctx.globalAlpha = s.a * (.75 + .25 * Math.sin(Date.now() / 700 + s.x)); ctx.fillStyle = '#dce8ff'; ctx.fillRect(s.x, s.y, s.r, s.r); });
    ctx.globalAlpha = 1; drawJupiter(); drawTrajectoryGuide(); drawComet(); drawImpactSequence(); requestAnimationFrame(frame);
  }

  function tone(freq, duration, type = 'sine', vol = .04) {
    if (!sound) return;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audio.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + duration);
  }

  function updatePrediction(playTone = false) {
    const p = parameters();
    $('sizeOutput').value = p.diameter.toFixed(1) + ' km';
    $('speedOutput').value = p.speed + ' km/s';
    $('angleOutput').value = p.angle + '°';
    $('velocityReadout').textContent = p.speed + ' km/s';
    $('flightPrediction').textContent = `T−${p.flight.toFixed(1)} s`;
    $('energyPrediction').textContent = scientific(p.energy) + ' J';
    $('latitudePrediction').textContent = `${p.latitude >= 0 ? '+' : '−'}${Math.abs(p.latitude).toFixed(1)}° LAT`;
    const end = trajectory(1);
    reticle.style.left = `${end.x - 50}px`; reticle.style.top = `${end.y - 50}px`; reticle.style.right = 'auto';
    if (playTone) tone(220 + p.speed * 3, .05);
  }

  $('observeButton').onclick = () => {
    phase = 'aim'; stage.classList.add('aiming'); intro.classList.add('hidden'); launch.disabled = false;
    launch.querySelector('span').textContent = '軌道ロック完了'; updatePrediction(); tone(520, .18);
  };
  inputs.forEach(el => el.addEventListener('input', () => updatePrediction(true)));

  launch.onclick = () => {
    if (phase !== 'aim') return;
    const p = parameters(); phase = 'flight'; launch.disabled = true; reticle.classList.add('hidden'); countdown.classList.remove('hidden');
    const start = performance.now(), duration = p.flight * 1000;
    const tick = now => {
      progress = Math.min((now - start) / duration, 1);
      countValue.textContent = Math.max(0, p.flight * (1 - progress)).toFixed(1);
      const remaining = Math.pow(1 - progress, 1.65) * 640000000;
      $('distanceReadout').textContent = progress < .98 ? Math.round(remaining).toLocaleString('ja-JP') + ' km' : 'CONTACT';
      if (progress < 1) requestAnimationFrame(tick); else impact(p);
    };
    requestAnimationFrame(tick); tone(140 + p.speed, p.flight, 'sawtooth', .02);
  };

  function impact(p) {
    phase = 'impact'; countdown.classList.add('hidden');
    const end = trajectory(1); impactFx = { ...p, x: end.x, y: end.y };
    impactStart = performance.now(); impactTime = 0; $('impactCaption').classList.remove('hidden');
    flash.style.animationDuration = `${Math.max(1.1, p.diameter * .9)}s`; flash.classList.add('fire');
    tone(42 + p.speed / 3, 2.2, 'sawtooth', Math.min(.16, .07 + p.diameter * .04));
    const sequence = now => {
      impactTime = (now - impactStart) / 1000;
      $('impactClock').textContent = `T＋${impactTime.toFixed(1)} s`;
      if (impactTime < 1.1) { $('impactStep').textContent = '01 / ATMOSPHERIC ENTRY'; $('impactDescription').textContent = '大気圏突入・火球形成'; }
      else if (impactTime < 3.8) { $('impactStep').textContent = '02 / PLUME ASCENT'; $('impactDescription').textContent = '高温の噴煙が上昇'; }
      else if (impactTime < 6.6) { $('impactStep').textContent = '03 / PLUME FALLBACK'; $('impactDescription').textContent = '噴出物が大気へ再突入'; }
      else { $('impactStep').textContent = '04 / IMPACT SCAR'; $('impactDescription').textContent = '暗い衝突痕が形成'; scarOpacity = Math.min(1, (impactTime - 6.6) * 2); }
      if (impactTime < 8.1) requestAnimationFrame(sequence);
    };
    requestAnimationFrame(sequence);
    setTimeout(() => {
      $('plumeResult').textContent = Math.round(p.plume / 50) * 50 + ' km';
      $('energyResult').textContent = scientific(p.energy) + ' J';
      $('scarResult').textContent = Math.round(p.scarKm / 100) * 100 + ' km';
      $('gradeResult').textContent = `${p.latitude >= 0 ? '+' : '−'}${Math.abs(p.latitude).toFixed(1)}°`;
      $('impactCaption').classList.add('hidden'); report.classList.remove('hidden'); phase = 'report';
    }, 8300);
  }

  $('retryButton').onclick = () => {
    phase = 'aim'; progress = 0; scarOpacity = 0; impactFx = null; impactTime = 0; report.classList.add('hidden'); $('impactCaption').classList.add('hidden'); flash.classList.remove('fire'); reticle.classList.remove('hidden'); launch.disabled = false;
    $('distanceReadout').textContent = '6.4 × 10⁸ km'; updatePrediction();
  };
  $('soundButton').onclick = e => { sound = !sound; e.currentTarget.querySelector('b').textContent = sound ? 'ON' : 'OFF'; if (sound) tone(600, .1); };
  $('saveButton').onclick = () => { const a = document.createElement('a'); a.download = 'jupiter-scar-observation.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  window.addEventListener('resize', () => { resize(); if (phase === 'aim') updatePrediction(); });
  resize(); updatePrediction(); frame();
})();
