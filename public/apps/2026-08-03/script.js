const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const distanceEl=document.querySelector('#distance'),objectiveEl=document.querySelector('#objectiveDistance'),hullEl=document.querySelector('#hull'),batteryEl=document.querySelector('#battery');
const W=1000,H=1400,goal={x:500,y:105,r:58};
const stages=[
  {name:'ARCTIC OCEAN',code:'USS NAUTILUS / 90°N',speed:92,pingCost:7,pingRate:390,reveal:105,recharge:2.4,ice:[{x:350,y:1160,r:75},{x:680,y:1060,r:90},{x:470,y:900,r:72},{x:190,y:750,r:88},{x:760,y:700,r:96},{x:520,y:560,r:82},{x:285,y:390,r:76},{x:700,y:300,r:85}]},
  {name:'PACK ICE FIELD',code:'SECTOR 02 / DENSE ICE',speed:102,pingCost:9,pingRate:420,reveal:88,recharge:1.8,ice:[{x:480,y:1190,r:95},{x:190,y:1080,r:88},{x:780,y:1030,r:100},{x:340,y:930,r:92},{x:650,y:860,r:102},{x:120,y:760,r:88},{x:480,y:700,r:96},{x:850,y:650,r:92},{x:290,y:520,r:100},{x:650,y:450,r:105},{x:430,y:300,r:88},{x:790,y:250,r:82}]},
  {name:'POLAR LABYRINTH',code:'SECTOR 03 / FINAL APPROACH',speed:112,pingCost:12,pingRate:450,reveal:68,recharge:1.15,ice:[{x:360,y:1210,r:102},{x:650,y:1150,r:104},{x:110,y:1040,r:100},{x:500,y:1010,r:110},{x:880,y:980,r:102},{x:290,y:840,r:108},{x:710,y:790,r:112},{x:80,y:650,r:92},{x:480,y:630,r:105},{x:900,y:590,r:96},{x:260,y:450,r:106},{x:660,y:410,r:108},{x:90,y:280,r:90},{x:460,y:250,r:92},{x:830,y:230,r:94}]}
];
let player,pings,playing,last,collisionLock,sound=true,audio,stageIndex=0,ice=[],config;

