const asset = (p) => new URL(p, import.meta.url).toString();

const questions = [
  {
    text: "予定を立てるなら、どっちが落ち着く？",
    answers: [
      { label: "A", text: "最初に流れを決めておきたい", scores: { support: 2, craft: 1 } },
      { label: "B", text: "その場のノリで動きたい", scores: { free: 2, leader: 1 } },
      { label: "C", text: "相手と相談しながら調整したい", scores: { buddy: 2, heal: 1 } },
    ],
  },
  {
    text: "困ったとき、相手に求めるのは？",
    answers: [
      { label: "A", text: "背中を押してほしい", scores: { leader: 2, buddy: 1 } },
      { label: "B", text: "黙って支えてほしい", scores: { craft: 2, heal: 1 } },
      { label: "C", text: "一緒に悩んでほしい", scores: { heal: 2, support: 1 } },
    ],
  },
  {
    text: "一緒に何かをするとき理想なのは？",
    answers: [
      { label: "A", text: "役割分担して効率よく進めたい", scores: { craft: 2, support: 1 } },
      { label: "B", text: "勢いで一気に進めたい", scores: { leader: 2, free: 1 } },
      { label: "C", text: "会話しながら楽しくやりたい", scores: { buddy: 2, heal: 1 } },
    ],
  },
  {
    text: "相手との距離感はどれが好き？",
    answers: [
      { label: "A", text: "ほどよく自立していたい", scores: { free: 2, craft: 1 } },
      { label: "B", text: "かなり近いほうが安心する", scores: { heal: 2, support: 1 } },
      { label: "C", text: "目的が一致していれば心地いい", scores: { buddy: 2, leader: 1 } },
    ],
  },
  {
    text: "あなたの魅力、いちばん近いのは？",
    answers: [
      { label: "A", text: "空気を動かす行動力", scores: { support: 2, heal: 1 } },
      { label: "B", text: "コツコツ積み上げる安定感", scores: { leader: 2, free: 1 } },
      { label: "C", text: "気分を明るくする柔らかさ", scores: { craft: 1, buddy: 2 } },
    ],
  },
];

const results = {
  leader: {
    type: "PARTNER TYPE 01",
    title: "爆走リーダー型",
    image: asset("./assets/result-leader.png"),
    description:
      "あなたに合うのは、迷ったときでも前に進ませてくれる推進力のある相手。少し強引なくらいの勢いが、あなたの迷いをいい方向に変えてくれます。",
    match:
      "決断が早く、引っ張るのが得意なタイプ。『行こう』と言ってくれる人が好相性です。",
    tip:
      "任せきりにしすぎず、自分の希望も言葉にするとバランスが取れます。",
  },
  craft: {
    type: "PARTNER TYPE 02",
    title: "職人サポート型",
    image: asset("./assets/result-craft.png"),
    description:
      "あなたに合うのは、目立たなくても丁寧に支えてくれる堅実な相手。派手さよりも、信頼感や安定感がある関係で力を発揮できます。",
    match:
      "段取りがうまく、感情より行動で示してくれる人。静かな実力派が向いています。",
    tip:
      "相手が無口でも不安になりすぎず、感謝を言葉にして返すと関係が深まります。",
  },
  free: {
    type: "PARTNER TYPE 03",
    title: "自由人コンビ型",
    image: asset("./assets/result-free.png"),
    description:
      "あなたに合うのは、近すぎず遠すぎずの距離感を守れる相手。お互いに干渉しすぎないことで、逆に長く自然な関係を築けます。",
    match:
      "束縛せず、自分の時間も大事にするタイプ。軽やかなテンポの人がぴったりです。",
    tip:
      "自由を大事にするぶん、放置に見えないように小さなリアクションは意識すると良いです。",
  },
  heal: {
    type: "PARTNER TYPE 04",
    title: "癒やし保護者型",
    image: asset("./assets/result-heal.png"),
    description:
      "あなたに合うのは、感情の揺れや疲れをやさしく受け止めてくれる相手。安心できる空気があると、あなたの魅力が自然に出てきます。",
    match:
      "否定せず、まず受け止めてくれる包容力のあるタイプ。聞き上手な人が相性良好です。",
    tip:
      "甘えられる相手ほど、頼りきりにせず自分からも支える姿勢を持つと安定します。",
  },
  buddy: {
    type: "PARTNER TYPE 05",
    title: "同志バディ型",
    image: asset("./assets/result-buddy.png"),
    description:
      "あなたに合うのは、同じ方向を向いて走れる“仲間感”のある相手。恋愛でも友情でも仕事でも、目標を共有できると関係が強くなります。",
    match:
      "価値観や目的を言葉にして共有できるタイプ。一緒に挑戦できる人が最適です。",
    tip:
      "仲間っぽさが強いぶん、気持ちの確認を省略しないことが長続きの鍵です。",
  },
  support: {
    type: "PARTNER TYPE 06",
    title: "ツッコミ補完型",
    image: asset("./assets/result-support.png"),
    description:
      "あなたに合うのは、勢いのあるあなたをうまく整えてくれる相手。自由さを否定せず、でもちゃんと現実に戻してくれる存在がハマります。",
    match:
      "冷静で、状況整理が得意なタイプ。あなたの発想を面白がりつつ支えてくれる人です。",
    tip:
      "自分のノリを理解してもらうだけでなく、相手の慎重さにも価値があると認めると噛み合います。",
  },
};

