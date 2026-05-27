const ASSET_BASE = "/apps/2026-05-27";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const personImages = [
  "assets/person-01.png",
  "assets/person-02.png",
  "assets/person-03.png",
  "assets/person-04.png",
  "assets/person-05.png",
  "assets/person-06.png"
];

const fiveWords = [
  "花の色",
  "春の夢",
  "秋の夕",
  "袖の露",
  "月の影",
  "山桜",
  "露の身を",
  "風の音",
  "恋の道",
  "夜半の月",
  "有明の",
  "朝ぼらけ",
  "白露の",
  "花ぞ散る",
  "人知れず",
  "忘らるる",
  "しのぶれど",
  "ながめせし",
  "あしびきの",
  "ひさかたの",
  "ちはやぶる",
  "あまつ風",
  "玉の緒よ",
  "逢ふことの",
  "わが袖は",
  "君がため",
  "世の中よ",
  "山の端に",
  "峰の雲",
  "草の庵",
  "岩の上",
  "夢の世に",
  "草枕",
  "夕されば",
  "水の面",
  "雲の峰",
  "野辺の露",
  "松の声",
  "道の辺に",
  "影ふかき",
  "世を捨てて",
  "あだし野の",
  "名にし負はば",
  "かくとだに",
  "み吉野の",
  "難波江の",
  "淡路島",
  "滝の音",
  "沖つ波"
];

const sevenWords = [
  "うつろひにけり",
  "夢にまぎるる",
  "人知れぬまま",
  "山かげ遠き",
  "月ぞかなしき",
  "袖に宿れる",
  "契りし雲の",
  "影はうつろふ",
  "忘れじものを",
  "夜半の白露",
  "あらぬ契りの",
  "恋ふる小舟の",
  "野辺に消えけり",
  "風に乱るる",
  "花をながむる",
  "秋ぞかなしき",
  "春を待つらむ",
  "夢路たどりて",
  "露にぬれつつ",
  "空に消えゆく",
  "人を待つらむ",
  "面影ばかり",
  "袖のみ濡れて",
  "涙こぼるる",
  "夜ぞ更けにける",
  "思ひそめにし",
  "雲ゐにまがふ",
  "峰にかかれる",
  "草葉に宿る",
  "名こそ惜しけれ",
  "いかに久しき",
  "ながめせしまに",
  "夢にも見えず",
  "人目も知らで",
  "心もとなき",
  "あはれとも見よ",
  "身をつくしても",
  "濡れにぞ濡れし",
  "たれをかも知る",
  "色に出でにけり",
  "恋ぞつもりて",
  "波こす袖の",
  "世を思ふゆゑ",
  "月を待ちける",
  "花よりほかに",
  "山風ぞ吹く",
  "秋の夜すがら",
  "春の名残を",
  "行方知られず",
  "声ぞ聞こゆる"
];

const poets = [
  "詠み人知らず",
  "松村朝臣",
  "名無し法師",
  "夢見大納言",
  "袖濡中納言",
  "山辺少将",
  "露乃内侍",
  "風待入道",
  "月待法師",
  "花散少納言",
  "雲隠大臣",
  "夜半式部"
];

const comments = [
  "いとあはれ",
  "もののあはれあり",
  "余情ふかし",
  "袖ぬれぬべし",
  "月を待つべし",
  "恋の道ふかし",
  "春の名残あり",
  "秋の声きこゆ",
  "意味は知らず",
  "風だけは吹く",
  "心ばかり古し",
  "歌とは言ひがたし",
  "されど趣あり",
  "夢のごとし",
  "おぼつかなし"
];

const poemEl = document.getElementById("poem");
const personImageEl = document.getElementById("personImage");
const poetEl = document.getElementById("poet");
const commentEl = document.getElementById("comment");
const poemCard = document.getElementById("poemCard");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const toast = document.getElementById("toast");

let currentLines = [];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildPoem() {
  return [
    pick(fiveWords),
    pick(sevenWords),
    pick(fiveWords),
    pick(sevenWords),
    pick(sevenWords)
  ];
}

function renderPoem(lines) {
  currentLines = lines;

  poemEl.innerHTML = lines.map((line) => `<p>${line}</p>`).join("");
  poetEl.textContent = pick(poets);
  commentEl.textContent = pick(comments);
  personImageEl.src = asset(pick(personImages));

  poemCard.classList.remove("changed");
  void poemCard.offsetWidth;
  poemCard.classList.add("changed");
}

function generate() {
  renderPoem(buildPoem());
}

async function copyPoem() {
  const text = [
    ...currentLines,
    "",
    poetEl.textContent,
    commentEl.textContent
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("写しました");
  } catch (error) {
    showToast("写せませんでした");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1300);
}

generateBtn.addEventListener("click", generate);
copyBtn.addEventListener("click", copyPoem);

document.addEventListener("dblclick", (event) => {
  event.preventDefault();
}, { passive: false });

renderPoem(buildPoem());