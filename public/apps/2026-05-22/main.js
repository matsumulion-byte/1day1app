const ASSET_BASE = "/apps/2026-05-22";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const GOAL_DISTANCE = 320;
const MAX_SPEED = 24;
const BASE_DECAY = 0.985;
const SAME_PEDAL_PENALTY = 0.52;

const timeEl = document.getElementById("time");
const speedEl = document.getElementById("speed");
const distanceEl = document.getElementById("distance");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const rider = document.getElementById("rider");
const riderImage = document.getElementById("riderImage");
const roadLines = document.getElementById("roadLines");
const goalLine = document.getElementById("goalLine");
const countdownEl = document.getElementById("countdown");
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultTime = document.getElementById("resultTime");
const resultText = document.getElementById("resultText");
const retryBtn = document.getElementById("retryBtn");

let state = "ready";
let distance = 0;
let speed = 0;
let lastPedal = null;
let startTime = 0;
let elapsed = 0;
let rafId = null;
let roadOffset = 0;
let lastFrameTime = 0;
let lastInputTime = 0;
let combo = 0;
let countdownTimers = [];

riderImage.src = asset("./assets/cyclist.png");

function setMessage(text) {
  messageEl.innerHTML = `<p>${text}</p>`;
}

function clearCountdownTimers() {
  countdownTimers.forEach((timer) => clearTimeout(timer));
  countdownTimers = [];
}

function showCountdownText(text) {
  countdownEl.textContent = text;
  countdownEl.classList.remove("show");
  void countdownEl.offsetWidth;
  countdownEl.classList.add("show");
}

function hideCountdown() {
  countdownEl.classList.remove("show");
  countdownEl.textContent = "";
}

function resetRiderState() {
  rider.classList.remove("running", "leftKick", "rightKick", "miss");
}

function resetGame() {
  clearCountdownTimers();
  cancelAnimationFrame(rafId);

  state = "ready";
  distance = 0;
  speed = 0;
  lastPedal = null;
  elapsed = 0;
  roadOffset = 0;
  lastFrameTime = 0;
  lastInputTime = 0;
  combo = 0;

  timeEl.textContent = "0.00";
  speedEl.textContent = "0";
  distanceEl.textContent = "0";
  roadLines.style.backgroundPosition = "50% 0px";
  goalLine.style.opacity = "0";
  hideCountdown();
  resetRiderState();

  startBtn.disabled = false;
  startBtn.textContent = "START";

  leftBtn.disabled = false;
  rightBtn.disabled = false;

  setMessage("STARTを押したらカウントダウン。GOで交互に踏み始めます。");
}

function beginCountdown() {
  resetGame();

  state = "countdown";
  startBtn.disabled = true;
  startBtn.textContent = "READY";
  setMessage("位置について。まだ踏まない。");

  const sequence = [
    { text: "3", delay: 0 },
    { text: "2", delay: 760 },
    { text: "1", delay: 1520 },
    { text: "GO", delay: 2280 },
  ];

  sequence.forEach((item) => {
    const timer = setTimeout(() => {
      showCountdownText(item.text);
      if (item.text === "GO") {
        setMessage("左、右、左、右。リズムよく踏め！");
      }
    }, item.delay);

    countdownTimers.push(timer);
  });

  const startTimer = setTimeout(() => {
    hideCountdown();
    startGame();
  }, 2960);

  countdownTimers.push(startTimer);
}

