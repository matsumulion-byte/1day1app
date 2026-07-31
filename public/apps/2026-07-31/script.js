(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const intro = document.querySelector(".intro");
  const result = document.querySelector(".result");
  const timeEl = document.querySelector("#time");
  const altEl = document.querySelector("#altitude");
  const varioEl = document.querySelector("#vario");
  const posEl = document.querySelector("#position");
  const steering = document.querySelector("#steering");
  const steeringValue = document.querySelector("#steering-value");
  const steeringDot = document.querySelector("#steering-dot");
  const raceHint = document.querySelector("#race-hint");
  const progressEls = [...document.querySelectorAll(".progress span")];
  const keys = { left: false, right: false };

  const COURSE_LENGTH = 2500;
  const GATES = [760, 1540, 2380];
  const RACE_TIME = 60;
  const COLORS = ["#ff5f32", "#ffd23f", "#7457d6", "#148b92"];
  const NAMES = ["YOU", "KAZE", "SORA", "HIKARI"];

  let w = 0, h = 0, dpr = 1, last = 0, state = "intro";
  let remaining = RACE_TIME, countdown = 3, finishOrder = [], soundOn = true;
  let audio, master, nextBeep = 0;
  let particles = [];

  const thermals = [
    { x: 490, lane: -105, width: 155, power: 3.8 },
    { x: 1120, lane: 95, width: 145, power: 4.4 },
    { x: 1840, lane: -80, width: 170, power: 4.0 }
  ];

  let pilots = [];

  function makePilot(i) {
    return {
      id: i,
      x: -20 - i * 4,
      altitude: 465 - i * 6,
      lane: (i - 1.5) * 34,
      targetLane: (i - 1.5) * 34,
      speed: 44 + i * .3,
      heading: 0,
      vario: -1.05,
      gate: 0,
      finished: false,
      landed: false,
      finishTime: null,
      aiTimer: Math.random(),
      color: COLORS[i]
    };
  }

  function reset() {
    pilots = [0, 1, 2, 3].map(makePilot);
    remaining = RACE_TIME;
    countdown = 3;
    finishOrder = [];
    particles = [];
    progressEls.forEach((el, i) => el.classList.toggle("active", i === 0));
    updateHud();
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function terrainY(worldX) {
    const broad = Math.sin(worldX * .0027) * 48;
    const ridge = Math.sin(worldX * .007 + 1.1) * 23;
    const startMountain = Math.max(0, 260 - worldX * .24);
    return 92 + broad + ridge + startMountain;
  }

  function thermalAt(x, lane) {
    let lift = 0;
    for (const t of thermals) {
      const dx = Math.abs(x - t.x);
      const lateral = Math.max(0, 1 - Math.abs(lane - t.lane) / 135);
      if (dx < t.width) lift += t.power * (1 - dx / t.width) * lateral;
    }
    return lift;
  }

  function startRace() {
    ensureAudio();
    reset();
    intro.hidden = true;
    result.hidden = true;
    state = "countdown";
    steering.classList.add("visible");
    raceHint.hidden = false;
    last = performance.now();
  }

  function ensureAudio() {
    if (audio) return;
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = soundOn ? .12 : 0;
    master.connect(audio.destination);
  }

  function beep(freq = 650, duration = .08, volume = .5) {
    if (!audio || !soundOn) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function updatePlayer(p, dt) {
    const turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.heading += turn * 2.5 * dt;
    p.heading *= Math.pow(.42, dt);
    p.lane += p.heading * 128 * dt;
    p.lane = Math.max(-220, Math.min(220, p.lane));
    const lift = thermalAt(p.x, p.lane);
    const turnSink = Math.abs(turn) * 1.3 + Math.abs(p.heading) * .3;
    p.vario = -1.05 - turnSink + lift;
    p.altitude += p.vario * 5.6 * dt;
    p.speed = 44 - Math.abs(p.heading) * 5 + Math.max(0, -p.vario) * .15;
    p.x += p.speed * dt;
  }

  function updateAI(p, dt) {
    p.aiTimer -= dt;
    if (p.aiTimer <= 0) {
      const nextThermal = thermals.find(t => t.x > p.x && t.x - p.x < 260);
      p.targetLane = nextThermal && p.altitude < 330
        ? nextThermal.lane + (p.id - 2) * 13
        : (p.id - 1.5) * 34;
      p.aiTimer = .7 + Math.random() * 1.2;
    }
    const steer = Math.max(-1, Math.min(1, (p.targetLane - p.lane) / 70));
    p.heading += steer * 1.15 * dt;
    p.heading *= Math.pow(.2, dt);
    p.lane += p.heading * 72 * dt;
    const lift = thermalAt(p.x, p.lane) * (.83 + p.id * .035);
    p.vario = -1.08 - Math.abs(steer) * .7 + lift;
    p.altitude += p.vario * 5.6 * dt;
    p.speed = 42.8 + p.id * .55 - Math.abs(p.heading) * 4;
    p.x += p.speed * dt;
  }

  function updatePilotStatus(p) {
    const ground = terrainY(p.x);
    if (p.altitude <= ground) {
      p.altitude = ground;
      p.landed = true;
      return;
    }
    if (p.gate < GATES.length && p.x >= GATES[p.gate]) {
      p.gate++;
      if (p.id === 0) {
        progressEls.forEach((el, i) => el.classList.toggle("active", i === p.gate));
        beep(820 + p.gate * 100, .12, .6);
      }
    }
    if (p.gate === GATES.length && !p.finished) {
      p.finished = true;
      p.finishTime = RACE_TIME - remaining;
      finishOrder.push(p.id);
      if (p.id === 0) endRace("finish");
    }
  }

  function update(dt) {
    if (state === "countdown") {
      const before = Math.ceil(countdown);
      countdown -= dt;
      if (Math.ceil(countdown) !== before) beep(countdown > 0 ? 520 : 900, .1, .7);
      if (countdown <= 0) state = "race";
      return;
    }
    if (state !== "race") return;

    remaining = Math.max(0, remaining - dt);
    pilots.forEach((p, i) => {
      if (p.finished || p.landed) return;
      if (i === 0) updatePlayer(p, dt);
      else updateAI(p, dt);
      updatePilotStatus(p);
    });

    const player = pilots[0];
    const steeringAmount = Math.max(-1, Math.min(1, player.heading / 1.25));
    steeringDot.style.left = `${50 + steeringAmount * 45}%`;
    steeringValue.textContent = steeringAmount < -.12 ? "左旋回" : steeringAmount > .12 ? "右旋回" : "直進";
    if (raceHint && (keys.left || keys.right || remaining < 55)) raceHint.hidden = true;
    if (soundOn && player.vario > .25 && performance.now() > nextBeep) {
      beep(620 + player.vario * 95, .045, .22);
      nextBeep = performance.now() + Math.max(75, 230 - player.vario * 30);
    }

    if (Math.random() < dt * 7) {
      particles.push({
        x: player.x + 380 + Math.random() * 500,
        lane: -160 + Math.random() * 320,
        life: 3
      });
    }
    particles.forEach(p => p.life -= dt);
    particles = particles.filter(p => p.life > 0);

    if (player.landed) endRace("landed");
    else if (remaining <= 0) endRace("time");
    updateHud();
  }

  function racePosition(p) {
    return 1 + pilots.filter(o =>
      o.id !== p.id && (
        (o.finished && !p.finished) ||
        (o.finished === p.finished && o.x > p.x)
      )
    ).length;
  }

  function updateHud() {
    const p = pilots[0] || makePilot(0);
    timeEl.textContent = remaining.toFixed(1);
    altEl.innerHTML = `${Math.max(0, Math.round(p.altitude - terrainY(p.x)))}<small>m</small>`;
    const sign = p.vario > 0 ? "+" : "";
    varioEl.innerHTML = `${sign}${p.vario.toFixed(1)}<small>m/s</small>`;
    varioEl.style.color = p.vario > .2 ? "#ff5f32" : "";
    posEl.textContent = `${racePosition(p)} / 4`;
  }

  function endRace(reason) {
    if (state === "result") return;
    state = "result";
    steering.classList.remove("visible");
    raceHint.hidden = true;
    const player = pilots[0];
    const sorted = [...pilots].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishTime - b.finishTime;
      return b.x - a.x;
    });
    const rank = sorted.findIndex(p => p.id === 0) + 1;
    document.querySelector("#rank").innerHTML =
      `${rank}<sup>${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}</sup>`;
    document.querySelector("#result-title").textContent =
      reason === "finish" ? (rank === 1 ? "トップゴール！" : "ゴール！") :
      reason === "landed" ? "ランディング" : "タイムアップ";
    document.querySelector("#result-detail").textContent =
      player.finished
        ? `${player.finishTime.toFixed(1)}秒でコースを完走しました。`
        : `ゴールまで残り ${Math.max(0, Math.round(COURSE_LENGTH - player.x))}m。到達距離で順位を判定しました。`;
    const ol = document.querySelector("#standings");
    ol.innerHTML = "";
    sorted.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = p.id === 0 ? "me" : "";
      li.innerHTML = `<span>${i + 1}</span><span>${NAMES[p.id]}</span><span>${
        p.finished ? `${p.finishTime.toFixed(1)}s` : `${Math.max(0, Math.round(p.x))}m`
      }</span>`;
      ol.appendChild(li);
    });
    result.hidden = false;
    beep(rank === 1 ? 1040 : 740, .35, .8);
  }

  function worldToScreen(x, cameraX) {
    return w * .25 + (x - cameraX) * Math.min(.78, w / 1100);
  }

  function altitudeToScreen(alt) {
    return h * .83 - alt * Math.min(.82, h / 750);
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#70cbdc");
    g.addColorStop(.58, "#c8e9dc");
    g.addColorStop(1, "#f7dc9a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = .23;
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 7; i++) {
      const cx = (i * 293 + performance.now() * .006) % (w + 260) - 130;
      const cy = 100 + (i % 3) * 90;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 95, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTerrain(cameraX) {
    const scale = Math.min(.78, w / 1100);
    const startX = cameraX - w / scale;
    const endX = cameraX + w / scale * 1.4;
    const layers = [
      { offset: 100, color: "#8fb599", alpha: .5, factor: .55 },
      { offset: 45, color: "#4f8c74", alpha: .72, factor: .78 },
      { offset: 0, color: "#235f51", alpha: 1, factor: 1 }
    ];
    layers.forEach(layer => {
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 20; sx += 14) {
        const wx = startX + sx / scale;
        const alt = terrainY(wx * layer.factor) + layer.offset;
        ctx.lineTo(sx, altitudeToScreen(alt));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1;
    for (let x = 180; x < w; x += 220) {
      const base = altitudeToScreen(terrainY(startX + x / scale));
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - 14);
      ctx.stroke();
    }
  }

  function drawGate(gateX, index, cameraX) {
    const x = worldToScreen(gateX, cameraX);
    if (x < -80 || x > w + 80) return;
    const ground = altitudeToScreen(terrainY(gateX));
    const passed = pilots[0].gate > index;
    ctx.strokeStyle = passed ? "rgba(255,255,255,.42)" : "#ff5f32";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(x, ground);
    ctx.lineTo(x, Math.max(130, ground - 280));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = passed ? "rgba(255,255,255,.7)" : "#ff5f32";
    ctx.font = "700 11px 'Barlow Condensed'";
    ctx.textAlign = "center";
    ctx.fillText(index === 2 ? "GOAL" : `GATE ${index + 1}`, x, Math.max(120, ground - 290));
    ctx.beginPath();
    ctx.arc(x, Math.max(140, ground - 230), 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBirds(cameraX) {
    thermals.forEach((t, ti) => {
      const x = worldToScreen(t.x, cameraX);
      if (x < -100 || x > w + 100) return;
      const y = altitudeToScreen(220 + Math.sin(performance.now() * .0015 + ti) * 15) + t.lane * .38;
      ctx.strokeStyle = "rgba(21,59,67,.7)";
      ctx.lineWidth = 1.3;
      for (let j = 0; j < 3; j++) {
        const a = performance.now() * .0007 + j * 2.1 + ti;
        const bx = x + Math.cos(a) * (28 + j * 7);
        const by = y + Math.sin(a) * 13 + j * 8;
        ctx.beginPath();
        ctx.arc(bx - 3, by, 4, Math.PI * 1.05, Math.PI * 1.85);
        ctx.arc(bx + 3, by, 4, Math.PI * 1.15, Math.PI * 1.95);
        ctx.stroke();
      }
    });
  }

  function drawPilot(p, cameraX) {
    const x = worldToScreen(p.x, cameraX);
    const y = altitudeToScreen(p.altitude) + p.lane * .38;
    ctx.save();
    ctx.translate(x, y);
    const tilt = p.heading * .52;
    ctx.rotate(tilt);

    ctx.strokeStyle = "rgba(20,52,57,.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-22, -4); ctx.lineTo(-5, 18);
    ctx.moveTo(22, -4); ctx.lineTo(5, 18);
    ctx.stroke();

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-31, -2);
    ctx.quadraticCurveTo(0, -28, 31, -2);
    ctx.quadraticCurveTo(0, -12, -31, -2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.beginPath();
    ctx.moveTo(-15, -11); ctx.quadraticCurveTo(0, -16, 15, -11);
    ctx.stroke();

    ctx.fillStyle = "#173b41";
    ctx.beginPath();
    ctx.arc(0, 17, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, 20, 4, 9);
    ctx.restore();

    ctx.fillStyle = p.id === 0 ? "#ff5f32" : "rgba(21,59,67,.7)";
    ctx.font = "700 9px 'Barlow Condensed'";
    ctx.textAlign = "center";
    ctx.fillText(NAMES[p.id], x, y - 35);

    if (p.id === 0 && Math.abs(p.heading) > .08) {
      ctx.strokeStyle = "rgba(255,255,255,.62)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 36, y + 5);
      ctx.quadraticCurveTo(x - 76, y - p.heading * 26, x - 112, y - p.heading * 48);
      ctx.stroke();
    }
  }

  function drawWind() {
    ctx.strokeStyle = "rgba(255,255,255,.36)";
    ctx.lineWidth = 1;
    particles.forEach(p => {
      const x = (p.x * .4 - pilots[0].x * .4) % w + w * .5;
      const y = h * .2 + ((p.lane + 200) / 400) * h * .45;
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 24, y - 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawCountdown() {
    if (state !== "countdown") return;
    ctx.fillStyle = "rgba(255,253,244,.2)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fffdf4";
    ctx.font = `800 ${Math.min(w, h) * .2}px 'Barlow Condensed'`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdown > 0 ? Math.ceil(countdown) : "GO", w / 2, h / 2);
    ctx.textBaseline = "alphabetic";
  }

  function draw() {
    drawSky();
    const cameraX = Math.max(0, pilots[0]?.x || 0);
    drawTerrain(cameraX);
    drawWind();
    GATES.forEach((x, i) => drawGate(x, i, cameraX));
    drawBirds(cameraX);
    [...pilots].sort((a, b) => b.lane - a.lane).forEach(p => drawPilot(p, cameraX));
    drawCountdown();
  }

  function frame(now) {
    const dt = Math.min(.033, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function bindHold(el, key) {
    const down = e => { e.preventDefault(); keys[key] = true; };
    const up = e => { e.preventDefault(); keys[key] = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  addEventListener("keydown", e => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = true;
    if (e.key === " " && state === "intro") startRace();
  });
  addEventListener("keyup", e => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = false;
  });
  addEventListener("resize", resize);
  bindHold(document.querySelector("#left"), "left");
  bindHold(document.querySelector("#right"), "right");
  document.querySelector("#start").addEventListener("click", startRace);
  document.querySelector("#retry").addEventListener("click", startRace);
  document.querySelector("#sound").addEventListener("click", e => {
    soundOn = !soundOn;
    e.currentTarget.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    if (master) master.gain.value = soundOn ? .12 : 0;
  });

  resize();
  reset();
  requestAnimationFrame(frame);
})();
