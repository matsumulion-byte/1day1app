const questions = [
  {
    text: "予定のない休日。<br>どう過ごしたい？",
    answers: [
      ["知らない街へ、ひとりで出かける", "bold"],
      ["気の合う人と、ゆっくり話す", "warm"],
      ["家で静かに、好きなことをする", "deep"],
    ],
  },
  {
    text: "大事な決断をするとき、<br>最後に信じるのは？",
    answers: [
      ["最初に感じた直感", "bold"],
      ["積み重ねた経験", "deep"],
      ["信頼する人の言葉", "warm"],
    ],
  },
  {
    text: "惹かれる風景を<br>ひとつ選ぶなら？",
    answers: [
      ["真昼の、影が濃い白い街", "clear"],
      ["夕暮れの、風が止まった海", "warm"],
      ["深夜の、雨に濡れたネオン", "smoke"],
    ],
  },
  {
    text: "誰かに褒められるなら、<br>いちばん嬉しい言葉は？",
    answers: [
      ["「決断が早いね」", "bold"],
      ["「一緒にいると落ち着く」", "warm"],
      ["「考え方が独特だね」", "smoke"],
    ],
  },
  {
    text: "うまくいかない夜。<br>あなたはどうする？",
    answers: [
      ["とりあえず動いて、流れを変える", "clear"],
      ["眠って、時間に任せる", "deep"],
      ["笑える話に変えて誰かに話す", "smoke"],
    ],
  },
  {
    text: "いまの自分に<br>足したいものは？",
    answers: [
      ["迷わず踏み出す勢い", "bold"],
      ["じっくり待てる余裕", "deep"],
      ["肩の力を抜く遊び心", "smoke"],
    ],
  },
];

const results = {
  bold: {
    name: "ブランコ",
    en: "TEQUILA BLANCO",
    pre: "迷いながらも、最後は自分の感覚を選ぶ人。",
    trait: "まっすぐで、決断が速い。",
    description: "飾らない強さと、切れ味のいい直感。考えすぎる前に踏み出せるあなたは、アガベの輪郭をそのまま映すブランコタイプです。",
    flavor: "透明感の奥にある、青い衝動",
    quote: "迷うなら、鮮やかなほうへ。",
  },
  warm: {
    name: "レポサド",
    en: "TEQUILA REPOSADO",
    pre: "人との距離を、急がず心地よく整えられる人。",
    trait: "やわらかくて、芯がある。",
    description: "勢いだけで終わらず、時間のなかで角を丸くできるあなた。親しみやすさと確かな芯を持つ、レポサドタイプです。",
    flavor: "穏やかさに溶け込む、淡い熱",
    quote: "急がなくても、ちゃんと深くなる。",
  },
  deep: {
    name: "アネホ",
    en: "TEQUILA AÑEJO",
    pre: "目立つ速さより、積み重なる確かさを信じる人。",
    trait: "静かで、余韻が深い。",
    description: "すぐに答えを出さず、経験を自分の味に変えていくあなた。長い余韻と奥行きを持つ、アネホタイプです。",
    flavor: "静けさのなかの、複雑な甘さ",
    quote: "時間は、味方につければいい。",
  },
  smoke: {
    name: "メスカル",
    en: "MEZCAL",
    pre: "決められた正解より、自分だけの面白さを選ぶ人。",
    trait: "ひねりがあって、忘れにくい。",
    description: "少し変わった角度から世界を眺め、失敗さえ物語に変えるあなた。スモーキーな個性が残る、メスカルタイプです。",
    flavor: "煙の向こうに残る、野生味",
    quote: "まっすぐじゃない道ほど、話になる。",
  },
  clear: {
    name: "クリスタリーノ",
    en: "TEQUILA CRISTALINO",
    pre: "複雑なものを、軽やかに見せられる人。",
    trait: "澄んでいて、意外と深い。",
    description: "第一印象は軽やかでも、内側には経験とこだわりがあるあなた。透明さと熟成をあわせ持つ、クリスタリーノタイプです。",
    flavor: "澄んだ表情に隠した、熟成感",
    quote: "軽やかさは、深さを隠す技術。",
  },
};

