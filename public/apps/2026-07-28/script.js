const places = [
  { name: "長万部", reading: "おしゃまんべ", prefecture: "北海道" },
  { name: "倶知安", reading: "くっちゃん", prefecture: "北海道" },
  { name: "占冠", reading: "しむかっぷ", prefecture: "北海道" },
  { name: "弟子屈", reading: "てしかが", prefecture: "北海道" },
  { name: "音威子府", reading: "おといねっぷ", prefecture: "北海道" },
  { name: "留寿都", reading: "るすつ", prefecture: "北海道" },
  { name: "比布", reading: "ぴっぷ", prefecture: "北海道" },
  { name: "興部", reading: "おこっぺ", prefecture: "北海道" },
  { name: "神恵内", reading: "かもえない", prefecture: "北海道" },
  { name: "階上", reading: "はしかみ", prefecture: "青森県" },
  { name: "紫波", reading: "しわ", prefecture: "岩手県" },
  { name: "愛子", reading: "あやし", prefecture: "宮城県" },
  { name: "登米", reading: "とめ", prefecture: "宮城県" },
  { name: "象潟", reading: "きさかた", prefecture: "秋田県" },
  { name: "西馬音内", reading: "にしもない", prefecture: "秋田県" },
  { name: "左沢", reading: "あてらざわ", prefecture: "山形県" },
  { name: "及位", reading: "のぞき", prefecture: "山形県" },
  { name: "勿来", reading: "なこそ", prefecture: "福島県" },
  { name: "会津坂下", reading: "あいづばんげ", prefecture: "福島県" },
  { name: "潮来", reading: "いたこ", prefecture: "茨城県" },
  { name: "行方", reading: "なめがた", prefecture: "茨城県" },
  { name: "真岡", reading: "もおか", prefecture: "栃木県" },
  { name: "壬生", reading: "みぶ", prefecture: "栃木県" },
  { name: "邑楽", reading: "おうら", prefecture: "群馬県" },
  { name: "越生", reading: "おごせ", prefecture: "埼玉県" },
  { name: "幸手", reading: "さって", prefecture: "埼玉県" },
  { name: "酒々井", reading: "しすい", prefecture: "千葉県" },
  { name: "匝瑳", reading: "そうさ", prefecture: "千葉県" },
  { name: "八街", reading: "やちまた", prefecture: "千葉県" },
  { name: "舎人", reading: "とねり", prefecture: "東京都" },
  { name: "福生", reading: "ふっさ", prefecture: "東京都" },
  { name: "雑司が谷", reading: "ぞうしがや", prefecture: "東京都" },
  { name: "弘明寺", reading: "ぐみょうじ", prefecture: "神奈川県" },
  { name: "追浜", reading: "おっぱま", prefecture: "神奈川県" },
  { name: "国府津", reading: "こうづ", prefecture: "神奈川県" },
  { name: "新発田", reading: "しばた", prefecture: "新潟県" },
  { name: "石動", reading: "いするぎ", prefecture: "富山県" },
  { name: "羽咋", reading: "はくい", prefecture: "石川県" },
  { name: "四方津", reading: "しおつ", prefecture: "山梨県" },
  { name: "小谷", reading: "おたり", prefecture: "長野県" },
  { name: "麻績", reading: "おみ", prefecture: "長野県" },
  { name: "各務原", reading: "かかみがはら", prefecture: "岐阜県" },
  { name: "函南", reading: "かんなみ", prefecture: "静岡県" },
  { name: "御器所", reading: "ごきそ", prefecture: "愛知県" },
  { name: "放出", reading: "はなてん", prefecture: "大阪府" },
  { name: "交野", reading: "かたの", prefecture: "大阪府" },
  { name: "喜連瓜破", reading: "きれうりわり", prefecture: "大阪府" },
  { name: "先斗町", reading: "ぽんとちょう", prefecture: "京都府" },
  { name: "御所", reading: "ごせ", prefecture: "奈良県" },
  { name: "特牛", reading: "こっとい", prefecture: "山口県" }
];

const screens = {
  intro: document.getElementById("intro"),
  quiz: document.getElementById("quiz"),
  result: document.getElementById("result")
};

const el = {
  questionNumber: document.getElementById("questionNumber"),
  scoreLabel: document.getElementById("scoreLabel"),
  progressBar: document.getElementById("progressBar"),
  streak: document.getElementById("streak"),
  streakBadge: document.getElementById("streakBadge"),
  prefecture: document.getElementById("prefecture"),
  placeName: document.getElementById("placeName"),
  answers: document.getElementById("answers"),
  feedback: document.getElementById("feedback"),
  feedbackIcon: document.getElementById("feedbackIcon"),
  feedbackTitle: document.getElementById("feedbackTitle"),
  feedbackReading: document.getElementById("feedbackReading"),
  nextButton: document.getElementById("nextButton"),
  finalScore: document.getElementById("finalScore"),
  rankTitle: document.getElementById("rankTitle"),
  resultCopy: document.getElementById("resultCopy"),
  missed: document.getElementById("missed"),
  missedList: document.getElementById("missedList")
};

