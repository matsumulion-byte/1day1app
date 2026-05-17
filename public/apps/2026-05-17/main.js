const asset = (p) => new URL(p, import.meta.url).toString();

const $ = (id) => document.getElementById(id);

const screens = {
  hero: $("hero"),
  question: $("questionScreen"),
  confirm: $("confirmScreen"),
  result: $("resultScreen"),
};

const questions = [
  {
    key: "decade",
    title: "だいたいどの年代の戦隊ですか？",
    note: "うろ覚えなら「わからない」で大丈夫です。",
    options: [
      ["showa", "昭和"],
      ["90s", "90年代"],
      ["2000s", "2000年代"],
      ["2010s", "2010年代"],
      ["2020s", "2020年代"],
      ["unknown", "わからない"],
    ],
  },
  {
    key: "motifGroup",
    title: "作品の印象はどれに近いですか？",
    note: "まずは大きな分類で絞ります。",
    options: [
      ["animal", "動物・生き物っぽい"],
      ["vehicle", "乗り物・メカっぽい"],
      ["job", "職業・組織っぽい"],
      ["legend", "和風・伝説っぽい"],
      ["fantasy", "魔法・ファンタジーっぽい"],
      ["tech", "科学・電子・未来っぽい"],
      ["weird", "変化球・よくわからない"],
      ["unknown", "わからない"],
    ],
  },
  {
    key: "motif",
    title: "もう少し近いモチーフは？",
    note: "前の回答に合わせて選択肢が変わります。",
    dynamic: true,
  },
  {
    key: "initialMembers",
    title: "最初は何人でしたか？",
    note: "初期メンバーの人数です。",
    options: [
      [3, "3人"],
      [4, "4人"],
      [5, "5人"],
      [6, "6人以上"],
      ["unknown", "わからない"],
    ],
  },
  {
    key: "femaleCount",
    title: "初期女性メンバーは何人でしたか？",
    note: "ピンク・イエロー・ホワイトなどの初期メンバーです。",
    options: [
      [0, "0人"],
      [1, "1人"],
      [2, "2人"],
      [3, "3人以上"],
      ["unknown", "わからない"],
    ],
  },
  {
    key: "hasExtra",
    title: "追加戦士はいましたか？",
    note: "金・銀・白・黒など、途中参加の印象があれば。",
    options: [
      [true, "いた"],
      [false, "いない"],
      ["unknown", "覚えてない"],
    ],
  },
  {
    key: "color",
    title: "印象に残っている色はありますか？",
    note: "レッド以外の色の方が当たりやすいです。",
    options: [
      ["black", "黒"],
      ["white", "白"],
      ["green", "緑"],
      ["pink", "ピンク"],
      ["yellow", "黄"],
      ["gold", "金"],
      ["silver", "銀"],
      ["purple", "紫"],
      ["orange", "オレンジ"],
      ["unknown", "特にない／わからない"],
    ],
  },
  {
    key: "titleType",
    title: "タイトルの語尾は覚えていますか？",
    note: "〇〇マン、〇〇レンジャー、〇〇ジャーなど。",
    options: [
      ["マン", "〇〇マン"],
      ["レンジャー", "〇〇レンジャー"],
      ["ジャー", "〇〇ジャー"],
      ["その他", "それ以外"],
      ["unknown", "わからない"],
    ],
  },
];

