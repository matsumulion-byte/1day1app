const asset = (p) => new URL(p, import.meta.url).toString();

const statueImage = document.getElementById("statueImage");
const wishInput = document.getElementById("wishInput");
const generateBtn = document.getElementById("generateBtn");
const sampleBtn = document.getElementById("sampleBtn");
const regenBtn = document.getElementById("regenBtn");
const resultSection = document.getElementById("resultSection");

const planNameEl = document.getElementById("planName");
const sloganEl = document.getElementById("slogan");
const titleNameEl = document.getElementById("titleName");
const scaleEl = document.getElementById("scale");
const commentEl = document.getElementById("comment");

statueImage.src = asset("./assets/clark.png");

const sampleWishes = [
  "朝ちゃんと起きたい",
  "痩せたい",
  "貯金したい",
  "部屋を片付けたい",
  "モテたい",
  "仕事を早く終わらせたい",
  "夜更かしをやめたい",
  "ゲームをやりすぎないようにしたい",
  "お菓子を減らしたい",
  "毎日ちゃんと風呂に入りたい",
];

const keywordMap = [
  { keys: ["朝", "起き", "早起き"], core: "黎明", action: "覚醒", alt: "明日" },
  { keys: ["寝", "睡眠", "夜更かし"], core: "休息", action: "就寝", alt: "安眠" },
  { keys: ["痩せ", "ダイエット", "脂肪"], core: "軽量", action: "余剰排除", alt: "未来" },
  { keys: ["金", "貯金", "節約"], core: "蓄財", action: "富の確保", alt: "安定" },
  { keys: ["部屋", "片付け", "掃除", "整理"], core: "秩序", action: "混沌鎮圧", alt: "平穏" },
  { keys: ["仕事", "業務", "残業"], core: "任務", action: "業務制圧", alt: "解放" },
  { keys: ["恋", "モテ", "彼女", "彼氏"], core: "魅力", action: "求愛戦略", alt: "未来" },
  { keys: ["風呂", "入浴"], core: "清浄", action: "入浴遂行", alt: "品格" },
  { keys: ["菓子", "おやつ", "食べ", "食事"], core: "節制", action: "過剰摂取制限", alt: "自制" },
  { keys: ["ゲーム"], core: "戦略", action: "娯楽統制", alt: "現実" },
  { keys: ["勉強", "英語", "資格"], core: "修練", action: "知識獲得", alt: "成長" },
  { keys: ["筋トレ", "運動"], core: "鍛錬", action: "肉体開発", alt: "進化" },
];

const prefixes = [
  "超",
  "新",
  "極",
  "全力",
  "大",
  "真",
  "次世代",
  "完全",
  "",
  "",
];

const planSuffixes = [
  "計画",
  "構想",
  "戦線",
  "制圧令",
  "革命",
  "開拓史",
  "再建計画",
  "強化月間",
];

const sloganTemplates = [
  "{core}を征す者、{alt}を征す",
  "{core}なくして、{alt}なし",
  "{action}せよ、さらば{alt}は開かれん",
  "{core}こそ、{alt}の第一歩である",
  "{core}を断ち、{alt}を得よ",
  "{action}は、すべての始まりである",
  "{core}を整えよ。道はおのずと開かれる",
];

const titleTemplates = [
  "{core}の挑戦者",
  "{core}の開拓者",
  "{core}の実行者",
  "{core}の継承者",
  "{core}の観測者",
  "{core}の改革者",
  "{core}の先導者",
];

const scales = [
  "まずは明日",
  "町内規模",
  "市区町村級",
  "国内級",
  "世界級",
  "宇宙級",
  "思っていたより普通",
];

const comments = [
  "志は立派だが、まず行動せよ。",
  "その決意、三日もてば上出来である。",
  "大志は認める。実行は君次第だ。",
  "まずは身の回りから制圧したまえ。",
  "その理想、嫌いではない。",
  "志だけは十分に高い。",
  "現実との交渉も忘れるな。",
  "野望に見合う生活習慣を整えたまえ。",
  "目標は壮大だが、今日は早く寝るべきだ。",
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickTheme(input) {
  for (const entry of keywordMap) {
    if (entry.keys.some((key) => input.includes(key))) {
      return entry;
    }
  }
  return { core: "意志", action: "前進", alt: "未来" };
}

function fillTemplate(template, theme) {
  return template
    .replaceAll("{core}", theme.core)
    .replaceAll("{action}", theme.action)
    .replaceAll("{alt}", theme.alt);
}

function createPlanName(theme) {
  const prefix = randomItem(prefixes);
  const suffix = randomItem(planSuffixes);
  return `${prefix}${theme.core}${suffix}`;
}

function generateAmbition(rawInput) {
  const input = rawInput.trim();
  const theme = pickTheme(input);

  return {
    planName: createPlanName(theme),
    slogan: fillTemplate(randomItem(sloganTemplates), theme),
    titleName: fillTemplate(randomItem(titleTemplates), theme),
    scale: randomItem(scales),
    comment: randomItem(comments),
  };
}

function renderResult(result) {
  planNameEl.textContent = result.planName;
  sloganEl.textContent = result.slogan;
  titleNameEl.textContent = result.titleName;
  scaleEl.textContent = result.scale;
  commentEl.textContent = result.comment;
  resultSection.classList.remove("is-hidden");
}

function getInputValue() {
  const value = wishInput.value.trim();
  if (value) return value;

  const sample = randomItem(sampleWishes);
  wishInput.value = sample;
  return sample;
}

function runGenerate() {
  const input = getInputValue();
  const result = generateAmbition(input);
  renderResult(result);
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

generateBtn.addEventListener("click", runGenerate);

regenBtn.addEventListener("click", () => {
  const input = getInputValue();
  renderResult(generateAmbition(input));
});

sampleBtn.addEventListener("click", () => {
  wishInput.value = randomItem(sampleWishes);
  wishInput.focus();
});

wishInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    runGenerate();
  }
});