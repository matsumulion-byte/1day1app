// Vercel用：/YYYY-MM-DD/ でアクセスしたときにアセットを正しく解決（別日アプリと同パターン）
const DATE_SEGMENT = (location.pathname.match(/\d{4}-\d{2}-\d{2}/) || [""])[0];
const DATE_BASE = DATE_SEGMENT ? `/${DATE_SEGMENT}/` : "/";
const asset = (p) => {
  const clean = String(p || "").replace(/^\.?\//, "");
  return `${DATE_BASE}${clean}`;
};

const ASSETS = {
  boy: asset("./assets/matsumura_boy.png"),
  girl: asset("./assets/matsumura_girl.png"),
  bgm: asset("./assets/bgm.mp3"),
};

const MAX = 100;

const profiles = {
  boy: {
    label: "彼氏 松村",
    name: "彼氏 松村",
    image: ASSETS.boy,
    firstPerson: "俺",
    opening: "今日のテーマ、恋愛？それとも解散？",
    clearLine: "なるほどね。公式発表、ありがとう。拍手は控えめにする。",
  },
  girl: {
    label: "彼女 松村",
    name: "彼女 松村",
    image: ASSETS.girl,
    firstPerson: "私",
    opening: "今日のテーマ、恋愛？それとも解散？",
    clearLine: "なるほどね。公式発表、ありがとう。拍手は控えめにする。",
  },
};

const questions = [
  {
    text: {
      boy: "今日、なんか“重大発表”っぽい空気してない？",
      girl: "今日、なんか“重大発表”っぽい空気してない？",
    },
    choices: [
      {
        text: "うん。ちゃんと話したいことがある",
        delta: { hurt: 8, attachment: -4, awkward: 6 },
        reaction: "松村、背筋がゲーム開始時みたいに伸びた。",
      },
      {
        text: "いや、別に。なんとなく呼んだ",
        delta: { hurt: 4, attachment: 10, awkward: 24 },
        reaction: "松村、ドリンクバーに魂を移し住ませはじめた。",
      },
      {
        text: "もう好きじゃない。以上です",
        delta: { hurt: 34, attachment: -10, awkward: 16 },
        reaction: "言葉が直角に曲がって松村に直撃した。",
      },
      {
        text: "松村ってさ、いい人だよね",
        delta: { hurt: 2, attachment: 24, awkward: 12 },
        reaction: "松村の脳内に“続きありそう”の字幕が出た。",
      },
    ],
  },
  {
    text: {
      boy: "俺、なんか悪いことした？",
      girl: "私、なんか悪いことしたかな？",
    },
    choices: [
      {
        text: "悪いとかじゃなくて、自分の気持ちが変わった",
        delta: { hurt: 10, attachment: -8, awkward: 5 },
        reaction: "辛口アップデートログ。でも進行はした。",
      },
      {
        text: "強いて言えば、そういうところかな",
        delta: { hurt: 36, attachment: -6, awkward: 20 },
        reaction: "松村の瞳が省エネモードに切り替わった。",
      },
      {
        text: "何も悪くないよ。だから迷ってる",
        delta: { hurt: -2, attachment: 30, awkward: 12 },
        reaction: "松村の心に「続編あり」の予告編が流れた。",
      },
      {
        text: "それを今から一緒に考えよう",
        delta: { hurt: 4, attachment: 16, awkward: 26 },
        reaction: "別れ話がホワイトボードと付箋を要求しはじめた。",
      },
    ],
  },
  {
    text: {
      boy: "もう戻れないの？",
      girl: "もう戻れないの？",
    },
    choices: [
      {
        text: "ごめん。戻るつもりはない",
        delta: { hurt: 14, attachment: -14, awkward: 6 },
        reaction: "松村、傷ついたけど規約は読んだ顔をした。",
      },
      {
        text: "タイミング次第ではある",
        delta: { hurt: 3, attachment: 34, awkward: 10 },
        reaction: "松村、来週のカレンダーに謎の丸印を量産した。",
      },
      {
        text: "戻れると思う？",
        delta: { hurt: 20, attachment: 12, awkward: 24 },
        reaction: "会話がエラー画面みたいに点滅しはじめた。",
      },
      {
        text: "まずは友達からやり直そ",
        delta: { hurt: 2, attachment: 28, awkward: 16 },
        reaction: "松村の中で「まだいける」が野生復帰した。",
      },
    ],
  },
  {
    text: {
      boy: "俺のこと、嫌いになった？",
      girl: "私のこと、嫌いになった？",
    },
    choices: [
      {
        text: "嫌いになったわけじゃない。でも恋人ではいられない",
        delta: { hurt: 12, attachment: -12, awkward: 8 },
        reaction: "正解ではない。でも正解の隣の席。",
      },
      {
        text: "正直ちょっと",
        delta: { hurt: 42, attachment: -10, awkward: 18 },
        reaction: "言わなくても成立した世界線があった。",
      },
      {
        text: "そういう質問するところかな",
        delta: { hurt: 45, attachment: -6, awkward: 26 },
        reaction: "松村の心に雷が直撃し、Wi‑Fiが不安定になった。",
      },
      {
        text: "好きだよ",
        delta: { hurt: -6, attachment: 48, awkward: 12 },
        reaction: "一言で物語がシーズン2に突入しかけた。",
      },
    ],
  },
  {
    text: {
      boy: "じゃあ最後にひとつだけ。楽しかった？",
      girl: "じゃあ最後にひとつだけ。楽しかった？",
    },
    choices: [
      {
        text: "楽しかった。だからこそ、ちゃんと終わらせたい",
        delta: { hurt: 8, attachment: -8, awkward: 4 },
        reaction: "松村、小さくうなずいてエンドロール感を出した。",
      },
      {
        text: "まあ、悪くはなかった",
        delta: { hurt: 30, attachment: -8, awkward: 16 },
        reaction: "思い出の査定が中古スマホ並みに安かった。",
      },
      {
        text: "その話、今必要？",
        delta: { hurt: 35, attachment: -4, awkward: 26 },
        reaction: "終盤で急に雑談モードに切り替わった。",
      },
      {
        text: "楽しかったから、別れるのやめる？（※ロジックが逆走）",
        delta: { hurt: -8, attachment: 55, awkward: 14 },
        reaction: "松村の目に希望のスポットライトが戻ってしまった。",
      },
    ],
  },
];

const state = {
  gender: null,
  index: 0,
  hurt: 0,
  attachment: 28,
  awkward: 0,
  sound: false,
  locked: false,
};

const $ = (selector) => document.querySelector(selector);

const els = {
  startScreen: $("#startScreen"),
  gameScreen: $("#gameScreen"),
  resultScreen: $("#resultScreen"),
  genderButtons: document.querySelectorAll(".gender-btn"),
  matsumuraImage: $("#matsumuraImage"),
  speakerName: $("#speakerName"),
  dialogueText: $("#dialogueText"),
  choices: $("#choices"),
  progressBar: $("#progressBar"),
  hurtBar: $("#hurtBar"),
  attachmentBar: $("#attachmentBar"),
  awkwardBar: $("#awkwardBar"),
  hurtValue: $("#hurtValue"),
  attachmentValue: $("#attachmentValue"),
  awkwardValue: $("#awkwardValue"),
  weatherLayer: $("#weatherLayer"),
  emotionBadge: $("#emotionBadge"),
  toast: $("#toast"),
  resultLabel: $("#resultLabel"),
  resultTitle: $("#resultTitle"),
  resultText: $("#resultText"),
  finalHurt: $("#finalHurt"),
  finalAttachment: $("#finalAttachment"),
  finalAwkward: $("#finalAwkward"),
  restartBtn: $("#restartBtn"),
  bgm: $("#bgm"),
  soundToggle: $("#soundToggle"),
  soundToggleGame: $("#soundToggleGame"),
};

els.bgm.src = ASSETS.bgm;
els.bgm.volume = 0.42;

function showScreen(screen) {
  [els.startScreen, els.gameScreen, els.resultScreen].forEach((el) => {
    el.classList.remove("active");
  });
  screen.classList.add("active");
}

function clamp(value) {
  return Math.max(0, Math.min(MAX, value));
}

function resetGame(gender) {
  state.gender = gender;
  state.index = 0;
  state.hurt = 0;
  state.attachment = 28;
  state.awkward = 0;
  state.locked = false;

  const profile = profiles[gender];
  els.matsumuraImage.src = profile.image;
  els.speakerName.textContent = profile.name;

  showScreen(els.gameScreen);
  render();
}

function render() {
  const q = questions[state.index];
  const gender = state.gender;

  updateMeters();
  updateProgress();

  els.dialogueText.textContent = q.text[gender];
  els.choices.innerHTML = "";

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = `${i + 1}. ${choice.text}`;
    btn.addEventListener("click", () => selectChoice(choice));
    els.choices.appendChild(btn);
  });
}

