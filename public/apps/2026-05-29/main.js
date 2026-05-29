const ASSET_BASE = "/apps/2026-05-29";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const form = document.getElementById("form");
const nameInput = document.getElementById("nameInput");
const typeSelect = document.getElementById("typeSelect");
const result = document.getElementById("result");
const rerollButton = document.getElementById("rerollButton");

const choujin = document.getElementById("choujin");
const numberText = document.getElementById("numberText");
const stamp = document.getElementById("stamp");
const visualCaption = document.getElementById("visualCaption");
const heroName = document.getElementById("heroName");
const birthplace = document.getElementById("birthplace");
const power = document.getElementById("power");
const move = document.getElementById("move");
const weakness = document.getElementById("weakness");
const phrase = document.getElementById("phrase");
const feature = document.getElementById("feature");
const description = document.getElementById("description");
const judge = document.getElementById("judge");

const types = ["slime", "fire", "ghost", "box", "reverse"];

const typeLabels = {
  slime: "ぬめぬめ",
  fire: "もえている",
  ghost: "とうめい",
  box: "やたら四角い",
  reverse: "さかさまっぽい"
};

const nameSeeds = [
  "ヌメリ",
  "サカサマ",
  "マブシイ",
  "ゴロゴロ",
  "カクカク",
  "ドロドロ",
  "モヤモヤ",
  "ツルツル",
  "バチバチ",
  "フニャフニャ",
  "ガチガチ",
  "ベタベタ"
];

const suffixes = [
  "マン",
  "ダー",
  "ゴン",
  "ボーイ",
  "マスク",
  "キング",
  "X",
  "Z",
  "ファイヤー",
  "デビル"
];

const birthplaces = [
  "ぬるい湖",
  "夜だけ開く沼",
  "風の強い砂場",
  "地下3階の泉",
  "すごく浅い海",
  "斜めに沈む島",
  "月の裏の脱衣所",
  "誰も見ていない滝",
  "半分だけ光る洞窟",
  "くもりがちな火山",
  "音が遅れてくる森",
  "右だけ深い谷"
];

const phrases = [
  "それはまだ石だ",
  "月がぬるい",
  "おれの足音を聞け",
  "いまのは沼の判断だ",
  "勝ったら水になる",
  "まだ横を向くな",
  "そこに貝殻を置くな",
  "おまえの影が多い",
  "空がやわらかい",
  "その角度では遅い",
  "地面の返事を待て",
  "俺より先に丸くなるな"
];

const typeData = {
  slime: {
    moves: ["ぬめり返し", "地獄の横すべり", "三段ぬるり落とし", "沼地ラリアット", "粘液ブリッジ"],
    weaknesses: ["乾いたわかめ", "吸水性の高い布", "よく乾いた風", "熱すぎる石", "さらさらの砂"],
    features: ["怒ると肩から小さい泡が出る", "走ると少し遅れて影がついてくる", "勝つとだいたい少し溶ける", "握手すると相手が少し困る"],
    captions: ["ぬめり超人", "沼から来たやつ", "つかめない系"]
  },
  fire: {
    moves: ["火柱ドロップ", "灼熱ヘッドバスター", "赤熱ぐるぐる投げ", "マグマぎりぎり固め", "焦げ目チョップ"],
    weaknesses: ["ぬれた雑巾", "夕立", "すごく冷えた金属", "氷っぽい視線", "水たまり"],
    features: ["くしゃみで火花が出る", "左肩だけずっと熱い", "気合いを入れると足元が少し焦げる", "近づくとだいたい暑い"],
    captions: ["燃えすぎ超人", "火気厳禁", "だいぶ熱い"]
  },
  ghost: {
    moves: ["透明チョップ", "気配しばり", "消えたつもりタックル", "見えてるのに見えない投げ", "半透明スープレックス"],
    weaknesses: ["白い壁", "フラッシュ", "濃いインク", "夜の自販機", "集合写真"],
    features: ["明るい場所では少し薄くなる", "写真にうつると端だけ強い", "逆光だと急にかっこいい", "本人だけ隠れているつもり"],
    captions: ["存在あいまい", "半分いる", "だいたい見えてる"]
  },
  box: {
    moves: ["直角クラッシュ", "四角四面ボンバー", "立方体ドロップ", "箱型コーナー固め", "カド打ちアタック"],
    weaknesses: ["丸い石", "やわらかいクッション", "急カーブ", "流線形のもの全部", "曲がった道"],
    features: ["横を向いてもあまり変わらない", "寝ると完全に箱に見える", "正面から見るとだいぶ面積がある", "角でだいたい勝負する"],
    captions: ["角ばり超人", "だいたい箱", "直角主義"]
  },
  reverse: {
    moves: ["逆さま抱きつき", "天地さかさま落とし", "反転ブリッジクラッチ", "うしろ向き大回転", "逆重力キック"],
    weaknesses: ["まっすぐな床", "水平器", "右左の説明", "普通の階段", "上下がはっきりした図"],
    features: ["試合前に一度だけ3cm浮く", "気づくと天井を見ている", "勝つと着地だけ下手になる", "重力と仲が悪い"],
    captions: ["上下不明", "着地が下手", "逆向きの才能"]
  }
};

