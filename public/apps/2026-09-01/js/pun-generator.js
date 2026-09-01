(function(g){
const D=g.DAJARE_DICTIONARY,T=g.DAJARE_TEMPLATES,rm=g.DAJARE_READING_MAP;
const kata=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[Ａ-Ｚａ-ｚ０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).toLowerCase().replace(/[\s　・!?！？。、]/g,'');
const devoice=s=>s.replace(/[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/g,c=>'かきくけこさしすせそたちつてとはひふへほはひふへほ'['がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'.indexOf(c)]);
function lev(a,b){let x=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let y=[i];for(let j=1;j<=b.length;j++)y[j]=Math.min(y[j-1]+1,x[j]+1,x[j-1]+(a[i-1]===b[j-1]?0:1));x=y}return x[b.length]}
function read(input){let s=kata(input);if(rm[input])return rm[input];let pairs=Object.keys(rm).sort((a,b)=>b.length-a.length);for(const w of pairs)s=s.replaceAll(kata(w),rm[w]);return s}
function fragments(s){let a=[];for(let n=2;n<=Math.min(7,s.length);n++)for(let i=0;i<=s.length-n;i++)a.push({text:s.slice(i,i+n),i,n});return a.sort((x,y)=>y.n-x.n)}
function sim(a,b){if(a===b)return 100;if(devoice(a)===devoice(b))return 80;if(a.replace(/ー/g,'')===b.replace(/ー/g,''))return 75;if(a.replace(/[っゃゅょ]/g,'')===b.replace(/[っゃゅょ]/g,''))return 70;let d=lev(a,b);return d===1?(a.length===b.length?50:60):0}
const specials={ふとん:['布団が吹っ飛んだ。','布団をぶっ飛んで買いに行く。'],こうちょう:['校長、絶好調。','校長が紅茶を好調に飲む。'],といれ:['トイレ？ 行っといれ。','トイレに行っといれ。'],あるみかん:['アルミ缶の上にあるミカン。','このアルミ缶、ある意味カンタン。']};
function generate(input,opt={}){const r=read(input),fs=fragments(r),c=[];fs.forEach(f=>{D.forEach(w=>{let sound=sim(f.text,w.reading);if(!sound)return;if(kata(w.word)===f.text&&w.word===input)return;let changed=r.slice(0,f.i)+w.word+r.slice(f.i+f.n);let natural=22+(w.type==='noun'?8:3),meaning=kata(w.word)!==f.text?20:10,score=sound*.5+natural+meaning;c.push({word:w.word,reading:w.reading,sound,score,text:T[Math.floor(Math.random()*T.length)].replace('{A}',input).replace('{B}',changed),fragment:f.text})})});
if(specials[r])specials[r].forEach((text,i)=>c.push({text,score:98-i*4,sound:100,fragment:r,word:'特別変換'}));
if(!c.length){const near=D.map(w=>({w,s:sim(r.slice(-Math.min(4,r.length)),w.reading)})).filter(x=>x.s).sort((a,b)=>b.s-a.s).slice(0,10);near.forEach(x=>c.push({text:T[Math.floor(Math.random()*T.length)].replace('{A}',input).replace('{B}',x.w.word),score:x.s*.5+28,sound:x.s,fragment:r,word:x.w.word}))}
c.sort(()=>Math.random()-.5).sort((a,b)=>b.score-a.score);let uniq=[...new Map(c.map(x=>[x.text,x])).values()];if(!uniq.length)uniq=[{text:`${input}を言ったら、${input}った。`,score:35,sound:50,fragment:r,word:'事故'}];let good=uniq.slice(0,4),bad=uniq.slice(Math.max(4,uniq.length-8));if(bad.length)good[good.length>=4?3:good.length]=bad[Math.floor(Math.random()*bad.length)];return good.slice(0,Math.min(5,Math.max(3,good.length))).map((x,i)=>({...x,label:i===good.length-1?(x.score<55?'事故':'強引'):(x.score>88?'王道':x.score>73?'ベタ':x.score>60?'おじさん':'惜しい')}));}
g.PunGenerator={generate,toReading:read,fragments,similarity:sim,dictionarySize:D.length,templateSize:T.length};
})(window);