function updateProgress() {
  const percent = (state.index / questions.length) * 100;
  els.progressBar.style.width = `${percent}%`;
}

function updateMeters() {
  els.hurtValue.textContent = state.hurt;
  els.attachmentValue.textContent = state.attachment;
  els.awkwardValue.textContent = state.awkward;

  els.hurtBar.style.width = `${state.hurt}%`;
  els.attachmentBar.style.width = `${state.attachment}%`;
  els.awkwardBar.style.width = `${state.awkward}%`;

  const highest = Math.max(state.hurt, state.attachment, state.awkward);

  els.weatherLayer.className = "weather-layer";
  if (highest >= 70) {
    els.weatherLayer.classList.add("storm");
  } else if (highest >= 42) {
    els.weatherLayer.classList.add("medium");
  } else {
    els.weatherLayer.classList.add("calm");
  }

  if (state.hurt >= 70) {
    els.emotionBadge.textContent = "HP赤ゲージ";
  } else if (state.attachment >= 70) {
    els.emotionBadge.textContent = "続編フラグ";
  } else if (state.awkward >= 70) {
    els.emotionBadge.textContent = "沈黙MAX";
  } else if (highest >= 42) {
    els.emotionBadge.textContent = "内心バグ";
  } else {
    els.emotionBadge.textContent = "平静（仮）";
  }
}

