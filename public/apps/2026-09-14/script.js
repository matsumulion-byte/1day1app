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
// Original vector symbols: pine, eye, person, bowl, saxophone, bird, sun, gate.
// A motif plus a unique crown encodes one character, consistently throughout every play.
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
function glyph(char) {
 const index=KANA.indexOf(char); if(index<0) throw new Error('No glyph for '+char);
 const crown=Math.floor(index/MOTIFS.length);
 let marks=''; for(let bit=0;bit<4;bit++) if(crown&(1<<bit)) marks+=`<path d="M${9+bit*10} 3v5"/>`;
 return `<svg class="glyph-svg" viewBox="0 0 48 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${marks}${MOTIFS[index%MOTIFS.length]}</svg>`;
}
function normalize(value) {return value.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s\u3000。、，,.!！?？・「」『』]/g,'');}
const $=id=>document.getElementById(id);
let round=0,known=new Set(),solved=[],hintStep=0,totalHints=0,mistakes=0,locked=false;
function showScreen(id){for(const screen of ['intro','game','ending']) $(screen).hidden=screen!==id;window.scrollTo({top:0,behavior:'instant'});}
function renderReading(){
 const q=QUESTIONS[round];
 $('glyphs').innerHTML=[...q.answer].map((c,i)=>`<span class="glyph-tile" role="img" aria-label="${known.has(c)?c:'未解読の記号 '+(KANA.indexOf(c)+1)}">${glyph(c)}<span class="glyph-reading ${known.has(c)?'known':''}">${known.has(c)?c:'？'}</span></span>`).join('');
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
 $('knownCount').textContent=`${known.size}文字を記録 ${$('notebook').open?'−':'＋'}`;
 $('dictionary').innerHTML=known.size?[...known].map(c=>`<button type="button" data-char="${c}" aria-label="${c}を入力">${glyph(c)}${c}</button>`).join(''):'<p class="empty-note">まだ記録はありません。手がかりから、最初の一文字を。</p>';
 $('records').innerHTML=solved.map((q,i)=>`<p>0${i+1} 解読済み：${q.answer}<br>現代語訳「${q.translation}」</p>`).join('');
}
function renderQuestion(){
 const q=QUESTIONS[round];hintStep=0;locked=false;[...(q.starter||'')].forEach(c=>known.add(c));
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
function start(){round=0;known=new Set();solved=[];totalHints=0;mistakes=0;renderQuestion();}
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
$('notebook').addEventListener('toggle',()=>{$('knownCount').textContent=`${known.size}文字を記録 ${$('notebook').open?'−':'＋'}`;});
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
$('next').addEventListener('click',()=>{if(!locked)return;if(round<QUESTIONS.length-1){round++;renderQuestion();}else{$('stats').innerHTML=`<span><b>${solved.length} / ${QUESTIONS.length}</b>解読した石板</span><span><b>${known.size}</b>発見した文字</span><span><b>${totalHints}</b>集めた手がかり</span>`;showScreen('ending');$('restart').focus({preventScroll:true});}});
$('heroGlyphs').innerHTML=[...'まつむらです'].map(glyph).join('');
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('contextmenu',e=>{if(e.target.closest('button,.tablet,.artifact'))e.preventDefault();});document.addEventListener('dragstart',e=>e.preventDefault());
