const startBtn = document.getElementById("startBtn");
const rankLabel = document.getElementById("rankLabel");
const drumroll = document.getElementById("drumroll");
const winnerText = document.getElementById("winnerText");
const resultList = document.getElementById("resultList");
const confetti = document.getElementById("confetti");

const incidents = [
  "初恋の人の顔そっくりの模様の甲羅のカニが食卓に",
  "祖母の筆跡で「まだ早い」と書かれたナスが冷蔵庫から出てきた",
  "修学旅行でなくしたキーホルダーが、知らない犬の首輪について帰ってきた",
  "歯医者の待合室に、小3の時に描いた未来予想図が額装されていた",
  "押し入れから、まだ誰も死んでいないのに遺影だけ完成度高く出てきた",
  "朝起きたら、枕元に自分の名前だけ刺繍された知らない柔道着が置いてあった",
  "電車で隣に座った人の膝に、実家の玄関マットが丁寧に畳まれていた",
  "玄関に置いた覚えのない靴が、全部人生の分岐点のサイズだった",
  "洗濯物に混じって、知らない家族旅行の集合写真みたいなタオルが干されていた",
  "茶碗の底に、誰にも話していないあだ名が焼き付いていた",
  "駅のホームで自分と同じ顔の人が、先に帰宅していた",
  "旅行先の旅館で出た浴衣が、昔の自分の笑い方に似ていた",
  "自販機で出てきた缶コーヒーが、母校の下駄箱の匂いだけした",
  "風呂場の鏡に、昨日食べた魚の名前で呼びかけられた",
  "宅配便の伝票に、まだ引っ越していない未来の住所が印字されていた",
  "祖父の古い腕時計が、こちらの心拍数だけを正確に刻んでいた",
  "タンスの裏からカピカピになったヤモリがこんにちわ",
  "知らない町内会長から、前世のゴミ出しについて厳重注意が届いた",
  "カーテンの裏にいたホコリが、こちらの旧姓を知っていた",
  "公園の砂場から、自分が一度も経験していない夏休みの絵日記が出土した",
  "バス停の時刻表に、自分が謝る予定の時刻だけ赤丸で囲まれていた",
  "天井のシミが、上半期の反省文を一晩で書き上げていた",
  "靴箱の奥で片方だけの靴が、母方の親戚を名乗り始めた",
  "小学校の卒業文集が郵便受けに入り、まだ書いていない将来の夢が載っていた",
  "実家の電話が鳴り、受話器の向こうで幼稚園の頃の上履きが泣いていた",
  "財布の中のポイントカードが、全員でこちらを見ない会議をしていた",
  "ベランダに干したTシャツが翌朝、微妙に思想を持っていた",
  "コンビニのレシートに、まだ起きていない買い物が印字されていた",
  "鍵穴から毎朝少しだけ拍手が聞こえるようになった",
  "宇宙人にキャトルミューティレーションされかけて、なぜか靴下だけ返された",
  "古いアルバムの集合写真で、自分だけ昨日の服を着ていた",
  "洗面台の下から、家族の誰よりも家に詳しい謎のネジが出てきた",
  "エレベーターの「閉」ボタンだけが、こちらを試す目をしていた",
  "押し入れの奥から、平成ではない平成が出てきた",
  "スマホのアルバムに、撮った覚えのない月の裏側が保存されていた",
  "玄関マットの下に第2の玄関マットがあり、その下に小さな海があった",
  "リモコンの電池を替えたら、隣の県の夕焼けが操作できた",
  "封筒から、差出人が自分の筆跡なのに宛名だけ知らない祖先だった",
  "古い傘を開いたら、中から去年の梅雨がそのまま落ちてきた",
  "病院の番号札が、自分の誕生日ではなく自分が諦めた日の番号だった",
  "美容院の鏡越しに、別の店で切られている自分と目が合った",
  "町の掲示板に、まだ開催されていない自分の送別会のお知らせが貼られていた",
  "タクシーの運転手が、目的地ではなく忘れたふりをしている約束へ向かった",
  "古本屋で開いた辞書の『私』の項目に、知らない癖だけ詳しく載っていた",
  "ATMの明細に、残高ではなく最近なくした勇気の数が表示された",
  "寝癖が、なぜか中学の担任の筆跡と完全に一致していた"
];

const drumrollLines = [
  "記憶の隙間を照合中",
  "関係者席がざわついています",
  "審査員が押し入れを見ています",
  "半年分の違和感を集計中",
  "封印された生活音を確認中",
  "まもなく発表です"
];

let running = false;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickFive() {
  return [...incidents]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
}

function setWinner(text) {
  winnerText.classList.remove("revealing");
  void winnerText.offsetWidth;
  winnerText.textContent = text;
  winnerText.classList.add("revealing");
}

function addResult(rank, text) {
  const item = document.createElement("li");
  item.className = `resultItem${rank === 1 ? " champion" : ""}`;
  item.innerHTML = `<strong>${rank}位</strong><span>${text}</span>`;
  resultList.prepend(item);
}

function burstConfetti(amount) {
  const colors = ["#f1c75e", "#e44b35", "#fff8e7", "#7fd3c7", "#8fb3ff"];

  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("i");
    piece.className = "piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);
    piece.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
    piece.style.setProperty("--duration", `${1.7 + Math.random() * 1.6}s`);
    confetti.appendChild(piece);
    setTimeout(() => piece.remove(), 3600);
  }
}

async function announce() {
  if (running) return;

  running = true;
  startBtn.disabled = true;
  startBtn.textContent = "発表中";
  resultList.innerHTML = "";

  const winners = pickFive();

  for (let index = 0; index < winners.length; index++) {
    const rank = 5 - index;
    rankLabel.textContent = `第${rank}位`;
    setWinner("...");

    for (let i = 0; i < 3; i++) {
      drumroll.textContent = drumrollLines[(index + i) % drumrollLines.length];
      await wait(360);
    }

    drumroll.textContent = "発表します";
    await wait(260);
    setWinner(winners[index]);
    addResult(rank, winners[index]);
    burstConfetti(rank === 1 ? 70 : 24);
    await wait(rank === 1 ? 1400 : 1050);
  }

  rankLabel.textContent = "総評";
  drumroll.textContent = "以上、厳正なる上半期でした";
  setWinner("下半期も、身に覚えのない栄光がありますように。");

  startBtn.disabled = false;
  startBtn.textContent = "もう一度発表する";
  running = false;
}

startBtn.addEventListener("click", announce);
