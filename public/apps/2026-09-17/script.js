import * as THREE from '/apps/2026-09-17/vendor/three.module.min.js';
import { Monorail, STATIONS, MAX_SPEED } from '/apps/2026-09-17/engine.mjs';

const $ = id => document.getElementById(id);
const game = new Monorail();
const keys = new Set(), pointers = new Map();
let paused = false, renderer, scene, camera, sun, frameTime = 0, previousPhase = '', previousStation = -1;
const skyDay = new THREE.Color('#69878d'), skyNight = new THREE.Color('#293b57');
const fogDay = new THREE.Color('#b7b2a3'), fogNight = new THREE.Color('#646a7c');
const palette = { concrete: '#a8aca1', pale: '#d2c9ad', teal: '#6d928b', dark: '#4d6866', glass: '#557878', lit: '#e6cb96', road: '#6b7770', white: '#ede1c2', rust: '#b3876e' };
let seed = 917;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const batches = new Map();
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
function box(x, y, z, w, h, d, color = palette.concrete) {
  if (!batches.has(color)) batches.set(color, []);
  batches.get(color).push([x, y, z, w, h, d]);
}
function flushBoxes() {
  const transform = new THREE.Object3D();
  for (const [color, items] of batches) {
    const mesh = new THREE.InstancedMesh(boxGeometry, new THREE.MeshLambertMaterial({ color }), items.length);
    items.forEach(([x,y,z,w,h,d], i) => { transform.position.set(x,y,z); transform.scale.set(w,h,d); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix); });
    mesh.computeBoundingSphere(); scene.add(mesh);
  }
}
function cylinder(x,y,z,r1,r2,h,color,segments=12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),new THREE.MeshLambertMaterial({color}));
  mesh.position.set(x,y,z);scene.add(mesh);return mesh;
}
function sign(text, sub, x, y, z, width = 14, height = 4, background = '#e5dec5') {
  const canvas = document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);
  ctx.fillStyle='#325957';ctx.fillRect(0,198,1024,12);ctx.textAlign='center';ctx.font='600 78px sans-serif';ctx.fillText(text,512,112);
  ctx.font='24px monospace';ctx.fillText(sub,512,166);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);scene.add(mesh);
}
function building(x,z,w,h,d,style) {
  const color=style===0 ? palette.pale : style===1 ? palette.teal : palette.concrete;
  box(x,h/2,z,w,h,d,color);box(x,h+.45,z,w+1,.9,d+1,palette.white);
  // Broad horizontal window bands, with concrete mullions: miniature architecture, no textures.
  for(let y=3;y<h-1;y+=3.7){
    box(x,y,z+d/2+.04,w-2,1.3,.12,palette.glass);
    box(x-Math.sign(x)*(w/2+.04),y,z,.12,1.3,d-2,palette.glass);
    if(style===0) box(x,y-1,z+d/2+.6,w+.4,.38,1.3,palette.white);
  }
  for(let i=-w/2+3;i<w/2;i+=4.4) box(x+i,h/2,z+d/2+.15,.4,h-2,.5,color);
  box(x+2,h+1.3,z,4,2,4,palette.dark);
}
function station(s,index) {
  const z=-s.position;
  box(5.4,8.65,z+22,6,.7,86,palette.pale);
  box(2.55,9.03,z+22,.4,.08,86,palette.lit);
  box(5.4,14.2,z+22,7.2,.45,89,palette.teal);
  box(5.4,14.55,z+22,7.5,.2,89,palette.white);
  for(let offset=-14;offset<=60;offset+=18){
    box(7.6,11.5,z+offset,.35,5.3,.35,palette.white);
    box(6.2,9.65,z+offset,2.6,.5,1,palette.dark);
    box(6.2,10.05,z+offset-.4,2.6,.8,.2,palette.teal);
    box(5,13.92,z+offset,3,.08,1.2,palette.lit);
  }
  box(9,4,z+30,1.3,8,4,palette.concrete);
  box(5.5,16,z-3,.3,4,.3,palette.dark);
  sign(s.name,s.en+'  /  0'+(index+1),5.5,17,z-3,12,3);
  // Trackside stopping target and a transverse mark under the cab.
  box(0,8.59,z,2.5,.04,.4,palette.lit);
  box(1.85,10,z,.12,3,.12,palette.dark);
  sign('停 車','STOP',1.85,11.8,z,1.7,.85);
}
function tower(x,z){
  cylinder(x,24,z,2,5,48,palette.pale,8);
  cylinder(x,42,z,12,8,3,palette.teal,16);
  cylinder(x,45,z,9,12,3,palette.white,16);
  cylinder(x,47,z,8,8,2.3,palette.glass,16);
  cylinder(x,49,z,3,11,2,palette.white,16);
  cylinder(x,57,z,.35,.65,14,palette.dark,8);
  cylinder(x,36,z,7,7,.7,palette.rust,16);
}
function buildCity() {
  box(0,-1,-750,1800,2,4200,'#89968a');
  // Port basin and concrete quay at the end of the line.
  box(115,.06,-1470,170,.12,470,'#628487');
  box(35,.1,-1450,20,.2,500,palette.pale);
  for(let z=90;z>-1740;z-=24){
    box(0,7.85,z,1.7,1.35,24,palette.pale);box(0,8.55,z,1.3,.12,23.8,palette.dark);
    box(-8,7.85,z,1.7,1.35,24,palette.pale);box(-8,8.55,z,1.3,.12,23.8,palette.dark);
    box(-4,6.8,z,12,.9,1.8,palette.concrete);box(-4,3.2,z,1.4,6.5,1.6,palette.concrete);
  }
  box(-27,.1,-740,19,.18,1920,palette.road);box(-27,.21,-740,.22,.03,1920,palette.pale);
  box(24,.1,-600,12,.18,1560,palette.road);
  for(let z=60;z>-1660;z-=30){
    box(-31,.23,z,.18,.04,8,palette.white);box(-22,.23,z,.18,.04,8,palette.white);
    for(const x of [-16,16]){
      box(x,4.3,z,.16,8.6,.16,palette.dark);box(x-Math.sign(x)*1.2,8.5,z,2.5,.14,.2,palette.dark);box(x-Math.sign(x)*2.2,8.4,z,.9,.15,.5,palette.lit);
    }
    if(random()>.45){const x=-31+Math.floor(random()*2)*9;box(x,.9,z,1.8,1.2,4,palette.rust);box(x,1.7,z-.1,1.6,.6,2,palette.pale);}
  }
  for(let z=-35;z>-1650;z-=48){
    for(const side of [-1,1]){
      if(side===1&&z<-1150)continue;
      const residential=z>-720;
      const x=side*(43+random()*14);const h=residential?15+random()*16:20+random()*34;
      building(x,z,14+random()*9,h,18+random()*8,residential?0:1);
      building(side*(88+random()*24),z-20,18+random()*14,18+random()*38,24,2);
    }
  }
  // Sparse far skyline silhouettes, softened by fog.
  for(let i=0;i<110;i++){
    const x=(random()-.5)*1200;const z=-100-random()*2100;
    if(Math.abs(x)<145)continue;
    const h=14+random()*68;box(x,h/2,z,12+random()*26,h,15+random()*25,'#8c9e98');
  }
  tower(60,-745);tower(-82,-1230);
  // Grade-separated expressway.
  box(0,20,-570,350,1.2,12,palette.concrete);box(0,21,-564,350,1,.3,palette.pale);box(0,21,-576,350,1,.3,palette.pale);
  for(let x=-150;x<160;x+=35){if(Math.abs(x)<15)continue;box(x,9.6,-570,2,19,3,palette.concrete);}
  // Optimistic civic advertisements.
  for(const [x,z,text,sub] of [[-39,-235,'あしたの暮らし','NEW LIFE / NEW TOWN'],[39,-1010,'未来は、すぐそこ。','MIRAI ELECTRIC'],[-47,-1300,'海の向こうへ','FUTURE PORT  /  1970']]){
    box(x,27,z,1.2,19,1.2,palette.dark);box(x,36,z,25,7,.7,palette.teal);sign(text,sub,x,36,z+.4,24,6);
  }
  // Harbor gantries and low warehouses.
  for(let z=-1230;z>-1650;z-=85){
    box(51,14,z,1.5,28,1.5,palette.rust);box(70,14,z,1.5,28,1.5,palette.rust);box(63,28,z,32,1.5,2,palette.rust);box(78,20,z,.12,15,.12,palette.dark);
    box(-50,5,z,25,10,35,palette.teal);
  }
  STATIONS.forEach(station);
  flushBoxes();
  sun=new THREE.Mesh(new THREE.CircleGeometry(48,48),new THREE.MeshBasicMaterial({color:'#f4cf9a',fog:false,transparent:true,opacity:.85}));sun.position.set(-340,190,-1600);scene.add(sun);
}
function init() {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  $('world').appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.fog=new THREE.Fog(fogDay,90,640);
  camera=new THREE.PerspectiveCamera(60,1,.15,1800);
  scene.add(new THREE.HemisphereLight('#fff0d1','#576e70',2.4));
  const light=new THREE.DirectionalLight('#fff0d0',2.1);light.position.set(-100,150,70);scene.add(light);
  buildCity();resize();
  $('start').disabled=false;$('start').innerHTML='START <span>↗</span>';
  requestAnimationFrame(frame);
}
function resize(){const w=$('world').clientWidth,h=$('world').clientHeight;if(!renderer)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
function clearInput(){keys.clear();pointers.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function start(){game.start();clearInput();previousPhase='';previousStation=-1;$('title-screen').hidden=true;$('complete').hidden=true;$('guidance').hidden=false;}
function signed(n){return (n>=0?'+':'−')+Math.abs(n).toFixed(1)+'m';}
function updateUI(){
  const s=STATIONS[Math.min(game.station,2)];
  $('speed').textContent=String(Math.round(game.speed*3.6)).padStart(2,'0');
  $('speed-bar').style.width=(game.speed/MAX_SPEED*100)+'%';
  $('distance').textContent=game.phase==='complete'?'—':game.distance<0?'−'+Math.abs(game.distance).toFixed(1):game.distance<30?game.distance.toFixed(1):Math.ceil(game.distance);
  $('drive-mode').textContent=game.mode;
  $('brake-bars').classList.toggle('emergency',game.mode==='EMERGENCY');
  [...$('brake-bars').children].forEach((bar,i)=>bar.classList.toggle('lit',i<Math.ceil(game.brake*6)));
  if(previousStation!==game.station){
    $('next-station').textContent=s.name;$('station-en').textContent=s.en;$('station-count').textContent=String(game.station+1).padStart(2,'0')+' / 03';
    document.querySelectorAll('.route-stop').forEach((el,i)=>{el.classList.toggle('active',i===game.station);el.classList.toggle('done',i<game.station);});
    previousStation=game.station;
  }
  if(game.phase==='running'){
    const brakingDistance=game.speed*game.speed/3+game.speed*.36;
    let message='出発進行 · ↑ / W で加速';
    let warn=false;
    if(game.distance<0){message='停止位置を超過 · ブレーキをかけて停車';warn=true;}
    else if(game.distance<8){message='停止目標まで '+game.distance.toFixed(1)+' m · ブレーキで停車';warn=true;}
    else if(game.distance<brakingDistance+20&&game.speed>3){message='まもなく停止位置 · ↓ / S で減速';warn=true;}
    else if(game.distance<110){message='駅に接近 · 低速で停止位置へ';warn=true;}
    else if(game.speed>12){message='惰行運転 · キーを離すと、そのまま走行';}
    if(game.speed<.1&&game.distance>65)message='駅はもう少し先です · ↑ / W で再発進';
    $('guidance-text').textContent=message;$('guidance').classList.toggle('warn',warn);
    $('distance-note').textContent=game.distance<65?'停止位置で約1秒静止':'停止目標に合わせて停車';
    $('operation-hint').textContent='通常ブレーキの停止距離 約 '+Math.ceil(brakingDistance)+' m';
  }
  if(game.phase!==previousPhase){
    if(game.phase==='dwell'){
      clearInput();const r=game.results.at(-1);$('result').hidden=false;$('guidance').hidden=true;
      $('result-station').textContent=s.en+' / '+s.name;$('rating').textContent=r.rating;
      $('stop-error').textContent='停止位置との差：'+signed(r.error);$('points').textContent='+'+r.points+' PT';
      $('service-state').textContent='STATION STOP';
    } else if(game.phase==='running'){$('result').hidden=true;$('guidance').hidden=false;$('service-state').textContent='IN SERVICE';}
    else if(game.phase==='complete'){
      clearInput();$('result').hidden=true;$('guidance').hidden=true;$('complete').hidden=false;
      $('total-score').textContent=game.results.reduce((sum,r)=>sum+r.points,0).toLocaleString();
      $('score-list').replaceChildren();
      game.results.forEach(r=>{const row=document.createElement('div');row.className='score-row';const name=document.createElement('span'),rating=document.createElement('span'),score=document.createElement('b');name.textContent=STATIONS[r.station].name;rating.textContent=r.rating+' / '+signed(r.error);score.textContent=r.points;row.append(name,rating,score);$('score-list').append(row);});
      $('service-state').textContent='SERVICE COMPLETE';$('operation-hint').textContent='全3駅の運転が終了しました。';
      document.querySelectorAll('.route-stop').forEach(el=>{el.classList.remove('active');el.classList.add('done');});
      $('retry').focus({preventScroll:true});
    }
    previousPhase=game.phase;
  }
  if(game.phase==='dwell')$('departure').textContent=game.station===2?'まもなく運転成績を表示します':Math.max(1,Math.ceil(game.dwell))+'秒後、次の駅へ自動出発';
}
function frame(time){
  const elapsed=frameTime?Math.min((time-frameTime)/1000,.1):0;frameTime=time;
  if(!paused){
    const touch=new Set(pointers.values());
    const input={accelerate:keys.has('ArrowUp')||keys.has('KeyW')||touch.has('accelerate'),brake:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('brake'),emergency:keys.has('Space')||touch.has('emergency')};
    let remaining=elapsed;while(remaining>0){const dt=Math.min(remaining,1/60);game.update(dt,input);remaining-=dt;}
  }
  const progress=Math.min(1,game.position/1420);
  const sky=skyDay.clone().lerp(skyNight,progress),fog=fogDay.clone().lerp(fogNight,progress);
  scene.fog.color.copy(fog);
  $('world').style.background=`linear-gradient(${sky.getStyle()} 0%, ${fog.getStyle()} 64%, ${new THREE.Color('#e7bd96').lerp(new THREE.Color('#b58f91'),progress).getStyle()} 100%)`;
  sun.position.z=-1600-game.position;sun.position.y=190-progress*135;sun.material.opacity=.85-progress*.5;
  camera.position.set(0,11.3+Math.sin(game.position*.13)*.012*(game.speed/MAX_SPEED),-game.position+2);
  camera.lookAt(0,10.9,-game.position-100);
  updateUI();renderer.render(scene,camera);requestAnimationFrame(frame);
}
const handled=new Set(['ArrowUp','ArrowDown','KeyW','KeyS','Space']);
window.addEventListener('keydown',e=>{if(handled.has(e.code)&&game.phase==='running'){e.preventDefault();keys.add(e.code);}});
window.addEventListener('keyup',e=>{if(handled.has(e.code)){e.preventDefault();keys.delete(e.code);}});
function pause(){clearInput();paused=true;$('paused').hidden=game.phase!=='running'&&game.phase!=='dwell';}
function resume(){paused=false;frameTime=0;$('paused').hidden=true;}
window.addEventListener('blur',pause);window.addEventListener('focus',resume);
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
window.addEventListener('resize',resize);
$('start').addEventListener('click',start);$('retry').addEventListener('click',start);
document.querySelectorAll('[data-control]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(game.phase!=='running')return;button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.control);button.classList.add('pressed');});
  const release=e=>{pointers.delete(e.pointerId);button.classList.remove('pressed');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('contextmenu',e=>e.preventDefault());
});
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
try{init();}catch(error){console.error(error);$('load-error').hidden=false;$('start').textContent='UNAVAILABLE';}
