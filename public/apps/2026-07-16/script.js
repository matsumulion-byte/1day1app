const CELL_COUNT = 4;
const foods = [
  {id:'rice', name:'日の丸ごはん', w:2, h:2, color:'white'},
  {id:'salmon', name:'焼き鮭', w:2, h:1, color:'red'},
  {id:'egg', name:'卵焼き', w:1, h:2, color:'yellow'},
  {id:'karaage', name:'からあげ', w:2, h:2, color:'brown'},
  {id:'broccoli', name:'ブロッコリー', w:1, h:1, color:'green'},
  {id:'tomato', name:'ミニトマト', w:1, h:1, color:'red'},
  {id:'pickle', name:'お漬物', w:1, h:1, color:'green'},
  {id:'shumai', name:'しゅうまい', w:1, h:1, color:'white'}
];
const foodClass = id => id === 'shumai' ? 'food-rice' : `food-${id}`;
const $ = s => document.querySelector(s);
const ingredients = $('#ingredients'), bento = $('#bento'), placedLayer = $('#placedLayer');
let board, placed, running = false, startedAt = 0, raf, score = 0, soundOn = true, drag = null;
document.addEventListener('dblclick', event => event.preventDefault(), {passive:false});
document.addEventListener('gesturestart', event => event.preventDefault(), {passive:false});
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('dragstart', event => event.preventDefault());

