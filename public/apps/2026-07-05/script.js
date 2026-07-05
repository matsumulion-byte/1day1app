const firstReel = document.getElementById("firstReel");
const secondReel = document.getElementById("secondReel");
const resultText = document.getElementById("resultText");
const drawButton = document.getElementById("drawButton");

const talents = [
  "ベーコンポテトパイで口を火傷する",
  "内弁慶",
  "さっき再設定したパスワードを忘れる",
  "エアコンのリモコンが見つからない",
  "カバンからいつのかわからないChargeSPOTが出てくる",
  "カップ麺は2分で食べ始める",
  "コンビニの店員にあだ名をつけられている",
  "LINEの返信を脳内で済ませる",
  "改札前で急にICカードを探す",
  "集合写真で半目になる",
  "冷蔵庫の前で人生を考える",
  "傘を持った日に限って晴れる",
  "美容室で会話を諦める",
  "袋を開ける方向を毎回間違える",
  "レジ袋を断ったあと少し後悔する",
  "電子レンジの残り5秒で止める",
  "スクショだけ撮って満足する",
  "イヤホンの片方だけ充電されてない",
  "玄関を出た瞬間に忘れ物を思い出す",
  "「後で読む」を一生読まない",
  "風呂に入るまでが長い",
  "通知を消して用件も忘れる",
  "予定の30分前から何もできない",
  "服を買いに行く服がない",
  "使わないポイントカードだけ持っている",
  "店員さんの「袋いりますか」に毎回うろたえる",
  "アラームを止めた記憶だけない",
  "買い物メモを書いた紙を家に置いてくる",
  "靴下の片方だけ旅に出す",
  "スマホを探しながらスマホのライトを使う",
];

let spinning = false;
let firstIndex = 0;
let secondIndex = 1;

function randomIndex(exceptIndex = -1) {
  let index = Math.floor(Math.random() * talents.length);
  while (index === exceptIndex) {
    index = Math.floor(Math.random() * talents.length);
  }
  return index;
}

function setResult(left, right) {
  resultText.textContent = `あなたは「${left}」と「${right}」の二刀流です`;
}

function tickReel(element, exceptIndex) {
  const index = randomIndex(exceptIndex);
  element.textContent = talents[index];
  return index;
}

function draw() {
  if (spinning) return;

  spinning = true;
  drawButton.disabled = true;
  drawButton.textContent = "判定中...";
  resultText.textContent = "勝手に選考中です";
  firstReel.classList.add("spinning");
  secondReel.classList.add("spinning");

  let ticks = 0;
  const spinTimer = setInterval(() => {
    firstIndex = tickReel(firstReel, secondIndex);
    secondIndex = tickReel(secondReel, firstIndex);
    ticks += 1;

    if (ticks >= 24) {
      clearInterval(spinTimer);
      firstIndex = randomIndex();
      secondIndex = randomIndex(firstIndex);
      const first = talents[firstIndex];
      const second = talents[secondIndex];

      firstReel.textContent = first;
      secondReel.textContent = second;
      firstReel.classList.remove("spinning");
      secondReel.classList.remove("spinning");
      setResult(first, second);

      drawButton.disabled = false;
      drawButton.textContent = "もう一回決める";
      spinning = false;
    }
  }, 62);
}

drawButton.addEventListener("click", draw);
