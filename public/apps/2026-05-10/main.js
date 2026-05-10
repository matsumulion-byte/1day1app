const asset = (p) => new URL(p, import.meta.url).toString();

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const chatLog = document.getElementById("chatLog");
const choicesEl = document.getElementById("choices");
const resultLabel = document.getElementById("resultLabel");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rounds = [
  {
    mom: "今日って、何の日か知ってる？",
    correct: 1,
    choices: [
      {
        text: "日曜日でしょ",
        reply: "日曜日でしょ",
        badMom: [
          "日曜日でしょ、か。",
          "うん、間違ってはいないね。",
          "カレンダーとしては正解だもんね。",
          "お母さんもこれからは、日付以上の意味を持たない存在としてやっていきます。",
          "5月の第2日曜日に、たまたま発生する人。",
          "季語みたいでいいね。"
        ]
      },
      {
        text: "母の日でしょ。いつもありがとう",
        reply: "母の日でしょ。いつもありがとう",
        okMom: [
          "覚えてたんだ。",
          "ありがとう。",
          "そう言ってもらえるだけで嬉しいよ。"
        ]
      },
      {
        text: "え、何かあったっけ？",
        reply: "え、何かあったっけ？",
        badMom: [
          "何かあったっけ、か。",
          "うん、別に何もないよ。",
          "お母さんが少しだけ期待していただけです。",
          "期待って勝手にするものだから、勝手に片付けておくね。",
          "燃えるゴミでいいかな。",
          "自治体の区分、確認しておきます。"
        ]
      },
      {
        text: "母の日？ 何か欲しいものある？",
        reply: "母の日？ 何か欲しいものある？",
        badMom: [
          "物の話なんだ。",
          "うん、わかりやすくていいよね。",
          "気持ちって見えないし、配送状況も追えないもんね。",
          "お母さんも今度から、あなたの心配をAmazonで定期便にしておくね。",
          "置き配でいい？",
          "気づいたときに受け取ってくれれば。"
        ]
      }
    ]
  },
  {
    mom: "最近、ちゃんとご飯食べてる？",
    correct: 2,
    choices: [
      {
        text: "まあ適当に",
        reply: "まあ適当に",
        badMom: [
          "適当か。",
          "そうだよね、食べられれば何でもいいよね。",
          "お母さんが昔、栄養とか考えてたのも、今思えば自己満足だったね。",
          "これからは思い出の中の味噌汁にも「適当」ってラベル貼っておくね。",
          "便利だね。",
          "思い出って、あとから編集できるから。"
        ]
      },
      {
        text: "それ毎回聞くね",
        reply: "それ毎回聞くね",
        badMom: [
          "毎回聞いてごめんね。",
          "たしかに、しつこいよね。",
          "ご飯を食べてるか心配するだけのbotみたいになってたね。",
          "これからは聞かないようにするね。",
          "もし倒れても、お母さんの通知設定はオフにしておきます。",
          "迷惑通知にならないように。"
        ]
      },
      {
        text: "食べてるよ。心配してくれてありがとう",
        reply: "食べてるよ。心配してくれてありがとう",
        okMom: [
          "そっか、よかった。",
          "ちゃんと食べてるなら安心したよ。"
        ]
      },
      {
        text: "大丈夫だから心配しなくていいよ",
        reply: "大丈夫だから心配しなくていいよ",
        badMom: [
          "心配しなくていいんだね。",
          "わかった。",
          "お母さんの心配は、もうサービス終了ということで。",
          "長らくのご利用ありがとうございました。",
          "なお、再開予定は未定です。",
          "ご不便をおかけしないよう、静かに終了します。"
        ]
      }
    ]
  },
  {
    mom: "最近、顔見てないね。",
    correct: 2,
    choices: [
      {
        text: "写真なら送るよ",
        reply: "写真なら送るよ",
        badMom: [
          "写真ね。",
          "便利だよね、写真。",
          "顔を見たことにできるもんね。",
          "お母さんもこれからは、あなたの小さい頃の写真に話しかけることにするね。",
          "そっちの方が返事も尖ってないし。",
          "充電も減らないし。"
        ]
      },
      {
        text: "そのうち帰るよ",
        reply: "そのうち帰るよ",
        badMom: [
          "そのうちね。",
          "いい言葉だよね。",
          "いつでもないけど、完全に嘘でもない。",
          "お母さんも今度から「そのうち元気になるね」って言うことにする。",
          "具体的な日付がない言葉って、優しいようで便利だね。",
          "待つ方だけが、カレンダーを見てればいいんだもんね。"
        ]
      },
      {
        text: "近いうちに顔出すね。",
        reply: "近いうちに顔出すね。",
        okMom: ["ほんと？", "無理はしなくていいけど、楽しみにしてるね。"]
      },
      {
        text: "忙しいから仕方ない",
        reply: "忙しいから仕方ない",
        badMom: [
          "仕方ないよね。",
          "忙しいのは大事なことだもんね。",
          "親って、忙しくない時に見るフォルダみたいなものだもんね。",
          "今は開く必要ないよね。",
          "でもたまにアップデートだけは来るから、邪魔だったら通知切っておいてね。",
          "お母さん側でも、なるべく軽いデータになっておきます。"
        ]
      }
    ]
  },
  {
    mom: "今日は連絡くれてありがとう。",
    correct: 3,
    choices: [
      {
        text: "また近いうちに連絡するね",
        reply: "また近いうちに連絡するね",
        badMom: [
          "近いうちね。",
          "うん、ありがたい言葉だよね。",
          "今日の話を、次回予告にしてくれる感じがいいね。",
          "お母さんもこれからは、今日嬉しかった気持ちを一旦保留にしておきます。",
          "続きは次回、ってことで。",
          "打ち切りにならないといいね。"
        ]
      },
      {
        text: "母の日だし、ちゃんと言えてよかった",
        reply: "母の日だし、ちゃんと言えてよかった",
        badMom: [
          "母の日だし、か。",
          "そうだよね。",
          "イベントがあると、人は動きやすいもんね。",
          "お母さんもこれからは、行事としてだけ存在することにします。",
          "年に一度、通知が来たら思い出すタイプの母です。",
          "省エネでいいね。"
        ]
      },
      {
        text: "これからも元気でいてね",
        reply: "これからも元気でいてね",
        badMom: [
          "元気でいてね、か。",
          "うん、優しい言葉だよね。",
          "でもそれって、お母さん側の努力目標なんだね。",
          "あなたに心配をかけないように、こちらで健康を維持しておきます。",
          "メンテナンスはこちら負担で。",
          "長期保証はついてないけど、なるべく頑張ります。"
        ]
      },
      {
        text: "元気でいろよババア",
        reply: "元気でいろよババア",
        okMom: [
          "あら、毒蝮三太夫じゃないの。",
          "お母さんが好きなの、覚えててくれたんだ。",
          "そういうのが一番うれしいんだよ。",
          "ありがとう。"
        ]
      }
    ]
  }
];

