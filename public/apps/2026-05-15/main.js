const asset = (p) => new URL(p, import.meta.url).toString();

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");

const roundText = document.getElementById("roundText");
const saveText = document.getElementById("saveText");
const message = document.getElementById("message");

const keeper = document.getElementById("keeper");
const kicker = document.getElementById("kicker");
const ball = document.getElementById("ball");
const impact = document.getElementById("impact");
const choiceButtons = [...document.querySelectorAll(".choice-button")];

const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const resultRank = document.getElementById("resultRank");

const MAX_ROUND = 5;

const directionMap = {
  left: {
    label: "左",
    x: "calc(50% - clamp(90px, 24vw, 170px))",
  },
  center: {
    label: "中央",
    x: "50%",
  },
  right: {
    label: "右",
    x: "calc(50% + clamp(90px, 24vw, 170px))",
  },
};

function goalX(offsetPx) {
  return `calc(50% + ${offsetPx}px)`;
}

const ranks = [
  "芝を見ていた人",
  "たまたま当たった守護神",
  "町内会の正GK",
  "開幕戦に呼ばれる男",
  "ほぼ松永成立",
  "伝説の開幕守護神",
];

let round = 1;
let saves = 0;
let phase = "idle";
let currentTarget = "center";
let currentPattern = null;
let selectedDirection = "center";
let bgm = null;
let autoKickTimer = null;
let readyTimer = null;

function createBgm() {
  const audio = new Audio(asset("./assets/bgm.mp3"));
  audio.loop = true;
  audio.volume = 0.35;
  return audio;
}

function playBgm() {
  if (!bgm) bgm = createBgm();
  bgm.play().catch(() => {});
}

