const asset = (p) => new URL(p, import.meta.url).toString();

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const rubBtn = document.getElementById("rubBtn");
const finishBtn = document.getElementById("finishBtn");

const timeText = document.getElementById("timeText");
const tempText = document.getElementById("tempText");
const statusText = document.getElementById("statusText");
const mercury = document.getElementById("mercury");
const rubArea = document.getElementById("rubArea");
const rubEffect = document.getElementById("rubEffect");
const zoneMarker = document.getElementById("zoneMarker");

const resultTemp = document.getElementById("resultTemp");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

let temp = 36.4;
let timeLeft = 10;
let timerId = null;
let running = false;
let lastPointerX = null;
let rubPower = 0;

const MIN_TEMP = 35.8;
const MAX_TEMP = 40.2;

function showScreen(screen) {
  startScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function startGame() {
  temp = 36.4 + Math.random() * 0.2;
  timeLeft = 10;
  running = true;
  rubPower = 0;
  lastPointerX = null;

  showScreen(gameScreen);
  updateView();

  clearInterval(timerId);
  timerId = setInterval(tick, 100);
}

function tick() {
  if (!running) return;

  timeLeft -= 0.1;

  // こすった直後の熱が少し残る
  if (rubPower > 0) {
    temp += rubPower * 0.018;
    rubPower *= 0.82;
  }

  // 放置すると少し下がる
  temp -= 0.006;

  // 微妙な揺らぎ
  temp += (Math.random() - 0.5) * 0.012;

  temp = clamp(temp, MIN_TEMP, MAX_TEMP);

  if (temp >= 38.5) {
    finishGame("hospital");
    return;
  }

  if (timeLeft <= 0) {
    finishGame("timeup");
    return;
  }

  updateView();
}

function rub(amount = 1) {
  if (!running) return;

  const rise = 0.055 * amount + Math.random() * 0.018;
  temp += rise;
  rubPower += 0.18 * amount;
  rubPower = Math.min(rubPower, 1.6);

  temp = clamp(temp, MIN_TEMP, MAX_TEMP);

  showRubEffect();
  updateView();

  if (temp >= 38.5) {
    finishGame("hospital");
  }
}

function finishGame(reason = "manual") {
  if (!running) return;

  running = false;
  clearInterval(timerId);
  timerId = null;

  const t = Number(temp.toFixed(1));
  const result = judge(t, reason);

  resultTemp.textContent = `${t.toFixed(1)}℃`;
  resultTitle.textContent = result.title;
  resultMessage.textContent = result.message;

  showScreen(resultScreen);
}

function judge(t, reason) {
  if (reason === "hospital" || t >= 38.5) {
    return {
      title: "病院送り",
      message: "上げすぎです。親が本気で心配しはじめました。仮病のつもりが普通に診察コースです。"
    };
  }

  if (t < 37.0) {
    return {
      title: "健康体",
      message: "元気です。どう見ても学校に行けます。ランドセルを背負ってください。"
    };
  }

  if (t <= 37.4) {
    return {
      title: "微熱成功",
      message: "完璧な微熱です。休む理由として一番角が立たないラインに着地しました。"
    };
  }

  if (t <= 37.9) {
    return {
      title: "やや本気の熱",
      message: "休めそうですが、少し心配されます。午後には元気になるタイプの熱です。"
    };
  }

  if (t <= 38.4) {
    return {
      title: "普通に発熱",
      message: "これはもうサボりではありません。先生より先に親が病院を検索しています。"
    };
  }

  return {
    title: "測定不能",
    message: "体温計があなたの演技力についていけませんでした。"
  };
}

function updateView() {
  const displayTemp = temp.toFixed(1);
  const displayTime = Math.max(0, timeLeft).toFixed(1);

  tempText.textContent = displayTemp;
  timeText.textContent = displayTime;

  const percent = normalize(temp, 35.8, 40.2);
  mercury.style.height = `${10 + percent * 82}%`;
  zoneMarker.style.left = `${percent * 100}%`;

  statusText.textContent = getStatusText(temp);
}

function getStatusText(t) {
  if (t < 36.6) return "まだ健康。これでは登校です。";
  if (t < 37.0) return "惜しい。もう少しだけ体温計をこすりたい。";
  if (t <= 37.4) return "ここです。完璧な微熱ラインです。";
  if (t <= 37.7) return "ちょっと上がりすぎ。先生が少し心配します。";
  if (t <= 38.4) return "普通に熱です。サボりではなくなってきました。";
  return "危険。病院送りラインです。";
}

function showRubEffect() {
  rubEffect.classList.remove("show");
  void rubEffect.offsetWidth;
  rubEffect.classList.add("show");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1);
}

rubBtn.addEventListener("click", () => rub(1));
finishBtn.addEventListener("click", () => finishGame("manual"));
startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

rubArea.addEventListener("pointerdown", (event) => {
  if (!running) return;
  lastPointerX = event.clientX;
  rubArea.setPointerCapture(event.pointerId);
});

rubArea.addEventListener("pointermove", (event) => {
  if (!running || lastPointerX === null) return;

  const dx = Math.abs(event.clientX - lastPointerX);

  if (dx > 10) {
    const amount = clamp(dx / 34, 0.5, 1.8);
    rub(amount);
    lastPointerX = event.clientX;
  }
});

rubArea.addEventListener("pointerup", () => {
  lastPointerX = null;
});

rubArea.addEventListener("pointercancel", () => {
  lastPointerX = null;
});