function selectChoice(choice) {
  if (state.locked) return;
  state.locked = true;

  disableChoices();

  state.hurt = clamp(state.hurt + choice.delta.hurt);
  state.attachment = clamp(state.attachment + choice.delta.attachment);
  state.awkward = clamp(state.awkward + choice.delta.awkward);

  animateMatsumura(choice.delta);
  updateMeters();
  showToast(choice.reaction);

  window.setTimeout(() => {
    const gameOverReason = getGameOverReason();

    if (gameOverReason) {
      finish("fail", gameOverReason);
      return;
    }

    state.index += 1;

    if (state.index >= questions.length) {
      finish("clear");
      return;
    }

    state.locked = false;
    render();
  }, 1050);
}

function disableChoices() {
  document.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.classList.add("disabled");
  });
}

function animateMatsumura(delta) {
  if (delta.hurt >= 25 || delta.awkward >= 24) {
    els.matsumuraImage.classList.remove("shake");
    void els.matsumuraImage.offsetWidth;
    els.matsumuraImage.classList.add("shake");
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");

  window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 900);
}

function getGameOverReason() {
  if (state.hurt >= MAX) return "hurt";
  if (state.attachment >= MAX) return "attachment";
  if (state.awkward >= MAX) return "awkward";
  return null;
}

function finish(type, reason = null) {
  els.progressBar.style.width = "100%";
  updateMeters();

  const result = getResult(type, reason);

  els.resultLabel.textContent = result.label;
  els.resultTitle.textContent = result.title;
  els.resultText.innerHTML = result.text;
  els.finalHurt.textContent = state.hurt;
  els.finalAttachment.textContent = state.attachment;
  els.finalAwkward.textContent = state.awkward;

  window.setTimeout(() => {
    showScreen(els.resultScreen);
  }, 450);
}

function getResult(type, reason) {
  if (type === "fail") {
    if (reason === "hurt") {
      return {
        label: "GAME OVER",
        title: "松村、静かに泣く（※BGMは明るい）",
        text: "「優しく」するはずが、言葉がナイフみたいに振る舞った。<br />別れ話というより、口頭のボス戦だった。",
      };
    }

    if (reason === "attachment") {
      return {
        label: "GAME OVER",
        title: "なんかまだ付き合ってる（※シーズン延長）",
        text: "優しさのバフが強すぎて、松村の中で復活イベントが発火した。<br />来週、また同じ席で「前回の続き」が始まる。",
      };
    }

    return {
      label: "GAME OVER",
      title: "沈黙のファミレス（※ドリンクバーが主人公）",
      text: "気まずさが物理法則を疑わせた。<br />店内、たぶん空調よりドリンクバーの存在感が強かった。",
    };
  }

  const score = Math.max(state.hurt, state.attachment, state.awkward);

  if (score <= 45) {
    return {
      label: "CLEAR",
      title: "ほぼ円満にフれた（※ノーダメージは都市伝説）",
      text: "完全無傷ではない。でも「攻略動画」レベルには近かった。<br />これ以上キレイにするには編集が必要。",
    };
  }

  if (score <= 68) {
    return {
      label: "CLEAR",
      title: "円満ではないが成立（※実用ビルド）",
      text: "多少の擦り傷はある。でも現実の別れ話としては十分リリース可能。<br />パッチは後日でもいい。",
    };
  }

  return {
    label: "CLEAR",
    title: "嵐の中で成立（※ギリギリの奇跡）",
    text: "あと一歩で松村か店内BGMのどちらかがクラッシュするところだった。<br />でも、なんとかエンドロールは流れた。",
  };
}

async function toggleSound() {
  state.sound = !state.sound;

  try {
    if (state.sound) {
      await els.bgm.play();
    } else {
      els.bgm.pause();
    }
  } catch (error) {
    state.sound = false;
    console.warn("BGM playback failed:", error);
  }

  updateSoundButtons();
}

function updateSoundButtons() {
  const label = state.sound ? "♪ BGM ON" : "♪ BGM OFF";
  const shortLabel = state.sound ? "♪ ON" : "♪ OFF";
  els.soundToggle.textContent = label;
  els.soundToggleGame.textContent = shortLabel;
}

els.genderButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    resetGame(btn.dataset.gender);
  });
});

els.restartBtn.addEventListener("click", () => {
  showScreen(els.startScreen);
});

els.soundToggle.addEventListener("click", toggleSound);
els.soundToggleGame.addEventListener("click", toggleSound);

updateSoundButtons();