const asset = (p) => new URL(p, import.meta.url).toString();

const areaInput = document.getElementById("areaInput");
const specialtyInput = document.getElementById("specialtyInput");
const generateBtn = document.getElementById("generateBtn");
const retryBtn = document.getElementById("retryBtn");

const inputPanel = document.getElementById("inputPanel");
const resultPanel = document.getElementById("resultPanel");

const stamp = document.getElementById("stamp");
const characterEmoji = document.getElementById("characterEmoji");
const characterName = document.getElementById("characterName");
const characterCopy = document.getElementById("characterCopy");
const motifText = document.getElementById("motifText");
const personalityText = document.getElementById("personalityText");
const catchphraseText = document.getElementById("catchphraseText");
const skillText = document.getElementById("skillText");
const weaknessText = document.getElementById("weaknessText");
const commentsList = document.getElementById("commentsList");

const localMeter = document.getElementById("localMeter");
const looseMeter = document.getElementById("looseMeter");
const goodsMeter = document.getElementById("goodsMeter");
const riskMeter = document.getElementById("riskMeter");

const motifs = [
  { name: "犬", emoji: "🐶" },
  { name: "猿", emoji: "🐵" },
  { name: "鳥", emoji: "🐦" },
  { name: "船", emoji: "⛵" },
  { name: "車", emoji: "🚗" },
  { name: "太陽", emoji: "☀️" },
  { name: "山", emoji: "⛰️" },
  { name: "温泉", emoji: "♨️" },
  { name: "魚", emoji: "🐟" },
  { name: "米俵", emoji: "🌾" },
  { name: "城", emoji: "🏯" },
  { name: "電車", emoji: "🚃" },
  { name: "たぬき", emoji: "🦝" },
  { name: "猫", emoji: "🐱" },
  { name: "だるま", emoji: "🔴" },
  { name: "祭り", emoji: "🏮" }
];

const personalities = [
  "地元愛が強すぎて話が長い",
  "観光客には優しいが、地元民には少し厳しい",
  "名産品の話になると急に早口になる",
  "写真写りを異常に気にする",
  "町内会でだけ妙に顔が広い",
  "公式キャラになりたい気持ちが前に出すぎている",
  "子ども人気より物販展開を気にしている",
  "イベントに呼ばれる前提で予定を空けている",
  "近隣自治体を勝手にライバル視している",
  "広報資料では穏やかだが、SNSでは強い",
  "地元のことを知っているようで、微妙に浅い",
  "着ぐるみ化された後の動線まで考えている",
  "語尾を流行らせようとして必死",
  "何を聞かれても最終的に地元の話に戻す",
  "町の未来を背負っているつもりでいる"
];

const catchphrases = [
  "オラの地元だとそうだ",
  "ご来光ー！",
  "んだんだ",
  "地元じゃそういうもんだ",
  "昔っからそうだべ",
  "土地がそう言ってる",
  "町内会もそう言ってた",
  "駅前では有名だ",
  "ばあちゃんも言ってた",
  "地元の風が吹いてきた",

  "ほうだほうだ",
  "せやせや",
  "そうじゃそうじゃ",
  "だべだべ",
  "よかよか",
  "なんもなんも",
  "ええんでないかい",
  "まんずまんず",

  "ありがたやー！",
  "開運開運！",
  "商売繁盛！",
  "五穀豊穣！",
  "無病息災！",
  "家内安全！",
  "大漁大漁！",
  "どっこい豊作！",

  "名物でございます",
  "お土産にどうぞ",
  "一個買ってけ",
  "冷めても名物",
  "できたてが正義",
  "地元の味がする",
  "噛むほど郷土",
  "だいたい名産",
  "これも特産",

  "わっしょいわっしょい",
  "そいやそいや",
  "どっこいしょー",
  "よいさよいさ",
  "えんやこら",
  "ほいさっさ",
  "あ、よいしょ",
  "祭りじゃ祭りじゃ",

  "じもじも",
  "ふるふる",
  "まちまち",
  "ローカル〜",
  "ご当地〜",
  "しみじみ〜",
  "どすこいローカル",

  "地域のためです",
  "観光課に確認済み",
  "予算の範囲内です",
  "広報的にはアリ",
  "商工会もにっこり",
  "公式見解です",
  "これは町の総意です",
  "稟議はこれからです",
  "条例にはありません",
  "活性化してきた",

  "地元からは逃げられない",
  "名物にしてやる",
  "町が見ている",
  "観光客の匂いがする",
  "一度来たら町民だ",
  "覚えて帰れ",
  "忘れた頃にまた来る",
  "地元愛、足りてるか"
];

