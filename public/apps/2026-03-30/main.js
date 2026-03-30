const ASSET_BASE = "/apps/2026-03-30";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const RESULT_DATA = {
  nobunaga: {
    name: "信長松村",
    catch: "圧で道を切り開くタイプ",
    image: asset("./assets/nobunaga.png"),
    desc: "迷いがない。決断が速い。多少強引でも、とにかく前に進める力がある。周りは振り回されるが、結果的に景色を変える。",
    traits: ["会議を強制終了できる", "「それでいこう」で全部決める", "たまに雑"],
    advice: "今すぐ決めろ。",
  },
  shingen: {
    name: "信玄松村",
    catch: "戦わずして勝つを狙うタイプ",
    image: asset("./assets/shingen.png"),
    desc: "無理をしない。勝てる形を整えてから動く。人も資源も大事にする、安定感の塊。気づいたら強い。",
    traits: ["事前準備が異様に丁寧", "無駄な戦いをしない", "地味に全部持っていく"],
    advice: "勝てる形を整えてから動け。",
  },
  kanetsugu: {
    name: "直江兼続松村",
    catch: "正しさで突き進むタイプ",
    image: asset("./assets/kanetsugu.png"),
    desc: "筋が通っているかを最優先する。合理よりも信念。めんどくさいが、最後は信用される。",
    traits: ["言ってることは正しい", "空気は読まない", "結果、信頼は厚い"],
    advice: "筋を通せ。ただし少しだけ角を丸めろ。",
  },
  kenshin: {
    name: "上杉謙信松村",
    catch: "義だけで動いているタイプ",
    image: asset("./assets/kenshin.png"),
    desc: "私利私欲が薄く、純粋に“あるべき姿”で動く。ブレないが、理解されにくいこともある。なぜか敵にも好かれる。",
    traits: ["利益より筋", "急に助ける", "なんか神格化されがち"],
    advice: "利より義を取れ。ただし昼飯は確保しろ。",
  },
  ieyasu: {
    name: "家康松村",
    catch: "待って勝つタイプ",
    image: asset("./assets/ieyasu.png"),
    desc: "短期では動かない。長期で勝つ。耐える力と積み上げが異常。最後に全部持っていく。",
    traits: ["今は動かない", "気づいたら一番いい位置にいる", "ストレス耐性が高い"],
    advice: "今日はまだ動くな。積め。",
  },
  hideyoshi: {
    name: "秀吉松村",
    catch: "人を動かして勝つタイプ",
    image: asset("./assets/hideyoshi.png"),
    desc: "距離が近い。誰とでも仲良くなれる。人を巻き込む力で物事を進める。たまに調子に乗る。",
    traits: ["初対面で距離が近い", "気づいたら中心にいる", "ノリで突破する"],
    advice: "一人で抱えず、まず誰かを巻き込め。",
  },
  masamune: {
    name: "伊達政宗松村",
    catch: "見せ方まで含めて勝つタイプ",
    image: asset("./assets/masamune.png"),
    desc: "中身だけでなく、どう見えるかも重視する。センスと演出で差をつける。ちょっとカッコつけ。",
    traits: ["無駄にかっこいい言い回し", "ビジュアル意識高い", "やり方がいちいち洒落てる"],
    advice: "中身に加えて、見せ方も整えろ。",
  },
  yukimura: {
    name: "真田幸村松村",
    catch: "不利な状況で輝くタイプ",
    image: asset("./assets/yukimura.png"),
    desc: "普通の場面ではそこそこ。ただし追い込まれるほど力を発揮する。ドラマ性が強い。",
    traits: ["締切直前に覚醒", "ピンチで急に有能", "普段はわりと普通"],
    advice: "追い込まれる前に少しだけ動け。",
  },
  mitsuhide: {
    name: "明智光秀松村",
    catch: "考えすぎて動くタイプ",
    image: asset("./assets/mitsuhide.png"),
    desc: "頭は切れる。状況も読める。ただし繊細すぎて、ある日急に方向転換する。扱いが難しい。",
    traits: ["空気を読みすぎる", "急に決断する", "理屈は通ってる"],
    advice: "考えるのはよい。だが今日は一手だけ打て。",
  },
  kanbei: {
    name: "黒田官兵衛松村",
    catch: "前に出ずに支配するタイプ",
    image: asset("./assets/kanbei.png"),
    desc: "自分は目立たず、裏から全体を動かす。最短ルートで勝ちにいく思考。何を考えているか分からないが有能。",
    traits: ["静かに最適解を出す", "感情を見せない", "だいたい当たってる"],
    advice: "全体を見直せ。最短手は別にある。",
  },
};