function startGame() {
  state = "playing";
  speed = 0;
  distance = 0;
  lastPedal = null;
  combo = 0;
  startTime = performance.now();
  lastFrameTime = startTime;
  lastInputTime = startTime;

  startBtn.textContent = "RUNNING";

  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function loop(now) {
  if (state !== "playing") return;

  const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  elapsed = (now - startTime) / 1000;

  const idleTime = now - lastInputTime;
  const idleDecay = idleTime > 500 ? 0.965 : BASE_DECAY;

  speed *= idleDecay;
  if (speed < 0.04) speed = 0;

  distance += speed * dt * 4.4;
  if (distance > GOAL_DISTANCE) distance = GOAL_DISTANCE;

  roadOffset += speed * dt * 18;
  roadLines.style.backgroundPosition = `50% ${roadOffset}px`;

  const goalVisibility = Math.max(
    0,
    (distance - GOAL_DISTANCE * 0.74) / (GOAL_DISTANCE * 0.18)
  );
  goalLine.style.opacity = String(Math.min(goalVisibility, 1));

  timeEl.textContent = elapsed.toFixed(2);
  speedEl.textContent = String(Math.round(speed * 10));
  distanceEl.textContent = String(Math.floor(distance));

  if (speed > 1.5) {
    rider.classList.add("running");
  } else {
    rider.classList.remove("running");
  }

  if (distance >= GOAL_DISTANCE) {
    finishGame();
    return;
  }

  rafId = requestAnimationFrame(loop);
}

function kickRider(side) {
  rider.classList.remove("leftKick", "rightKick");

  if (side === "left") {
    rider.classList.add("leftKick");
  } else {
    rider.classList.add("rightKick");
  }

  window.setTimeout(() => {
    rider.classList.remove("leftKick", "rightKick");
  }, 100);
}

function pressPedal(side) {
  if (state === "ready") {
    beginCountdown();
    return;
  }

  if (state === "countdown") {
    setMessage("まだ。GOが出てから踏んでください。");
    return;
  }

  if (state !== "playing") return;

  const now = performance.now();
  const isCorrect = lastPedal === null || lastPedal !== side;

  if (isCorrect) {
    combo += 1;

    const rhythmGap = now - lastInputTime;
    let rhythmBonus = 1;

    if (rhythmGap > 90 && rhythmGap < 260) {
      rhythmBonus = 1.26;
    } else if (rhythmGap >= 260 && rhythmGap < 430) {
      rhythmBonus = 1.08;
    } else if (rhythmGap <= 90) {
      rhythmBonus = 0.72;
    }

    const comboBonus = Math.min(combo * 0.035, 0.45);
    speed += (1.85 + comboBonus) * rhythmBonus;
    speed = Math.min(speed, MAX_SPEED);

    if (combo >= 14) {
      setMessage("回転数が上がってきた。松村、ちょっと速い。");
    } else if (combo >= 8) {
      setMessage("いいリズム。ペダルが回っています。");
    } else {
      setMessage("ナイスペダル。交互に踏めています。");
    }

    kickRider(side);
  } else {
    combo = 0;
    speed *= SAME_PEDAL_PENALTY;

    rider.classList.remove("miss");
    void rider.offsetWidth;
    rider.classList.add("miss");

    setMessage("同じ足を踏みすぎ。フォームが少し崩れました。");
  }

  lastPedal = side;
  lastInputTime = now;
  flashButton(side);
}

function flashButton(side) {
  const button = side === "left" ? leftBtn : rightBtn;
  button.classList.add("pressed");

  window.setTimeout(() => {
    button.classList.remove("pressed");
  }, 90);
}

function finishGame() {
  state = "finished";
  cancelAnimationFrame(rafId);

  rider.classList.remove("running");
  startBtn.disabled = false;
  startBtn.textContent = "FINISH";

  const result = getResult(elapsed);
  resultTitle.textContent = result.title;
  resultTime.textContent = `${elapsed.toFixed(2)}秒`;
  resultText.textContent = result.text;

  resultModal.classList.add("show");
  resultModal.setAttribute("aria-hidden", "false");
}

function getResult(sec) {
  if (sec <= 11) {
    return {
      title: "ほぼ競輪選手",
      text: "サイクリングの日のテンションではない。背中から本気が伝わります。"
    };
  }

  if (sec <= 15) {
    return {
      title: "ツール・ド・マツムラ完走",
      text: "無駄のないペダリング。かなり良い走りでした。"
    };
  }

  if (sec <= 21) {
    return {
      title: "いい運動",
      text: "ちょうど健康に良いペース。気持ちよく完走です。"
    };
  }

  if (sec <= 30) {
    return {
      title: "降りて押した方が早い",
      text: "気持ちは走っている。ただ、途中からやや生活道路の速度でした。"
    };
  }

  return {
    title: "ママチャリ遭難",
    text: "ゴールはした。したけど、最後はほぼ根性で走り切りました。"
  };
}

function preventZoomGestures() {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
}

leftBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  pressPedal("left");
});

rightBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  pressPedal("right");
});

startBtn.addEventListener("click", () => {
  if (state === "playing" || state === "countdown") return;

  resultModal.classList.remove("show");
  resultModal.setAttribute("aria-hidden", "true");
  beginCountdown();
});

retryBtn.addEventListener("click", () => {
  resultModal.classList.remove("show");
  resultModal.setAttribute("aria-hidden", "true");
  beginCountdown();
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    pressPedal("left");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    pressPedal("right");
  }

  if (event.key === " " || event.key === "Enter") {
    if (state !== "playing" && state !== "countdown") {
      event.preventDefault();
      resultModal.classList.remove("show");
      resultModal.setAttribute("aria-hidden", "true");
      beginCountdown();
    }
  }
});

preventZoomGestures();
resetGame();
