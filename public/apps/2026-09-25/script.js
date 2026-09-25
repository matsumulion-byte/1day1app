'use strict';
/* 問題の追加・写真の変更は QUESTIONS を編集します。
 * image はローカル画像の公開URL。source / credit / license / licenseUrl は写真の出典情報。
 * お宝＝美術館収蔵の美術・歴史資料、ただの物＝本ゲームで選んだ日用品・民芸品。
 * 市場価格や実物の真贋を判定するものではありません。画像利用記録は image-sources.json。
 */
const QUESTIONS = [
  {
    "id": 1,
    "name": "禾目文の天目茶碗",
    "era": "16世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "鉄釉の細い筋が見どころ。瀬戸焼の茶碗で、金属の覆輪が付いています。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-01.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/45339",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 2,
    "name": "黄瀬戸の茶碗",
    "era": "1700年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "薄い釉薬と細かな貫入、外側の刻線が特徴。控えめな姿でも、美術館の収蔵品です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-02.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/63172",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 3,
    "name": "月・雲・梅文の茶碗",
    "era": "17世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "褐色の釉薬に白い化粧土で文様を描いた瀬戸焼。茶碗の中に小さな景色が広がります。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-03.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/62607",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 4,
    "name": "唐津焼の茶碗",
    "era": "1780年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "白い化粧土を使った装飾のある唐津焼。普段使いに見える姿にも歴史があります。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-04.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/63153",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 5,
    "name": "楽焼の茶碗",
    "era": "1830年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "薄い赤褐色の釉薬に貫入が見られる茶碗。派手さだけが、お宝の条件ではありません。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-05.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/63174",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 6,
    "name": "「難波の夢」意匠の硯箱",
    "era": "18世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "金銀の蒔絵や銀の象嵌で飾られた木製漆器。筆を取る前に見入ってしまいそうです。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-06.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/53414",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 7,
    "name": "古墨を模した印籠",
    "era": "18世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "中国の古い墨を模した四段の印籠。墨に見えて、実は精巧な漆工芸です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-07.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/58726",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 8,
    "name": "「宝」字文の徳利",
    "era": "17世紀後半",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "透明な釉薬の下に青で絵付けした伊万里様式の徳利。「宝」の字も鑑定のヒント？",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-08.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/50329",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 9,
    "name": "傘を持つ婦人を描いた皿",
    "era": "1734〜1737年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "藍と色絵で人物を描いた伊万里様式の磁器。食器の形をした、小さな絵画です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-09.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/49421",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 10,
    "name": "兜跋毘沙門天立像",
    "era": "10世紀末〜11世紀初め",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "ケヤキ材に彩色の痕跡が残る仏像。千年を超える時代を伝える木彫です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-10.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/53162",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 11,
    "name": "韓幹「照夜白図」",
    "era": "750年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "唐代の画家・韓幹による馬の絵。紙と墨で、名馬の存在感を描き出しています。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-11.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/39901",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 12,
    "name": "「孝経図」絵巻",
    "era": "1085年ごろ",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "絹に墨と色で描いた絵巻。文字と絵が一緒に物語を伝える作品です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-12.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/39895",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 13,
    "name": "現代の侘び寂びの茶碗",
    "era": "現代",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "古びたような風合いですが、出典は現代の茶碗と明記。釉薬のむらや不揃いな形だけで、古い名品とは言い切れません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-13-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Contemporary_wabi-sabi_tea_bowl.jpg",
    "credit": "ottmarliebert.com from Santa Fe, Turtle Island",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 14,
    "name": "松灰釉の湯呑み",
    "era": "製作年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "英国ウェールズのラヤダーで作られた、松の灰を使う釉薬の湯呑み。渋い釉調は、日本の古陶磁だけのものではありません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-14-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Yunomi_ash.jpg",
    "credit": "Phil Rogers",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 15,
    "name": "玉露用の常滑急須",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "撮影者が玉露のために新しく入手した常滑の急須。飾り気のない姿にも工芸の魅力がありますが、今回は普段使いの茶器です。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-15-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Black_Japanese_teapot_and_gyokuro.jpg",
    "credit": "Markus Kniebes",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 16,
    "name": "常滑焼の横手急須",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "実用の茶器として紹介された常滑焼の急須。土肌の風格と、何百年も前の古美術であることは別の話です。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-16-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Tokoname_kyusu_by_daxiang_stef.jpg",
    "credit": "daxiang stef",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 17,
    "name": "寿司店の贈答用湯呑み",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "龍の文様が立派ですが、出典によると寿司店の贈り物。写真の反対側には店名と電話番号が入っています。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-17-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Yunomi_M3002.jpg",
    "credit": "No machine-readable author provided. Fg2 assumed (based on copyright claims).",
    "license": "Public domain",
    "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 18,
    "name": "ダン・レオネットの蓋付き陶器",
    "era": "現代",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "古代の器のような金属的な肌は、銅を用いた釉薬の表現。スウェーデンの作家による工芸品で、今回は古美術とは分けています。作品の価値を否定する分類ではありません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-18-expert.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Copper_Matte_raku_bowl_with_lid_by_Dan_Leonette,_Gotland,_Sweden_1.jpg",
    "credit": "W.carter",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 19,
    "name": "横手の急須",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "横に持ち手のある急須の写真。ここでは日常の茶器として出題。作者や市場価格は判定していません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-19.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Ky%C5%ABsu-top_oblique_PNr%C2%B01030.jpg",
    "credit": "D-Kuru",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 20,
    "name": "古い箱から出てきた鍵",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "出典によれば古い木箱の中で見つかった鍵。錆びていても、秘密の宝箱の鍵とは限りません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-20.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Rusty_keys.jpg",
    "credit": "Spielvogel\n\nFor a gallery of some more of my uploaded pictures see: here.",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 21,
    "name": "こけし",
    "era": "製作年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "木の人形、こけしの写真。今回は民芸品としての出題です。個々の作家や希少性の鑑定ではありません。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-21.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kokeshi_20101105.jpg",
    "credit": "Batholith (talk)",
    "license": "Public domain",
    "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 22,
    "name": "花模様のガラス文鎮",
    "era": "製作年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "ガラスに花模様を閉じ込めた文鎮。美しい日用品だって、持ち主にとってはお宝です。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-22.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Blue,_white_and_red_millefiori_glass_paperweight_1.jpg",
    "credit": "W.carter",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 23,
    "name": "たち吉の徳利",
    "era": "製造年代不詳",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "お酒を注ぐための徳利の写真。美術館の徳利と見比べると、器を見る目が育つかも。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-23.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Tokkuri_Tachikichi.jpg",
    "credit": "Mr.ちゅらさん",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "expert": true,
    "focus": "38% 42%"
  },
  {
    "id": 24,
    "name": "店頭の陶製置物",
    "era": "2025年撮影",
    "location": "Wikimedia Commons掲載写真（所蔵先未確認）",
    "description": "ポーランドの店頭で撮影された招き猫などの置物。海を越えて、福を招いています。",
    "isTreasure": false,
    "image": "/apps/2026-09-25/images/question-24.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:20250828_ceramic_Maneki_neko_hedgehog_fox.jpg",
    "credit": "Abraham",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "expert": false,
    "focus": "50% 50%"
  },
  {
    "id": 25,
    "name": "清水焼の急須",
    "era": "18世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "普段使いの急須に見えますが、18世紀の清水焼。凹凸のある釉薬と色絵の装飾を持つ、美術館の収蔵作品です。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-25.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/47333",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  },
  {
    "id": 26,
    "name": "鉄と真鍮の銚子",
    "era": "18世紀",
    "location": "メトロポリタン美術館（ニューヨーク）",
    "description": "渋い金属の器は18世紀の日本の作品。美術館では茶器または酒器として登録されています。見慣れた道具の形にも、古い歴史が隠れています。",
    "isTreasure": true,
    "image": "/apps/2026-09-25/images/question-26.jpg",
    "source": "https://www.metmuseum.org/art/collection/search/60042",
    "credit": "The Metropolitan Museum of Art",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "expert": true,
    "focus": "50% 50%"
  }
];

// 出題形式を増やす場合は、選択肢・採点・正解表示をここに追加する。
const MODES = {
  treasure: {
    prompt:'これは、お宝？ ただの物？',
    choices:[{value:true,label:'お宝'},{value:false,label:'ただの物'}],
    evaluate:(question,answer)=>question.isTreasure === answer,
    correctLabel:question=>question.isTreasure ? 'お宝' : 'ただの物'
  }
};
const RANKS = [
  {min:10,name:'伝説の鑑定士',comment:'十品すべてを見抜く眼力。その目に、曇りなし。'},
  {min:9,name:'人間国宝見習い',comment:'あと一歩で伝説へ。見習いの看板、そろそろ外せそう。'},
  {min:7,name:'鑑定団の端っこ',comment:'その着眼点、なかなかのもの。次は真ん中の席を狙おう。'},
  {min:5,name:'骨董屋の常連',comment:'掘り出し物の気配がわかってきた。通うほどに、目は育つ。'},
  {min:3,name:'実家の床の間評論家',comment:'語る情熱は一人前。まずは床の間で、観察の特訓を。'},
  {min:0,name:'ただのリサイクルショップ客',comment:'好きな物に出会えたなら、それもお宝。目利きの旅はここから。'}
];
const $ = id => document.getElementById(id);
const mode = MODES.treasure;
const state = {questions:[],index:0,score:0,answered:false,phase:'title',results:[]};
function shuffled(items){
  const copy = [...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}

function renderImage(question){
  const area=$('question-art');
  area.classList.add('detail-view');
  const fallback=()=>{area.innerHTML='<div class="photo-placeholder">写真を準備中<span>表示されない場合は再読み込みしてください</span></div>';area.setAttribute('role','img');area.setAttribute('aria-label','出品写真の代替表示');$('image-note').textContent='実物写真';};
  fallback();
  if(question.image){
    const img=new Image();img.alt='鑑定する品';img.draggable=false;img.style.objectPosition=question.focus || '50% 50%';
    img.onload=()=>{if(state.questions[state.index]!==question)return;area.removeAttribute('role');area.removeAttribute('aria-label');area.replaceChildren(img);$('image-note').textContent='細部を拡大表示 · 全体は回答後';};
    img.onerror=()=>{if(state.questions[state.index]===question){fallback();area.querySelector('.photo-placeholder').firstChild.textContent='写真を読み込めませんでした';}};img.src=question.image;
  }
}
function screen(name){['title','quiz','result'].forEach(id=>$(id+'-screen').hidden=id!==name);window.scrollTo(0,0);}
// 上級は器の候補だけで構成。お宝の数も毎回変え、残り数で推測させない。
function selectQuestions(){
  const pool=QUESTIONS.filter(q=>q.expert);
  const treasureCount=4+Math.floor(Math.random()*3);
  return shuffled([
    ...shuffled(pool.filter(q=>q.isTreasure)).slice(0,treasureCount),
    ...shuffled(pool.filter(q=>!q.isTreasure)).slice(0,10-treasureCount)
  ]);
}
function start(){
  state.questions=selectQuestions();state.index=0;state.score=0;state.results=[];state.phase='quiz';
  screen('quiz');renderQuestion();
}
function renderQuestion(){
  state.answered=false;
  const q=state.questions[state.index];
  $('question-number').textContent=state.index+1;
  $('lot-number').textContent=String(state.index+1).padStart(2,'0');
  $('progress').value=state.index;renderImage(q);
  $('question-heading').textContent=mode.prompt;
  $('answers').replaceChildren(...mode.choices.map(choice=>{const b=document.createElement('button');b.className='answer';b.textContent=choice.label;b.onclick=()=>answer(choice.value);return b;}));
  $('question-heading').focus({preventScroll:true});
}
function answer(value){
  if(state.phase!=='quiz'||state.answered)return;
  state.answered=true;state.phase='feedback';
  const q=state.questions[state.index],correct=mode.evaluate(q,value);
  if(correct)state.score++;
  state.results.push(correct);
  document.querySelectorAll('.answer').forEach(button=>button.disabled=true);
  $('progress').value=state.index+1;
  $('judgment-stamp').textContent=correct?'○':'×';
  $('feedback-status').textContent=correct?'正解':'不正解';
  $('feedback-title').textContent=correct?'お見事！':'それはただの物です。';
  $('correct-label').textContent=mode.correctLabel(q);
  // 指定の失敗セリフと実際の正解を区別する補足。
  $('feedback-title').title=!correct&&q.isTreasure?'これは不正解時の決め台詞です。出品の正解は「お宝」です。':'';
  $('item-name').textContent=q.name;$('item-era').textContent=q.era;$('item-location').textContent=q.location;$('item-description').textContent=q.description;
  $('reveal-photo').src=q.image;$('reveal-photo').alt=q.name+'の全体写真';
  $('photo-source').href=q.source;$('photo-source').textContent='写真・作品の出典 ↗';
  $('photo-credit').textContent=q.credit;
  $('photo-license').href=q.licenseUrl;$('photo-license').textContent=q.license;
  $('next').textContent=state.index===state.questions.length-1?'結果を見る →':'次の問題へ →';
  $('feedback').showModal();$('next').focus({preventScroll:true});$('feedback').scrollTop=0;
}
function next(){
  if(state.phase!=='feedback')return;
  state.phase='transition';$('feedback').close();
  if(state.index+1<state.questions.length){state.index++;state.phase='quiz';renderQuestion();}
  else{state.phase='result';showResult();}
}
function showResult(){
  const rank=RANKS.find(item=>state.score>=item.min);
  $('result-difficulty').textContent='上級・細部鑑定の結果';
  $('score').textContent=state.score;$('rank').textContent=rank.name;$('rank-comment').textContent=rank.comment;
  $('result-marks').replaceChildren(...state.results.map((correct,i)=>{const mark=document.createElement('span');mark.textContent=correct?'○':'×';mark.setAttribute('aria-label',`${i+1}問目 ${correct?'正解':'不正解'}`);return mark;}));
  screen('result');$('rank').focus({preventScroll:true});
}
const heroPhoto = new Image();heroPhoto.src=QUESTIONS[0].image;heroPhoto.alt='メトロポリタン美術館所蔵の天目茶碗';heroPhoto.draggable=false;$('hero-object').replaceChildren(heroPhoto);
$('hero-source').href=QUESTIONS[0].source;
$('start').addEventListener('click',()=>{if(state.phase==='title')start();});
$('restart').addEventListener('click',()=>{if(state.phase==='result')start();});
$('next').addEventListener('click',next);
$('feedback').addEventListener('cancel',event=>event.preventDefault());
['dblclick','gesturestart'].forEach(type=>document.addEventListener(type,event=>event.preventDefault(),{passive:false}));
['contextmenu','dragstart'].forEach(type=>document.addEventListener(type,event=>{if(event.target.closest('button,.exhibit,.hero-art'))event.preventDefault();}));

// 写真のクレジットは回答後と一覧に表示し、問題中は名称を伏せる。
QUESTIONS.filter(q=>q.expert).forEach(q=>{
  const li=document.createElement('li');
  const source=document.createElement('a');source.href=q.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent=q.name;
  const license=document.createElement('a');license.href=q.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';license.textContent=q.license;
  li.append(source,document.createTextNode(' — '+q.credit+' / '),license);$('photo-credits').append(li);
});
