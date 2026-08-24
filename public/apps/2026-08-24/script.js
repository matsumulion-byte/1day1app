// 調整しやすいゲーム定数
const CONFIG={cols:24,rows:32,eruptionDelay:6,gameSeconds:48,digPower:105,digCost:1.25,digDepth:.42,flowStep:.32,lavaRate:3};
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');

const STAGES=[
 {name:'海への一本道',tip:'中央の谷を海までつなげよう',source:[12,4],houses:[[7,18],[17,20],[6,24]],trees:[[4,11],[19,12],[4,21],[20,25]],roads:[16],springs:[],ridges:[[9,9,16,9],[15,10,15,20]]},
 {name:'分かれ道の住宅街',tip:'左の谷は危険。右へ大きく曲げよう',source:[11,4],houses:[[7,14],[8,17],[6,20],[16,19]],trees:[[4,10],[19,11],[20,16],[4,25],[18,25]],roads:[13,22],springs:[[19,17]],ridges:[[12,10,12,25],[15,12,20,12]]},
 {name:'温泉街を守れ',tip:'遠回りして温泉を通るルートを探そう',source:[12,4],houses:[[9,13],[12,14],[15,13],[8,18],[12,19],[16,18]],trees:[[4,10],[20,10],[4,15],[20,23],[5,26]],roads:[12,17,23],springs:[[5,20],[19,21]],ridges:[[7,10,7,24],[17,10,17,24],[8,22,16,22]]}
];

let stageIndex=0,state='title',terrain,lava,objects,source,eruptionAt,startAt,lastTime,accum,raf;
let digPower=CONFIG.digPower,dragging=false,lastCell=null,seaReached=false,ended=false,roadHits=new Set(),particles=[],toastTimer=0;

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));state=id==='gameScreen'?'game':id==='resultScreen'?'result':'title'}
function idx(x,y){return y*CONFIG.cols+x}
function inGrid(x,y){return x>=0&&y>=0&&x<CONFIG.cols&&y<CONFIG.rows}
function seeded(x,y,s=stageIndex+1){let n=Math.sin(x*12.9898+y*78.233+s*39.4)*43758.5453;return n-Math.floor(n)}

function buildStage(){
 const s=STAGES[stageIndex]; terrain=new Float32Array(CONFIG.cols*CONFIG.rows);lava=new Float32Array(terrain.length);objects=[];particles=[];roadHits.clear();seaReached=false;ended=false;digPower=CONFIG.digPower;accum=0;
 for(let y=0;y<CONFIG.rows;y++)for(let x=0;x<CONFIG.cols;x++){const side=Math.abs(x-CONFIG.cols/2)*.035;terrain[idx(x,y)]=9-y*.09+side+seeded(x,y)*.32}
 s.ridges.forEach(([x1,y1,x2,y2])=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++){const x=Math.round(x1+(x2-x1)*i/steps),y=Math.round(y1+(y2-y1)*i/steps);terrain[idx(x,y)]+=1.25}});
 for(let y=CONFIG.rows-3;y<CONFIG.rows;y++)for(let x=0;x<CONFIG.cols;x++)terrain[idx(x,y)]=-4;
 const add=(type,list)=>list.forEach(([x,y])=>objects.push({type,x,y,burned:false,active:true}));add('house',s.houses);add('tree',s.trees);add('spring',s.springs);
 source=s.source;lava[idx(...source)]=5; eruptionAt=performance.now()+CONFIG.eruptionDelay*1000;startAt=performance.now();lastTime=startAt;
 $('stageNumber').textContent=`STAGE ${stageIndex+1}`;$('stageName').textContent=s.name;$('.game-hint b').textContent=s.tip;updateHud();resizeCanvas();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)
}
function $(sel){return sel.startsWith('.')?document.querySelector(sel):document.getElementById(sel)}
function resizeCanvas(){const r=$('canvasWrap').getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0)}
function cellSize(){return [canvas.clientWidth/CONFIG.cols,canvas.clientHeight/CONFIG.rows]}

