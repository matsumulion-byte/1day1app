(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const questions=[
 {kicker:"01 / FEELING",text:"いまの気分に近いのは？",answers:[{label:"ほっとしたい",v:"calm"},{label:"元気を出したい",v:"power"},{label:"ちょっと冒険したい",v:"adventure"},{label:"とにかく満たされたい",v:"full"}]},
 {kicker:"02 / HUNGER",text:"おなかの空き具合は？",answers:[{label:"ほんの少し",v:"light"},{label:"小腹がすいた",v:"medium"},{label:"かなりすいた",v:"heavy"},{label:"もう限界",v:"huge"}]},
 {kicker:"03 / ACTION",text:"どうやって食べたい？",answers:[{label:"手でつまみたい",v:"hand"},{label:"スプーンですくいたい",v:"spoon"},{label:"箸でじっくり",v:"chopsticks"},{label:"勢いよくすすりたい",v:"slurp"}]},
 {kicker:"04 / TEMPERATURE",text:"きょう惹かれる温度は？",answers:[{label:"ひんやり",v:"cool"},{label:"いつもの温度",v:"room"},{label:"ほんのり温かい",v:"warm"},{label:"湯気が出るほど熱々",v:"hot"}]},
 {kicker:"05 / REWARD",text:"きょう欲しいごほうびは？",answers:[{label:"やさしい甘さ",v:"sweet"},{label:"しょっぱい刺激",v:"salty"},{label:"安心する味",v:"comfort"},{label:"背徳感たっぷり",v:"guilty"}]}
];
const foods=[
 {name:"プリン",emoji:"🍮",tags:["calm","light","spoon","cool","sweet"],copy:"焦らず、揺らさず、ひとさじずつ。今日はやわらかな甘さに甘えていい日です。",mood:"やさしく着地",sat:"とろける満点",tone:"cool"},
 {name:"ポテトチップス",emoji:"🥔",tags:["power","medium","hand","room","salty"],copy:"一枚だけのつもりが、気づけばいいところまで来ています。その勢いも、今日は味方です。",mood:"パリッと前向き",sat:"止まらない",tone:"warm"},
 {name:"ショートケーキ",emoji:"🍰",tags:["calm","light","spoon","cool","sweet"],copy:"理由のいらないごほうびを。赤い苺までたどり着く頃には、今日が少し好きになっています。",mood:"王道のごほうび",sat:"星3つ",tone:"cool"},
 {name:"たい焼き",emoji:"🐟",tags:["calm","medium","hand","warm","sweet"],copy:"頭からでも、しっぽからでも。迷いごとあんこで包んで、温かいうちにいただきましょう。",mood:"ほかほか安心",sat:"しっぽまで",tone:"warm"},
 {name:"焼き芋",emoji:"🍠",tags:["calm","medium","hand","hot","comfort"],copy:"派手さはいりません。ほくほくの甘さと少しの沈黙が、今日のあなたにはよく似合います。",mood:"素朴に満ちる",sat:"ねっとり高め",tone:"warm"},
 {name:"肉まん",emoji:"♨️",tags:["power","medium","hand","hot","comfort"],copy:"両手で持てる、あたたかな安心。ふたつに割った湯気まで、ちゃんとおやつです。",mood:"手のひら休憩",sat:"ふかふか",tone:"warm"},
 {name:"おにぎり",emoji:"🍙",tags:["calm","heavy","hand","room","comfort"],copy:"余計なことは考えず、好きな具をひとつ。きょう必要なのは、きっぱり頼れる三角形です。",mood:"まじめな空腹",sat:"芯から満足",tone:"cool"},
 {name:"たこ焼き",emoji:"🐙",tags:["power","medium","chopsticks","hot","salty"],copy:"熱いと分かっていても進みたい。そんな小さな勇気を、ソースと青のりが応援しています。",mood:"ころころ上機嫌",sat:"8個ぶん",tone:"bold"},
 {name:"フライドポテト",emoji:"🍟",tags:["power","heavy","hand","hot","salty"],copy:"細かいことはポテトの山の向こうへ。揚げたてを一本ずつ片づければ、気分も整います。",mood:"塩気で回復",sat:"Lサイズ",tone:"warm"},
 {name:"アメリカンドッグ",emoji:"🌭",tags:["adventure","heavy","hand","warm","guilty"],copy:"ケチャップとマスタードは大胆に。今日は棒に刺さった楽しさを、堂々と選びましょう。",mood:"お祭り気分",sat:"衣まで完食",tone:"bold"},
 {name:"ピザ",emoji:"🍕",tags:["adventure","heavy","hand","hot","guilty"],copy:"一切れは軽食、二切れでもおやつ。伸びるチーズの長さだけ、自由になってください。",mood:"自由を追加",sat:"チーズ増量",tone:"bold"},
 {name:"カップ麺",emoji:"🍜",tags:["adventure","heavy","slurp","hot","guilty"],copy:"待つのは数分、満たされるのは一瞬。ふたを開けたら、そこから先はあなたの時間です。",mood:"即席の解放",sat:"スープ級",tone:"bold"},
 {name:"カレーうどん",emoji:"🍛",tags:["full","huge","slurp","hot","comfort"],copy:"小さな甘さでは足りません。だしとスパイスに包まれる、圧倒的な安心をどうぞ。",mood:"本気のひと休み",sat:"どんぶり満点",tone:"warm"},
 {name:"チャーハン",emoji:"🥄",tags:["full","huge","spoon","hot","salty"],copy:"ぱらぱらの米粒を追いかけるうちに、考えすぎた頭もほどけます。れんげを止めないで。",mood:"香ばしく前進",sat:"大盛り寄り",tone:"warm"},
 {name:"小籠包",emoji:"🥟",tags:["adventure","medium","chopsticks","hot","guilty"],copy:"中に何かを隠している食べ物は魅力的です。熱々のスープごと、今日の冒険をひとくちで。",mood:"慎重にわくわく",sat:"蒸籠いっぱい",tone:"bold"},
 {name:"唐揚げ",emoji:"🍗",tags:["power","heavy","hand","hot","guilty"],copy:"カリッという音が、今日の区切りです。レモンをかけるかは、あなたの自由に任せます。",mood:"豪快に回復",sat:"もう一個",tone:"bold"},
 {name:"お茶漬け",emoji:"🍵",tags:["calm","medium","chopsticks","warm","comfort"],copy:"さらさらと流して、肩の力も抜いて。静かな味が、忙しかった一日をちゃんと閉じてくれます。",mood:"静かにほどける",sat:"さらりと十分",tone:"cool"},
 {name:"寿司",emoji:"🍣",tags:["adventure","huge","chopsticks","room","guilty"],copy:"今日は少し景気よくいきましょう。好きなものから食べる、それがきょうのおやつの作法です。",mood:"晴れやか贅沢",sat:"特上",tone:"cool"}
];
let step=0,answers=[];
function show(id){$$('.screen').forEach(el=>el.classList.toggle('active',el.id===id));window.scrollTo(0,0)}
function renderQuestion(){const q=questions[step];$('#question-number').textContent=String(step+1).padStart(2,'0');$('#progress').style.width=((step+1)/questions.length*100)+'%';$('#question-kicker').textContent=q.kicker;$('#question').textContent=q.text;$('#back').disabled=step===0;const box=$('#answers');box.innerHTML='';q.answers.forEach((a,i)=>{const b=document.createElement('button');b.className='answer';b.innerHTML=`<b>${String.fromCharCode(65+i)}</b><span>${a.label}</span>`;b.onclick=()=>choose(a.v);box.appendChild(b)})}
function choose(value){answers[step]=value;if(step<questions.length-1){step++;renderQuestion()}else finish()}
function finish(){let max=-1,candidates=[];foods.forEach((food,index)=>{let score=food.tags.reduce((n,t)=>n+(answers.includes(t)?1:0),0);score+=((answers.join('').length+index*7)%11)/100;if(score>max){max=score;candidates=[food]}else if(score===max)candidates.push(food)});const food=candidates[0];$('#food-name').textContent=food.name;$('#food-emoji').textContent=food.emoji;$('#result-copy').textContent=food.copy;$('#mood-label').textContent=food.mood;$('#satisfaction').textContent=food.sat;$('#result').dataset.tone=food.tone;show('result')}
$('#start').onclick=()=>{step=0;answers=[];renderQuestion();show('quiz')};$('#back').onclick=()=>{if(step>0){step--;renderQuestion()}};$('#retry').onclick=()=>{step=0;answers=[];renderQuestion();show('quiz')};
})();
