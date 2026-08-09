(() => {
  "use strict";
  const SIZE = 6;
  const colors = ["#f1eee5", "#65747c", "#182b3e", "#aeb3b2", "#313638", "#e7e2d8", "#485563", "#8b9292"];
  const C = (id, x, y, length, orientation, color = 0) => ({ id, x, y, length, orientation, color });

  // The player car is always X. Stage data is intentionally independent from game logic.
  const stages = [
    { optimalMoves: 1, cars: [C("X",1,2,2,"h"),C("A",0,0,3,"h",2),C("B",4,4,2,"v",1),C("C",1,5,3,"h",3)] },
    { optimalMoves: 2, cars: [C("X",1,2,2,"h"),C("A",3,1,2,"v",1),C("B",0,0,2,"h",2),C("C",4,3,3,"v",3),C("D",0,5,3,"h",4)] },
    { optimalMoves: 3, cars: [C("X",0,2,2,"h"),C("A",2,1,2,"v",1),C("B",3,0,3,"v",2),C("C",4,0,2,"h",3),C("D",0,4,3,"h",4),C("E",5,3,3,"v",5)] },
    { optimalMoves: 4, cars: [C("X",1,2,2,"h"),C("A",3,1,3,"v",1),C("B",4,0,2,"h",2),C("C",4,1,2,"v",3),C("D",0,4,3,"h",4),C("E",1,5,2,"h",5),C("F",5,2,3,"v",6)] },
    { optimalMoves: 5, cars: [C("X",1,2,2,"h",0),C("A",3,0,3,"v",1),C("B",4,2,2,"v",2),C("C",0,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",2,4,3,"h",6),C("G",5,3,3,"v",7),C("H",0,5,3,"h",0)] },
    { optimalMoves: 6, cars: [C("X",1,2,2,"h"),C("A",3,0,3,"v",1),C("B",4,0,2,"v",2),C("C",0,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",1,4,3,"h",6),C("G",5,1,3,"v",7),C("H",3,5,3,"h",0)] },
    { optimalMoves: 7, cars: [C("X",1,2,2,"h",0),C("A",3,1,3,"v",1),C("B",4,1,2,"v",2),C("C",0,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",1,4,3,"h",6),C("G",5,1,3,"v",7),C("H",3,5,3,"h",0)] },
    { optimalMoves: 7, cars: [C("X",1,2,2,"h",0),C("A",3,0,3,"v",1),C("B",4,1,2,"v",2),C("C",0,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",1,4,3,"h",6),C("G",5,1,3,"v",7),C("H",3,5,3,"h",0)] },
    { optimalMoves: 8, cars: [C("X",0,2,2,"h",0),C("A",3,1,3,"v",1),C("B",4,1,2,"v",2),C("C",1,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",3,4,3,"h",6),C("G",5,0,3,"v",7),C("H",2,5,3,"h",0)] },
    { optimalMoves: 8, cars: [C("X",0,2,2,"h",0),C("A",3,1,3,"v",1),C("B",4,2,2,"v",2),C("C",1,0,3,"h",3),C("D",1,1,2,"h",4),C("E",0,3,2,"v",5),C("F",3,4,3,"h",6),C("G",5,0,3,"v",7),C("H",2,5,3,"h",0)] }
  ];

  const els = { board: document.querySelector("#board"), cars: document.querySelector("#cars"), stage: document.querySelector("#stageNumber"), moves: document.querySelector("#moveCount"), restart: document.querySelector("#restartButton"), result: document.querySelector("#result"), resultMoves: document.querySelector("#resultMoves"), resultFee: document.querySelector("#resultFee"), resultComment: document.querySelector("#resultComment"), receiptStage: document.querySelector("#receiptStage"), next: document.querySelector("#nextButton"), retry: document.querySelector("#retryButton") };
  let stageIndex = 0, cars = [], moves = 0, drag = null, cleared = false, audioCtx = null;

  function cellSize() { return els.board.clientWidth / SIZE; }
  function cellsFor(car, position = car[car.orientation === "h" ? "x" : "y"]) {
    const out = [];
    for (let i=0;i<car.length;i++) out.push(car.orientation === "h" ? [position+i,car.y] : [car.x,position+i]);
    return out;
  }
  function occupied(except) { const set = new Set(); cars.forEach(c => { if(c!==except) cellsFor(c).forEach(([x,y]) => set.add(`${x},${y}`)); }); return set; }
  function bounds(car) {
    const axis = car.orientation === "h" ? "x" : "y", fixed = car.orientation === "h" ? car.y : car.x, occ = occupied(car);
    let min = car[axis], max = car[axis];
    while(min>0 && !occ.has(car.orientation === "h" ? `${min-1},${fixed}` : `${fixed},${min-1}`)) min--;
    while(max+car.length<SIZE && !occ.has(car.orientation === "h" ? `${max+car.length},${fixed}` : `${fixed},${max+car.length}`)) max++;
    return {min,max};
  }
  function render() {
    els.cars.innerHTML = "";
    cars.forEach((car,i) => {
      const el = document.createElement("div");
      el.className = `car ${car.orientation === "h" ? "horizontal" : "vertical"}${car.id === "X" ? " player" : ""}`;
      el.dataset.index = i; el.style.setProperty("--car", car.id === "X" ? "#ffd52a" : colors[car.color % colors.length]);
      el.innerHTML = '<div class="car-body"><i class="glass front"></i><i class="glass rear"></i><i class="stripe"></i><i class="wheel w1"></i><i class="wheel w2"></i><i class="wheel w3"></i><i class="wheel w4"></i><i class="lights"></i></div>';
      el.addEventListener("pointerdown", startDrag); els.cars.appendChild(el); car.el = el; place(car);
    });
  }
  function place(car, pixelOffset=0) {
    const s=cellSize(), horizontal=car.orientation === "h";
    car.el.style.width=`${s*(horizontal?car.length:1)}px`; car.el.style.height=`${s*(horizontal?1:car.length)}px`;
    car.el.style.transform=`translate3d(${car.x*s+(horizontal?pixelOffset:0)}px,${car.y*s+(horizontal?0:pixelOffset)}px,0)`;
  }
  function startDrag(e) {
    if(cleared) return; e.preventDefault(); const car=cars[+e.currentTarget.dataset.index], axis=car.orientation === "h"?"x":"y";
    const lim=bounds(car); drag={car,axis,startPointer:axis==="x"?e.clientX:e.clientY,startCell:car[axis],lim,lastPixel:0,hit:false};
    car.el.classList.add("dragging"); car.el.setPointerCapture(e.pointerId); car.el.addEventListener("pointermove",moveDrag); car.el.addEventListener("pointerup",endDrag); car.el.addEventListener("pointercancel",endDrag); tone(90,.025,.025);
  }
  function moveDrag(e) {
    if(!drag) return; e.preventDefault(); const p=drag.axis==="x"?e.clientX:e.clientY, raw=(p-drag.startPointer)/cellSize();
    const clamped=Math.max(drag.lim.min-drag.startCell,Math.min(drag.lim.max-drag.startCell,raw));
    drag.lastPixel=clamped*cellSize(); place(drag.car,drag.lastPixel);
    if(raw!==clamped && !drag.hit){drag.hit=true;bump(drag.car);} else if(raw===clamped){drag.hit=false;}
  }
  function endDrag(e) {
    if(!drag) return; const d=drag; drag=null; d.car.el.releasePointerCapture?.(e.pointerId); d.car.el.classList.remove("dragging"); d.car.el.removeEventListener("pointermove",moveDrag); d.car.el.removeEventListener("pointerup",endDrag); d.car.el.removeEventListener("pointercancel",endDrag);
    const target=Math.max(d.lim.min,Math.min(d.lim.max,d.startCell+Math.round(d.lastPixel/cellSize()))); d.car[d.axis]=target; place(d.car);
    if(target!==d.startCell){moves++;els.moves.textContent=moves;tone(135,.035,.035);if(d.car.id==="X" && d.car.x+d.car.length===SIZE) win();}
  }
  function bump(car){car.el.classList.remove("bump");void car.el.offsetWidth;car.el.classList.add("bump");if(navigator.vibrate)navigator.vibrate(18);tone(70,.045,.018);}
  function tone(freq,duration,volume=.04,type="sine") { try { audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(_){} }
  function loadStage(index) { stageIndex=(index+stages.length)%stages.length;cars=stages[stageIndex].cars.map(c=>({...c}));moves=0;cleared=false;els.stage.textContent=String(stageIndex+1).padStart(2,"0");els.moves.textContent="0";els.result.classList.remove("show");els.result.setAttribute("aria-hidden","true");render(); }
  function feeFor(n){return n<=10?300:n<=15?500:n<=20?800:n<=30?1500:n<=40?3000:5000;}
  function commentFor(n,opt){const d=n-opt;return d<=0?"PERFECT PARKING!":d<=3?"NICE PARKING!":d<=8?"TOOK A WHILE...":"PARKING HELL";}
  function win(){cleared=true;const player=cars.find(c=>c.id==="X");player.el.style.transition="transform 650ms cubic-bezier(.3,.7,.3,1)";player.el.style.transform=`translate3d(${els.board.clientWidth+cellSize()*1.4}px,${player.y*cellSize()}px,0)`;setTimeout(()=>{tone(880,.12,.06,"square");setTimeout(()=>tone(1320,.16,.045,"square"),110);els.resultMoves.textContent=moves;els.resultFee.textContent=`¥${feeFor(moves).toLocaleString("ja-JP")}`;els.resultComment.textContent=commentFor(moves,stages[stageIndex].optimalMoves);els.receiptStage.textContent=`STAGE ${String(stageIndex+1).padStart(2,"0")}`;els.result.classList.add("show");els.result.setAttribute("aria-hidden","false");},620);}

  els.restart.addEventListener("click",()=>loadStage(stageIndex)); els.retry.addEventListener("click",()=>loadStage(stageIndex)); els.next.addEventListener("click",()=>loadStage(stageIndex+1));
  window.addEventListener("resize",()=>cars.forEach(c=>place(c))); document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false}); document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false}); document.addEventListener("contextmenu",e=>e.preventDefault());

  // Breadth-first solver used by automated checks; a move is any distance by one car.
  function solve(stage) {
    const base=stage.cars, start=base.map(c=>c.orientation==="h"?c.x:c.y), key=p=>p.join(""); const q=[[start,0]],seen=new Set([key(start)]);
    while(q.length){const [pos,depth]=q.shift();const grid=Array.from({length:SIZE},()=>Array(SIZE).fill(-1));base.forEach((c,i)=>{const axis=pos[i];for(let k=0;k<c.length;k++){const x=c.orientation==="h"?axis+k:c.x,y=c.orientation==="v"?axis+k:c.y;grid[y][x]=i;}});const px=pos[0];if(px+base[0].length===SIZE)return depth;
      for(let i=0;i<base.length;i++){const c=base[i],cur=pos[i],fixed=c.orientation==="h"?c.y:c.x;let lo=cur,hi=cur;while(lo>0&&(c.orientation==="h"?grid[fixed][lo-1]:grid[lo-1][fixed])<0)lo--;while(hi+c.length<SIZE&&(c.orientation==="h"?grid[fixed][hi+c.length]:grid[hi+c.length][fixed])<0)hi++;for(let n=lo;n<=hi;n++){if(n===cur)continue;const next=pos.slice();next[i]=n;const k=key(next);if(!seen.has(k)){seen.add(k);q.push([next,depth+1]);}}}
    } return null;
  }
  window.__PARK_OUT__={stages,solve,validate:()=>stages.map((s,i)=>({stage:i+1,declared:s.optimalMoves,solved:solve(s)}))};
  loadStage(0);
})();
