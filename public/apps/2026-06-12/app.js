const STORAGE_KEY = "uso-diary.entries.v1";
const today = "2026年6月12日";

const examples = [
  "コンビニでコーヒーを買った",
  "駅まで歩いたら靴ひもがほどけた",
  "昼にカレーを食べた",
  "雨が降りそうで傘を持って出た",
  "返信しようと思って忘れていた",
  "スーパーで卵を買った"
];

const directionDeck = {
  "不穏": {
    additions: [
      "レシートの端に、私の名前だけが薄く印字されていた",
      "帰り道で同じ服の人と三回すれ違った",
      "店内の時計だけが昨日の時刻を指していた",
      "誰にも言っていないはずの予定を、知らない人が口にした"
    ],
    endings: [
      "家に着いてから、その出来事を昨日の日記にも書いていたことに気づいた。",
      "気のせいだと思いたかったけれど、ポケットには知らない鍵が入っていた。",
      "明日も同じことが起きたら、もう偶然とは呼べない。",
      "寝る前に確認したら、玄関の外にまだ同じ足音が残っていた。"
    ]
  },
  "泣ける": {
    additions: [
      "昔よく使っていた言葉を、知らない子どもがまっすぐ言った",
      "なくしたと思っていた記憶が、匂いだけで少し戻ってきた",
      "誰かのやさしさが、こちらに届くまでずいぶん時間がかかっていた",
      "何でもないことが、もう会えない人との約束みたいに思えた"
    ],
    endings: [
      "忘れていたわけではなく、思い出す準備ができていなかっただけなのかもしれない。",
      "今日の私は、少しだけ過去の私に追いついた。",
      "ありふれた一日にも、受け取り損ねていた手紙のようなものがある。",
      "泣くほどのことではないのに、帰り道の信号がにじんで見えた。"
    ]
  },
  "青春": {
    additions: [
      "隣にいた人が、なぜか昔の放課後みたいに笑った",
      "風が強くて、言えなかった言葉だけが先に走っていった",
      "知らない誰かと一瞬だけ秘密を共有した気がした",
      "夕方の光が、今日だけ部室の窓みたいな色をしていた"
    ],
    endings: [
      "たぶん何も始まっていない。でも、始まりそうな音だけは聞こえた。",
      "帰ってからも、まだ制服を着ているような気分だった。",
      "大人になったはずなのに、今日の心だけ少し遅刻していた。",
      "明日の予定には書けないけれど、今日の続きが少し楽しみだ。"
    ]
  },
  "SF": {
    additions: [
      "端末の通知が、三分後の私から届いた",
      "影だけが半秒遅れて動いていた",
      "自動ドアが開く前に、未来の空気が少し漏れてきた",
      "レシートに印字された時刻が、まだ来ていない夜だった"
    ],
    endings: [
      "この日記が保存された瞬間、明日の私が一文字だけ消した。",
      "時間は戻らなかった。ただ、私だけが少し先にずれた。",
      "世界はいつも通りだったが、私の履歴だけ別の宇宙に同期されていた。",
      "寝る前、カレンダーの6月12日が二枚に増えていた。"
    ]
  },
  "コメディ": {
    additions: [
      "なぜか周囲から小さな拍手が起きた",
      "私だけ深刻な顔をしていたが、状況は完全に昼の情報番組だった",
      "知らないおじさんに『今のは第2話っぽいね』と言われた",
      "自動ドアに二回負けた"
    ],
    endings: [
      "今日の教訓は、堂々としていればだいたい演出に見える、である。",
      "何も解決していないが、日記のネタだけは増えた。",
      "人生は思ったより雑で、そこだけは少し信用できる。",
      "明日はもう少し主人公らしく歩きたい。せめて自動ドアには勝つ。"
    ]
  },
  "意味不明": {
    additions: [
      "その瞬間、机の角が小声で天気予報を始めた",
      "左ポケットから火曜日の匂いがした",
      "私の名前が一度だけカタカナをやめた",
      "信号機が青になる代わりに、深くうなずいた"
    ],
    endings: [
      "だから今日は、だいたい三角形だったと言っていい。",
      "帰宅後、冷蔵庫に謝ったら少し機嫌が直った。",
      "意味はなかった。でも意味がないにしては、やけに丁寧だった。",
      "明日の私には、まず靴下から事情を聞いてほしい。"
    ]
  }
};