function digAt(px,py){
 if(ended||digPower<=0)return;const [cw,ch]=cellSize(),cx=Math.floor(px/cw),cy=Math.floor(py/ch);if(!inGrid(cx,cy)||cy<5||cy>=CONFIG.rows-3)return;
 const key=`${cx},${cy}`;if(lastCell===key)return;lastCell=key;
 for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const x=cx+ox,y=cy+oy;if(!inGrid(x,y))continue;const strength=ox===0&&oy===0?1:.42;terrain[idx(x,y)]-=CONFIG.digDepth*strength}
 digPower=Math.max(0,digPower-CONFIG.digCost);for(let i=0;i<5;i++)particles.push({x:px+(Math.random()-.5)*12,y:py+(Math.random()-.5)*8,vx:(Math.random()-.5)*30,vy:-20-Math.random()*35,life:.5,type:'dirt'});updateHud()
}
function pointerPos(e){const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return[p.clientX-r.left,p.clientY-r.top]}
canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);lastCell=null;digAt(...pointerPos(e))});canvas.addEventListener('pointermove',e=>{if(dragging)digAt(...pointerPos(e))});canvas.addEventListener('pointerup',()=>{dragging=false;lastCell=null});canvas.addEventListener('pointercancel',()=>dragging=false);

function flow(){
 const next=new Float32Array(lava);const dirs=[[0,1],[-1,0],[1,0],[0,-1],[-1,1],[1,1]];
 for(let y=3;y<CONFIG.rows;y++)for(let x=0;x<CONFIG.cols;x++){const i=idx(x,y),amount=lava[i];if(amount<.018)continue;let opts=[];
  // 地形高＋溶岩の水位で判定する。溜まった量を水位へ反映することで、
  // 小さなくぼみや尾根でも満杯になれば自然にあふれて先へ進む。
  const lavaHead=Math.min(amount*.8,2.6);
  for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(!inGrid(nx,ny))continue;const ni=idx(nx,ny),drop=(terrain[i]+lavaHead)-terrain[ni]+dy*.22;if(drop>.015)opts.push([ni,drop])}
  opts.sort((a,b)=>b[1]-a[1]);opts=opts.slice(0,2);if(!opts.length)continue;let move=Math.min(amount*.48,CONFIG.flowStep),weights=opts.reduce((n,o)=>n+o[1],0);for(const [ni,w] of opts){const q=move*w/weights;next[i]-=q;next[ni]+=q}
 }
 lava=next;lava[idx(...source)]+=CONFIG.lavaRate*.06;checkCollisions()
}
function checkCollisions(){
 const s=STAGES[stageIndex];for(const o of objects){if(!o.active)continue;let near=0;for(let y=o.y-1;y<=o.y+1;y++)for(let x=o.x-1;x<=o.x+1;x++)if(inGrid(x,y))near=Math.max(near,lava[idx(x,y)]);
  if(near>.1){if(o.type==='spring'){o.active=false;burst(o.x,o.y,'steam');toast('♨ 温泉が湧いた！ +200')}else if(!o.burned){o.burned=true;burst(o.x,o.y,'fire');toast(o.type==='house'?'🏠 家が焼失…':'🌲 木に引火！')}}
 }
 for(const ry of s.roads)for(let x=0;x<CONFIG.cols;x++)if(lava[idx(x,ry)]>.11)roadHits.add(ry);
 for(let x=0;x<CONFIG.cols;x++)if(lava[idx(x,CONFIG.rows-3)]>.06&&!seaReached){seaReached=true;burst(x,CONFIG.rows-3,'splash');toast('🌊 海へ到達！');setTimeout(finish,1600)}
}
function burst(x,y,type){const [cw,ch]=cellSize();for(let i=0;i<22;i++)particles.push({x:(x+.5)*cw,y:(y+.5)*ch,vx:(Math.random()-.5)*100,vy:-30-Math.random()*100,life:.7+Math.random()*.6,type})}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1500)}

