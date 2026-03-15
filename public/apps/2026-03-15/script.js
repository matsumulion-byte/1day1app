// Vercel: /YYYY-MM-DD → /apps/YYYY-MM-DD/ で配信される
const asset = (p) => '/apps/2026-03-15/' + p.replace(/^\.\//, '');

const questions = [
  {
    id: 1,
    title: 'Q1',
    body:
      'ある女性が母親の葬式で見かけた男性に一目惚れした。\n後日、その女性は自分の姉を殺した。なぜ？',
    choices: [
      { key: 'A', text: '姉にその男性を取られると思ったから', type: 'normal' },
      { key: 'B', text: '悲しみで正常な判断ができなかったから', type: 'normal' },
      { key: 'C', text: 'もう一度その男性が葬式に来ると思ったから', type: 'psycho' },
      { key: 'D', text: '喧嘩したから', type: 'matsu' },
    ],
  },
  {
    id: 2,
    title: 'Q2',
    body: 'ある男がマンションの前で立ち止まり、じっと建物を見上げて部屋数を数えている。なぜ？',
    choices: [
      { key: 'A', text: '暇だから', type: 'matsu' },
      { key: 'B', text: '空き部屋が多いか知りたいから', type: 'normal' },
      { key: 'C', text: 'ここから飛び降りたら何人に見られるか考えているから', type: 'psycho' },
      { key: 'D', text: '以前住んでいた部屋を探しているから', type: 'normal' },
    ],
  },
  {
    id: 3,
    title: 'Q3',
    body: 'ある人はエレベーターに乗ると、必ずボタン配置を確認する。なぜ？',
    choices: [
      { key: 'A', text: '押し間違えたくないから', type: 'normal' },
      { key: 'B', text: 'ボタン配置フェチ？', type: 'matsu' },
      { key: 'C', text: '閉じ込められたときのために状況を把握している', type: 'psycho' },
      { key: 'D', text: '暇だから', type: 'normal' },
    ],
  },
  {
    id: 4,
    title: 'Q4',
    body: 'ある人はレストランに入ると、料理より先に出入口と客席の位置を確認する。なぜ？',
    choices: [
      { key: 'A', text: '落ち着ける席か確認したい', type: 'normal' },
      { key: 'B', text: '知り合いがいないか探している', type: 'normal' },
      { key: 'C', text: '何かあった時に逃げるルートを確認している', type: 'psycho' },
      { key: 'D', text: 'ジェイソン・ステイサムだから', type: 'matsu' },
    ],
  },
  {
    id: 5,
    title: 'Q5',
    body: '信号待ちをしているとき、ある人は前の人の顔ではなく足元ばかり見ている。なぜ？',
    choices: [
      { key: 'A', text: '靴が好きだから', type: 'normal' },
      { key: 'B', text: '顔とか見るとドキドキしちゃうから', type: 'matsu' },
      { key: 'C', text: '誰が一番先に車道に出るか見ているから', type: 'psycho' },
      { key: 'D', text: '視線を上げにくいから', type: 'normal' },
    ],
  },
];

const feedbackMap = {
  psycho: {
    label: 'PSYCHO寄り',
    text: 'これは普通に怖い発想です。松村というより、サイコに寄っています。',
  },
  matsu: {
    label: 'MATSU寄り',
    text: 'サイコパスではないです。松村よりです。',
  },
  normal: {
    label: 'NORMAL',
    text: '比較的ふつうです。まだ社会との接続を保っています。',
  },
};

const resultPatterns = [
  {
    test: (psycho, matsu) => matsu >= 6 && psycho <= 2,
    badge: '完全松村',
    title: 'あなたはかなり松村です',
    description:
      '松村ですね。明日からは松村ですと胸を張ってみんなに伝えてください。',
    subtext: 'サイコではありません。松村です。',
  },
  {
    test: (psycho, matsu) => psycho >= 6 && matsu <= 2,
    badge: 'サイコ寄り',
    title: 'あなたはサイコ寄りです',
    description:
      '発想の飛躍が大きく、状況を怖い方向へ一直線に解釈する傾向があります。松村らしいユルさより、純度の高い不穏さが勝っています。',
    subtext: '松村ではなく、普通に警戒される側かもしれません。',
  },
  {
    test: (psycho, matsu) => psycho >= 4 && matsu >= 4,
    badge: 'サイコマツ',
    title: 'あなたはサイコマツです',
    description:
      '怖い発想と、どうでもいい方向への妙な具体性が共存しています。本人の中では一貫していますが、周りは少し引きます。',
    subtext: '発想が危ないのか、ただ変なのか、判定が難しいタイプです。',
  },
  {
    test: (psycho, matsu) => matsu > psycho,
    badge: '松村寄り',
    title: 'あなたはやや松村です',
    description:
      'サイコというほどではありません。ただ、人が気にしないところを見ていたり、理由がちょっとだけ妙だったりします。',
    subtext: '社会性はありますが、視点が少しだけ松村側です。',
  },
  {
    test: (psycho, matsu) => psycho > matsu,
    badge: 'サイコ寄り',
    title: 'あなたはややサイコです',
    description:
      '物事を危険や不穏さのほうへ読み替えるクセがあります。まだ深刻ではありませんが、発想の重心は少し不気味です。',
    subtext: '松村味は薄めです。今日はまっすぐ帰ったほうがいいかもしれません。',
  },
  {
    test: () => true,
    badge: '一般人',
    title: 'あなたは普通です',
    description:
      '全体としてはかなり健全です。サイコでも松村でもなく、比較的まっとうな回答を選ぶ傾向が見られました。',
    subtext: '安心してください。まだこちら側ではありません。',
  },
];

const state = {
  index: 0,
  psycho: 0,
  matsu: 0,
};

const screens = {
  start: document.getElementById('start-screen'),
  quiz: document.getElementById('quiz-screen'),
  result: document.getElementById('result-screen'),
};

const startButton = document.getElementById('start-button');
const nextButton = document.getElementById('next-button');
const restartButton = document.getElementById('restart-button');
const heroImage = document.getElementById('hero-image');
const resultImage = document.getElementById('result-image');
const quizProgress = document.getElementById('quiz-progress');
const progressFill = document.getElementById('progress-fill');
const questionTitle = document.getElementById('question-title');
const questionBody = document.getElementById('question-body');
const choices = document.getElementById('choices');
const feedback = document.getElementById('answer-feedback');
const feedbackLabel = document.getElementById('feedback-label');
const feedbackText = document.getElementById('feedback-text');
const resultBadge = document.getElementById('result-badge');
const resultTitle = document.getElementById('result-title');
const resultDescription = document.getElementById('result-description');
const resultSubtext = document.getElementById('result-subtext');
const psychoScore = document.getElementById('psycho-score');
const matsuScore = document.getElementById('matsu-score');

const heroSrc = asset('./assets/psycho-matsu.png');
heroImage.src = heroSrc;
resultImage.src = heroSrc;

function showScreen(name) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove('screen--active');
  });
  screens[name].classList.add('screen--active');
}

