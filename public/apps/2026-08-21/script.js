(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const partsDef = [
    {type:'vertical',name:'直上噴水',sub:'高く噴き上がる',icon:'↑',color:'#42d5ff'},
    {type:'arch',name:'アーチ噴水',sub:'美しい放物線',icon:'⌒',color:'#65dbff'},
    {type:'fan',name:'扇形噴水',sub:'広範囲に噴射',icon:'≋',color:'#70e1ff'},
    {type:'rotate',name:'回転噴水',sub:'くるくる回転',icon:'↻',color:'#78efff'},
    {type:'mist',name:'ミスト噴水',sub:'涼しい霧',icon:'⁙',color:'#d2f8ff'},
    {type:'light',name:'ライト',sub:'水を照らす',icon:'✦',color:'#ff65c8'}
  ];
  const colors=['#42d5ff','#4b8dff','#a86eff','#ff5bbd','#ff785a','#ffd75b','#71f0bc','#ffffff'];
  const state={items:[],selected:null,tool:'vertical',history:[],night:false,sound:true,playing:false,playStart:0,lastResult:null};
  const canvas=$('#fountainCanvas'),ctx=canvas.getContext('2d'),stage=$('#stageWrap');
  const resultCanvas=$('#resultCanvas'),rctx=resultCanvas.getContext('2d');
  let dpr=1,drag=null,raf=0,audioCtx=null,noiseNode=null;

  function init(){
    $('#parts').innerHTML=partsDef.map((p,i)=>`<button class="part-btn ${i===0?'active':''}" data-type="${p.type}" aria-label="${p.name}"><span class="part-icon" style="color:${p.color}">${p.icon}</span><b>${p.name}</b><small>${p.sub}</small></button>`).join('');
    $('#colorPicker').innerHTML=`<div class="color-picker">${colors.map(c=>`<button class="color-dot" style="background:${c}" data-color="${c}" aria-label="色 ${c}"></button>`).join('')}</div>`;
    bind(); resize(); requestAnimationFrame(loop);
  }
  function bind(){
    $('#startBtn').onclick=()=>{ $('#titleScreen').classList.add('hidden');$('#app').classList.remove('hidden');resize(); if(!localStorage.getItem('fountainTutorial')) $('#tutorial').classList.remove('hidden'); };
    $('#tutorialStart').onclick=()=>closeTutorial();
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const id=b.dataset.close;$('#'+id).classList.add('hidden');if(id==='tutorial')localStorage.setItem('fountainTutorial','1')});
    $('#parts').onclick=e=>{const b=e.target.closest('.part-btn');if(!b)return;state.tool=b.dataset.type;document.querySelectorAll('.part-btn').forEach(x=>x.classList.toggle('active',x===b));};
    stage.addEventListener('pointerdown',pointerDown);stage.addEventListener('pointermove',pointerMove);stage.addEventListener('pointerup',pointerUp);stage.addEventListener('pointercancel',pointerUp);
    $('#undoBtn').onclick=undo; $('#clearBtn').onclick=clearAll; $('#randomBtn').onclick=randomize; $('#deleteBtn').onclick=deleteSelected;
    $('#editExpandBtn').onclick=()=>setEditorExpanded(!$('#editPanel').classList.contains('expanded'));
    $('#editCloseBtn').onclick=()=>{$('#editPanel').classList.remove('mobile-open','expanded');$('#editExpandBtn').setAttribute('aria-expanded','false')};
    $('#dayBtn').onclick=toggleDay; $('#soundBtn').onclick=toggleSound; $('#playBtn').onclick=toggleShow; $('#judgeBtn').onclick=judge;
    ['angle','power','range','timing'].forEach(key=>{$(`#${key}Input`).addEventListener('input',e=>updateValue(key,+e.target.value));});
    $('#patternInput').onchange=e=>updateValue('pattern',e.target.value);
    $('#colorPicker').onclick=e=>{const b=e.target.closest('.color-dot');if(b)updateValue('color',b.dataset.color)};
    $('#xInput').onchange=e=>updateValue('x',clamp(+e.target.value,3,97)/100);$('#yInput').onchange=e=>updateValue('y',clamp(+e.target.value,3,97)/100);
    $('#editAgainBtn').onclick=()=>$('#resultModal').classList.add('hidden'); $('#restartBtn').onclick=()=>{clearAll(true);$('#resultModal').classList.add('hidden')};
    $('#saveBtn').onclick=saveResult;$('#shareBtn').onclick=shareResult;window.addEventListener('resize',resize);
  }
  function closeTutorial(){localStorage.setItem('fountainTutorial','1');$('#tutorial').classList.add('hidden')}
  function snapshot(){state.history.push(JSON.stringify(state.items));if(state.history.length>30)state.history.shift()}
  function undo(){if(!state.history.length)return toast('これ以上は戻れません');state.items=JSON.parse(state.history.pop());state.selected=null;refreshUI();}
  function addItem(x,y,type=state.tool,quiet=false){if(state.items.length>=24)return toast('広場が満員です（24個まで）');if(!quiet)snapshot();const def=partsDef.find(p=>p.type===type);const item={id:Date.now()+Math.random(),type,name:def.name,x,y,angle:Math.round(Math.random()*7)*45,power:60,range:50,timing:0,pattern:'always',color:def.color};state.items.push(item);select(item.id);refreshUI();}
  function hitTest(x,y){const radius=30/(stage.clientWidth||600);return [...state.items].reverse().find(i=>Math.hypot(i.x-x,(i.y-y)*(stage.clientHeight/stage.clientWidth))<radius)}
  function pos(e){const r=stage.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)}}
  function pointerDown(e){if(state.playing)return;const p=pos(e),hit=hitTest(p.x,p.y);stage.setPointerCapture(e.pointerId);if(hit){select(hit.id);snapshot();drag={id:hit.id,dx:p.x-hit.x,dy:p.y-hit.y,moved:false}}else{addItem(p.x,p.y);drag={id:state.selected,dx:0,dy:0,moved:false}}}
  function pointerMove(e){if(!drag)return;const p=pos(e),i=state.items.find(v=>v.id===drag.id);if(i){i.x=clamp(p.x-drag.dx,.03,.97);i.y=clamp(p.y-drag.dy,.03,.97);drag.moved=true;syncControls(i)}}
  function pointerUp(){drag=null}
  function select(id){state.selected=id;refreshUI();if(innerWidth<=900){$('#editPanel').classList.add('mobile-open');setEditorExpanded(false)}}
  function setEditorExpanded(open){const panel=$('#editPanel'),button=$('#editExpandBtn');panel.classList.toggle('expanded',open);button.textContent=open?'閉じる⌄':'調整する⌃';button.setAttribute('aria-expanded',String(open))}
  function selected(){return state.items.find(i=>i.id===state.selected)}
  function updateValue(k,v){const i=selected();if(!i)return;snapshot();i[k]=v;syncControls(i)}
  function deleteSelected(){if(!selected())return;snapshot();state.items=state.items.filter(i=>i.id!==state.selected);state.selected=null;refreshUI()}
  function clearAll(force=false){if(!state.items.length)return;if(!force&&!confirm('広場のパーツを全部片づけますか？'))return;snapshot();state.items=[];state.selected=null;refreshUI();toast('広場をきれいにしました')}
  function randomize(){snapshot();state.items=[];const n=6+Math.floor(Math.random()*7);for(let j=0;j<n;j++){const d=partsDef[Math.floor(Math.random()*partsDef.length)];const a=(j/n)*Math.PI*2;state.items.push({id:Date.now()+j+Math.random(),type:d.type,name:d.name,x:.5+Math.cos(a)*(.17+Math.random()*.18),y:.5+Math.sin(a)*(.2+Math.random()*.18),angle:Math.round((a*180/Math.PI+90+360)%360),power:35+Math.floor(Math.random()*61),range:25+Math.floor(Math.random()*70),timing:+(j*.25).toFixed(1),pattern:['always','slow','wave','sequence'][Math.floor(Math.random()*4)],color:colors[Math.floor(Math.random()*colors.length)]});}state.selected=state.items[0]?.id;refreshUI();toast('敏腕AI（自称）が配置しました')}
  function refreshUI(){const i=selected(),has=!!i;$('#emptyHint').classList.toggle('hidden',state.items.length>0);$('#partCount').textContent=`${state.items.length} / 24 PARTS`;$('#noSelection').classList.toggle('hidden',has);$('#controls').classList.toggle('hidden',!has);$('#editPanel').classList.toggle('disabled',!has);if(!has){$('#editPanel').classList.remove('mobile-open','expanded');$('#editExpandBtn').setAttribute('aria-expanded','false')}else syncControls(i)}
  function syncControls(i){const def=partsDef.find(p=>p.type===i.type);$('#selectedIcon').textContent=def.icon;$('#selectedIcon').style.color=i.color;$('#selectedName').textContent=i.name;['angle','power','range','timing'].forEach(k=>{$(`#${k}Input`).value=i[k]});$('#angleOut').textContent=`${i.angle}°`;$('#powerOut').textContent=`${i.power}%`;$('#rangeOut').textContent=`${i.range}%`;$('#timingOut').textContent=`${i.timing.toFixed(1)}秒`;$('#patternInput').value=i.pattern;$('#xInput').value=Math.round(i.x*100);$('#yInput').value=Math.round(i.y*100);document.querySelectorAll('.color-dot').forEach(b=>b.classList.toggle('active',b.dataset.color.toLowerCase()===i.color.toLowerCase()))}
  function toggleDay(){state.night=!state.night;$('#app').classList.toggle('night',state.night);$('#dayBtn').innerHTML=state.night?'☾ <span>夜</span>':'☀ <span>昼</span>';$('#modeLabel').textContent=state.night?'☾ NIGHT MODE':'☀ DAY MODE'}
  function toggleSound(){state.sound=!state.sound;$('#soundBtn').innerHTML=state.sound?'♪ <span>音 ON</span>':'× <span>音 OFF</span>';if(!state.sound)stopSound();else if(state.playing)startSound()}
  function toggleShow(){if(!state.items.length)return toast('まずは噴水を置いてください');state.playing=!state.playing;if(state.playing){state.playStart=performance.now();if(!state.night)toggleDay();$('#app').classList.add('showing');$('#playBtn').innerHTML='<span class="play-icon">■</span><span><b>ショーを停止</b><small>STOP SHOW</small></span>';if(state.sound)startSound();setTimeout(()=>{if(state.playing)toggleShow()},16000)}else{$('#app').classList.remove('showing');$('#playBtn').innerHTML='<span class="play-icon">▶</span><span><b>噴水ショーを再生</b><small>SHOW TIME!</small></span>';stopSound()}}
  function startSound(){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const len=audioCtx.sampleRate*2,b=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(.2+Math.sin(i/7000)*.08);noiseNode=audioCtx.createBufferSource();const filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();filter.type='lowpass';filter.frequency.value=1300;gain.gain.value=.055;noiseNode.buffer=b;noiseNode.loop=true;noiseNode.connect(filter).connect(gain).connect(audioCtx.destination);noiseNode.start()}catch(e){}}
  function stopSound(){try{noiseNode?.stop();noiseNode=null}catch(e){}}
  function resize(){dpr=Math.min(devicePixelRatio||1,2);[canvas,resultCanvas].forEach(c=>{const r=c.parentElement?.getBoundingClientRect();if(!r)return;c.width=Math.max(1,r.width*dpr);c.height=Math.max(1,r.height*dpr)});}
  function active(i,t,index){const q=t-i.timing;switch(i.pattern){case'slow':return Math.sin(q*2.2)>-.25;case'fast':return Math.sin(q*9)>0;case'wave':return (Math.sin(q*2.8-index*.7)+1)/2;case'sequence':return ((q-index*.32)%3+3)%3<1.4;case'random':return Math.sin(q*6.73+i.id%9)>-.15;default:return 1}}
  function loop(now){draw(ctx,canvas,now,state.playing);raf=requestAnimationFrame(loop)}
  function draw(c,cv,now,animated=true,items=state.items,forResult=false){const w=cv.width/dpr,h=cv.height/dpr;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const t=animated?(now-(state.playStart||now))/1000:2.4;items.forEach((i,index)=>drawItem(c,i,w,h,t,index,animated,forResult));}
  function drawItem(c,i,w,h,t,index,animated,forResult){const x=i.x*w,y=i.y*h,on=animated?active(i,t,index):1;if(!on)return;const intensity=typeof on==='number'?on:1, p=i.power/100,r=i.range/100,ang=(i.angle-90)*Math.PI/180+(i.type==='rotate'&&animated?t*1.8:0);c.save();c.globalCompositeOperation='screen';c.lineCap='round';
    c.fillStyle=i.color+'22';c.beginPath();c.arc(x,y,18+r*20,0,Math.PI*2);c.fill();c.strokeStyle=i.color;c.fillStyle=i.color;c.shadowColor=i.color;c.shadowBlur=forResult?14:state.night?12:3;
    if(i.type==='light'){c.globalAlpha=.3+.3*Math.sin(t*3+i.id);const g=c.createRadialGradient(x,y,0,x,y,35+r*55);g.addColorStop(0,i.color+'cc');g.addColorStop(1,i.color+'00');c.fillStyle=g;c.beginPath();c.arc(x,y,35+r*55,0,Math.PI*2);c.fill();c.globalAlpha=1;drawBase(c,x,y,i,true);c.restore();return}
    c.globalAlpha=.55+.35*intensity;c.lineWidth=1.3+p*2;
    const height=25+p*Math.min(w,h)*.2,spread=12+r*42;
    if(i.type==='vertical'){for(let k=-2;k<=2;k++){const jitter=Math.sin(t*5+k)*3;c.beginPath();c.moveTo(x+k*2,y);c.quadraticCurveTo(x+k*2+jitter,y-height*.6,x+k*spread*.13,y-height);c.stroke();drops(c,x+k*spread*.13,y-height,t,k,i.color)}}
    if(i.type==='arch'){for(let k=-1;k<=1;k++){const dist=35+r*70;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(ang)*dist*.5,y+Math.sin(ang)*dist*.5-height,x+Math.cos(ang)*dist,y+Math.sin(ang)*dist);c.stroke();drops(c,x+Math.cos(ang)*dist,y+Math.sin(ang)*dist,t,k,i.color)}}
    if(i.type==='fan'){for(let k=-3;k<=3;k++){const a=ang+k*(.08+r*.12),dist=30+p*50;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*dist*.4,y+Math.sin(a)*dist*.4-height*.7,x+Math.cos(a)*dist,y+Math.sin(a)*dist);c.stroke()}}
    if(i.type==='rotate'){for(let k=0;k<5;k++){const a=ang+k*Math.PI*2/5,dist=24+r*42;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*dist*.5,y+Math.sin(a)*dist*.5-height*.45,x+Math.cos(a)*dist,y+Math.sin(a)*dist);c.stroke()}}
    if(i.type==='mist'){for(let k=0;k<24;k++){const a=k*2.4+i.id,dist=10+((k*17+t*12)%(25+r*35));c.globalAlpha=.12+(k%4)*.08;c.beginPath();c.arc(x+Math.cos(a)*dist,y-8-p*18+Math.sin(a)*dist*.45,1.2+(k%3),0,Math.PI*2);c.fill()}}
    drawBase(c,x,y,i,false);c.restore();
  }
  function drawBase(c,x,y,i,light){c.globalAlpha=1;c.shadowBlur=8;c.fillStyle=light?i.color:'#073d5c';c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();c.strokeStyle='#dffaff';c.lineWidth=1;c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.stroke();if(i.id===state.selected&&!state.playing){c.strokeStyle='#ffd75b';c.setLineDash([3,3]);c.beginPath();c.arc(x,y,15,0,Math.PI*2);c.stroke();c.setLineDash([])}}
  function drops(c,x,y,t,k,color){for(let n=0;n<3;n++){c.globalAlpha=.5;c.fillStyle=color;const q=(t*25+n*11+k*3)%28;c.beginPath();c.arc(x+Math.sin(n+k)*q*.25,y+q,1.2,0,Math.PI*2);c.fill()}}
  function judge(){if(!state.items.length)return toast('空っぽの広場は審査できません');if(state.playing)toggleShow();const n=state.items.length,waters=state.items.filter(i=>i.type!=='light'),lights=n-waters.length,avg=waters.reduce((s,i)=>s+i.power,0)/(waters.length||1),range=waters.reduce((s,i)=>s+i.range,0)/(waters.length||1),colorCount=new Set(state.items.map(i=>i.color)).size;
    const center={x:state.items.reduce((s,i)=>s+i.x,0)/n,y:state.items.reduce((s,i)=>s+i.y,0)/n};const balance=Math.max(0,100-Math.hypot(center.x-.5,center.y-.5)*180);const patterns=new Set(state.items.map(i=>i.pattern)).size;
    const scores={美しさ:clamp(Math.round(25+n*3+colorCount*5+lights*4+balance*.18),0,100),涼しさ:clamp(Math.round(20+waters.length*4+range*.35+(state.items.filter(i=>i.type==='mist').length*9)),0,100),人気:0,水道代:clamp(Math.round(waters.length*4+avg*.48+range*.25),0,100),びしょ濡れ被害:clamp(Math.round(waters.length*2+avg*.38+range*.35+state.items.filter(i=>i.type==='fan'||i.type==='arch').length*5),0,100)};scores.人気=clamp(Math.round(scores.美しさ*.45+scores.涼しさ*.25+patterns*5+n),0,100);const good=(scores.美しさ+scores.涼しさ+scores.人気)/3,bad=(scores.水道代+scores.びしょ濡れ被害)/2,total=good-bad*.13;
    let rank=total>=82?'世界遺産級':total>=68?'有名観光地級':total>=52?'市民公園級':total>=38?'地方都市の謎モニュメント級':'水道管破裂級';let comment;if(scores.水道代>85)comment=`幻想的ですが、水道代が月${Math.round(scores.水道代*4.82)}万円です。`;else if(scores.びしょ濡れ被害>80)comment='市民には人気ですが、ベンチまで完全に水没しています。';else if(avg>85)comment='噴水というより、ほぼ放水訓練です。';else if(scores.人気>85)comment='子どもは大喜び、市役所は頭を抱えています。';else if(rank==='世界遺産級')comment='世界的観光名所になる可能性があります。警備員を増やしましょう。';else if(lights===0)comment='地方都市の駅前にありそうな完成度です。夜は少し寂しいです。';else comment='品があります。鳩たちからも高評価が届いています。';
    state.lastResult={scores,rank,comment,total};showResult();
  }
  function showResult(){const r=state.lastResult;$('#resultRank').textContent=r.rank;$('#resultRankTitle').textContent=r.rank;$('#resultComment').textContent=`「${r.comment}」`;$('#scores').innerHTML=Object.entries(r.scores).map(([k,v])=>`<div class="score-row"><span>${k}</span><div class="score-track"><div class="score-bar" style="width:${v}%"></div></div><b class="score-value">${v}</b></div>`).join('');$('#resultModal').classList.remove('hidden');resize();setTimeout(()=>draw(rctx,resultCanvas,performance.now(),false,state.items,true),30)}
  function saveResult(){if(!state.lastResult)return;const out=document.createElement('canvas'),c=out.getContext('2d');out.width=1200;out.height=630;const g=c.createLinearGradient(0,0,1200,630);g.addColorStop(0,'#061d35');g.addColorStop(1,'#087da4');c.fillStyle=g;c.fillRect(0,0,1200,630);c.drawImage(resultCanvas,55,90,590,390);c.fillStyle='#48d9f3';c.font='700 22px sans-serif';c.fillText('FOUNTAIN PRODUCER — 8.21',700,105);c.fillStyle='#fff';c.font='900 46px sans-serif';c.fillText('噴水プロデューサー',700,162);c.font='700 25px sans-serif';c.fillText('審査結果',700,220);c.fillStyle='#ffd75b';c.font='900 42px sans-serif';wrapText(c,state.lastResult.rank,700,278,430,50);c.fillStyle='#fff';c.font='700 19px sans-serif';wrapText(c,state.lastResult.comment,700,385,430,30);c.fillStyle='#9ceeff';c.font='700 18px sans-serif';c.fillText('#噴水プロデューサー',700,540);const a=document.createElement('a');a.download='fountain-producer-result.png';a.href=out.toDataURL('image/png');a.click();toast('審査結果を画像にしました')}
  function shareResult(){const text=`私の噴水は「${state.lastResult?.rank||'審査待ち'}」！\n${state.lastResult?.comment||''}\n#噴水プロデューサー`;window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer')}
  function wrapText(c,text,x,y,max,line){let s='',yy=y;for(const ch of text){if(c.measureText(s+ch).width>max){c.fillText(s,x,yy);s=ch;yy+=line}else s+=ch}c.fillText(s,x,yy)}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));init();
})();
