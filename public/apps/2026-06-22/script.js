(() => {
  "use strict";
  const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
  const ui={time:document.querySelector("#timeValue"),score:document.querySelector("#scoreValue"),combo:document.querySelector("#comboValue"),start:document.querySelector("#startScreen"),result:document.querySelector("#resultScreen"),label:document.querySelector("#resultLabel"),title:document.querySelector("#resultTitle"),text:document.querySelector("#resultText"),crab:document.querySelector("#resultCrab"),sound:document.querySelector("#soundButton")};
  const W=390,H=620,TOP=62,DURATION=30;
  const holes=[{x:78,y:220},{x:195,y:204},{x:312,y:220},{x:92,y:350},{x:205,y:338},{x:310,y:358},{x:76,y:490},{x:195,y:474},{x:315,y:494}];
  const state={running:false,elapsed:0,last:0,score:0,combo:0,best:0,hits:0,misses:0,spawn:0,muted:false,audio:null,actors:[],particles:[],texts:[],shake:0,fever:0};

  function reset(){Object.assign(state,{running:true,elapsed:0,last:performance.now(),score:0,combo:0,best:0,hits:0,misses:0,spawn:1.15,actors:[{hole:4,type:"crab",t:0,life:1.8,done:false,hit:false}],particles:[],texts:[],shake:0,fever:0});ui.start.classList.add("hidden");ui.result.classList.add("hidden");updateUI();tone(330,.08);requestAnimationFrame(loop);}
  function spawn(){
    const occupied=new Set(state.actors.filter(a=>!a.done).map(a=>a.hole));let choices=holes.map((_,i)=>i).filter(i=>!occupied.has(i));if(!choices.length)return;
    const hole=choices[Math.floor(Math.random()*choices.length)],roll=Math.random();let type=roll<.12?"gold":roll<.25?"hermit":"crab";
    const speed=Math.max(.58,1.18-state.elapsed*.014)*(type==="gold"?.82:1);
    state.actors.push({hole,type,t:0,life:speed,done:false,hit:false});
  }
  function update(dt){
    state.elapsed+=dt;state.spawn-=dt;state.shake=Math.max(0,state.shake-dt);state.fever=Math.max(0,state.fever-dt);
    if(state.spawn<=0){spawn();if(state.elapsed>8&&Math.random()<.28)spawn();state.spawn=Math.max(.24,.62-state.elapsed*.009)+Math.random()*.2;}
    state.actors.forEach(a=>{a.t+=dt;if(!a.done&&a.t>a.life){a.done=true;if(a.type!=="hermit"){state.combo=0;state.misses++;}}});
    state.particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;});
    state.texts.forEach(t=>{t.life-=dt;t.y-=32*dt;});
    state.actors=state.actors.filter(a=>a.t<a.life+.3);state.particles=state.particles.filter(p=>p.life>0);state.texts=state.texts.filter(t=>t.life>0);
    updateUI();if(state.elapsed>=DURATION)end();
  }
  function actorRise(a){const p=a.t/a.life;if(p<.18)return ease(p/.18);if(p<.72)return 1;return 1-ease((p-.72)/.28);}
  function ease(v){return 1-Math.pow(1-v,3);}
  function hitTest(x,y){
    for(let i=state.actors.length-1;i>=0;i--){const a=state.actors[i],h=holes[a.hole],rise=actorRise(a);if(a.done||rise<.42)continue;const cy=h.y-18-rise*30;if(((x-h.x)/31)**2+((y-cy)/34)**2<1){hit(a,h);return;}}
    state.combo=0;state.shake=.08;tone(120,.05,"square",.015);updateUI();
  }
  function hit(a,h){a.done=true;a.hit=true;if(a.type==="hermit"){state.combo=0;state.score=Math.max(0,state.score-20);popText(h.x,h.y-55,"-20","#243a48");burst(h.x,h.y-35,"#243a48",12);state.shake=.24;tone(90,.18,"sawtooth",.04);return;}
    const base=a.type==="gold"?30:10;state.combo++;state.best=Math.max(state.best,state.combo);state.hits++;const bonus=state.combo>=10?2:1;state.score+=base*bonus;if(state.combo===10)state.fever=2.5;
    popText(h.x,h.y-58,`+${base*bonus}`,a.type==="gold"?"#ffd34f":"#ec684c");burst(h.x,h.y-35,a.type==="gold"?"#ffd34f":"#fff8df",a.type==="gold"?22:13);tone(a.type==="gold"?760:430+Math.min(220,state.combo*18),.07,"sine",.045);
  }
  function popText(x,y,text,color){state.texts.push({x,y,text,color,life:.7});}
  function burst(x,y,color,n){for(let i=0;i<n;i++)state.particles.push({x,y,vx:(Math.random()-.5)*150,vy:-35-Math.random()*100,life:.35+Math.random()*.35,color,size:2+Math.random()*4});}
  function updateUI(){ui.time.textContent=Math.max(0,Math.ceil(DURATION-state.elapsed));ui.score.textContent=state.score;ui.combo.textContent=state.combo;}
  function draw(){
    ctx.save();if(state.shake)ctx.translate((Math.random()-.5)*9,(Math.random()-.5)*7);
    const bg=ctx.createLinearGradient(0,TOP,0,H);bg.addColorStop(0,"#67c5cf");bg.addColorStop(.17,"#9bdbd4");bg.addColorStop(.18,"#f1d58e");bg.addColorStop(1,"#e8bd70");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    drawSea();drawSand();holes.forEach((h,i)=>drawHole(h,i));state.actors.slice().sort((a,b)=>holes[a.hole].y-holes[b.hole].y).forEach(drawActor);state.particles.forEach(drawParticle);state.texts.forEach(drawText);
    if(state.fever>0){ctx.strokeStyle=`rgba(255,211,79,${.45+Math.sin(state.elapsed*14)*.25})`;ctx.lineWidth=10;ctx.strokeRect(5,TOP+5,W-10,H-TOP-10);ctx.fillStyle="#17303c";ctx.font="900 15px sans-serif";ctx.textAlign="center";ctx.fillText("10 COMBO!  SCORE ×2",W/2,91);}
    ctx.restore();
  }
  function drawSea(){ctx.globalAlpha=.25;ctx.strokeStyle="#fff";ctx.lineWidth=3;for(let y=82;y<156;y+=25){ctx.beginPath();for(let x=-20;x<W+20;x+=20)ctx.quadraticCurveTo(x+10,y+Math.sin(x*.07+state.elapsed)*3,x+20,y);ctx.stroke();}ctx.globalAlpha=1;ctx.strokeStyle="rgba(255,255,255,.82)";ctx.lineWidth=6;ctx.beginPath();for(let x=-15;x<W+20;x+=18)ctx.quadraticCurveTo(x+9,165+Math.sin(x*.1+state.elapsed)*4,x+18,165);ctx.stroke();}
  function drawSand(){ctx.fillStyle="rgba(105,70,40,.15)";for(let i=0;i<48;i++){let x=(i*73)%W,y=184+(i*53)%430;ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill();}}
  function drawHole(h,i){ctx.fillStyle="rgba(91,55,35,.28)";ctx.beginPath();ctx.ellipse(h.x,h.y+4,42,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,245,207,.35)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x-31,h.y-1,8,2.9,5.8);ctx.stroke();}
  function drawActor(a){const h=holes[a.hole],rise=actorRise(a);if(rise<=.02)return;ctx.save();ctx.beginPath();ctx.rect(h.x-44,h.y-76,88,80);ctx.clip();ctx.translate(h.x,h.y+12-rise*60);if(a.hit){ctx.rotate((a.type==="hermit"?-1:1)*a.t*8);ctx.scale(1-a.t*.8,1-a.t*.8);}if(a.type==="hermit")drawHermit();else drawCrab(a.type==="gold");ctx.restore();}
  function drawCrab(gold){const fill=gold?"#ffd34f":"#ec684c",stroke="#17303c";ctx.strokeStyle=stroke;ctx.lineWidth=2.4;ctx.lineCap="round";ctx.fillStyle=fill;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*18,8);ctx.lineTo(s*34,18);ctx.stroke();ctx.beginPath();ctx.arc(s*35,13,10,.2,5.8);ctx.lineTo(s*35,13);ctx.closePath();ctx.fill();ctx.stroke();}ctx.beginPath();ctx.ellipse(0,10,29,22,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-11,-5);ctx.lineTo(-12,-18);ctx.moveTo(11,-5);ctx.lineTo(12,-18);ctx.stroke();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-12,-19,6,0,Math.PI*2);ctx.arc(12,-19,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=stroke;ctx.beginPath();ctx.arc(-11,-19,2,0,Math.PI*2);ctx.arc(13,-19,2,0,Math.PI*2);ctx.fill();if(gold){ctx.font="900 10px sans-serif";ctx.textAlign="center";ctx.fillText("×3",0,14);}}
  function drawHermit(){ctx.fillStyle="#f6e6bd";ctx.strokeStyle="#17303c";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(-4,3,24,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle="#d39d65";ctx.beginPath();ctx.arc(-4,3,15,0,Math.PI*1.75);ctx.stroke();ctx.fillStyle="#78a9ac";ctx.strokeStyle="#17303c";ctx.beginPath();ctx.ellipse(17,17,18,11,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#17303c";ctx.beginPath();ctx.arc(24,14,2,0,Math.PI*2);ctx.fill();}
  function drawParticle(p){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);ctx.globalAlpha=1;}
  function drawText(t){ctx.globalAlpha=Math.min(1,t.life*2);ctx.fillStyle=t.color;ctx.strokeStyle="#17303c";ctx.lineWidth=4;ctx.font="900 22px sans-serif";ctx.textAlign="center";ctx.strokeText(t.text,t.x,t.y);ctx.fillText(t.text,t.x,t.y);ctx.globalAlpha=1;}
  function end(){if(!state.running)return;state.running=false;ui.result.classList.remove("hidden");let rank=state.score>=600?"カニ神":state.score>=350?"カニ名人":state.score>=180?"カニ係長":"カニ見習い";ui.label.textContent=`TIME UP / ${rank}`;ui.title.innerHTML=state.score>=350?"カニの日、<br>完全勝利。":"カニはまだ、<br>潜んでいる。";ui.text.textContent=`${state.score}点　${state.hits}匹ヒット　最大${state.best}コンボ`;tone(state.score>=350?660:180,.25,state.score>=350?"sine":"square",.05);}
  function pointer(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  canvas.addEventListener("pointerdown",e=>{if(!state.running)return;e.preventDefault();const p=pointer(e);hitTest(p.x,p.y);});
  function loop(now){if(!state.running)return;const dt=Math.min(.033,(now-state.last)/1000);state.last=now;update(dt);draw();if(state.running)requestAnimationFrame(loop);}
  function tone(freq,dur,type="sine",vol=.035){if(state.muted)return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;state.audio=state.audio||new A();const o=state.audio.createOscillator(),g=state.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.audio.currentTime+dur);o.connect(g).connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+dur);}
  document.querySelector("#startButton").addEventListener("click",reset);document.querySelector("#retryButton").addEventListener("click",reset);ui.sound.addEventListener("click",()=>{state.muted=!state.muted;ui.sound.classList.toggle("off",state.muted);ui.sound.textContent=state.muted?"×":"♪";});draw();
})();