function reset(){
  config=stages[stageIndex];ice=config.ice;
  player={x:500,y:1280,angle:-Math.PI/2,targetX:500,targetY:1280,hull:100,battery:100};pings=[];playing=false;last=0;collisionLock=0;
  document.querySelector('#missionLabel').textContent=`MISSION ${String(stageIndex+1).padStart(2,'0')} / ${config.name}`;
  document.querySelector('#briefCode').textContent=config.code;
  updateUI();draw(0);
}
function resize(){const r=document.querySelector('#screen').getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw(performance.now())}
function ping(){
  if(!playing||player.battery<config.pingCost)return;
  player.battery-=config.pingCost;pings.push({x:player.x,y:player.y,r:0,life:1});tone();updateUI();
}
function steer(clientX,clientY){
  const r=canvas.getBoundingClientRect();player.targetX=(clientX-r.left)/r.width*W;player.targetY=(clientY-r.top)/r.height*H;ping();
}
function tone(){
  if(!sound)return;
  audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.setValueAtTime(620,audio.currentTime);o.frequency.exponentialRampToValueAtTime(180,audio.currentTime+.55);g.gain.setValueAtTime(.11,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.6);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.62);
}
function updateUI(){
  const km=Math.max(0,Math.round((player.y-goal.y)/(1280-goal.y)*1500));distanceEl.textContent=km.toLocaleString('ja-JP');objectiveEl.textContent=`${km.toLocaleString('ja-JP')} km`;hullEl.textContent=Math.round(player.hull);batteryEl.textContent=Math.round(player.battery);
  hullEl.style.color=player.hull<=40?'#ff786d':'';
}
function loop(t){
  if(!playing)return;const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt,t);draw(t);requestAnimationFrame(loop);
}
function update(dt,t){
  const previousX=player.x,previousY=player.y;
  const dx=player.targetX-player.x,dy=player.targetY-player.y,d=Math.hypot(dx,dy);
  if(d>7){const target=Math.atan2(dy,dx);let diff=((target-player.angle+Math.PI*3)%(Math.PI*2))-Math.PI;player.angle+=diff*Math.min(1,dt*4);player.x+=Math.cos(player.angle)*config.speed*dt;player.y+=Math.sin(player.angle)*config.speed*dt}
  player.x=Math.max(25,Math.min(W-25,player.x));player.y=Math.max(25,Math.min(H-25,player.y));player.battery=Math.min(100,player.battery+config.recharge*dt);
  pings.forEach(p=>{p.r+=config.pingRate*dt;p.life-=.33*dt});pings=pings.filter(p=>p.life>0);
  if(t>collisionLock)for(const o of ice){if(hitsIce(o)){player.hull-=34;collisionLock=t+1200;player.x=previousX;player.y=previousY;player.targetX=previousX;player.targetY=previousY;pings.push({x:o.x,y:o.y,r:Math.max(20,o.r*.8),life:.75});break}}
  updateUI();
  if(Math.hypot(player.x-goal.x,player.y-goal.y)<goal.r+18)finish(true);
  else if(player.hull<=0)finish(false);
}
function visible(o){return pings.some(p=>Math.abs(Math.hypot(o.x-p.x,o.y-p.y)-p.r)<config.reveal&&p.life>.12)}
function icePoints(o){
  return Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2,r=o.r*(.78+.19*Math.sin(i*4.7));return {x:o.x+Math.cos(a)*r,y:o.y+Math.sin(a)*r}});
}
function pointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))inside=!inside;
  }
  return inside;
}
function hitsIce(o){
  const points=icePoints(o),radius=14;
  if(pointInPolygon(player.x,player.y,points))return true;
  return points.some((a,i)=>{const b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.y-a.y)*dy)/l2)),x=a.x+t*dx,y=a.y+t*dy;return Math.hypot(player.x-x,player.y-y)<=radius});
}
function draw(t){
  ctx.clearRect(0,0,W,H);const g=ctx.createRadialGradient(player.x,player.y,0,player.x,player.y,600);g.addColorStop(0,'#09252c');g.addColorStop(1,'#01070a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(109,248,237,.055)';ctx.lineWidth=1;for(let y=0;y<H;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(let x=0;x<W;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  ctx.save();ctx.strokeStyle='#6df8ed';ctx.shadowColor='#6df8ed';ctx.shadowBlur=18;ctx.lineWidth=3;ctx.beginPath();ctx.arc(goal.x,goal.y,goal.r,0,Math.PI*2);ctx.stroke();ctx.font='500 18px DM Mono';ctx.textAlign='center';ctx.fillStyle='#c9ffff';ctx.fillText('90° N',goal.x,goal.y+6);ctx.restore();
  ice.forEach(o=>{if(!visible(o))return;const points=icePoints(o);ctx.save();ctx.fillStyle='rgba(166,235,237,.18)';ctx.strokeStyle='rgba(201,255,255,.8)';ctx.shadowColor='#a7ffff';ctx.shadowBlur=12;ctx.lineWidth=3;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()});
  pings.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.strokeStyle='#6df8ed';ctx.shadowColor='#6df8ed';ctx.shadowBlur=14;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();ctx.restore()});
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);ctx.shadowColor='#6df8ed';ctx.shadowBlur=15;ctx.fillStyle='#bffefa';ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-17,-10);ctx.lineTo(-11,0);ctx.lineTo(-17,10);ctx.closePath();ctx.fill();ctx.fillStyle='#6df8ed';ctx.fillRect(-6,-3,22,6);ctx.restore();
  if(playing){ctx.fillStyle='rgba(109,248,237,.5)';ctx.font='11px DM Mono';ctx.textAlign='center';ctx.fillText('TAP TO STEER + PING',W/2,H-28)}
}
function finish(win){
  playing=false;const panel=document.querySelector('#resultPanel');panel.hidden=false;
  const final=stageIndex===stages.length-1;
  document.querySelector('#resultCode').textContent=win?(final?'ALL MISSIONS COMPLETE':`MISSION ${String(stageIndex+1).padStart(2,'0')} COMPLETE`):'HULL FAILURE';document.querySelector('#resultTitle').innerHTML=win?(final?'全海域を<br>突破しました。':'北極圏を<br>前進しました。'):'航行不能。<br>浮上してください。';document.querySelector('#resultText').textContent=win?`船体 ${Math.max(0,Math.round(player.hull))}% を維持して海域を突破しました。`:'ソナーで氷の位置を確認し、早めに進路を変えてください。';
  const retry=document.querySelector('#retryBtn');retry.innerHTML=win?(final?'最初から挑戦 <span>↻</span>':'次の海域へ <span>→</span>'):'この海域を再挑戦 <span>↻</span>';retry.dataset.advance=win?'1':'0';
}
function start(){document.querySelector('#startPanel').hidden=true;document.querySelector('#resultPanel').hidden=true;playing=true;last=performance.now();ping();requestAnimationFrame(loop)}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();steer(e.clientX,e.clientY)});
document.querySelector('#startBtn').addEventListener('click',start);document.querySelector('#retryBtn').addEventListener('click',e=>{if(e.currentTarget.dataset.advance==='1')stageIndex=(stageIndex+1)%stages.length;reset();start()});document.querySelector('#pingBtn').addEventListener('click',ping);
document.querySelector('#soundBtn').addEventListener('click',e=>{sound=!sound;e.currentTarget.querySelector('b').textContent=sound?'ON':'OFF'});
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();ping()}if(!playing)return;const step=130;if(e.key==='ArrowLeft')player.targetX=player.x-step;if(e.key==='ArrowRight')player.targetX=player.x+step;if(e.key==='ArrowUp')player.targetY=player.y-step;if(e.key==='ArrowDown')player.targetY=player.y+step});
addEventListener('resize',resize);reset();resize();
