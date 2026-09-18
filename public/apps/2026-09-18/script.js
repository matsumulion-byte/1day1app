'use strict';
const $ = id => document.getElementById(id);
const canvas = $('poster'), ctx = canvas.getContext('2d');
const red='#de3027', gold='#d3b374', paper='#f2ecdc';
const copies=['因縁の一戦','世紀の対バン','歌心 vs 圧','今夜、音で決着。','アンコール無制限一本勝負'];
const titles=['東川口の刺客','謎の弾き語り戦士','北関東の歌う暴風','リハでは本気を出さない男','アンコールの最終兵器','音楽でしか語れない強敵'];
const records=['1MC 4曲','物販0勝7敗','開演19:00、決着未定','拍手判定、満場一致','チューニングだけは無敗','延長戦は打ち上げで'];
let photo=null, loadToken=0, loading=false, exportUrl=null;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
let match={name:'対戦者',copy:pick(copies),title:pick(titles),record:pick(records),photo:null,position:50};
const fixed=new Image(), logo=new Image();
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function text(t,x,y,size,color=paper,max=980,font='sans-serif'){ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${size}px ${font}`;while(ctx.measureText(t).width>max&&size>12){size--;ctx.font=`900 ${size}px ${font}`}ctx.fillText(t,x,y)}
function silhouette(x,y,w,h){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#48443b');g.addColorStop(1,'#191a18');rect(x,y,w,h,g);ctx.fillStyle='#090a09';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.95,w*.44,h*.37,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+w/2,y+h*.35,w*.20,h*.21,0,0,Math.PI*2);ctx.fill();text('?',x+w/2,y+h*.4,140,gold,w);text('NEXT OPPONENT',x+w/2,y+h*.83,22,'#b5aa8e',w-20)}
function cover(img,x,y,w,h,position){const s=Math.max(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*s)/2,y+(h-img.height*s)*position/100,img.width*s,img.height*s)}
function draw(){
 rect(0,0,1080,1350,'#171713');
 const glow=ctx.createRadialGradient(550,490,80,550,490,800);glow.addColorStop(0,'#615139');glow.addColorStop(1,'#10110f');rect(0,0,1080,1350,glow);
 ctx.save();ctx.globalAlpha=.13;for(let i=0;i<18;i++){ctx.beginPath();ctx.moveTo(540,680);ctx.lineTo(i*130-620,0);ctx.lineTo(i*130-560,0);ctx.fillStyle=gold;ctx.fill()}ctx.restore();
 ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(22,22,1036,1306);ctx.lineWidth=1;ctx.strokeRect(31,31,1018,1288);
 text('MATSUMURA KAI  /  SPECIAL LIVE MATCH',540,65,21,gold);
 rect(48,96,984,53,red);text('音 楽 異 種 格 闘 技 戦',540,124,30,paper);
 if(logo.complete&&logo.naturalWidth){ctx.drawImage(logo,145,275,1320,440,230,151,620,207)}else{text('マツムラ会',540,260,110,paper,960)}text('V O L . 3',540,375,30,gold);
 ctx.strokeStyle='#86734d';ctx.beginPath();ctx.moveTo(65,409);ctx.lineTo(285,409);ctx.moveTo(795,409);ctx.lineTo(1015,409);ctx.stroke();text(match.copy,540,410,32,paper,830);
 const y=449,w=454,h=505;
 rect(53,y-6,w+12,h+12,gold);rect(561,y-6,w+12,h+12,gold);
 ctx.save();ctx.beginPath();ctx.rect(59,y,w,h);ctx.clip();if(fixed.complete&&fixed.naturalWidth){ctx.filter='grayscale(1) contrast(1.15)';ctx.drawImage(fixed,190,396,354,351,59,y,w,h);ctx.filter='none'}else silhouette(59,y,w,h);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(567,y,w,h);ctx.clip();if(match.photo){ctx.filter='grayscale(1) contrast(1.12)';cover(match.photo,567,y,w,h,match.position);ctx.filter='none'}else silhouette(567,y,w,h);ctx.restore();
 for(const x of [59,567]){const shade=ctx.createLinearGradient(0,760,0,958);shade.addColorStop(0,'#0000');shade.addColorStop(1,'#090a09');rect(x,760,w,198,shade)}
 rect(74,449,190,34,red);text('MATSUMURA',169,468,18);rect(582,449,190,34,'#171713');text('OPPONENT',677,468,18,gold);
 ctx.save();ctx.translate(540,721);ctx.rotate(-.13);ctx.shadowColor='#000';ctx.shadowBlur=18;text('VS',0,0,147,red,260,'Impact, sans-serif');ctx.shadowBlur=0;ctx.restore();
 text('松村',286,875,96,paper,418);text(match.name,794,875,88,paper,418);
 text('主催 / アルトサックス / MC長め',286,990,23,gold,465);text(match.title,794,990,28,gold,465);
 rect(57,1030,966,2,gold);text('xx年xx月',540,1100,88,paper,950);text('LIVE HOUSE ???',540,1170,35,gold);
 rect(57,1220,966,62,red);text(match.record+'  /  勝敗より、乾杯。',540,1253,30,paper,920);
 text('NO FIGHT. JUST MUSIC.   •   FICTIONAL MATCH POSTER',540,1302,15,gold);
 // Reproducible ink flecks keep every download identical to its preview.
 ctx.save();let seed=39;for(let i=0;i<10000;i++){seed=(seed*16807)%2147483647;const x=seed%1080;seed=(seed*16807)%2147483647;const y=seed%1350;ctx.fillStyle=i%2?'#ffffff0b':'#00000016';ctx.fillRect(x,y,1+(i%3),1)}ctx.restore();
 canvas.setAttribute('aria-label',`マツムラ会 vol.3。${match.copy}。松村 VS ${match.name}。${match.title}。${match.record}`);
}
logo.onload=draw;logo.onerror=()=>{$('status').textContent='ロゴを読み込めませんでした。ページを再読み込みしてください。';draw()};logo.src='/apps/2026-09-18/matsumura_logo.png';
fixed.onload=draw;fixed.onerror=()=>{$('status').textContent='固定写真を読み込めなかったため、シルエットで表示しています。';draw()};fixed.src='/apps/2026-09-18/reference.jpg';draw();
$('name').addEventListener('input',()=>{$('name-count').textContent=`${$('name').value.length} / 16`});
$('photo').addEventListener('change',async()=>{
 const file=$('photo').files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){$('status').textContent='20MB以下のJPG・PNG・WebPを選んでください。';$('photo').value='';return}
 const token=++loadToken;loading=true;$('generate').disabled=true;$('status').textContent='写真を読み込んでいます…';const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();if(token!==loadToken)return;
 const temp=document.createElement('canvas'),scale=Math.min(1,2000/Math.max(img.width,img.height));temp.width=Math.round(img.width*scale);temp.height=Math.round(img.height*scale);temp.getContext('2d').drawImage(img,0,0,temp.width,temp.height);
 photo=temp;$('photo-label').textContent=file.name;$('position').value=50;$('photo-options').hidden=false;$('status').textContent='写真を登録しました。「ポスター生成」で参戦！';
 }catch{if(token===loadToken)$('status').textContent='この写真を読み込めませんでした。別の画像を選んでください。'}finally{URL.revokeObjectURL(url);if(token===loadToken){loading=false;$('generate').disabled=false}}
});
$('remove').addEventListener('click',()=>{loadToken++;photo=null;loading=false;$('generate').disabled=false;$('photo').value='';$('photo-label').textContent='写真を選択する';$('photo-options').hidden=true;$('status').textContent='写真を取り消しました。「ポスター生成」で反映されます。'});
$('poster-form').addEventListener('submit',e=>{e.preventDefault();if(loading)return;match={name:$('name').value.trim()||'対戦者',copy:pick(copies),title:pick(titles),record:pick(records),photo,position:Number($('position').value)};draw();$('download-fallback').hidden=true;$('status').textContent='対戦決定！ポスターを更新しました。画像を保存できます。'});
$('save').addEventListener('click',()=>{
 $('save').disabled=true;
 canvas.toBlob(blob=>{try{if(!blob)throw new Error('No image');if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(blob);const a=document.createElement('a');a.href=exportUrl;a.download='matsumura-kai-vol3.png';document.body.append(a);a.click();a.remove();$('saved-image').src=exportUrl;$('download-fallback').hidden=false;$('status').textContent='PNGを用意しました。保存できない場合は下の画像を長押ししてください。'}catch{$('status').textContent='画像を保存できませんでした。もう一度お試しください。'}finally{$('save').disabled=false}},'image/png');
});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.querySelectorAll('button').forEach(button=>{button.addEventListener('dblclick',e=>e.preventDefault());button.addEventListener('contextmenu',e=>e.preventDefault())});