const state = {
  currentIndex: 0,
  scores: {
    leader: 0,
    craft: 0,
    free: 0,
    heal: 0,
    buddy: 0,
    support: 0,
  },
};

const els = {
  startScreen: document.getElementById("startScreen"),
  questionScreen: document.getElementById("questionScreen"),
  resultScreen: document.getElementById("resultScreen"),
  startButton: document.getElementById("startButton"),
  retryButton: document.getElementById("retryButton"),
  shareButton: document.getElementById("shareButton"),
  currentNumber: document.getElementById("currentNumber"),
  totalNumber: document.getElementById("totalNumber"),
  progressFill: document.getElementById("progressFill"),
  questionText: document.getElementById("questionText"),
  answers: document.getElementById("answers"),
  resultType: document.getElementById("resultType"),
  resultImage: document.getElementById("resultImage"),
  resultTitle: document.getElementById("resultTitle"),
  resultDescription: document.getElementById("resultDescription"),
  resultMatch: document.getElementById("resultMatch"),
  resultTip: document.getElementById("resultTip"),
};

function resetState() {
  state.currentIndex = 0;
  state.scores = {
    leader: 0,
    craft: 0,
    free: 0,
    heal: 0,
    buddy: 0,
    support: 0,
  };
}

function showScreen(name) {
  els.startScreen.classList.remove("active");
  els.questionScreen.classList.remove("active");
  els.resultScreen.classList.remove("active");

  if (name === "start") els.startScreen.classList.add("active");
  if (name === "question") els.questionScreen.classList.add("active");
  if (name === "result") els.resultScreen.classList.add("active");
}

function renderQuestion() {
  const question = questions[state.currentIndex];
  const current = state.currentIndex + 1;
  const total = questions.length;

  els.currentNumber.textContent = String(current);
  els.totalNumber.textContent = String(total);
  els.progressFill.style.width = `${(current / total) * 100}%`;
  els.questionText.textContent = question.text;
  els.answers.innerHTML = "";

  question.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.innerHTML = `
      <span class="answer-label">${answer.label}</span>
      <span class="answer-text">${answer.text}</span>
    `;

    button.addEventListener("click", () => {
      Object.entries(answer.scores).forEach(([key, value]) => {
        state.scores[key] += value;
      });

      state.currentIndex += 1;

      if (state.currentIndex < questions.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    });

    els.answers.appendChild(button);
  });
}

function pickTopType(scores) {
  const order = ["leader", "craft", "free", "heal", "buddy", "support"];
  let topKey = order[0];
  let topScore = scores[topKey];

  order.forEach((key) => {
    if (scores[key] > topScore) {
      topKey = key;
      topScore = scores[key];
    }
  });

  return topKey;
}

function renderResult() {
  const key = pickTopType(state.scores);
  const result = results[key];

  els.resultType.textContent = result.type;
  els.resultImage.src = result.image;
  els.resultImage.alt = `${result.title}の松村画像`;
  els.resultTitle.textContent = result.title;
  els.resultDescription.textContent = result.description;
  els.resultMatch.textContent = result.match;
  els.resultTip.textContent = result.tip;

  showScreen("result");
}

function startQuiz() {
  resetState();
  showScreen("question");
  renderQuestion();
}

async function copyResult() {
  const key = pickTopType(state.scores);
  const result = results[key];
  const text = `4/14 パートナー占いの結果は「${result.title}」でした。
${result.description}

#パートナーデー #相棒診断`;

  try {
    await navigator.clipboard.writeText(text);
    els.shareButton.textContent = "コピーしました";
    window.setTimeout(() => {
      els.shareButton.textContent = "結果をコピー";
    }, 1400);
  } catch (error) {
    els.shareButton.textContent = "コピー失敗";
    window.setTimeout(() => {
      els.shareButton.textContent = "結果をコピー";
    }, 1400);
  }
}

els.startButton.addEventListener("click", startQuiz);
els.retryButton.addEventListener("click", () => {
  resetState();
  showScreen("start");
});
els.shareButton.addEventListener("click", copyResult);

showScreen("start");