const QUESTIONS = [
  {
    theme: "第一問",
    text: "城を手に入れた。まず何をする？",
    choices: [
      {
        label: "A",
        text: "すぐに隣国へ圧をかける",
        scores: { nobunaga: 2, yukimura: 1 },
      },
      {
        label: "B",
        text: "有能そうな人間を集める",
        scores: { hideyoshi: 2, masamune: 1 },
      },
      {
        label: "C",
        text: "城下町と兵站を整える",
        scores: { shingen: 2, ieyasu: 1 },
      },
      {
        label: "D",
        text: "地図を広げて情勢を読む",
        scores: { kanbei: 2, mitsuhide: 1 },
      },
    ],
  },
  {
    theme: "第二問",
    text: "家臣が大きめのミスをした。",
    choices: [
      {
        label: "A",
        text: "その場で厳しく指摘する",
        scores: { nobunaga: 2, kanetsugu: 1 },
      },
      {
        label: "B",
        text: "まず事情を聞いてみる",
        scores: { hideyoshi: 2, shingen: 1 },
      },
      {
        label: "C",
        text: "再発防止の仕組みを作る",
        scores: { ieyasu: 2, kanbei: 1 },
      },
      {
        label: "D",
        text: "一旦静観し、相手の出方を見る",
        scores: { kenshin: 2, mitsuhide: 1 },
      },
    ],
  },
  {
    theme: "第三問",
    text: "決戦の前夜。あなたが気にするのは？",
    choices: [
      {
        label: "A",
        text: "作戦の詰めと勝ち筋",
        scores: { kanbei: 2, mitsuhide: 1 },
      },
      {
        label: "B",
        text: "味方の士気と空気",
        scores: { hideyoshi: 2, yukimura: 1 },
      },
      {
        label: "C",
        text: "兵糧・装備・移動経路",
        scores: { shingen: 2, ieyasu: 1 },
      },
      {
        label: "D",
        text: "心を静め、信念を確かめる",
        scores: { kenshin: 2, kanetsugu: 1 },
      },
    ],
  },
  {
    theme: "第四問",
    text: "大きな好機が来た。どうする？",
    choices: [
      {
        label: "A",
        text: "迷わず先手を打つ",
        scores: { nobunaga: 2, masamune: 1 },
      },
      {
        label: "B",
        text: "人を動かして一気に取る",
        scores: { hideyoshi: 2, kanbei: 1 },
      },
      {
        label: "C",
        text: "確実に取れる形まで待つ",
        scores: { ieyasu: 2, shingen: 1 },
      },
      {
        label: "D",
        text: "そもそも今動くべきか考え直す",
        scores: { mitsuhide: 2, kanetsugu: 1 },
      },
    ],
  },
  {
    theme: "第五問",
    text: "あなたにとって理想の大将とは？",
    choices: [
      {
        label: "A",
        text: "圧倒的で、誰も逆らえない存在",
        scores: { nobunaga: 2, masamune: 1 },
      },
      {
        label: "B",
        text: "親しみやすく、人が集まる存在",
        scores: { hideyoshi: 2, yukimura: 1 },
      },
      {
        label: "C",
        text: "安定感があり、崩れない存在",
        scores: { ieyasu: 2, shingen: 1 },
      },
      {
        label: "D",
        text: "信念を持ち、筋を通す存在",
        scores: { kenshin: 2, kanetsugu: 1 },
      },
    ],
  },
  {
    theme: "第六問",
    text: "厄介な揉め事が起きた。",
    choices: [
      {
        label: "A",
        text: "力でねじ伏せる",
        scores: { nobunaga: 2, yukimura: 1 },
      },
      {
        label: "B",
        text: "周囲を巻き込み流れを変える",
        scores: { hideyoshi: 2, masamune: 1 },
      },
      {
        label: "C",
        text: "時間をかけて自然に収める",
        scores: { ieyasu: 2, shingen: 1 },
      },
      {
        label: "D",
        text: "裏で静かに処理しておく",
        scores: { kanbei: 2, mitsuhide: 1 },
      },
    ],
  },
  {
    theme: "第七問",
    text: "自分の強みをひとつ挙げるなら？",
    choices: [
      {
        label: "A",
        text: "決断の速さ",
        scores: { nobunaga: 2, masamune: 1 },
      },
      {
        label: "B",
        text: "人との距離の近さ",
        scores: { hideyoshi: 2, yukimura: 1 },
      },
      {
        label: "C",
        text: "粘り強く続ける力",
        scores: { ieyasu: 2, shingen: 1 },
      },
      {
        label: "D",
        text: "全体を見て読む力",
        scores: { kanbei: 2, mitsuhide: 1 },
      },
    ],
  },
];

