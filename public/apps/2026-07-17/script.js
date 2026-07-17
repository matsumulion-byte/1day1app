const QUIZZES = [
  { emoji:"🚢 🧊 💎 💔", answer:"タイタニック", choices:["タイタニック","ポセイドン","パール・ハーバー","海の上のピアニスト"], hint:"豪華客船で芽生えた、身分違いの恋。", fact:"氷山との衝突を背景に描かれた、不朽のラブストーリー。", level:"EASY" },
  { emoji:"🦈 🌊 🚤 😱", answer:"ジョーズ", choices:["ディープ・ブルー","ジョーズ","MEG ザ・モンスター","オープン・ウォーター"], hint:"海水浴場に現れた巨大な影。", fact:"夏の海を恐怖に変えた、スティーヴン・スピルバーグ監督作。", level:"EASY" },
  { emoji:"👦 ⚡ 🪄 🦉", answer:"ハリー・ポッター", choices:["ナルニア国物語","ファンタスティック・ビースト","ハリー・ポッター","パーシー・ジャクソン"], hint:"額に稲妻形の傷を持つ少年。", fact:"魔法学校を舞台にした、世界的人気ファンタジーシリーズ。", level:"EASY" },
  { emoji:"🧙‍♂️ 💍 🌋 👁️", answer:"ロード・オブ・ザ・リング", choices:["ホビット","ロード・オブ・ザ・リング","エラゴン","ウィロー"], hint:"ひとつの指輪を滅ぼす旅。", fact:"中つ国の命運を懸け、仲間たちが火山を目指します。", level:"EASY" },
  { emoji:"👻 🔫 🚫 🗽", answer:"ゴーストバスターズ", choices:["キャスパー","ビートルジュース","ゴーストバスターズ","ゴースト／ニューヨークの幻"], hint:"ニューヨークで幽霊退治を請け負うチーム。", fact:"「幽霊、お断り」のロゴでもおなじみのSFコメディ。", level:"MEDIUM" },
  { emoji:"🦁 👑 🌅 🐗", answer:"ライオン・キング", choices:["ジャングル・ブック","マダガスカル","ライオン・キング","ズートピア"], hint:"若き王子が故郷へ帰る物語。", fact:"サバンナを舞台に、生命の環と王の成長を描きます。", level:"EASY" },
  { emoji:"🤖 🚀 🌱 ❤️", answer:"ウォーリー", choices:["アイアン・ジャイアント","ウォーリー","ロボッツ","ベイマックス"], hint:"地球にひとり残された清掃ロボット。", fact:"小さなロボットの恋と宇宙旅行を描いたピクサー作品。", level:"MEDIUM" },
  { emoji:"🌀 😴 💭 🏙️", answer:"インセプション", choices:["マトリックス","インセプション","シャッター アイランド","TENET テネット"], hint:"夢の中へ入り、アイデアを植え付ける。", fact:"夢が何層にも重なる、クリストファー・ノーラン監督作。", level:"HARD" },
  { emoji:"👽 ☎️ 🚲 🌕", answer:"E.T.", choices:["未知との遭遇","E.T.","スーパー8","宇宙戦争"], hint:"少年と地球外生命体の友情。", fact:"月を背景に自転車が空を飛ぶ場面は映画史に残る名シーン。", level:"MEDIUM" },
  { emoji:"👠 🎃 🕛 🏰", answer:"シンデレラ", choices:["美女と野獣","眠れる森の美女","シンデレラ","魔法にかけられて"], hint:"魔法が解けるのは真夜中。", fact:"ガラスの靴を残した少女を、王子が探します。", level:"EASY" },
  { emoji:"🕶️ 💊 💻 🐇", answer:"マトリックス", choices:["マトリックス","トロン","レディ・プレイヤー1","ブレードランナー"], hint:"赤い薬か、青い薬か。", fact:"現実だと思っていた世界の正体を知るSFアクション。", level:"HARD" },
  { emoji:"🏠 👦 🎄 ✈️", answer:"ホーム・アローン", choices:["グリンチ","ホーム・アローン","ポーラー・エクスプレス","天使にラブ・ソングを…"], hint:"クリスマスに少年が家に取り残される。", fact:"知恵と仕掛けで泥棒を迎え撃つ、ホリデーコメディ。", level:"MEDIUM" }
];

const TOTAL = 10;
const el = document.getElementById("screen");
const state = { screen:"start", questions:[], index:0, score:0, correct:0, streak:0, best:0, selected:null, hint:false, choices:[] };
const shuffle = items => [...items].sort(() => Math.random() - .5);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function start() {
  Object.assign(state,{screen:"quiz",questions:shuffle(QUIZZES).slice(0,TOTAL),index:0,score:0,correct:0,streak:0,best:0,selected:null,hint:false});
  prepareQuestion(); render();
}
function prepareQuestion(){ state.choices = shuffle(state.questions[state.index].choices); }
function choose(choice){
  if(state.selected) return;
  state.selected = choice;
  const q=state.questions[state.index];
  if(choice===q.answer){ state.correct++; state.streak++; state.best=Math.max(state.best,state.streak); state.score+=state.hint?80:100; }
  else state.streak=0;
  render();
}
function next(){
  if(state.index===TOTAL-1){state.screen="result";render();return;}
  state.index++; state.selected=null; state.hint=false; prepareQuestion(); render();
}
function share(){
  const text=`🎬 EMOVIE SCORE\n${state.score} / 1000 POINTS\n🔥 BEST STREAK ×${state.best}\n\n絵文字を読め。映画を当てろ。`;
  if(navigator.share) navigator.share({title:"EMOVIE",text}).catch(()=>{});
  else navigator.clipboard.writeText(text).then(()=>{const b=document.getElementById("shareBtn");if(b)b.textContent="コピーしました！";});
}

