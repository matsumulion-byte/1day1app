const asset = (p) => new URL(p, import.meta.url).toString();

const screen = document.querySelector("#screen");

const questions = [
  {
    id: "daily",
    title: "1日に何本くらい吸っていますか？",
    options: [
      {
        text: "0本",
        zeroRoute: true,
      },
      {
        text: "5本以下",
        dependence: 1,
      },
      {
        text: "6〜10本",
        dependence: 2,
      },
      {
        text: "11〜20本",
        dependence: 3,
      },
      {
        text: "21本以上",
        dependence: 4,
      },
    ],
  },
  {
    id: "morning",
    title: "起きてから最初の1本まで、どれくらいですか？",
    options: [
      {
        text: "5分以内",
        dependence: 4,
      },
      {
        text: "30分以内",
        dependence: 3,
      },
      {
        text: "1時間以内",
        dependence: 2,
      },
      {
        text: "朝はあまり吸わない",
        dependence: 1,
      },
    ],
  },
  {
    id: "trigger",
    title: "一番吸いたくなるタイミングは？",
    options: [
      {
        text: "食後・コーヒーのあと",
        type: "routine",
      },
      {
        text: "イライラした時",
        type: "stress",
      },
      {
        text: "飲み会・誰かが吸っている時",
        type: "party",
      },
      {
        text: "暇な時・手持ち無沙汰な時",
        type: "mouth",
      },
    ],
  },
  {
    id: "start",
    title: "禁煙しようと思った時、最初にやりそうなことは？",
    options: [
      {
        text: "とりあえず残りのタバコを吸い切る",
        type: "excuse",
        prep: -1,
      },
      {
        text: "周りに宣言する",
        type: "public",
        prep: 2,
      },
      {
        text: "ガムやミンティアを買う",
        type: "mouth",
        prep: 2,
      },
      {
        text: "何も準備せず気合いで始める",
        type: "confidence",
        prep: -2,
      },
    ],
  },
  {
    id: "one",
    title: "「1本だけならいいか」と思いやすい場面は？",
    options: [
      {
        text: "飲み会",
        type: "party",
      },
      {
        text: "仕事で嫌なことがあった時",
        type: "stress",
      },
      {
        text: "食後",
        type: "routine",
      },
      {
        text: "そもそも毎回思う",
        type: "excuse",
      },
    ],
  },
  {
    id: "pain",
    title: "禁煙中に一番つらそうなのは？",
    options: [
      {
        text: "食後の物足りなさ",
        type: "routine",
      },
      {
        text: "イライラ",
        type: "stress",
      },
      {
        text: "飲み会で自分だけ吸えないこと",
        type: "party",
      },
      {
        text: "口さみしさ",
        type: "mouth",
      },
    ],
  },
];

const typeResults = {
  routine: {
    title: "食後の一本に支配されし者",
    description:
      "あなたの敵は、ニコチンだけではありません。食後、コーヒー、休憩時間。その一連の流れが強すぎます。満腹になった瞬間、体が勝手に喫煙所へ向かう可能性があります。",
    advice: [
      "食後すぐ歯を磨く",
      "コーヒーを一時的にお茶や炭酸水へ変える",
      "食後に立つ方向を喫煙所と逆にする",
      "休憩場所を変える",
    ],
  },
  stress: {
    title: "ストレスを理由にする天才",
    description:
      "あなたは「今だけは仕方ない」の使い手です。理不尽、疲労、人間関係。どれも吸う理由として強そうに見えますが、冷静に考えるとストレスがない日も吸っていました。",
    advice: [
      "イラついた時用の避難行動を先に決める",
      "水を飲む、席を立つ、3分だけ歩く",
      "怒りが来た瞬間に喫煙所へ行かない",
      "吸いたさではなく怒りをやり過ごす",
    ],
  },
  party: {
    title: "飲み会で全部なかったことにする人",
    description:
      "あなたの禁煙は、飲み会の2杯目あたりで急に記憶が薄くなります。「1本いる？」の一言で、昨日までの努力がすごい速度で遠ざかります。",
    advice: [
      "禁煙初期は飲み会を避ける",
      "行くなら喫煙者の隣に座らない",
      "酒量を増やしすぎない",
      "先に『吸わない』と言っておく",
    ],
  },
  mouth: {
    title: "口さみしさの化身",
    description:
      "あなたは煙が欲しいというより、口と手の暇つぶしを求めています。タバコの代わりに何もしない状態を作ると、かなり負けやすいです。",
    advice: [
      "ガム、ミンティア、炭酸水を用意する",
      "手持ち無沙汰対策にペンやハンドグリップを置く",
      "吸いたくなったら口に入れるものを固定する",
      "暇な時間を短く区切る",
    ],
  },
  excuse: {
    title: "1本だけならノーカン信者",
    description:
      "あなたは禁煙の最大の敵である『例外』をすぐに作ります。1本だけ、今日だけ、今だけ。だいたい全部カウントされます。",
    advice: [
      "例外ルールを作らない",
      "残りのタバコを吸い切る儀式をやめる",
      "吸った理由を記録する",
      "再開ではなく即日復帰する",
    ],
  },
  confidence: {
    title: "自信だけはある即日敗北タイプ",
    description:
      "あなたは禁煙前の自己評価が高めです。『やめようと思えばやめられる』と言いますが、やめようと思う日より吸おうと思う日の方が多そうです。",
    advice: [
      "気合いではなく準備で始める",
      "タバコ、ライター、灰皿を先に消す",
      "吸いたくなる場所を避ける",
      "開始日と代替行動を決めてから始める",
    ],
  },
  public: {
    title: "宣言して自分を追い込む人",
    description:
      "あなたは周囲の目を使えば戦えるタイプです。ただし、宣言だけで満足すると普通に負けます。言ったあとに環境を変えるところまでやる必要があります。",
    advice: [
      "周りに禁煙開始日を伝える",
      "喫煙所に誘わないでほしいと頼む",
      "吸わなかった日数を見える化する",
      "失敗した時も黙ってなかったことにしない",
    ],
  },
};