const motifOptions = {
  animal: [
    ["dinosaur", "恐竜"],
    ["bird", "鳥"],
    ["beast", "獣・動物全般"],
    ["insect", "昆虫"],
    ["mythicBeast", "伝説の獣"],
    ["unknown", "わからない"],
  ],
  vehicle: [
    ["car", "車"],
    ["train", "電車"],
    ["airplane", "飛行機"],
    ["rescueVehicle", "レスキュー車両"],
    ["spaceShip", "宇宙船・未来メカ"],
    ["unknown", "わからない"],
  ],
  job: [
    ["police", "警察・刑事"],
    ["rescue", "レスキュー"],
    ["adventure", "冒険・探検"],
    ["spy", "怪盗・スパイ"],
    ["kingdom", "王様・国家"],
    ["unknown", "わからない"],
  ],
  legend: [
    ["ninja", "忍者"],
    ["samurai", "侍"],
    ["kungfu", "中国拳法"],
    ["momotaro", "桃太郎・昔話"],
    ["legend", "伝説・神話"],
    ["unknown", "わからない"],
  ],
  fantasy: [
    ["magic", "魔法"],
    ["fantasy", "異世界・ファンタジー"],
    ["knight", "騎士・王国"],
    ["gem", "宝石・キラキラ"],
    ["unknown", "わからない"],
  ],
  tech: [
    ["science", "科学"],
    ["electric", "電子・電撃"],
    ["digital", "デジタル"],
    ["space", "宇宙"],
    ["future", "未来"],
    ["unknown", "わからない"],
  ],
  weird: [
    ["anniversary", "歴代戦隊・記念作品"],
    ["comedy", "ギャグ・カオス"],
    ["dance", "踊る印象が強い"],
    ["vs", "2つの戦隊が出る"],
    ["unknown", "わからない"],
  ],
  unknown: [
    ["dinosaur", "恐竜"],
    ["animal", "動物"],
    ["vehicle", "乗り物"],
    ["ninja", "忍者"],
    ["police", "警察"],
    ["magic", "魔法"],
    ["unknown", "わからない"],
  ],
};