let questions = [];
let index = 0;
let score = 0;
let streak = 0;
let missed = [];
let answered = false;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle("active", key === name);
  });
}

function buildChoices(question) {
  const wrong = shuffle(
    places.filter((place) => place.reading !== question.reading)
  ).slice(0, 3).map((place) => place.reading);
  return shuffle([question.reading, ...wrong]);
}

function renderQuestion() {
  answered = false;
  const question = questions[index];
  el.questionNumber.textContent = index + 1;
  el.scoreLabel.textContent = `${score} 正解`;
  el.progressBar.style.width = `${(index + 1) * 10}%`;
  el.streak.textContent = streak;
  el.prefecture.textContent = question.prefecture;
  el.placeName.textContent = question.name;
  el.feedback.className = "feedback";
  el.answers.innerHTML = "";

  buildChoices(question).forEach((reading, choiceIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.reading = reading;
    button.innerHTML = `<span class="number">${choiceIndex + 1}</span><span>${reading}</span>`;
    button.addEventListener("click", () => selectAnswer(button, reading));
    el.answers.appendChild(button);
  });
}

function selectAnswer(button, reading) {
  if (answered) return;
  answered = true;
  const question = questions[index];
  const isCorrect = reading === question.reading;

  [...el.answers.children].forEach((answer) => {
    answer.disabled = true;
    if (answer.dataset.reading === question.reading) answer.classList.add("correct");
  });

  if (isCorrect) {
    score += 1;
    streak += 1;
    el.feedbackIcon.textContent = "○";
    el.feedbackTitle.textContent = streak >= 3 ? `${streak}問連続正解！` : "正解！";
    el.feedback.classList.add("visible");
  } else {
    streak = 0;
    button.classList.add("wrong");
    missed.push(question);
    el.feedbackIcon.textContent = "×";
    el.feedbackTitle.textContent = "おしい！";
    el.feedback.classList.add("visible", "incorrect");
  }

  el.streak.textContent = streak;
  el.scoreLabel.textContent = `${score} 正解`;
  el.feedbackReading.textContent = `${question.name}〈${question.reading}〉— ${question.prefecture}`;
  el.nextButton.innerHTML = index === 9 ? "結果を見る <span>→</span>" : "次の問題へ <span>→</span>";
  el.nextButton.focus({ preventScroll: true });
}

function showResult() {
  el.finalScore.textContent = score;
  const ranks = [
    { min: 10, title: "難読地名王", copy: "全問正解。もはや地図のほうがあなたを読む。" },
    { min: 8, title: "地名博士", copy: "かなりの旅人。初見の地名にも強い！" },
    { min: 5, title: "街道歩き", copy: "いい旅の途中。読める地名が増えてきた。" },
    { min: 0, title: "旅の一年生", copy: "日本は読めない場所だらけ。そこがおもしろい！" }
  ];
  const rank = ranks.find((item) => score >= item.min);
  el.rankTitle.textContent = rank.title;
  el.resultCopy.textContent = rank.copy;
  el.missed.hidden = missed.length === 0;
  el.missedList.innerHTML = missed.map((place) =>
    `<div class="missed-row"><b>${place.name}</b><span>${place.reading}</span></div>`
  ).join("");
  showScreen("result");
}

function startGame() {
  questions = shuffle(places).slice(0, 10);
  index = 0;
  score = 0;
  streak = 0;
  missed = [];
  showScreen("quiz");
  renderQuestion();
}

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("retryButton").addEventListener("click", startGame);
document.getElementById("quitButton").addEventListener("click", () => showScreen("intro"));

el.nextButton.addEventListener("click", () => {
  if (!answered) return;
  if (index === 9) {
    showResult();
  } else {
    index += 1;
    renderQuestion();
  }
});

document.getElementById("shareButton").addEventListener("click", async () => {
  const text = `難読地名クイズ「読める？ニッポン」で10問中${score}問正解！\n#地名の日 #1日1アプリ`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "読める？ニッポン", text, url: location.href });
    } catch (_) {}
  } else {
    await navigator.clipboard.writeText(`${text}\n${location.href}`);
    const button = document.getElementById("shareButton");
    button.textContent = "結果をコピーしました";
    setTimeout(() => { button.textContent = "結果をシェア"; }, 1800);
  }
});

document.addEventListener("keydown", (event) => {
  if (!screens.quiz.classList.contains("active")) return;
  if (/^[1-4]$/.test(event.key) && !answered) {
    el.answers.children[Number(event.key) - 1]?.click();
  } else if ((event.key === "Enter" || event.key === " ") && answered) {
    event.preventDefault();
    el.nextButton.click();
  }
});
