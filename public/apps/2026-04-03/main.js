const asset = (p) => new URL(p, import.meta.url).toString();

const QUESTIONS = [
  {
    key: "place",
    text: "休日、自然とやりたくなるのは？",
    choices: {
      A: "外に出て歩き回る",
      B: "屋内でじっくり過ごす",
    },
  },
  {
    key: "target",
    text: "つい気になって見てしまうのは？",
    choices: {
      A: "街や風景の違和感",
      B: "モノや表現の細部",
    },
  },
  {
    key: "style",
    text: "趣味にするなら、しっくりくるのは？",
    choices: {
      A: "観察して発見する",
      B: "集める・作る・味わう",
    },
  },
];

const RESULTS = {
  AAA: {
    title: "トマソン探し",
    desc: "役目を失ったのに残されている階段や扉に惹かれるタイプです。意味が消えたものを、ただの無駄で終わらせず面白がれる視点があります。散歩の途中でひとつ見つけるだけで、その日の外出が少しだけ豊かになります。",
    step: "次に外へ出たら、行き先のない階段か、壁に半分埋まった扉を探してください。",
  },
  AAB: {
    title: "暗渠探訪",
    desc: "地上から姿を消した川の痕跡を追うのに向いています。街を見ながら、まっすぐではない道や妙な高低差に気づける人です。地図と現地がつながった瞬間にかなり満足できます。",
    step: "地図アプリで近所の不自然に曲がる道を見つけて、実際に歩いてみてください。",
  },
  ABA: {
    title: "工場夜景鑑賞",
    desc: "巨大で無機質なものを、ちゃんとロマンとして受け取れるタイプです。配管、煙突、規則的な光の並びを見ていると妙に落ち着くはずです。遠くから眺めるだけでも成立するのが良いところです。",
    step: "夜、地図で工業地帯や倉庫街を見つけて、光っていそうな場所を保存してください。",
  },
  ABB: {
    title: "鉱物採集",
    desc: "小さいのに情報量が多いものを、いつまでも見ていられるタイプです。色、透明感、結晶の形に静かに興奮できるので、石を石のままで終わらせません。集め始めると、かなり素直に沼に入れます。",
    step: "まずは鉱物標本の画像を10枚くらい見て、一番気になる石の名前をひとつ覚えてください。",
  },
  BAA: {
    title: "団地鑑賞",
    desc: "生活感と設計の規則性が同時にある風景に惹かれるタイプです。同じようで少しずつ違う窓やベランダを見比べても飽きません。人の暮らしの気配と構造の美しさを、ちょうどよく楽しめます。",
    step: "地図で大きめの団地を探して、外観写真を見比べながら気になる棟を決めてください。",
  },
  BAB: {
    title: "純喫茶巡り",
    desc: "コーヒーそのものよりも、空間の空気や時間の積み重なりに惹かれるタイプです。少し古い椅子、メニューの書体、店内の照明みたいな要素をちゃんと味わえます。ひとりで静かに楽しめる趣味としてかなり優秀です。",
    step: "近所で『喫茶店』表記の店を探して、チェーンではない店をひとつ保存してください。",
  },
  BBA: {
    title: "短歌",
    desc: "気持ちや景色を短く切り取るのに向いています。見たものをそのまま長く話すより、少ない言葉に置き直すほうがしっくりくる人です。うまく作れなくても、世界の見え方が少し変わるタイプの趣味です。",
    step: "今日見たものをひとつだけ選んで、五・七・五・七・七っぽく言い換えてみてください。",
  },
  BBB: {
    title: "ZINE作り",
    desc: "好きなものを自分の手でまとめたいタイプです。完璧な作品を作るより、自分の偏りを編集して形にすることに向いています。写真3枚と短い文章だけでも、十分に趣味として始められます。",
    step: "スマホの写真を3枚選んで、『今日の気になるもの』というタイトルをつけて並べてみてください。",
  },
};

const startScreen = document.getElementById("startScreen");
const questionScreen = document.getElementById("questionScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const shareBtn = document.getElementById("shareBtn");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const questionText = document.getElementById("questionText");
const choiceA = document.getElementById("choiceA");
const choiceB = document.getElementById("choiceB");

const resultTitle = document.getElementById("resultTitle");
const resultDesc = document.getElementById("resultDesc");
const resultStep = document.getElementById("resultStep");

let currentQuestionIndex = 0;
let answers = [];

function showScreen(screenEl) {
  startScreen.classList.add("hidden");
  questionScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screenEl.classList.remove("hidden");
}

function startGame() {
  currentQuestionIndex = 0;
  answers = [];
  showScreen(questionScreen);
  renderQuestion();
}

function renderQuestion() {
  const question = QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

  progressText.textContent = `Q${currentQuestionIndex + 1} / ${QUESTIONS.length}`;
  progressFill.style.width = `${progress}%`;
  questionText.textContent = question.text;
  choiceA.textContent = question.choices.A;
  choiceB.textContent = question.choices.B;
}

function answerQuestion(value) {
  answers.push(value);

  if (currentQuestionIndex < QUESTIONS.length - 1) {
    currentQuestionIndex += 1;
    renderQuestion();
    return;
  }

  showResult();
}

function showResult() {
  const key = answers.join("");
  const result = RESULTS[key];

  resultTitle.textContent = result.title;
  resultDesc.textContent = result.desc;
  resultStep.textContent = result.step;

  showScreen(resultScreen);
}

async function copyResult() {
  const key = answers.join("");
  const result = RESULTS[key];

  const text = `あなたに向いてる趣味は「${result.title}」\n${result.desc}\n最初の一歩：${result.step}`;

  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "コピーしました";
    window.setTimeout(() => {
      shareBtn.textContent = "結果をコピー";
    }, 1400);
  } catch (error) {
    shareBtn.textContent = "コピー失敗";
    window.setTimeout(() => {
      shareBtn.textContent = "結果をコピー";
    }, 1400);
  }
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
shareBtn.addEventListener("click", copyResult);
choiceA.addEventListener("click", () => answerQuestion("A"));
choiceB.addEventListener("click", () => answerQuestion("B"));

void asset;