const sentaiData = [
  s("秘密戦隊ゴレンジャー", 1975, "showa", ["job"], ["spy"], 5, 1, false, ["red","blue","yellow","pink","green"], "レンジャー", "5人の元祖っぽさがありますか？", "ゴレンジャー感がかなり強いです。スーパー戦隊の入口です。"),
  s("ジャッカー電撃隊", 1977, "showa", ["tech"], ["electric","cyborg"], 4, 1, true, ["red","blue","pink","green","white"], "その他", "トランプやサイボーグっぽい印象がありますか？", "4人スタートでトランプ感。ジャッカー電撃隊っぽいです。"),
  s("バトルフィーバーJ", 1979, "showa", ["job","weird"], ["dance","world"], 5, 1, false, ["red","blue","orange","black","pink"], "その他", "世界各国やダンスっぽい印象がありますか？", "国モチーフとダンス感。バトルフィーバーJの可能性が高いです。"),
  s("電子戦隊デンジマン", 1980, "showa", ["tech"], ["electric","science"], 5, 1, false, ["red","blue","yellow","green","pink"], "マン", "電子・デンジ星っぽい印象がありますか？", "電子っぽさが出ています。デンジマン濃厚です。"),
  s("太陽戦隊サンバルカン", 1981, "showa", ["animal"], ["bird","beast"], 3, 0, false, ["red","blue","yellow"], "その他", "男3人で、太陽・ワシ・サメ・ヒョウの印象がありますか？", "3人で女性なし。サンバルカンの線が強いです。"),
  s("大戦隊ゴーグルファイブ", 1982, "showa", ["tech"], ["science","gem"], 5, 1, false, ["red","black","blue","yellow","pink"], "その他", "新体操や宝石っぽい印象がありますか？", "ゴーグルと宝石感。ゴーグルファイブっぽいです。"),
  s("科学戦隊ダイナマン", 1983, "showa", ["tech"], ["science"], 5, 1, false, ["red","black","blue","yellow","pink"], "マン", "爆発と科学の印象が強いですか？", "科学と爆発。ダイナマン寄りです。"),
  s("超電子バイオマン", 1984, "showa", ["tech"], ["science","electric"], 5, 2, false, ["red","green","blue","yellow","pink"], "マン", "バイオ粒子や初期女性2人の印象がありますか？", "女性2人の昭和戦隊ならバイオマンがかなり近いです。"),
  s("電撃戦隊チェンジマン", 1985, "showa", ["animal","legend"], ["mythicBeast"], 5, 1, false, ["red","black","blue","white","pink"], "マン", "グリフォンやペガサスなど伝説獣っぽいですか？", "伝説獣モチーフ。チェンジマンの可能性があります。"),
  s("超新星フラッシュマン", 1986, "showa", ["tech","space"], ["space","science"], 5, 2, false, ["red","green","blue","yellow","pink"], "マン", "宇宙で育った5人という印象がありますか？", "宇宙育ち感があるならフラッシュマンです。"),
  s("光戦隊マスクマン", 1987, "showa", ["legend"], ["kungfu","martial"], 5, 1, false, ["red","black","blue","yellow","pink"], "マン", "気功やオーラパワーの印象がありますか？", "武術・気功感。マスクマンが近いです。"),
  s("超獣戦隊ライブマン", 1988, "showa", ["animal"], ["beast"], 3, 1, true, ["red","yellow","blue","black","green"], "マン", "最初3人で、途中から黒と緑が増えましたか？", "3人スタートで追加あり。ライブマン濃厚です。"),
  s("高速戦隊ターボレンジャー", 1989, "showa", ["vehicle"], ["car"], 5, 1, false, ["red","black","blue","yellow","pink"], "レンジャー", "高校生と車の印象がありますか？", "高校生×車。ターボレンジャーっぽいです。"),
  s("地球戦隊ファイブマン", 1990, "90s", ["job"], ["teacher"], 5, 2, false, ["red","blue","black","pink","yellow"], "マン", "兄弟先生っぽい印象がありますか？", "兄弟・教師・ファイブ。ファイブマン寄りです。"),
  s("鳥人戦隊ジェットマン", 1991, "90s", ["animal","vehicle"], ["bird","airplane"], 5, 2, false, ["red","black","yellow","white","blue"], "マン", "恋愛や人間関係がやたら濃い、メロドラマっぽい戦隊ですか？", "鳥・飛行機・90年代・メロドラマ。ジェットマン濃厚です。"),
  s("恐竜戦隊ジュウレンジャー", 1992, "90s", ["animal","fantasy"], ["dinosaur","mythicBeast"], 5, 1, true, ["red","black","blue","yellow","pink","green"], "レンジャー", "恐竜と守護獣の印象が強いですか？", "恐竜と初期5人。ジュウレンジャーの可能性が高いです。"),
  s("五星戦隊ダイレンジャー", 1993, "90s", ["legend"], ["kungfu","mythicBeast"], 5, 1, true, ["red","green","blue","yellow","pink","white"], "レンジャー", "中国拳法や気力の印象がありますか？", "拳法・気力・白い追加戦士。ダイレンジャーが近いです。"),
  s("忍者戦隊カクレンジャー", 1994, "90s", ["legend"], ["ninja","yokai"], 5, 1, true, ["red","white","blue","yellow","black"], "レンジャー", "忍者で妖怪、ちょっとコミカルな印象がありますか？", "忍者と妖怪ならカクレンジャーです。"),
  s("超力戦隊オーレンジャー", 1995, "90s", ["tech","legend"], ["science","ancient"], 5, 2, true, ["red","green","blue","yellow","pink","black"], "レンジャー", "古代文明と軍隊っぽさがありますか？", "古代文明と超力。オーレンジャーっぽいです。"),
  s("激走戦隊カーレンジャー", 1996, "90s", ["vehicle","weird"], ["car","comedy"], 5, 2, true, ["red","blue","green","yellow","pink","white"], "レンジャー", "かなりギャグで、車屋っぽい印象がありますか？", "車でギャグ強め。カーレンジャー濃厚です。"),
  s("電磁戦隊メガレンジャー", 1997, "90s", ["tech"], ["digital","school"], 5, 2, true, ["red","black","blue","yellow","pink","silver"], "レンジャー", "高校生・パソコン・デジタルっぽい印象がありますか？", "高校生とデジタル感。メガレンジャーが近いです。"),
  s("星獣戦隊ギンガマン", 1998, "90s", ["animal","fantasy"], ["beast","fantasy"], 5, 1, true, ["red","green","blue","yellow","pink","black"], "マン", "星獣や森の民っぽいファンタジー感がありますか？", "星獣と自然ファンタジー。ギンガマン寄りです。"),
  s("救急戦隊ゴーゴーファイブ", 1999, "90s", ["job","vehicle"], ["rescue","rescueVehicle"], 5, 1, false, ["red","blue","green","yellow","pink"], "その他", "兄妹でレスキュー隊っぽいですか？", "レスキュー兄妹ならゴーゴーファイブです。"),
  s("未来戦隊タイムレンジャー", 2000, "2000s", ["tech","job"], ["future","police"], 5, 1, true, ["red","blue","green","yellow","pink","silver"], "レンジャー", "未来人や時間移動の印象がありますか？", "時間・未来・警察感。タイムレンジャー濃厚です。"),
  s("百獣戦隊ガオレンジャー", 2001, "2000s", ["animal"], ["beast"], 5, 1, true, ["red","yellow","blue","black","white","silver"], "レンジャー", "パワーアニマルや野生っぽさがありますか？", "百獣・動物全般。ガオレンジャーの線が強いです。"),
  s("忍風戦隊ハリケンジャー", 2002, "2000s", ["legend"], ["ninja"], 3, 1, true, ["red","blue","yellow","green","crimson","navy"], "レンジャー", "忍者で、最初は3人でしたか？", "3人スタートの忍者。ハリケンジャーっぽいです。"),
  s("爆竜戦隊アバレンジャー", 2003, "2000s", ["animal"], ["dinosaur"], 3, 1, true, ["red","blue","yellow","black","white"], "レンジャー", "爆竜やアバレ感がありますか？", "恐竜で3人スタート。アバレンジャー濃厚です。"),
  s("特捜戦隊デカレンジャー", 2004, "2000s", ["job","tech"], ["police","space"], 5, 2, true, ["red","blue","green","yellow","pink","white","gold","silver"], "レンジャー", "宇宙警察や刑事ドラマっぽい印象がありますか？", "警察・宇宙・刑事。デカレンジャーがかなり近いです。"),
  s("魔法戦隊マジレンジャー", 2005, "2000s", ["fantasy"], ["magic"], 5, 2, true, ["red","yellow","blue","pink","green","white"], "レンジャー", "魔法一家っぽい印象がありますか？", "魔法と家族。マジレンジャー濃厚です。"),
  s("轟轟戦隊ボウケンジャー", 2006, "2000s", ["job","vehicle"], ["adventure","vehicle"], 5, 1, true, ["red","black","blue","yellow","pink","silver"], "レンジャー", "冒険・プレシャス・探検隊っぽいですか？", "冒険とお宝。ボウケンジャーが近いです。"),
  s("獣拳戦隊ゲキレンジャー", 2007, "2000s", ["animal","legend"], ["beast","kungfu"], 3, 1, true, ["red","yellow","blue","purple","white"], "レンジャー", "獣拳や修行の印象がありますか？", "獣拳・修行・3人。ゲキレンジャーっぽいです。"),
  s("炎神戦隊ゴーオンジャー", 2008, "2000s", ["vehicle"], ["car"], 3, 1, true, ["red","blue","yellow","green","black","gold","silver"], "ジャー", "しゃべる車っぽい相棒がいましたか？", "炎神と車。ゴーオンジャー濃厚です。"),
  s("侍戦隊シンケンジャー", 2009, "2000s", ["legend"], ["samurai"], 5, 2, true, ["red","blue","pink","green","yellow","gold"], "ジャー", "筆文字や侍っぽい印象がありますか？", "侍・和風・筆文字。シンケンジャーの可能性が高いです。"),
  s("天装戦隊ゴセイジャー", 2010, "2010s", ["fantasy","legend"], ["angel","fantasy"], 5, 2, true, ["red","pink","black","yellow","blue","silver"], "ジャー", "天使やカードの印象がありますか？", "天使・護星・カード感。ゴセイジャー寄りです。"),
  s("海賊戦隊ゴーカイジャー", 2011, "2010s", ["job","weird"], ["pirate","anniversary"], 5, 2, true, ["red","blue","yellow","green","pink","silver"], "ジャー", "歴代戦隊に変身する海賊ですか？", "海賊で歴代変身。ゴーカイジャー濃厚です。"),
  s("特命戦隊ゴーバスターズ", 2012, "2010s", ["job","tech"], ["spy","digital"], 3, 1, true, ["red","blue","yellow","gold","silver"], "その他", "スパイ任務や相棒ロボの印象がありますか？", "特命・バディロイド・3人。ゴーバスターズっぽいです。"),
  s("獣電戦隊キョウリュウジャー", 2013, "2010s", ["animal"], ["dinosaur","dance"], 5, 1, true, ["red","black","blue","green","pink","gold","cyan","gray","violet","silver"], "ジャー", "恐竜で、やたらブレイブでしたか？", "恐竜・ブレイブ・大人数。キョウリュウジャー濃厚です。"),
  s("烈車戦隊トッキュウジャー", 2014, "2010s", ["vehicle"], ["train"], 5, 2, true, ["red","blue","yellow","green","pink","orange"], "ジャー", "電車とイマジネーションの印象が強いですか？", "電車とイマジネーション。トッキュウジャーが近いです。"),
  s("手裏剣戦隊ニンニンジャー", 2015, "2010s", ["legend"], ["ninja"], 5, 2, true, ["red","blue","yellow","white","pink","gold"], "ジャー", "忍者で、かなり賑やかな印象がありますか？", "忍者・手裏剣・賑やか。ニンニンジャー寄りです。"),
  s("動物戦隊ジュウオウジャー", 2016, "2010s", ["animal"], ["beast"], 5, 1, true, ["red","shark","lion","elephant","tiger","white","orange"], "ジャー", "動物とキューブの印象がありますか？", "動物とキューブ。ジュウオウジャーの可能性が高いです。"),
  s("宇宙戦隊キュウレンジャー", 2017, "2010s", ["tech","space"], ["space","constellation"], 9, 2, true, ["red","orange","blue","gold","black","silver","green","yellow","pink","purple"], "レンジャー", "最初から人数がかなり多く、星座っぽいですか？", "宇宙・星座・大人数。キュウレンジャー濃厚です。"),
  s("快盗戦隊ルパンレンジャー", 2018, "2010s", ["job","weird"], ["spy","vs"], 3, 1, true, ["red","blue","yellow"], "レンジャー", "怪盗側の戦隊を思い浮かべていますか？", "怪盗側ならルパンレンジャーです。"),
  s("警察戦隊パトレンジャー", 2018, "2010s", ["job","weird"], ["police","vs"], 3, 1, true, ["red","green","pink"], "レンジャー", "警察側の戦隊を思い浮かべていますか？", "警察側ならパトレンジャーです。"),
  s("騎士竜戦隊リュウソウジャー", 2019, "2010s", ["animal","fantasy"], ["dinosaur","knight"], 5, 1, true, ["red","blue","pink","green","black","gold","brown"], "ジャー", "恐竜と騎士の印象がありますか？", "恐竜×騎士。リュウソウジャーが近いです。"),
  s("魔進戦隊キラメイジャー", 2020, "2020s", ["fantasy","vehicle"], ["gem","vehicle"], 5, 2, true, ["red","yellow","green","blue","pink","silver"], "ジャー", "宝石と乗り物がキラキラしていましたか？", "宝石・キラキラ・魔進。キラメイジャー濃厚です。"),
  s("機界戦隊ゼンカイジャー", 2021, "2020s", ["tech","weird"], ["robot","anniversary"], 5, 1, true, ["white","red","yellow","blue","pink","gold"], "ジャー", "人間1人とロボっぽい仲間たちでしたか？", "機械・ロボ・記念作品。ゼンカイジャーの線が強いです。"),
  s("暴太郎戦隊ドンブラザーズ", 2022, "2020s", ["legend","weird"], ["momotaro","comedy"], 5, 1, true, ["red","blue","yellow","pink","black","gold"], "その他", "「縁ができたな！」って言われた記憶がありますか？", "桃太郎っぽい。令和っぽい。しかもだいぶ変。ドンブラザーズの可能性が高いです。"),
  s("王様戦隊キングオージャー", 2023, "2020s", ["animal","job","fantasy"], ["insect","kingdom"], 5, 2, true, ["red","blue","yellow","purple","black","white","silver"], "ジャー", "王様と昆虫の印象が強いですか？", "王様・国・昆虫。キングオージャー濃厚です。"),
  s("爆上戦隊ブンブンジャー", 2024, "2020s", ["vehicle"], ["car"], 3, 1, true, ["red","blue","pink","black","orange","violet"], "ジャー", "車と爆上げテンションの印象がありますか？", "車・爆上げ・令和。ブンブンジャーが近いです。"),
  s("ナンバーワン戦隊ゴジュウジャー", 2025, "2020s", ["animal","weird"], ["beast","anniversary"], 5, 2, true, ["red","blue","green","yellow","black","white"], "ジャー", "ナンバーワンや50周年の印象がありますか？", "ナンバーワン・50周年・ゴジュウ。ゴジュウジャー濃厚です。"),
];