function renderBins(){
  ingredients.innerHTML = foods.map(f => `<div class="ingredient-bin" data-id="${f.id}" role="button" tabindex="0" aria-label="${f.name}。ドラッグして詰める。タップで回転"><div class="ingredient ${foodClass(f.id)}" style="--w:${f.w};--h:${f.h}"></div></div>`).join('');
  ingredients.querySelectorAll('.ingredient-bin').forEach(bin => {
    bin.addEventListener('pointerdown', startDrag);
    bin.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') rotateFood(bin.dataset.id); });
  });
}
function resetGame(showStart=false){
  cancelAnimationFrame(raf); board = Array(16).fill(null); placed = {}; score = 0; running = false;
  foods.forEach(f => { f.w = f.id==='rice'||f.id==='karaage'?2:(f.id==='salmon'?2:1); f.h = f.id==='rice'||f.id==='karaage'?2:(f.id==='egg'?2:1); });
  placedLayer.innerHTML=''; renderBins(); updateStatus(30); $('#resultOverlay').classList.remove('show');
  if(showStart) $('#startOverlay').classList.add('show');
}
function begin(){
  resetGame(); $('#startOverlay').classList.remove('show'); running=true; startedAt=performance.now(); tick(); beep(520,.07);
}
function tick(){
  if(!running)return; const left=Math.max(0,30-(performance.now()-startedAt)/1000); updateStatus(left);
  if(left<=0){finish();return} raf=requestAnimationFrame(tick);
}
function updateStatus(left){
  $('#timer').textContent=left.toFixed(1); const filled=board?board.filter(Boolean).length:0;
  $('#progressBar').style.width=`${filled/16*100}%`; score=Math.round(filled*250 + Math.max(0,left)*10);
  $('#score').textContent=String(score).padStart(4,'0');
}
function rotateFood(id){
  if(!running || placed[id])return; const f=foods.find(x=>x.id===id); if(f.w===f.h)return;
  [f.w,f.h]=[f.h,f.w]; const el=document.querySelector(`[data-id="${id}"] .ingredient`); el.style.setProperty('--w',f.w);el.style.setProperty('--h',f.h); beep(350,.04);
}
function startDrag(e){
  if(!running)return; const bin=e.currentTarget, id=bin.dataset.id; if(placed[id])return;
  const f=foods.find(x=>x.id===id), source=bin.querySelector('.ingredient'), rect=source.getBoundingClientRect();
  const ghost=source.cloneNode(true); ghost.classList.add('dragging'); document.body.appendChild(ghost);
  drag={id,f,bin,ghost,startX:e.clientX,startY:e.clientY,moved:false,ox:e.clientX-rect.left,oy:e.clientY-rect.top};
  moveGhost(e); bin.setPointerCapture(e.pointerId); bin.addEventListener('pointermove',moveDrag);bin.addEventListener('pointerup',endDrag,{once:true});bin.addEventListener('pointercancel',cancelDrag,{once:true});
}
function moveGhost(e){drag.ghost.style.left=`${e.clientX-drag.ghost.offsetWidth/2}px`;drag.ghost.style.top=`${e.clientY-drag.ghost.offsetHeight/2}px`}
function moveDrag(e){if(!drag)return; if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8)drag.moved=true;moveGhost(e)}
function endDrag(e){
  if(!drag)return; drag.bin.removeEventListener('pointermove',moveDrag);
  if(!drag.moved){const id=drag.id;cleanupDrag();rotateFood(id);return}
  const tray=placedLayer.getBoundingClientRect(), cell=tray.width/4;
  const x=Math.round((e.clientX-tray.left-cell*drag.f.w/2)/cell), y=Math.round((e.clientY-tray.top-cell*drag.f.h/2)/cell);
  if(canPlace(drag.f,x,y)) placeFood(drag.f,x,y); else {beep(145,.11);$('#hint').textContent='そこには入らないよ！';setTimeout(()=>$('#hint').textContent='具材をつかんで、すき間なく詰めよう',900)}
  cleanupDrag();
}
function cancelDrag(){cleanupDrag()}
function cleanupDrag(){if(!drag)return;drag.ghost.remove();drag=null}
function canPlace(f,x,y){if(x<0||y<0||x+f.w>4||y+f.h>4)return false;for(let yy=y;yy<y+f.h;yy++)for(let xx=x;xx<x+f.w;xx++)if(board[yy*4+xx])return false;return true}
function placeFood(f,x,y){
  for(let yy=y;yy<y+f.h;yy++)for(let xx=x;xx<x+f.w;xx++)board[yy*4+xx]=f.id; placed[f.id]={x,y,w:f.w,h:f.h};
  const wrap=document.createElement('div');wrap.className='placed';wrap.style.cssText=`--x:${x};--y:${y};--w:${f.w};--h:${f.h}`;wrap.innerHTML=`<div class="ingredient ${foodClass(f.id)}"></div>`;placedLayer.appendChild(wrap);
  document.querySelector(`[data-id="${f.id}"]`).classList.add('used');beep(600+Object.keys(placed).length*45,.06);updateStatus(Math.max(0,30-(performance.now()-startedAt)/1000));
  if(board.every(Boolean))setTimeout(finish,350);
}
function colorBonus(){
  let bonus=0; for(let y=0;y<4;y++)for(let x=0;x<4;x++){const a=foods.find(f=>f.id===board[y*4+x]);[[1,0],[0,1]].forEach(([dx,dy])=>{if(x+dx<4&&y+dy<4){const b=foods.find(f=>f.id===board[(y+dy)*4+x+dx]);if(a&&b&&a.id!==b.id&&a.color!==b.color)bonus+=50}})} return bonus;
}
function finish(){
  if(!running)return;running=false;cancelAnimationFrame(raf);cleanupDrag(); const fill=board.filter(Boolean).length;const remaining=Math.max(0,30-(performance.now()-startedAt)/1000);const bonus=colorBonus();score=Math.round(fill*250+remaining*100+bonus); const pct=Math.round(fill/16*100);
  let rank='並',name='旅のおともに\nほっこり弁当'; if(pct===100&&remaining>12){rank='特上';name='彩り満開\nぎゅうぎゅう弁当'}else if(pct===100){rank='上';name='完璧配置の\n満腹弁当'}else if(pct>=70){rank='良';name='気まま旅の\nわくわく弁当'}
  $('#rank').textContent=rank;$('#bentoName').innerHTML=name.replace('\n','<br>');$('#finalScore').textContent=score;$('#fillResult').textContent=`${pct}%`;$('#colorResult').textContent=`+${bonus}`;setTimeout(()=>$('#resultOverlay').classList.add('show'),250);beep(760,.1);setTimeout(()=>beep(960,.14),120);
}
function beep(freq,duration){if(!soundOn)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=beep.ctx||(beep.ctx=new C());const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.055,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)}catch{}}
async function share(){const text=`駅弁つめつめ！で ${score}点の駅弁を作りました🍱 #駅弁つめつめ #7月16日`;try{if(navigator.share)await navigator.share({title:'駅弁つめつめ！',text,url:location.href});else{await navigator.clipboard.writeText(`${text}\n${location.href}`);showToast()}}catch(e){if(e.name!=='AbortError')showToast()}}
function showToast(){$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1600)}
$('#startBtn').addEventListener('click',begin);$('#retryBtn').addEventListener('click',begin);$('#resetBtn').addEventListener('click',()=>resetGame(true));$('#shareBtn').addEventListener('click',share);$('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.classList.toggle('muted',!soundOn);e.currentTarget.textContent=soundOn?'♪':'×'});
resetGame(true);