function loop(now){if(state!=='game')return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;if(now>=eruptionAt&&!ended){accum+=dt;while(accum>.07){flow();accum-=.07}}
 updateParticles(dt);draw(now);updateTimer(now);if(!ended&&now-startAt>(CONFIG.eruptionDelay+CONFIG.gameSeconds)*1000)finish();raf=requestAnimationFrame(loop)}
function updateParticles(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=80*dt;p.life-=dt}particles=particles.filter(p=>p.life>0)}
function updateTimer(now){const left=Math.max(0,(eruptionAt-now)/1000);$('timer').textContent=left?left.toFixed(1):'噴火中';if(left>0&&left<3.2){$('countdown').textContent=Math.ceil(left);$('countdown').classList.add('show')}else $('countdown').classList.remove('show')}
function updateHud(){const homes=objects?.filter(o=>o.type==='house'&&o.burned).length||0,trees=objects?.filter(o=>o.type==='tree'&&o.burned).length||0;$('digMeter').style.width=`${digPower/CONFIG.digPower*100}%`;$('damage').textContent=`¥${((homes*500+trees*50+roadHits.size*100)*10000).toLocaleString()}`}

function draw(now){
 const w=canvas.clientWidth,h=canvas.clientHeight,[cw,ch]=cellSize();ctx.clearRect(0,0,w,h);
 for(let y=0;y<CONFIG.rows;y++)for(let x=0;x<CONFIG.cols;x++){const i=idx(x,y),v=terrain[i],shade=Math.max(0,Math.min(1,(v-3)/7));ctx.fillStyle=y>=CONFIG.rows-3?`hsl(${195+Math.sin(now/400+x)*5} 75% ${47+Math.sin(now/300+y)*3}%)`:`hsl(${78-18*shade} ${34+18*shade}% ${38+12*shade}%)`;ctx.fillRect(x*cw,y*ch,cw+1,ch+1);if(v<5&&y<CONFIG.rows-3){ctx.fillStyle=`rgba(74,54,37,${Math.min(.36,(5-v)*.09)})`;ctx.fillRect(x*cw,y*ch,cw+1,ch+1)}}
 const roads=STAGES[stageIndex].roads;for(const y of roads){ctx.fillStyle='#706d68';ctx.fillRect(0,y*ch,cw*CONFIG.cols,ch*.75);ctx.setLineDash([cw*.8,cw*.5]);ctx.strokeStyle='#f7e2a0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,(y+.37)*ch);ctx.lineTo(w,(y+.37)*ch);ctx.stroke();ctx.setLineDash([])}
 drawVolcano(cw,ch);objects.forEach(o=>drawObject(o,cw,ch,now));
 ctx.save();ctx.globalCompositeOperation='screen';for(let y=0;y<CONFIG.rows;y++)for(let x=0;x<CONFIG.cols;x++){const a=lava[idx(x,y)];if(a<.025)continue;const pulse=Math.sin(now/160+x+y)*.08;ctx.fillStyle=`rgba(255,${65+Math.min(120,a*70)},20,${Math.min(.94,.3+a*1.5)})`;ctx.shadowColor='#ff3d1f';ctx.shadowBlur=9;ctx.beginPath();ctx.roundRect(x*cw-1,y*ch-1,cw+2,ch+2,Math.min(cw,ch)*.45);ctx.fill();if(a>.16){ctx.fillStyle=`rgba(255,224,70,${.2+pulse})`;ctx.fillRect((x+.25)*cw,(y+.25)*ch,cw*.5,ch*.25)}}ctx.restore();
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.type==='dirt'?'#593f2b':p.type==='steam'?'#fff':p.type==='splash'?'#b9f4ff':'#ffb21d';ctx.beginPath();ctx.arc(p.x,p.y,p.type==='steam'?5:3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;updateHud()
}
function drawVolcano(cw,ch){const x=(source[0]+.5)*cw,y=(source[1]+.6)*ch;ctx.fillStyle='#493833';ctx.beginPath();ctx.moveTo(x-cw*3,y+ch*2.4);ctx.lineTo(x-cw*.9,y-ch*1.4);ctx.lineTo(x+cw*.9,y-ch*1.4);ctx.lineTo(x+cw*3,y+ch*2.4);ctx.fill();ctx.fillStyle='#1f1b1c';ctx.beginPath();ctx.ellipse(x,y-ch*1.25,cw, ch*.45,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff6a24';ctx.beginPath();ctx.ellipse(x,y-ch*1.25,cw*.55,ch*.22,0,0,Math.PI*2);ctx.fill()}
function drawObject(o,cw,ch,now){const x=(o.x+.5)*cw,y=(o.y+.5)*ch;if(o.type==='house'){ctx.fillStyle=o.burned?'#3a302d':'#f8e8ca';ctx.fillRect(x-cw*.45,y-ch*.05,cw*.9,ch*.65);ctx.fillStyle=o.burned?'#211b1a':'#e94b43';ctx.beginPath();ctx.moveTo(x-cw*.58,y);ctx.lineTo(x,y-ch*.6);ctx.lineTo(x+cw*.58,y);ctx.fill()}else if(o.type==='tree'){ctx.fillStyle='#60442d';ctx.fillRect(x-cw*.1,y,cw*.2,ch*.5);ctx.fillStyle=o.burned?'#282322':'#277544';ctx.beginPath();ctx.arc(x,y-ch*.15,cw*.48,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle=o.active?'#a4eee4':'#71cfe5';ctx.beginPath();ctx.arc(x,y,cw*.55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(13,cw*.8)}px sans-serif`;ctx.textAlign='center';ctx.fillText('♨',x,y+ch*.25);if(!o.active){for(let i=0;i<2;i++){ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(x+(i-.5)*cw*.3,y-ch*(.6+(now/600+i)%1),cw*.16,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}}if(o.burned){ctx.font=`${Math.max(13,cw)}px sans-serif`;ctx.textAlign='center';ctx.fillText('🔥',x,y-ch*.45)}}

function finish(){if(ended)return;ended=true;const homes=objects.filter(o=>o.type==='house'),burnedHomes=homes.filter(o=>o.burned).length,burnedTrees=objects.filter(o=>o.type==='tree'&&o.burned).length,springs=objects.filter(o=>o.type==='spring'&&!o.active).length;const damage=(burnedHomes*500+burnedTrees*50+roadHits.size*100)*10000;let score=(seaReached?1000:0)+(homes.length-burnedHomes)*300+springs*200-burnedHomes*500-burnedTrees*50-roadHits.size*100;score=Math.max(0,score);
 setTimeout(()=>{cancelAnimationFrame(raf);$('resultIcon').textContent=seaReached?'🌊':'🌋';$('resultTitle').textContent=seaReached?'海まで到達！':'誘導失敗…';$('resultComment').textContent=score>=1800?'防災のプロ':score>=1100?'まあまあ避難できた':score>=500?'ほぼ災害':'火山に負けた';$('totalScore').textContent=score.toLocaleString();$('seaResult').textContent=seaReached?'到達':'失敗';$('resultDamage').textContent=`¥${damage.toLocaleString()}`;$('burnedHomes').textContent=`${burnedHomes} / ${homes.length}軒`;$('burnedTrees').textContent=`${burnedTrees}本`;$('hotSprings').textContent=`${springs}カ所`;$('nextButton').textContent=stageIndex<2?'次のステージへ　→':'ステージ1へ　↻';showScreen('resultScreen')},seaReached?300:0)}

function startStage(){showScreen('gameScreen');requestAnimationFrame(buildStage)}
$('startButton').onclick=()=>{stageIndex=0;startStage()};$('restartButton').onclick=startStage;$('retryButton').onclick=startStage;$('backButton').onclick=()=>{cancelAnimationFrame(raf);showScreen('titleScreen')};$('nextButton').onclick=()=>{stageIndex=(stageIndex+1)%STAGES.length;startStage()};window.addEventListener('resize',()=>state==='game'&&resizeCanvas());
