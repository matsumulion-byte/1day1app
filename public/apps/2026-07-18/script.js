const SIZE = 7;
const VECTORS = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
const ARROWS = { up:'↑ NORTH', down:'↓ SOUTH', left:'← WEST', right:'→ EAST' };

const stages = [
  {name:'01 杉並・校庭', mission:'校庭を守り、すべて浄化せよ', turns:12, health:100,
    purifier:[[0,3]], buildings:[[2,2],[2,4],[5,1],[5,5]], safe:[['school',1,3],['home',4,3]], factories:[], smog:[[5,2,1],[5,3,1],[5,4,1],[3,1,1]]},
  {name:'02 ビル風の街', mission:'ビルの隙間に風を通せ', turns:15, health:100,
    purifier:[[3,6]], buildings:[[1,2],[2,2],[4,2],[5,2],[1,4],[2,4],[4,4],[5,4]], safe:[['home',3,3],['school',6,5]], factories:[], smog:[[0,0,1],[2,0,2],[4,0,1],[6,0,2]]},
  {name:'03 工業地帯', mission:'追加排出に備えよ', turns:17, health:100, emissions:3,
    purifier:[[0,6],[6,6]], buildings:[[1,3],[2,3],[4,3],[5,3]], safe:[['home',3,5],['school',5,5]], factories:[[3,0]], smog:[[2,1,1],[3,1,2],[4,1,1],[6,2,1]]},
  {name:'04 無風警報', mission:'少ない手数で住宅街を救え', turns:11, health:85,
    purifier:[[0,0],[0,6]], buildings:[[2,1],[2,2],[2,4],[2,5],[4,3],[5,3]], safe:[['home',3,2],['home',3,4],['school',6,6]], factories:[], smog:[[6,0,2],[6,2,1],[6,4,1],[6,5,2]]},
  {name:'05 東京全域', mission:'最後の警報。青空を取り戻せ', turns:20, health:100, emissions:4,
    purifier:[[0,3],[3,6]], buildings:[[1,1],[1,5],[3,2],[4,2],[5,2],[5,4]], safe:[['school',2,3],['home',4,4],['home',6,6]], factories:[[6,0]], smog:[[6,1,1],[5,1,2],[4,0,1],[3,4,2],[2,5,1]]}
];

const $ = s => document.querySelector(s);
const board = $('#board');
let stageIndex=0, state, touchStart, soundOn=true, locked=false;
let audio;

function key(r,c){ return `${r},${c}`; }
function inBounds(r,c){ return r>=0&&r<SIZE&&c>=0&&c<SIZE; }
function tone(freq=300,duration=.08,type='square',volume=.035){
  if(!soundOn) return;
  audio ||= new (window.AudioContext||window.webkitAudioContext)();
  const o=audio.createOscillator(), g=audio.createGain();
  o.type=type;o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(audio.destination);o.start();
  g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.stop(audio.currentTime+duration);
}

function loadStage(index){
  stageIndex=index; const s=stages[index];
  state={turn:0,health:s.health,purified:0,water:false,emissions:s.emissions||0,
    smog:s.smog.map(x=>({r:x[0],c:x[1],level:x[2]}))};
  $('#stageName').textContent=s.name; $('#turnMax').textContent=s.turns; $('#mission').textContent=s.mission;
  $('#waterBtn').classList.remove('used'); locked=false; render();
  $('#swipeHint').classList.toggle('hide',index!==0);
}

function render(){
  const s=stages[stageIndex]; board.innerHTML='';
  const buildings=new Set(s.buildings.map(x=>key(...x)));
  const purifiers=new Set(s.purifier.map(x=>key(...x)));
  const factories=new Set((s.factories||[]).map(x=>key(...x)));
  const safe=new Map(s.safe.map(x=>[key(x[1],x[2]),x[0]]));
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
    const cell=document.createElement('div');cell.className='cell';
    let type=''; const k=key(r,c);
    if(buildings.has(k)) type='building'; else if(purifiers.has(k)) type='purifier';
    else if(factories.has(k)) type='factory'; else if(safe.has(k)) type=safe.get(k);
    if(type){const tile=document.createElement('div');tile.className=`tile ${type}`;cell.append(tile);cell.classList.add(`${type}-cell`)}
    const cloud=state.smog.find(x=>x.r===r&&x.c===c);
    if(cloud){const el=document.createElement('div');el.className=`smog lv${cloud.level}`;el.textContent=cloud.level;el.setAttribute('aria-label',`濃度${cloud.level}のスモッグ`);cell.append(el)}
    board.append(cell);
  }
  $('#turnNow').textContent=state.turn; $('#healthBar').style.width=`${state.health}%`;
  $('#healthBar').style.background=state.health<40?'var(--red)':state.health<70?'var(--yellow)':'var(--blue)';
  $('#remaining').textContent=state.smog.reduce((n,x)=>n+x.level,0)+(state.emissions||0);
}

