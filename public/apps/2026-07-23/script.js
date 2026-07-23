const cases = [
  {
    label: "第一号",
    title: "雨に濡れた封筒",
    postmark: "消印：東京・吉祥寺",
    ring: "KICHIJOJI\n7.21",
    date: "七月二十日",
    body: [
      "あの日、店を飛び出したままでごめんなさい。",
      "窓際の赤い椅子は、まだありますか。",
      "今度は冷める前に、珈琲を飲みきりたいです。"
    ],
    signature: "昔の常連より",
    clues: ["珈琲の染み", "赤い椅子", "吉祥寺消印"],
    answer: 1,
    candidates: [
      { name: "井上 澄子", age: "67歳", info: "赤い屋根の洋裁店を営む。三年前に閉店。", note: "居住地：西荻窪" },
      { name: "藤田 葵", age: "42歳", info: "喫茶「夜汽車」店主。窓際に古い赤椅子がある。", note: "居住地：吉祥寺本町" },
      { name: "森川 修", age: "55歳", info: "家具職人。赤い革椅子の修理を専門とする。", note: "居住地：三鷹市" }
    ],
    success: "藤田さんは赤い椅子を拭き、閉店後も入口の灯りを消さずに待ちました。",
    failure: "手紙は差出人へ戻ってきました。赤い椅子は、別の場所で待ち続けています。"
  },
  {
    label: "第二号",
    title: "時刻だけの手紙",
    postmark: "消印：長野・小海",
    ring: "KOUMI\n7.19",
    date: "七月十八日",
    body: [
      "毎朝五時四十分。",
      "あなたの笛が鳴ると、町が目を覚ましました。",
      "最後の日に渡せなかった青い手袋を、今も預かっています。"
    ],
    signature: "踏切の向こうの子どもより",
    clues: ["午前5時40分", "笛の音", "青い手袋"],
    answer: 2,
    candidates: [
      { name: "高木 奏", age: "31歳", info: "吹奏楽団員。早朝に河川敷で練習している。", note: "勤務先：小海町公民館" },
      { name: "青山 六郎", age: "76歳", info: "元警察官。青い園芸用手袋を愛用する。", note: "居住地：松原湖畔" },
      { name: "田辺 正一", age: "71歳", info: "昨春退職した駅員。始発列車の発車係だった。", note: "旧勤務先：小海駅" }
    ],
    success: "田辺さんは手袋をはめ、翌朝五時四十分、家の庭で一度だけ笛を鳴らしました。",
    failure: "五時四十分。笛のない駅を、始発列車が静かに通り過ぎました。"
  },
  {
    label: "第三号",
    title: "差出人のない絵葉書",
    postmark: "消印：神奈川・鎌倉",
    ring: "KAMAKURA\n7.16",
    date: "日付なし",
    body: [
      "紫陽花の坂を、今年も登りました。",
      "海の見える四角い窓は、夕方だけ金色になります。",
      "教えてもらった星は見つけられなかったけれど、約束は覚えています。"
    ],
    signature: "名前の書けなかった生徒",
    clues: ["紫陽花の坂", "海の見える窓", "星の授業"],
    answer: 0,
    candidates: [
      { name: "久保田 司", age: "64歳", info: "旧・岬小学校の理科教員。天文部顧問を務めた。", note: "居住地：鎌倉市極楽寺" },
      { name: "星野 美咲", age: "38歳", info: "海辺の画廊「四角い窓」を経営する。", note: "居住地：鎌倉市由比ヶ浜" },
      { name: "坂井 晃", age: "59歳", info: "紫陽花寺近くの写真館主。夕景を専門とする。", note: "居住地：鎌倉市山ノ内" }
    ],
    success: "久保田先生は絵葉書を天文部の古い出席簿に挟み、夜まで空を見上げていました。",
    failure: "絵葉書は美しい景色として飾られました。でも、約束を知る人には届きませんでした。"
  },
  {
    label: "最終号",
    title: "局内で見つかった手紙",
    postmark: "消印：なし",
    ring: "NO POSTMARK",
    date: "七月二十三日",
    body: [
      "赤い椅子の店にも、五時四十分の駅にも、",
      "海の見える教室にも、私は手紙を運びました。",
      "もう一度だけ、誰かの『届いた』を聞きたいのです。"
    ],
    signature: "配達鞄を置いた者より",
    clues: ["過去三通の場所", "元配達員", "消印がない"],
    answer: 1,
    candidates: [
      { name: "今回の差出人", age: "不明", info: "宛先の代わりに、差出人を探して返送する。", note: "処理：差出人還付" },
      { name: "宛先不明課", age: "創設73年", info: "届かなかった言葉を、最後まで預かる場所。", note: "配達先：この机" },
      { name: "郵便資料館", age: "開館28年", info: "歴史的な郵便物と、使われた配達鞄を収蔵する。", note: "配達先：永久保存庫" }
    ],
    success: "それは、長くこの机で働いた前任者から、次に座るあなたへの手紙でした。",
    failure: "手紙は記録として残りました。ただ一人、読むはずだったあなたを残して。"
  }
];

const $ = (selector) => document.querySelector(selector);
const introPanel = $("#introPanel");
const workarea = $("#workarea");
const resultOverlay = $("#resultOverlay");
const ending = $("#ending");
const envelope = $("#envelope");
const letter = $("#letter");
const candidateList = $("#candidateList");
const deliverButton = $("#deliverButton");
let current = 0;
let selected = null;
let score = 0;
let opened = false;
let soundOn = true;
let audioContext;