function renderStart(){ return `<section class="start-screen"><div class="eyebrow"><span></span> EMOJI MOVIE QUIZ</div><h1>絵文字を読め。<br><em>映画を当てろ。</em></h1><p class="lead">名作映画が、たった4つの絵文字に。<br>あなたはいくつ見抜ける？</p><button class="primary-btn" id="startBtn"><span>PLAY NOW</span><b>▶</b></button><div class="game-meta"><span><b>10</b> QUESTIONS</span><i></i><span><b>4</b> CHOICES</span><i></i><span><b>1</b> MOVIE LOVER</span></div><div class="floating-emoji e1">🍿</div><div class="floating-emoji e2">🎬</div><div class="floating-emoji e3">👽</div><div class="floating-emoji e4">🦈</div></section>`; }
function renderQuiz(){
  const q=state.questions[state.index];
  const buttons=state.choices.map((c,i)=>{const correct=state.selected&&c===q.answer,wrong=state.selected===c&&c!==q.answer;return `<button class="${correct?'correct':''} ${wrong?'wrong':''}" data-choice="${esc(c)}" ${state.selected?'disabled':''}><span>${String.fromCharCode(65+i)}</span><b>${esc(c)}</b><kbd>${i+1}</kbd>${correct?'<strong>✓</strong>':wrong?'<strong>×</strong>':''}</button>`}).join("");
  const feedback=state.selected?`<div class="feedback ${state.selected===q.answer?'yes':'no'}"><div><span>${state.selected===q.answer?'NICE!':'CUT!'}</span><p>${esc(q.fact)}</p></div><button id="nextBtn">${state.index===TOTAL-1?'結果を見る':'NEXT MOVIE'} <b>→</b></button></div>`:"";
  return `<section class="quiz-screen"><div class="quiz-head"><div class="progress-copy"><span>QUESTION</span><strong>${String(state.index+1).padStart(2,'0')}<small> / ${TOTAL}</small></strong></div><div class="progress-track"><span style="width:${(state.index+1)/TOTAL*100}%"></span></div><div class="score"><span>SCORE</span><strong>${String(state.score).padStart(4,'0')}</strong></div></div><div class="quiz-card"><div class="level">● ${q.level}</div><div class="emoji-clue" aria-label="絵文字のヒント">${q.emoji}</div><p>この映画はなに？</p>${!state.selected?`<button class="hint-btn" id="hintBtn">💡 ${state.hint?esc(q.hint):'ヒントを見る'}</button>`:''}</div><div class="choices">${buttons}</div>${feedback}${!state.selected&&state.streak>1?`<div class="streak">🔥 ${state.streak} STREAK</div>`:''}</section>`;
}
function renderResult(){const rank=state.score>=800?"MOVIE MASTER":state.score>=500?"MOVIE FAN":"ROOKIE VIEWER";const copy=state.score>=800?"映画愛、スクリーンからあふれてます。":state.score>=500?"なかなかの映画通。次は満点を狙おう！":"名作はまだまだ待っている。もう一度挑戦！";return `<section class="result-screen"><div class="eyebrow"><span></span> THAT'S A WRAP!</div><div class="trophy">🏆</div><h2>${rank}</h2><p>${copy}</p><div class="result-score"><span>FINAL SCORE</span><strong>${state.score}</strong><small>/ 1000</small></div><div class="result-stats"><div><span>正解率</span><b>${state.correct*10}%</b></div><div><span>BEST STREAK</span><b>🔥 ×${state.best}</b></div></div><div class="result-actions"><button class="primary-btn" id="retryBtn">PLAY AGAIN <b>↻</b></button><button class="share-btn" id="shareBtn">結果をシェア ↗</button></div></section>`;}
function render(){
  el.innerHTML=state.screen==="start"?renderStart():state.screen==="quiz"?renderQuiz():renderResult();
  document.getElementById("startBtn")?.addEventListener("click",start);
  document.getElementById("retryBtn")?.addEventListener("click",start);
  document.getElementById("nextBtn")?.addEventListener("click",next);
  document.getElementById("shareBtn")?.addEventListener("click",share);
  document.getElementById("hintBtn")?.addEventListener("click",()=>{state.hint=!state.hint;render();});
  document.querySelectorAll("[data-choice]").forEach(b=>b.addEventListener("click",()=>choose(b.dataset.choice)));
}
document.getElementById("brandBtn").addEventListener("click",()=>{state.screen="start";render();});
document.addEventListener("keydown",e=>{if(state.screen==="start"&&e.key==="Enter")start();else if(state.screen==="quiz"&&!state.selected&&/^[1-4]$/.test(e.key))choose(state.choices[Number(e.key)-1]);else if(state.screen==="quiz"&&state.selected&&e.key==="Enter")next();});
document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
document.addEventListener("contextmenu",e=>{if(e.target.closest("button"))e.preventDefault();});
render();