function move(dir){
  if(locked||!VECTORS[dir]) return;
  $('#swipeHint').classList.add('hide');
  const s=stages[stageIndex]; if(state.turn>=s.turns) return finish(false);
  locked=true; const [dr,dc]=VECTORS[dir];
  $('#windLabel').textContent=`WIND: ${ARROWS[dir]}`; tone(180,.12,'sawtooth');
  const blocked=new Set(s.buildings.map(x=>key(...x)));
  const factories=new Set((s.factories||[]).map(x=>key(...x)));
  const purifier=new Set(s.purifier.map(x=>key(...x)));
  const merged=new Map(); let removed=0;
  for(const cloud of state.smog){
    let nr=cloud.r+dr,nc=cloud.c+dc;
    if(!inBounds(nr,nc)||blocked.has(key(nr,nc))||factories.has(key(nr,nc))){nr=cloud.r;nc=cloud.c}
    if(purifier.has(key(nr,nc))){removed+=cloud.level;continue}
    const k=key(nr,nc), old=merged.get(k);
    if(old) old.level=Math.min(3,old.level+cloud.level); else merged.set(k,{r:nr,c:nc,level:cloud.level});
  }
  state.smog=[...merged.values()]; state.purified+=removed; state.turn++;
  if(removed){tone(620,.18,'sine',.06);board.classList.add('flash');setTimeout(()=>board.classList.remove('flash'),450)}
  applyDamage();
  if(state.emissions>0 && state.turn%2===0){ emitSmog(); state.emissions--; }
  render(); setTimeout(()=>{locked=false;checkEnd()},210);
}

function applyDamage(){
  const safe=new Set(stages[stageIndex].safe.map(x=>key(x[1],x[2]))); let damage=0;
  state.smog.forEach(x=>{if(safe.has(key(x.r,x.c))) damage+=x.level*7});
  if(damage){state.health=Math.max(0,state.health-damage);tone(90,.22,'square',.07);board.classList.add('shake');setTimeout(()=>board.classList.remove('shake'),300)}
}

function emitSmog(){
  const f=stages[stageIndex].factories?.[0]; if(!f)return;
  const spots=[[f[0],f[1]+1],[f[0]-1,f[1]],[f[0]+1,f[1]]].filter(x=>inBounds(...x));
  const p=spots.find(x=>!state.smog.some(y=>y.r===x[0]&&y.c===x[1]));
  if(p){state.smog.push({r:p[0],c:p[1],level:1});tone(120,.15,'sawtooth')}
}

function useWater(){
  if(locked||state.water)return;
  state.water=true;state.smog=state.smog.map(x=>({...x,level:x.level-1})).filter(x=>x.level>0);
  $('#waterBtn').classList.add('used');tone(500,.35,'sine',.05);render();setTimeout(checkEnd,250);
}

function checkEnd(){
  if(state.health<=0) return finish(false);
  if(state.smog.length===0&&state.emissions===0) return finish(true);
  if(state.turn>=stages[stageIndex].turns) return finish(false);
}

function finish(win){
  locked=true; const modal=$('#resultModal');
  const rank=win?(state.health>=85?'S':state.health>=60?'A':'B'):'C';
  $('#resultKicker').textContent=win?'AREA CLEAR':'SMOG WARNING';
  $('#resultSeal').textContent=rank;$('#resultSeal').style.background=win?'var(--yellow)':'var(--red)';
  $('#resultTitle').textContent=win?'青空を取り戻した':'街がスモッグに覆われた';
  $('#resultText').textContent=win?'市民の健康を守り抜きました。':'風向きを変えて、もう一度挑戦しよう。';
  $('#resultHealth').textContent=`${state.health}%`;$('#resultPurified').textContent=state.purified;
  $('#nextBtn').style.display=win?'flex':'none';
  $('#nextBtn').innerHTML=stageIndex===stages.length-1?'最初のエリアへ <span>→</span>':'次のエリアへ <span>→</span>';
  modal.classList.add('open');tone(win?740:80,.5,win?'sine':'sawtooth',.06);
}

document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>move(b.dataset.dir)));
$('#waterBtn').addEventListener('click',useWater);
$('#startBtn').addEventListener('click',()=>{$('#startModal').classList.remove('open');tone(440,.12)});
$('#retryBtn').addEventListener('click',()=>{$('#resultModal').classList.remove('open');loadStage(stageIndex)});
$('#nextBtn').addEventListener('click',()=>{$('#resultModal').classList.remove('open');loadStage((stageIndex+1)%stages.length)});
$('#helpBtn').addEventListener('click',()=>$('#startModal').classList.add('open'));
$('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=`SOUND ${soundOn?'ON':'OFF'}`});
document.addEventListener('keydown',e=>{const d={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'}[e.key];if(d){e.preventDefault();move(d)}});
board.addEventListener('pointerdown',e=>{touchStart=[e.clientX,e.clientY]});
board.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart[0],dy=e.clientY-touchStart[1];touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('dragstart',e=>e.preventDefault());

loadStage(0);