function tone(frequency = 440, duration = .08, type = "sine", volume = .035) {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function renderDots() {
  $("#caseDots").innerHTML = cases.map((item, index) => {
    const state = index < current ? "done" : index === current ? "active" : "";
    return `<span class="case-dot ${state}">${item.label}</span>`;
  }).join("");
}

function loadCase() {
  const item = cases[current];
  selected = null;
  opened = false;
  envelope.classList.remove("open");
  letter.classList.remove("revealed");
  deliverButton.disabled = true;
  $("#caseLabel").textContent = item.label;
  $("#caseTitle").textContent = item.title;
  $("#postmark").textContent = item.postmark;
  $("#postmarkRing").innerText = item.ring;
  $("#letterDate").textContent = item.date;
  $("#letterBody").innerHTML = item.body.map(line => `<p>${line}</p>`).join("");
  $("#signature").textContent = item.signature;
  $("#clueStrip").innerHTML = "";
  candidateList.innerHTML = item.candidates.map((candidate, index) => `
    <button class="candidate" type="button" data-index="${index}">
      <span class="candidate-top"><strong>${candidate.name}</strong><span>${candidate.age}</span></span>
      <p>${candidate.info}</p>
      <small>${candidate.note}</small>
    </button>
  `).join("");
  candidateList.querySelectorAll(".candidate").forEach(button => {
    button.addEventListener("click", () => {
      selected = Number(button.dataset.index);
      candidateList.querySelectorAll(".candidate").forEach(card => card.classList.remove("selected"));
      button.classList.add("selected");
      deliverButton.disabled = false;
      tone(330, .05, "triangle");
    });
  });
  $("#caseCount").textContent = `未処理 ${cases.length - current}通`;
  $("#score").textContent = score;
  renderDots();
}

function openEnvelope() {
  if (opened) return;
  opened = true;
  envelope.classList.add("open");
  letter.classList.add("revealed");
  tone(150, .22, "triangle", .025);
  setTimeout(() => {
    $("#clueStrip").innerHTML = cases[current].clues.map((clue, index) =>
      `<span class="clue" style="animation-delay:${index * .1}s">手掛かり ${index + 1}　${clue}</span>`
    ).join("");
  }, 650);
}

function deliver() {
  if (selected === null) return;
  const item = cases[current];
  const correct = selected === item.answer;
  if (correct) score += 1;
  $("#resultStamp").textContent = correct ? "配達" : "誤配";
  $("#resultStamp").style.borderColor = correct ? "var(--red)" : "#667";
  $("#resultStamp").style.color = correct ? "var(--red)" : "#667";
  $("#resultEyebrow").textContent = correct ? "DELIVERY COMPLETE" : "ADDRESS MISMATCH";
  $("#resultTitle").textContent = correct ? "手紙は、届きました。" : "宛先が違ったようです。";
  $("#resultText").textContent = correct ? item.success : item.failure;
  $("#nextButton").innerHTML = current === cases.length - 1 ? "本日の記録を見る <span>→</span>" : "次の手紙へ <span>→</span>";
  resultOverlay.classList.remove("hidden");
  $("#resultStamp").classList.remove("hit");
  requestAnimationFrame(() => $("#resultStamp").classList.add("hit"));
  tone(correct ? 523 : 140, .18, correct ? "sine" : "sawtooth", .04);
  if (correct) setTimeout(() => tone(659, .25, "sine", .025), 140);
}

function finish() {
  workarea.classList.add("hidden");
  resultOverlay.classList.add("hidden");
  ending.classList.remove("hidden");
  $("#caseCount").textContent = "未処理 0通";
  $("#finalScore").textContent = `${score} / ${cases.length}`;
  if (score === cases.length) {
    $("#endingTitle").textContent = "四通すべて、配達完了。";
    $("#endingMessage").innerHTML = "住所が消えても、言葉は行き先を覚えていました。<br>本日の宛先不明課を閉局します。";
  } else {
    $("#endingTitle").textContent = `${score}通の手紙が届きました。`;
    $("#endingMessage").innerHTML = "届かなかった手紙は、明日もこの机で待っています。<br>文面を読み直せば、別の行き先が見えるかもしれません。";
  }
  tone(392, .3, "sine", .025);
}

$("#startButton").addEventListener("click", () => {
  introPanel.classList.add("hidden");
  workarea.classList.remove("hidden");
  tone(294, .12, "triangle");
  loadCase();
});
envelope.addEventListener("click", openEnvelope);
deliverButton.addEventListener("click", deliver);
$("#nextButton").addEventListener("click", () => {
  if (current === cases.length - 1) {
    finish();
  } else {
    current += 1;
    resultOverlay.classList.add("hidden");
    loadCase();
  }
});
$("#restartButton").addEventListener("click", () => {
  current = 0;
  score = 0;
  ending.classList.add("hidden");
  workarea.classList.remove("hidden");
  loadCase();
});
$("#soundButton").addEventListener("click", event => {
  soundOn = !soundOn;
  event.currentTarget.querySelector("b").textContent = soundOn ? "入" : "切";
  if (soundOn) tone(440);
});
