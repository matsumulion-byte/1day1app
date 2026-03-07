const APP_BASE = typeof location !== "undefined" && location.pathname
  ? location.pathname.endsWith("/")
    ? location.pathname
    : location.pathname.endsWith(".html")
      ? location.pathname.replace(/[^/]+$/, "")
      : `${location.pathname.replace(/\/*$/, "")}/`
  : "";
const asset = (p) =>
  typeof location !== "undefined"
    ? new URL(String(p).replace(/^\.?\//, ""), `${location.origin}${APP_BASE}`).toString()
    : new URL(p, import.meta.url).toString();

const ASSETS = {
  normal: asset("./assets/sauna-normal.png"),
  limit: asset("./assets/sauna-limit.png"),
  over: asset("./assets/sauna-over.png"),
  cool: asset("./assets/sauna-cool.png"),
};

const imageEl = document.getElementById("matsumuraImage");
const imageWrapEl = document.getElementById("imageWrap");
const gaugeFillEl = document.getElementById("gaugeFill");
const gaugeTextEl = document.getElementById("gaugeText");
const phaseBadgeEl = document.getElementById("phaseBadge");
const scoreValueEl = document.getElementById("scoreValue");
const messageEl = document.getElementById("message");
const resultBurstEl = document.getElementById("resultBurst");
const startButtonEl = document.getElementById("startButton");
const diveButtonEl = document.getElementById("diveButton");

const STATE = {
  playing: false,
  ended: false,
  gauge: 0,
  score: 0,
  frameId: 0,
  lastTime: 0,
};

function resetVisualState() {
  document.body.classList.remove("success", "fail", "shake");
  imageWrapEl.classList.remove("is-danger", "is-over", "is-cool");
  resultBurstEl.classList.remove("show");
  resultBurstEl.textContent = "";
}

function updateGaugeUI() {
  const gauge = Math.max(0, Math.min(STATE.gauge, 100));
  gaugeFillEl.style.width = `${gauge}%`;
  gaugeTextEl.textContent = `${Math.round(gauge)} / 100`;

  if (gauge >= 92) {
    phaseBadgeEl.textContent = "危険";
  } else if (gauge >= 80) {
    phaseBadgeEl.textContent = "限界手前";
  } else if (gauge >= 60) {
    phaseBadgeEl.textContent = "いい汗";
  } else {
    phaseBadgeEl.textContent = "平常";
  }

  if (gauge >= 75 && STATE.playing) {
    imageWrapEl.classList.add("is-danger");
    imageEl.src = ASSETS.limit;
  } else if (STATE.playing) {
    imageWrapEl.classList.remove("is-danger");
    imageEl.src = ASSETS.normal;
  }
}

function setMessage(text) {
  messageEl.textContent = text;
}

function setScore(value) {
  STATE.score = value;
  scoreValueEl.textContent = String(value);
}

function showBurst(text) {
  resultBurstEl.textContent = text;
  resultBurstEl.classList.remove("show");
  void resultBurstEl.offsetWidth;
  resultBurstEl.classList.add("show");
}

function stopLoop() {
  if (STATE.frameId) {
    cancelAnimationFrame(STATE.frameId);
    STATE.frameId = 0;
  }
}

function finishGame({ resultText, messageText, score, mode, image }) {
  STATE.playing = false;
  STATE.ended = true;
  stopLoop();

  setScore(score);
  setMessage(messageText);
  showBurst(resultText);

  imageEl.src = image;
  startButtonEl.disabled = false;
  diveButtonEl.disabled = true;

  imageWrapEl.classList.remove("is-danger");

  if (mode === "success") {
    document.body.classList.add("success");
    imageWrapEl.classList.add("is-cool");
  } else if (mode === "fail") {
    document.body.classList.add("fail", "shake");
    imageWrapEl.classList.add("is-over");
    window.setTimeout(() => {
      document.body.classList.remove("shake");
    }, 320);
  }
}

function judgeDive() {
  const g = STATE.gauge;

  if (g < 60) {
    finishGame({
      resultText: "ぬるい！",
      messageText: "早すぎる。まだ松村は余裕だった。",
      score: 20,
      mode: "normal",
      image: ASSETS.normal,
    });
    return;
  }

  if (g < 80) {
    finishGame({
      resultText: "まあまあ",
      messageText: "悪くない。ただ、もう少し攻められた。",
      score: 60,
      mode: "normal",
      image: ASSETS.limit,
    });
    return;
  }

  if (g < 92) {
    finishGame({
      resultText: "ととのったー！",
      messageText: "完璧。水風呂まで決まり、松村は静かにととのった。",
      score: 100,
      mode: "success",
      image: ASSETS.cool,
    });
    return;
  }

  finishGame({
    resultText: "のぼせた！",
    messageText: "遅い。松村はサウナに敗北した。",
    score: 0,
    mode: "fail",
    image: ASSETS.over,
  });
}

function updateFrame(timestamp) {
  if (!STATE.playing) return;

  if (!STATE.lastTime) {
    STATE.lastTime = timestamp;
  }

  const delta = (timestamp - STATE.lastTime) / 1000;
  STATE.lastTime = timestamp;

  const speed =
    STATE.gauge < 40
      ? 16
      : STATE.gauge < 70
        ? 21
        : STATE.gauge < 85
          ? 28
          : 36;

  const randomBoost = Math.random() * 4.5;
  STATE.gauge += (speed + randomBoost) * delta;

  if (STATE.gauge >= 100) {
    STATE.gauge = 100;
    updateGaugeUI();

    finishGame({
      resultText: "ゲームオーバー",
      messageText: "限界を超えた。完全にのぼせた。",
      score: 0,
      mode: "fail",
      image: ASSETS.over,
    });
    return;
  }

  updateGaugeUI();

  if (STATE.gauge >= 92) {
    setMessage("危険。もう押すか、散るか。");
  } else if (STATE.gauge >= 80) {
    setMessage("今がうまい。かなりうまい。");
  } else if (STATE.gauge >= 60) {
    setMessage("だいぶ熱い。まだ耐えられる。");
  } else {
    setMessage("ちょうどいいところで「水風呂へ」を押せ。");
  }

  STATE.frameId = requestAnimationFrame(updateFrame);
}

function startGame() {
  resetVisualState();

  STATE.playing = true;
  STATE.ended = false;
  STATE.gauge = 0;
  STATE.lastTime = 0;

  imageEl.src = ASSETS.normal;
  setScore(0);
  updateGaugeUI();
  setMessage("ちょうどいいところで「水風呂へ」を押せ。");

  startButtonEl.disabled = true;
  diveButtonEl.disabled = false;

  stopLoop();
  STATE.frameId = requestAnimationFrame(updateFrame);
}

startButtonEl.addEventListener("click", startGame);
diveButtonEl.addEventListener("click", () => {
  if (!STATE.playing) return;
  judgeDive();
});

imageEl.src = ASSETS.normal;
updateGaugeUI();