const zeroResult = {
  title: "禁煙する資格がない人",
  rate: "測定不能",
  difficulty: "測定不能",
  description:
    "あなたは現在、1日に0本しかタバコを吸っていません。これは非常に深刻です。なぜなら、禁煙とは「吸っているタバコをやめること」だからです。つまりあなたは、禁煙しようにも、やめるタバコがありません。",
  planTitle: "禁煙成功への第一歩",
  advice: [
    "まずは一度タバコを吸いましょう",
    "そしてすぐにやめましょう",
    "これで、あなたも立派な禁煙成功者です",
  ],
};

let current = 0;
let answers = [];
let scores = {
  dependence: 0,
  prep: 0,
  types: {},
};

function resetState() {
  current = 0;
  answers = [];
  scores = {
    dependence: 0,
    prep: 0,
    types: {},
  };
}

function panel(content) {
  return `
    <div class="panel">
      <div class="smoke one"></div>
      <div class="smoke two"></div>
      <div class="smoke three"></div>
      ${content}
    </div>
  `;
}

function renderStart() {
  resetState();

  screen.innerHTML = panel(`
    <p class="kicker">5/31 世界禁煙デー</p>
    <h1 class="title">
      禁煙できるかな
      <span class="small">診断</span>
    </h1>
    <p class="lead">
      あなたが禁煙に失敗するとしたら、たぶん意志の弱さではなく、負け方のパターンのせいです。
      何本吸っているか、いつ吸いたくなるかから、禁煙難易度と負け筋を診断します。
    </p>
    <div class="hero-box">
      <p class="hero-label">診断内容</p>
      <p class="hero-text">
        禁煙難易度 × 失敗パターン × それっぽい対策
      </p>
    </div>
    <button class="start-button" type="button">診断する</button>
  `);

  document.querySelector(".start-button").addEventListener("click", renderQuestion);
}

