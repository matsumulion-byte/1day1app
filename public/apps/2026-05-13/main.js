// アセットは常にこのモジュールと同じディレクトリ基準で解決（/YYYY-MM-DD/ や末尾スラ無しでも壊れない）
const asset = (p) => new URL(p, import.meta.url).toString();

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
    opening: "今日、大事な話ある？",
    clearLine: "うん、わかった。ちゃんと言ってくれて、ありがとう。",
  },
  girl: {
    label: "彼女 松村",
    name: "彼女 松村",
    image: ASSETS.girl,
    firstPerson: "私",
    opening: "今日、大事な話ある？",
    clearLine: "うん、わかった。ちゃんと言ってくれて、ありがとう。",
  },
};

const questions = [
  {
    text: {
      boy: "今日、なんか大事な話しようって感じ？",
      girl: "今日、なんか大事な話しようって感じ？",
    },
    choices: [
      {
        text: "うん。ちゃんと話したいことがある",
        delta: { hurt: 8, attachment: -4, awkward: 6 },
        reaction: "松村が、すこし背筋を正した。",
      },
      {
        text: "いや、別に。なんとなく呼んだ",
        delta: { hurt: 4, attachment: 10, awkward: 24 },
        reaction: "松村の視線が、ふっとドリンクバーに逃げた。",
      },
      {
        text: "もう好きじゃない。以上です",
        delta: { hurt: 34, attachment: -10, awkward: 16 },
        reaction: "言葉が、まっすぐ松村の胸に入った。",
      },
      {
        text: "松村ってさ、いい人だよね",
        delta: { hurt: 2, attachment: 24, awkward: 12 },
        reaction: "松村が、なんとなく空気を読みはじめた。",
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
        reaction: "正直で辛いけれど、一歩だけ前に進んだ。",
      },
      {
        text: "強いて言えば、そういうところかな",
        delta: { hurt: 36, attachment: -6, awkward: 20 },
        reaction: "松村の表情が、すこし曇った。",
      },
      {
        text: "何も悪くないよ。だから迷ってる",
        delta: { hurt: -2, attachment: 30, awkward: 12 },
        reaction: "松村の胸に、もう一度寄りかかれる余地が生まれた。",
      },
      {
        text: "それを今から一緒に考えよう",
        delta: { hurt: 4, attachment: 16, awkward: 26 },
        reaction: "別れ話が、急に打ち合わせみたいになった。",
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
        reaction: "松村は傷ついた。けれど、うなずいてくれた。",
      },
      {
        text: "タイミング次第ではある",
        delta: { hurt: 3, attachment: 34, awkward: 10 },
        reaction: "松村が、来週からの予定を黙って数えはじめた。",
      },
      {
        text: "戻れると思う？",
        delta: { hurt: 20, attachment: 12, awkward: 24 },
        reaction: "質問が質問を呼び、空気がぎこちなくなった。",
      },
      {
        text: "まずは友達からやり直そ",
        delta: { hurt: 2, attachment: 28, awkward: 16 },
        reaction: "松村の中に、「まだチャンスかも」が芽吹いた。",
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
        reaction: "うまい答えではない。でも、誠実だった。",
      },
      {
        text: "正直ちょっと",
        delta: { hurt: 42, attachment: -10, awkward: 18 },
        reaction: "松村が、そっと目を伏せた。",
      },
      {
        text: "そういう質問するところかな",
        delta: { hurt: 45, attachment: -6, awkward: 26 },
        reaction: "松村が、言葉に詰まった。",
      },
      {
        text: "好きだよ",
        delta: { hurt: -6, attachment: 48, awkward: 12 },
        reaction: "その一言で、ことがややこしくなった。",
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
        reaction: "松村が小さくうなずいた。",
      },
      {
        text: "まあ、悪くはなかった",
        delta: { hurt: 30, attachment: -8, awkward: 16 },
        reaction: "思い出の価値が、ずいぶん安く見積もられた。",
      },
      {
        text: "その話、今必要？",
        delta: { hurt: 35, attachment: -4, awkward: 26 },
        reaction: "急にテンポが途切れた。",
      },
      {
        text: "楽しかったから、別れるのやめる？",
        delta: { hurt: -8, attachment: 55, awkward: 14 },
        reaction: "松村の目に、光が戻った。",
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
    els.emotionBadge.textContent = "傷つき";
  } else if (state.attachment >= 70) {
    els.emotionBadge.textContent = "未練";
  } else if (state.awkward >= 70) {
    els.emotionBadge.textContent = "ぎこちなさ";
  } else if (highest >= 42) {
    els.emotionBadge.textContent = "動揺";
  } else {
    els.emotionBadge.textContent = "平静";
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
        title: "松村、静かに泣く",
        text: "優しさで包もうとしたはずが、言葉がきつく刺さってしまった。<br />別れ話のはずが、すれ違いの嵐になった。",
      };
    }

    if (reason === "attachment") {
      return {
        label: "GAME OVER",
        title: "なんか、まだ続きそう",
        text: "優しさが強すぎて、松村の胸に希望が残ってしまった。<br />来週、もう一度ちゃんと話すことになりそう。",
      };
    }

    return {
      label: "GAME OVER",
      title: "沈黙のファミレス",
      text: "気まずさが頂点に達した。<br />ドリンクバーだけが、妙に目についた。",
    };
  }

  const score = Math.max(state.hurt, state.attachment, state.awkward);

  if (score <= 45) {
    return {
      label: "CLEAR",
      title: "ほぼ円満にフれた",
      text: "ピタリとはいかなかった。でも、深く傷つけない終わり方にかなり近かった。<br />これ以上きれいにするのは、もうちょっと無理そう。",
    };
  }

  if (score <= 68) {
    return {
      label: "CLEAR",
      title: "円満ではないが、成立",
      text: "えぐった部分もある。それでも、現実として成立した別れ話だった。<br />あとから言い足すより、今日の線引きでよかったのかもしれない。",
    };
  }

  return {
    label: "CLEAR",
    title: "ギリギリで、成立",
    text: "あと一歩で空気が壊れそうだった。<br />それでも、なんとか区切りをつけられた。",
  };
}

async function toggleSound() {
  state.sound = !state.sound;

  try {
    if (state.sound) {
      els.bgm.load();
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