'use strict';
(() => {
const $ = id => document.getElementById(id), canvas=$('field'), ctx=canvas.getContext('2d');
const W=420,H=800, TAU=Math.PI*2, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mode='title', hp=100, combo=0, shots=0, critical=0, elapsed=0, tier=0, held=false, last=0, cooldown=0, shake=0, flash=0, stop=0, notice=0, finalTime=0, volleyId=0, laserClock=0, cleared=false, aim={x:210,y:325}, audio, sound=false;
let bullets=[], particles=[], rings=[], labels=[], beams=[];
let maxCombo=0, score=0, hits=0, attempts=0, powerHits=0, coreBreaks=0, lock=0, lockCooldown=0, boost=0, comboGrace=0, assistClock=0, keyHeld=false;
let best=0;try{best=Number(localStorage.getItem('typhoon-breaker-best-v1'))||0}catch{}
const land=new Path2D();
for(const ring of window.TYPHOON_JAPAN){ring.forEach(([x,y],i)=>i?land.lineTo(x,y):land.moveTo(x,y));land.closePath()}
function multiplier(){return 1+Math.min(4,Math.floor(combo/15))}
function announce(message){notice=1.1;$('upgrade').textContent=message}

const thresholds=[0,8,20,35,60,90,125], names=['迎撃システム','高速連射','ツインストライク','多連装迎撃','弾幕オーバードライブ','衛星レーザー','極限迎撃'];
const rates=[.25,.17,.14,.115,.095,.08,.065], counts=[3,5,8,12,18,24,32];
const bases=[{x:105,y:427},{x:159,y:420},{x:183,y:408},{x:246,y:387},{x:264,y:338}];
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}
addEventListener('resize',resize);resize();
// A deterministic, pre-rendered cloud field keeps hundreds of cloud lobes off the frame loop.
const cloud=document.createElement('canvas');cloud.width=cloud.height=700;const cc=cloud.getContext('2d');
let seed=926;function rng(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}
for(let arm=0;arm<6;arm++)for(let i=0;i<100;i++){const t=i/100,r=35+t*268,a=arm*TAU/6+t*5.2+(rng()-.5)*.28;const x=350+Math.cos(a)*r,y=350+Math.sin(a)*r;const s=8+Math.sin(t*Math.PI)*22+rng()*12;const g=cc.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,`rgba(232,247,250,${.17+rng()*.22})`);g.addColorStop(.5,'rgba(176,201,213,.14)');g.addColorStop(1,'rgba(170,197,211,0)');cc.fillStyle=g;cc.fillRect(x-s,y-s,s*2,s*2)}
cc.globalCompositeOperation='destination-out';const eye=cc.createRadialGradient(350,350,14,350,350,38);eye.addColorStop(0,'#000');eye.addColorStop(1,'transparent');cc.fillStyle=eye;cc.fillRect(310,310,80,80);
function tone(freq,duration=.07,volume=.035,type='triangle'){if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(28,freq*.35),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}
$('sound').onclick=()=>{sound=!sound;if(sound){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});tone(440)}catch{sound=false}}$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',sound);$('sound').setAttribute('aria-label',sound?'効果音をオフにする':'効果音をオンにする')};
function vibrate(n){if(!reduce&&navigator.vibrate)navigator.vibrate(n)}
// North stays up: the typhoon approaches Japan from the southern ocean.
function center(){return {x:mode==='title'?205:210+Math.sin(elapsed*.78)*66+Math.sin(elapsed*1.43)*13,y:mode==='title'?578:606-Math.min(elapsed,35)*1.55+Math.sin(elapsed*.55)*15}}
function radius(){return 64+hp*.95}
function reset(){mode='playing';hp=100;combo=shots=critical=elapsed=tier=cooldown=shake=flash=stop=notice=finalTime=volleyId=laserClock=0;cleared=false;held=false;keyHeld=false;maxCombo=score=hits=attempts=powerHits=coreBreaks=lock=lockCooldown=boost=comboGrace=assistClock=0;bullets=[];particles=[];rings=[];labels=[];beams=[];aim=center();canvas.focus({preventScroll:true});$('title').hidden=true;$('result').hidden=true;$('hud').hidden=false;$('final').hidden=true;$('cinematic').hidden=true;$('upgrade').textContent='';$('hint').textContent='押したまま指を動かして、台風の目を追え';updateHUD();tone(220,.2)}
$('start').onclick=reset;$('restart').onclick=reset;
function updateHUD(){const pct=Math.ceil(hp);$('percent').textContent=pct+'%';$('hp').style.width=hp+'%';document.querySelector('.hp-track').setAttribute('aria-valuenow',pct);$('category').textContent=hp<=0?'消滅':pct>=80?'SUPER TYPHOON':pct>=60?'CATEGORY 4':pct>=40?'CATEGORY 3':pct>=20?'CATEGORY 2':'TROPICAL STORM';$('combo').textContent=combo;$('combo-label').textContent='COMBO ×'+multiplier();$('score').textContent=score.toLocaleString();$('lock-fill').style.width=(boost>0?boost/2.2:lock/.65)*100+'%';$('skill-hud').classList.toggle('boost',boost>0);$('lock-state').textContent=boost>0?'OVERDRIVE ×2':lockCooldown>0?'コア再生中':lock>0?'LOCK ON '+Math.round(lock/.65*100)+'%':'目を狙ってロック';$('timer').textContent=elapsed.toFixed(2).padStart(5,'0');$('level').textContent=`LV.0${tier+1} / ${names[tier]}`;$('next').textContent=tier<6?`強化まで ${Math.max(0,thresholds[tier+1]-powerHits)} HIT`:'MAXIMUM POWER';document.querySelectorAll('#levels i').forEach((e,i)=>e.classList.toggle('on',i<=tier))}
function input(e){const r=canvas.getBoundingClientRect();aim={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing')return;input(e);held=true;canvas.setPointerCapture(e.pointerId);if(cooldown<=0)fire()});canvas.addEventListener('pointermove',e=>{if(held||e.pointerType==='mouse')input(e)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>held=false);
addEventListener('keydown',e=>{if(e.code==='Space'&&mode==='playing'&&e.target.tagName!=='BUTTON'){e.preventDefault();held=true;keyHeld=true}});addEventListener('keyup',e=>{if(e.code==='Space'){held=false;keyHeld=false}});addEventListener('blur',()=>held=false);document.addEventListener('visibilitychange',()=>{held=false;last=performance.now()});
for(const type of ['contextmenu','dblclick','gesturestart','dragstart'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
function emit(x,y,n=9,color='#9eeedc',power=1){for(let i=0;i<n&&particles.length<400;i++){const a=rand(0,TAU),v=rand(30,135)*power;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.7),max:.7,size:rand(1,4)*power,color})}}
function fire(final=false){
 const c=center(),d=Math.hypot(aim.x-c.x,aim.y-c.y),isCrit=d<36;
 const hit=d<radius()+16;
 // Only a nearby eye shot is corrected; shots outside the cloud genuinely miss.
 const tx=final?c.x:isCrit?c.x:aim.x,ty=final?c.y:isCrit?c.y:aim.y;
 if(!final)attempts++;
 const n=final?45:Math.min(42,counts[tier]*(boost>0?2:1)),id=volleyId++;
 for(let i=0;i<n&&bullets.length<300;i++){
  const base=bases[(id+i)%bases.length],spread=final?70:25+tier*5;
  bullets.push({x:base.x,y:base.y,ox:base.x,oy:base.y,tx:(final?c.x:tx)+rand(-spread,spread),ty:(final?c.y:ty)+rand(-spread*.6,spread*.6),age:0,duration:rand(.24,.42),crit:isCrit,hit:hit||final,boosted:boost>0,final,first:i===0,curve:rand(-60,60)*(1+tier*.12)});
  shots++;if(i<5)emit(base.x,base.y,3,'#ffca70',.5);
 }
 cooldown=rates[tier]*(boost>0?.72:1);tone(130+25*tier,.07,.035,'sawtooth');
 if((tier>=3||boost>0)&&!final&&hit&&laserClock<=0){
  const count=tier>=5?3:1;
  for(let i=0;i<count;i++)beams.push({x:tier>=5?rand(20,400):bases[(id+i)%5].x,y:tier>=5?0:bases[(id+i)%5].y,tx:c.x+rand(-30,30),ty:c.y+rand(-25,25),life:.28});
  laserClock=tier>=5?.32:.65;tone(460,.15,.045);emit(c.x,c.y,18,'#c6a6ff',1.8);
 }
}
function impact(b){
 if(!b.hit){if(b.first&&mode==='playing'){combo=0;comboGrace=0;labels.push({x:Math.max(30,Math.min(350,b.tx)),y:Math.max(190,Math.min(670,b.ty)),text:'MISS',damage:'',life:.45,crit:false})}return}
 emit(b.tx,b.ty,b.first?14:2,b.crit?'#ffba6b':'#96fff1',b.first?1.7:1);
 if(b.first&&rings.length<28)rings.push({x:b.tx,y:b.ty,r:5,life:.38,color:b.crit?'#ffd599':'#b5fff3'});
 if(b.first&&particles.length<390)particles.push({x:b.tx,y:b.ty,vx:rand(-65,65),vy:rand(-80,20),life:.5,size:rand(42,68),color:'#fff',cloud:true});
 if(mode!=='playing'||!b.first||hp<=10)return;
 hits++;combo++;maxCombo=Math.max(maxCombo,combo);comboGrace=1.1;
 if(b.crit)critical++;
 powerHits+=b.crit?2:1;
 score+=(b.crit?250:80)*multiplier()*(b.boosted?2:1);
 hp=Math.max(10,hp-[.22,.24,.26,.29,.32,.36,.40][tier]*.34*(b.crit?1.8:1)*(b.boosted?2:1));
 shake=Math.max(shake,1.3);
 if(labels.length<5&&combo%(tier>=3?3:1)===0)labels.push({x:b.tx+rand(-40,40),y:b.ty-25,text:b.crit?'CRITICAL!':'HIT',damage:String(Math.round((b.crit?480:240)*(1+tier*2.5))),life:.5,crit:b.crit});
 const nextTier=thresholds.reduce((n,v,i)=>powerHits>=v?i:n,0);
 if(nextTier>tier){tier=nextTier;stop=.065;shake=reduce?0:7;notice=1.1;flash=reduce?0:.16;$('upgrade').textContent=names[tier];vibrate(25);tone(700,.16,.05,'square');const c=center();rings.push({x:c.x,y:c.y,r:20,life:.6,color:'#ffdd99'});emit(c.x,c.y,45,'#ffe1a1',2)}
 if(hp<=10){$('final').hidden=false;$('hint').textContent='準備完了。一斉射撃で、決着を。'}updateHUD()
}
$('final').onclick=()=>{if(mode!=='playing'||hp>10)return;mode='final';held=false;finalTime=0;stop=.25;$('final').hidden=true;$('cinematic').hidden=false;$('cinematic').textContent='全機、ロックオン。';vibrate(50);tone(70,.5,.1)};
function complete(){mode='result';$('hud').hidden=true;$('cinematic').hidden=true;$('result').hidden=false;$('r-time').textContent=elapsed.toFixed(2)+' 秒';$('r-combo').textContent=maxCombo.toLocaleString();$('r-shots').textContent=shots.toLocaleString()+' 発';$('r-critical').textContent=critical+' / '+coreBreaks+' 回';const accuracy=hits/Math.max(1,attempts),precision=critical/Math.max(1,hits);const rank=precision>=.65&&coreBreaks>=3&&elapsed<35?'S':precision>=.35&&coreBreaks>=2&&elapsed<45?'A':accuracy>=.5&&hits>=30?'B':'C';score+=Math.max(0,Math.round((60-elapsed)*150));$('r-score').textContent=score.toLocaleString();$('r-rank').textContent=rank;const isBest=score>best;best=Math.max(best,score);try{localStorage.setItem('typhoon-breaker-best-v1',String(best))}catch{}$('r-best').textContent=(isBest?'NEW BEST! ':'BEST ')+best.toLocaleString()}
function updateSkills(dt){
 comboGrace=Math.max(0,comboGrace-dt);if(comboGrace===0)combo=0;
 boost=Math.max(0,boost-dt);lockCooldown=Math.max(0,lockCooldown-dt);
 const c=center(),onEye=Math.hypot(aim.x-c.x,aim.y-c.y)<36;
 if(held&&onEye&&lockCooldown===0&&hp>10){lock=Math.min(.65,lock+dt)}else lock=Math.max(0,lock-dt*2);
 if(lock>=.65){
  coreBreaks++;score+=2000*multiplier();hp=Math.max(10,hp-3);boost=2.2;lockCooldown=4.6;lock=0;
  announce('CORE BREAK! ×2');shake=reduce?0:7;stop=.06;vibrate(20);tone(650,.22,.07,'square');
  rings.push({x:c.x,y:c.y,r:20,life:.7,color:'#ffe7a6'});emit(c.x,c.y,45,'#ffd88b',2.3);
 }
 // A clearly signalled support beam guarantees eventual completion, without awarding aim points.
 if(elapsed>35&&hp>10){assistClock-=dt;if(assistClock<=0){assistClock=.6;hp=Math.max(10,hp-3);beams.push({x:30,y:0,tx:c.x,ty:c.y,life:.25});$('hint').textContent='支援レーザー到着！ 目を狙って得点を伸ばせ'}}
 if(hp<=10){$('final').hidden=false;$('hint').textContent='準備完了。一斉射撃で、決着を。'}
}
function update(dt){if(document.hidden)return;const active=mode==='playing'||mode==='final';if(active)elapsed+=dt;if(stop>0){stop-=dt;return}cooldown-=dt;laserClock-=dt;if(mode==='playing')updateSkills(dt);if(mode==='playing'&&held&&cooldown<=0)fire();notice-=dt;$('upgrade').style.opacity=notice>0?1:0;
if(mode==='final'){finalTime+=dt;const c=center();if(finalTime> .7&&finalTime<2.7&&cooldown<=0){fire(true);cooldown=.045;$('cinematic').textContent='一斉射撃';}if(finalTime>1.6&&finalTime<3.1){if(beams.length<12)beams.push({x:rand(0,W),y:0,tx:c.x,ty:c.y,life:.2});shake=reduce?0:5;hp=Math.max(1,10-(finalTime-1.6)*6)}if(finalTime>=3.1&&!cleared){cleared=true;hp=0;flash=1;shake=reduce?0:14;emit(c.x,c.y,180,'#e0ffff',3);for(let i=0;i<24;i++){const a=i/24*TAU;particles.push({x:c.x,y:c.y,vx:Math.cos(a)*rand(160,330),vy:Math.sin(a)*rand(160,330),life:1.7,size:rand(40,90),color:'#fff',cloud:true})}rings.push({x:c.x,y:c.y,r:20,life:1.5,color:'#ffffff'});$('cinematic').textContent='台風消滅';tone(45,.8,.15,'sawtooth');vibrate([50,50,100])}if(finalTime>4.3)complete()}
for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.age+=dt;const t=Math.min(1,b.age/b.duration);b.x=b.ox+(b.tx-b.ox)*t+Math.sin(t*Math.PI)*b.curve;b.y=b.oy+(b.ty-b.oy)*t;if(t>=1){impact(b);bullets.splice(i,1)}}
for(const list of [particles,rings,labels,beams])for(let i=list.length-1;i>=0;i--){const p=list[i];p.life-=dt;if(p.life<=0){list.splice(i,1);continue}if(list===particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98}else if(list===rings)p.r+=dt*(cleared?370:100);else if(list===labels)p.y-=dt*35}
shake*=Math.exp(-dt*14);flash=Math.max(0,flash-dt*1.3);if(active)updateHUD()}
function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();ctx.stroke()}
function background(t){const clear=cleared||mode==='result';const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,clear?'#17658c':'#071c2c');g.addColorStop(1,clear?'#2e9aaf':'#103d49');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.lineWidth=.6;ctx.strokeStyle=clear?'#9ef4ef1a':'#6ba0b51c';for(let x=-W;x<W*2;x+=52){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-100,H);ctx.stroke()}for(let y=0;y<H;y+=62){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
ctx.save();ctx.translate(210,360);ctx.strokeStyle='#82d4d718';for(let r=80;r<500;r+=80){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke()}ctx.rotate(t*.13);ctx.strokeStyle='#84eccc30';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(450,0);ctx.stroke();ctx.restore();
// Natural Earth coastline, precompiled once into a reusable Path2D.
ctx.save();ctx.fillStyle=clear?'#70c9b6':'#326a69';ctx.strokeStyle=clear?'#b9f4d2':'#93c3ad';ctx.lineWidth=.85;ctx.fill(land);ctx.stroke(land);
ctx.restore();ctx.font='9px monospace';ctx.fillStyle='#9bcbce';ctx.fillText('N ↑',24,215);ctx.fillStyle='#f0bd94';ctx.fillText('南の海上から接近 ↑',24,478);ctx.setLineDash([5,7]);ctx.strokeStyle='#ffb38033';ctx.beginPath();ctx.moveTo(193,685);ctx.lineTo(193,420);ctx.stroke();ctx.setLineDash([]);
for(const b of bases){ctx.strokeStyle='#a8fbe4';ctx.fillStyle='#163947';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,11,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(b.x,b.y+7);ctx.lineTo(b.x-5,b.y-4);ctx.lineTo(b.x+5,b.y-4);ctx.closePath();ctx.fillStyle='#baffdf';ctx.fill();ctx.strokeStyle='#8fffe533';ctx.beginPath();ctx.arc(b.x,b.y,17+Math.sin(t*3)*3,0,TAU);ctx.stroke()}}
function draw(t){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(!reduce&&shake>.1)ctx.translate(rand(-shake,shake),rand(-shake,shake));background(t);const c=center(),r=mode==='title'?171:radius();if(!cleared){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(t*(reduce?.025:.085));ctx.globalAlpha=.4+hp*.006;ctx.drawImage(cloud,-r,-r,r*2,r*2);ctx.rotate(-t*.04+.8);ctx.globalAlpha=.2+hp*.003;ctx.drawImage(cloud,-r*.94,-r*.94,r*1.88,r*1.88);ctx.restore();ctx.strokeStyle='#acfff280';ctx.lineWidth=1;for(let a=0;a<4;a++){ctx.beginPath();ctx.arc(c.x,c.y,25,t*.2+a*Math.PI/2,t*.2+a*Math.PI/2+.45);ctx.stroke()}ctx.font='8px monospace';ctx.fillStyle='#9fe7dd';ctx.textAlign='center';if(mode==='playing')ctx.fillText(boost>0?'CORE BREAK ×2':'狙え！ / CORE',c.x,c.y-48);ctx.textAlign='left'}
if(mode==='playing'){
 ctx.save();ctx.strokeStyle=boost>0?'#ffe29a':'#ffcf87';ctx.lineWidth=2;
 ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(c.x,c.y,36,0,TAU);ctx.stroke();ctx.setLineDash([]);
 ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,41,-Math.PI/2,-Math.PI/2+TAU*lock/.65);ctx.stroke();
 if(held){ctx.strokeStyle='#e4ffff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(aim.x,aim.y,11,0,TAU);ctx.moveTo(aim.x-18,aim.y);ctx.lineTo(aim.x+18,aim.y);ctx.moveTo(aim.x,aim.y-18);ctx.lineTo(aim.x,aim.y+18);ctx.stroke()}
 ctx.restore();
}
ctx.globalCompositeOperation='lighter';
for(const b of bullets){
 const dx=b.tx-b.ox,dy=b.ty-b.oy,len=Math.max(1,Math.hypot(dx,dy)),tail=24+tier*4;
 const x=b.x-dx/len*tail,y=b.y-dy/len*tail;
 ctx.strokeStyle=b.final?'#ff7e3970':tier>=4?'#9275ff65':'#ffaf4860';ctx.lineWidth=b.final?12:7;
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.strokeStyle=b.final?'#ffecc0':tier>=4?'#dfd3ff':'#ffe49b';ctx.lineWidth=b.final?3.5:2.5;ctx.stroke();
 ctx.fillStyle='#fff9e3';ctx.beginPath();ctx.arc(b.x,b.y,b.final?3:2,0,TAU);ctx.fill();
}
for(const b of beams){ctx.globalAlpha=Math.min(1,b.life*5);ctx.strokeStyle='#7955ee60';ctx.lineWidth=32;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.tx,b.ty);ctx.stroke();ctx.strokeStyle='#ac8dff';ctx.lineWidth=11;ctx.stroke();ctx.strokeStyle='#fff2ff';ctx.lineWidth=4;ctx.stroke()}
ctx.globalAlpha=1;
for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;if(p.cloud)ctx.drawImage(cloud,p.x-p.size/2,p.y-p.size/2,p.size,p.size);else ctx.fillRect(p.x,p.y,p.size,p.size)}for(const p of rings){ctx.globalAlpha=Math.min(1,p.life*3);ctx.strokeStyle=p.color;ctx.lineWidth=cleared?6:2.5;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.stroke();if(!cleared){const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);glow.addColorStop(0,'#fff5d9b0');glow.addColorStop(.3,'#ffb85c60');glow.addColorStop(1,'#ff6c2200');ctx.fillStyle=glow;ctx.fill()}}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';for(const p of labels){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.crit?'#ffdc9e':'#c3fff0';ctx.font='bold 10px Arial';ctx.fillText(p.text,p.x,p.y);ctx.font='bold 17px Arial';ctx.fillText(p.damage,p.x,p.y+19)}ctx.globalAlpha=1;
if(mode==='final'&&finalTime<1){ctx.strokeStyle='#ff9770';for(const b of bases){ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke()}ctx.beginPath();ctx.arc(c.x,c.y,55-finalTime*25,0,TAU);ctx.stroke()}
if(mode==='final'&&finalTime>2.7&&finalTime<3.1){const power=(finalTime-2.7)/.4;ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#96ffee';ctx.lineWidth=20+power*75;ctx.beginPath();ctx.moveTo(210,0);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=10+power*35;ctx.stroke();ctx.globalCompositeOperation='source-over'}ctx.restore();if(flash>0){ctx.fillStyle=`rgba(235,255,255,${flash})`;ctx.fillRect(0,0,W,H)}}
function loop(now){const dt=Math.min(.035,(now-last)/1000||.016);last=now;update(dt);draw(now/1000);requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();
