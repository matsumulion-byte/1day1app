const directions = {
  mild: [
    "次の角を、気持ち左です。",
    "しばらく道なりです。道なりの定義は各自でお願いします。",
    "右に曲がれる気配がしたら右です。",
    "目的地周辺です。まだ目的地は見つかっていません。",
    "300m先、なんとなく安心できる方へ進んでください。"
  ],
  loose: [
    "14m先、昨日の後悔を右折です。",
    "この先、歩道橋っぽい気分を渡ります。",
    "次の信号で、急に大人ぶらないでください。",
    "まもなく、用事を思い出したふりをして左です。",
    "ロータリーを2周して、納得したら出てください。"
  ],
  chaos: [
    "このまま直進です。目的地が折れてください。",
    "7m先、知らない町内会に合流します。",
    "経路を再探索しました。結果、散歩です。",
    "まもなく右折です。右がどちらかは今決まります。",
    "この先、到着した感じだけします。"
  ]
};

const notes = [
  "迷ってはいません。道がこちらに合わせていないだけです。",
  "到着予想時刻は、やる気の回復次第です。",
  "混雑しています。主に頭の中が。",
  "近くに便利な施設があります。たぶんコンビニです。",
  "ルート上に小さな達成感があります。踏み忘れに注意してください。",
  "この案内はナビの日に免じて許されています。"
];

const tickers = [
  "周辺情報: さっき見た店はもう通り過ぎました",
  "交通情報: 心配ごと方面、やや渋滞",
  "おすすめ: 角のない角を曲がると近道です",
  "注意: 目的地を設定すると精度が落ちます",
  "周辺情報: 知らない道ほど帰り道っぽいです",
  "速報: 予定より3分ほど人生が進んでいます"
];

const modeNames = ["mild", "loose", "chaos"];
const modeLabels = {
  mild: "雑さ: ふつう",
  loose: "雑さ: だいぶ",
  chaos: "雑さ: 全開"
};

const distanceEl = document.querySelector("#distance");
const directionEl = document.querySelector("#direction");
const noteEl = document.querySelector("#note");
const signalEl = document.querySelector("#signal");
const tickerEl = document.querySelector("#ticker");
const rerouteButton = document.querySelector("#reroute");
const modeButton = document.querySelector("#mode");
const pinNow = document.querySelector(".pin-now");

let modeIndex = 0;
let previousDirection = "";

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickDirection(mode) {
  let next = pick(directions[mode]);
  if (directions[mode].length > 1) {
    while (next === previousDirection) {
      next = pick(directions[mode]);
    }
  }
  previousDirection = next;
  return next;
}

function reroute() {
  const mode = modeNames[modeIndex];
  const distance = Math.floor(Math.random() * 620) + 3;
  const uncertainty = pick(["くらい", "前後", "かもしれません", "の気配"]);
  const left = Math.floor(Math.random() * 52) + 24;
  const top = Math.floor(Math.random() * 42) + 18;

  distanceEl.textContent = `あと ${distance}m ${uncertainty}`;
  directionEl.textContent = pickDirection(mode);
  noteEl.textContent = pick(notes);
  tickerEl.textContent = pick(tickers);
  signalEl.textContent = pick([
    "GPS: たぶん正常",
    "GPS: 気分で補正中",
    "GPS: 現在地と相談中",
    "GPS: ほぼここ"
  ]);

  pinNow.style.left = `${left}%`;
  pinNow.style.top = `${top}%`;
}

function changeMode() {
  modeIndex = (modeIndex + 1) % modeNames.length;
  modeButton.textContent = modeLabels[modeNames[modeIndex]];
  reroute();
}

rerouteButton.addEventListener("click", reroute);
modeButton.addEventListener("click", changeMode);
modeButton.textContent = modeLabels[modeNames[modeIndex]];
