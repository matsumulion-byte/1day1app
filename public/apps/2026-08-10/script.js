(() => {
  'use strict';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const tool = document.getElementById('fileTool');
  const title = document.getElementById('titleScreen');
  const result = document.getElementById('resultScreen');
  const finish = document.getElementById('finishButton');
  const guide = document.getElementById('guide');
  const inspection = document.getElementById('inspection');
  const statusText = document.getElementById('statusText');
  const warning = document.getElementById('warning');
  const pressure = document.getElementById('pressure');
  const strokeCount = document.getElementById('strokeCount');
  const SIZE = 320;
  const material = new Float32Array(SIZE * SIZE);
  const ideal = new Uint8Array(SIZE * SIZE);
  const initial = new Uint8Array(SIZE * SIZE);
  const particles = [];
  let burrProfile = [], dragging = false, playing = false, inspecting = false;
  let pointer = { x: 160, y: 260 }, last = { x: 160, y: 260 }, strokes = 0, raf = 0;
  let audioCtx, noiseBuffer, lastSound = 0, lastVibe = 0;

  function idealAt(x, y) {
    const dx = x - 160, dy = y - 165;
    const r = Math.hypot(dx, dy);
    return r <= 91 && !(Math.abs(dx) < 15 && Math.abs(dy) < 15 && r < 18);
  }

  function createPart() {
    material.fill(0); ideal.fill(0); initial.fill(0); particles.length = 0; strokes = 0;
    burrProfile = Array.from({length: 180}, (_, i) => {
      const group = Math.sin(i * 1.73 + Math.random() * 5) > .54;
      return group ? 5 + Math.random() * 14 : Math.random() * 3.2;
    });
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      if (idealAt(x, y)) ideal[idx] = 1;
      const dx = x - 160, dy = y - 165, r = Math.hypot(dx, dy);
      let exists = ideal[idx] === 1;
      if (!exists && r > 89 && r < 112) {
        let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
        const p = a / (Math.PI * 2) * burrProfile.length;
        const i0 = Math.floor(p) % burrProfile.length, f = p - Math.floor(p);
        const ext = burrProfile[i0] * (1-f) + burrProfile[(i0+1)%burrProfile.length] * f;
        exists = r <= 91 + ext;
      }
      if (exists) { material[idx] = 1; initial[idx] = 1; }
    }
    strokeCount.textContent = '0'; pressure.textContent = '—'; warning.textContent = '輪郭を守れ';
  }

  function resize() {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    draw();
  }

  function toGrid(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX-r.left)/r.width*SIZE, y: (clientY-r.top)/r.height*SIZE };
  }

  function toolScreenPosition(p) {
    const r = canvas.getBoundingClientRect();
    return { x: p.x / SIZE * r.width, y: p.y / SIZE * r.height };
  }

  function moveTool(p, angle = 0) {
    const s = toolScreenPosition(p);
    tool.style.left = `${s.x}px`; tool.style.top = `${s.y}px`;
    tool.style.transform = `translate(-45%,-50%) rotate(${angle}rad)`;
  }

  function erode(a, b) {
    const dx = b.x-a.x, dy = b.y-a.y, distance = Math.hypot(dx,dy);
    if (distance < .4) return;
    const steps = Math.ceil(distance/2), angle = Math.atan2(dy,dx);
    let over = false, removed = 0;
    for (let s=0;s<=steps;s++) {
      const cx=a.x+dx*s/steps, cy=a.y+dy*s/steps;
      for (let oy=-7;oy<=7;oy++) for(let ox=-7;ox<=7;ox++) {
        if ((ox*ox)/49+(oy*oy)/16>1) continue;
        const rx=Math.round(cx+ox*Math.cos(angle)-oy*Math.sin(angle));
        const ry=Math.round(cy+ox*Math.sin(angle)+oy*Math.cos(angle));
        if(rx<0||ry<0||rx>=SIZE||ry>=SIZE) continue;
        const idx=ry*SIZE+rx;
        if(material[idx]>.02){ material[idx]=Math.max(0,material[idx]-.075); removed++; if(ideal[idx]) over=true; }
      }
      if(Math.random()<.38 && removed){ particles.push({x:cx+(Math.random()-.5)*10,y:cy+(Math.random()-.5)*10,vx:(Math.random()-.5)*.8,vy:.3+Math.random(),life:1}); }
    }
    pressure.textContent = over ? '強すぎ' : '適正';
    warning.textContent = over ? '削りすぎ注意' : '良い当たり';
    warning.style.color = over ? 'var(--red)' : 'var(--green)';
    raspSound(over); if(over && navigator.vibrate && performance.now()-lastVibe>250){navigator.vibrate(16);lastVibe=performance.now()}
    draw();
  }

  function initAudio() {
    if(audioCtx) return; audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    noiseBuffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.08,audioCtx.sampleRate);
    const d=noiseBuffer.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  }
  function raspSound(bad) {
    if(!audioCtx||performance.now()-lastSound<70)return; lastSound=performance.now();
    const src=audioCtx.createBufferSource(), filter=audioCtx.createBiquadFilter(), gain=audioCtx.createGain();
    src.buffer=noiseBuffer; filter.type='bandpass'; filter.frequency.value=bad?380:1450; filter.Q.value=1.2; gain.gain.value=bad?.07:.035;
    src.connect(filter).connect(gain).connect(audioCtx.destination); src.start();
  }

  function draw() {
    cancelAnimationFrame(raf);
    const w=canvas.width,h=canvas.height,dpr=Math.min(devicePixelRatio||1,2), sx=w/SIZE,sy=h/SIZE;
    ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,SIZE,SIZE);
    ctx.save();ctx.translate(0,-1);
    ctx.beginPath();ctx.ellipse(160,267,106,15,0,0,Math.PI*2);ctx.fillStyle='#0009';ctx.fill();
    const img=document.createElement('canvas');img.width=SIZE;img.height=SIZE;const ic=img.getContext('2d');
    const data=ic.createImageData(SIZE,SIZE);
    for(let i=0;i<material.length;i++) if(material[i]>.02){
      const x=i%SIZE,y=(i/SIZE)|0, edge = !material[i-1]||!material[i+1]||!material[i-SIZE]||!material[i+SIZE];
      const shine=Math.max(0,Math.min(1,.42+(x-y)*.0018));
      data.data[i*4]=130+shine*80;data.data[i*4+1]=139+shine*78;data.data[i*4+2]=140+shine*74;data.data[i*4+3]=Math.round(255*material[i]);
      if(edge){data.data[i*4]=215;data.data[i*4+1]=221;data.data[i*4+2]=219;}
    }
    ic.putImageData(data,0,0);ctx.shadowColor='#000';ctx.shadowBlur=11;ctx.shadowOffsetY=7;ctx.drawImage(img,0,0);ctx.shadowColor='transparent';
    ctx.beginPath();ctx.arc(160,165,16,0,Math.PI*2);ctx.strokeStyle='#535b5c';ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(160,165,91,0,Math.PI*2);ctx.strokeStyle='#ffffff25';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
    for(const p of particles){ctx.fillStyle=`rgba(205,212,208,${p.life})`;ctx.fillRect(p.x,p.y,1.7,1.7);p.x+=p.vx;p.y+=p.vy;p.life-=.035}
    for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
    ctx.restore();if(particles.length)raf=requestAnimationFrame(draw);
  }

  function showDifference() {
    const w=canvas.width,h=canvas.height,sx=w/SIZE,sy=h/SIZE;ctx.setTransform(sx,0,0,sy,0,0);
    for(let y=0;y<SIZE;y+=2)for(let x=0;x<SIZE;x+=2){const i=y*SIZE+x;let c;
      if(ideal[i]&&material[i]>.5)c='#60d39488';else if(!ideal[i]&&material[i]>.5)c='#35aee7dd';else if(ideal[i]&&material[i]<=.5)c='#ff5b4ddd';
      if(c){ctx.fillStyle=c;ctx.fillRect(x,y,2,2)}
    }
  }

  function score() {
    let idealCount=0,burrInitial=0,burrRemain=0,over=0,match=0;
    for(let i=0;i<material.length;i++){
      if(ideal[i]){idealCount++;if(material[i]>=.5)match++;else over++;}
      else if(initial[i]){burrInitial++;if(material[i]>=.5)burrRemain++;}
    }
    const overPct=over/idealCount*100, burrPct=burrInitial?burrRemain/burrInitial*100:0;
    const accuracy=Math.max(0,100-(over+burrRemain)/(idealCount+burrInitial)*100);
    const total=Math.max(0,100-burrPct*.32-overPct*2.65);
    return {accuracy,burrPct,overPct,total};
  }
  function rankFor(n){if(n>=99.5)return'「バリ取りの神」';if(n>=98)return'「一級バリ取り職人」';if(n>=95)return'「熟練工」';if(n>=90)return'「町工場のエース」';if(n>=80)return'「見習い職人」';return'「削りすぎです」'}

  function begin() {
    initAudio(); if(audioCtx.state==='suspended')audioCtx.resume(); createPart();playing=true;inspecting=false;
    title.classList.add('hidden');result.setAttribute('aria-hidden','true');tool.style.opacity='1';guide.style.opacity='1';finish.disabled=false;statusText.textContent='加工中';draw();moveTool(pointer);
  }
  function finishWork(){
    if(!playing||inspecting)return;playing=false;inspecting=true;dragging=false;tool.style.opacity='0';guide.style.opacity='0';finish.disabled=true;statusText.textContent='検品中';inspection.classList.add('active');showDifference();
    setTimeout(()=>{const s=score();document.getElementById('accuracy').textContent=s.accuracy.toFixed(1)+'%';document.getElementById('burrLeft').textContent=s.burrPct.toFixed(1)+'%';document.getElementById('overCut').textContent=s.overPct.toFixed(1)+'%';document.getElementById('totalScore').textContent=s.total.toFixed(1);document.getElementById('rank').textContent=rankFor(s.total);inspection.classList.remove('active');result.setAttribute('aria-hidden','false');statusText.textContent='検品完了';},2200);
  }

  canvas.addEventListener('pointerdown',e=>{if(!playing)return;e.preventDefault();initAudio();dragging=true;canvas.setPointerCapture(e.pointerId);pointer=last=toGrid(e.clientX,e.clientY);moveTool(pointer);guide.style.opacity='0';strokes++;strokeCount.textContent=String(strokes)});
  canvas.addEventListener('pointermove',e=>{if(!dragging||!playing)return;e.preventDefault();const p=toGrid(e.clientX,e.clientY),angle=Math.atan2(p.y-last.y,p.x-last.x);erode(last,p);pointer=p;moveTool(p,angle);last=p});
  const stop=e=>{if(dragging){dragging=false;pressure.textContent='—';if(e&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  document.getElementById('startButton').addEventListener('click',begin);document.getElementById('retryButton').addEventListener('click',begin);finish.addEventListener('click',finishWork);
  window.addEventListener('resize',resize);createPart();requestAnimationFrame(resize);
})();
