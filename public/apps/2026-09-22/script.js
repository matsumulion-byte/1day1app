'use strict';
const parts = ['胸', '背中', '肩', '腕', '脚', '全身', 'PUSH', 'PULL'];
const exercises = {
 chest: ['ベンチプレス','インクラインベンチプレス','ダンベルプレス','インクラインダンベルプレス','チェストプレス','ペックフライ','ケーブルフライ','ディップス'],
 back: ['デッドリフト','ラットプルダウン','懸垂','バーベルロー','ワンハンドダンベルロー','シーテッドロー','Tバーロー','ストレートアームプルダウン'],
 shoulder: ['ショルダープレス','ダンベルショルダープレス','サイドレイズ','リアレイズ','フェイスプル','アップライトロー','ケーブルサイドレイズ'],
 biceps: ['バーベルカール','ダンベルカール','インクラインカール','ハンマーカール','ケーブルカール'],
 triceps: ['トライセプスプレスダウン','フレンチプレス','スカルクラッシャー','オーバーヘッドエクステンション'],
 legs: ['スクワット','レッグプレス','ブルガリアンスクワット','レッグエクステンション','レッグカール','ルーマニアンデッドリフト','ヒップスラスト','カーフレイズ','アダクション','アブダクション']
};
// Rejection sampling keeps all eight sectors (and menu choices) equally likely.
function randomInt(n) { const buffer = new Uint32Array(1); const limit = Math.floor(4294967296/n)*n; do { crypto.getRandomValues(buffer); } while(buffer[0]>=limit); return buffer[0]%n; }
function shuffle(items) { const result=[...items]; for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j],result[i]];}return result; }
const groups = Object.fromEntries(Object.entries(exercises).map(([group,names])=>[group,names.map(name=>({name,group}))]));
// PUSH uses pressing/lateral shoulder work; rear delts and face pulls remain in shoulder days.
const push = [...groups.chest,...groups.shoulder.filter(x=>!['リアレイズ','フェイスプル','アップライトロー'].includes(x.name)),...groups.triceps];
const pull = [...groups.back,...groups.biceps];
function makeMenu(part) {
 let pool, required=[];
 switch(part){
 case '胸':pool=groups.chest;break;case '背中':pool=groups.back;break;case '肩':pool=groups.shoulder;break;case '脚':pool=groups.legs;break;
 case '腕':pool=[...groups.biceps,...groups.triceps];required=[groups.biceps,groups.triceps];break;
 case 'PUSH':pool=push;required=[groups.chest,push.filter(x=>x.group==='shoulder'),groups.triceps];break;
 case 'PULL':pool=pull;required=[groups.back,groups.biceps];break;
 case '全身':pool=[...groups.legs,...push,...pull];required=[groups.legs,push,pull];break;
 }
 const count=3+randomInt(3);const selected=required.map(list=>list[randomInt(list.length)]);
 selected.push(...shuffle(pool.filter(x=>!selected.some(y=>y.name===x.name))).slice(0,count-selected.length));
 return selected.map(x=>({...x,sets:2+randomInt(4)}));
}
const wheel=document.querySelector('#wheel');
const ns='http://www.w3.org/2000/svg';
function point(angle,r=178){const a=angle*Math.PI/180;return [180+Math.sin(a)*r,180-Math.cos(a)*r];}
parts.forEach((name,i)=>{
 const start=point(i*45-22.5),end=point(i*45+22.5);
 const path=document.createElementNS(ns,'path');path.setAttribute('d',`M180 180 L${start} A178 178 0 0 1 ${end} Z`);path.setAttribute('fill',['#d9f58a','#343d2b','#accb69','#29322a','#c9e697','#424c35','#93ad63','#252c24'][i]);path.setAttribute('stroke','#151718');path.setAttribute('stroke-width','2');wheel.append(path);
 const label=document.createElementNS(ns,'text');const [x,y]=point(i*45,125);label.setAttribute('x',x);label.setAttribute('y',y);label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');label.setAttribute('fill',i%2?'#f2f5e9':'#192115');label.setAttribute('font-size',name.length>2?'22':'27');label.setAttribute('font-weight','850');label.textContent=name;wheel.append(label);
});
let spinning=false, rotation=0;
const spinButton=document.querySelector('#spin');
async function spin(){
 if(spinning)return;spinning=true;spinButton.disabled=true;spinButton.firstChild.textContent='抽選中 ';document.querySelector('#spin-caption').textContent='今日の相棒、選んでいます。';
 document.querySelector('#result').hidden=true;document.querySelector('#play').hidden=false;
 const index=randomInt(parts.length);
 // Sector centers begin at 0°, clockwise. The fixed pointer is at 0°.
 const target=(360-index*45)%360;
 const end=rotation+360*6+(target-rotation%360+360)%360;
 const animation=wheel.animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${end}deg)`}],{duration:3600,easing:'cubic-bezier(.12,.75,.12,1)',fill:'forwards'});
 await animation.finished;
 rotation=end%360;wheel.style.transform=`rotate(${rotation}deg)`;animation.cancel();
 const menu=makeMenu(parts[index]);document.querySelector('#result-part').textContent=parts[index];
 document.querySelector('#menu').replaceChildren(...menu.map(item=>{const li=document.createElement('li');const name=document.createElement('span');name.className='name';name.textContent=item.name;const sets=document.createElement('span');sets.className='sets';const number=document.createElement('b');number.textContent=item.sets;sets.append(number,' SET');li.append(name,sets);return li;}));
 document.querySelector('#total').textContent=menu.reduce((sum,x)=>sum+x.sets,0);document.querySelector('#exercise-count').textContent=`${menu.length} EXERCISES`;
 // Leave the exact stopped sector visible before showing its generated workout.
 await new Promise(resolve=>setTimeout(resolve,450));
 document.querySelector('#play').hidden=true;document.querySelector('#result').hidden=false;document.querySelector('#result').focus({preventScroll:true});
 document.querySelector('#announcement').textContent=`今日のトレーニングは${parts[index]}。${menu.length}種目、合計${menu.reduce((s,x)=>s+x.sets,0)}セット。`;
 spinning=false;spinButton.disabled=false;spinButton.firstChild.textContent='回す ';document.querySelector('#spin-caption').textContent='運命の部位を、ひと回し。';
}
spinButton.addEventListener('click',spin);
document.querySelector('#again').addEventListener('click',()=>{if(spinning)return;window.scrollTo(0,0);spin();});
for(const event of ['dblclick','gesturestart','contextmenu','dragstart'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
