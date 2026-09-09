const fortunes = [
  {name:"タロット占い",catchcopy:"カードが映す、いまのあなた。",description:"カードを引き、絵柄と配置の象徴から状況や可能性を読み解く占いです。",features:"恋愛や仕事など、具体的な問いを多角的に見つめたいときに向きます。",history:"タロットは15世紀のイタリアでカードゲームとして登場。占術との結びつきは18〜19世紀に広まりました。",famousPeople:["A.E.ウェイト","パメラ・コールマン・スミス","アレイスター・クロウリー"],visualType:"tarot"},
  {name:"西洋占星術",catchcopy:"星の配置から、自分を眺める。",description:"生まれた時刻と場所の天体配置を図にし、性質や時期を解釈する占術です。",features:"ホロスコープを使い、太陽・月・惑星・星座・ハウスの関係を読みます。",history:"古代メソポタミアの天体観測を源流とし、ヘレニズム期に現在につながる体系が形づくられました。",famousPeople:["クラウディオス・プトレマイオス","ウィリアム・リリー"],visualType:"astro"},
  {name:"四柱推命",catchcopy:"生まれた瞬間を、四つの柱に。",description:"生年月日と時刻を年・月・日・時の四柱に置き換え、命式を読む東洋の占術です。",features:"十干十二支と陰陽五行のバランスから、資質や運の巡りを考えます。",history:"中国の命理学を基礎に、唐から宋の時代を通じて現在につながる体系が整えられました。",famousPeople:["徐子平","『淵海子平』","子平法"],visualType:"elements"},
  {name:"九星気学",catchcopy:"九つの星で、流れと方位を読む。",description:"生年月日から九星を割り出し、性質・時期・方位の吉凶をみる占術です。",features:"方位術として使われることが多く、引越しや旅行の時期選びにも用いられます。",history:"古代中国の九星術や方位術を背景に、日本で気学として体系化され普及しました。",famousPeople:["園田真次郎","九星術","気学"],visualType:"compass"},
  {name:"姓名判断",catchcopy:"名前の文字に、輪郭を見つける。",description:"名前の漢字や画数、音などを手がかりに、性格や運勢を解釈する占いです。",features:"日本では主に天格・人格・地格などの格と画数の組み合わせを見ます。",history:"漢字文化の字画観や陰陽五行説などを背景に、近代日本で多様な流派が発達しました。",famousPeople:["熊﨑健翁","五格剖象法","画数法"],visualType:"numbers"},
  {name:"手相占い",catchcopy:"手のひらは、変わり続ける地図。",description:"手の形、丘、主要な線などを観察し、性質や傾向を読み取る占いです。",features:"道具がいらず、左右の手の違いや線の変化も解釈の対象になります。",history:"手の特徴を読む伝統は古代から各地にあり、近代には西洋で体系的な手相術の書籍が広まりました。",famousPeople:["カイロ（Cheiro）","生命線・知能線・感情線"],visualType:"palm"},
  {name:"易占い",catchcopy:"変化の兆しを、六本の線に。",description:"陰と陽の線を六本重ねた六十四卦から、状況の変化と取るべき姿勢を読みます。",features:"偶然に得た卦を『易経』の卦辞・爻辞と照らして解釈します。",history:"古代中国で形成された『周易』を基礎とし、長い注釈の歴史を持つ占術・思想体系です。",famousPeople:["『易経（周易）』","十翼","六十四卦"],visualType:"hex"},
  {name:"数秘術",catchcopy:"数字から、自分のリズムを知る。",description:"誕生日や名前を数に置き換え、その象徴的な意味から性質や周期を読みます。",features:"計算がシンプルで、ライフパスなど複数のナンバーを組み合わせます。",history:"数に神秘的意味を見いだす思想は古代から存在し、現代的な数秘術は19〜20世紀に英語圏で普及しました。",famousPeople:["ピタゴラス派","ライフパス・ナンバー"],visualType:"numbers"},
  {name:"ルーン占い",catchcopy:"古い文字が、問いに輪郭を与える。",description:"ルーン文字を刻んだ石や札を引き、文字の象徴からメッセージを読みます。",features:"少数の記号を一つまたは複数引き、向きや組み合わせを解釈します。",history:"ルーンは古代ゲルマン語圏の文字。現在一般的なルーン占いの方法は主に近現代に広まりました。",famousPeople:["古フサルク","『古エッダ』","ルーン詩"],visualType:"rune"},
  {name:"水晶占い",catchcopy:"曖昧な光に、直感を澄ませる。",description:"水晶玉などの反射面を見つめ、浮かぶ像や印象を象徴として読み取る占いです。",features:"スクライングと呼ばれる凝視法の一つで、直感とイメージを重視します。",history:"鏡や水面を凝視する占いは古くからあり、水晶球は近代に占い師の象徴として定着しました。",famousPeople:["ジョン・ディー","スクライング","黒曜石の鏡"],visualType:"crystal"},
  {name:"夢占い",catchcopy:"眠りの物語を、起きた自分へ。",description:"夢に現れた人物・場所・出来事の象徴から、心理や兆しを解釈します。",features:"同じ象徴でも本人の経験や感情によって意味が変わるのが特徴です。",history:"夢の解釈は古代文明にも記録があり、近代には心理学も夢への別の見方を提示しました。",famousPeople:["『アルテミドロスの夢判断』","ジークムント・フロイト","カール・ユング"],visualType:"moon"},
  {name:"風水",catchcopy:"空間を整え、気の流れを読む。",description:"地形や方位、住環境の配置を観察し、人と環境の調和を考える中国由来の術です。",features:"巒頭と理気という大きな見方があり、形と方位・時間を扱います。",history:"中国の墓地・都市・住居の立地を選ぶ伝統から発展し、多数の流派が形成されました。",famousPeople:["郭璞『葬書』","巒頭派","理気派"],visualType:"compass"},
  {name:"紫微斗数",catchcopy:"星々を宮に配し、人生を俯瞰する。",description:"生年月日と時刻から命盤を作り、十二宮に配置された星々を読み解く占術です。",features:"多くの星と宮の関係を詳細に読む、情報量の多い東洋命術です。",history:"中国で発達した占星術的な命術で、宋代の陳希夷に結びつける伝承がありますが成立史には諸説あります。",famousPeople:["陳希夷（伝承）","紫微星","十二宮"],visualType:"astro"},
  {name:"算命学",catchcopy:"自然の法則で、資質を配置する。",description:"生年月日を干支に置き換え、陰陽五行などから性質や運の流れを読む体系です。",features:"宿命と環境の関係を重視し、十大主星や十二大従星などを用います。",history:"中国の陰陽五行・干支による命理を背景に、日本で算命学として研究・普及しました。",famousPeople:["高尾義政","陰陽五行","十大主星"],visualType:"elements"},
  {name:"宿曜占星術",catchcopy:"月の宿から、人との縁を読む。",description:"月の運行をもとにした宿を使い、性質・日取り・人間関係などをみる占術です。",features:"日本では二十七宿を使うことが多く、とくに相性の解釈で知られます。",history:"インド占星術の宿の考えが中国を経て伝わり、日本では平安時代に『宿曜経』とともに広まりました。",famousPeople:["不空訳『宿曜経』","二十七宿","弘法大師空海（伝来との関連）"],visualType:"moon"},
  {name:"六星占術",catchcopy:"運命星で、時の波を眺める。",description:"生年月日から六つの運命星に分類し、性格や運気の周期を読む日本の占いです。",features:"十二の運気区分による周期が分かりやすく、大衆的に親しまれました。",history:"細木数子が提唱し、1980年代以降に書籍やテレビを通じて広く知られるようになりました。",famousPeople:["細木数子","六つの運命星","十二運"],visualType:"astro"},
  {name:"動物占い",catchcopy:"動物キャラで、個性を軽やかに。",description:"生年月日から動物キャラクターに分類し、性格や相性を表現する占いです。",features:"親しみやすいキャラクターと短い言葉で、個性の違いを楽しめます。",history:"四柱推命などで用いる十二運星を背景に、日本でキャラクター化され1990年代末に流行しました。",famousPeople:["12動物キャラクター","個性心理學"],visualType:"zodiac"}
];