function s(name, year, decade, motifGroup, motifs, initialMembers, femaleCount, hasExtra, colors, titleType, confirmQuestion, resultComment) {
  return {
    name,
    year,
    decade,
    motifGroup,
    motifs,
    initialMembers,
    femaleCount,
    hasExtra,
    colors,
    titleType,
    confirmQuestion,
    resultComment,
  };
}

let currentQuestionIndex = 0;
let answers = {};
let ranked = [];
let confirmIndex = 0;

$("startBtn").addEventListener("click", start);
$("retryBtn").addEventListener("click", reset);

document.querySelectorAll("[data-confirm]").forEach((btn) => {
  btn.addEventListener("click", () => handleConfirm(btn.dataset.confirm));
});

function start() {
  answers = {};
  currentQuestionIndex = 0;
  show("question");
  renderQuestion();
}

function reset() {
  show("hero");
}

function show(name) {
  Object.values(screens).forEach((screen) => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function renderQuestion() {
  const q = questions[currentQuestionIndex];
  const total = questions.length;

  $("stepText").textContent = `QUESTION ${currentQuestionIndex + 1} / ${total}`;
  $("progressBar").style.width = `${(currentQuestionIndex / total) * 100}%`;
  $("questionTitle").textContent = q.title;
  $("questionNote").textContent = q.note || "";

  const choices = $("choices");
  choices.innerHTML = "";

  const options = q.dynamic ? getDynamicOptions() : q.options;

  options.forEach(([value, label]) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.textContent = label;
    button.addEventListener("click", () => answer(q.key, value));
    choices.appendChild(button);
  });
}

function getDynamicOptions() {
  const group = answers.motifGroup || "unknown";
  return motifOptions[group] || motifOptions.unknown;
}

function answer(key, value) {
  answers[key] = value;
  currentQuestionIndex += 1;

  if (currentQuestionIndex >= questions.length) {
    finishQuestions();
  } else {
    renderQuestion();
  }
}

function finishQuestions() {
  $("progressBar").style.width = "100%";
  ranked = sentaiData
    .map((item) => ({ ...item, score: scoreSentai(item) }))
    .sort((a, b) => b.score - a.score);

  confirmIndex = 0;
  renderConfirm();
}

function scoreSentai(item) {
  let score = 0;

  if (answers.decade !== "unknown" && item.decade === answers.decade) score += 5;

  if (answers.motifGroup !== "unknown" && item.motifGroup.includes(answers.motifGroup)) score += 5;

  if (answers.motif !== "unknown") {
    if (item.motifs.includes(answers.motif)) score += 8;
    if (answers.motif === "animal" && item.motifGroup.includes("animal")) score += 3;
    if (answers.motif === "vehicle" && item.motifGroup.includes("vehicle")) score += 3;
  }

  if (answers.initialMembers !== "unknown") {
    if (answers.initialMembers === 6 && item.initialMembers >= 6) score += 5;
    else if (item.initialMembers === answers.initialMembers) score += 5;
  }

  if (answers.femaleCount !== "unknown") {
    if (answers.femaleCount === 3 && item.femaleCount >= 3) score += 4;
    else if (item.femaleCount === answers.femaleCount) score += 4;
  }

  if (answers.hasExtra !== "unknown" && item.hasExtra === answers.hasExtra) score += 3;

  if (answers.color !== "unknown" && item.colors.includes(answers.color)) score += 3;

  if (answers.titleType !== "unknown" && item.titleType === answers.titleType) score += 3;

  return score;
}

function renderConfirm() {
  show("confirm");
  const candidate = ranked[confirmIndex] || ranked[0];

  $("confirmTitle").textContent = candidate.confirmQuestion;
  $("confirmNote").textContent = `いま一番近い候補は「${candidate.name}」です。`;
}

function handleConfirm(value) {
  if (value === "yes") {
    renderResult(ranked[confirmIndex]);
    return;
  }

  if (value === "no" && confirmIndex < Math.min(2, ranked.length - 1)) {
    confirmIndex += 1;
    renderConfirm();
    return;
  }

  renderResult(ranked[0]);
}

function renderResult(answer) {
  show("result");

  $("answerName").textContent = answer.name;
  $("resultComment").textContent = answer.resultComment;

  const list = $("candidateList");
  list.innerHTML = "";

  ranked
    .filter((item) => item.name !== answer.name)
    .slice(0, 4)
    .forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name}｜近さ ${item.score}pt`;
      list.appendChild(li);
    });
}