const styleOpeners = {
  "ふつうの日記": (truth) => `今日は${truth}。`,
  "小学生の日記": (truth) => `今日は、${truth}。最初はふつうの日だと思いました。`,
  "純文学っぽい": (truth) => `${truth}。そう書けば一行で済むはずの一日だった。`,
  "怪談っぽい": (truth) => `${truth}。ここまでは、どこにでもある話だと思う。`,
  "SNS投稿っぽい": (truth) => `今日、${truth}。ここまでは普通。`,
  "観察記録っぽい": (truth) => `観察日: ${today}。対象者である私は、${truth}。`
};

const styleBodies = {
  "ふつうの日記": (addition, levelText) =>
    `そのあと、${addition}。${levelText}だけど、妙に細かいところまで覚えている。`,
  "小学生の日記": (addition, levelText) =>
    `でもそのあと、${addition}。${levelText}けれど、先生に言ってもたぶん信じてもらえません。`,
  "純文学っぽい": (addition, levelText) =>
    `それでも、${addition}。${levelText}ものほど、記憶の底で静かに形を変える。`,
  "怪談っぽい": (addition, levelText) =>
    `ところが、${addition}。${levelText}と自分に言い聞かせるほど、背中が冷たくなった。`,
  "SNS投稿っぽい": (addition, levelText) =>
    `なのに、${addition}。${levelText}。いや、ほんとに何？`,
  "観察記録っぽい": (addition, levelText) =>
    `直後、${addition}。${levelText}ため、引き続き経過観察が必要である。`
};

const levelPhrases = [
  { max: 20, text: "ほとんど本当の話のはず" },
  { max: 50, text: "少し盛っただけのはず" },
  { max: 80, text: "かなり怪しい話" },
  { max: 100, text: "もうほとんど嘘" }
];

const state = {
  current: null,
  entries: []
};

const el = {
  form: document.querySelector("#diaryForm"),
  truthInput: document.querySelector("#truthInput"),
  lieLevel: document.querySelector("#lieLevel"),
  lieLabel: document.querySelector("#lieLabel"),
  emptyState: document.querySelector("#emptyState"),
  resultCard: document.querySelector("#resultCard"),
  resultMeta: document.querySelector("#resultMeta"),
  resultTag: document.querySelector("#resultTag"),
  diaryBody: document.querySelector("#diaryBody"),
  saveButton: document.querySelector("#saveButton"),
  copyButton: document.querySelector("#copyButton"),
  rerollButton: document.querySelector("#rerollButton"),
  exampleButton: document.querySelector("#exampleButton"),
  toast: document.querySelector("#toast"),
  tabButtons: document.querySelectorAll(".tab-button"),
  createPanel: document.querySelector("#createPanel"),
  archivePanel: document.querySelector("#archivePanel"),
  archiveList: document.querySelector("#archiveList"),
  savedCount: document.querySelector("#savedCount"),
  clearButton: document.querySelector("#clearButton")
};

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function levelText(value) {
  return levelPhrases.find((item) => value <= item.max).text;
}

function buildDiary({ truth, lieLevel, style, direction }) {
  const deck = directionDeck[direction];
  const addedLie = choice(deck.additions);
  const ending = choice(deck.endings);
  const opener = styleOpeners[style](truth);
  const body = styleBodies[style](addedLie, levelText(lieLevel));
  const bridge =
    lieLevel < 30
      ? "たぶん疲れていただけだと思う。"
      : lieLevel < 70
        ? "嘘だと決めつけるには、少しだけ手触りが残りすぎている。"
        : "ここまで来ると、事実のほうが遠慮しているように見える。";

  return {
    id: crypto.randomUUID(),
    date: today,
    truth,
    lieLevel,
    style,
    direction,
    addedLie,
    body: `${opener}\n\n${body}${bridge}\n\n${ending}`,
    createdAt: new Date().toISOString()
  };
}

