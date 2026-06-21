(() => {
  "use strict";
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const ui = {
    clock: document.querySelector("#clock"), dayBar: document.querySelector("#dayBar"),
    rescued: document.querySelector("#rescueCount"), start: document.querySelector("#startScreen"),
    result: document.querySelector("#resultScreen"), resultLabel: document.querySelector("#resultLabel"),
    resultTitle: document.querySelector("#resultTitle"), resultText: document.querySelector("#resultText"),
    resultSun: document.querySelector("#resultSun"), flash: document.querySelector("#flash"),
    sound: document.querySelector("#soundButton")
  };
  const W = 390, H = 620, TOP = 58, DURATION = 72;
  const state = { running:false, ended:false, elapsed:0, shadeTime:0, health:100, muted:false, target:null, last:0, particles:[], shadeKey:null, linger:0, crossings:0, rescued:0, lost:0, carrying:null };
  const player = { x:43, y:548, r:12 };
  const objects = [
    {x:62,y:492,r:35,type:"tree",burnt:0}, {x:302,y:493,r:39,type:"tree",burnt:0},
    {x:205,y:383,r:30,type:"rock",burnt:0}, {x:76,y:278,r:34,type:"tree",burnt:0},
    {x:312,y:226,r:31,type:"tree",burnt:0}, {x:172,y:150,r:27,type:"rock",burnt:0}
  ];
  const clouds = [
    {x:230,startX:230,y:320,rx:62,ry:26,speed:13,burnt:0},
    {x:35,startX:35,y:195,rx:48,ry:21,speed:18,burnt:0},
    {x:360,startX:360,y:455,rx:70,ry:28,speed:-12,burnt:0},
    {x:120,startX:120,y:115,rx:42,ry:18,speed:-21,burnt:0}
  ];
  const birds = [
    {x:-30,startX:-30,y:470,baseY:470,rx:30,ry:10,speed:58,phase:0,burnt:0},
    {x:430,startX:430,y:365,baseY:365,rx:27,ry:9,speed:-72,phase:2,burnt:0},
    {x:-120,startX:-120,y:260,baseY:260,rx:34,ry:11,speed:82,phase:4,burnt:0},
    {x:510,startX:510,y:175,baseY:175,rx:25,ry:8,speed:-63,phase:1,burnt:0},
    {x:-260,startX:-260,y:545,baseY:545,rx:28,ry:9,speed:70,phase:3,burnt:0}
  ];
  const rescueSpots = [
    {x:160,y:555},{x:345,y:550},{x:118,y:438},{x:260,y:425},
    {x:32,y:340},{x:155,y:315},{x:350,y:330},{x:222,y:245},{x:125,y:125},{x:345,y:115}
  ];
  const critters = Array.from({length:4},(_,i)=>({id:i,x:0,y:0,hp:100,rate:0,active:false,respawn:0,phase:i*1.7}));

  function reset() {
    Object.assign(state,{running:true,ended:false,elapsed:0,shadeTime:0,health:100,target:null,last:performance.now(),particles:[],shadeKey:null,linger:0,crossings:0,rescued:0,lost:0,carrying:null});
    player.x=43; player.y=548;
    objects.forEach(o=>o.burnt=0); clouds.forEach(c=>{c.x=c.startX;c.burnt=0;}); birds.forEach(b=>{b.x=b.startX;b.y=b.baseY;b.burnt=0;});
    critters.forEach((c,i)=>spawnCritter(c,i*2));
    ui.result.classList.add("hidden"); ui.start.classList.add("hidden");
    tone(320,.08,"sine"); requestAnimationFrame(loop);
  }

  function sunData() {
    const p=Math.min(1,state.elapsed/DURATION);
    const altitude=.18+Math.sin(p*Math.PI)*.82;
    const angle=-.42+p*.84;
    const len=18+(1-altitude)*92;
    return {p,altitude,dx:Math.sin(angle)*len,dy:Math.cos(angle)*len};
  }
  function shadowFor(o,s) {
    const scale=o.type==="tree" ? 1.18 : .9;
    return {x:o.x+s.dx*.66,y:o.y+s.dy*.66,rx:o.r*scale+s.altitude*-o.r*.25,ry:o.r*.58+s.dy*.24};
  }
  function ellipseHit(x,y,e,pad=0){ return ((x-e.x)**2/(e.rx+pad)**2)+((y-e.y)**2/(e.ry+pad)**2)<=1; }
  function shadeAt(s) {
    for(let i=0;i<objects.length;i++) if(objects[i].burnt<=0 && ellipseHit(player.x,player.y,shadowFor(objects[i],s),-2)) return {key:`o${i}`,source:objects[i],shape:shadowFor(objects[i],s)};
    for(let i=0;i<clouds.length;i++) if(clouds[i].burnt<=0 && ellipseHit(player.x,player.y,clouds[i],-2)) return {key:`c${i}`,source:clouds[i],shape:clouds[i]};
    for(let i=0;i<birds.length;i++) if(birds[i].burnt<=0 && ellipseHit(player.x,player.y,birds[i],-1)) return {key:`b${i}`,source:birds[i],shape:birds[i]};
    return null;
  }

  function update(dt) {
    state.elapsed=Math.min(DURATION,state.elapsed+dt);
    const s=sunData();
    objects.forEach(o=>o.burnt=Math.max(0,o.burnt-dt));
    clouds.forEach((c,i)=>{
      c.burnt=Math.max(0,c.burnt-dt); c.x+=c.speed*dt;
      if(c.speed>0 && c.x-c.rx>W) c.x=-c.rx-i*55;
      if(c.speed<0 && c.x+c.rx<0) c.x=W+c.rx+i*55;
    });
    birds.forEach((b,i)=>{
      b.burnt=Math.max(0,b.burnt-dt); b.x+=b.speed*dt; b.y=b.baseY+Math.sin(state.elapsed*2.2+b.phase)*10;
      if(b.speed>0 && b.x-b.rx>W) b.x=-b.rx-90-i*75;
      if(b.speed<0 && b.x+b.rx<0) b.x=W+b.rx+90+i*70;
    });
    if(state.target){
      const dx=state.target.x-player.x, dy=state.target.y-player.y, d=Math.hypot(dx,dy);
      if(d>3){ const speed=state.carrying===null?152:112, step=Math.min(d,speed*dt); player.x+=dx/d*step; player.y+=dy/d*step; }
    }
    player.x=Math.max(player.r,Math.min(W-player.r,player.x));
    player.y=Math.max(TOP+player.r,Math.min(H-player.r,player.y));
    const zone=shadeAt(s), safe=!!zone;
    if(safe){
      state.shadeTime+=dt; state.health=Math.min(100,state.health+15*dt);
      if(state.shadeKey===zone.key) state.linger+=dt;
      else { state.shadeKey=zone.key; state.linger=0; state.crossings+=1; tone(420,.04,"sine",.018); }
      if(state.linger>=5.2){
        zone.source.burnt=6.5; state.shadeKey=null; state.linger=0; state.health-=12;
        ui.flash.classList.remove("hit"); void ui.flash.offsetWidth; ui.flash.classList.add("hit");
        for(let i=0;i<16;i++) spark(); tone(105,.18,"sawtooth",.05);
      }
    } else { state.shadeKey=null; state.linger=0; state.health-= (10+13*s.altitude)*dt; if(Math.random()<dt*10) spark(); }
    updateCritters(dt,safe,s);
    state.particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;});
    state.particles=state.particles.filter(p=>p.life>0);
    updateUI(s);
    if(state.health<=0) end(false); else if(state.elapsed>=DURATION) end(true);
  }

  function updateUI(s){
    const mins=9*60+Math.round(s.p*10*60), hh=Math.floor(mins/60), mm=String(mins%60).padStart(2,"0");
    ui.clock.textContent=`${hh}:${mm}`; ui.dayBar.style.width=`${s.p*100}%`; ui.rescued.textContent=`${state.rescued}匹`;
  }

  function draw() {
    const s=sunData(), zone=shadeAt(s), safe=!!zone;
    const sky=ctx.createLinearGradient(0,TOP,0,H); sky.addColorStop(0,"#f6bd48"); sky.addColorStop(1,"#dd8b35");
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.18; ctx.strokeStyle="#fff4bd"; ctx.lineWidth=1;
    for(let y=80;y<H;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.globalAlpha=1;
    objects.forEach(o=>drawShadow(shadowFor(o,s),o.burnt>0?.1:.5));
    clouds.forEach(c=>drawCloudShadow(c,c.burnt>0?.04:.28));
    birds.forEach(b=>drawBirdShadow(b,b.burnt>0?.04:.42));
    objects.forEach(drawObject);
    critters.forEach(drawCritter);
    state.particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.color||"#fff6c4";ctx.fillRect(p.x,p.y,3,6);}); ctx.globalAlpha=1;
    if(state.target && state.running){ctx.strokeStyle="rgba(255,255,255,.65)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(state.target.x,state.target.y,10,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle=safe?"#17212b":"#ef4f36"; ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle="#fff8e8";ctx.stroke();
    if(state.carrying!==null){
      const c=critters[state.carrying];ctx.fillStyle="#f5df87";ctx.beginPath();ctx.arc(player.x,player.y-17,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#17212b";ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle="#17212b";ctx.font="900 8px sans-serif";ctx.textAlign="center";ctx.fillText("運搬中",player.x,player.y-31);ctx.textAlign="left";
    }
    ctx.fillStyle="#17212b";ctx.fillRect(18,76,108,9);ctx.strokeStyle="#17212b";ctx.lineWidth=2;ctx.strokeRect(18,76,108,9);
    ctx.fillStyle=state.health>35?"#fff8e8":"#ef5037";ctx.fillRect(19,77,106*Math.max(0,state.health)/100,7);
    ctx.fillStyle="#17212b";ctx.font="900 9px sans-serif";ctx.fillText(safe?"IN THE SHADE":"TOO BRIGHT!",18,70);
    if(zone && state.linger>3.15){
      const urgency=Math.min(1,(state.linger-3.15)/2.05), e=zone.shape;
      ctx.strokeStyle=`rgba(239,79,54,${.55+urgency*.45})`;ctx.lineWidth=3+urgency*3;ctx.setLineDash([7,6]);
      ctx.beginPath();ctx.ellipse(e.x,e.y,Math.max(8,e.rx+5),Math.max(7,e.ry+5),0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="#ef4f36";ctx.font="900 14px sans-serif";ctx.textAlign="center";ctx.fillText("太陽に見つかった！",W/2,111);ctx.textAlign="left";
    }
    if(!safe && state.running){ctx.fillStyle=`rgba(255,238,143,${.08+s.altitude*.08})`;ctx.fillRect(0,TOP,W,H-TOP);}
  }
  function drawShadow(e,a=.5){ctx.fillStyle=`rgba(20,39,47,${a})`;ctx.beginPath();ctx.ellipse(e.x,e.y,Math.max(8,e.rx),Math.max(7,e.ry),0,0,Math.PI*2);ctx.fill();}
  function drawCloudShadow(c,a){
    ctx.fillStyle=`rgba(20,39,47,${a})`;
    [[-.42,.04,.48],[0,-.14,.62],[.43,.05,.43]].forEach(([ox,oy,r])=>{ctx.beginPath();ctx.ellipse(c.x+c.rx*ox,c.y+c.ry*oy,c.rx*r,c.ry*.78,0,0,Math.PI*2);ctx.fill();});
  }
  function drawBirdShadow(b,a){
    ctx.fillStyle=`rgba(20,39,47,${a})`;ctx.save();ctx.translate(b.x,b.y);
    const flap=.45+Math.sin(state.elapsed*12+b.phase)*.22;
    ctx.beginPath();ctx.moveTo(0,1);ctx.quadraticCurveTo(-b.rx*.45,-b.ry*(1+flap),-b.rx,0);ctx.quadraticCurveTo(-b.rx*.42,b.ry*.3,0,3);ctx.quadraticCurveTo(b.rx*.42,b.ry*.3,b.rx,0);ctx.quadraticCurveTo(b.rx*.45,-b.ry*(1+flap),0,1);ctx.fill();ctx.restore();
  }
  function drawObject(o){
    if(o.type==="tree"){ctx.strokeStyle="#684a2b";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(o.x,o.y+14);ctx.lineTo(o.x,o.y-12);ctx.stroke();ctx.fillStyle="#2d6656";for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(o.x+Math.cos(a)*o.r*.42,o.y-18+Math.sin(a)*o.r*.35,o.r*.55,0,Math.PI*2);ctx.fill();}}
    else {ctx.fillStyle="#806f61";ctx.beginPath();ctx.ellipse(o.x,o.y,o.r,o.r*.68,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#a18d78";ctx.beginPath();ctx.ellipse(o.x-6,o.y-7,o.r*.5,o.r*.23,-.2,0,Math.PI*2);ctx.fill();}
  }
  function drawCritter(c){
    if(!c.active || state.carrying===c.id)return;
    const bob=Math.sin(state.elapsed*5+c.phase)*2;
    ctx.strokeStyle="rgba(23,33,43,.25)";ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,15,-Math.PI/2,-Math.PI/2+Math.PI*2*(c.hp/100));ctx.stroke();
    ctx.strokeStyle=c.hp>45?"#fff2b0":"#ef4f36";ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,c.y,15,-Math.PI/2,-Math.PI/2+Math.PI*2*(c.hp/100));ctx.stroke();
    ctx.fillStyle="#f5df87";ctx.beginPath();ctx.arc(c.x,c.y+bob,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#17212b";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#17212b";ctx.beginPath();ctx.arc(c.x-3,c.y-2+bob,1.2,0,Math.PI*2);ctx.arc(c.x+3,c.y-2+bob,1.2,0,Math.PI*2);ctx.fill();
  }
  function spark(){state.particles.push({x:player.x+(Math.random()-.5)*18,y:player.y-10,vx:(Math.random()-.5)*12,vy:-18-Math.random()*20,life:.35+Math.random()*.35});}

  function spawnCritter(c,offset=0){
    const used=critters.filter(x=>x.active&&x!==c).map(x=>x.x+","+x.y);
    const choices=rescueSpots.filter(p=>!used.includes(p.x+","+p.y) && Math.hypot(p.x-player.x,p.y-player.y)>90);
    const p=choices[(Math.floor(Math.random()*choices.length)+offset)%choices.length]||rescueSpots[offset%rescueSpots.length];
    Object.assign(c,{x:p.x,y:p.y,hp:100,rate:5.3+Math.random()*3.2,active:true,respawn:0});
  }

  function updateCritters(dt,playerSafe,s){
    for(const c of critters){
      if(!c.active){c.respawn-=dt;if(c.respawn<=0)spawnCritter(c,c.id);continue;}
      if(state.carrying===c.id){
        c.x=player.x;c.y=player.y-17;c.hp-=c.rate*dt*.45;
        if(playerSafe){
          state.rescued+=1;state.carrying=null;c.active=false;c.respawn=1.4;
          burstAt(player.x,player.y,"#fff3ad",18);tone(620,.12,"sine",.045);
        }
      } else {
        const protectedNow=pointInAnyShade(c.x,c.y,s);
        if(!protectedNow)c.hp-=c.rate*dt;
        if(state.carrying===null && Math.hypot(c.x-player.x,c.y-player.y)<23){state.carrying=c.id;tone(360,.07,"sine",.035);}
      }
      if(c.hp<=0){
        if(state.carrying===c.id)state.carrying=null;
        c.active=false;c.respawn=2.2;state.lost+=1;burstAt(c.x,c.y,"#ef5d3d",10);tone(120,.12,"square",.025);
      }
    }
  }

  function pointInAnyShade(x,y,s){
    if(objects.some(o=>o.burnt<=0&&ellipseHit(x,y,shadowFor(o,s),-3)))return true;
    if(clouds.some(c=>c.burnt<=0&&ellipseHit(x,y,c,-3)))return true;
    return birds.some(b=>b.burnt<=0&&ellipseHit(x,y,b,-2));
  }

  function burstAt(x,y,color,count){for(let i=0;i<count;i++)state.particles.push({x,y,vx:(Math.random()-.5)*70,vy:-25-Math.random()*45,life:.45+Math.random()*.45,color});}

  function end(win){
    state.running=false;state.ended=true;ui.result.classList.remove("hidden");ui.resultSun.style.display=win?"block":"none";
    ui.resultLabel.textContent=win?"SUNSET / 19:00":"EVAPORATED";
    ui.resultTitle.innerHTML=win?"日没まで、<br>影へ運んだ。":"太陽が、<br>長すぎた。";
    ui.resultText.textContent=win?`救出 ${state.rescued}匹　救えなかった ${state.lost}匹`:`${ui.clock.textContent}まで　救出 ${state.rescued}匹`;
    tone(win?520:95,.22,win?"sine":"sawtooth");
  }
  function pointer(e){const r=canvas.getBoundingClientRect();state.target={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  canvas.addEventListener("pointerdown",e=>{if(state.running){pointer(e);canvas.setPointerCapture(e.pointerId);tone(220,.025,"sine",.015);}});
  canvas.addEventListener("pointermove",e=>{if(state.running&&e.buttons)pointer(e);});
  canvas.addEventListener("pointerup",()=>state.target=null);canvas.addEventListener("pointercancel",()=>state.target=null);
  function loop(now){if(!state.running)return;const dt=Math.min(.033,(now-state.last)/1000);state.last=now;update(dt);draw();if(state.running)requestAnimationFrame(loop);}
  function tone(freq,dur,type="sine",vol=.035){if(state.muted)return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;state.audio=state.audio||new A();const o=state.audio.createOscillator(),g=state.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.audio.currentTime+dur);o.connect(g).connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+dur);}
  document.querySelector("#startButton").addEventListener("click",reset);document.querySelector("#retryButton").addEventListener("click",reset);
  ui.sound.addEventListener("click",()=>{state.muted=!state.muted;ui.sound.classList.toggle("off",state.muted);ui.sound.textContent=state.muted?"×":"♪";});
  draw();
})();