const GENERAL_KEYS = Object.keys(RESULT_DATA);

const state = {
  currentQuestionIndex: 0,
  score: createEmptyScore(),
  answers: [],
};

const els = {
  titleScreen: document.getElementById("title-screen"),
  quizScreen: document.getElementById("quiz-screen"),
  resultScreen: document.getElementById("result-screen"),
  startBtn: document.getElementById("start-btn"),
  retryBtn: document.getElementById("retry-btn"),
  shareBtn: document.getElementById("share-btn"),
  questionCounter: document.getElementById("question-counter"),
  questionTotal: document.getElementById("question-total"),
  progressFill: document.getElementById("progress-fill"),
  questionTheme: document.getElementById("question-theme"),
  questionText: document.getElementById("question-text"),
  choices: document.getElementById("choices"),
  resultName: document.getElementById("result-name"),
  resultCatch: document.getElementById("result-catch"),
  resultImage: document.getElementById("result-image"),
  resultDesc: document.getElementById("result-desc"),
  resultTraits: document.getElementById("result-traits"),
  resultAdvice: document.getElementById("result-advice"),
};

function createEmptyScore() {
  return {
    nobunaga: 0,
    shingen: 0,
    kanetsugu: 0,
    kenshin: 0,
    ieyasu: 0,
    hideyoshi: 0,
    masamune: 0,
    yukimura: 0,
    mitsuhide: 0,
    kanbei: 0,
  };
}

function resetState() {
  state.currentQuestionIndex = 0;
  state.score = createEmptyScore();
  state.answers = [];
}

function showScreen(screenName) {
  els.titleScreen.classList.remove("screen-active");
  els.quizScreen.classList.remove("screen-active");
  els.resultScreen.classList.remove("screen-active");

  if (screenName === "title") els.titleScreen.classList.add("screen-active");
  if (screenName === "quiz") els.quizScreen.classList.add("screen-active");
  if (screenName === "result") els.resultScreen.classList.add("screen-active");
}

function renderQuestion() {
  const q = QUESTIONS[state.currentQuestionIndex];
  const questionNumber = state.currentQuestionIndex + 1;

  els.questionCounter.textContent = `第${questionNumber}問`;
  els.questionTotal.textContent = `/ 全${QUESTIONS.length}問`;
  els.progressFill.style.width = `${(questionNumber / QUESTIONS.length) * 100}%`;
  els.questionTheme.textContent = q.theme;
  els.questionText.textContent = q.text;
  els.choices.innerHTML = "";

  q.choices.forEach((choice, choiceIndex) => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.type = "button";
    button.setAttribute("aria-label", choice.text);

    button.innerHTML = `
      <span class="choice-label">${choice.label}</span>
      <span class="choice-text">${choice.text}</span>
    `;

    button.addEventListener("click", () => {
      applyChoice(choice, choiceIndex);
    });

    els.choices.appendChild(button);
  });
}

function applyChoice(choice, choiceIndex) {
  Object.entries(choice.scores).forEach(([key, value]) => {
    state.score[key] += value;
  });

  state.answers.push({
    questionIndex: state.currentQuestionIndex,
    choiceIndex,
    label: choice.label,
    text: choice.text,
  });

  state.currentQuestionIndex += 1;

  if (state.currentQuestionIndex >= QUESTIONS.length) {
    const resultKey = determineResult();
    renderResult(resultKey);
    showScreen("result");
    return;
  }

  renderQuestion();
}

function determineResult() {
  applySpecialAdjustments();

  const sorted = GENERAL_KEYS.slice().sort((a, b) => {
    if (state.score[b] !== state.score[a]) {
      return state.score[b] - state.score[a];
    }

    return tieBreakPriority(a) - tieBreakPriority(b);
  });

  return sorted[0];
}

function tieBreakPriority(key) {
  const order = [
    "nobunaga",
    "hideyoshi",
    "kanbei",
    "ieyasu",
    "shingen",
    "masamune",
    "yukimura",
    "kenshin",
    "kanetsugu",
    "mitsuhide",
  ];
  return order.indexOf(key);
}

