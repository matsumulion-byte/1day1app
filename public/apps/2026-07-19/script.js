const canvas = document.querySelector('#space');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const ui = { intro:$('#intro'),result:$('#result'),start:$('#startBtn'),retry:$('#retryBtn'),burn:$('#burnBtn'),sound:$('#soundBtn'),alt:$('#altitude'),vel:$('#velocity'),fuel:$('#fuel'),needle:$('#gaugeNeedle'),status:$('#status'),title:$('#resultTitle'),copy:$('#resultCopy'),score:$('#score'),code:$('#resultCode') };

let W=0,H=0,dpr=1,playing=false,firing=false,last=0,elapsed=0,stableTime=0,trail=[],stars=[],audioOn=true,audioCtx=null;
let ship={x:0,y:0,vx:0,vy:0,fuel:100,angle:0};
let moon={x:0,y:0,r:100};

function resize(){
  const rect=canvas.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2); W=rect.width; H=rect.height;
  canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  moon={x:W*(W<650?.58:.69),y:H*.53,r:Math.min(W,H)*(W<650?.19:.235)};
  if(!playing) resetShip();
  stars=Array.from({length:Math.floor(W*H/7000)},(_,i)=>({x:(i*83.17%1)*W,y:(i*47.31%1)*H,a:.18+(i*19%70)/100,r:i%11===0?1.3:.55}));
}
function resetShip(){
  const x=moon.x-moon.r*2.2,y=moon.y-moon.r*.95;
  const dx=moon.x-x,dy=moon.y-y,dist=Math.hypot(dx,dy);
  const approachSpeed=Math.sqrt(1200000/dist)*.68;
  ship={x,y,vx:-dy/dist*approachSpeed,vy:dx/dist*approachSpeed,fuel:100,angle:Math.atan2(dx,-dy)};
  trail=[];
}
function start(){
  resetShip(); elapsed=0; stableTime=0; playing=true; firing=false; last=performance.now();
  ui.intro.classList.remove('active'); ui.result.classList.remove('active'); ui.status.textContent='APPROACHING MOON';
  initAudio(); requestAnimationFrame(loop);
}
function loop(now){ if(!playing){draw();return} const dt=Math.min((now-last)/1000,.025);last=now; update(dt);draw();if(playing)requestAnimationFrame(loop) }
function update(dt){
  elapsed+=dt; const dx=moon.x-ship.x,dy=moon.y-ship.y,dist=Math.hypot(dx,dy),surface=dist-moon.r;
  const G=1200000,acc=G/(dist*dist); ship.vx+=dx/dist*acc*dt; ship.vy+=dy/dist*acc*dt;
  ship.angle=Math.atan2(ship.vy,ship.vx);
  if(firing&&ship.fuel>0){ const thrust=48; ship.vx+=Math.cos(ship.angle)*thrust*dt;ship.vy+=Math.sin(ship.angle)*thrust*dt;ship.fuel=Math.max(0,ship.fuel-9.5*dt); }
  ship.x+=ship.vx*dt;ship.y+=ship.vy*dt; trail.push({x:ship.x,y:ship.y});if(trail.length>500)trail.shift();
  const speed=Math.hypot(ship.vx,ship.vy),circular=Math.sqrt(G/dist),quality=Math.max(0,1-Math.abs(speed-circular)/circular-Math.abs((dx*ship.vx+dy*ship.vy)/(dist*speed||1))*.7);
  if(surface>moon.r*.28&&surface<moon.r*1.05&&quality>.73)stableTime+=dt;else stableTime=Math.max(0,stableTime-dt*.7);
  ui.alt.textContent=Math.max(0,Math.round(surface*2.7));ui.vel.textContent=(speed/42).toFixed(2);ui.fuel.textContent=Math.round(ship.fuel);ui.needle.style.left=`${Math.min(100,Math.max(0,quality*100))}%`;
  if(stableTime>4.5)return finish('success',quality);
  if(surface<3)return finish('crash',quality);
  if(dist>Math.max(W,H)*.82||ship.x<-100||ship.x>W+100||ship.y<-100||ship.y>H+100)return finish('escape',quality);
  if(elapsed>45)return finish('timeout',quality);
  ui.status.textContent=quality>.73?'ORBIT STABILIZING · '+Math.round(stableTime/4.5*100)+'%':surface<moon.r*.3?'PULL UP — ALTITUDE LOW':speed>circular*1.4?'VELOCITY HIGH':'ADJUST VELOCITY';
}
function finish(type,q){
  playing=false;setFiring(false);const data={
    success:['ORBIT ACHIEVED','軌道投入成功','月の重力と速度が釣り合いました。アポロ11号は月を周回しています。'],
    crash:['CONTACT LOST','月面に衝突','速度が足りず、月の重力に引かれました。少し早めに長く噴射してみよう。'],
    escape:['TRAJECTORY LOST','月を離脱','速度が上がりすぎました。短い噴射を重ねて軌道を整えてみよう。'],
    timeout:['ORBIT UNSTABLE','軌道が安定せず','月には捉えられています。高度と速度を緑の範囲で保ってみよう。']
  }[type];
  ui.code.textContent=data[0];ui.title.textContent=data[1];ui.copy.textContent=data[2];ui.score.textContent=type==='success'?Math.min(99,Math.round(q*100)):Math.round(q*70);setTimeout(()=>ui.result.classList.add('active'),600);tone(type==='success'?660:120,.35);
}
function draw(){
  ctx.clearRect(0,0,W,H); for(const s of stars){ctx.globalAlpha=s.a;ctx.fillStyle='#dce9ff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill()}ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(moon.x-moon.r*.3,moon.y-moon.r*.25,moon.r*.1,moon.x,moon.y,moon.r*1.8);glow.addColorStop(0,'rgba(136,160,255,.16)');glow.addColorStop(.55,'rgba(46,65,145,.08)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(moon.x,moon.y,moon.r*1.8,0,7);ctx.fill();
  if(trail.length>1){ctx.strokeStyle='rgba(215,245,107,.36)';ctx.lineWidth=1;ctx.beginPath();trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  const mg=ctx.createRadialGradient(moon.x-moon.r*.35,moon.y-moon.r*.38,moon.r*.05,moon.x,moon.y,moon.r);mg.addColorStop(0,'#d7d9d4');mg.addColorStop(.48,'#8f9695');mg.addColorStop(1,'#242b35');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(moon.x,moon.y,moon.r,0,7);ctx.fill();
  ctx.globalAlpha=.16;ctx.fillStyle='#111925';[[.18,-.25,.16],[-.32,.22,.1],[.35,.38,.08],[-.04,.42,.05]].forEach(c=>{ctx.beginPath();ctx.ellipse(moon.x+c[0]*moon.r,moon.y+c[1]*moon.r,c[2]*moon.r,c[2]*moon.r*.65,-.3,0,7);ctx.fill()});ctx.globalAlpha=1;
  ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);if(firing&&ship.fuel>0){ctx.fillStyle='#ff6842';ctx.beginPath();ctx.moveTo(-12,-3);ctx.lineTo(-24-Math.random()*12,0);ctx.lineTo(-12,3);ctx.fill()}ctx.fillStyle='#f1f1e8';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-7,-6);ctx.lineTo(-12,0);ctx.lineTo(-7,6);ctx.closePath();ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-5,-2,6,4);ctx.restore();
}
function setFiring(v){if(!playing)v=false;if(firing===v)return;firing=v;ui.burn.classList.toggle('firing',v);if(v){tone(82,.08);if(navigator.vibrate)navigator.vibrate(15)}}
function initAudio(){if(!audioOn)return;audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume()}
function tone(freq,dur){if(!audioOn)return;initAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}
ui.start.addEventListener('click',start);ui.retry.addEventListener('click',start);
['pointerdown'].forEach(e=>ui.burn.addEventListener(e,x=>{x.preventDefault();setFiring(true)}));
['pointerup','pointercancel','pointerleave'].forEach(e=>window.addEventListener(e,()=>setFiring(false)));
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!playing&&ui.intro.classList.contains('active'))start();else setFiring(true)}});window.addEventListener('keyup',e=>{if(e.code==='Space')setFiring(false)});
ui.sound.addEventListener('click',()=>{audioOn=!audioOn;ui.sound.textContent=audioOn?'SOUND ON':'SOUND OFF';if(audioOn)tone(440,.08)});
window.addEventListener('resize',resize);resize();draw();
