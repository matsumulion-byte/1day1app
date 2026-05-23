const ASSET_BASE = "/apps/2026-05-23";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const toNameInput = document.getElementById("toName");
const fromNameInput = document.getElementById("fromName");
const generateBtn = document.getElementById("generateBtn");
const againBtn = document.getElementById("againBtn");
const copyBtn = document.getElementById("copyBtn");
const soundBtn = document.getElementById("soundBtn");
const letterWrap = document.getElementById("letterWrap");
const letterText = document.getElementById("letterText");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

let soundEnabled = true;
let currentLetter = "";

const likes = [
  "くしゃみのあとだけ少し遠くを見るところ",
  "立っているだけなのに、何かを見送っている感じがするところ",
  "いつも同じ手でドアを開けるところ",
  "急に黙ると、そこだけ別の季節みたいになるところ",
  "何もないところを避けて歩くところ",
  "座るたびに少しだけ覚悟が見えるところ",
  "まばたきが一回ぶん長いところ",
  "後ろ姿に、まだ言っていないことが残っているところ",
  "名前を呼ぶと、一度だけ世界が止まるところ",
  "ふつうにしているのに、少しだけ夢の中みたいなところ",
  "何かを思い出しかけて、やめるところ",
  "気づくとそこにいるところ",
  "目が合うと、廊下まで静かになるところ",
  "笑っていないのに、笑う前みたいな顔をしているところ"
];

const scenes = [
  "何もない壁をしばらく見ているとき",
  "誰も押していないボタンの近くにいるとき",
  "エレベーターを待ちながら、少しだけ上を気にしているとき",
  "飲みものを持ったまま、しばらく飲まないとき",
  "帰る方向を知っているのに、すぐには歩き出さないとき",
  "急に立ち止まって、でも何も言わないとき",
  "椅子に座ってから、もう一度座り直すとき",
  "ひとりでいるのに、誰かを待っている感じのとき",
  "窓の外を見ているのに、たぶん何も見ていないとき",
  "なにかに気づいたようで、気づかなかったことにするとき",
  "まだ始まっていない話を聞いているみたいな顔をするとき",
  "小さくうなずいたあと、その理由を言わないとき"
];

const feelings = [
  "胸の中で何かが整列します",
  "心のすみで小さな点呼が始まります",
  "頭の奥で、見たことのない部屋の電気がつきます",
  "急に靴音のことを考えてしまいます",
  "体のどこかに小さな待合室ができます",
  "少しだけ、明日の天気に責任を感じます",
  "気持ちが半歩ぶん遅れてついてきます",
  "心の中で、誰かが静かにカーテンを閉めます",
  "胸元に見えない付箋が貼られた気がします",
  "名前のない気配がしばらく残ります",
  "自分の中の何かが、いったん廊下に出ます",
  "感情がいすに座り直します"
];

const invites = [
  "どこにも用のない散歩をしませんか",
  "少しだけ間違った道を歩きませんか",
  "夕方のスーパーを静かに一周しませんか",
  "座っても意味のないベンチに座りませんか",
  "知らない建物を見て、たぶん何も言わない時間を過ごしませんか",
  "自動販売機の前で少し考えませんか",
  "一緒に遠くの音を聞きませんか",
  "行き先を決めずに角を曲がりませんか",
  "同じ景色を別々の気持ちで見ませんか",
  "ちょっとだけ、帰るのをやめませんか",
  "名前のついていない時間を過ごしませんか",
  "意味があるのかないのかわからない寄り道をしませんか"
];

const endings = [
  "この手紙は、たぶん今がいちばん落ち着いています。",
  "読んだあと、どこかに立てかけておいてください。",
  "返事がなくても、しばらくはこのままでいます。",
  "この気持ちは、まだ床に置けません。",
  "もし困ったら、少し忘れてください。",
  "あなたの近くでは、いつも少しだけ現実が薄いです。",
  "うまくいかなくても、この手紙だけは発生しました。",
  "これ以上書くと、たぶん急に普通になります。",
  "気のせいでもかまいません。",
  "では、いったん静かにしておきます。",
  "このあと封筒の中で少し反省します。",
  "まだ言い足りませんが、いまはここまでにしておきます。"
];

const openers = [
  "さっきまで普通だったのですが",
  "書かないでおこうと思っていたのに",
  "理由はまだうまく言えませんが",
  "少し変なタイミングですが",
  "今日の空気がそうさせました",
  "このままだと何もなかったことになりそうなので",
  "うまくまとまらないまま書いています",
  "あなたのことを考えていたら、急に静かになったので"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function cleanName(value, fallback) {
  const name = value.trim();
  return name || fallback;
}

function makeLetter() {
  const toName = cleanName(toNameInput.value, "あなた");
  const fromName = cleanName(fromNameInput.value, "名もなき誰か");

  return `${toName}へ

${rand(openers)}。

あなたの、${rand(likes)}が好きです。
とくに、${rand(scenes)}、${rand(feelings)}。

もしよかったら、今度いっしょに${rand(invites)}。

${rand(endings)}

${fromName}より`;
}

async function startBgm() {
  if (!soundEnabled) return;

  try {
    await bgm.play();
    soundBtn.classList.remove("off");
  } catch (error) {
    soundBtn.classList.add("off");
  }
}

function generateLetter() {
  currentLetter = makeLetter();
  letterText.textContent = currentLetter;
  letterWrap.classList.remove("hidden");

  letterWrap.style.animation = "none";
  requestAnimationFrame(() => {
    letterWrap.style.animation = "";
  });

  startBgm();
}

async function copyLetter() {
  if (!currentLetter) return;

  try {
    await navigator.clipboard.writeText(currentLetter);
    copyBtn.textContent = "コピーした";
    copyBtn.classList.add("copied");

    setTimeout(() => {
      copyBtn.textContent = "コピーする";
      copyBtn.classList.remove("copied");
    }, 900);
  } catch (error) {
    copyBtn.textContent = "コピー失敗";
    setTimeout(() => {
      copyBtn.textContent = "コピーする";
    }, 900);
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    startBgm();
    soundBtn.classList.remove("off");
  } else {
    bgm.pause();
    soundBtn.classList.add("off");
  }
}

generateBtn.addEventListener("click", generateLetter);
againBtn.addEventListener("click", generateLetter);
copyBtn.addEventListener("click", copyLetter);
soundBtn.addEventListener("click", toggleSound);