const stamps = [
  "採用!",
  "惜しい!",
  "強そう!",
  "変!",
  "再投稿!",
  "妙に良い!"
];

const judges = [
  "採用！ただし足が弱い。",
  "名前だけで押し切っている感じが良い。",
  "弱点が具体的すぎるので逆に信頼できる。",
  "見た目のわりに超人強度が高すぎる。",
  "小さく載せたら人気が出そう。",
  "必殺技の意味は不明だが勢いはある。",
  "編集部内で少し揉めるタイプ。",
  "来週の端っこに載せたい。",
  "強いのか弱いのか最後までわからない。",
  "応募ハガキの熱量だけは伝わる。"
];

const descriptionTemplates = [
  "{name}は、{birthplace}で生まれた{typeLabel}超人である。{feature}ため見た目の印象は強いが、{weakness}には昔から勝てない。",
  "{name}の必殺技は{move}。本人は無敵だと思っているが、{weakness}を見ると急に声が小さくなる。",
  "{feature}という変な特性を持つ{name}。{move}を決める瞬間だけはかなり強そうに見える。",
  "{birthplace}からやってきた{name}は、{typeLabel}な体質を活かして戦う。弱点は{weakness}。そこだけ妙に現実的である。"
];

let lastType = "slime";

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, "");
}

function makeHeroName(baseName) {
  const name = normalizeName(baseName);

  if (!name) {
    return `${pick(nameSeeds)}${pick(suffixes)}`;
  }

  return `${name}${pick(suffixes)}`;
}

function makeProfile() {
  const selected = typeSelect.value;
  const type = selected === "random" ? pick(types) : selected;
  const data = typeData[type];

  const name = makeHeroName(nameInput.value);
  const place = pick(birthplaces);
  const moveName = pick(data.moves);
  const weak = pick(data.weaknesses);
  const feat = pick(data.features);
  const powerValue = `${randomInt(8, 999)}万パワー`;
  const phraseText = pick(phrases);
  const caption = pick(data.captions);

  const desc = pick(descriptionTemplates)
    .replaceAll("{name}", name)
    .replaceAll("{birthplace}", place)
    .replaceAll("{typeLabel}", typeLabels[type])
    .replaceAll("{feature}", feat)
    .replaceAll("{weakness}", weak)
    .replaceAll("{move}", moveName);

  return {
    type,
    name,
    place,
    moveName,
    weak,
    feat,
    powerValue,
    phraseText,
    caption,
    desc,
    number: String(randomInt(1, 999)).padStart(3, "0"),
    stamp: pick(stamps),
    judge: pick(judges)
  };
}

function renderParts(profile) {
  choujin.className = `choujin ${profile.type}`;

  const variants = {
    "--head-scale": (randomInt(86, 120) / 100).toString(),
    "--body-scale": (randomInt(88, 116) / 100).toString()
  };

  Object.entries(variants).forEach(([key, value]) => {
    choujin.style.setProperty(key, value);
  });

  const head = choujin.querySelector(".head");
  const body = choujin.querySelector(".body");
  const leftArm = choujin.querySelector(".arm-left");
  const rightArm = choujin.querySelector(".arm-right");
  const leftLeg = choujin.querySelector(".leg-left");
  const rightLeg = choujin.querySelector(".leg-right");
  const mark = choujin.querySelector(".mark");

  const armTilt = randomInt(8, 32);
  const legSpread = randomInt(46, 62);

  leftArm.style.transform = `rotate(${armTilt}deg)`;
  rightArm.style.transform = `rotate(-${randomInt(8, 32)}deg)`;

  leftLeg.style.left = `${legSpread}px`;
  rightLeg.style.right = `${legSpread}px`;

  head.style.transform = `rotate(${profile.type === "reverse" ? 180 : randomInt(-8, 8)}deg) scale(${randomInt(92, 112) / 100})`;
  body.style.transform = `scaleX(${randomInt(90, 112) / 100})`;

  const markShapes = [
    "polygon(50% 0, 62% 36%, 100% 36%, 69% 58%, 82% 100%, 50% 74%, 18% 100%, 31% 58%, 0 36%, 38% 36%)",
    "circle(50% at 50% 50%)",
    "polygon(50% 0, 100% 100%, 0 100%)",
    "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"
  ];

  mark.style.clipPath = pick(markShapes);
}

function render(profile) {
  result.hidden = false;

  numberText.textContent = profile.number;
  stamp.textContent = profile.stamp;
  visualCaption.textContent = profile.caption;
  heroName.textContent = profile.name;
  birthplace.textContent = profile.place;
  power.textContent = profile.powerValue;
  move.textContent = profile.moveName;
  weakness.textContent = profile.weak;
  phrase.textContent = `「${profile.phraseText}」`;
  feature.textContent = profile.feat;
  description.textContent = profile.desc;
  judge.textContent = profile.judge;

  renderParts(profile);

  lastType = profile.type;

  result.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function generate() {
  const profile = makeProfile();
  render(profile);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

rerollButton.addEventListener("click", () => {
  generate();
});

window.addEventListener("DOMContentLoaded", () => {
  nameInput.focus();
});