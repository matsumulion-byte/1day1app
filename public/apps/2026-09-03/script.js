(() => {
  'use strict';

  const COLS = 6;
  const ROWS = 12;
  const COLORS = [
    { name: 'ぶどう', main: '#9149d8', dark: '#55208f', light: '#d9a7ff' },
    { name: 'いちご', main: '#f34b65', dark: '#b51d42', light: '#ffadb7' },
    { name: 'レモン', main: '#ffd43d', dark: '#d59616', light: '#fff3a0' },
    { name: 'ソーダ', main: '#43b7ed', dark: '#1479bc', light: '#a6e8ff' },
    { name: 'マスカット', main: '#56c976', dark: '#218b4d', light: '#b9f4bd' }
  ];
  const DIRECTIONS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');
  const gameArea = document.getElementById('gameArea');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const bestChainEl = document.getElementById('bestChain');
  const gameChainEl = document.getElementById('gameChain');
  const chainText = document.getElementById('chainText');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const bgm = document.getElementById('bgm');
  bgm.src = '/assets/audio/bgm.mp3';

  const state = {
    board: [], piece: null, queue: [], particles: [], ripples: [],
    score: 0, maxChain: 0, highScore: Number(localStorage.getItem('gumi-high-score')) || 0,
    bestChain: Number(localStorage.getItem('gumi-best-chain')) || 0,
    phase: 'title', lastTime: 0, dropTimer: 0, lockTimer: 0,
    softDrop: false, bgmOn: true, voiceOn: true, voice: null, shakePower: 0
  };

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const randomPair = () => [Math.floor(Math.random() * COLORS.length), Math.floor(Math.random() * COLORS.length)];
  const format = n => n.toLocaleString('ja-JP');

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function updateHud() {
    scoreEl.textContent = format(state.score);
    highScoreEl.textContent = format(state.highScore);
    bestChainEl.textContent = state.bestChain;
    gameChainEl.textContent = state.maxChain;
  }

  function startGame() {
    state.board = emptyBoard();
    state.particles = [];
    state.ripples = [];
    state.score = 0;
    state.maxChain = 0;
    state.dropTimer = 0;
    state.lockTimer = 0;
    state.queue = [randomPair(), randomPair(), randomPair()];
    state.phase = 'falling';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    updateHud();
    spawnPiece();
    drawNext();
    startBgm();
  }

  function spawnPiece() {
    const colors = state.queue.shift();
    state.queue.push(randomPair());
    state.piece = { x: 2, y: 1, rotation: 0, colors, born: performance.now(), bumps: [0, 0] };
    state.dropTimer = 0;
    state.lockTimer = 0;
    drawNext();
    if (!canPlace(state.piece.x, state.piece.y, state.piece.rotation)) endGame();
  }

  function pieceCells(x = state.piece.x, y = state.piece.y, rotation = state.piece.rotation) {
    const d = DIRECTIONS[rotation];
    return [{ x, y, color: state.piece.colors[0], index: 0 }, { x: x + d.x, y: y + d.y, color: state.piece.colors[1], index: 1 }];
  }

  function canPlace(x, y, rotation) {
    return pieceCells(x, y, rotation).every(cell => cell.x >= 0 && cell.x < COLS && cell.y < ROWS && (cell.y < 0 || !state.board[cell.y][cell.x]));
  }

  function move(dx, dy, manual = false) {
    if (state.phase !== 'falling' || !state.piece) return false;
    if (canPlace(state.piece.x + dx, state.piece.y + dy, state.piece.rotation)) {
      state.piece.x += dx;
      state.piece.y += dy;
      if (dy > 0 && manual) state.score += 1;
      if (dy === 0) state.piece.bumps = [performance.now(), performance.now()];
      state.lockTimer = 0;
      updateHud();
      return true;
    }
    return false;
  }

  function rotate() {
    if (state.phase !== 'falling' || !state.piece) return;
    const next = (state.piece.rotation + 1) % 4;
    const kicks = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -2, y: 0 }, { x: 2, y: 0 }];
    for (const kick of kicks) {
      if (canPlace(state.piece.x + kick.x, state.piece.y + kick.y, next)) {
        state.piece.x += kick.x;
        state.piece.y += kick.y;
        state.piece.rotation = next;
        state.piece.bumps = [performance.now(), performance.now()];
        state.lockTimer = 0;
        return;
      }
    }
  }

  function hardDropStep() {
    if (!move(0, 1, true)) state.lockTimer += 90;
  }

  async function lockPiece() {
    if (state.phase !== 'falling') return;
    state.phase = 'resolving';
    const now = performance.now();
    let overflow = false;
    pieceCells().forEach(cell => {
      if (cell.y < 0) overflow = true;
      else state.board[cell.y][cell.x] = { color: cell.color, landedAt: now, clearingAt: 0 };
    });
    state.piece = null;
    if (overflow) { endGame(); return; }
    // Once the pair locks, each gummy becomes independent. This lets one half
    // of a horizontal pair drop into a gap instead of floating beside its mate.
    const dropped = applyGravity();
    await wait(dropped ? 380 : 260);
    await resolveBoard();
    if (state.phase === 'gameover') return;
    state.phase = 'falling';
    spawnPiece();
  }

  function findGroups() {
    const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const groups = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!state.board[y][x] || seen[y][x]) continue;
      const color = state.board[y][x].color;
      const stack = [{ x, y }];
      const group = [];
      seen[y][x] = true;
      while (stack.length) {
        const cell = stack.pop();
        group.push(cell);
        [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].forEach(d => {
          const nx = cell.x + d.x, ny = cell.y + d.y;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !seen[ny][nx] && state.board[ny][nx]?.color === color) {
            seen[ny][nx] = true;
            stack.push({ x: nx, y: ny });
          }
        });
      }
      if (group.length >= 4) groups.push(group);
    }
    return groups;
  }

  async function resolveBoard() {
    let chain = 0;
    while (true) {
      const groups = findGroups();
      if (!groups.length) break;
      chain++;
      const cells = groups.flat();
      const started = performance.now();
      cells.forEach(({ x, y }) => state.board[y][x].clearingAt = started);
      if (chain >= 2) showChain(chain);
      playVoice(chain);
      state.score += cells.length * 100 * chain * chain + Math.max(0, groups.length - 1) * 500 * chain;
      state.maxChain = Math.max(state.maxChain, chain);
      updateHud();
      await wait(620);
      cells.forEach(({ x, y }) => {
        const gum = state.board[y][x];
        if (gum) burst(x, y, gum.color, chain);
        state.board[y][x] = null;
      });
      state.shakePower = Math.min(12, 2 + chain * 2);
      gameArea.classList.remove('shake');
      void gameArea.offsetWidth;
      gameArea.classList.add('shake');
      await wait(100);
      applyGravity();
      await wait(250 + Math.min(200, chain * 25));
    }
  }

  function applyGravity() {
    const now = performance.now();
    let moved = false;
    for (let x = 0; x < COLS; x++) {
      let target = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (!state.board[y][x]) continue;
        const gum = state.board[y][x];
        if (target !== y) {
          moved = true;
          state.board[target][x] = gum;
          state.board[y][x] = null;
          gum.fallFrom = y;
          gum.fallStarted = now;
          gum.fallDuration = Math.min(300, 80 + (target - y) * 45);
          gum.landedAt = now + gum.fallDuration;
        }
        target--;
      }
    }
    return moved;
  }

  function showChain(chain) {
    chainText.textContent = `${chain} CHAIN!`;
    chainText.style.fontSize = `${Math.min(68, 34 + chain * 5)}px`;
    chainText.classList.remove('show');
    void chainText.offsetWidth;
    chainText.classList.add('show');
  }

  function burst(x, y, color, chain) {
    const count = Math.min(18, 7 + chain * 2);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * (100 + chain * 15);
      state.particles.push({ x: x + .5, y: y + .5, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 40, color, born: performance.now(), life: 500 + Math.random() * 350, size: 2 + Math.random() * 5 });
    }
    state.ripples.push({ x: x + .5, y: y + .5, color, born: performance.now() });
  }

  function endGame() {
    if (state.phase === 'gameover') return;
    state.phase = 'gameover';
    state.softDrop = false;
    const newRecord = state.score > state.highScore || state.maxChain > state.bestChain;
    state.highScore = Math.max(state.highScore, state.score);
    state.bestChain = Math.max(state.bestChain, state.maxChain);
    localStorage.setItem('gumi-high-score', state.highScore);
    localStorage.setItem('gumi-best-chain', state.bestChain);
    updateHud();
    document.getElementById('finalScore').textContent = format(state.score);
    document.getElementById('finalChain').textContent = state.maxChain;
    document.getElementById('recordBadge').classList.toggle('hidden', !newRecord);
    setTimeout(() => gameOverScreen.classList.remove('hidden'), 400);
  }

  function startBgm() {
    if (!state.bgmOn) return;
    bgm.volume = 0.28;
    bgm.play().catch(() => {});
  }

  function playVoice(chain) {
    if (!state.voiceOn) return;
    if (state.voice) { state.voice.pause(); state.voice.currentTime = 0; }
    const voicePath = chain <= 5
      ? `/assets/audio/chain_${chain}.m4a`
      : '/assets/audio/chain_6.mp3';
    state.voice = new Audio(voicePath);
    state.voice.volume = 0.9;
    state.voice.play().catch(() => {});
  }

  function toggleSound(kind) {
    if (kind === 'bgm') {
      state.bgmOn = !state.bgmOn;
      if (state.bgmOn && state.phase !== 'title') startBgm(); else bgm.pause();
      setToggle(document.getElementById('bgmToggle'), state.bgmOn);
    } else {
      state.voiceOn = !state.voiceOn;
      if (!state.voiceOn && state.voice) { state.voice.pause(); state.voice.currentTime = 0; }
      setToggle(document.getElementById('voiceToggle'), state.voiceOn);
    }
  }

  function setToggle(button, on) {
    button.setAttribute('aria-pressed', String(on));
    button.querySelector('b').textContent = on ? 'ON' : 'OFF';
  }

  function gummyPath(context, cx, cy, size, sx = 1, sy = 1) {
    const w = size * .78 * sx, h = size * .72 * sy;
    const x = cx - w / 2, y = cy - h / 2;
    const r = Math.min(w, h) * .25;
    context.beginPath();
    context.moveTo(x + r, y);
    context.bezierCurveTo(x + w * .35, y - h * .04, x + w * .65, y - h * .04, x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.bezierCurveTo(x + w * .65, y + h * 1.04, x + w * .35, y + h * 1.04, x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawGummy(context, cx, cy, size, colorIndex, sx = 1, sy = 1, alpha = 1, rotation = 0) {
    const color = COLORS[colorIndex];
    context.save();
    context.translate(cx, cy);
    context.rotate(rotation);
    context.translate(-cx, -cy);
    context.globalAlpha = alpha;
    context.shadowColor = color.dark + '77';
    context.shadowBlur = size * .13;
    context.shadowOffsetY = size * .1;
    gummyPath(context, cx, cy, size, sx, sy);
    const grad = context.createLinearGradient(cx - size * .3, cy - size * .35, cx + size * .3, cy + size * .35);
    grad.addColorStop(0, color.light); grad.addColorStop(.22, color.main); grad.addColorStop(1, color.dark);
    context.fillStyle = grad; context.fill();
    context.shadowColor = 'transparent';
    gummyPath(context, cx, cy, size * .84, sx, sy);
    const inner = context.createRadialGradient(cx - size * .18, cy - size * .18, 1, cx, cy, size * .42);
    inner.addColorStop(0, 'rgba(255,255,255,.48)'); inner.addColorStop(.3, 'rgba(255,255,255,.08)'); inner.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = inner; context.fill();
    context.beginPath();
    context.ellipse(cx - size * .16, cy - size * .2, size * .12 * sx, size * .07 * sy, -.45, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,255,255,.72)'; context.fill();
    context.restore();
  }

  function drawConnection(context, x1, y1, x2, y2, size, colorIndex, alpha = 1) {
    const color = COLORS[colorIndex];
    const horizontal = y1 === y2;
    const width = horizontal ? Math.abs(x2 - x1) + size * .14 : size * .48;
    const height = horizontal ? size * .48 : Math.abs(y2 - y1) + size * .14;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const gradient = context.createLinearGradient(cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2);
    gradient.addColorStop(0, color.main);
    gradient.addColorStop(1, color.dark);
    context.save();
    context.globalAlpha = .72 * alpha;
    context.fillStyle = gradient;
    context.beginPath();
    const left = cx - width / 2, top = cy - height / 2, radius = Math.min(size * .2, width / 2, height / 2);
    context.moveTo(left + radius, top);
    context.lineTo(left + width - radius, top);
    context.quadraticCurveTo(left + width, top, left + width, top + radius);
    context.lineTo(left + width, top + height - radius);
    context.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
    context.lineTo(left + radius, top + height);
    context.quadraticCurveTo(left, top + height, left, top + height - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawBoard(time) {
    const w = canvas.width, h = canvas.height, cell = w / COLS;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(255,255,255,.34)'); bg.addColorStop(1, 'rgba(71,43,83,.14)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell); ctx.stroke(); }

    // Render same-color neighbors as one soft cluster. Bridges sit underneath
    // the individual highlights, preserving the gummy volume at every cell.
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const gum = state.board[y]?.[x];
      if (!gum) continue;
      if (gum.landedAt > time) continue;
      const alpha = gum.clearingAt ? Math.max(0, 1 - Math.max(0, (time - gum.clearingAt - 480) / 140)) : 1;
      if (x + 1 < COLS && state.board[y][x + 1]?.color === gum.color) {
        drawConnection(ctx, (x + .5) * cell, (y + .5) * cell, (x + 1.5) * cell, (y + .5) * cell, cell, gum.color, alpha);
      }
      if (y + 1 < ROWS && state.board[y + 1][x]?.color === gum.color) {
        drawConnection(ctx, (x + .5) * cell, (y + .5) * cell, (x + .5) * cell, (y + 1.5) * cell, cell, gum.color, alpha);
      }
    }

    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const gum = state.board[y]?.[x];
      if (!gum) continue;
      let sx = 1, sy = 1, alpha = 1, rot = 0;
      let displayY = y;
      if (gum.fallStarted && time < gum.landedAt) {
        const fallT = Math.max(0, Math.min(1, (time - gum.fallStarted) / gum.fallDuration));
        displayY = gum.fallFrom + (y - gum.fallFrom) * fallT * fallT;
      }
      const landAge = time - gum.landedAt;
      if (landAge >= 0 && landAge < 300) {
        const t = landAge / 300;
        const bounce = Math.sin(t * Math.PI * 3) * (1 - t);
        sx = 1 + bounce * .22; sy = 1 - bounce * .25;
      }
      if (gum.clearingAt) {
        const t = Math.min(1, (time - gum.clearingAt) / 620);
        const grow = 1 + Math.min(t / .45, 1) * .2;
        sx = grow; sy = grow;
        rot = Math.sin(t * 55 + x) * .09 * Math.min(1, t * 4);
        if (t > .78) alpha = 1 - (t - .78) / .22;
      }
      drawGummy(ctx, (x + .5) * cell, (displayY + .5) * cell, cell * .94, gum.color, sx, sy, alpha, rot);
    }

    if (state.piece) {
      const activeCells = pieceCells();
      if (activeCells[0].color === activeCells[1].color && activeCells.every(cellData => cellData.y >= 0)) {
        drawConnection(ctx, (activeCells[0].x + .5) * cell, (activeCells[0].y + .5) * cell, (activeCells[1].x + .5) * cell, (activeCells[1].y + .5) * cell, cell, activeCells[0].color);
      }
      activeCells.forEach(cellData => {
        if (cellData.y < 0) return;
        const bumpAge = time - state.piece.bumps[cellData.index];
        const pulse = bumpAge >= 0 && bumpAge < 160 ? Math.sin(bumpAge / 160 * Math.PI) * .09 : 0;
        drawGummy(ctx, (cellData.x + .5) * cell, (cellData.y + .5) * cell, cell * .94, cellData.color, 1 + pulse, 1 - pulse);
      });
    }
    drawEffects(time, cell);
  }

  function drawEffects(time, cell) {
    state.ripples = state.ripples.filter(r => time - r.born < 420);
    state.ripples.forEach(r => {
      const t = (time - r.born) / 420;
      ctx.beginPath(); ctx.arc(r.x * cell, r.y * cell, cell * (.2 + t * .75), 0, Math.PI * 2);
      ctx.strokeStyle = COLORS[r.color].light; ctx.globalAlpha = 1 - t; ctx.lineWidth = 5 * (1 - t); ctx.stroke(); ctx.globalAlpha = 1;
    });
    state.particles = state.particles.filter(p => time - p.born < p.life);
    state.particles.forEach(p => {
      const age = (time - p.born) / 1000;
      const t = (time - p.born) / p.life;
      const px = p.x * cell + p.vx * age, py = p.y * cell + p.vy * age + 180 * age * age;
      ctx.beginPath(); ctx.arc(px, py, p.size * (1 - t * .5), 0, Math.PI * 2);
      ctx.fillStyle = COLORS[p.color].main; ctx.globalAlpha = 1 - t; ctx.fill(); ctx.globalAlpha = 1;
    });
  }

  function drawNext() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = nextCanvas.getBoundingClientRect();
    nextCanvas.width = Math.max(150, rect.width * dpr);
    nextCanvas.height = Math.max(66, rect.height * dpr);
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const scale = nextCanvas.width / 150;
    const first = state.queue[0] || [0, 1], second = state.queue[1] || [2, 3];
    drawGummy(nextCtx, 51 * scale, 28 * scale, 39 * scale, first[0]);
    drawGummy(nextCtx, 84 * scale, 28 * scale, 39 * scale, first[1]);
    drawGummy(nextCtx, 117 * scale, 18 * scale, 25 * scale, second[0], 1, 1, .72);
    drawGummy(nextCtx, 132 * scale, 35 * scale, 25 * scale, second[1], 1, 1, .72);
  }

  function resizeCanvas() {
    const rect = gameArea.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    drawNext();
  }

  function gameLoop(time) {
    const dt = Math.min(50, time - (state.lastTime || time));
    state.lastTime = time;
    if (state.phase === 'falling') {
      const interval = state.softDrop ? 55 : Math.max(260, 760 - Math.floor(state.score / 5000) * 35);
      state.dropTimer += dt;
      if (state.dropTimer >= interval) {
        state.dropTimer %= interval;
        if (!move(0, 1, state.softDrop)) state.lockTimer += interval;
      }
      if (!canPlace(state.piece.x, state.piece.y + 1, state.piece.rotation)) {
        state.lockTimer += dt;
        if (state.lockTimer >= 520) lockPiece();
      } else state.lockTimer = 0;
    }
    drawBoard(time);
    requestAnimationFrame(gameLoop);
  }

  const handledKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ']);
  document.addEventListener('keydown', event => {
    if (handledKeys.has(event.key)) event.preventDefault();
    if (event.repeat && event.key !== 'ArrowDown') return;
    if (event.key === 'ArrowLeft') move(-1, 0);
    if (event.key === 'ArrowRight') move(1, 0);
    if (event.key === 'ArrowDown') { state.softDrop = true; hardDropStep(); }
    if (event.key === 'ArrowUp' || event.key === ' ') rotate();
  });
  document.addEventListener('keyup', event => { if (event.key === 'ArrowDown') state.softDrop = false; });

  let touchStart = null;
  let lastSwipe = 0;
  gameArea.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gameArea.setPointerCapture?.(event.pointerId);
    touchStart = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: performance.now(), moved: false };
  });
  gameArea.addEventListener('pointermove', event => {
    if (!touchStart) return;
    event.preventDefault();
    const unit = Math.max(28, gameArea.clientWidth / 7);
    const now = performance.now();
    const dx = event.clientX - touchStart.lastX;
    const dy = event.clientY - touchStart.lastY;
    if (Math.abs(dx) >= unit && Math.abs(dx) > Math.abs(dy) && now - lastSwipe > 70) {
      move(dx > 0 ? 1 : -1, 0); touchStart.lastX = event.clientX; touchStart.moved = true; lastSwipe = now;
    } else if (dy >= unit * .7 && Math.abs(dy) > Math.abs(dx) && now - lastSwipe > 55) {
      hardDropStep(); touchStart.lastY = event.clientY; touchStart.moved = true; lastSwipe = now;
    }
  }, { passive: false });
  function endPointer(event) {
    if (!touchStart) return;
    const dist = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y);
    if (!touchStart.moved && dist < 14 && performance.now() - touchStart.time < 350) rotate();
    touchStart = null;
  }
  gameArea.addEventListener('pointerup', endPointer);
  gameArea.addEventListener('pointercancel', () => { touchStart = null; });
  gameArea.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
  document.addEventListener('touchmove', event => { if (event.target.closest?.('#gameArea')) event.preventDefault(); }, { passive: false });

  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('restartButton').addEventListener('click', startGame);
  document.getElementById('bgmToggle').addEventListener('click', () => toggleSound('bgm'));
  document.getElementById('voiceToggle').addEventListener('click', () => toggleSound('voice'));
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) bgm.pause(); else if (state.bgmOn && state.phase !== 'title') startBgm(); });

  state.board = emptyBoard();
  updateHud();
  resizeCanvas();
  requestAnimationFrame(gameLoop);
})();