let currentRound = 0;
let locked = false;

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

function startGame() {
  currentRound = 0;
  locked = false;

  startScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  chatLog.innerHTML = "";
  choicesEl.innerHTML = "";

  addTimeChip();
  showRound();
}

function addTimeChip() {
  const chip = document.createElement("div");
  chip.className = "time-chip";
  chip.textContent = "今日 10:10";
  chatLog.appendChild(chip);
}

async function showRound() {
  locked = true;
  clearChoices();

  const round = rounds[currentRound];

  await showTyping();
  addMessage("mom", round.mom);

  renderChoices(round);
  locked = false;
}

function renderChoices(round) {
  choicesEl.innerHTML = "";

  round.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.type = "button";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => selectChoice(index));
    choicesEl.appendChild(btn);
  });
}

async function selectChoice(index) {
  if (locked) return;

  locked = true;
  disableChoices();

  const round = rounds[currentRound];
  const choice = round.choices[index];

  addMessage("me", choice.reply, true);

  if (index === round.correct) {
    await sleep(430);

    for (const text of choice.okMom) {
      await showTyping();
      addMessage("mom", text);
    }

    currentRound += 1;

    if (currentRound >= rounds.length) {
      showContinueButton("感謝が伝わった", () => showResult(true));
      return;
    }

    await sleep(650);
    showRound();
    return;
  }

  gameScreen.classList.add("shake");
  setTimeout(() => gameScreen.classList.remove("shake"), 320);

  await sleep(420);

  for (const text of choice.badMom) {
    await showTyping(360);
    addMessage("mom", text);
  }

  showContinueButton("会話を終了する", () => showResult(false));
}

function showContinueButton(label, handler) {
  choicesEl.innerHTML = "";

  const btn = document.createElement("button");
  btn.className = "choice-btn continue-btn";
  btn.type = "button";
  btn.textContent = label;
  btn.addEventListener("click", handler);

  choicesEl.appendChild(btn);
}

function addMessage(sender, text, read = false) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  if (sender === "me" && read) {
    const readEl = document.createElement("div");
    readEl.className = "read";
    readEl.innerHTML = "既読<br>10:10";
    row.appendChild(readEl);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  chatLog.appendChild(row);
  scrollBottom();
}

async function showTyping(duration = 520) {
  const row = document.createElement("div");
  row.className = "message-row mom typing-row";

  const bubble = document.createElement("div");
  bubble.className = "bubble typing";
  bubble.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(bubble);
  chatLog.appendChild(row);
  scrollBottom();

  await sleep(duration);
  row.remove();
}

function clearChoices() {
  choicesEl.innerHTML = "";
}

function disableChoices() {
  [...choicesEl.querySelectorAll("button")].forEach((btn) => {
    btn.disabled = true;
  });
}

function showResult(isClear) {
  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  if (isClear) {
    resultLabel.textContent = "CLEAR";
    resultTitle.textContent = "感謝が伝わりました";
    resultText.innerHTML = "お母さんに、ちゃんとありがとうが伝わりました。<br>言葉遣いより、覚えていることが大事な日もあります。";
  } else {
    resultLabel.textContent = "END";
    resultTitle.textContent = "会話が終了しました";
    resultText.innerHTML = "今日は、少しだけ言葉が足りなかったようです。<br>来年の母の日に期待しましょう。";
  }
}

function scrollBottom() {
  requestAnimationFrame(() => {
    chatLog.scrollTop = chatLog.scrollHeight;
  });
}