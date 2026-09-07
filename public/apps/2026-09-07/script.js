(() => {
  "use strict";

  const VACUUMS = [
    { id:"used", name:"中古の赤い掃除機", icon:"🧹", price:0, note:"くたびれているが、まだ働く", stats:{power:2,capacity:2,mobility:2,quiet:1,cord:2} },
    { id:"power", name:"パワフル太郎", icon:"🔴", price:3200, note:"爆音と引き換えに何でも吸う", stats:{power:5,capacity:3,mobility:1,quiet:1,cord:3} },
    { id:"slim", name:"すきまスイスイ", icon:"🟡", price:2700, note:"家具の迷路も朝飯前", stats:{power:2,capacity:2,mobility:5,quiet:3,cord:3} },
    { id:"bag", name:"業務用デカバッグ", icon:"🔵", price:4100, note:"大量のゴミをどんどん収納", stats:{power:4,capacity:5,mobility:1,quiet:1,cord:5} },
    { id:"silent", name:"静音しずかちゃん", icon:"🟢", price:3800, note:"会議中でも気づかれない静けさ", stats:{power:3,capacity:2,mobility:3,quiet:5,cord:3} },
    { id:"long", name:"コードなが杉くん", icon:"🟣", price:3500, note:"廊下の果てまでコンセント不要", stats:{power:3,capacity:3,mobility:2,quiet:2,cord:5} }
  ];
  const JOBS = [
    {room:"6畳ワンルーム",dirt:"髪の毛だらけ",size:"6畳",time:"20分",reward:800,need:{power:2,capacity:1,mobility:3,quiet:1,cord:1}, comments:["見違えるほどきれい！","髪の毛一本、逃しません"]},
    {room:"子ども部屋",dirt:"レゴとお菓子のカス",size:"8畳",time:"25分",reward:1200,need:{power:2,capacity:2,mobility:5,quiet:1,cord:2}, comments:["レゴを3個吸いました","床がひさしぶりに見えた！"]},
    {room:"社長室",dirt:"砂と謎の紙吹雪",size:"14畳",time:"18分",reward:3000,need:{power:4,capacity:4,mobility:2,quiet:5,cord:4}, comments:["社長の大事な紙も吸いました","床は光った。社長は青ざめた"]},
    {room:"秋の衣替え部屋",dirt:"綿ぼこりと防虫剤の粒",size:"10畳",time:"30分",reward:1600,need:{power:3,capacity:4,mobility:3,quiet:1,cord:2}, comments:["セーターまで吸うところでした","秋支度も床もばっちり！"]},
    {room:"深夜の図書室",dirt:"本棚のすきまのホコリ",size:"20畳",time:"35分",reward:2400,need:{power:3,capacity:3,mobility:5,quiet:5,cord:4}, comments:["静かすぎて司書も気づかない","しおりを14枚救出しました"]},
    {room:"町内会の集会所",dirt:"せんべいのカスと砂",size:"24畳",time:"30分",reward:2200,need:{power:4,capacity:5,mobility:2,quiet:2,cord:5}, comments:["座布団の下から百円発見！","広い床がつるつるです"]},
    {room:"ペットと暮らす居間",dirt:"抜け毛がふわふわ",size:"12畳",time:"22分",reward:1800,need:{power:5,capacity:4,mobility:3,quiet:4,cord:3}, comments:["猫には嫌われ、床には好かれた","毛玉がもう一匹できました"]},
    {room:"ケーキ屋の厨房",dirt:"小麦粉とカラースプレー",size:"9畳",time:"15分",reward:2000,need:{power:4,capacity:3,mobility:4,quiet:2,cord:2}, comments:["床だけ先に閉店しました","甘い香りまで吸いそうです"]}
  ];
  const PARTS = [
    {id:"turbo",name:"ターボ回転ブラシ",icon:"⚙️",price:1400,note:"全掃除機の吸引力 +1",stat:"power"},
    {id:"hose",name:"びよーんホース",icon:"➰",price:1100,note:"全掃除機のコード長 +1",stat:"cord"},
    {id:"pack",name:"圧縮ゴミパック",icon:"📦",price:1250,note:"全掃除機の容量 +1",stat:"capacity"}
  ];

  const $ = id => document.getElementById(id);
  const screens = [...document.querySelectorAll(".screen")];
  let state = {day:1,money:1000,sales:0,reputation:0,done:0,owned:["used"],parts:[],jobs:[],selectedJob:null,selectedVac:null,sound:true,shop:[]};
  const labels = {power:"吸",capacity:"容",mobility:"小",quiet:"静",cord:"線"};
  const yen = n => `¥${Math.round(n).toLocaleString("ja-JP")}`;

  function show(id){ screens.forEach(s=>s.classList.toggle("active",s.id===id)); window.scrollTo(0,0); }
  function beep(freq=440,duration=.07,type="square"){
    if(!state.sound)return;
    try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);o.onended=()=>c.close();}catch(e){}
  }
  function updateStatus(){
    $("money").textContent=yen(state.money); $("daySales").textContent=yen(state.sales);
    const ranks=["E","D","C","B","A","S"],rankLines=[0,8,18,30,42,54];
    let rankIndex=rankLines.findLastIndex(line=>state.reputation>=line); $("rank").textContent=ranks[rankIndex];
  }
  function sample(arr,n){return [...arr].sort(()=>Math.random()-.5).slice(0,n)}
  function newDay(){
    state.sales=0; state.done=0; state.jobs=sample(JOBS,3); state.selectedJob=null; state.selectedVac=null;
    $("dayLabel").textContent=`DAY ${state.day}`; renderJobs(); updateStatus(); show("jobsScreen");
  }
  function renderJobs(){
    $("jobProgress").textContent=`${state.done} / 3件`;
    $("jobList").innerHTML=state.jobs.map((j,i)=>`<button class="job-card" data-job="${i}"><span class="job-no">CASE 0${state.done+i+1}</span><h2>${j.room}</h2><p class="job-dirt">「${j.dirt}」</p><div class="job-meta"><span>広さ ${j.size}</span><span>制限 ${j.time}</span></div><strong class="job-reward"><small>報酬</small>${yen(j.reward)}</strong></button>`).join("");
    document.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>selectJob(+b.dataset.job));
  }
  function selectJob(i){
    beep(600); state.selectedJob=state.jobs[i]; state.selectedVac=null;
    const j=state.selectedJob; $("selectedJob").innerHTML=`<small>選択中の依頼</small><b>${yen(j.reward)}</b><h2>${j.room}</h2><p>${j.dirt} ／ ${j.size} ／ ${j.time}</p>`;
    renderVacuums(); $("startCleaning").disabled=true; show("selectScreen");
  }
  function effective(v,key){return Math.min(5,v.stats[key]+(state.parts.some(p=>p.stat===key)?1:0))}
  function renderVacuums(){
    $("vacuumList").innerHTML=VACUUMS.filter(v=>state.owned.includes(v.id)).map(v=>`<button class="vacuum-card ${state.selectedVac===v.id?"selected":""}" data-vac="${v.id}"><span class="vac-icon">${v.icon}</span><div class="vac-info"><h3>${v.name}</h3><p>${v.note}</p><div class="stat-row">${Object.keys(v.stats).map(k=>`<span class="stat ${effective(v,k)>=4?"hot":""}">${labels[k]}${effective(v,k)}</span>`).join("")}</div></div><span class="select-dot"></span></button>`).join("");
    document.querySelectorAll("[data-vac]").forEach(b=>b.onclick=()=>{state.selectedVac=b.dataset.vac;beep(720);renderVacuums();$("startCleaning").disabled=false});
  }
  function evaluate(){
    const j=state.selectedJob,v=VACUUMS.find(x=>x.id===state.selectedVac); let total=0,max=0,worst={key:null,gap:-9};
    Object.keys(j.need).forEach(k=>{const need=j.need[k],have=effective(v,k);total+=Math.min(have/need,1.15)*need;max+=need;if(need-have>worst.gap)worst={key:k,gap:need-have}});
    const score=Math.max(38,Math.min(100,Math.round(total/max*91+Math.random()*10-4))); return {score,worst:worst.key,v};
  }
  function beginCleaning(){
    beep(220,.12); show("cleaningScreen"); const {score,worst,v}=evaluate(); $("cleanRoomName").textContent=state.selectedJob.room; $("cleanProgress").style.width="0"; $("cleanBubble").textContent=v.stats.quiet>=4?"スィーー…":"ズゴゴゴ…";
    const floor=$("floor"); floor.innerHTML=""; for(let i=0;i<18;i++){const d=document.createElement("i");d.className="dirt";d.style.left=`${4+Math.random()*90}%`;d.style.top=`${12+Math.random()*74}%`;floor.appendChild(d)}
    let p=0; const timer=setInterval(()=>{p+=4;$("cleanProgress").style.width=`${p}%`;const dirt=[...document.querySelectorAll(".dirt:not(.gone)")];if(dirt.length&&p%8===0)dirt[Math.floor(Math.random()*dirt.length)].classList.add("gone");if(p===40){$("cleaningNote").textContent="机の下に突入中…";beep(170,.05)}if(p===72)$("cleaningNote").textContent="仕上げのひと吸い！";if(p>=100){clearInterval(timer);setTimeout(()=>finishJob(score,worst),400)}},85);
  }
  function finishJob(score,worst){
    const j=state.selectedJob; let ratio=score>=85?1:score>=65?.82:.5,earned=Math.round(j.reward*ratio/10)*10,rep=score>=85?12:score>=65?7:-1;
    state.money+=earned;state.sales+=earned;state.reputation=Math.max(0,state.reputation+rep);state.done++;
    const stamp=score>=85?"大成功":score>=65?"まずまず":"清掃失敗"; $("resultStamp").textContent=stamp;$("resultStamp").className=`result-stamp ${score<85?(score>=65?"ok":"fail"):""}`;
    $("resultReward").textContent=`+ ${yen(earned)}`;$("resultScore").textContent=`${score}点`;$("resultRep").textContent=`${rep>=0?"+":""}${rep}`;
    const failures={capacity:"途中でゴミパックが満杯！",cord:"コードが届かない！",quiet:"ホコリは取れたが、信頼も失った",mobility:"家具の裏にホコリを残した…",power:"吸引力がぜんぜん足りない！"};
    $("resultComment").textContent=score>=65?j.comments[Math.floor(Math.random()*j.comments.length)]:failures[worst];
    $("resultReason").textContent=score>=85?"掃除機と現場の相性がバッチリ！":score>=65?"もう少し性能があれば満額だった…":failures[worst];
    $("nextJob").innerHTML=state.done>=3?'ショップへ <span>›</span>':'次の依頼へ <span>›</span>';updateStatus();beep(score>=65?820:130,.18);show("resultScreen");
  }
  function openShop(){
    const available=VACUUMS.filter(v=>v.id!=="used"&&!state.owned.includes(v.id));state.shop=[...sample(available,2),sample(PARTS.filter(p=>!state.parts.some(x=>x.id===p.id)),1)[0]].filter(Boolean);
    renderShop();$("shopSales").textContent=yen(state.sales);show("shopScreen");
  }
  function renderShop(){
    $("shopList").innerHTML=state.shop.map((item,i)=>{const isPart=!!item.stat;return `<div class="shop-item"><span class="item-icon">${item.icon}</span><div><h3>${item.name}</h3><p>${item.note}</p>${isPart?'<span class="owned">すべての掃除機に有効</span>':`<div class="stat-row">${Object.keys(item.stats).map(k=>`<span class="stat">${labels[k]}${item.stats[k]}</span>`).join("")}</div>`}</div><button class="buy-btn" data-buy="${i}" ${state.money<item.price?"disabled":""}>${yen(item.price)}</button></div>`}).join("") || '<p>店主「今日はもう売り切れ！」</p>';
    document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buy(+b.dataset.buy));
  }
  function buy(i){const item=state.shop[i];if(!item||state.money<item.price)return;state.money-=item.price;if(item.stat)state.parts.push(item);else state.owned.push(item.id);state.shop.splice(i,1);beep(960,.15);updateStatus();renderShop()}

  $("backToJobs").onclick=()=>{beep(300);show("jobsScreen")}; $("startCleaning").onclick=beginCleaning;
  $("nextJob").onclick=()=>{state.jobs=state.jobs.filter(j=>j!==state.selectedJob);state.done>=3?openShop():(renderJobs(),show("jobsScreen"))};
  $("nextDay").onclick=()=>{state.day++;beep(700,.1);newDay()};
  $("soundButton").onclick=()=>{state.sound=!state.sound;$("soundButton").classList.toggle("off",!state.sound);$("soundButton").setAttribute("aria-pressed",String(state.sound));$("soundButton").innerHTML=`${state.sound?"♪":"×"}<small>${state.sound?"ON":"OFF"}</small>`;if(state.sound)beep(660)};
  let lastTap={time:0,x:-100,y:-100};
  document.addEventListener("click",e=>{const now=Date.now(),near=Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<32;if(now-lastTap.time<360&&near){e.preventDefault();e.stopImmediatePropagation();return}lastTap={time:now,x:e.clientX,y:e.clientY}},true);
  document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});document.addEventListener("contextmenu",e=>e.preventDefault());document.addEventListener("dragstart",e=>e.preventDefault());
  newDay();
})();