const motifs = [
  {label:"タロットカード",type:"tarot"},{label:"星座",type:"zodiac"},{label:"惑星",type:"astro"},{label:"月",type:"moon"},
  {label:"手相",type:"palm"},{label:"水晶玉",type:"crystal"},{label:"八卦",type:"hex"},{label:"陰陽",type:"yin"},
  {label:"数字",type:"numbers"},{label:"ルーン文字",type:"rune"},{label:"方位盤",type:"compass"},{label:"五行",type:"elements"}
];
const screens = {intro:document.querySelector("#introScreen"),casting:document.querySelector("#castingScreen"),result:document.querySelector("#resultScreen")};
const motif = document.querySelector("#motif");
let lastIndex = -1, running = false, timers = [];

function motifMarkup(type) {
  const map = {
    tarot:'<div class="tarot">☾</div>', astro:'<div class="orbit-icon"><i></i><b></b></div>', zodiac:'<div class="orbit-icon"><i>✦</i><b></b></div>',
    moon:'<div class="rune">☽</div>', palm:'<div class="palm">𖧷</div>', crystal:'<div class="crystal"></div>', hex:'<div class="hex">⚊<br>⚋<br>⚊<br>⚋<br>⚊<br>⚋</div>',
    yin:'<div class="rune">☯</div>', numbers:'<div class="numbers">3 8 1<br>6 9 4<br>2 7 5</div>', rune:'<div class="rune">ᛉ</div>',
    compass:'<div class="compass">東<br>✦</div>', elements:'<div class="elements"><b>木</b><b>火</b><b>土</b><b>金</b><b>水</b></div>'
  }; return map[type] || map.astro;
}
function showScreen(name) { Object.values(screens).forEach(s=>s.classList.remove("active")); screens[name].classList.add("active"); window.scrollTo({top:0,behavior:"instant"}); }
function setMotif(item) { motif.classList.remove("swap"); void motif.offsetWidth; motif.innerHTML=motifMarkup(item.type); motif.classList.add("swap"); document.querySelector("#castingName").textContent=item.label; }
function pickFortune() { let i; do{i=Math.floor(Math.random()*fortunes.length)}while(fortunes.length>1&&i===lastIndex); lastIndex=i; return fortunes[i]; }