const nameEndings = [
  "まる",
  "ちゃん",
  "どん",
  "ぴょん",
  "のすけ",
  "太郎",
  "係長",
  "先生",
  "ざむらい",
  "ンヌ",
  "坊",
  "大明神",
  "親方",
  "将軍",
  "先輩"
];

const skills = [
  "{specialty}バリア",
  "{area}式ローリング",
  "ご当地スマイル",
  "町内会アタック",
  "観光客ホールド",
  "{specialty}フラッシュ",
  "地元愛ビーム",
  "駅前ダッシュ",
  "名産スプラッシュ",
  "ふるさと納税キック",
  "商店街パレード",
  "謎の地域活性ポーズ"
];

const weaknesses = [
  "横から見ると何かわからない",
  "着ぐるみにすると歩きづらい",
  "近隣自治体のキャラとかぶっている",
  "地元民ほどピンと来ていない",
  "子どもが少し泣く",
  "語尾が定着しない",
  "商標確認で揉めそう",
  "暑さに弱い",
  "SNS担当が扱いに困る",
  "名産品に寄せすぎている",
  "イベントが雨だと急に弱い",
  "説明しないとモチーフが伝わらない",
  "物販にすると形が崩れる",
  "プロフィールが毎年増える"
];

const verdicts = [
  {
    label: "即採用",
    min: 260,
    text: "会議室がざわついたあと、なぜか全員が納得しました。"
  },
  {
    label: "条件付き採用",
    min: 210,
    text: "方向性は悪くありません。目を少し優しくすれば通ります。"
  },
  {
    label: "再提出",
    min: 160,
    text: "地元愛はありますが、公式キャラとしては説明が必要です。"
  },
  {
    label: "一旦持ち帰り",
    min: 110,
    text: "悪くはないのですが、誰も責任を取りたがっていません。"
  },
  {
    label: "広報部ストップ",
    min: 0,
    text: "SNSでは話題になります。ただし、話題になり方が危険です。"
  }
];

const commentTemplates = {
  tourism: [
    "観光課：<b>{motif}</b>要素は目を引きますが、<b>{specialty}</b>との関係性をもう少し整理したいです。",
    "観光課：写真スポットにはなりそうです。ただ、なぜ<b>{motif}</b>なのかは聞かれます。",
    "観光課：<b>{area}</b>らしさはあります。ありますが、説明パネルは必要です。"
  ],
  commerce: [
    "商工会：グッズ展開は可能です。特にキーホルダーはいけます。",
    "商工会：<b>{specialty}</b>との連動企画は作りやすいです。",
    "商工会：物販の匂いがします。これは悪くありません。"
  ],
  mayor: [
    "市長：目が少し怖いですね。",
    "市長：私は好きですが、市民の声も聞きましょう。",
    "市長：名前はいいですね。名前だけはかなりいいです。"
  ],
  pr: [
    "広報：SNSでは伸びそうです。理由はよくわかりません。",
    "広報：炎上まではしないと思いますが、変な引用はされそうです。",
    "広報：プロフィールに余白があるので、後から設定を足せます。"
  ]
};

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function cleanText(text, fallback) {
  const value = text.trim();
  return value || fallback;
}

function shortPart(text, max = 3) {
  const normalized = text.replace(/\s+/g, "");
  return normalized.slice(0, max);
}

function fillTemplate(template, data) {
  return template
    .replaceAll("{area}", data.area)
    .replaceAll("{specialty}", data.specialty)
    .replaceAll("{motif}", data.motif.name);
}