function applySpecialAdjustments() {
  const selectedTexts = state.answers.map((a) => a.text);

  const beliefLikeCount = selectedTexts.filter((text) =>
    [
      "一旦静観し、相手の出方を見る",
      "心を静め、信念を確かめる",
      "信念を持ち、筋を通す存在",
      "そもそも今動くべきか考え直す",
    ].includes(text)
  ).length;

  if (beliefLikeCount >= 2) {
    state.score.kenshin += 1;
    state.score.kanetsugu += 1;
  }

  const aggressiveCount = selectedTexts.filter((text) =>
    [
      "すぐに隣国へ圧をかける",
      "迷わず先手を打つ",
      "力でねじ伏せる",
    ].includes(text)
  ).length;

  if (aggressiveCount >= 3) {
    state.score.nobunaga += 2;
  }

  const cautiousCount = selectedTexts.filter((text) =>
    [
      "地図を広げて情勢を読む",
      "確実に取れる形まで待つ",
      "全体を見て読む力",
      "時間をかけて自然に収める",
    ].includes(text)
  ).length;

  if (cautiousCount >= 3) {
    state.score.ieyasu += 2;
    state.score.kanbei += 1;
  }
}

function renderResult(resultKey) {
  const result = RESULT_DATA[resultKey];

  els.resultName.textContent = result.name;
  els.resultCatch.textContent = result.catch;
  els.resultImage.src = result.image;
  els.resultImage.alt = result.name;
  els.resultDesc.textContent = result.desc;
  els.resultAdvice.textContent = result.advice;

  els.resultTraits.innerHTML = "";
  result.traits.forEach((trait) => {
    const li = document.createElement("li");
    li.textContent = trait;
    els.resultTraits.appendChild(li);
  });
}

async function copyResult() {
  const resultKey = determinePreviewResultWithoutMutating();
  const result = RESULT_DATA[resultKey];
  const text =
    `【松村武将診断 〜天下布松〜】\n` +
    `診断結果：${result.name}\n` +
    `${result.catch}\n` +
    `${result.advice}`;

  try {
    await navigator.clipboard.writeText(text);
    els.shareBtn.textContent = "コピーしました";
    setTimeout(() => {
      els.shareBtn.textContent = "結果をコピー";
    }, 1400);
  } catch (error) {
    els.shareBtn.textContent = "コピー失敗";
    setTimeout(() => {
      els.shareBtn.textContent = "結果をコピー";
    }, 1400);
  }
}

function determinePreviewResultWithoutMutating() {
  const tempScore = { ...state.score };
  const tempAnswers = [...state.answers];

  const selectedTexts = tempAnswers.map((a) => a.text);

  const beliefLikeCount = selectedTexts.filter((text) =>
    [
      "一旦静観し、相手の出方を見る",
      "心を静め、信念を確かめる",
      "信念を持ち、筋を通す存在",
      "そもそも今動くべきか考え直す",
    ].includes(text)
  ).length;

  if (beliefLikeCount >= 2) {
    tempScore.kenshin += 1;
    tempScore.kanetsugu += 1;
  }

  const aggressiveCount = selectedTexts.filter((text) =>
    [
      "すぐに隣国へ圧をかける",
      "迷わず先手を打つ",
      "力でねじ伏せる",
    ].includes(text)
  ).length;

  if (aggressiveCount >= 3) {
    tempScore.nobunaga += 2;
  }

  const cautiousCount = selectedTexts.filter((text) =>
    [
      "地図を広げて情勢を読む",
      "確実に取れる形まで待つ",
      "全体を見て読む力",
      "時間をかけて自然に収める",
    ].includes(text)
  ).length;

  if (cautiousCount >= 3) {
    tempScore.ieyasu += 2;
    tempScore.kanbei += 1;
  }

  const sorted = GENERAL_KEYS.slice().sort((a, b) => {
    if (tempScore[b] !== tempScore[a]) {
      return tempScore[b] - tempScore[a];
    }
    return tieBreakPriority(a) - tieBreakPriority(b);
  });

  return sorted[0];
}

function startQuiz() {
  resetState();
  renderQuestion();
  showScreen("quiz");
}

function retryQuiz() {
  resetState();
  showScreen("title");
}

els.startBtn.addEventListener("click", startQuiz);
els.retryBtn.addEventListener("click", retryQuiz);
els.shareBtn.addEventListener("click", copyResult);

showScreen("title");