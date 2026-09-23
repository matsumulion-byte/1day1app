'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('court'), c=canvas.getContext('2d');
const C={ink:'#101f29',cream:'#f1edcc',green:'#4d8966',dark:'#367257',lime:'#d5ec79',red:'#e88766',blue:'#75b6bd'};
let best=0;try{best=Number(localStorage.getItem('rally-tennis-best'))||0;}catch{}
$('best').textContent=String(best).padStart(2,'0');
let state='title',rally=0,player=0,cpu=0,ball=null,swing=0,cooldown=0,flash=0,banner='',bannerTime=0,clock=0,last=0,paused=false,audio,muted=false;
const keys=new Set(),pointers=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tone(freq,duration=.07,delay=0,type='square',volume=.035){if(muted||!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration);}
function unlock(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function project(x,z){return {x:160+x*(73+z*59),y:137+z*215};}
function duration(){return Math.max(.60,1.55-Math.min(rally,20)*.010-Math.max(0,Math.min(rally-20,30))*.013-Math.max(0,rally-50)*.0028);}
function send(from,to,incoming){ball={from,to,incoming,t:0,duration:duration(),bounced:false};}
function serve(){const spread=.13+Math.min(rally,20)*.006+Math.max(0,Math.min(rally-20,15))*.03;send(cpu,(Math.random()*2-1)*Math.min(.80,spread),true);tone(520);}
function start(){unlock();state='play';rally=0;player=0;cpu=0;swing=0;cooldown=0;bannerTime=0;paused=false;keys.clear();pointers.clear();$('overlay').hidden=true;serve();last=performance.now();}
function end(){state='over';best=Math.max(best,rally);try{localStorage.setItem('rally-tennis-best',String(best));}catch{}$('best').textContent=String(best).padStart(2,'0');document.querySelector('h1').textContent='GAME OVER';$('message').textContent='もうひとラリー、いこう。';$('result').hidden=false;$('result').textContent='RALLY '+rally;$('start').textContent='もう一度';$('overlay').hidden=false;$('live').textContent=`ゲームオーバー。ラリー${rally}回。ベスト${best}回。`;[330,247,165,110].forEach((f,i)=>tone(f,.17,i*.13));}
function hit(){if(state!=='play'||paused||cooldown>0)return;unlock();swing=.29;cooldown=.23;tryReturn();}
function tryReturn(){if(!ball?.incoming||!ball.bounced||swing<=0)return;const t=ball.t/ball.duration,reach=rally<=10?.32:.27;
if(t<.77||t>1.15||Math.abs(player-ball.to)>reach)return;
const direction=clamp((t-.94)*4,-.72,.72);rally++;flash=.16;tone(740,.07);send(player,clamp(direction+(Math.random()-.5)*.10,-.8,.8),false);
if(rally%10===0){banner=rally+' RALLY'+(rally>=100?'!!!':rally>=50?'!!':'!');bannerTime=1.1;[660,880,1320].forEach((f,i)=>tone(f,.1,i*.085));$('live').textContent=rally+'ラリー';}}
function update(dt){clock+=dt;if(state!=='play'||paused)return;swing=Math.max(0,swing-dt);cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);bannerTime=Math.max(0,bannerTime-dt);
const left=keys.has('ArrowLeft')||keys.has('a')||[...pointers.values()].includes('left'),right=keys.has('ArrowRight')||keys.has('d')||[...pointers.values()].includes('right');player=clamp(player+((right?1:0)-(left?1:0))*dt*1.75,-.94,.94);
ball.t+=dt;let t=ball.t/ball.duration;if(!ball.bounced&&t>=.68){ball.bounced=true;tone(180,.045,0,'triangle',.07);}
if(!ball.incoming){cpu+=(ball.to-cpu)*Math.min(1,dt*10);if(t>=1){cpu=ball.to;serve();}}else{tryReturn();if(ball.incoming&&t>1.16)end();}}
function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function line(points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
function poly(points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();}
function text(s,x,y,size=10,color=C.cream){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign='center';c.fillText(s,x,y);}
function person(x,z,color,active=false){let p=project(x,z),s=z>.5?2:1.5,step=state==='play'?Math.floor(clock*7)%2:0;c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(s,s);rect(-5,-2,11,3,C.dark);rect(-4,-18,8,3,C.ink);rect(-3,-16,7,6,'#e9bc87');rect(-4,-16,9,2,C.cream);rect(-5,-10,10,7,color);rect(-7,-9,2,6,'#e9bc87');rect(5,-9,3,5,'#e9bc87');rect(-4,-3,3,5,C.cream);rect(1,-3,3,5,C.cream);rect(-5,1+step,4,2,C.ink);rect(1,2-step,5,2,C.ink);const rx=active?12:9,ry=active?-12:-5;line([{x:6,y:-6},{x:rx,y:ry}],C.cream,2);c.strokeStyle=C.cream;c.lineWidth=1;c.strokeRect(rx-2,ry-6,6,7);rect(rx,ry-5,2,5,C.blue);c.restore();}
function draw(){rect(0,0,320,400,C.ink);text('RALLY',160,20,12,C.lime);text(String(rally).padStart(2,'0'),160,55,34);text('BEST',42,24,9);text(String(best).padStart(2,'0'),42,42,15);text('CPU',280,24,9,C.red);text('RALLY CLUB',160,78,9,C.blue);
rect(0,87,320,37,'#263e42');for(let row=0;row<3;row++){rect(0,94+row*11,320,2,'#607269');for(let i=0;i<25;i++){let x=i*14+(row%2)*6;rect(x,88+row*11,3,3,'#d8bd8a');rect(x-1,91+row*11,5,3,[C.blue,C.red,C.cream][(i+row)%3]);}}
rect(0,126,320,274,'#325346');poly([project(-1,0),project(1,0),project(1,1),project(-1,1)],C.green);poly([project(-1,.5),project(1,.5),project(1,1),project(-1,1)],'#528f6c');
for(const x of [-1,-.77,.77,1])line([project(x,0),project(x,1)],C.cream,1.5);for(const z of [0,.29,.72,1])line([project(-1,z),project(1,z)],C.cream,1.5);line([project(0,.29),project(0,.72)],C.cream,1.5);
person(cpu,.02,C.red);
let l=project(-1.08,.5),r=project(1.08,.5);rect(l.x,l.y-17,r.x-l.x,18,'#244d43');for(let x=l.x;x<r.x;x+=6)line([{x,y:l.y-16},{x,y:l.y}], '#88a38a');for(let y=l.y-15;y<l.y;y+=5)line([{x:l.x,y},{x:r.x,y}], '#88a38a');line([{x:l.x,y:l.y-18},{x:r.x,y:r.y-18}],C.cream,3);rect(l.x-2,l.y-21,3,25,C.cream);rect(r.x,l.y-21,3,25,C.cream);
if(state==='play'&&ball.incoming){const p=project(ball.to,1);rect(p.x-9,p.y+8,18,2,C.lime);if(ball.t/ball.duration>.77)text('HIT!',p.x,p.y+28,9,C.lime);}
person(player,1,C.blue,swing>0);
if(ball&&state==='play'){let t=ball.t/ball.duration,z=ball.incoming?t:1-t,x=ball.from+(ball.to-ball.from)*Math.min(1,t),p=project(x,z);let h=t<.68?Math.sin(Math.PI*(.18+.82*t/.68))*44:Math.sin(Math.PI*Math.min(1,(t-.68)/.60))*22;rect(p.x-3,p.y,7,2,'#284c40');rect(p.x-2,p.y-h-3,5,5,C.lime);rect(p.x-2,p.y-h-3,2,2,C.cream);}
if(flash>0){const p=project(player,1);text('+',p.x+20,p.y-25,24,C.lime);}if(bannerTime>0){rect(47,177,226,32,C.ink);text(banner,160,199,20,C.lime);}if(paused){rect(70,181,180,38,C.ink);text('PAUSED',160,206,19);}text('KEEP THE RALLY ALIVE',160,391,8,'#abc6a6');}
function frame(now){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
$('start').addEventListener('click',start);$('sound').addEventListener('click',()=>{muted=!muted;unlock();$('sound').textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!muted));});
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','a','d',' '].includes(k)){if(e.target.tagName==='BUTTON'&&state!=='play')return;e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)hit();}});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
for(const id of ['left','right','hit']){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,id);b.classList.add('pressed');if(id==='hit')hit();});const release=e=>{pointers.delete(e.pointerId);b.classList.toggle('pressed',[...pointers.values()].includes(id));};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,release);}
function clear(){keys.clear();pointers.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}window.addEventListener('blur',()=>{clear();paused=state==='play';});window.addEventListener('focus',()=>{paused=false;last=performance.now();});document.addEventListener('visibilitychange',()=>{clear();paused=document.hidden&&state==='play';last=performance.now();});for(const ev of ['dblclick','gesturestart','contextmenu','dragstart'])document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
})();
