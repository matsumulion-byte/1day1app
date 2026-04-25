const asset = (p) => new URL(p, import.meta.url).toString();

const whoList = [
  "母に",
  "父に",
  "両親に",
  "自分に",
  "未来の自分に",
  "同期に",
  "会社の先輩に",
  "犬に",
  "近所の猫に",
  "推しに",
  "松村に",
  "なぜか上司に",
  "財布に",
  "冷蔵庫に",
  "Amazonに",
  "地元の友だちに",
  "コンビニ店員に",
  "来月の自分に",
];

const whatList = [
  "高級焼肉を",
  "温泉旅行を",
  "ゲーミングチェアを",
  "スタバカードを",
  "コンビニスイーツを",
  "高級おやつを",
  "ちゅ〜るを",
  "NISAを",
  "ラーメンを",
  "謎の美容家電を",
  "ちょっといい傘を",
  "新しい財布を",
  "でかい観葉植物を",
  "高級卵を",
  "業務用チーズを",
  "名前入りボールペンを",
  "課金石を",
  "焼き鳥50本を",
  "マッサージ券を",
  "一番高い定食を",
];

const howList = [
  "無言で予約する",
  "勢いで買う",
  "恩着せがましく渡す",
  "ちょっとだけ始める",
  "人間より先に買う",
  "さりげなく配る",
  "全部溶かす",
  "そっと献上する",
  "行ったつもりで提案する",
  "なぜか奢る",
  "深夜にポチる",
  "丁寧にラッピングする",
  "領収書だけ大事に保管する",
  "来月後悔する",
  "SNSには載せない",
  "3回払いにする",
  "一瞬で使い切る",
  "いい話っぽく語る",
  "自分への投資と言い張る",
  "財布と相談せず決める",
];

const comments = [
  "社会人としてはかなり正しい。",
  "初任給の使い方としてはギリギリ。",
  "来月の自分が泣く。",
  "でも、人生にはこういう日も必要。",
  "その判断、嫌いじゃない。",
  "堅実ではないが、記憶には残る。",
  "初任給の重みを軽やかに無視している。",
  "これはもう経済を回している。",
  "美談にするには少し無理がある。",
  "一周まわってちゃんとしてる。",
];

const $ = (id) => document.getElementById(id);

const whoEl = $("who");
const whatEl = $("what");
const howEl = $("how");
const startBtn = $("startBtn");
const resultModal = $("resultModal");
const resultText = $("resultText");
const commentEl = $("comment");
const closeBtn = $("closeBtn");

let isSpinning = false;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setRandomText() {
  whoEl.textContent = pick(whoList);
  whatEl.textContent = pick(whatList);
  howEl.textContent = pick(howList);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spinSlot(el, list, duration) {
  el.classList.add("spinning");

  const start = performance.now();

  while (performance.now() - start < duration) {
    el.textContent = pick(list);
    await sleep(55);
  }

  const finalText = pick(list);
  el.textContent = finalText;
  el.classList.remove("spinning");

  return finalText;
}

async function startRoulette() {
  if (isSpinning) return;

  isSpinning = true;
  startBtn.disabled = true;
  startBtn.textContent = "使用中…";
  resultModal.classList.add("hidden");

  setRandomText();

  const whoPromise = spinSlot(whoEl, whoList, 900);
  const whatPromise = spinSlot(whatEl, whatList, 1350);
  const howPromise = spinSlot(howEl, howList, 1800);

  const [who, what, how] = await Promise.all([
    whoPromise,
    whatPromise,
    howPromise,
  ]);

  const finalComment = pick(comments);

  resultText.textContent = `${who} ${what} ${how}`;
  commentEl.textContent = finalComment;
  resultModal.classList.remove("hidden");

  startBtn.disabled = false;
  startBtn.textContent = "もう一回使う";
  isSpinning = false;
}

startBtn.addEventListener("click", startRoulette);

closeBtn.addEventListener("click", () => {
  resultModal.classList.add("hidden");
});

resultModal.addEventListener("click", (e) => {
  if (e.target === resultModal) {
    resultModal.classList.add("hidden");
  }
});