const screens = ["intro", "quiz", "analyzing", "reveal", "result"];
const state = { index: 0, answers: [] };
const $ = (id) => document.getElementById(id);

function show(id) {
  screens.forEach((screen) => $(screen).classList.toggle("is-active", screen === id));
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderQuestion() {
  const item = questions[state.index];
  $("current").textContent = String(state.index + 1).padStart(2, "0");
  $("question-kicker").textContent = `QUESTION ${String(state.index + 1).padStart(2, "0")}`;
  $("question").innerHTML = item.text;
  $("progress-bar").style.width = `${((state.index + 1) / questions.length) * 100}%`;
  $("back").style.visibility = state.index === 0 ? "hidden" : "visible";
  $("answers").replaceChildren(
    ...item.answers.map(([label, value], answerIndex) => {
      const button = document.createElement("button");
      button.className = "answer";
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => choose(value));
      button.style.animation = `appear .35s ${answerIndex * 0.06}s both`;
      return button;
    }),
  );
}

function choose(value) {
  state.answers[state.index] = value;
  if (state.index < questions.length - 1) {
    state.index += 1;
    renderQuestion();
    return;
  }
  analyze();
}

function getResult() {
  const counts = state.answers.reduce((all, value) => {
    all[value] = (all[value] || 0) + 1;
    return all;
  }, {});
  const topScore = Math.max(...Object.values(counts));
  const candidates = Object.keys(counts).filter((key) => counts[key] === topScore);
  const previous = sessionStorage.getItem("lastEssence");
  const fresh = candidates.find((key) => key !== previous) || candidates[0];
  sessionStorage.setItem("lastEssence", fresh);
  return results[fresh];
}

function analyze() {
  show("analyzing");
  const messages = ["選択の一貫性を確認中…", "直感と熟考の比率を計算中…", "本質の輪郭が見えてきました。"];
  let index = 0;
  const ticker = setInterval(() => {
    index += 1;
    if (messages[index]) $("analysis-copy").textContent = messages[index];
  }, 700);
  setTimeout(() => {
    clearInterval(ticker);
    reveal(getResult());
  }, 2300);
}

function reveal(data) {
  $("pre-result").textContent = data.pre;
  $("trait-line").textContent = data.trait;
  show("reveal");
  $("punchline").classList.remove("is-visible");
  $("punchline").setAttribute("aria-hidden", "true");

  setTimeout(() => {
    $("punchline").classList.add("is-visible");
    $("punchline").setAttribute("aria-hidden", "false");
  }, 2500);

  setTimeout(() => fillResult(data), 5000);
}

function fillResult(data) {
  $("result-name").textContent = data.name;
  $("result-en").textContent = data.en;
  $("result-description").textContent = data.description;
  $("result-flavor").textContent = data.flavor;
  $("result-quote").textContent = data.quote;
  show("result");
}

$("start").addEventListener("click", () => {
  state.index = 0;
  state.answers = [];
  renderQuestion();
  show("quiz");
});

$("back").addEventListener("click", () => {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
  }
});

$("retry").addEventListener("click", () => {
  state.index = 0;
  state.answers = [];
  renderQuestion();
  show("quiz");
});

$("share").addEventListener("click", async () => {
  const text = `私の本質は「${$("result-name").textContent}」でした。\nあなたの本質、抽出します。 #本質抽出診断 #テキーラの日`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "あなたの本質、抽出します。", text, url: location.href });
      $("share-status").textContent = "シェア画面を開きました。";
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      $("share-status").textContent = "結果をコピーしました。";
    }
  } catch (error) {
    if (error.name !== "AbortError") $("share-status").textContent = "シェアできませんでした。";
  }
});
