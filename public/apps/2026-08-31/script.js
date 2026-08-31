(() => {
  "use strict";

  const TARGET = 12;
  const people = ["おとうさん", "おかあさん", "おにいちゃん", "いもうと", "ともだちのゆうたくん", "ともだちのみさきちゃん", "かぞくみんな", "おじいちゃん"];
  const events = [
    ["海へ行った","うみ","うみにいきました。","おおきななみがきて、たのしかったです。"],
    ["プールへ行った","プール","プールにいきました。","みずがつめたくて、きもちよかったです。"],
    ["花火を見た","花火","はなびをみにいきました。","そらにおおきくひらいて、きれいでした。"],
    ["花火をした","花火","にわではなびをしました。","せんこうはなびがながくつづきました。"],
    ["夏祭りへ行った","祭り","なつまつりにいきました。","やきそばのにおいがしました。"],
    ["スイカを食べた","スイカ","すいかをたべました。","たねをとおくまでとばしました。"],
    ["かき氷を食べた","かき氷","かきごおりをたべました。","したがあおくなりました。"],
    ["虫取りをした","虫","むしとりをしました。","あみをなんかいもふりました。"],
    ["カブトムシを捕まえた","虫","かぶとむしをつかまえました。","つのがつよそうでした。"],
    ["セミを捕まえた","虫","せみをつかまえました。","おおきなこえでないていました。"],
    ["おばあちゃんの家へ行った","家","おばあちゃんのいえにいきました。","おかしをたくさんもらいました。"],
    ["おじいちゃんと将棋をした","家","おじいちゃんとしょうぎをしました。","こんどはかちたいです。"],
    ["家族で旅行した","旅行","かぞくでりょこうにいきました。","しらないまちをあるきました。"],
    ["キャンプをした","キャンプ","キャンプをしました。","よるのほしがいっぱいでした。"],
    ["バーベキューをした","キャンプ","ばーべきゅーをしました。","おにくをたくさんたべました。"],
    ["川遊びをした","川","かわであそびました。","いしがつるつるしていました。"],
    ["水族館へ行った","水族館","すいぞくかんにいきました。","おおきなさかながこっちをみました。"],
    ["動物園へ行った","動物園","どうぶつえんにいきました。","きりんのくびがながかったです。"],
    ["映画を見た","映画","えいがをみにいきました。","さいごがかんどうしました。"],
    ["ラジオ体操へ行った","体操","あさのらじおたいそうにいきました。","ねむかったけどがんばりました。"],
    ["友達と遊んだ","公園","ともだちとこうえんであそびました。","おにごっこでいっぱいはしりました。"],
    ["サッカーをした","公園","さっかーをしました。","しゅーとがいっかいはいりました。"],
    ["野球をした","公園","やきゅうをしました。","ぼーるをとおくにうてました。"],
    ["そうめんを食べた","そうめん","そうめんをたべました。","つめたくておいしかったです。"],
    ["ひまわりを見た","ひまわり","おおきなひまわりをみました。","ぼくよりせがたかかったです。"],
    ["宿題をした","宿題","なつやすみのしゅくだいをしました。","はやめにやってよかったです。"],
    ["昼寝をした","家","ひるねをしました。","おきたらゆうがたでした。"],
    ["一日中ゲームをした","ゲーム","いちにちじゅうげーむをしました。","とてもつよくなりました。"],
    ["何もしなかった","何もない","きょうはなにもしませんでした。","なにもしないのもたのしかったです。"],
    ["家でテレビを見た","テレビ","いえでてれびをみました。","おもしろくてわらいました。"],
    ["図書館へ行った","本","としょかんにいきました。","ほんをさんさつかりました。"],
    ["アイスを食べた","アイス","あいすをたべました。","すぐにとけてしまいました。"],
    ["朝顔に水をあげた","あさがお","あさがおにみずをあげました。","むらさきのはながさいていました。"],
    ["自由研究をした","研究","じゆうけんきゅうをしました。","じしゃくのことをしらべました。"],
    ["盆踊りをした","祭り","ぼんおどりをしました。","みんなでおなじおどりをしました。"],
    ["流しそうめんをした","そうめん","ながしそうめんをしました。","なかなかとれませんでした。"]
  ].map(([name,art,action,feeling]) => ({name,art,action,feeling}));
  const weathers = ["はれ","はれ","くもり","はれ","あめ"];
  const state = { entries: [], usedDays: new Set(), suspicious: 0, reasons: [], busy: false, chain: null };
  const $ = id => document.getElementById(id);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const opening = $("opening"), diaryScreen = $("diaryScreen"), resultScreen = $("resultScreen");
  const canvas = $("drawing"), ctx = canvas.getContext("2d");

  function dayPick() { let d; do d = 21 + Math.floor(Math.random() * 41); while (state.usedDays.has(d)); state.usedDays.add(d); return d <= 31 ? {m:7,d} : {m:8,d:d-31}; }
  function addReason(text, points) { state.suspicious += points; if (!state.reasons.includes(text)) state.reasons.push(text); }
  function createEntry() {
    const date = dayPick();
    let event = pick(events), weather = pick(weathers), who = pick(people), odd = false;
    // About one in four pages joins a deliberately dubious pattern.
    if (state.chain && state.chain.left > 0) { event = state.chain.event; state.chain.left--; odd = true; addReason(`${event.name}が何日も続いている`, 8); }
    else if (Math.random() < .16 && state.entries.length > 0) { const prev = state.entries[state.entries.length-1]; event = events.find(e => e.name === prev.event.name) || event; state.chain = {event,left:1 + Math.floor(Math.random()*2)}; odd = true; addReason(`${event.name}が何日も続いている`, 7); }
    let feeling = event.feeling;
    if (Math.random() < .07) { feeling = "ことしいちばんたのしかったです。"; odd = true; addReason("「今年いちばん」が何回もある", 8); }
    if ((weather === "あめ" && Math.random() < .25) || Math.random() < .035) { feeling = "とてもいいてんきで、うれしかったです。"; weather = "あめ"; odd = true; addReason("雨なのに、とてもいい天気", 13); }
    if (Math.random() < .045) { weather = "たいふう"; event = events.find(e => e.name === "虫取りをした"); feeling = "かぜがつよくて、むしもとんでいきました。"; odd = true; addReason("台風の日に虫取り", 17); }
    let action = event.action;
    if (event.name === "おばあちゃんの家へ行った" && state.entries.some(e => e.event.name === event.name)) { action = pick(["ちがうおばあちゃんのいえにいきました。","またおばあちゃんのいえにいきました。"]); odd = true; addReason("おばあちゃんの家が多すぎる", 9); }
    if (Math.random() < .035) { const extras = [pick(events),pick(events),pick(events)]; action = `${event.action.slice(0,-1)}て、${extras[0].action.slice(0,-1)}て、${extras[1].action}`; odd = true; addReason("一日の予定が多すぎる", 18); }
    const weekday = ["日","月","火","水","木","金","土"][new Date(2026,date.m-1,date.d).getDay()];
    const intro = event.name === "何もしなかった" ? "" : `きょうは${who}と\n`;
    return {date,event,weather,who,odd,text:`${intro}${action}\n${feeling}`,weekday};
  }

  function crayon(color, width=8) { ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap="round"; ctx.lineJoin="round"; }
  function line(points,color="#33434a",width=7) { crayon(color,width); ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke(); }
  function circle(x,y,r,color,fill=false) { crayon(color,6); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); fill?ctx.fill():ctx.stroke(); }
  function person(x,y,color="#d94f45") { circle(x,y,25,"#735442"); line([[x,y+27],[x+3,y+105]],color,13); line([[x+2,y+50],[x-35,y+75]],color,10); line([[x+2,y+53],[x+40,y+67]],color,10); line([[x+3,y+104],[x-28,y+150]],"#384d78",11); line([[x+3,y+104],[x+35,y+146]],"#384d78",11); }
  function sky(weather){ctx.fillStyle=weather==="たいふう"?"#78828b":weather==="あめ"?"#a8c3cf":"#b9e0ef";ctx.fillRect(0,0,680,430);if(weather==="はれ") {circle(570,70,45,"#f1c832",true); for(let a=0;a<8;a++){const x=Math.cos(a*Math.PI/4),y=Math.sin(a*Math.PI/4);line([[570+x*58,70+y*58],[570+x*82,70+y*82]],"#e6ae2d",7)}} if(weather==="あめ"||weather==="たいふう")for(let i=0;i<28;i++){const x=(i*73)%680,y=(i*47)%260;line([[x,y],[x-8,y+25]],"#4b83a8",4)}}
  function draw(entry) {
    ctx.clearRect(0,0,680,430); sky(entry.weather); const a=entry.event.art;
    if(a==="花火"||a==="祭り"){ctx.fillStyle="#263348";ctx.fillRect(0,0,680,430);for(let n=0;n<4;n++){const x=110+n*150,y=80+(n%2)*70,col=["#f46a55","#f4d34f","#69c6df","#ea72a8"][n];for(let k=0;k<10;k++){const q=k*Math.PI/5;line([[x+Math.cos(q)*15,y+Math.sin(q)*15],[x+Math.cos(q)*70,y+Math.sin(q)*70]],col,6)}}person(330,260)}
    else if(a==="うみ"||a==="プール"||a==="川"){ctx.fillStyle=a==="プール"?"#55b8dc":"#2d9dcc";ctx.fillRect(0,235,680,195);for(let y=255;y<420;y+=48)line([[0,y],[80,y-12],[160,y+5],[250,y-10],[340,y+6],[450,y-8],[560,y+5],[680,y-10]],"#d9f3f7",6);person(240,135)}
    else if(a==="家"||a==="旅行"){ctx.fillStyle="#79af5c";ctx.fillRect(0,320,680,110);ctx.fillStyle="#f0d493";ctx.fillRect(250,145,240,180);line([[220,155],[370,45],[520,155]],"#a95d48",20);ctx.fillStyle="#885936";ctx.fillRect(345,235,55,90);person(145,210);person(560,210,"#6655a6")}
    else if(a==="虫"){ctx.fillStyle="#72a954";ctx.fillRect(0,315,680,115);line([[500,320],[510,95]],"#754d2d",38);ctx.fillStyle="#4f8b42";ctx.beginPath();ctx.arc(510,90,105,0,Math.PI*2);ctx.fill();person(190,210);circle(300,145,65,"#777",false);line([[255,190],[220,250]],"#777",9);circle(535,130,14,"#222",true)}
    else if(a==="スイカ"||a==="そうめん"||a==="かき氷"||a==="アイス"){ctx.fillStyle="#efcf75";ctx.fillRect(0,315,680,115);person(115,175);if(a==="スイカ"){circle(420,230,105,"#3d904b",true);ctx.fillStyle="#e84d55";ctx.beginPath();ctx.arc(420,230,88,Math.PI,0);ctx.fill()}else{ctx.fillStyle="#eee8da";ctx.fillRect(330,210,190,85);line([[320,205],[530,205]],"#8a614b",9);for(let i=0;i<6;i++)line([[355+i*25,195],[370+i*22,265]],a==="かき氷"?"#ec6b79":"#e5dfc5",5)}}
    else if(a==="ひまわり"||a==="あさがお"){ctx.fillStyle="#6ba553";ctx.fillRect(0,335,680,95);for(let x=110;x<650;x+=130){line([[x,350],[x,170]],"#478842",12);circle(x,145,45,a==="ひまわり"?"#ecc536":"#805bb4",true);circle(x,145,18,"#6b4a2c",true)}person(45,200)}
    else{ctx.fillStyle="#d5bf91";ctx.fillRect(0,330,680,100);person(140,190);ctx.fillStyle="#f9f2dc";ctx.fillRect(300,190,260,145);line([[300,190],[560,190],[560,335]],"#846c54",10);ctx.font="bold 42px sans-serif";ctx.fillStyle="#637487";ctx.fillText(a==="何もない"?"・・・":a,350,275)}
    // Slightly imperfect pencil border makes every drawing feel hand-made.
    line([[4,5],[676,2],[678,426],[3,429],[4,5]],"#92785e",3);
  }
  function renderEntry(entry) {
    $("diary").classList.remove("turning"); void $("diary").offsetWidth; $("diary").classList.add("turning");
    $("emptyPicture").hidden=true; $("date").textContent=`${entry.date.m}月${entry.date.d}日`; $("date").nextElementSibling.textContent=`（${entry.weekday}）`; $("weather").textContent=entry.weather;
    $("diaryText").textContent=""; draw(entry); const chars=[...entry.text]; let i=0; const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const write=()=>{ if(i<chars.length){$("diaryText").textContent+=chars[i++]; setTimeout(write,reduced?0:18)} else {state.busy=false; updateControls();} }; write();
  }
  function updateControls(){const n=state.entries.length;$("progressValue").textContent=`${n} / ${TARGET}日`;$("progressBar").style.width=`${n/TARGET*100}%`;$("forgeButton").disabled=state.busy;$("forgeButton").innerHTML=n?"次の日も捏造する <span>✎</span>":"この日を捏造する <span>✎</span>";$("pagesButton").hidden=!n;if(n>=TARGET){$("forgeButton").hidden=true;$("submitButton").hidden=false;$("pencilStatus").textContent="12日分、できた。あとは先生が信じるかどうか。"}else if(n){$("pencilStatus").textContent=state.entries[n-1].odd?"……ちょっと怪しいけど、時間がない。":"よし。これは本当にありそう。"}}
  function forge(){if(state.busy||state.entries.length>=TARGET)return;state.busy=true;const e=createEntry();state.entries.push(e);renderEntry(e);updateControls()}
  function grade(){ diaryScreen.hidden=true;resultScreen.hidden=false;$("grading").hidden=false;$("resultCard").hidden=true; window.scrollTo(0,0); setTimeout(()=>{$("gradingDots").textContent="…………ん？"},1200);setTimeout(showResult,2600)}
  function showResult(){let score=Math.min(100,Math.round(8+state.suspicious+Math.random()*13));const repeats={};state.entries.forEach(e=>repeats[e.event.name]=(repeats[e.event.name]||0)+1);const max=Object.entries(repeats).sort((a,b)=>b[1]-a[1])[0];if(max[1]>=4){score=Math.min(100,score+16);addReason(`${max[0]}が${max[1]}回ある`,0)}const tiers=score<=20?["完璧な夏休み","大変よくできました","楽しい夏休みだったんですね。"]:score<=50?["ちょっと怪しい","再確認","ずいぶん同じことが好きなんですね。"]:score<=80?["先生は気づいている","要確認","あとで少しお話しましょう。"]:["捏造発覚","書き直し","8月31日に全部書きましたね？"];$("grading").hidden=true;$("resultCard").hidden=false;$("resultLabel").textContent=tiers[0];$("resultStamp").textContent=tiers[1];$("teacherComment").textContent=`「${tiers[2]}」`;$("scoreValue").innerHTML=`${score}<small>%</small>`;$("evidenceText").textContent=state.reasons.length?state.reasons.slice(0,2).join("／"):"日付の筆圧が全部おなじ";state.finalScore=score;state.finalLabel=tiers[0]}
  function showPages(){$("pagesList").innerHTML=state.entries.map(e=>`<li><b>${e.date.m}月${e.date.d}日 ${e.weather}</b><br>${e.event.name}　― ${e.who}と</li>`).join("");$("pagesDialog").showModal()}
  async function share(){const text=`夏休みの絵日記を12日分捏造しました。\n結果は「${state.finalLabel}」\n捏造度：${state.finalScore}%\n#夏休みの絵日記捏造メーカー #1日1アプリ`;if(navigator.share){try{await navigator.share({title:"夏休みの絵日記捏造メーカー",text,url:location.href})}catch{}}else{await navigator.clipboard.writeText(`${text}\n${location.href}`);$("shareButton").textContent="結果をコピーしました！"}}
  $("startButton").addEventListener("click",()=>{opening.hidden=true;diaryScreen.hidden=false;window.scrollTo(0,0)});$("forgeButton").addEventListener("click",forge);$("submitButton").addEventListener("click",grade);$("pagesButton").addEventListener("click",showPages);$("closePages").addEventListener("click",()=>$("pagesDialog").close());$("shareButton").addEventListener("click",share);$("retryButton").addEventListener("click",()=>location.reload());
})();