function showScreen(screen) {
  titleScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function startGame() {
  clearTimers();

  round = 1;
  saves = 0;
  phase = "idle";
  selectedDirection = "center";

  showScreen(gameScreen);
  playBgm();
  updateHud();
  setButtonsDisabled(true);
  resetKeeper();
  resetBall();

  prepareRound();
}

function updateHud() {
  roundText.textContent = `${round} / ${MAX_ROUND}`;
  saveText.textContent = String(saves);
}

function prepareRound() {
  clearTimers();

  phase = "setting";
  selectedDirection = "center";

  setButtonsDisabled(true);
  resetKeeper();
  resetBall();

  currentTarget = pickTarget();
  currentPattern = createShotPattern(currentTarget, round);

  const settingMessages = [
    "1本目。ボールをセット中…",
    "2本目。少し怪しい空気…",
    "3本目。キッカーがニヤついている…",
    "4本目。軌道が信じられない予感…",
    "5本目。国立がざわついている…",
  ];

  message.textContent = settingMessages[round - 1];

  readyTimer = window.setTimeout(() => {
    phase = "ready";
    message.textContent = "キックに備えろ！ 左・中央・右を選べ";
    setButtonsDisabled(false);

    autoKickTimer = window.setTimeout(() => {
      if (phase === "ready") {
        chooseDirection("center", true);
      }
    }, 1800);
  }, 900);
}

function pickTarget() {
  const keys = ["left", "center", "right"];
  return keys[Math.floor(Math.random() * keys.length)];
}

function createShotPattern(target, currentRound) {
  const targetX = directionMap[target].x;

  const easyFake = {
    left: [goalX(-60), goalX(-120), directionMap.left.x],
    center: [goalX(18), goalX(-20), directionMap.center.x],
    right: [goalX(60), goalX(120), directionMap.right.x],
  };

  const wildFake = {
    left: [
      [goalX(110), goalX(-130), goalX(80)],
      [goalX(20), goalX(140), goalX(-150)],
      [goalX(-70), goalX(130), goalX(-120)],
    ],
    center: [
      [goalX(-130), goalX(130), goalX(-40)],
      [goalX(130), goalX(-130), goalX(45)],
      [goalX(-60), goalX(70), goalX(-20)],
    ],
    right: [
      [goalX(-110), goalX(130), goalX(-80)],
      [goalX(-20), goalX(-140), goalX(150)],
      [goalX(70), goalX(-130), goalX(120)],
    ],
  };

  let fakePoints;

  if (currentRound === 1) {
    fakePoints = easyFake[target];
  } else if (currentRound === 2) {
    fakePoints = perturbGoalX(easyFake[target], 24);
  } else {
    const list = wildFake[target];
    fakePoints = list[Math.floor(Math.random() * list.length)];
  }

  if (currentRound >= 4) {
    fakePoints = perturbGoalX(fakePoints, 30);
  }

  return {
    fake1: fakePoints[0],
    fake2: fakePoints[1],
    fake3: fakePoints[2],
    targetX,
    targetY: currentRound >= 5 ? "322px" : "310px",
    duration: Math.max(760, 1250 - currentRound * 85),
  };
}

function perturbGoalX(points, amount) {
  return points.map((p) => {
    if (!p.includes("px")) return p;

    const match = p.match(/calc\(50% \+ (-?\d+)px\)/);
    if (!match) return p;

    const base = Number(match[1]);
    const diff = Math.floor(Math.random() * amount * 2) - amount;
    const value = clamp(base + diff, -170, 170);

    return goalX(value);
  });
}

function chooseDirection(direction, isAuto = false) {
  if (phase !== "ready") return;

  clearTimers();

  phase = "shooting";
  selectedDirection = direction;

  setButtonsDisabled(true);

  keeper.classList.remove("diving-left", "diving-center", "diving-right");
  keeper.classList.add(`diving-${direction}`);

  if (isAuto) {
    message.textContent = "反応できず中央に構えた！";
  } else {
    message.textContent = `${directionMap[direction].label}に飛んだ！`;
  }

  window.setTimeout(() => {
    shootBall();
  }, 140);
}

function shootBall() {
  kicker.classList.add("kick-motion");

  ball.style.setProperty("--fake1", currentPattern.fake1);
  ball.style.setProperty("--fake2", currentPattern.fake2);
  ball.style.setProperty("--fake3", currentPattern.fake3);
  ball.style.setProperty("--target-x", currentPattern.targetX);
  ball.style.setProperty("--target-y", currentPattern.targetY);
  ball.style.animationDuration = `${currentPattern.duration}ms`;

  ball.classList.add("shot");

  window.setTimeout(() => {
    finishRound();
  }, currentPattern.duration + 60);
}

function finishRound() {
  if (phase !== "shooting") return;

  const saved = selectedDirection === currentTarget;

  showImpact(saved);

  if (saved) {
    saves += 1;
    message.textContent = "バシッ！セーブ！";
    flashField("save");
  } else {
    message.textContent = `決められた。正解は${directionMap[currentTarget].label}。`;
    flashField("goal");
  }

  updateHud();
  phase = "result";

  window.setTimeout(() => {
    round += 1;

    if (round > MAX_ROUND) {
      showResult();
    } else {
      updateHud();
      prepareRound();
    }
  }, 1150);
}

function showImpact(saved) {
  const x = currentTarget === "left" ? 25 : currentTarget === "right" ? 75 : 50;
  const y = saved ? 255 : 170;

  impact.style.left = `${x}%`;
  impact.style.top = `${y}px`;
  impact.classList.remove("hidden");
  impact.classList.remove("show");

  requestAnimationFrame(() => {
    impact.classList.add("show");
  });

  window.setTimeout(() => {
    impact.classList.add("hidden");
    impact.classList.remove("show");
  }, 460);
}

function flashField(type) {
  const color = type === "save"
    ? "rgba(255, 233, 72, 0.45)"
    : "rgba(255, 72, 72, 0.38)";

  document.body.style.background = color;

  window.setTimeout(() => {
    document.body.style.background = "#07101f";
  }, 120);
}

function showResult() {
  clearTimers();

  phase = "ended";
  showScreen(resultScreen);

  resultTitle.textContent = saves >= 3 ? "試合終了！" : "試合終了";
  resultScore.textContent = `${saves} / ${MAX_ROUND} SAVE`;
  resultRank.textContent = ranks[saves];
}

function resetBall() {
  ball.classList.remove("shot");
  ball.classList.add("resetting");

  ball.style.animationDuration = "";
  ball.style.removeProperty("--fake1");
  ball.style.removeProperty("--fake2");
  ball.style.removeProperty("--fake3");
  ball.style.removeProperty("--target-x");
  ball.style.removeProperty("--target-y");

  void ball.offsetWidth;

  ball.classList.remove("resetting");
  kicker.classList.remove("kick-motion");
}

function resetKeeper() {
  keeper.classList.remove("diving-left", "diving-center", "diving-right");
  keeper.classList.add("diving-center");
}

function setButtonsDisabled(disabled) {
  choiceButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function clearTimers() {
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }

  if (autoKickTimer) {
    clearTimeout(autoKickTimer);
    autoKickTimer = null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chooseDirection(button.dataset.dir);
  });
});

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);

document.addEventListener("dblclick", (event) => {
  event.preventDefault();
}, { passive: false });