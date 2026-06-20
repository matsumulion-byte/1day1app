(() => {
  "use strict";

  const canvas = document.querySelector("#gameCanvas");
  const portraitMode = window.matchMedia("(max-width: 440px)").matches;
  if (portraitMode) {
    canvas.width = 600;
    canvas.height = 760;
  }
  const ctx = canvas.getContext("2d");
  const ui = {
    sleep: document.querySelector("#sleepValue"),
    peace: document.querySelector("#peaceValue"),
    clock: document.querySelector("#clockValue"),
    wave: document.querySelector("#waveValue"),
    waveButton: document.querySelector("#waveButton"),
    resultOverlay: document.querySelector("#resultOverlay"),
    resultKicker: document.querySelector("#resultKicker"),
    resultTitle: document.querySelector("#resultTitle"),
    resultText: document.querySelector("#resultText"),
    resultKills: document.querySelector("#resultKills"),
    resultSleep: document.querySelector("#resultSleep"),
    message: document.querySelector("#gameMessage"),
    sound: document.querySelector("#soundButton"),
    guideChoose: document.querySelector("#guideChoose"),
    guidePlace: document.querySelector("#guidePlace"),
    guideWave: document.querySelector("#guideWave"),
    cards: [...document.querySelectorAll(".tower-card")]
  };

  const W = canvas.width;
  const H = canvas.height;
  const path = portraitMode ? [
    { x: 300, y: -20 }, { x: 300, y: 115 }, { x: 155, y: 185 },
    { x: 155, y: 330 }, { x: 365, y: 405 }, { x: 365, y: 545 },
    { x: 300, y: 625 }, { x: 300, y: 690 }
  ] : [
    { x: -20, y: 146 }, { x: 145, y: 146 }, { x: 240, y: 230 },
    { x: 420, y: 230 }, { x: 510, y: 330 }, { x: 680, y: 330 },
    { x: 770, y: 425 }, { x: 875, y: 425 }
  ];

  const towerTypes = {
    coil: { cost: 40, range: 110, rate: .24, damage: 3.3, color: "#f3a55b", name: "蚊取り線香" },
    fan: { cost: 60, range: 135, rate: .72, damage: 4, color: "#74c9d2", name: "扇風機" },
    lamp: { cost: 85, range: 155, rate: .9, damage: 22, color: "#c59af0", name: "電撃灯" },
    screen: { cost: 50, range: 120, rate: .8, damage: 1.5, color: "#9dc9a9", name: "網戸補強" }
  };

  const state = {
    playing: false,
    ended: false,
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    sleep: 100,
    peace: 120,
    kills: 0,
    selected: null,
    hover: null,
    pendingPlacement: null,
    towers: [],
    enemies: [],
    particles: [],
    shots: [],
    elapsed: 0,
    betweenTimer: 0,
    shake: 0,
    muted: false,
    audio: null,
    lastTime: performance.now()
  };

  function reset() {
    Object.assign(state, {
      playing: true, ended: false, wave: 0, waveActive: false,
      spawnQueue: [], spawnTimer: 0, sleep: 100, peace: 120,
      kills: 0, selected: null, hover: null, pendingPlacement: null, towers: [], enemies: [],
      particles: [], shots: [], elapsed: 0, betweenTimer: 0, shake: 0
    });
    ui.resultOverlay.classList.add("hidden");
    ui.waveButton.disabled = true;
    ui.waveButton.textContent = "まず1台置こう";
    setMessage("① アイテムを選んでください");
    updateUI();
  }

  function startWave() {
    if (!state.playing || state.waveActive || state.wave >= 5) return;
    state.wave += 1;
    state.waveActive = true;
    const configs = [
      { count: 8, hp: 25, speed: 56, gap: .84 },
      { count: 11, hp: 35, speed: 64, gap: .68 },
      { count: 14, hp: 48, speed: 72, gap: .58 },
      { count: 16, hp: 64, speed: 80, gap: .48 },
      { count: 14, hp: 76, speed: 85, gap: .5, boss: true }
    ];
    const conf = configs[state.wave - 1];
    state.spawnQueue = Array.from({ length: conf.count }, (_, i) => ({
      hp: conf.hp * (i % 5 === 4 ? 1.7 : 1),
      speed: conf.speed * (i % 4 === 2 ? 1.28 : 1),
      gap: conf.gap,
      type: i % 5 === 4 ? "striped" : "normal"
    }));
    if (conf.boss) state.spawnQueue.push({ hp: 450, speed: 52, gap: 1.15, type: "boss" });
    state.spawnTimer = .2;
    ui.waveButton.disabled = true;
    ui.waveButton.textContent = "襲来中";
    setMessage(state.wave === 5 ? "巨大な羽音が近づいてくる…" : `第${state.wave}波、襲来`);
    tone(140, .08, "sawtooth", .05);
    updateUI();
  }

  function spawnEnemy(data) {
    state.enemies.push({
      x: path[0].x, y: path[0].y, pathIndex: 1, progress: 0,
      hp: data.hp, maxHp: data.hp, baseSpeed: data.speed * (portraitMode ? .82 : 1), speed: data.speed * (portraitMode ? .82 : 1),
      radius: data.type === "boss" ? 21 : data.type === "striped" ? 11 : 8,
      type: data.type, slow: 0, poison: 0, buzz: Math.random() * 10,
      reward: data.type === "boss" ? 55 : data.type === "striped" ? 16 : 9
    });
  }

  function update(dt) {
    if (!state.playing || state.ended) return;
    if (state.wave > 0) state.elapsed += dt;
    state.shake = Math.max(0, state.shake - dt * 22);

    if (state.waveActive && state.spawnQueue.length) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const next = state.spawnQueue.shift();
        spawnEnemy(next);
        state.spawnTimer = next.gap;
      }
    }

    for (const enemy of state.enemies) updateEnemy(enemy, dt);
    for (const tower of state.towers) updateTower(tower, dt);
    state.enemies = state.enemies.filter(enemy => !enemy.dead && !enemy.arrived);

    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const shot of state.shots) shot.life -= dt;
    state.shots = state.shots.filter(s => s.life > 0);

    if (state.waveActive && !state.spawnQueue.length && !state.enemies.length) {
      state.waveActive = false;
      if (state.wave >= 5) return endGame(true);
      const bonus = 22 + state.wave * 3;
      state.peace += bonus;
      ui.waveButton.disabled = false;
      ui.waveButton.textContent = `第${state.wave + 1}波を迎える`;
      setMessage(`静寂が戻った　安眠 +${bonus}`);
      tone(520, .12, "sine", .05);
    }
    updateUI();
  }

  function updateEnemy(enemy, dt) {
    if (enemy.dead || enemy.arrived) return;
    enemy.buzz += dt * 10;
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.speed = enemy.baseSpeed * (enemy.slow > 0 ? .48 : 1);
    if (enemy.poison > 0) {
      enemy.poison -= dt;
      damageEnemy(enemy, dt * 4.8, false);
    }

    const target = path[enemy.pathIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    const step = enemy.speed * dt;
    if (dist <= step) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.pathIndex += 1;
      if (enemy.pathIndex >= path.length) arrive(enemy);
    } else {
      enemy.x += dx / dist * step;
      enemy.y += dy / dist * step;
    }
  }

  function arrive(enemy) {
    enemy.arrived = true;
    const hit = enemy.type === "boss" ? 38 : enemy.type === "striped" ? 13 : 8;
    state.sleep = Math.max(0, state.sleep - hit);
    state.shake = enemy.type === "boss" ? 12 : 5;
    burst(868, 424, "#ee746d", enemy.type === "boss" ? 24 : 10);
    tone(72, .16, "sawtooth", .07);
    setMessage(enemy.type === "boss" ? "耳元で特大の羽音！" : "蚊に起こされた！");
    if (state.sleep <= 0) endGame(false);
  }

  function updateTower(tower, dt) {
    tower.cooldown -= dt;
    tower.pulse += dt;
    const type = towerTypes[tower.type];
    let targets = state.enemies
      .filter(e => !e.dead && distance(tower, e) <= type.range)
      .sort((a, b) => b.pathIndex - a.pathIndex);
    if (!targets.length || tower.cooldown > 0) return;

    if (tower.type === "coil") {
      for (const enemy of targets) {
        enemy.poison = Math.max(enemy.poison, 1.8);
        damageEnemy(enemy, type.damage, true);
      }
      state.shots.push({ type: "smoke", x1: tower.x, y1: tower.y, life: .35, max: .35, range: type.range });
    } else if (tower.type === "fan") {
      const enemy = targets[0];
      enemy.slow = 1.3;
      const prev = path[Math.max(0, enemy.pathIndex - 1)];
      const dx = prev.x - enemy.x;
      const dy = prev.y - enemy.y;
      const mag = Math.hypot(dx, dy) || 1;
      enemy.x += dx / mag * 17;
      enemy.y += dy / mag * 17;
      damageEnemy(enemy, type.damage, true);
      state.shots.push({ type: "wind", x1: tower.x, y1: tower.y, x2: enemy.x, y2: enemy.y, life: .2, max: .2 });
    } else if (tower.type === "lamp") {
      const enemy = targets[0];
      damageEnemy(enemy, type.damage, true);
      state.shots.push({ type: "bolt", x1: tower.x, y1: tower.y, x2: enemy.x, y2: enemy.y, life: .13, max: .13 });
      tone(860, .035, "square", .025);
    } else if (tower.type === "screen") {
      targets = targets.filter(e => e.pathIndex <= 2);
      for (const enemy of targets) {
        enemy.slow = 1.8;
        damageEnemy(enemy, type.damage, true);
      }
      state.shots.push({ type: "screen", x1: tower.x, y1: tower.y, life: .25, max: .25, range: type.range });
    }
    tower.cooldown = type.rate;
  }

  function damageEnemy(enemy, amount, show) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    if (show && Math.random() > .55) spark(enemy.x, enemy.y, enemy.type === "boss" ? "#ef8c76" : "#d9edb4");
    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.peace += enemy.reward;
      state.kills += 1;
      burst(enemy.x, enemy.y, "#c8de82", enemy.type === "boss" ? 30 : 8);
      tone(enemy.type === "boss" ? 210 : 340, .045, "sine", .018);
    }
  }

  function placeTower(x, y) {
    if (!state.playing || !state.selected) return;
    const type = towerTypes[state.selected];
    if (state.peace < type.cost) return setMessage("安眠ポイントが足りない");
    if (!isValidPlacement(x, y)) return setMessage("そこには置けない");
    state.peace -= type.cost;
    state.towers.push({ x, y, type: state.selected, cooldown: 0, pulse: Math.random() * 4 });
    state.pendingPlacement = null;
    state.hover = null;
    burst(x, y, type.color, 8);
    tone(440, .06, "sine", .025);
    setMessage(`${type.name}を配置した`);
    if (state.wave === 0 && !state.waveActive) {
      ui.waveButton.disabled = false;
      ui.waveButton.textContent = "第1波を迎える";
      setMessage("③ 準備OK。襲来ボタンを押そう");
    }
    updateUI();
  }

  function isValidPlacement(x, y) {
    if (x < 45 || x > W - 50 || y < 60 || y > H - 45) return false;
    if (portraitMode) {
      if (x > 165 && x < 435 && y > 615) return false;
      if (x > 190 && x < 410 && y < 135) return false;
    } else {
      if (x > 735 && y > 345) return false;
      if (x > 45 && x < 205 && y > 70 && y < 195) return false;
    }
    if (distanceToPath(x, y) < 43) return false;
    return !state.towers.some(t => Math.hypot(t.x - x, t.y - y) < 58);
  }

  function distanceToPath(x, y) {
    let min = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const vx = b.x - a.x, vy = b.y - a.y;
      const wx = x - a.x, wy = y - a.y;
      const c = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
      min = Math.min(min, Math.hypot(x - (a.x + c * vx), y - (a.y + c * vy)));
    }
    return min;
  }

  function endGame(win) {
    if (state.ended) return;
    state.ended = true;
    state.playing = false;
    ui.waveButton.disabled = true;
    ui.resultKicker.textContent = win ? "DAWN HAS COME" : "SLEEP INTERRUPTED";
    ui.resultTitle.textContent = win ? "朝まで守りきった。" : "目が覚めてしまった。";
    ui.resultText.textContent = win ? "カーテンの隙間から、朝の光が差し込んでいる。" : "あの一匹さえ、いなければ。";
    ui.resultKills.textContent = `${state.kills}匹`;
    ui.resultSleep.textContent = `${Math.ceil(state.sleep)}%`;
    setTimeout(() => ui.resultOverlay.classList.remove("hidden"), 550);
    tone(win ? 620 : 95, .5, win ? "sine" : "sawtooth", .06);
  }

  function updateUI() {
    ui.sleep.textContent = Math.ceil(state.sleep);
    ui.peace.textContent = Math.floor(state.peace);
    ui.wave.textContent = state.wave;
    const minutes = Math.min(240, Math.floor(state.elapsed * 3.1));
    ui.clock.textContent = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
    ui.cards.forEach(card => {
      const type = card.dataset.tower;
      card.classList.toggle("selected", state.selected === type);
      card.classList.toggle("unaffordable", state.peace < towerTypes[type].cost);
      card.setAttribute("aria-pressed", state.selected === type ? "true" : "false");
    });
    const hasTower = state.towers.length > 0;
    ui.guideChoose.classList.toggle("active", !state.selected && !hasTower);
    ui.guideChoose.classList.toggle("done", Boolean(state.selected) || hasTower);
    ui.guidePlace.classList.toggle("active", Boolean(state.selected) && !hasTower);
    ui.guidePlace.classList.toggle("done", hasTower);
    ui.guideWave.classList.toggle("active", hasTower && state.wave === 0 && !state.waveActive);
    ui.guideWave.classList.toggle("done", state.wave > 0);
  }

  function setMessage(text) { ui.message.textContent = text; }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  function draw() {
    ctx.save();
    if (state.shake) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    drawRoom();
    drawPath();
    drawTowers();
    drawEnemies();
    drawShots();
    drawParticles();
    drawPlacement();
    drawVignette();
    ctx.restore();
  }

  function drawRoom() {
    if (portraitMode) return drawPortraitRoom();
    ctx.fillStyle = "#1a2935";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 42) {
      ctx.fillStyle = y % 84 ? "#1b2b38" : "#182734";
      ctx.fillRect(0, y, W, 41);
    }
    ctx.strokeStyle = "rgba(210,230,216,.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    // moonlit window
    ctx.fillStyle = "#0a1726"; roundRect(48, 66, 158, 126, 7, true);
    ctx.fillStyle = "#7192a8"; roundRect(61, 79, 132, 100, 3, true);
    const moon = ctx.createRadialGradient(112, 112, 3, 112, 112, 34);
    moon.addColorStop(0, "#e7eccd"); moon.addColorStop(1, "rgba(231,236,205,0)");
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(112, 112, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#dfe8cb"; ctx.beginPath(); ctx.arc(112, 112, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#172534"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(127, 78); ctx.lineTo(127, 179); ctx.moveTo(61, 130); ctx.lineTo(193, 130); ctx.stroke();
    ctx.fillStyle = "#425261"; ctx.fillRect(39, 190, 177, 12);

    // desk and rug
    ctx.fillStyle = "#273946"; roundRect(270, 58, 245, 72, 8, true);
    ctx.fillStyle = "#111d28"; roundRect(293, 72, 72, 42, 5, true);
    ctx.fillStyle = "#82a5ae"; ctx.fillRect(301, 79, 56, 28);
    ctx.fillStyle = "#70503e"; ctx.fillRect(488, 76, 10, 37);
    ctx.beginPath(); ctx.arc(493, 69, 15, 0, Math.PI * 2); ctx.fillStyle = "#55765e"; ctx.fill();
    ctx.fillStyle = "rgba(83,116,117,.25)"; roundRect(330, 375, 350, 163, 25, true);
    ctx.strokeStyle = "rgba(141,181,168,.13)"; ctx.lineWidth = 3; roundRect(345, 390, 320, 133, 20, false, true);

    // bed
    ctx.fillStyle = "rgba(0,0,0,.25)"; roundRect(746, 347, 179, 194, 18, true);
    ctx.fillStyle = "#697884"; roundRect(734, 334, 179, 194, 18, true);
    ctx.fillStyle = "#a8b3ae"; roundRect(746, 347, 155, 169, 14, true);
    ctx.fillStyle = "#e0ded0"; roundRect(757, 356, 133, 52, 14, true);
    ctx.fillStyle = "#52697a"; roundRect(750, 401, 147, 109, 12, true);
    ctx.fillStyle = "#d6b08d"; ctx.beginPath(); ctx.arc(822, 392, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222c35"; ctx.beginPath(); ctx.arc(822, 384, 23, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5e4c42"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(813, 395, 4, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(830, 395, 4, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = "rgba(182,216,108,.8)"; ctx.font = "700 12px system-ui"; ctx.fillText("ZZZ", 858, 372);

    // side table
    ctx.fillStyle = "#43505a"; roundRect(911, 381, 42, 91, 5, true);
    ctx.fillStyle = "#f3a55b"; ctx.beginPath(); ctx.arc(931, 402, 8, 0, Math.PI * 2); ctx.fill();
  }

  function drawPortraitRoom() {
    ctx.fillStyle = "#1a2935";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 42) {
      ctx.fillStyle = y % 84 ? "#1b2b38" : "#182734";
      ctx.fillRect(0, y, W, 41);
    }
    ctx.strokeStyle = "rgba(210,230,216,.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 75) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    // window and moonlight at the top
    ctx.fillStyle = "#0a1726"; roundRect(200, 18, 200, 112, 8, true);
    ctx.fillStyle = "#7192a8"; roundRect(213, 30, 174, 86, 4, true);
    const moon = ctx.createRadialGradient(255, 67, 3, 255, 67, 32);
    moon.addColorStop(0, "#e7eccd"); moon.addColorStop(1, "rgba(231,236,205,0)");
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(255, 67, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#dfe8cb"; ctx.beginPath(); ctx.arc(255, 67, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#172534"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(300, 30); ctx.lineTo(300, 116); ctx.moveTo(213, 73); ctx.lineTo(387, 73); ctx.stroke();
    ctx.fillStyle = "#425261"; ctx.fillRect(190, 129, 220, 11);

    // compact desk, shelf and rug
    ctx.fillStyle = "#273946"; roundRect(24, 236, 112, 225, 9, true);
    ctx.fillStyle = "#111d28"; roundRect(38, 255, 84, 61, 6, true);
    ctx.fillStyle = "#82a5ae"; ctx.fillRect(47, 265, 66, 40);
    ctx.fillStyle = "#70503e"; ctx.fillRect(52, 350, 13, 53);
    ctx.beginPath(); ctx.arc(58, 337, 23, 0, Math.PI * 2); ctx.fillStyle = "#55765e"; ctx.fill();
    ctx.fillStyle = "rgba(83,116,117,.25)"; roundRect(206, 245, 342, 265, 28, true);
    ctx.strokeStyle = "rgba(141,181,168,.13)"; ctx.lineWidth = 3; roundRect(222, 262, 310, 230, 22, false, true);

    // bed across the bottom
    ctx.fillStyle = "rgba(0,0,0,.25)"; roundRect(174, 630, 262, 116, 18, true);
    ctx.fillStyle = "#697884"; roundRect(164, 618, 262, 116, 18, true);
    ctx.fillStyle = "#a8b3ae"; roundRect(176, 630, 238, 92, 14, true);
    ctx.fillStyle = "#e0ded0"; roundRect(187, 641, 72, 70, 13, true);
    ctx.fillStyle = "#52697a"; roundRect(250, 635, 153, 81, 12, true);
    ctx.fillStyle = "#d6b08d"; ctx.beginPath(); ctx.arc(242, 676, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222c35"; ctx.beginPath(); ctx.arc(234, 676, 23, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.strokeStyle = "#5e4c42"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(244, 668, 4, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = "rgba(182,216,108,.8)"; ctx.font = "700 12px system-ui"; ctx.fillText("ZZZ", 202, 627);
    ctx.fillStyle = "#43505a"; roundRect(440, 655, 60, 64, 6, true);
    ctx.fillStyle = "#f3a55b"; ctx.beginPath(); ctx.arc(470, 674, 8, 0, Math.PI * 2); ctx.fill();
  }

  function drawPath() {
    ctx.save();
    ctx.strokeStyle = "rgba(157,196,176,.08)";
    ctx.lineWidth = 47;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([2, 15]);
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(182,216,108,.7)";
    ctx.font = "800 10px system-ui";
    ctx.fillText("侵入口", portraitMode ? 20 : 24, portraitMode ? 34 : 221);
    ctx.restore();
  }

  function drawTowers() {
    for (const t of state.towers) {
      ctx.save(); ctx.translate(t.x, t.y);
      const pulse = Math.sin(t.pulse * 3) * 2;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(3, 15, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (t.type === "coil") {
        ctx.strokeStyle = "#db8c48"; ctx.lineWidth = 5; ctx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += .16) { const r = a * 1.5; const x = Math.cos(a) * r, y = Math.sin(a) * r * .48; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.fillStyle = "rgba(218,230,208,.35)"; ctx.beginPath(); ctx.arc(-2, -16 - pulse, 5 + pulse, 0, Math.PI * 2); ctx.fill();
      } else if (t.type === "fan") {
        ctx.fillStyle = "#5e7983"; ctx.fillRect(-4, 2, 8, 22); ctx.fillRect(-16, 23, 32, 6);
        ctx.strokeStyle = "#86bdc4"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -5, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.rotate(t.pulse * 5); ctx.fillStyle = "#79aeb6";
        for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.ellipse(8, 0, 12, 5, .4, 0, Math.PI * 2); ctx.fill(); }
      } else if (t.type === "lamp") {
        ctx.shadowBlur = 18 + pulse; ctx.shadowColor = "#b678eb"; ctx.fillStyle = "#9b6ac4"; roundRect(-17, -25, 34, 49, 7, true);
        ctx.fillStyle = "#d7b7f0"; ctx.font = "900 28px system-ui"; ctx.textAlign = "center"; ctx.fillText("ϟ", 0, 10);
      } else {
        ctx.fillStyle = "#5a7766"; roundRect(-22, -25, 44, 50, 5, true);
        ctx.strokeStyle = "#a9cbb0"; ctx.lineWidth = 2;
        for (let x = -16; x <= 16; x += 8) { ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x, 20); ctx.stroke(); }
        for (let y = -16; y <= 16; y += 8) { ctx.beginPath(); ctx.moveTo(-17, y); ctx.lineTo(17, y); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of state.enemies) {
      ctx.save(); ctx.translate(e.x, e.y + Math.sin(e.buzz) * 2);
      if (e.type === "boss") { ctx.shadowBlur = 18; ctx.shadowColor = "#e46f69"; }
      const angle = Math.atan2(path[Math.min(e.pathIndex, path.length - 1)].y - e.y, path[Math.min(e.pathIndex, path.length - 1)].x - e.x);
      ctx.rotate(angle);
      const wing = Math.sin(e.buzz * 2) * .35;
      ctx.fillStyle = "rgba(215,232,226,.65)";
      ctx.save(); ctx.rotate(-.45 + wing); ctx.beginPath(); ctx.ellipse(-3, -e.radius * .75, e.radius * .85, e.radius * .38, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.rotate(.45 - wing); ctx.beginPath(); ctx.ellipse(-3, e.radius * .75, e.radius * .85, e.radius * .38, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = e.type === "boss" ? "#a8383d" : e.type === "striped" ? "#cfb765" : "#27302f";
      ctx.beginPath(); ctx.ellipse(0, 0, e.radius * 1.05, e.radius * .5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#171b1c";
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * e.radius * .42 - 1, -e.radius * .48, 2, e.radius * .96);
      ctx.strokeStyle = "#202725"; ctx.lineWidth = e.type === "boss" ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(e.radius * .8, 0); ctx.lineTo(e.radius * 2.2, -e.radius * .18); ctx.stroke();
      ctx.restore();
      const barW = e.type === "boss" ? 68 : 30;
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(e.x - barW / 2, e.y - e.radius - 13, barW, 4);
      ctx.fillStyle = e.type === "boss" ? "#ee746d" : "#b6d86c"; ctx.fillRect(e.x - barW / 2, e.y - e.radius - 13, barW * Math.max(0, e.hp / e.maxHp), 4);
      if (e.type === "boss") { ctx.fillStyle = "#e8c8c5"; ctx.font = "800 10px system-ui"; ctx.textAlign = "center"; ctx.fillText("ヌシ蚊", e.x, e.y - 39); }
    }
    ctx.textAlign = "start";
  }

  function drawShots() {
    for (const s of state.shots) {
      const alpha = s.life / s.max;
      ctx.save(); ctx.globalAlpha = alpha;
      if (s.type === "bolt") {
        ctx.strokeStyle = "#e2c3ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x1, s.y1);
        const mx = (s.x1 + s.x2) / 2 + (Math.random() - .5) * 20, my = (s.y1 + s.y2) / 2 + (Math.random() - .5) * 20;
        ctx.lineTo(mx, my); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      } else if (s.type === "wind") {
        ctx.strokeStyle = "#9bd5da"; ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s.x1, s.y1 + i * 8); ctx.quadraticCurveTo((s.x1 + s.x2) / 2, s.y1 + i * 12, s.x2, s.y2 + i * 7); ctx.stroke(); }
      } else {
        ctx.strokeStyle = s.type === "smoke" ? "rgba(220,224,211,.3)" : "rgba(169,203,176,.35)";
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x1, s.y1, s.range * (1 - alpha * .15), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlacement() {
    if (!state.selected || !state.hover || !state.playing) return;
    const valid = isValidPlacement(state.hover.x, state.hover.y) && state.peace >= towerTypes[state.selected].cost;
    ctx.save();
    ctx.fillStyle = valid ? "rgba(182,216,108,.09)" : "rgba(238,116,109,.08)";
    ctx.strokeStyle = valid ? "rgba(182,216,108,.7)" : "rgba(238,116,109,.7)";
    ctx.setLineDash([7, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.hover.x, state.hover.y, towerTypes[state.selected].range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.arc(state.hover.x, state.hover.y, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(W * .55, H * .46, 150, W * .5, H * .5, 620);
    gradient.addColorStop(0, "rgba(3,8,15,0)"); gradient.addColorStop(1, "rgba(3,8,15,.57)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) ctx.fill(); if (stroke) ctx.stroke();
  }

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function spark(x, y, color) {
    state.particles.push({ x, y, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, gravity: 0, life: .3, maxLife: .3, size: 2, color });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) state.particles.push({
      x, y, vx: (Math.random() - .5) * 110, vy: (Math.random() - .5) * 110,
      gravity: 35, life: .35 + Math.random() * .35, maxLife: .7, size: 1.5 + Math.random() * 3, color
    });
  }

  function initAudio() {
    if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audio.state === "suspended") state.audio.resume();
  }

  function tone(frequency, duration, type = "sine", volume = .03) {
    if (state.muted || !state.audio) return;
    const oscillator = state.audio.createOscillator();
    const gain = state.audio.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, state.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, state.audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(state.audio.destination);
    oscillator.start(); oscillator.stop(state.audio.currentTime + duration);
  }

  function loop(now) {
    const dt = Math.min(.035, (now - state.lastTime) / 1000);
    state.lastTime = now;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointermove", event => {
    if (!portraitMode || !state.pendingPlacement) state.hover = pointerPosition(event);
  });
  canvas.addEventListener("pointerleave", () => {
    if (!portraitMode) state.hover = null;
  });
  canvas.addEventListener("click", event => {
    initAudio();
    const p = pointerPosition(event);
    if (portraitMode && state.selected) {
      if (state.pendingPlacement && Math.hypot(state.pendingPlacement.x - p.x, state.pendingPlacement.y - p.y) < 42) {
        placeTower(p.x, p.y);
      } else {
        state.pendingPlacement = p;
        state.hover = p;
        const valid = isValidPlacement(p.x, p.y) && state.peace >= towerTypes[state.selected].cost;
        setMessage(valid ? "射程を確認 → 同じ場所をもう一度タップ" : "赤い場所には配置できません");
      }
      return;
    }
    placeTower(p.x, p.y);
  });

  ui.cards.forEach(card => card.addEventListener("click", () => {
    initAudio();
    const type = card.dataset.tower;
    state.selected = state.selected === type ? null : type;
    state.pendingPlacement = null;
    state.hover = null;
    setMessage(state.selected
      ? portraitMode ? `${towerTypes[type].name}：1回タップで射程を確認` : `${towerTypes[type].name}：置きたい場所をクリック`
      : "アイテムを選んで部屋に配置");
    updateUI();
  }));
  document.querySelector("#retryButton").addEventListener("click", reset);
  ui.waveButton.addEventListener("click", startWave);
  ui.sound.addEventListener("click", () => {
    state.muted = !state.muted;
    ui.sound.classList.toggle("muted", state.muted);
    ui.sound.textContent = state.muted ? "×" : "♪";
    ui.sound.setAttribute("aria-label", state.muted ? "サウンドを入れる" : "サウンドを切る");
    if (!state.muted) { initAudio(); tone(520, .08); }
  });

  reset();
  requestAnimationFrame(loop);
})();
