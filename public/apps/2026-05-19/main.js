const WORD_QUESTIONS = [
  {
    word: "あえか",
    answer: "か弱く、はかなげなさま",
    fakes: [
      "朝方にだけ見える薄い霧",
      "声がかすれて聞き取りにくいこと",
      "袖口の縫い目がほどけること",
    ],
  },
  {
    word: "うたて",
    answer: "いやな感じがするさま。不快なさま",
    fakes: [
      "歌を途中で忘れてしまうこと",
      "雨のあとに地面が冷えるさま",
      "相手の言葉をやんわり受け流すこと",
    ],
  },
  {
    word: "いさちる",
    answer: "激しく泣く。泣き叫ぶ",
    fakes: [
      "鳥が急に飛び立つ",
      "水面が細かく波立つ",
      "刃物の先が欠ける",
    ],
  },
  {
    word: "たづきなし",
    answer: "頼る手段がない。生活の手段がない",
    fakes: [
      "旅の途中で道に迷う",
      "手紙の宛先を書き忘れる",
      "木の枝が風で折れる",
    ],
  },
  {
    word: "おほけなし",
    answer: "身分不相応である。恐れ多い",
    fakes: [
      "大きすぎて扱いにくい",
      "人前で声が大きい",
      "ぼんやりしていて要領を得ない",
    ],
  },
  {
    word: "むくつけし",
    answer: "不気味である。うす気味悪い",
    fakes: [
      "無口で愛想がない",
      "向こう見ずに突き進む",
      "古い布が湿って重くなる",
    ],
  },
  {
    word: "いぶせし",
    answer: "気が晴れない。うっとうしい",
    fakes: [
      "煙で目が痛む",
      "物陰に隠れて様子を見る",
      "言葉を濁して答える",
    ],
  },
  {
    word: "ひがごと",
    answer: "道理や事実に合わないこと。まちがい",
    fakes: [
      "日が暮れてから交わす約束",
      "片方だけに都合のよい言い分",
      "人に聞かせるための作り話",
    ],
  },
  {
    word: "あぢきなし",
    answer: "どうにもならない。つまらない。無益だ",
    fakes: [
      "味が薄く、物足りない",
      "地面がぬかるんで歩きにくい",
      "人の情けに頼って暮らす",
    ],
  },
  {
    word: "らうたし",
    answer: "かわいらしい。いじらしい",
    fakes: [
      "乱暴で手に負えない",
      "歌声が低く響く",
      "羅の衣が風に揺れる",
    ],
  },
];

const TOTAL_ROUNDS = 5;

const startScreen = document.getElementById("startScreen");
const quizScreen = document.getElementById("quizScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const nextBtn = document.getElementById("nextBtn");

const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreText");
const wordText = document.getElementById("wordText");
const choicesEl = document.getElementById("choices");

const feedback = document.getElementById("feedback");
const feedbackTitle = document.getElementById("feedbackTitle");
const feedbackAnswer = document.getElementById("feedbackAnswer");

const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const resultComment = document.getElementById("resultComment");

let roundQuestions = [];
let currentIndex = 0;
let score = 0;
let answered = false;

function shuffleArray(array) {
  const copied = [...array];

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}

function createRoundQuestions() {
  return shuffleArray(WORD_QUESTIONS)
    .slice(0, TOTAL_ROUNDS)
    .map((q) => {
      const choices = shuffleArray([
        { text: q.answer, isCorrect: true },
        ...q.fakes.map((fake) => ({
          text: fake,
          isCorrect: false,
        })),
      ]);

      return {
        word: q.word,
        answer: q.answer,
        choices,
      };
    });
}

function showScreen(screen) {
  startScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  screen.classList.remove("hidden");
}

function startGame() {
  roundQuestions = createRoundQuestions();
  currentIndex = 0;
  score = 0;
  answered = false;

  showScreen(quizScreen);
  renderQuestion();
}

function renderQuestion() {
  const question = roundQuestions[currentIndex];

  answered = false;
  feedback.classList.add("hidden");
  choicesEl.innerHTML = "";

  progressText.textContent = `${currentIndex + 1} / ${TOTAL_ROUNDS}`;
  scoreText.textContent = `正解 ${score}`;
  wordText.textContent = question.word;

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";

    const indexLabel = document.createElement("span");
    indexLabel.className = "choice-index";
    indexLabel.textContent = String(index + 1);

    const text = document.createElement("span");
    text.textContent = choice.text;

    button.appendChild(indexLabel);
    button.appendChild(text);

    button.addEventListener("click", () => {
      selectChoice(button, choice);
    });

    choicesEl.appendChild(button);
  });
}

function selectChoice(selectedButton, selectedChoice) {
  if (answered) return;

  answered = true;

  const question = roundQuestions[currentIndex];
  const buttons = [...choicesEl.querySelectorAll(".choice-btn")];

  buttons.forEach((button, index) => {
    button.classList.add("disabled");

    if (question.choices[index].isCorrect) {
      button.classList.add("correct");
    }
  });

  if (selectedChoice.isCorrect) {
    score += 1;
    scoreText.textContent = `正解 ${score}`;
    feedbackTitle.textContent = "見抜いた";
    feedbackAnswer.textContent = `「${question.word}」は、${question.answer}。`;
  } else {
    selectedButton.classList.add("wrong");
    feedbackTitle.textContent = "それっぽさに負けた";
    feedbackAnswer.textContent = `本物の意味は「${question.answer}」。`;
  }

  if (currentIndex === TOTAL_ROUNDS - 1) {
    nextBtn.textContent = "結果を見る";
  } else {
    nextBtn.textContent = "次へ";
  }

  feedback.classList.remove("hidden");
}

function goNext() {
  if (!answered) return;

  if (currentIndex >= TOTAL_ROUNDS - 1) {
    showResult();
    return;
  }

  currentIndex += 1;
  renderQuestion();
}

function showResult() {
  const result = getResult(score);

  resultTitle.textContent = result.title;
  resultScore.textContent = `${TOTAL_ROUNDS}問中${score}問正解`;
  resultComment.textContent = result.comment;

  showScreen(resultScreen);
}

function getResult(correctCount) {
  const results = [
    {
      title: "辞書に追い返された人",
      comment: "すべての意味がそれっぽく見えた。今日は辞書の機嫌が悪かっただけです。",
    },
    {
      title: "それっぽさに飲まれた人",
      comment: "嘘の説明が妙にしっくり来てしまった。たほいやの入口にいます。",
    },
    {
      title: "語感だけで生きている人",
      comment: "当たる時もあるが、だいたい雰囲気。ことばの沼はまだ浅瀬です。",
    },
    {
      title: "ことばの気配を読める人",
      comment: "知らない言葉でも、なんとなく怪しい選択肢を避けられている。",
    },
    {
      title: "辞書の端を歩く人",
      comment: "かなり鋭い。辞書の余白に住んでいる可能性があります。",
    },
    {
      title: "たほいやの亡霊",
      comment: "全部見抜いた。もう普通の4択では満足できない体になっています。",
    },
  ];

  return results[correctCount] || results[0];
}

function preventDoubleTapZoom() {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    },
    { passive: false }
  );
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", goNext);

preventDoubleTapZoom();