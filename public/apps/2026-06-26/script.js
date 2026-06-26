(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#arena");
  const ctx = canvas.getContext("2d");
  const ui = {
    setup: $("#setup"),
    start: $("#startButton"),
    launchPanel: $("#launchPanel"),
    status: $("#statusText"),
    gustButton: $("#gustButton"),
    reset: $("#resetButton"),
    result: $("#result"),
    resultKicker: $("#resultKicker"),
    resultTitle: $("#resultTitle"),
    next: $("#nextButton"),
    round: $("#roundLabel"),
    playerWins: $("#playerWins"),
    cpuWins: $("#cpuWins")
  };

  const difficulties = [
    { id: "easy", label: "よわい", aim: 1.05, power: .74, delay: .95, energy: 62 },
    { id: "normal", label: "ふつう", aim: .58, power: .88, delay: .68, energy: 78 },
    { id: "hard", label: "つよい", aim: .34, power: .99, delay: .46, energy: 92 },
    { id: "storm", label: "さいきょう", aim: .2, power: 1.06, delay: .34, energy: 100 }
  ];

  const playerType = { id: "power", label: "低気圧", radius: 30, mass: 1.08, power: 1.08, grip: .994, chaos: .05, energy: 110, gust: 1 };

  const types = [
    { id: "tropical", label: "熱帯低気圧", radius: 27, mass: .9, power: .78, grip: .991, chaos: .035, energy: 62 },
    { id: "typhoon8", label: "台風8号", radius: 29, mass: 1, power: .92, grip: .993, chaos: .045, energy: 78 },
    { id: "violent", label: "猛烈台風", radius: 31, mass: 1.14, power: 1.08, grip: .995, chaos: .058, energy: 100 }
  ];

  const state = {
    mode: "menu",
    difficulty: difficulties[3],
    type: playerType,
    round: 1,
    playerWins: 0,
    cpuWins: 0,
    dpr: 1,
    w: 0,
    h: 0,
    center: { x: 0, y: 0 },
    arenaRadius: 0,
    baseArenaRadius: 0,
    roundTime: 0,
    player: null,
    cpu: null,
    drag: null,
    cpuTimer: 0,
    firstHit: false,
    gustUsed: false,
    winner: null,
    last: 0,
    shake: 0,
    sparks: [],
    gust: 0
  };

  function makeChips() {
    state.type = playerType;
  }

  function resize() {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    canvas.width = Math.floor(rect.width * state.dpr);
    canvas.height = Math.floor(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.center.x = state.w / 2;
    state.center.y = Math.max(282, Math.min(state.h * .52, state.h - 286));
    state.baseArenaRadius = Math.min(state.w * .43, (state.h - 285) * .42, 214);
    if (state.mode !== "playing") state.arenaRadius = state.baseArenaRadius;
    if (state.player && state.mode !== "playing") placeTops();
    draw();
  }

  function makeTop(kind) {
    const type = kind === "player" ? state.type : cpuType();
    return {
      kind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      spin: kind === "player" ? 0 : Math.PI,
      spinRate: kind === "player" ? 7.2 : -7.6,
      radius: type.radius,
      mass: type.mass,
      power: type.power,
      grip: type.grip,
      chaos: type.chaos,
      maxEnergy: kind === "player" ? type.energy : cpuEnergy(),
      energy: kind === "player" ? type.energy : cpuEnergy(),
      launchQuality: .5,
      hitBonus: 1,
      stopped: false,
      launched: false,
      alive: true,
      color: kind === "player" ? "#35d2ff" : "#ff5cb8",
      glow: kind === "player" ? "rgba(53,210,255,.55)" : "rgba(255,92,184,.55)"
    };
  }

  function cpuType() {
    if (state.difficulty.id === "easy") return types[0];
    if (state.difficulty.id === "storm") return types[2];
    return types[1];
  }

  function cpuEnergy() {
    return state.difficulty.energy;
  }

  function placeTops() {
    const r = state.arenaRadius;
    state.player.x = state.center.x - r * .34;
    state.player.y = state.center.y + r * .16;
    state.cpu.x = state.center.x + r * .34;
    state.cpu.y = state.center.y - r * .16;
    state.player.vx = state.player.vy = state.cpu.vx = state.cpu.vy = 0;
    state.player.launched = false;
    state.cpu.launched = false;
  }

  function newRound(keepScore = true) {
    state.mode = "aiming";
    state.player = makeTop("player");
    state.cpu = makeTop("cpu");
    state.drag = null;
    state.cpuTimer = state.difficulty.delay;
    state.roundTime = 0;
    state.arenaRadius = state.baseArenaRadius;
    state.firstHit = false;
    state.gustUsed = false;
    state.winner = null;
    state.sparks = [];
    state.gust = Math.random() * Math.PI * 2;
    if (!keepScore) {
      state.round = 1;
      state.playerWins = 0;
      state.cpuWins = 0;
    }
    placeTops();
    syncScore();
    ui.setup.classList.add("hidden");
    ui.result.classList.remove("show");
    ui.launchPanel.classList.add("show");
    ui.gustButton.classList.remove("ready", "used");
    ui.status.textContent = "自分の台風を引っぱって離す";
    state.last = performance.now();
    requestAnimationFrame(tick);
  }

  function syncScore() {
    ui.round.textContent = String(state.round);
    ui.playerWins.textContent = String(state.playerWins);
    ui.cpuWins.textContent = String(state.cpuWins);
  }

  function tick(now) {
    const dt = Math.min(.034, (now - state.last) / 1000 || .016);
    state.last = now;
    update(dt);
    draw();
    if (state.mode === "aiming" || state.mode === "playing") requestAnimationFrame(tick);
  }

  function update(dt) {
    state.gust += dt * .55;
    state.shake = Math.max(0, state.shake - dt * 4);
    state.sparks = state.sparks.filter((spark) => (spark.life -= dt) > 0);

    if (state.mode === "aiming" && state.player.launched) state.mode = "playing";
    if (state.mode !== "playing") return;
    state.roundTime += dt;
    updateArenaPressure();
    updateGustButton();

    if (!state.cpu.launched) {
      state.cpuTimer -= dt;
      if (state.cpuTimer <= 0) launchCpu();
    }

    moveTop(state.player, dt);
    moveTop(state.cpu, dt);
    guideOpeningHit(dt);
    collide();
    keepOrOut(state.player);
    keepOrOut(state.cpu);
    checkStopped(state.player);
    checkStopped(state.cpu);

    if (!state.player.alive || !state.cpu.alive) {
      const winner = !state.player.alive && !state.cpu.alive
        ? (state.player.energy >= state.cpu.energy ? "player" : "cpu")
        : (!state.cpu.alive ? "player" : "cpu");
      finish(winner);
      return;
    }

    if (state.firstHit && state.roundTime > 13.5) {
      finish(state.player.energy >= state.cpu.energy ? "player" : "cpu", "judge");
    }
  }

  function updateArenaPressure() {
    const sudden = Math.max(0, state.roundTime - 9);
    const shrink = Math.min(state.baseArenaRadius * .38, sudden * 10);
    state.arenaRadius = state.baseArenaRadius - shrink;

    if (sudden > 0) ui.status.textContent = "サドンデス。土俵が狭まる。";
  }

  function moveTop(top, dt) {
    if (!top.alive || !top.launched) return;
    const swirl = Math.sin(state.gust + top.spin * .35) * top.chaos;
    const dx = top.x - state.center.x;
    const dy = top.y - state.center.y;
    const tangent = normalize({ x: -dy, y: dx });
    top.vx += tangent.x * swirl * 62 * dt;
    top.vy += tangent.y * swirl * 62 * dt;
    top.x += top.vx * dt;
    top.y += top.vy * dt;
    top.vx *= top.grip;
    top.vy *= top.grip;
    const speed = length(top.vx, top.vy);
    const staminaDrain = state.firstHit ? 9.5 : 2.2;
    top.energy = Math.max(0, top.energy - dt * (staminaDrain + speed * .018));
    top.spinRate *= Math.max(0, 1 - dt * (state.firstHit ? .2 : .08));
    top.spin += top.spinRate * dt * (.35 + top.energy / 100) + speed * dt * .012;
  }

  function checkStopped(top) {
    if (!top.alive || !top.launched || !state.firstHit) return;
    if (top.energy <= 0 || Math.abs(top.spinRate) < .35) {
      top.energy = 0;
      top.stopped = true;
      top.alive = false;
    }
  }

  function guideOpeningHit(dt) {
    if (state.firstHit || !state.player.launched || !state.cpu.launched) return;
    pullTowardOpponent(state.player, state.cpu, dt);
    pullTowardOpponent(state.cpu, state.player, dt);
    const missTimer = Math.max(0, state.roundTime - 1.7);
    if (missTimer > 0) {
      pullTowardOpponent(state.player, state.cpu, dt * (1 + missTimer * 1.2));
      pullTowardOpponent(state.cpu, state.player, dt * (1 + missTimer * 1.2));
    }
  }

  function pullTowardOpponent(top, opponent, dt) {
    if (!top.alive || !opponent.alive) return;
    const dx = opponent.x - top.x;
    const dy = opponent.y - top.y;
    const dist = Math.max(1, length(dx, dy));
    const closing = (top.vx * dx + top.vy * dy) / dist;
    const speed = Math.max(320, length(top.vx, top.vy));
    const blend = state.roundTime > 1.1 ? .42 : .24;
    const assist = Math.max(240, 520 - closing) * 3.2 / top.mass;
    top.vx = top.vx * (1 - blend) + (dx / dist) * speed * blend;
    top.vy = top.vy * (1 - blend) + (dy / dist) * speed * blend;
    top.vx += (dx / dist) * assist * dt;
    top.vy += (dy / dist) * assist * dt;
  }

  function collide() {
    const a = state.player;
    const b = state.cpu;
    if (!a.alive || !b.alive || !a.launched || !b.launched) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, length(dx, dy));
    const minDist = a.radius + b.radius - 3;
    if (dist > minDist) return;
    state.firstHit = true;
    if (!state.gustUsed) ui.status.textContent = "接触。外へ寄せてGUST。";

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * .52;
    a.y -= ny * overlap * .52;
    b.x += nx * overlap * .52;
    b.y += ny * overlap * .52;

    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const impulse = Math.max(90, Math.abs(rel) * 1.18 + 130) / (a.mass + b.mass);
    const aAttack = Math.max(0, -(a.vx * nx + a.vy * ny)) * a.mass * a.hitBonus;
    const bAttack = Math.max(0, b.vx * nx + b.vy * ny) * b.mass * b.hitBonus;
    const baseDamage = Math.min(12, impulse * .026);
    const playerSkillBonus = a.kind === "player" ? 1 + a.launchQuality * .75 : 1;
    const cpuSkillBonus = b.kind === "cpu" ? .86 + b.launchQuality * .42 : 1;
    a.energy = Math.max(0, a.energy - (baseDamage + bAttack * .012 * cpuSkillBonus) / a.mass);
    b.energy = Math.max(0, b.energy - (baseDamage + aAttack * .014 * playerSkillBonus) / b.mass);
    a.vx -= nx * impulse * b.mass;
    a.vy -= ny * impulse * b.mass;
    b.vx += nx * impulse * a.mass;
    b.vy += ny * impulse * a.mass;
    a.spinRate *= -1.01;
    b.spinRate *= -1.01;
    state.shake = .8;
    burst((a.x + b.x) / 2, (a.y + b.y) / 2, 12);
  }

  function keepOrOut(top) {
    if (!top.alive) return;
    const dx = top.x - state.center.x;
    const dy = top.y - state.center.y;
    const dist = length(dx, dy);
    if (!state.firstHit && state.player.launched && state.cpu.launched && dist > state.arenaRadius - top.radius) {
      const n = normalize({ x: dx, y: dy });
      top.x = state.center.x + n.x * (state.arenaRadius - top.radius);
      top.y = state.center.y + n.y * (state.arenaRadius - top.radius);
      top.vx *= .72;
      top.vy *= .72;
      return;
    }
    if (dist > state.arenaRadius + top.radius * .28) {
      top.alive = false;
      burst(top.x, top.y, 24);
      return;
    }
    if (dist > state.arenaRadius - top.radius) {
      const n = normalize({ x: dx, y: dy });
      const towardWall = Math.max(0, top.vx * n.x + top.vy * n.y);
      top.vx -= n.x * (towardWall * .58 + 34) / top.mass;
      top.vy -= n.y * (towardWall * .58 + 34) / top.mass;
    }
  }

  function launch(top, pointer) {
    const maxPull = state.arenaRadius * .62;
    const dx = top.x - pointer.x;
    const dy = top.y - pointer.y;
    const pull = Math.min(maxPull, length(dx, dy));
    if (pull < 20) return false;
    const n = normalize({ x: dx, y: dy });
    const target = top.kind === "player" && state.cpu ? state.cpu : { x: state.center.x, y: state.center.y };
    const targetBias = normalize({ x: target.x - top.x, y: target.y - top.y });
    const aimDot = Math.max(0, n.x * targetBias.x + n.y * targetBias.y);
    const pullRatio = pull / maxPull;
    top.launchQuality = Math.max(.15, Math.min(1, aimDot * .68 + pullRatio * .32));
    top.hitBonus = .86 + top.launchQuality * .52;
    const power = (240 + pull * 4.15) * top.power;
    top.vx = (n.x * .7 + targetBias.x * .3) * power;
    top.vy = (n.y * .7 + targetBias.y * .3) * power;
    top.launched = true;
    if (top.kind === "player") state.cpuTimer = Math.min(state.cpuTimer, .18);
    burst(top.x, top.y, 10);
    if (top.kind === "player") {
      ui.status.textContent = top.launchQuality > .78 ? "直撃コース。押し切れ。" : top.launchQuality > .52 ? "CPU台風、接近中" : "浅い。押し負け注意。";
    }
    return true;
  }

  function launchCpu() {
    const c = state.cpu;
    const p = state.player;
    const diff = state.difficulty;
    const target = p.launched ? { x: p.x + p.vx * .14, y: p.y + p.vy * .14 } : p;
    const miss = diff.aim * state.arenaRadius;
    const tx = target.x + (Math.random() - .5) * miss;
    const ty = target.y + (Math.random() - .5) * miss;
    const n = normalize({ x: tx - c.x, y: ty - c.y });
    const ringBias = diff.id === "hard" || diff.id === "storm" ? .09 : 0;
    const tangent = normalize({ x: -(c.y - state.center.y), y: c.x - state.center.x });
    c.launchQuality = Math.max(.28, 1 - diff.aim * .42);
    c.hitBonus = .82 + c.launchQuality * .34;
    c.vx = (n.x + tangent.x * ringBias) * 390 * diff.power * c.power;
    c.vy = (n.y + tangent.y * ringBias) * 390 * diff.power * c.power;
    c.launched = true;
    burst(c.x, c.y, 10);
    ui.status.textContent = "押し出せ。外に出たら負け。";
  }

  function finish(winner, reason = "") {
    state.mode = "result";
    state.winner = winner;
    if (winner === "player") state.playerWins += 1;
    else state.cpuWins += 1;
    syncScore();
    ui.launchPanel.classList.remove("show");
    ui.gustButton.classList.remove("ready");
    ui.result.classList.add("show");
    ui.resultKicker.textContent = winner === "player" ? "PLAYER WINS" : "CPU WINS";
    const loser = winner === "player" ? state.cpu : state.player;
    ui.resultTitle.textContent = reason === "judge"
      ? (winner === "player" ? "残り勢力で押し勝った" : "残り勢力で押し負けた")
      : loser.stopped
      ? (winner === "player" ? "CPUの回転が止まった" : "自分の回転が止まった")
      : (winner === "player" ? "CPU台風を押し出した" : "土俵の外へ流された");
    ui.next.textContent = state.playerWins >= 3 || state.cpuWins >= 3 ? "最初から" : "次のラウンド";
  }

  function updateGustButton() {
    const ready = gustChance() >= .72;
    ui.gustButton.classList.toggle("ready", ready);
    ui.gustButton.classList.toggle("used", state.gustUsed);
  }

  function gustChance() {
    if (state.mode !== "playing" || !state.firstHit || state.gustUsed || !state.player?.alive || !state.cpu?.alive) return 0;
    const pDist = length(state.player.x - state.center.x, state.player.y - state.center.y);
    const cDist = length(state.cpu.x - state.center.x, state.cpu.y - state.center.y);
    const edgeRatio = cDist / state.arenaRadius;
    const edgeAdvantage = (cDist - pDist) / state.arenaRadius;
    const timing = Math.max(0, Math.min(1, (edgeRatio - .72) / .17));
    const advantage = Math.max(0, Math.min(1, edgeAdvantage * 2.4));
    return timing * advantage;
  }

  function useGust() {
    const success = gustChance();
    if (success < .72) {
      if (!state.gustUsed) ui.status.textContent = state.firstHit ? "まだGUST圏外。外へ寄せろ。" : "接触してからGUST。";
      return;
    }
    state.gustUsed = true;
    ui.gustButton.classList.remove("ready");
    ui.gustButton.classList.add("used");

    const strength = (.18 + success * .82) * state.type.gust;
    const out = normalize({ x: state.cpu.x - state.center.x, y: state.cpu.y - state.center.y });
    const playerIn = normalize({ x: state.center.x - state.player.x, y: state.center.y - state.player.y });

    state.cpu.vx += out.x * 230 * strength / state.cpu.mass;
    state.cpu.vy += out.y * 230 * strength / state.cpu.mass;
    state.cpu.energy = Math.max(0, state.cpu.energy - (7 + success * 13));
    state.player.energy = Math.max(0, state.player.energy - 3);
    state.player.vx += playerIn.x * 42 * strength;
    state.player.vy += playerIn.y * 42 * strength;
    state.shake = 1;
    burst(state.cpu.x, state.cpu.y, Math.round(8 + success * 18));
    ui.status.textContent = "突風成功。外へ流した。";
  }

  function burst(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 190;
      state.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .28 + Math.random() * .28, size: 2 + Math.random() * 5 });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, state.w, state.h);
    const sx = (Math.random() - .5) * state.shake * 6;
    const sy = (Math.random() - .5) * state.shake * 6;
    ctx.save();
    ctx.translate(sx, sy);
    drawSea();
    drawSatelliteOverlay();
    drawForecastTracks();
    drawArena();
    drawAim();
    drawTop(state.cpu);
    drawTop(state.player);
    drawGustHint();
    drawSparks();
    ctx.restore();
  }

  function drawSea() {
    const grad = ctx.createLinearGradient(0, 0, state.w, state.h);
    grad.addColorStop(0, "rgba(105, 139, 149, .22)");
    grad.addColorStop(.32, "rgba(42, 98, 205, .26)");
    grad.addColorStop(.72, "rgba(20, 78, 186, .18)");
    grad.addColorStop(1, "rgba(8, 38, 109, .08)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.save();
    ctx.fillStyle = "rgba(56, 111, 61, .82)";
    drawLandBlob(-34, 18, 178, 230, -.2);
    drawLandBlob(74, -30, 180, 150, .28);
    drawLandBlob(244, 16, 76, 128, -.14);
    drawLandBlob(175, 170, 58, 94, .1);
    ctx.fillStyle = "rgba(38, 92, 51, .62)";
    drawLandBlob(-18, 242, 116, 105, .3);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineWidth = 1;
    for (let i = -1; i < 9; i += 1) {
      const y = 18 + i * 86;
      ctx.beginPath();
      for (let x = -20; x <= state.w + 20; x += 36) {
        const wave = Math.sin(x * .018 + i) * 4;
        if (x === -20) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }

  function drawLandBlob(x, y, w, h, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * .5, h * .5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(246,255,246,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawSatelliteOverlay() {
    const c = state.center;
    const r = state.arenaRadius;
    ctx.save();
    ctx.translate(c.x, c.y);

    ctx.rotate(-state.gust * .2);
    for (let i = 0; i < 12; i += 1) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(r * .42, 0, r * .98, 16 + i * 1.5, .16, Math.PI * .04, Math.PI * .88);
      ctx.strokeStyle = i % 2 ? "rgba(255,255,255,.42)" : "rgba(246,250,255,.32)";
      ctx.lineWidth = 10 + (i % 3) * 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * .18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(37, 75, 112, .66)";
    ctx.fill();

    ctx.restore();
  }

  function drawForecastTracks() {
    ctx.save();
    drawForecastPath(
      [
        { x: state.center.x - state.arenaRadius * .48, y: state.center.y + state.arenaRadius * .34, rr: 16 },
        { x: state.center.x - state.arenaRadius * .1, y: state.center.y + state.arenaRadius * .04, rr: 26 },
        { x: state.center.x + state.arenaRadius * .35, y: state.center.y - state.arenaRadius * .2, rr: 40 },
        { x: state.center.x + state.arenaRadius * .76, y: state.center.y - state.arenaRadius * .56, rr: 58 }
      ],
      "7号"
    );
    drawForecastPath(
      [
        { x: state.center.x + state.arenaRadius * .48, y: state.center.y + state.arenaRadius * .34, rr: 16 },
        { x: state.center.x + state.arenaRadius * .18, y: state.center.y + state.arenaRadius * .02, rr: 24 },
        { x: state.center.x + state.arenaRadius * .48, y: state.center.y - state.arenaRadius * .25, rr: 38 },
        { x: state.center.x + state.arenaRadius * .9, y: state.center.y - state.arenaRadius * .65, rr: 56 }
      ],
      "8号"
    );
    ctx.restore();
  }

  function drawForecastPath(points, label) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,.88)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "rgba(0,0,0,.62)";
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.rr, 0, Math.PI * 2);
      ctx.strokeStyle = index === 0 ? "rgba(255, 30, 30, .96)" : "rgba(0,0,0,.88)";
      ctx.lineWidth = index === 0 ? 3 : 2;
      ctx.stroke();
    });
    const first = points[0];
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.strokeStyle = "rgba(0,0,0,.78)";
    ctx.lineWidth = 4;
    ctx.font = "950 18px Helvetica Neue, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(label, first.x, first.y + 34);
    ctx.fillText(label, first.x, first.y + 34);
    ctx.restore();
  }

  function drawArena() {
    const c = state.center;
    const r = state.arenaRadius;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.save();
    ctx.rotate(state.gust * .16);
    for (let i = 0; i < 12; i += 1) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(r * .96, 0);
      ctx.lineTo(r * 1.05, -5);
      ctx.lineTo(r * 1.02, 5);
      ctx.closePath();
      ctx.fillStyle = "rgba(232,251,255,.38)";
      ctx.fill();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const fill = ctx.createRadialGradient(0, 0, r * .15, 0, 0, r);
    fill.addColorStop(0, "rgba(228, 250, 255, .34)");
    fill.addColorStop(.16, "rgba(13, 82, 102, .92)");
    fill.addColorStop(.72, "rgba(4, 38, 59, .97)");
    fill.addColorStop(1, "rgba(2, 12, 24, .99)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    ctx.rotate(-state.gust * .3);
    for (let i = 0; i < 6; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(r * .32, 0, r * .74, r * .085, .12, Math.PI * .08, Math.PI * .92);
      ctx.strokeStyle = i % 2 ? "rgba(240,250,255,.18)" : "rgba(159,245,255,.16)";
      ctx.lineWidth = Math.max(7, r * .055);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (1 - i * .16), 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "rgba(159,245,255,.82)" : "rgba(201,251,255,.16)";
      ctx.lineWidth = i === 0 ? 4 : 1;
      ctx.stroke();
    }

    ctx.rotate(state.gust * .18);
    for (let i = 0; i < 18; i += 1) {
      ctx.rotate(Math.PI / 9);
      ctx.beginPath();
      ctx.moveTo(r * .22, 0);
      ctx.lineTo(r * .92, 0);
      ctx.strokeStyle = "rgba(159,245,255,.08)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * .13, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232, 251, 255, .22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(232, 251, 255, .58)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawAim() {
    if (!state.drag || !state.player || state.player.launched) return;
    const p = state.player;
    const d = state.drag;
    ctx.save();
    ctx.strokeStyle = "rgba(255,215,106,.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const n = normalize({ x: dx, y: dy });
    const targetBias = normalize({ x: state.cpu.x - p.x, y: state.cpu.y - p.y });
    const aimDot = Math.max(0, n.x * targetBias.x + n.y * targetBias.y);
    ctx.strokeStyle = aimDot > .82 ? "rgba(255,240,106,.95)" : aimDot > .55 ? "rgba(53,210,255,.82)" : "rgba(255,115,93,.82)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + n.x * 76, p.y + n.y * 76);
    ctx.stroke();
    ctx.restore();
  }

  function drawGustHint() {
    if (state.mode !== "playing" || !state.firstHit || state.gustUsed || !state.cpu?.alive) return;
    const edge = gustChance();
    ctx.save();
    ctx.globalAlpha = edge > .72 ? .9 : .22 + edge * .45;
    ctx.strokeStyle = edge > .62 ? "rgba(255,240,106,.95)" : "rgba(255,255,255,.55)";
    ctx.lineWidth = 2 + edge * 3;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(state.cpu.x, state.cpu.y, state.cpu.radius * (1.8 + edge * .8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawTop(top) {
    if (!top || !top.alive) return;
    ctx.save();
    ctx.translate(top.x, top.y);
    ctx.rotate(top.spin);
    ctx.shadowColor = top.glow;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 1.04, 0, Math.PI * 2);
    const stormDisc = ctx.createRadialGradient(0, 0, top.radius * .12, 0, 0, top.radius * 1.05);
    stormDisc.addColorStop(0, "rgba(48, 71, 86, .9)");
    stormDisc.addColorStop(.13, "rgba(245, 252, 255, .96)");
    stormDisc.addColorStop(.38, "rgba(255, 255, 255, .88)");
    stormDisc.addColorStop(.72, top.kind === "player" ? "rgba(139, 225, 246, .9)" : "rgba(255, 162, 204, .9)");
    stormDisc.addColorStop(1, top.kind === "player" ? "rgba(15, 88, 120, .8)" : "rgba(119, 18, 73, .8)");
    ctx.fillStyle = stormDisc;
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < 9; i += 1) {
      ctx.rotate((Math.PI * 2) / 9);
      ctx.beginPath();
      ctx.moveTo(top.radius * .16, -top.radius * .02);
      ctx.bezierCurveTo(top.radius * .55, -top.radius * .38, top.radius * 1.15, -top.radius * .22, top.radius * 1.55, -top.radius * .03);
      ctx.bezierCurveTo(top.radius * 1.04, top.radius * .16, top.radius * .58, top.radius * .18, top.radius * .16, top.radius * .02);
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,.88)" : top.kind === "player" ? "rgba(217, 248, 255, .72)" : "rgba(255, 224, 240, .72)";
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, top.radius * (.42 + i * .18), Math.PI * .12, Math.PI * 1.72);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, top.radius * .2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(42, 65, 78, .94)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * .085, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(247,253,255,.95)";
    ctx.fill();

    ctx.rotate(-top.spin);
    ctx.fillStyle = "rgba(3, 18, 29, .68)";
    ctx.fillRect(-26, -top.radius - 25, 52, 17);
    ctx.strokeStyle = top.kind === "player" ? "rgba(40,215,255,.7)" : "rgba(255,79,143,.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-26, -top.radius - 25, 52, 17);
    ctx.fillStyle = "rgba(245,252,255,.9)";
    ctx.font = "900 9px Helvetica Neue, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const basePressure = top.kind === "player" ? 950 : 965;
    const weaken = Math.max(0, top.maxEnergy - top.energy);
    ctx.fillText(`${basePressure + Math.round(weaken * .42)}hPa`, 0, -top.radius - 16);
    ctx.restore();
  }

  function drawSparks() {
    ctx.save();
    state.sparks.forEach((spark) => {
      spark.x += spark.vx * .016;
      spark.y += spark.vy * .016;
      spark.vx *= .94;
      spark.vy *= .94;
      ctx.globalAlpha = Math.max(0, spark.life * 2.8);
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > .5 ? "#c9fbff" : "#ffd76a";
      ctx.fill();
    });
    ctx.restore();
  }

  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function near(top, point) {
    return top && length(top.x - point.x, top.y - point.y) <= top.radius * 1.8;
  }

  function normalize(v) {
    const l = Math.max(.001, length(v.x, v.y));
    return { x: v.x / l, y: v.y / l };
  }

  function length(x, y) {
    return Math.hypot(x, y);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode !== "aiming" || state.player.launched) return;
    const p = pointer(event);
    if (!near(state.player, p)) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.drag = p;
    ui.status.textContent = "引っぱって角度と勢いを決める";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.drag) return;
    event.preventDefault();
    state.drag = pointer(event);
    draw();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!state.drag) return;
    event.preventDefault();
    const launched = launch(state.player, state.drag);
    state.drag = null;
    if (!launched) ui.status.textContent = "もう少し大きく引っぱる";
  });

  canvas.addEventListener("pointercancel", () => { state.drag = null; });

  ui.start.addEventListener("click", () => newRound(false));
  ui.gustButton.addEventListener("click", useGust);
  ui.reset.addEventListener("click", () => {
    state.mode = "menu";
    ui.setup.classList.remove("hidden");
    ui.launchPanel.classList.remove("show");
    ui.result.classList.remove("show");
    ui.gustButton.classList.remove("ready", "used");
    state.player = null;
    state.cpu = null;
    draw();
  });
  ui.next.addEventListener("click", () => {
    const resetMatch = state.playerWins >= 3 || state.cpuWins >= 3;
    if (resetMatch) {
      state.round = 1;
      state.playerWins = 0;
      state.cpuWins = 0;
    } else {
      state.round += 1;
    }
    newRound(true);
  });

  window.addEventListener("resize", resize);
  makeChips();
  resize();
})();