function resetState() {
  state.index = 0;
  state.psycho = 0;
  state.matsu = 0;
}

function renderQuestion() {
  const question = questions[state.index];
  quizProgress.textContent = `${question.title} / ${questions.length}`;
  progressFill.style.width = `${(state.index / questions.length) * 100}%`;
  questionTitle.textContent = question.title;
  questionBody.textContent = question.body;
  feedback.hidden = true;
  choices.innerHTML = '';

  question.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-button';
    button.dataset.label = choice.key;
    button.textContent = choice.text;
    button.addEventListener('click', () => selectChoice(choice, button));
    choices.appendChild(button);
  });
}

function selectChoice(choice, selectedButton) {
  Array.from(choices.children).forEach((button) => {
    button.disabled = true;
    button.classList.toggle('is-selected', button === selectedButton);
  });

  if (choice.type === 'psycho') {
    state.psycho += 2;
  }
  if (choice.type === 'matsu') {
    state.matsu += 2;
  }

  const feedbackContent = feedbackMap[choice.type] ?? feedbackMap.normal;
  feedbackLabel.textContent = feedbackContent.label;
  feedbackText.textContent = feedbackContent.text;
  feedback.hidden = false;

  progressFill.style.width = `${((state.index + 1) / questions.length) * 100}%`;
}

function renderResult() {
  const result = resultPatterns.find((item) => item.test(state.psycho, state.matsu));
  resultBadge.textContent = result.badge;
  resultTitle.textContent = result.title;
  resultDescription.textContent = result.description;
  resultSubtext.textContent = result.subtext;
  psychoScore.textContent = String(state.psycho);
  matsuScore.textContent = String(state.matsu);
  showScreen('result');
}

startButton.addEventListener('click', () => {
  resetState();
  showScreen('quiz');
  renderQuestion();
});

nextButton.addEventListener('click', () => {
  state.index += 1;
  if (state.index >= questions.length) {
    renderResult();
    return;
  }
  renderQuestion();
});

restartButton.addEventListener('click', () => {
  resetState();
  showScreen('start');
});
