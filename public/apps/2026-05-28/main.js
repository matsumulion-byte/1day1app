const ASSET_BASE = "/apps/2026-05-28";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const sky = document.getElementById("sky");
const shell = document.getElementById("shell");

const sctx = sky.getContext("2d");
const shctx = shell.getContext("2d");

const launchBtn = document.getElementById("launchBtn");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");

const capacityText = document.getElementById("capacityText");
const powderText = document.getElementById("powderText");

const toolBtns = [...document.querySelectorAll(".tool")];
const shapeBtns = [...document.querySelectorAll(".shape")];

const firework = new Audio(asset("./assets/firework.mp3"));
firework.volume = .8;

let selected = "red";
let shape = "burst";

let items = [];

let rocket = null;
let particles = [];
let flash = 0;

const MAX_CAPACITY = 30;

const colors = {
  red:"#ff4d5a",
  blue:"#58a6ff",
  gold:"#ffd84d"
};

function resize(canvas,ctx){
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function resizeAll(){
  resize(sky,sctx);
  resize(shell,shctx);
  drawShell();
}

window.addEventListener("resize",resizeAll);
resizeAll();

toolBtns.forEach(btn=>{
  btn.onclick=()=>{
    selected = btn.dataset.type;

    toolBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  };
});

shapeBtns.forEach(btn=>{
  btn.onclick=()=>{
    shape = btn.dataset.shape;

    shapeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  };
});

function capacity(){
  return items.length;
}

function powderLevel(){
  return items.filter(i=>i.type==="powder").length + 1;
}

function updateUI(){
  capacityText.textContent = `${capacity()} / ${MAX_CAPACITY}`;
  powderText.textContent = powderLevel();

  if(capacity()>MAX_CAPACITY){
    capacityText.style.color = "#ff5c5c";
  }else{
    capacityText.style.color = "#fff";
  }
}

shell.addEventListener("pointerdown",e=>{
  const rect = shell.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const cx = rect.width/2;
  const cy = rect.height/2;

  const dx = x-cx;
  const dy = y-cy;

  if(Math.hypot(dx,dy)>120) return;

  items.push({
    x:dx,
    y:dy,
    type:selected
  });

  drawShell();
  updateUI();
});

clearBtn.onclick=()=>{
  items=[];
  drawShell();
  updateUI();
};

randomBtn.onclick=()=>{
  items=[];

  const types=["red","blue","gold","powder"];

  for(let i=0;i<26;i++){
    const a=Math.random()*Math.PI*2;
    const r=Math.random()*110;

    items.push({
      x:Math.cos(a)*r,
      y:Math.sin(a)*r,
      type:types[Math.floor(Math.random()*types.length)]
    });
  }

  drawShell();
  updateUI();
};

function drawShell(){

  const w = shell.getBoundingClientRect().width;
  const h = shell.getBoundingClientRect().height;

  shctx.clearRect(0,0,w,h);

  shctx.save();

  shctx.translate(w/2,h/2);

  shctx.beginPath();
  shctx.arc(0,0,120,0,Math.PI*2);
  shctx.fillStyle="#34261a";
  shctx.fill();

  shctx.lineWidth=4;
  shctx.strokeStyle="rgba(255,255,255,.25)";
  shctx.stroke();

  items.forEach(i=>{

    if(i.type==="powder"){

      shctx.beginPath();
      shctx.arc(i.x,i.y,8,0,Math.PI*2);
      shctx.fillStyle="#fff";
      shctx.fill();

      shctx.beginPath();
      shctx.arc(i.x,i.y,14,0,Math.PI*2);
      shctx.strokeStyle="rgba(255,255,255,.2)";
      shctx.stroke();

      return;
    }

    shctx.beginPath();
    shctx.arc(i.x,i.y,7,0,Math.PI*2);
    shctx.fillStyle=colors[i.type];
    shctx.shadowBlur=16;
    shctx.shadowColor=colors[i.type];
    shctx.fill();
    shctx.shadowBlur=0;

  });

  shctx.restore();
}

launchBtn.onclick=()=>{

  if(rocket) return;

  firework.currentTime = 0;
  firework.play().catch(()=>{});

  const w = sky.getBoundingClientRect().width;
  const h = sky.getBoundingClientRect().height;

  rocket = {
    x:w/2,
    y:h-40,
    target:h*.32
  };
};

function explode(x,y){

  flash = .9;

  const power = powderLevel();

  const overload = capacity()>MAX_CAPACITY;

  let multiplier = 1 + power * .8;

  if(overload){
    multiplier *= 2.2;
  }

  items.forEach(item=>{

    if(item.type==="powder") return;

    let count = 4;

    if(shape==="willow") count = 7;
    if(shape==="ring") count = 5;
    if(shape==="chaos") count = 12;

    for(let i=0;i<count;i++){

      let angle;

      if(shape==="ring"){
        angle = Math.atan2(item.y,item.x);
      }
      else if(shape==="chaos"){
        angle = Math.random()*Math.PI*2;
      }
      else{
        angle = Math.atan2(item.y,item.x)+random(-0.5,0.5);
      }

      const speed =
      random(28,90) * multiplier;

      particles.push({
        x,
        y,
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed,
        color:colors[item.type],
        life:
          shape==="willow"
            ? random(3.8,5.5)
            : random(1.6,2.4),
        type:shape
      });
    }

  });

  if(overload){

    for(let i=0;i<120;i++){

      particles.push({
        x,
        y,
        vx:random(-400,400),
        vy:random(-400,400),
        color:"#ffffff",
        life:random(.5,1.2),
        type:"chaos"
      });

    }

  }
}

function random(min,max){
  return min + Math.random()*(max-min);
}

function drawSky(){

  const w = sky.getBoundingClientRect().width;
  const h = sky.getBoundingClientRect().height;

  sctx.fillStyle="rgba(5,6,13,.22)";
  sctx.fillRect(0,0,w,h);

  if(flash>0){
    sctx.fillStyle=`rgba(255,255,255,${flash})`;
    sctx.fillRect(0,0,w,h);

    flash*=.88;
  }

  if(rocket){

    rocket.y -= 6;

    sctx.beginPath();
    sctx.arc(rocket.x,rocket.y,4,0,Math.PI*2);
    sctx.fillStyle="#fff";
    sctx.shadowBlur=20;
    sctx.shadowColor="#fff";
    sctx.fill();
    sctx.shadowBlur=0;

    sctx.beginPath();
    sctx.moveTo(rocket.x,rocket.y+20);
    sctx.lineTo(rocket.x,rocket.y);

    sctx.strokeStyle="rgba(255,220,120,.8)";
    sctx.stroke();

    if(rocket.y<rocket.target){
      explode(rocket.x,rocket.y);
      rocket=null;
    }
  }

  particles.forEach(p=>{

    p.x += p.vx*.016;
    p.y += p.vy*.016;

    if(p.type==="willow"){
      p.vx *= 0.985;
      p.vy += 0.9;
    }else{
      p.vy += 0.18;
    }

    p.life -= .016;

    sctx.beginPath();
    sctx.arc(p.x,p.y,2.4,0,Math.PI*2);

    sctx.fillStyle=p.color;
    sctx.shadowBlur=18;
    sctx.shadowColor=p.color;
    sctx.fill();
    sctx.shadowBlur=0;

    sctx.beginPath();
    sctx.moveTo(p.x,p.y);
    const tail =
      p.type==="willow"
        ? 0.12
        : 0.03;

    sctx.lineTo(
      p.x-p.vx*tail,
      p.y-p.vy*tail
    );

    sctx.strokeStyle=p.color;
    sctx.stroke();

  });

  particles = particles.filter(p=>p.life>0);

  requestAnimationFrame(drawSky);
}

updateUI();
drawShell();
drawSky();