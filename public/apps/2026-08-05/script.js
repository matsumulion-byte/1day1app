const SAVE_KEY = "hakkou-town-v1";

const buildings = [
  { id:"koji", name:"麹蔵", icon:"米", base:15, rate:1, desc:"麹菌が米を甘く変える、街のはじまり。", unlock:0, microbe:"麹菌" },
  { id:"miso", name:"味噌蔵", icon:"味", base:90, rate:5, desc:"時間を味方に、深いうまみを醸します。", unlock:40, microbe:"酵母" },
  { id:"amazake", name:"甘酒茶屋", icon:"甘", base:420, rate:18, desc:"ほっとする甘い香りが街に広がります。", unlock:180, microbe:"乳酸菌" },
  { id:"natto", name:"納豆研究所", icon:"納", base:1600, rate:60, desc:"元気な納豆菌が、猛烈な勢いで働きます。", unlock:750, microbe:"納豆菌" },
  { id:"shoyu", name:"醤油御殿", icon:"醤", base:6200, rate:210, desc:"街の香りをまとめる、発酵文化の殿堂。", unlock:3000, microbe:"酢酸菌" }
];
const milestones = [
  {power:0,name:"ひとつぶ麹村"},{power:25,name:"湯気の小路"},{power:150,name:"発酵商店街"},
  {power:700,name:"水路の醸造町"},{power:2500,name:"うまみ城下町"},{power:9000,name:"大発酵都市"}
];
let state = { power:0, total:0, levels:{koji:0,miso:0,amazake:0,natto:0,shoyu:0}, lastSeen:Date.now(), sound:true };
let offlinePending = 0;
const $ = id => document.getElementById(id);

function load(){
  try { const saved=JSON.parse(localStorage.getItem(SAVE_KEY)); if(saved) state={...state,...saved,levels:{...state.levels,...saved.levels}}; } catch(_){}
  const away=Math.min(8*60*60,Math.max(0,(Date.now()-(state.lastSeen||Date.now()))/1000));
  offlinePending=Math.floor(rate()*away*.55);
  if(away>30 && offlinePending>0){ $("offlineGain").textContent=`＋${fmt(offlinePending)} 発酵力`; $("offlineTime").textContent=`${duration(away)}のあいだ、菌たちがゆっくり働きました。`; $("offlineModal").hidden=false; }
  state.lastSeen=Date.now();
}
function save(){state.lastSeen=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
function fmt(n){if(n>=1e8)return (n/1e8).toFixed(1)+"億";if(n>=1e4)return (n/1e4).toFixed(1)+"万";return Math.floor(n).toLocaleString("ja-JP")}
function duration(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}時間${m}分`:`${Math.max(1,m)}分`}
function cost(b){return Math.floor(b.base*Math.pow(1.58,state.levels[b.id]))}
function rate(){return buildings.reduce((sum,b)=>sum+state.levels[b.id]*b.rate,0)}
function tapPower(){return 1+Math.floor(Math.sqrt(state.total)/12)+Math.floor(state.levels.koji/3)}
function townLevel(){let i=0;milestones.forEach((m,n)=>{if(state.total>=m.power)i=n});return i}
function unlockable(b){return state.total>=b.unlock}

function render(){
  const level=townLevel(), next=milestones[level+1];
  $("power").textContent=fmt(state.power); $("rate").textContent=`＋${rate().toFixed(1)} / 秒`;
  $("townLevel").textContent=level+1; $("townName").textContent=milestones[level].name;
  $("citizens").textContent=fmt(12+Math.floor(state.total*3.7))+"菌"; $("tapPower").textContent=fmt(tapPower());
  $("nextLabel").textContent=next?`次の発展まで ${fmt(Math.max(0,next.power-state.total))}`:"発酵文化、満開！";
  $("town").className=`town level-${level+1}`;
  let unlocked=0;
  buildings.forEach(b=>{const el=document.querySelector(`[data-building="${b.id}"]`);const open=unlockable(b);el.classList.toggle("unlocked",open);if(open)unlocked++});
  $("unlockCount").textContent=`${unlocked} / ${buildings.length}`;
  $("shops").innerHTML=buildings.map(b=>{
    const open=unlockable(b), c=cost(b), owned=state.levels[b.id];
    return `<article class="shop ${open?"":"locked"}"><span class="shop-icon">${open?b.icon:"?"}</span><div class="shop-info"><strong>${open?b.name:`発酵力 ${fmt(b.unlock)} で発見`}${owned?` Lv.${owned}`:""}</strong><small>${open?b.desc:`まだ知らない菌の気配がします…`}</small></div><button class="buy" data-buy="${b.id}" ${!open||state.power<c?"disabled":""}>${owned?"増築":"建てる"}<span>${fmt(c)}</span></button></article>`
  }).join("");
  $("microbes").innerHTML=buildings.slice(0,4).map(b=>`<div class="microbe ${state.levels[b.id]>0?"unlocked":""}"><i>${state.levels[b.id]>0?b.icon:"?"}</i><strong>${state.levels[b.id]>0?b.microbe:"未発見"}</strong></div>`).join("");
}

function ferment(e){
  const gain=tapPower();state.power+=gain;state.total+=gain;makeBubbles(e?.clientX);tone(420,.035);render();
}
function buy(id){const b=buildings.find(x=>x.id===id),c=cost(b);if(!b||!unlockable(b)||state.power<c)return;const before=townLevel();state.power-=c;state.levels[id]++;state.total+=Math.floor(c*.12);tone(240,.08);setTimeout(()=>tone(360,.12),80);render();if(townLevel()>before)levelUp();save()}
function levelUp(){const level=townLevel();$("levelToastText").textContent=milestones[level].name;$("levelToast").classList.add("show");setTimeout(()=>$("levelToast").classList.remove("show"),1900)}
function makeBubbles(){for(let i=0;i<4;i++){const b=document.createElement("i");b.className="bubble";const size=5+Math.random()*13;b.style.cssText=`left:${15+Math.random()*70}%;width:${size}px;height:${size}px;animation-delay:${Math.random()*.15}s`;$("bubbles").appendChild(b);setTimeout(()=>b.remove(),1200)}}
let audioCtx;function tone(freq,dur){if(!state.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch(_){}}

$("fermentBtn").addEventListener("click",ferment);
$("shops").addEventListener("click",e=>{const id=e.target.closest("[data-buy]")?.dataset.buy;if(id)buy(id)});
$("collectBtn").addEventListener("click",()=>{state.power+=offlinePending;state.total+=offlinePending;offlinePending=0;$("offlineModal").hidden=true;render();save()});
$("soundBtn").addEventListener("click",()=>{state.sound=!state.sound;$("soundBtn").textContent=`音 ${state.sound?"ON":"OFF"}`;if(state.sound)tone(440,.08);save()});
load();render();$("soundBtn").textContent=`音 ${state.sound?"ON":"OFF"}`;
let last=performance.now();setInterval(()=>{const now=performance.now(),delta=(now-last)/1000,last=now,gain=rate()*delta;state.power+=gain;state.total+=gain;render()},500);
setInterval(save,5000);document.addEventListener("visibilitychange",()=>{if(document.hidden)save()});window.addEventListener("beforeunload",save);
