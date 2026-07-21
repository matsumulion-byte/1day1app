(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const COLS = 12, ROWS = 7, CW = 80, CH = 80;
  const $ = (id) => document.getElementById(id);

  const levels = [
    {
      name: '花咲く高原', mission: '希少な花を守り、全員を展望台へ案内せよ',
      spawn: [0, 3], goal: [11, 3], count: 5, interval: 1450,
      stocks: { sign: 3, rope: 3, bridge: 0 },
      water: [], flowers: [[4,2],[5,2],[5,3],[6,3],[6,4],[7,4]], rocks: [[3,1],[8,5]],
      tourists: ['family','camera','family','hiker','camera']
    },
    {
      name: '水鳥の湿原', mission: '木道をつなぎ、湿原を荒らさず渡らせよ',
      spawn: [0, 5], goal: [11, 1], count: 6, interval: 1250,
      stocks: { sign: 3, rope: 2, bridge: 5 },
      water: [[4,1],[4,2],[4,3],[4,4],[4,5],[5,1],[5,2],[5,3],[5,4],[5,5]],
      flowers: [[3,3],[3,4],[6,2],[6,3]], rocks: [[2,2],[8,4],[9,4]],
      tourists: ['camera','family','hiker','family','camera','hiker']
    },
    {
      name: '夕焼けの尾根', mission: 'わが道を行く登山客も、全員安全に導け',
      spawn: [0, 1], goal: [11, 5], count: 7, interval: 1050,
      stocks: { sign: 4, rope: 4, bridge: 2 },
      water: [[6,3],[7,3],[8,3],[6,4],[7,4],[8,4]],
      flowers: [[3,1],[3,2],[4,2],[9,4],[9,5]], rocks: [[2,4],[5,0],[5,1],[10,2]],
      tourists: ['hiker','family','camera','hiker','family','camera','hiker']
    }
  ];

  let levelIndex = 0, level, grid, tourists, selectedTool = 'sign';
  let phase = 'title', prepLeft = 20, gameLeft = 45, lastTime = 0, spawnClock = 0, spawned = 0;
  let nature = 100, happy = 100, arrived = 0, failed = 0, animationId, prepTimer;
  let soundOn = true, audioCtx;

  function makeGrid() {
    grid = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => ({
      terrain: 'grass', object: null, dir: 0, trampled: false, x, y
    })));
    level.water.forEach(([x,y]) => grid[y][x].terrain = 'water');
    level.flowers.forEach(([x,y]) => grid[y][x].terrain = 'flower');
    level.rocks.forEach(([x,y]) => grid[y][x].terrain = 'rock');
    const [sx,sy] = level.spawn, [gx,gy] = level.goal;
    grid[sy][sx].terrain = 'spawn'; grid[gy][gx].terrain = 'goal';
  }

  function setupLevel(index) {
    levelIndex = index % levels.length;
    level = JSON.parse(JSON.stringify(levels[levelIndex]));
    makeGrid(); tourists = []; phase = 'prep'; prepLeft = 20; gameLeft = 45;
    spawned = 0; arrived = 0; failed = 0; nature = 100; happy = 100; spawnClock = 0;
    selectedTool = 'sign';
    document.querySelectorAll('.tool').forEach(b => b.classList.toggle('selected', b.dataset.tool === selectedTool));
    $('levelNumber').textContent = String(levelIndex + 1).padStart(2, '0');
    $('missionText').textContent = level.mission;
    $('totalCount').textContent = level.count;
    $('savedCount').textContent = '0';
    $('resultScreen').classList.add('hidden');
    $('goButton').disabled = false;
    $('goButton').querySelector('strong').textContent = '観光客を入園させる';
    $('phaseHint').textContent = '道具を選んでマスに置こう';
    updateStocks(); updateMeters(); startPrepTimer(); draw();
  }

  function startPrepTimer() {
    clearInterval(prepTimer);
    $('timerText').textContent = `準備 ${prepLeft}`;
    prepTimer = setInterval(() => {
      if (phase !== 'prep') return clearInterval(prepTimer);
      prepLeft--; $('timerText').textContent = `準備 ${prepLeft}`;
      if (prepLeft <= 0) beginRun();
    }, 1000);
  }

  function beginRun() {
    if (phase !== 'prep') return;
    phase = 'run'; clearInterval(prepTimer); lastTime = performance.now();
    $('timerText').textContent = `残り ${gameLeft}`;
    $('phaseHint').textContent = '見守ろう。道具は途中でも置ける！';
    $('goButton').disabled = true;
    document.querySelectorAll('.tool').forEach(b => b.disabled = b.dataset.tool === 'erase');
    beep(420, .07); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(loop);
  }

  function finish() {
    if (phase === 'result') return;
    phase = 'result'; clearInterval(prepTimer); cancelAnimationFrame(animationId);
    const score = nature * .5 + happy * .25 + (arrived / level.count * 100) * .25;
    const grade = score >= 92 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : 'C';
    const success = arrived >= Math.ceil(level.count * .6) && nature >= 50;
    $('resultGrade').textContent = grade;
    $('resultKicker').textContent = success ? 'MISSION COMPLETE' : 'RANGER REPORT';
    $('resultTitle').textContent = success ? (nature >= 90 ? '自然を守りました！' : 'なんとか守りました！') : 'もう一度、作戦会議。';
    $('resultDetail').textContent = `自然保護率 ${Math.round(nature)}% ／ ${arrived}人到着`;
    $('nextButton').textContent = levelIndex === levels.length - 1 ? '最初のエリアへ' : '次のエリアへ';
    $('nextButton').style.display = success ? '' : 'none';
    $('resultScreen').classList.remove('hidden');
    document.querySelectorAll('.tool').forEach(b => b.disabled = false);
    beep(success ? 660 : 180, .18);
  }

  function spawnTourist() {
    const [x,y] = level.spawn;
    const type = level.tourists[spawned] || 'family';
    tourists.push({ x: x + .5, y: y + .5, cx:x, cy:y, tx:x, ty:y, progress:1, type, state:'walk', wait:0, dir:[1,0], id:spawned });
    spawned++;
  }

  function loop(now) {
    if (phase !== 'run') return;
    const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now;
    spawnClock += dt * 1000;
    if (spawned < level.count && (spawned === 0 || spawnClock >= level.interval)) { spawnTourist(); spawnClock = 0; }
    gameLeft = Math.max(0, gameLeft - dt);
    $('timerText').textContent = `残り ${Math.ceil(gameLeft)}`;
    tourists.forEach(t => updateTourist(t, dt));
    updateMeters(); draw();
    if ((arrived + failed >= level.count && spawned >= level.count) || gameLeft <= 0) finish();
    else animationId = requestAnimationFrame(loop);
  }

  function updateTourist(t, dt) {
    if (t.state === 'done' || t.state === 'lost') return;
    if (t.wait > 0) { t.wait -= dt; return; }
    if (t.progress >= 1) {
      t.cx = t.tx; t.cy = t.ty; t.x = t.cx + .5; t.y = t.cy + .5;
      const cell = grid[t.cy] && grid[t.cy][t.cx];
      if (!cell) { t.state='lost'; failed++; happy -= 15; return; }
      if (cell.terrain === 'goal') { t.state='done'; arrived++; happy = Math.min(100, happy + 2); $('savedCount').textContent = arrived; beep(720, .04); return; }
      if (cell.terrain === 'flower' && !cell.trampled) { cell.trampled = true; nature -= t.type === 'hiker' ? 15 : 10; beep(130, .05); }
      if (cell.terrain === 'water' && cell.object !== 'bridge') { t.state='lost'; failed++; happy -= 18; return; }
      if (t.type === 'camera' && (cell.terrain === 'flower' || ((t.cx + t.cy) % 8 === 0))) t.wait = .45;
      const next = chooseNext(t, cell);
      if (!next) { t.wait = .25; happy -= dt * .8; return; }
      t.tx = next[0]; t.ty = next[1]; t.dir = [t.tx-t.cx, t.ty-t.cy]; t.progress = 0;
    }
    const speed = t.type === 'hiker' ? 1.45 : t.type === 'camera' ? .92 : 1.12;
    t.progress = Math.min(1, t.progress + dt * speed);
    const ease = t.progress * t.progress * (3 - 2 * t.progress);
    t.x = t.cx + .5 + (t.tx - t.cx) * ease; t.y = t.cy + .5 + (t.ty - t.cy) * ease;
  }

  function chooseNext(t, cell) {
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    if (cell.object === 'sign') {
      const d = dirs[cell.dir];
      if (canEnter(t.cx+d[0], t.cy+d[1], t)) return [t.cx+d[0], t.cy+d[1]];
    }
    let candidates = dirs.map(d => [t.cx+d[0], t.cy+d[1]])
      .filter(([x,y]) => canEnter(x,y,t) && !(x === t.cx-t.dir[0] && y === t.cy-t.dir[1]));
    if (!candidates.length) candidates = dirs.map(d => [t.cx+d[0], t.cy+d[1]]).filter(([x,y]) => canEnter(x,y,t));
    const [gx,gy] = level.goal;
    candidates.sort((a,b) => {
      const ca=grid[a[1]][a[0]], cb=grid[b[1]][b[0]];
      const riskA = ca.terrain === 'flower' ? (t.type === 'hiker' ? 0 : 2.5) : 0;
      const riskB = cb.terrain === 'flower' ? (t.type === 'hiker' ? 0 : 2.5) : 0;
      return (Math.abs(a[0]-gx)+Math.abs(a[1]-gy)+riskA) - (Math.abs(b[0]-gx)+Math.abs(b[1]-gy)+riskB);
    });
    return candidates[0] || null;
  }

  function canEnter(x,y,t) {
    if (x<0||x>=COLS||y<0||y>=ROWS) return false;
    const c=grid[y][x];
    if (c.terrain==='rock' || c.object==='rope') return false;
    if (c.terrain==='water' && c.object!=='bridge') return t.type === 'hiker';
    return true;
  }

  function placeAt(x,y) {
    if (phase !== 'prep' && phase !== 'run') return;
    const c=grid[y]?.[x]; if (!c || c.terrain==='spawn' || c.terrain==='goal' || c.terrain==='rock') return;
    if (selectedTool === 'erase') {
      if (c.object) { level.stocks[c.object]++; c.object=null; c.dir=0; beep(260,.03); }
    } else if (selectedTool === 'sign' && c.object === 'sign') {
      c.dir=(c.dir+1)%4; beep(500,.025);
    } else {
      if (level.stocks[selectedTool] <= 0 || c.object) return;
      if (selectedTool==='bridge' && c.terrain!=='water') return;
      if (selectedTool!=='bridge' && c.terrain==='water') return;
      c.object=selectedTool; c.dir=0; level.stocks[selectedTool]--; beep(360,.04);
    }
    updateStocks(); draw();
  }

  function updateStocks() {
    ['sign','rope','bridge'].forEach(k => {
      $(k+'Stock').textContent = `× ${level.stocks[k]}`;
      const btn=document.querySelector(`[data-tool="${k}"]`);
      btn.classList.toggle('empty', level.stocks[k] <= 0);
    });
  }
  function updateMeters() {
    nature=Math.max(0,nature); happy=Math.max(0,Math.min(100,happy));
    $('natureValue').textContent=`${Math.round(nature)}%`; $('happyValue').textContent=`${Math.round(happy)}%`;
    $('natureMeter').style.width=`${nature}%`; $('happyMeter').style.width=`${happy}%`;
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) drawCell(grid[y][x]);
    tourists.forEach(drawTourist);
    ctx.strokeStyle='rgba(23,62,50,.08)'; ctx.lineWidth=1;
    for(let x=1;x<COLS;x++){ctx.beginPath();ctx.moveTo(x*CW,0);ctx.lineTo(x*CW,canvas.height);ctx.stroke();}
    for(let y=1;y<ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*CH);ctx.lineTo(canvas.width,y*CH);ctx.stroke();}
  }

  function drawCell(c) {
    const px=c.x*CW, py=c.y*CH, seed=c.x*31+c.y*17;
    const colors={grass:['#8dbc7d','#84b675'],water:['#72aeb1','#66a4aa'],flower:['#9ac17e','#90b875'],rock:['#7a8c78','#708273'],spawn:['#d8be78','#cfb36b'],goal:['#dfaa55','#d49d49']};
    ctx.fillStyle=colors[c.terrain][seed%2]; ctx.fillRect(px,py,CW,CH);
    if(c.terrain==='grass'||c.terrain==='flower'){
      ctx.fillStyle='rgba(32,91,58,.18)';
      for(let i=0;i<3;i++){const gx=px+12+((seed+i*23)%58), gy=py+16+((seed*3+i*17)%50);ctx.fillRect(gx,gy,2,7);}
    }
    if(c.terrain==='water'){
      ctx.strokeStyle='rgba(232,248,232,.45)';ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(px+20+i*22,py+23+(i%2)*23,9,Math.PI*.1,Math.PI*.9);ctx.stroke();}
    }
    if(c.terrain==='flower'){
      if(c.trampled){ctx.fillStyle='rgba(71,66,42,.42)';ctx.fillRect(px,py,CW,CH);}
      else for(let i=0;i<5;i++) flower(px+14+(i*13+seed)%58,py+18+(i*19+seed)%48,i%2?'#f5d759':'#f5eee0');
    }
    if(c.terrain==='rock'){
      ctx.fillStyle='#586b5e';ctx.beginPath();ctx.moveTo(px+12,py+64);ctx.lineTo(px+26,py+22);ctx.lineTo(px+50,py+10);ctx.lineTo(px+70,py+58);ctx.closePath();ctx.fill();
      ctx.fillStyle='#839487';ctx.beginPath();ctx.moveTo(px+26,py+22);ctx.lineTo(px+50,py+10);ctx.lineTo(px+55,py+31);ctx.closePath();ctx.fill();
    }
    if(c.terrain==='spawn'){
      ctx.fillStyle='#fff8dc';ctx.fillRect(px+9,py+19,45,38);ctx.fillStyle='#173e32';ctx.font='900 13px sans-serif';ctx.fillText('入口',px+18,py+43);
      ctx.fillStyle='#744c2d';ctx.fillRect(px+12,py+55,5,19);ctx.fillRect(px+48,py+55,5,19);
    }
    if(c.terrain==='goal'){
      ctx.fillStyle='#6e4931';ctx.fillRect(px+12,py+48,56,8);ctx.fillRect(px+17,py+56,7,20);ctx.fillRect(px+56,py+56,7,20);
      ctx.fillStyle='#fff9df';ctx.font='900 11px sans-serif';ctx.fillText('絶 景',px+25,py+37);
    }
    if(c.object==='bridge'){
      ctx.fillStyle='#9b6b3f';ctx.fillRect(px+4,py+17,72,47);ctx.strokeStyle='#d8b171';ctx.lineWidth=3;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(px+8+i*12,py+20);ctx.lineTo(px+8+i*12,py+61);ctx.stroke();}
    }
    if(c.object==='rope'){
      ctx.fillStyle='#5b3f2a';ctx.fillRect(px+13,py+18,5,48);ctx.fillRect(px+63,py+18,5,48);ctx.strokeStyle='#e9e0bf';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(px+16,py+28);ctx.quadraticCurveTo(px+41,py+48,px+65,py+28);ctx.stroke();
      ctx.fillStyle='#cf513a';ctx.fillRect(px+27,py+28,28,20);ctx.fillStyle='white';ctx.font='900 12px sans-serif';ctx.fillText('STOP',px+28,py+42);
    }
    if(c.object==='sign'){
      const angle=c.dir*Math.PI/2;
      ctx.save();ctx.translate(px+40,py+40);ctx.rotate(angle);ctx.fillStyle='#6c462c';ctx.fillRect(-3,-5,6,34);ctx.fillStyle='#e76e37';ctx.beginPath();ctx.moveTo(-27,-22);ctx.lineTo(10,-22);ctx.lineTo(29,-10);ctx.lineTo(10,2);ctx.lineTo(-27,2);ctx.closePath();ctx.fill();ctx.restore();
    }
  }

  function flower(x,y,color){ctx.strokeStyle='#3f7650';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(x,y+15);ctx.stroke();ctx.fillStyle=color;for(let a=0;a<4;a++){ctx.beginPath();ctx.arc(x+Math.cos(a*Math.PI/2)*3,y+Math.sin(a*Math.PI/2)*3,3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#e7a63c';ctx.fillRect(x-1,y-1,2,2);}

  function drawTourist(t) {
    if(t.state==='done'||t.state==='lost')return;
    const x=t.x*CW,y=t.y*CH;ctx.save();ctx.translate(x,y);
    const bob=Math.sin((performance.now()/100)+t.id)*2;
    ctx.fillStyle='rgba(28,55,43,.22)';ctx.beginPath();ctx.ellipse(0,25,14,5,0,0,Math.PI*2);ctx.fill();
    ctx.translate(0,bob);ctx.fillStyle=t.type==='hiker'?'#df6b37':t.type==='camera'?'#e7b83f':'#3d7391';ctx.fillRect(-10,-1,20,23);
    ctx.fillStyle='#f0c69d';ctx.beginPath();ctx.arc(0,-10,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=t.type==='hiker'?'#d84f35':'#f4e3bc';ctx.beginPath();ctx.arc(0,-13,11,Math.PI,0);ctx.fill();
    ctx.strokeStyle='#30483d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-5,22);ctx.lineTo(-7,31);ctx.moveTo(5,22);ctx.lineTo(7,31);ctx.stroke();
    if(t.type==='camera'){ctx.fillStyle='#263a35';ctx.fillRect(-8,1,16,10);ctx.fillStyle='#9cc6c3';ctx.beginPath();ctx.arc(0,6,3,0,Math.PI*2);ctx.fill();}
    if(t.type==='hiker'){ctx.fillStyle='#58422f';ctx.fillRect(-16,0,7,18);}
    ctx.restore();
  }

  function beep(freq,duration){if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.05,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}}

  function pointerCell(e){const rect=canvas.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return [Math.floor((p.clientX-rect.left)/rect.width*COLS),Math.floor((p.clientY-rect.top)/rect.height*ROWS)];}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const[x,y]=pointerCell(e);placeAt(x,y);});
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('button') || e.target === canvas) e.preventDefault();
  });
  document.querySelectorAll('.tool').forEach(btn=>btn.addEventListener('click',()=>{selectedTool=btn.dataset.tool;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('selected',b===btn));beep(300,.025);}));
  $('startButton').addEventListener('click',()=>{$('startScreen').classList.add('hidden');setupLevel(0);});
  $('goButton').addEventListener('click',beginRun);
  $('retryButton').addEventListener('click',()=>setupLevel(levelIndex));
  $('nextButton').addEventListener('click',()=>setupLevel((levelIndex+1)%levels.length));
  $('soundButton').addEventListener('click',()=>{soundOn=!soundOn;$('soundButton').classList.toggle('muted',!soundOn);if(soundOn)beep(500,.04);});
  window.addEventListener('resize',draw);

  level=JSON.parse(JSON.stringify(levels[0]));makeGrid();tourists=[];draw();
})();