function renderQuestion() {
  const question = questions[current];
  const progress = Math.round((current / questions.length) * 100);

  screen.innerHTML = panel(`
    <div class="progress-wrap">
      <div class="progress-text">
        <span>QUESTION ${current + 1}</span>
        <span>${current + 1} / ${questions.length}</span>
      </div>
      <div class="progress">
        <div class="progress-bar" style="width:${progress}%"></div>
      </div>
    </div>

    <section class="question">
      <h2 class="question-title">${question.title}</h2>
      <div class="option-list">
        ${question.options
          .map(
            (option, index) => `
              <button class="option-button" type="button" data-index="${index}">
                ${option.text}
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `);

  document.querySelectorAll(".option-button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      chooseOption(question.options[index]);
    });
  });
}

function chooseOption(option) {
  answers.push(option);

  if (option.zeroRoute) {
    renderZeroResult();
    return;
  }

  if (typeof option.dependence === "number") {
    scores.dependence += option.dependence;
  }

  if (typeof option.prep === "number") {
    scores.prep += option.prep;
  }

  if (option.type) {
    scores.types[option.type] = (scores.types[option.type] || 0) + 1;
  }

  current += 1;

  if (current >= questions.length) {
    renderResult();
  } else {
    renderQuestion();
  }
}

function getMainType() {
  const entries = Object.entries(scores.types);

  if (entries.length === 0) return "confidence";

  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return Math.random() - 0.5;
  });

  return entries[0][0];
}

function getDifficulty() {
  const point = scores.dependence;

  if (point <= 3) {
    return {
      label: "低め",
      text: "本数と朝の1本までの時間を見る限り、体の依存は比較的軽めです。ただし、軽めだから簡単とは限りません。習慣で吸っているタイプは、生活の流れを変えないと普通に戻ります。",
      baseRate: 72,
    };
  }

  if (point <= 5) {
    return {
      label: "ふつう",
      text: "依存度は中くらいです。勢いだけでも数日は行けるかもしれませんが、吸いたくなる場面を潰しておかないと、いつもの流れに負けます。",
      baseRate: 56,
    };
  }

  if (point <= 7) {
    return {
      label: "高め",
      text: "依存度は高めです。気合いだけで始めるより、ニコチンガム・パッチ・禁煙外来なども選択肢に入れた方が現実的です。",
      baseRate: 38,
    };
  }

  return {
    label: "かなり高め",
    text: "依存度はかなり高めです。禁煙は精神論で殴るより、物理的に吸えない環境を作って、必要なら薬や外部の支援を使う方が向いています。",
    baseRate: 24,
  };
}

function getRate(baseRate) {
  const rate = baseRate + scores.prep * 5;
  return Math.max(8, Math.min(92, rate));
}

function renderResult() {
  const mainType = getMainType();
  const result = typeResults[mainType];
  const difficulty = getDifficulty();
  const rate = getRate(difficulty.baseRate);

  screen.innerHTML = panel(`
    <section class="result-head">
      <p class="result-kicker">あなたは</p>
      <h2 class="result-title">${result.title}</h2>
      <div class="result-rate">
        <div class="rate-num">${rate}%</div>
        <div class="rate-bar">
          <div class="rate-fill" style="width:${rate}%"></div>
        </div>
      </div>
    </section>

    <section class="result-section">
      <h3>禁煙成功率</h3>
      <p>
        ${rate}%くらいです。数字は雰囲気ですが、あなたの回答を見る限り、勝負どころはかなりはっきりしています。
      </p>
    </section>

    <section class="result-section">
      <h3>禁煙難易度：${difficulty.label}</h3>
      <p>${difficulty.text}</p>
    </section>

    <section class="result-section">
      <h3>負けパターン</h3>
      <p>${result.description}</p>
    </section>

    <section class="result-section">
      <h3>禁煙するなら</h3>
      <ul>
        ${result.advice.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>

    <div class="actions">
      <button class="retry-button" type="button">もう一回診断する</button>
      <button class="share-button" type="button">結果をコピー</button>
    </div>
  `);

  document.querySelector(".retry-button").addEventListener("click", renderStart);
  document.querySelector(".share-button").addEventListener("click", () => {
    copyResult(`禁煙できるかな診断\nあなたは「${result.title}」\n禁煙成功率：${rate}%\n禁煙難易度：${difficulty.label}`);
  });
}

function renderZeroResult() {
  screen.innerHTML = panel(`
    <section class="result-head">
      <p class="result-kicker">あなたは</p>
      <h2 class="result-title">${zeroResult.title}</h2>
      <div class="result-rate">
        <div class="rate-num">${zeroResult.rate}</div>
        <div class="rate-bar">
          <div class="rate-fill" style="width:100%"></div>
        </div>
      </div>
    </section>

    <section class="result-section">
      <h3>診断結果</h3>
      <p>${zeroResult.description}</p>
    </section>

    <section class="result-section">
      <h3>${zeroResult.planTitle}</h3>
      <ul>
        ${zeroResult.advice.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>

    <div class="actions">
      <button class="retry-button" type="button">もう一回診断する</button>
      <button class="share-button" type="button">結果をコピー</button>
    </div>
  `);

  document.querySelector(".retry-button").addEventListener("click", renderStart);
  document.querySelector(".share-button").addEventListener("click", () => {
    copyResult(`禁煙できるかな診断\nあなたは「${zeroResult.title}」\n禁煙成功率：${zeroResult.rate}`);
  });
}

async function copyResult(text) {
  try {
    await navigator.clipboard.writeText(text);
    const button = document.querySelector(".share-button");
    const original = button.textContent;
    button.textContent = "コピーしました";
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  } catch (error) {
    alert(text);
  }
}

renderStart();