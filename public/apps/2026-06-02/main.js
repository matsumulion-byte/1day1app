const ASSET_BASE = "/apps/2026-06-02";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const IMAGES = {
  normal: asset("./assets/matsumura-normal.png"),
  happy: asset("./assets/matsumura-happy.png"),
  sad: asset("./assets/matsumura-sad.png"),
  despair: asset("./assets/matsumura-despair.png"),
  lastSmile: asset("./assets/matsumura-last-smile.png"),
};

const startScreen = document.getElementById("startScreen");
const playScreen = document.getElementById("playScreen");
const startBtn = document.getElementById("startBtn");
const startMatsumuraEl = document.getElementById("startMatsumura");

const turnEl = document.getElementById("turn");
const scoreEl = document.getElementById("score");
const matsuScoreEl = document.getElementById("matsuScore");
const matsumuraEl = document.getElementById("matsumura");
const dialogueEl = document.getElementById("dialogue");
const resultEl = document.getElementById("result");
const cooperateBtn = document.getElementById("cooperateBtn");
const betrayBtn = document.getElementById("betrayBtn");
const restartBtn = document.getElementById("restartBtn");
const choiceArea = document.getElementById("choiceArea");
const soundBtn = document.getElementById("soundBtn");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

let turn = 1;
let score = 0;
let matsuScore = 0;
let betrayCount = 0;
let cooperateCount = 0;
let locked = false;
let soundOn = false;

const openingLines = [
  "信じてるよ。",
  "今回は協力でいこう。",
  "大丈夫。俺は裏切らないから。",
  "一緒に点を取りにいこう。",
];

const sadLines = [
  "えっ……？",
  "いや、まあ……そういう作戦なんだね。",
  "俺、なんかしたかな。",
  "信じてたんだけどな。",
  "そっか……。",
  "まだ、協力できると思ってた。",
  "そういうゲームだもんね。",
  "うん。わかった。",
];

const happyLines = [
  "よかった。信じてた。",
  "やっぱり協力が一番だね。",
  "いい感じだね。",
  "こういうのでいいんだよ。",
];

const finalSmileLines = [
  "でも、楽しかったよ。",
  "最後まで一緒に遊んでくれてありがとう。",
  "勝てたなら、よかったね。",
];