function renderResult(entry) {
  state.current = entry;
  el.emptyState.classList.add("hidden");
  el.resultCard.classList.remove("hidden");
  el.resultMeta.textContent = `${entry.date} / ${entry.style}`;
  el.resultTag.textContent = `${entry.direction} / ${entry.lieLevel}%`;
  el.diaryBody.textContent = entry.body;
  el.toast.textContent = "";
}

function loadEntries() {
  try {
    state.entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    state.entries = [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function renderArchive() {
  el.savedCount.textContent = state.entries.length;
  el.clearButton.disabled = state.entries.length === 0;

  if (state.entries.length === 0) {
    el.archiveList.innerHTML = `<div class="empty-archive">まだ保存された日記はありません。</div>`;
    return;
  }

  el.archiveList.innerHTML = state.entries
    .map(
      (entry) => `
        <article class="archive-card" data-id="${entry.id}">
          <p class="date-mark">${entry.date} / ${entry.direction} / ${entry.lieLevel}%</p>
          <h3>${escapeHtml(entry.truth)}</h3>
          <p class="diary-preview">${escapeHtml(entry.body)}</p>
          <div class="archive-actions">
            <button class="secondary" type="button" data-action="copy">コピー</button>
            <button class="secondary danger" type="button" data-action="delete">削除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "-1000px auto auto -1000px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function switchTab(name) {
  el.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
  el.createPanel.classList.toggle("active", name === "create");
  el.archivePanel.classList.toggle("active", name === "archive");
}

function generateFromForm() {
  const truth = el.truthInput.value.trim();
  if (!truth) {
    el.truthInput.focus();
    return null;
  }

  return buildDiary({
    truth,
    lieLevel: Number(el.lieLevel.value),
    style: selectedValue("style"),
    direction: selectedValue("direction")
  });
}

el.lieLevel.addEventListener("input", () => {
  el.lieLabel.textContent = `${el.lieLevel.value}%`;
});

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = generateFromForm();
  if (entry) renderResult(entry);
});

el.rerollButton.addEventListener("click", () => {
  const entry = generateFromForm();
  if (entry) renderResult(entry);
});

el.saveButton.addEventListener("click", () => {
  if (!state.current) return;
  state.entries = [state.current, ...state.entries.filter((entry) => entry.id !== state.current.id)];
  persistEntries();
  renderArchive();
  el.toast.textContent = "保存しました。";
});

el.copyButton.addEventListener("click", async () => {
  if (!state.current) return;
  await copyText(state.current.body);
  el.toast.textContent = "コピーしました。";
});

el.exampleButton.addEventListener("click", () => {
  el.truthInput.value = choice(examples);
  el.truthInput.focus();
});

el.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

el.archiveList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".archive-card");
  if (!button || !card) return;

  const entry = state.entries.find((item) => item.id === card.dataset.id);
  if (!entry) return;

  if (button.dataset.action === "copy") {
    await copyText(entry.body);
    button.textContent = "コピー済み";
    setTimeout(() => {
      button.textContent = "コピー";
    }, 1200);
  }

  if (button.dataset.action === "delete") {
    state.entries = state.entries.filter((item) => item.id !== entry.id);
    persistEntries();
    renderArchive();
  }
});

el.clearButton.addEventListener("click", () => {
  if (state.entries.length === 0) return;
  const ok = window.confirm("保存したウソ日記をすべて削除しますか？");
  if (!ok) return;
  state.entries = [];
  persistEntries();
  renderArchive();
});

loadEntries();
renderArchive();
