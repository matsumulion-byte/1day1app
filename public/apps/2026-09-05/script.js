(() => {
  'use strict';
  const ingredients = {
    patty:{name:'ビーフパティ',short:'パティ',emoji:'🥩',cost:170,pop:20,volume:25,junk:20,veg:0},
    cheese:{name:'チーズ',short:'チーズ',emoji:'🧀',cost:65,pop:14,volume:7,junk:13,veg:0},
    bacon:{name:'ベーコン',short:'ベーコン',emoji:'🥓',cost:95,pop:13,volume:11,junk:18,veg:0},
    lettuce:{name:'レタス',short:'レタス',emoji:'🥬',cost:35,pop:5,volume:8,junk:-3,veg:18},
    tomato:{name:'トマト',short:'トマト',emoji:'🍅',cost:45,pop:7,volume:7,junk:-2,veg:16},
    onion:{name:'オニオン',short:'オニオン',emoji:'🧅',cost:25,pop:4,volume:4,junk:0,veg:11},
    pickle:{name:'ピクルス',short:'ピクルス',emoji:'🥒',cost:20,pop:3,volume:3,junk:1,veg:9},
    egg:{name:'目玉焼き',short:'エッグ',emoji:'🍳',cost:75,pop:12,volume:12,junk:8,veg:0}
  };
  const baseCost = 110;
  let layers = [], price = 800, soundOn = true, audio, saleTimer;
  let final = {visitors:0,sold:0,sales:0,cost:0,profit:0};
  const $ = id => document.getElementById(id);
  const bgm = $('bgm');
  bgm.volume = .22;
  const yen = n => `¥${Math.round(n).toLocaleString('ja-JP')}`;
  const screens = ['buildScreen','priceScreen','saleScreen','resultScreen'];
  function show(id){ screens.forEach(s => $(s).classList.toggle('active',s===id)); scrollTo(0,0); }
  function currentCost(){ return baseCost + layers.reduce((sum,k)=>sum+ingredients[k].cost,0); }
  function tone(freq=440,dur=.08,type='square',vol=.035,delay=0){
    if(!soundOn)return; try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume(); const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+dur);}catch(e){}
  }
  function sound(kind){ if(kind==='add'){tone(520,.06);tone(760,.08,'square',.025,.05)} if(kind==='price')tone(330,.05); if(kind==='start'){tone(330,.1);tone(440,.1,'square',.04,.1);tone(660,.2,'square',.04,.2)} if(kind==='buy'){tone(820,.04,'sine',.04);tone(1100,.07,'sine',.03,.04)} if(kind==='end'){tone(523,.15);tone(659,.15,'square',.035,.14);tone(784,.3,'square',.035,.28)} }
  function startBgm(){ if(soundOn && bgm.paused) bgm.play().catch(()=>{}); }
  function nameBurger(){
    const c = key => layers.filter(x=>x===key).length, meats=c('patty')+c('bacon');
    if(layers.length===8 && new Set(layers).size>=7)return 'ぜんぶのせ社長バーガー';
    if(c('patty')>=3)return 'トリプルミートタワー';
    if(c('patty')===2 && c('cheese')>=2)return 'ダブルチーズバーガー';
    if(c('bacon') && c('egg'))return 'ベーコンエッグバーガー';
    if(c('cheese')>=3)return 'チーズ洪水バーガー';
    if(meats>=4)return '肉の要塞バーガー';
    if(layers.filter(x=>ingredients[x].veg>0).length>=4)return '野菜もりもりバーガー';
    if(c('egg')>=2)return '月見まみれバーガー';
    const top=[...layers].sort((a,b)=>ingredients[b].pop-ingredients[a].pop)[0];
    return top ? `${ingredients[top].short}${layers.length>=5?'デラックス':'バーガー'}` : 'はじめてバーガー';
  }
  function burgerHTML(){ return `<div class="layer bun-bottom"></div>${layers.map(k=>`<div class="layer ${k}" title="${ingredients[k].name}"></div>`).join('')}<div class="layer bun-top"></div>`; }
  function render(){
    $('buildBurger').innerHTML=burgerHTML(); $('currentCost').textContent=yen(currentCost()); $('layerCount').textContent=`${layers.length} / 8`; $('burgerName').textContent=nameBurger(); $('toPricing').disabled=!layers.length;
    $('addedChips').innerHTML=layers.length?layers.map((k,i)=>`<button class="chip" data-remove="${i}" aria-label="${ingredients[k].name}を削除">${ingredients[k].short}</button>`).join(''):'<small>まだ具材がありません</small>';
    document.querySelectorAll('.ingredient-btn').forEach(b=>b.disabled=layers.length>=8);
  }
  $('ingredientList').innerHTML=Object.entries(ingredients).map(([k,v])=>`<button class="ingredient-btn" data-key="${k}"><span class="emoji">${v.emoji}</span><b>${v.short}</b><small>+${yen(v.cost)}</small></button>`).join('');
  $('ingredientList').addEventListener('click',e=>{const b=e.target.closest('[data-key]');if(!b||layers.length>=8)return;layers.push(b.dataset.key);sound('add');render();});
  $('addedChips').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;layers.splice(+b.dataset.remove,1);tone(210,.08);render();});
  function updatePrice(){const gp=price-currentCost(),rate=gp/price*100;$('salePrice').textContent=yen(price);$('grossProfit').textContent=yen(gp);$('marginRate').textContent=`${rate.toFixed(1)}%`; $('priceAdvice').textContent=price<currentCost()?'⚠ 売れるほど赤字です！':rate<25?'お得感◎ 薄利多売で勝負！':rate>72?'強気価格。魅力が試されます…':'いい塩梅かもしれません';}
  $('toPricing').onclick=()=>{ $('priceBurger').innerHTML=burgerHTML();$('priceBurgerName').textContent=nameBurger();$('priceCost').textContent=yen(currentCost());price=Math.max(300,Math.round((currentCost()*1.9)/100)*100);updatePrice();tone(620,.1);show('priceScreen'); };
  $('priceDown').onclick=()=>{price=Math.max(300,price-100);sound('price');updatePrice()}; $('priceUp').onclick=()=>{price=Math.min(3000,price+100);sound('price');updatePrice()}; $('backBuild').onclick=()=>show('buildScreen');
  function demandScore(){
    const vals=layers.map(k=>ingredients[k]),pop=vals.reduce((s,v)=>s+v.pop,0),volume=vals.reduce((s,v)=>s+v.volume,0),veg=vals.reduce((s,v)=>s+v.veg,0),junk=vals.reduce((s,v)=>s+v.junk,0), meat=layers.filter(k=>k==='patty'||k==='bacon').length, vegetables=layers.filter(k=>ingredients[k].veg>0).length;
    let score=35+pop*.65-Math.abs(volume-58)*.22;
    score -= Math.max(0,layers.length-6)*5;
    score -= Math.max(0,(price/currentCost())-2.2)*18;
    score -= Math.max(0,(price-900)/100)*2.7;
    score += Math.max(-14,Math.min(18,(850-price)/22));
    if(meat===0)score-=9;if(vegetables===0&&junk>35)score-=7;if(vegetables>=4&&meat===0)score-=5;
    return Math.max(5,Math.min(88,score));
  }
  const buyLines=['うまそう！','これ食べたい','この値段ならアリ','肉すご','今日これにする！','野菜も入ってていいね'];
  const noLines=['ちょっと高いな……','さすがに高すぎる','また今度かな','チーズ多くない？','今日はやめとこ','ボリュームすご…'];
  function simulate(){
    show('saleScreen');sound('start');$('counterBurger').innerHTML=burgerHTML();$('counterPrice').textContent=yen(price);$('sellingName').textContent=nameBurger();
    const score=demandScore(), totalTicks=60, potential=Math.round(115+Math.random()*45), targetSold=Math.max(1,Math.round(potential*(score/100)*(.88+Math.random()*.24)));
    final={visitors:0,sold:0,sales:0,cost:0,profit:0}; let tick=0, soldTarget=targetSold;
    clearInterval(saleTimer);saleTimer=setInterval(()=>{tick++;const remain=totalTicks-tick+1;let arrivals=Math.max(0,Math.round(potential/totalTicks+(Math.random()-.48)*2));if(tick===totalTicks)arrivals=potential-final.visitors;final.visitors+=arrivals;let buys=Math.min(arrivals,Math.max(0,Math.round(soldTarget/remain+(Math.random()-.5)*1.5)));if(tick===totalTicks)buys=soldTarget; soldTarget-=buys;final.sold+=buys;final.sales=final.sold*price;
      const minutes=Math.round(tick/totalTicks*600),h=11+Math.floor(minutes/60),m=minutes%60;$('clock').textContent=`${String(Math.min(h,21)).padStart(2,'0')}:${String(h>=21?0:m).padStart(2,'0')}`;$('liveVisitors').innerHTML=`${final.visitors}<small>人</small>`;$('liveSold').innerHTML=`${final.sold}<small>個</small>`;$('liveSales').textContent=yen(final.sales);$('dayProgress').style.width=`${tick/totalTicks*100}%`;
      if(tick%4===0){const bought=buys>0||Math.random()<score/100;$('customer').className=`customer show ${bought?'buy':''}`;$('bubble').textContent=(bought?buyLines:noLines)[Math.floor(Math.random()*(bought?buyLines:noLines).length)];$('bubble').classList.toggle('show',Math.random()<.78);if(bought)sound('buy');setTimeout(()=>$('customer').className='customer',430)}
      if(tick>=totalTicks){clearInterval(saleTimer);final.cost=final.sold*currentCost();final.profit=final.sales-final.cost;setTimeout(showResults,700)}
    },200);
  }
  $('startSale').onclick=simulate;
  function showResults(){show('resultScreen');sound('end');$('resultBurger').innerHTML=burgerHTML();$('resultName').textContent=nameBurger();$('resultSold').textContent=`${final.sold}個`;$('reportSales').textContent=yen(final.sales);$('resultCost').textContent=yen(final.cost);$('resultProfit').textContent=yen(final.profit);const margin=final.sales?final.profit/final.sales*100:0;$('resultMargin').textContent=`${margin.toFixed(1)}%`;let comment;if(final.sold<18)comment='ほとんど売れず…。価格かレシピを見直そう。';else if(final.profit<0)comment='売れたけど赤字！原価より高く売ろう。';else if(margin<20)comment='大人気だけど薄利です。少し値上げできるかも。';else if(final.profit>55000&&final.sold>55)comment='大繁盛！看板商品になりそうです！';else if(price/currentCost()>2.8)comment='利益は出ましたが、値段が少し高かったようです。';else if(currentCost()>650)comment='豪華で人気！でも原価をかけすぎたかも。';else comment='まずまずの売れ行き。次は最高益を狙おう！';$('resultComment').textContent=comment;
    const dur=900,start=performance.now();function count(now){const p=Math.min(1,(now-start)/dur),ease=1-Math.pow(1-p,3);$('resultSales').textContent=yen(final.sales*ease);if(p<1){tone(650+p*300,.02,'sine',.008);requestAnimationFrame(count)}}requestAnimationFrame(count);
  }
  $('replay').onclick=()=>{layers=[];price=800;render();show('buildScreen');};$('soundButton').onclick=()=>{soundOn=!soundOn;$('soundButton').classList.toggle('off',!soundOn);$('soundButton').setAttribute('aria-pressed',String(soundOn));if(soundOn){tone(660,.08);startBgm()}else{bgm.pause()}};
  document.addEventListener('click',startBgm);
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('contextmenu',e=>{if(e.target.closest('button,.game'))e.preventDefault()});render();
})();
