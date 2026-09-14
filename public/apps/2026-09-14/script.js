'use strict';
// Add/edit inscriptions here. Keep answers in kana; aliases accept common modern spellings.
const QUESTIONS = [
 { title:'はじまりの石板', description:'文明の入口に、たった四文字が残されていた。', answer:'まつむら', starter:'まら', translation:'松村', aliases:['松村','matsumura'], clues:['これは、この文明を築いた人物の名前らしい。','文字は左から右へ読む。1つの記号が、かな1文字に対応する。'], aside:'どうやら、表札だった。' },
 { title:'名乗りの石板', description:'見覚えのある四文字。その先に、新しい記号が続く。', answer:'まつむらです', starter:'', translation:'松村です', aliases:['松村です'], clues:['最初の四文字は、さっきの石板と同じだ。','名乗るときの、少し丁寧な言い方らしい。'], aside:'文明は、まず自己紹介から始まった。' },
 { title:'供物の記録', description:'王に捧げた供物か。あるいは、何かの備忘録か。', answer:'ぷりんあります', starter:'ぷ', translation:'プリンあります', aliases:['プリン有ります'], clues:['ぷるぷるした甘い食べ物が登場するらしい。','後半は、何かが存在することを伝えている。'], aside:'供物というより、おやつだった。' },
 { title:'黄昏の予言', description:'太陽が沈む頃の営みが、ここに記されている。', answer:'きょうはかれーです', starter:'きょうはー', translation:'今日はカレーです', aliases:['今日はカレーです','きょうはかれえです','今日はカレー'], clues:['今日の晩ごはんの記録。ごはんにかける、スパイスの香る料理らしい。','料理名は3文字。最後の「ー」は、音を伸ばす記号。残る2文字を調査員と読み解こう。'], aside:'予言ではなく、献立だった。' },
 { title:'古代松村文明 最大の謎', description:'すべての石板は、この碑文へとつながっていた。', answer:'れいぞうこにぷりんあります', starter:'に', translation:'冷蔵庫にプリンあります', aliases:['冷蔵庫にプリンあります','冷蔵庫にぷりんあります','れいぞうこにプリン有ります'], clues:['後半には、第三の石板と同じ記録が刻まれている。','前半は、食べ物を冷やしておく場所についての記述らしい。'], aside:'数千年、守り継がれた伝言。それは、おやつの所在だった。' }
];
const KANA = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっゎゔー0123456789%!?'];
// Phonetic alphabet: row motif + 1–5 vowel dots; dakuten/handakuten and small-kana mark.
const ROWS = ['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','や ゆ よ','らりるれろ','わ   を'];
const ROW_NAMES = ['太陽','鳥','サックス','門','人','器','松','目','波','手'];
const SMALL = Object.fromEntries([...'ぁぃぅぇぉゃゅょっゎ'].map((c,i)=>[c,[...'あいうえおやゆよつわ'][i]]));
function glyphParts(char){
 const kana=char.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)), small=Boolean(SMALL[kana]);
 const decomposed=(SMALL[kana]||kana).normalize('NFD');
 const base=decomposed[0],row=ROWS.findIndex(r=>r.includes(base));
 return {row,vowel:row<0?0:ROWS[row].indexOf(base)+1,small,mark:decomposed.includes('\u3099')?'voiced':decomposed.includes('\u309a')?'semi':''};
}
const MOTIFS = [
 '<path d="M24 12 10 29h10L8 41h32L28 29h10ZM24 41v8"/>',
 '<path d="M5 30q19-25 38 0Q24 50 5 30ZM24 18v-5M11 20l-4-5M37 20l4-5"/><circle cx="24" cy="30" r="6"/>',
 '<circle cx="24" cy="19" r="6"/><path d="M24 25v13m-15-9 15 5 15-5M24 38 13 48m11-10 11 10"/>',
 '<path d="M6 29h36Q38 46 24 46T6 29ZM13 49h22M17 22q-5-4 0-8m9 8q-5-4 0-8m9 8q-5-4 0-8M8 26h34"/>',
 '<path d="M16 14h10v23q0 11 10 5l5-7-9-4-3 5M21 15v21q0 16 13 13M15 14l-4 4"/><circle cx="22" cy="23" r="1"/><circle cx="22" cy="29" r="1"/>',
 '<path d="M7 38q8 0 10-14t14-6l10 6-9 2q0 18-25 12Zm12 1-3 9m10-10 3 10M7 48h28M11 35l11-6"/><circle cx="27" cy="20" r="1"/>',
 '<circle cx="24" cy="30" r="10"/><path d="M24 14v4m0 24v6M7 30h5m24 0h6M12 18l4 4m16 16 5 5M12 43l4-5m16-16 5-5M20 31l4 4 5-8"/>',
 '<path d="M9 48V23l15-9 15 9v25M5 48h38M18 48V30h12v18M9 25h30M21 21h6"/>'
];
const ROW_MOTIFS = [MOTIFS[6],MOTIFS[5],MOTIFS[4],MOTIFS[7],MOTIFS[2],MOTIFS[3],MOTIFS[0],MOTIFS[1],'<path d="M5 23q6-9 12 0t12 0 14 0M5 33q6-9 12 0t12 0 14 0M5 43q6-9 12 0t12 0 14 0"/>','<path d="M12 43 7 30q-1-5 4-2l6 6V16q0-5 4 0v12-16q2-5 4 0v16-13q3-4 4 1v14-10q3-4 4 1v14l5-6q5-3 3 4l-7 14H18Z"/>'];
function glyph(char) {
 const kana=char.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)),p=glyphParts(kana);
 let content='';
 if(p.row>=0){
  content=ROW_MOTIFS[p.row];
  for(let i=0;i<p.vowel;i++)content+=`<circle cx="${24-(p.vowel-1)*4+i*8}" cy="57" r="2" fill="currentColor" stroke="none"/>`;
  if(p.mark==='voiced')content+='<path d="m34 4 3 5m5-5 3 5"/>';
  if(p.mark==='semi')content+='<circle cx="40" cy="6" r="4"/>';
  if(p.small)content+='<path d="M4 9V3h7"/>';
 }else if(kana==='ん')content='<path d="M9 20 24 43 39 20M12 48h24"/>';
 else if(kana==='ー')content='<path d="M7 30h34M7 25v10m34-10v10"/>';
 else {const index=KANA.indexOf(kana);if(index<0)throw new Error('No glyph for '+char);content='<path d="m24 12 18 18-18 18L6 30Z"/>';for(let i=0;i<7;i++)if(index&(1<<i))content+=`<circle cx="${6+i*6}" cy="57" r="1.8" fill="currentColor"/>`;}
 return `<svg class="glyph-svg" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
}
function normalize(value) {return value.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s\u3000。、，,.!！?？・「」『』]/g,'');}
const $=id=>document.getElementById(id);
let selectedChar=null,referenceTab='records';
let round=0,known=new Set(),solved=[],hintStep=0,totalHints=0,mistakes=0,locked=false;
function showScreen(id){document.body.classList.toggle('playing',id==='game');for(const screen of ['intro','game','ending']) $(screen).hidden=screen!==id;window.scrollTo({top:0,behavior:'instant'});}
function renderReading(){
 const q=QUESTIONS[round];
 $('glyphs').innerHTML=[...q.answer].map((c,i)=>`<button type="button" class="glyph-tile ${selectedChar===c?'matched':''}" data-inspect="${c}" aria-label="${i+1}文字目：${known.has(c)?c:'未解読の記号'}を照合" aria-pressed="${selectedChar===c}">${glyph(c)}<span class="glyph-reading ${known.has(c)?'known':''}">${known.has(c)?c:'？'}</span></button>`).join('');
 const remaining=[...new Set(q.answer)].filter(c=>!known.has(c)).length;
 $('hintCount').textContent=remaining?`あと${remaining}種類`:'全文字が判明';
 $('hint').disabled=remaining===0;
 $('readingHelp').textContent=remaining?'記号の下の「？」を推理しよう。同じ記号の読みは一緒に判明します。':'すべての文字が判明！ 石板の下の読みをつなげて入力しよう。';
}
function revealLetters(count){
 const letters=[...new Set(QUESTIONS[round].answer)].filter(c=>!known.has(c)).slice(0,count);
 letters.forEach(c=>known.add(c));renderReading();renderNotebook();return letters;
}
function addClue(content){const p=document.createElement('p');p.className='clue';p.innerHTML=content;$('clues').prepend(p);}
function renderNotebook(){
 $('knownCount').textContent=`${known.size}文字`;
 $('dictionary').innerHTML=[...known].sort((a,b)=>KANA.indexOf(a)-KANA.indexOf(b)).map(c=>`<button type="button" class="${selectedChar===c?'matched':''}" data-char="${c}" aria-label="${c}を入力">${glyph(c)}${c}</button>`).join('');
 $('records').innerHTML=solved.length?solved.map((q,i)=>`<article class="record"><h3>第${i+1}碑 · ${q.title}</h3><div class="record-glyphs">${[...q.answer].map(c=>`<button type="button" data-inspect="${c}" class="${selectedChar===c?'matched':''}" aria-label="過去の文字 ${c}を照合">${glyph(c)}<span>${c}</span></button>`).join('')}</div><p>${q.translation}</p></article>`).join(''):'<p class="empty-note">まだ解読済みの石板はありません。「文字の法則」で読み方を調べてみよう。</p>';
 updateReference();
}
function updateReference(){
 for(const id of ['records','dictionary','rules']){$(id).hidden=id!==referenceTab;const button=document.querySelector(`[data-reference="${id}"]`);button.setAttribute('aria-selected',String(id===referenceTab));}
 const c=selectedChar;
 if(!c){$('comparisonNote').textContent='今の石板の記号をタップすると、過去の同じ記号が光ります。';return;}
 const p=glyphParts(c),matches=solved.reduce((n,q)=>n+[...q.answer].filter(v=>v===c).length,0);
 $('comparisonNote').textContent=(known.has(c)?`「${c}」`:'選んだ記号')+'：'+(p.row>=0?`${ROW_NAMES[p.row]}・点${p.vowel}個`:'特別な記号')+`。過去の一致 ${matches}か所。`;
 if(referenceTab==='records'){
  const target=$('records').querySelector('.matched')?.closest('.record');
  const scroller=document.querySelector('.reference-scroll');
  if(target)scroller.scrollTop+=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-10;
 }

}
$('referenceTabs').addEventListener('click',e=>{const b=e.target.closest('[data-reference]');if(!b)return;referenceTab=b.dataset.reference;updateReference();});
function inspect(e){const b=e.target.closest('[data-inspect]');if(!b)return;selectedChar=selectedChar===b.dataset.inspect?null:b.dataset.inspect;renderReading();renderNotebook();}
$('glyphs').addEventListener('click',inspect);$('records').addEventListener('click',inspect);
$('rules').innerHTML=`<p class="rule-lead">絵柄＝五十音の行。下の点＝母音。</p><div class="vowel-key">● あ　●● い　●●● う<br>●●●● え　●●●●● お</div><div class="row-key">${ROWS.map((r,i)=>`<span>${glyph(r[0])}<b>${r[0]}行</b><small>${ROW_NAMES[i]}</small></span>`).join('')}</div><p>右上の2本線＝濁点（が・で など）<br>右上の丸＝半濁点（ぱ・ぷ など）<br>左上の小さな角＝小さい文字（ょ・っ など）</p><div class="rule-examples">${['ま','み','む','ふ','ぶ','ぷ','よ','ょ','ん','ー'].map(c=>`<span>${glyph(c)}${c}</span>`).join('')}</div><p>例：松＋点3個＝「む」。器＋点3個＋右上の丸＝「ぷ」。<br>「ん」と「ー」は専用記号。カタカナも同じ記号です。</p>`;
function renderQuestion(){
 const q=QUESTIONS[round];hintStep=0;locked=false;selectedChar=null;[...(q.starter||'')].forEach(c=>known.add(c));
 $('count').textContent=`${String(round+1).padStart(2,'0')} / ${String(QUESTIONS.length).padStart(2,'0')}`;
 $('progress').innerHTML=QUESTIONS.map((_,i)=>`<i class="${i<round?'done':i===round?'current':''}"></i>`).join('');
 $('chapter').textContent=round===QUESTIONS.length-1?'FINAL INSCRIPTION · 最終碑文':`INSCRIPTION 0${round+1} · 第${round+1}の石板`;
 $('tabletTitle').textContent=q.title;$('tabletDescription').textContent=q.description;
 $('tabletId').textContent=`収蔵番号 M-${String(round+1).padStart(3,'0')}`;
 $('tablet').className='tablet'+(round===QUESTIONS.length-1?' monument':'');
 $('letterCount').textContent=`${[...q.answer].length}文字の碑文`;
 $('answerArea').hidden=false;$('success').hidden=true;$('answer').value='';$('answer').removeAttribute('aria-invalid');$('feedback').textContent='';$('clues').innerHTML='';$('hintCount').textContent='';$('hint').disabled=false;
 $('fieldNote').textContent='調査員のメモ：'+q.clues[0];renderReading();renderNotebook();showScreen('game');$('tabletTitle').focus({preventScroll:true});
}
function start(){round=0;referenceTab='rules';known=new Set();solved=[];totalHints=0;mistakes=0;renderQuestion();}
$('start').addEventListener('click',start);$('restart').addEventListener('click',start);
$('home').addEventListener('click',e=>{e.preventDefault();showScreen('intro');$('start').focus({preventScroll:true});});
$('hint').addEventListener('click',()=>{
 if(locked)return;
 const letters=revealLetters(2);if(!letters.length)return;
 hintStep++;totalHints++;
 const note=hintStep===1?(QUESTIONS[round].clues[1]||''):'';
 addClue(`<span>${note}${note?'<br>':''}新たに「${letters.join('」「')}」が判明。石板の読みと手帳に書き込みました。</span>`);
});
$('dictionary').addEventListener('click',e=>{const b=e.target.closest('button[data-char]');if(!b||locked)return;const input=$('answer');const from=input.selectionStart??input.value.length;const to=input.selectionEnd??from;input.setRangeText(b.dataset.char,from,to,'end');input.focus({preventScroll:true});});

$('answerForm').addEventListener('submit',e=>{
 e.preventDefault();if(locked||e.isComposing)return;
 const q=QUESTIONS[round],value=normalize($('answer').value);
 if(!value){$('feedback').textContent='まずは解読結果を入力しよう。';return;}
 if(![q.answer,...(q.aliases||[])].some(a=>normalize(a)===value)){mistakes++;const letters=revealLetters(1);$('feedback').textContent='解読失敗 — 考古学界に激震は走らなかった。'+(letters.length?'調査員が「'+letters[0]+'」を解読してくれました。もう一度！':'石板の下の読みを、左から順につなげてみよう。');$('answer').setAttribute('aria-invalid','true');return;}
 locked=true;$('answer').removeAttribute('aria-invalid');solved.push(q);[...q.answer].forEach(c=>known.add(c));$('answerArea').hidden=true;$('success').hidden=false;$('tablet').classList.add('illuminated');
 $('successPrelude').textContent=round===QUESTIONS.length-1?'人類はついに、失われた松村文明の真実に辿り着いた。':'永き沈黙を破り、古代の言葉がいま蘇る。';
 $('translation').textContent=q.translation;$('successAside').textContent=q.aside;$('next').textContent=round===QUESTIONS.length-1?'調査報告書を受け取る →':'次の石板へ進む →';renderReading();renderNotebook();$('next').focus({preventScroll:true});$('success').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('answer').addEventListener('input',()=>{$('answer').removeAttribute('aria-invalid');});
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();});
$('next').addEventListener('click',()=>{if(!locked)return;if(round<QUESTIONS.length-1){round++;referenceTab='records';renderQuestion();}else{$('stats').innerHTML=`<span><b>${solved.length} / ${QUESTIONS.length}</b>解読した石板</span><span><b>${known.size}</b>発見した文字</span><span><b>${totalHints}</b>集めた手がかり</span>`;showScreen('ending');$('restart').focus({preventScroll:true});}});
$('heroGlyphs').innerHTML=[...'まつむらです'].map(glyph).join('');
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('contextmenu',e=>{if(e.target.closest('button,.tablet,.artifact'))e.preventDefault();});document.addEventListener('dragstart',e=>e.preventDefault());