function makeCharacterName(area, specialty, motif) {
  const areaPart = shortPart(area, 3);
  const specialtyPart = shortPart(specialty, 3);
  const motifPart = Math.random() < 0.45 ? motif.name : "";
  const ending = pick(nameEndings);

  const patterns = [
    `${areaPart}${specialtyPart}${ending}`,
    `${specialtyPart}${motifPart}${ending}`,
    `${areaPart}${motifPart}${ending}`,
    `${specialtyPart}の${areaPart}${ending}`,
    `${areaPart}の${specialtyPart}${ending}`
  ];

  return pick(patterns);
}

function makeCopy(area, specialty, motif, personality) {
  const copies = [
    `${specialty}と${motif.name}の力で${area}を盛り上げる、公式志望キャラ。`,
    `${area}の空気をまとった、${specialty}生まれの${motif.name}系キャラ。`,
    `${specialty}を背負いすぎた、${area}の地域活性担当。`,
    `${area}の未来を勝手に任された、${motif.name}モチーフの謎キャラ。`,
    `${personality}、${area}発のご当地キャラ候補。`
  ];

  return pick(copies);
}

function getScores() {
  const local = randomScore(45, 98);
  const loose = randomScore(35, 96);
  const goods = randomScore(30, 94);
  const risk = randomScore(5, 88);

  return { local, loose, goods, risk };
}

function randomScore(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getVerdict(scores) {
  const total = scores.local + scores.loose + scores.goods - Math.floor(scores.risk * 0.75);
  return verdicts.find((v) => total >= v.min) || verdicts[verdicts.length - 1];
}

function renderMeters(scores) {
  requestAnimationFrame(() => {
    localMeter.style.width = `${scores.local}%`;
    looseMeter.style.width = `${scores.loose}%`;
    goodsMeter.style.width = `${scores.goods}%`;
    riskMeter.style.width = `${scores.risk}%`;
  });
}

function makeComments(data) {
  return [
    fillTemplate(pick(commentTemplates.tourism), data),
    fillTemplate(pick(commentTemplates.commerce), data),
    fillTemplate(pick(commentTemplates.mayor), data),
    fillTemplate(pick(commentTemplates.pr), data)
  ];
}

function generate() {
  const area = cleanText(areaInput.value, "どこかの町");
  const specialty = cleanText(specialtyInput.value, "謎の名物");

  const motif = pick(motifs);
  const personality = pick(personalities);
  const catchphrase = pick(catchphrases);
  const name = makeCharacterName(area, specialty, motif);
  const copy = makeCopy(area, specialty, motif, personality);
  const skill = fillTemplate(pick(skills), { area, specialty, motif });
  const weakness = pick(weaknesses);
  const scores = getScores();
  const verdict = getVerdict(scores);

  const data = {
    area,
    specialty,
    motif,
    personality,
    catchphrase,
    name,
    copy
  };

  characterEmoji.textContent = motif.emoji;
  characterName.textContent = name;
  characterCopy.textContent = copy;
  motifText.textContent = motif.name;
  personalityText.textContent = personality;
  catchphraseText.textContent = `「${catchphrase}」`;
  skillText.textContent = skill;
  weaknessText.textContent = weakness;

  stamp.textContent = verdict.label;

  commentsList.innerHTML = "";
  const comments = makeComments(data);
  comments.push(`審査結果：${verdict.text}`);

  comments.forEach((comment) => {
    const li = document.createElement("li");
    li.innerHTML = comment;
    commentsList.appendChild(li);
  });

  localMeter.style.width = "0%";
  looseMeter.style.width = "0%";
  goodsMeter.style.width = "0%";
  riskMeter.style.width = "0%";

  inputPanel.classList.add("hidden");
  resultPanel.classList.remove("hidden");

  renderMeters(scores);
}

function retry() {
  resultPanel.classList.add("hidden");
  inputPanel.classList.remove("hidden");
}

generateBtn.addEventListener("click", generate);
retryBtn.addEventListener("click", retry);

areaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") specialtyInput.focus();
});

specialtyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") generate();
});