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
  let scarOpacity = 0, sound = true, audio, impactFx = null;

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

  function drawJupiter() {
    const j = jupiter();
    ctx.save(); ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(j.x - j.r, j.y, j.x + j.r, j.y);
    g.addColorStop(0, '#21170f'); g.addColorStop(.18, '#a56d3d'); g.addColorStop(.5, '#e1b272'); g.addColorStop(.78, '#8e542f'); g.addColorStop(1, '#130d0a');
    ctx.fillStyle = g; ctx.fillRect(j.x - j.r, j.y - j.r, j.r * 2, j.r * 2);
    ['#39261d','#f0d19e','#a56541','#f7dfb0','#6e3b29','#d9985c','#4b2a22','#e6b875'].forEach((c, i) => {
      const yy = j.y - j.r + (i + .55) * (j.r * 2 / 8);
      ctx.fillStyle = c; ctx.globalAlpha = .18 + (i % 3) * .08;
      ctx.beginPath(); ctx.ellipse(j.x, yy, j.r * 1.04, j.r * .085, Math.sin(i) * .02, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = .9; ctx.fillStyle = '#a43e26'; ctx.beginPath(); ctx.ellipse(j.x + j.r * .36, j.y + j.r * .23, j.r * .19, j.r * .075, -.08, 0, Math.PI * 2); ctx.fill();
    if (scarOpacity > 0 && impactFx) {
      const scale = Math.max(.055, Math.min(.18, impactFx.scarKm / 70000));
      ctx.globalAlpha = scarOpacity * .95; ctx.fillStyle = '#1b0f0c'; ctx.shadowColor = '#ff8c51'; ctx.shadowBlur = 18 * (1 - scarOpacity);
      ctx.beginPath(); ctx.ellipse(impactFx.x, impactFx.y, j.r * scale, j.r * scale * .48, .16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = scarOpacity * .45; ctx.strokeStyle = '#e06b3e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(impactFx.x, impactFx.y, j.r * scale * 1.35, j.r * scale * .67, .16, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    const shade = ctx.createRadialGradient(j.x - j.r * .25, j.y - j.r * .25, j.r * .15, j.x, j.y, j.r * 1.1);
    shade.addColorStop(.35, 'transparent'); shade.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,.3)'; ctx.lineWidth = 1; ctx.stroke();
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
    ctx.globalAlpha = 1; drawJupiter(); drawTrajectoryGuide(); drawComet(); requestAnimationFrame(frame);
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
    flash.style.animationDuration = `${Math.max(1.1, p.diameter * .9)}s`; flash.classList.add('fire');
    tone(42 + p.speed / 3, 2.2, 'sawtooth', Math.min(.16, .07 + p.diameter * .04));
    setTimeout(() => { scarOpacity = 1; }, 350);
    setTimeout(() => {
      $('plumeResult').textContent = Math.round(p.plume / 50) * 50 + ' km';
      $('energyResult').textContent = scientific(p.energy) + ' J';
      $('scarResult').textContent = Math.round(p.scarKm / 100) * 100 + ' km';
      $('gradeResult').textContent = `${p.latitude >= 0 ? '+' : '−'}${Math.abs(p.latitude).toFixed(1)}°`;
      report.classList.remove('hidden'); phase = 'report';
    }, 1250);
  }

  $('retryButton').onclick = () => {
    phase = 'aim'; progress = 0; scarOpacity = 0; impactFx = null; report.classList.add('hidden'); flash.classList.remove('fire'); reticle.classList.remove('hidden'); launch.disabled = false;
    $('distanceReadout').textContent = '6.4 × 10⁸ km'; updatePrediction();
  };
  $('soundButton').onclick = e => { sound = !sound; e.currentTarget.querySelector('b').textContent = sound ? 'ON' : 'OFF'; if (sound) tone(600, .1); };
  $('saveButton').onclick = () => { const a = document.createElement('a'); a.download = 'jupiter-scar-observation.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  window.addEventListener('resize', () => { resize(); if (phase === 'aim') updatePrediction(); });
  resize(); updatePrediction(); frame();
})();
