const board = document.querySelector('#board');
const movesEl = document.querySelector('#movesValue');
const timeEl = document.querySelector('#timeValue');
const connectedEl = document.querySelector('#connectedValue');
const stageEl = document.querySelector('#stageValue');
const dialog = document.querySelector('#clearDialog');
const toast = document.querySelector('#toast');
const directions = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const facts = [
  '六角形は、少ない材料で隙間なく空間を区切れる形。ミツバチは蜜蝋を効率よく使って巣を広げます。',
  '働き蜂は「8の字ダンス」で、仲間に花の方向や距離を伝えることがあります。',
  '一つの巣房は、蜜の貯蔵庫にも幼虫を育てる部屋にも使われます。'
];

let cells = [], stage = 1, moves = 0, seconds = 0, timer = null, started = false, locked = false;
const key = (q,r) => `${q},${r}`;

function makeGrid(){
  const list=[];
  for(let q=-2;q<=2;q++) for(let r=-2;r<=2;r++) if(Math.abs(q+r)<=2) list.push({q,r,dirs:new Set(),rot:0,connected:false});
  return list;
}

function seeded(seed){
  let n=seed>>>0;
  return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
}

function buildPuzzle(level){
  const rand=seeded(8032026+level*977);
  cells=makeGrid();
  const map=new Map(cells.map(c=>[key(c.q,c.r),c]));
  const visited=new Set(['0,0']), frontier=[map.get('0,0')];
  while(frontier.length){
    const from=frontier[Math.floor(rand()*frontier.length)];
    const options=directions.map((d,i)=>({d,i,to:map.get(key(from.q+d[0],from.r+d[1]))})).filter(x=>x.to&&!visited.has(key(x.to.q,x.to.r)));
    if(!options.length){frontier.splice(frontier.indexOf(from),1);continue}
    const pick=options[Math.floor(rand()*options.length)];
    from.dirs.add(pick.i);pick.to.dirs.add((pick.i+3)%6);visited.add(key(pick.to.q,pick.to.r));frontier.push(pick.to);
  }
  const extra=level-1;
  for(let n=0;n<extra;n++){
    const a=cells[Math.floor(rand()*cells.length)], d=Math.floor(rand()*6), b=map.get(key(a.q+directions[d][0],a.r+directions[d][1]));
    if(b){a.dirs.add(d);b.dirs.add((d+3)%6)}
  }
  cells.forEach(c=>{c.rot=1+Math.floor(rand()*5)});
  if(isSolved()) cells[0].rot=(cells[0].rot+1)%6;
}

function cellPosition(c){return {x:227+c.q*70,y:197+(c.r+c.q/2)*80}}
function actualDirs(c){return [...c.dirs].map(d=>(d+c.rot)%6)}

function renderBoard(){
  board.innerHTML='';
  cells.forEach((c,index)=>{
    const pos=cellPosition(c), el=document.createElement('button');
    el.className='cell';el.style.left=`${pos.x}px`;el.style.top=`${pos.y}px`;el.style.setProperty('--order',index);
    el.setAttribute('role','gridcell');el.setAttribute('aria-label',`巣房 ${index+1}。タップで回転`);
    if(c.q===0&&c.r===0) el.classList.add('queen');
    if(Math.max(Math.abs(c.q),Math.abs(c.r),Math.abs(c.q+c.r))===2&&index%3===0){const f=document.createElement('span');f.className='flower';f.textContent='✿';el.append(f)}
    actualDirs(c).forEach(d=>{const p=document.createElement('i');p.className='path';p.style.setProperty('--angle',`${d*60}deg`);el.append(p)});
    const hub=document.createElement('span');hub.className='hub';el.append(hub);
    el.addEventListener('click',()=>rotateCell(c,index));
    c.el=el;board.append(el);
  });
  updateFlow();
}

function rotateCell(c,index){
  if(locked)return;
  if(!started){started=true;timer=setInterval(()=>{seconds++;paintTime()},1000)}
  c.rot=(c.rot+1)%6;moves++;
  movesEl.textContent=String(moves).padStart(3,'0');
  const el=c.el;
  el.querySelectorAll('.path').forEach(p=>p.remove());
  actualDirs(c).forEach(d=>{const p=document.createElement('i');p.className='path';p.style.setProperty('--angle',`${d*60}deg`);el.insertBefore(p,el.querySelector('.hub'))});
  updateFlow();
  if(isSolved())finish();
}

function connectedSet(){
  const map=new Map(cells.map(c=>[key(c.q,c.r),c])), seen=new Set(['0,0']), queue=[map.get('0,0')];
  while(queue.length){
    const c=queue.shift();
    actualDirs(c).forEach(d=>{
      const next=map.get(key(c.q+directions[d][0],c.r+directions[d][1]));
      if(next&&actualDirs(next).includes((d+3)%6)&&!seen.has(key(next.q,next.r))){seen.add(key(next.q,next.r));queue.push(next)}
    });
  }
  return seen;
}
function hasLeaks(){
  const map=new Map(cells.map(c=>[key(c.q,c.r),c]));
  return cells.some(c=>actualDirs(c).some(d=>{const n=map.get(key(c.q+directions[d][0],c.r+directions[d][1]));return !n||!actualDirs(n).includes((d+3)%6)}));
}
function isSolved(){return connectedSet().size===cells.length&&!hasLeaks()}
function updateFlow(){
  const seen=connectedSet();
  cells.forEach(c=>c.el&&c.el.classList.toggle('connected',seen.has(key(c.q,c.r))));
  connectedEl.textContent=`${seen.size} / ${cells.length}`;
}
function paintTime(){const m=Math.floor(seconds/60),s=seconds%60;timeEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}

function newStage(nextStage=stage){
  clearInterval(timer);stage=nextStage;moves=0;seconds=0;started=false;locked=false;
  stageEl.textContent=String(stage).padStart(2,'0');movesEl.textContent='000';paintTime();board.classList.remove('solved');
  buildPuzzle(stage);renderBoard();
}
function finish(){
  locked=true;clearInterval(timer);board.classList.add('solved');
  setTimeout(()=>{
    document.querySelector('#clearMoves').textContent=moves;document.querySelector('#clearTime').textContent=timeEl.textContent;
    document.querySelector('#factText').textContent=facts[stage-1];
    const next=document.querySelector('#nextBtn');next.innerHTML=stage<3?'次の巣へ <span>→</span>':'もう一度あそぶ <span>↻</span>';
    dialog.showModal();
  },850)
}
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2300)}

document.querySelector('#resetBtn').addEventListener('click',()=>newStage(stage));
document.querySelector('#hintBtn').addEventListener('click',()=>{
  if(locked)return;
  const target=cells.find(c=>c.rot!==0);
  if(!target){showToast('あと少し。つながりの切れ目を探してみよう！');return}
  target.el.classList.remove('hinted');void target.el.offsetWidth;target.el.classList.add('hinted');
  showToast('光っている巣房を回してみよう');
});
document.querySelector('#nextBtn').addEventListener('click',()=>{dialog.close();newStage(stage<3?stage+1:1)});
dialog.addEventListener('cancel',e=>e.preventDefault());
newStage(1);
