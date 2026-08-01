(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const regionBase={
 oizumi:{name:"大泉",support:54,turnout:48,weight:13,note:"独立には前向き。ただし行政サービスと交通の改善を求めている。"},
 shakuji:{name:"石神井",support:58,turnout:52,weight:16,note:"独立支持は強いが、独立後の財政計画には厳しい。"},
 nerima:{name:"練馬",support:63,turnout:44,weight:22,note:"独立派の本拠地。ただし『どうせ勝つ』と投票意欲が低い。"},
 akatsuka:{name:"赤塚",support:42,turnout:55,weight:13,note:"農業政策が最大の争点。大根だけでは動かない。"},
 shimura:{name:"志村",support:37,turnout:58,weight:16,note:"税収減と板橋の弱体化を警戒している。"},
 itabashi:{name:"板橋",support:32,turnout:61,weight:20,note:"独立への関心は薄いが、運動の強引さには敏感。"}
};
const actionPool=[
 {id:"rally",tag:"支持・投票率",title:"区民大会を開く",text:"重点地域で独立の必要性を訴える。",cost:12,trust:2,debt:0,icon:"集",effect:(r)=>{r.support+=4;r.turnout+=7}},
 {id:"door",tag:"信頼・投票率",title:"一軒ずつ訪ねる",text:"地味だが確実。反対派とも話をする。",cost:9,trust:5,debt:0,icon:"戸",effect:(r)=>{r.support+=2;r.turnout+=5}},
 {id:"radio",tag:"全域・支持",title:"ラジオ演説",text:"『行政を、もっと近くに』と全区へ訴える。",cost:18,trust:1,debt:0,icon:"放",all:true,effect:(r)=>{r.support+=1.8}},
 {id:"poll",tag:"情報",title:"世論調査を行う",text:"地域の支持率と投票率を正確に把握する。",cost:14,trust:0,debt:0,icon:"調",poll:true,effect:()=>{}},
 {id:"tax",tag:"強力・公約負債",title:"減税を約束する",text:"『独立すれば税金は下がる』。根拠は薄い。",cost:6,trust:-7,debt:18,icon:"税",all:true,effect:(r)=>{r.support+=3.4}},
 {id:"daikon",tag:"話題・地域差",title:"練馬大根を配る",text:"演説より大根。買収ではなく記念品です。",cost:16,trust:-1,debt:2,icon:"根",effect:(r,k)=>{r.support+=k==="akatsuka"?6:2;r.turnout+=2}},
 {id:"attack",tag:"危険・反対派",title:"板橋執行部を攻撃",text:"不便な行政の責任を正面から追及する。",cost:4,trust:-6,debt:0,icon:"攻",effect:(r,k)=>{r.support+=k==="itabashi"?-3:5}},
 {id:"hospital",tag:"強力・高負債",title:"区立病院を約束",text:"独立後すぐ、誰もが通える病院を建てる。",cost:8,trust:2,debt:32,icon:"医",all:true,effect:(r)=>{r.support+=4.2}},
 {id:"debate",tag:"信頼・勝負",title:"公開討論に出る",text:"数字で勝負。信頼が高ければ支持が伸びる。",cost:5,trust:4,debt:0,icon:"論",effect:(r,k,s)=>{r.support+=(s.trust>=50?5:-2)}},
 {id:"festival",tag:"投票率・全域",title:"独立音頭を流す",text:"耳に残れば勝ち。朝から晩まで流す。",cost:20,trust:-2,debt:3,icon:"踊",all:true,effect:(r)=>{r.turnout+=4;r.support+=1}}
];
const headlines={
 rally:["独立派、区民大会に結集","会場満員『練馬のことは練馬で』"],door:["独立派、路地へ入る","一万軒を訪問　反対意見にも耳"],radio:["電波に乗る独立論","練馬代表、全板橋区民に訴え"],poll:["情勢調査、なお接戦","一票の行方に両陣営緊張"],tax:["独立で本当に減税か","財源示さぬ公約に疑問の声"],daikon:["街じゅう大根だらけ","独立派『これは記念品』"],attack:["板橋批判、激しさ増す","独立派の強硬姿勢に反発も"],hospital:["練馬に大病院を","独立派が大型公約を発表"],debate:["公開討論、聴衆沸く","数字飛び交う独立論争"],festival:["独立音頭、頭から離れず","商店街で朝から大合唱"]
};
let state,regions,selected=[],focus="nerima",turn=0,known=false,lastDelta=0,lastActions=[];
function cloneRegions(){return Object.fromEntries(Object.entries(regionBase).map(([key,value])=>[key,{...value}]))}
function reset(){regions=cloneRegions();state={trust:60,fund:80,debt:0};selected=[];focus="nerima";turn=0;known=false;lastDelta=0;renderAll();}
function show(id){$$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));scrollTo(0,0)}
function forecast(){let yes=0,total=0;Object.values(regions).forEach(r=>{const voters=r.weight*r.turnout/100;yes+=voters*r.support/100;total+=voters});return yes/total*100}
function noisy(v,k){if(known||k===focus)return v;const n=((k.charCodeAt(0)+turn*7)%7)-3;return Math.max(1,Math.min(99,v+n))}
function renderAll(){
 $('#days').textContent=Math.max(0,30-turn*5);const f=forecast();$('#support').textContent=f.toFixed(1)+'%';$('#support-bar').style.width=f+'%';
 $('#trust').textContent=Math.round(state.trust);$('#trust-bar').style.width=Math.max(0,state.trust)+'%';$('#fund').textContent=Math.max(0,Math.round(state.fund));$('#debt').textContent=state.debt;
 $('#pips').textContent=selected.length===0?'○ ○':selected.length===1?'● ○':'● ●';
 $$('.district').forEach(el=>{const k=el.dataset.region,r=regions[k],v=noisy(r.support,k);el.classList.toggle('selected',k===focus);el.classList.toggle('lean-yes',v>=50);el.classList.toggle('lean-no',v<50);el.querySelector('span').textContent=(known||k===focus)?Math.round(v)+'%':(v>=55?'優勢':v<=40?'劣勢':'接戦')});
 $('#region-note').textContent=`【${regions[focus].name}】${regions[focus].note}`;renderCards();
}
function available(){const offset=(turn*2)%actionPool.length;return Array.from({length:6},(_,i)=>actionPool[(offset+i)%actionPool.length])}
function renderCards(){const cards=$('#cards');cards.innerHTML='';available().forEach(a=>{const b=document.createElement('button');b.className='action-card'+(selected.includes(a.id)?' selected':'');b.innerHTML=`<span class="tag">${a.tag}</span><b>${a.title}</b><p>${a.text}</p><small>−${a.cost}万円</small>`;b.onclick=()=>toggleAction(a.id);cards.appendChild(b)});$('#execute').disabled=selected.length!==2}
function toggleAction(id){if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<2)selected.push(id);renderAll()}
function execute(){
 const before=forecast();lastActions=selected.map(id=>actionPool.find(a=>a.id===id));
 lastActions.forEach(a=>{state.fund-=a.cost;state.trust+=a.trust;state.debt+=a.debt;if(a.all)Object.entries(regions).forEach(([k,r])=>a.effect(r,k,state));else a.effect(regions[focus],focus,state);if(a.poll)known=true});
 state.trust=Math.max(0,Math.min(100,state.trust));Object.values(regions).forEach(r=>{r.support=Math.max(5,Math.min(92,r.support));r.turnout=Math.max(20,Math.min(88,r.turnout))});
 if(state.fund<0){state.trust-=5;Object.values(regions).forEach(r=>r.support-=1);state.fund=0}
 lastDelta=forecast()-before;turn++;selected=[];renderPaper();
}
function renderPaper(){const a=lastActions[Math.abs(turn+Math.round(state.trust))%2],h=headlines[a.id];$('#paper-date').textContent=`投票まで ${Math.max(0,30-turn*5)}日`;$('#headline').textContent=h[0];$('#paper-icon').textContent=a.icon;$('#article').textContent=`${h[1]}。${a.text} 独立派は「これは練馬の将来を決める選択だ」と説明した。一方、慎重派からは費用と実現性を問う声も出ている。`;$('#paper-support').textContent=forecast().toFixed(1)+'%';$('#delta').textContent=(lastDelta>=0?'+':'')+lastDelta.toFixed(1);$('#rumor').textContent=state.trust<35?'街の声「数字よりも、もう何を信じればいいのか分からない」':state.debt>55?'専門家「公約の請求書は、投票後に届く」':'街の声「独立したら、住所を書くのが少し短くなるね」';show('newspaper')}
function startVote(){show('ballot');$('#counting').innerHTML='';$('#live-total').textContent='—';$('#to-aftermath').classList.add('hidden');const entries=Object.entries(regions);let i=0,yes=0,total=0;const next=()=>{if(i>=entries.length){const value=yes/total*100;$('#live-total').textContent=value.toFixed(1)+'%';$('#live-total').dataset.result=value;$('#to-aftermath').classList.remove('hidden');return}const [k,r]=entries[i++],turnout=Math.max(20,Math.min(90,r.turnout+(state.trust-50)*.08)),local=r.support+((i*13+turn)%5-2),votes=r.weight*turnout/100;yes+=votes*local/100;total+=votes;const row=document.createElement('div');row.className='count-row';row.innerHTML=`<span>${r.name}</span><i><b style="width:${local}%"></b></i><strong>${local.toFixed(1)}%</strong>`;$('#counting').appendChild(row);$('#live-total').textContent=(yes/total*100).toFixed(1)+'%';setTimeout(next,430)};next()}
function aftermath(){const vote=parseFloat($('#live-total').dataset.result),win=vote>50,solvency=100-state.debt+(state.trust-50)*.6;let title,text,ep;
 if(!win){title='独立、否決。';text=`賛成${vote.toFixed(1)}%。練馬は板橋区に残ることを選んだ。`;ep=state.trust<35?'激しい運動は深い溝を残した。それでも、翌年また独立を求める会合が開かれた。':'敗れた独立派は議会での合意形成へ転じた。歴史は別の道から動き始める。'}
 else if(solvency<35){title='独立、そして財政難。';text=`賛成${vote.toFixed(1)}%で練馬区は誕生。しかし選挙中の公約が一斉に請求書となった。`;ep='区役所には毎朝、病院と減税と大根を求める長い列ができた。独立は、投票日では終わらない。'}
 else if(state.trust<35){title='勝った。信頼は失った。';text=`賛成${vote.toFixed(1)}%。独立は成立したが、住民の半分は結果を信じていない。`;ep='新しい境界線は地図に引けた。人々の間に引かれた線を消すには、もっと長い時間が必要だった。'}
 else if(vote>60){title='練馬、堂々独立。';text=`賛成${vote.toFixed(1)}%。板橋側も結果を受け入れ、23番目の区が友好的に誕生した。`;ep='初代区長は演説した。「独立とは、離れることではない。自分たちで引き受けることだ」'}
 else{title='51％の新しい区。';text=`わずかな差で独立成立。練馬区は、割れた民意とともに歩き始めた。`;ep='賛成した人も、反対した人も、翌朝から同じ区民になった。最初の仕事は、互いの話を聞くことだった。'}
 $('#result-mark').textContent=win?'練':'板';$('#result-title').textContent=title;$('#result-text').textContent=text;$('#ledger').innerHTML=`<div><small>最終賛成</small><b>${vote.toFixed(1)}%</b></div><div><small>信頼</small><b>${Math.round(state.trust)}</b></div><div><small>公約負債</small><b>${state.debt}億円</b></div>`;$('#epilogue').textContent=ep;show('result')}
$$('.district').forEach(el=>el.onclick=()=>{focus=el.dataset.region;renderAll()});$('#begin').onclick=()=>{reset();show('game')};$('#execute').onclick=execute;$('#continue').onclick=()=>turn>=6?startVote():(renderAll(),show('game'));$('#to-aftermath').onclick=aftermath;$('#again').onclick=()=>{reset();show('intro')};$('#history-open').onclick=()=>{const dialog=$('#history');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')};$('#history-close').onclick=()=>{const dialog=$('#history');if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')};reset();
})();