function beginCasting() {
  if(running) return; running=true; timers.forEach(clearTimeout); timers=[]; showScreen("casting");
  const winner=pickFortune(), duration=2800+Math.random()*700, started=performance.now(); let step=0;
  document.querySelector("#progressBar").style.width="0";
  const spin=()=>{
    const elapsed=performance.now()-started, ratio=Math.min(elapsed/duration,1);
    const item=ratio>.86 ? {label:winner.name.replace("占い",""),type:winner.visualType} : motifs[(Math.floor(Math.random()*motifs.length)+step++)%motifs.length];
    setMotif(item); document.querySelector("#progressBar").style.width=`${Math.min(ratio*100,100)}%`;
    if(ratio<1){ const delay=70+Math.pow(ratio,3)*380; timers.push(setTimeout(spin,delay)); }
    else timers.push(setTimeout(()=>reveal(winner),520));
  }; spin();
}
function reveal(data) {
  const score=70+Math.floor(Math.random()*30);
  document.querySelector("#resultName").textContent=data.name; document.querySelector("#catchcopy").textContent=`「${data.catchcopy}」`;
  document.querySelector("#score").textContent=score; document.querySelector("#description").textContent=data.description;
  document.querySelector("#features").textContent=data.features; document.querySelector("#history").textContent=data.history;
  document.querySelector("#famousPeople").innerHTML=data.famousPeople.map(p=>`<li>${p}</li>`).join("");
  const meter=document.querySelector("#meter"); meter.style.transition="none";meter.style.strokeDashoffset="333";
  screens.result.dataset.name=data.name;screens.result.dataset.score=score; showScreen("result");
  requestAnimationFrame(()=>{meter.style.transition="";meter.style.strokeDashoffset=String(333*(1-score/100));}); running=false;
}
async function shareResult(){
  const name=screens.result.dataset.name,score=screens.result.dataset.score,text=`占い占いで占った結果、私に合っているのは『${name}』でした。相性度${score}%。`;
  try { if(navigator.share) await navigator.share({title:"占い占い",text,url:location.href}); else {await navigator.clipboard.writeText(`${text}\n${location.href}`);toast();} } catch(e) { if(e.name!=="AbortError"){try{await navigator.clipboard.writeText(text);toast();}catch(_){}} }
}
function toast(){const el=document.querySelector("#toast");el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
document.querySelector("#startButton").addEventListener("click",beginCasting);
document.querySelector("#retryButton").addEventListener("click",beginCasting);
document.querySelector("#shareButton").addEventListener("click",shareResult);
document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