function setImage(type) {
  matsumuraEl.src = IMAGES[type];
  matsumuraEl.classList.remove("shake", "drop");

  if (type === "sad") {
    matsumuraEl.classList.add("shake");
  }

  if (type === "despair") {
    matsumuraEl.classList.add("drop");
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateStatus() {
  turnEl.textContent = String(Math.min(turn, 10));
  scoreEl.textContent = String(score);
  matsuScoreEl.textContent = String(matsuScore);
}

function getMatsumuraChoice() {
  if (betrayCount >= 5 && Math.random() < 0.18) return "betray";
  if (betrayCount >= 8 && Math.random() < 0.28) return "betray";
  return "cooperate";
}

function getScores(player, matsumura) {
  if (player === "cooperate" && matsumura === "cooperate") return { player: 2, matsu: 2 };
  if (player === "betray" && matsumura === "cooperate") return { player: 5, matsu: -1 };
  if (player === "cooperate" && matsumura === "betray") return { player: -1, matsu: 5 };
  return { player: 0, matsu: 0 };
}

function getLabel(choice) {
  return choice === "cooperate" ? "協力" : "裏切り";
}

function choose(playerChoice) {
  if (locked) return;
  locked = true;

  cooperateBtn.disabled = true;
  betrayBtn.disabled = true;
  resultEl.textContent = "同時に出します……";

  const matsumuraChoice = getMatsumuraChoice();

  setTimeout(() => {
    const add = getScores(playerChoice, matsumuraChoice);
    score += add.player;
    matsuScore += add.matsu;

    if (playerChoice === "betray") betrayCount += 1;
    if (playerChoice === "cooperate") cooperateCount += 1;

    resultEl.textContent = `あなた：${getLabel(playerChoice)} ／ 松村：${getLabel(matsumuraChoice)}\nあなた ${add.player >= 0 ? "+" : ""}${add.player}点 ／ 松村 ${add.matsu >= 0 ? "+" : ""}${add.matsu}点`;

    if (playerChoice === "betray" && matsumuraChoice === "cooperate") {
      if (betrayCount >= 5) {
        setImage("despair");
      } else {
        setImage("sad");
      }
      dialogueEl.textContent = sadLines[Math.min(betrayCount - 1, sadLines.length - 1)];
    } else if (playerChoice === "cooperate" && matsumuraChoice === "cooperate") {
      setImage("happy");
      dialogueEl.textContent = randomItem(happyLines);
    } else if (playerChoice === "cooperate" && matsumuraChoice === "betray") {
      setImage("normal");
      dialogueEl.textContent = "ごめん。今のは、俺もよくなかった。";
    } else {
      setImage("despair");
      dialogueEl.textContent = "もう、何も信じられないね。";
    }

    updateStatus();

    setTimeout(() => {
      if (turn >= 10) {
        finishGame();
        return;
      }

      turn += 1;
      locked = false;
      cooperateBtn.disabled = false;
      betrayBtn.disabled = false;
      resultEl.textContent = "";
      turnEl.textContent = String(turn);

      if (betrayCount >= 5) {
        setImage("despair");
        dialogueEl.textContent = "次は……どうする？";
      } else {
        setImage("normal");
        dialogueEl.textContent = randomItem(openingLines);
      }
    }, 1350);
  }, 650);
}

function getTitle() {
  if (betrayCount === 0) return "いい人";
  if (betrayCount === 1) return "出来心";
  if (betrayCount <= 3) return "ほどよい裏切り者";
  if (betrayCount <= 6) return "人の心がまだ少しある";
  if (betrayCount <= 9) return "ゲーム理論の悪魔";
  return "人の心がない";
}

function getEndingText() {
  if (betrayCount === 0) {
    return `称号：${getTitle()}\n松村との友情は守られた。点数はそこそこ。`;
  }

  if (betrayCount === 10) {
    return `称号：${getTitle()}\nあなたは勝った。たぶん、何かには負けた。`;
  }

  if (cooperateCount >= 1 && betrayCount >= 5) {
    return `称号：${getTitle()}\nたまに見せる優しさが、逆に一番こわい。`;
  }

  return `称号：${getTitle()}\n勝ち方には、人間性が出る。`;
}

function finishGame() {
  locked = true;
  choiceArea.classList.add("hidden");
  restartBtn.classList.remove("hidden");
  setImage("lastSmile");
  dialogueEl.textContent = randomItem(finalSmileLines);
  resultEl.textContent = getEndingText();
  updateStatus();
}

function restart() {
  turn = 1;
  score = 0;
  matsuScore = 0;
  betrayCount = 0;
  cooperateCount = 0;
  locked = false;

  choiceArea.classList.remove("hidden");
  restartBtn.classList.add("hidden");

  cooperateBtn.disabled = false;
  betrayBtn.disabled = false;

  setImage("normal");
  dialogueEl.textContent = "今日もよろしくね。";
  resultEl.textContent = "";
  updateStatus();
}

startBtn.addEventListener("click", async () => {
  try {
    await bgm.play();
    soundOn = true;
    soundBtn.textContent = "BGM ON";
  } catch {
    // BGMなしでもゲームは進める
  }

  startScreen.classList.add("fadeout");

  setTimeout(() => {
    startScreen.classList.add("hidden");
    playScreen.classList.remove("hidden");
    restart();
  }, 500);
});

cooperateBtn.addEventListener("click", () => choose("cooperate"));
betrayBtn.addEventListener("click", () => choose("betray"));
restartBtn.addEventListener("click", restart);

soundBtn.addEventListener("click", async () => {
  try {
    if (!soundOn) {
      await bgm.play();
      soundOn = true;
      soundBtn.textContent = "BGM ON";
    } else {
      bgm.pause();
      soundOn = false;
      soundBtn.textContent = "BGM";
    }
  } catch {
    soundBtn.textContent = "再生不可";
  }
});

startMatsumuraEl.src = IMAGES.normal;
setImage("normal");
updateStatus();