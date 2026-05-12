const asset = (p) => new URL(p, import.meta.url).toString();

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const soundButton = document.getElementById("soundButton");

const catchCountEl = document.getElementById("catchCount");
const lineCountEl = document.getElementById("lineCount");
const messageEl = document.getElementById("message");

const pond = document.getElementById("pond");
const crayfish = document.getElementById("crayfish");
const line = document.getElementById("line");
const bait = document.getElementById("bait");

const dropButton = document.getElementById("dropButton");
const pullButton = document.getElementById("pullButton");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");

const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

const state = {
  catches: 0,
  lines: 5,
  failures: 0,
  phase: "title",
  crayX: 50,
  direction: 1,
  speed: 0.26,
  baitX: 50,
  readyAt: 0,
  biteAt: 0,
  biteLimitAt: 0,
  animationId: null,
  timerId: null,
  isMuted: false,
};

function showScreen(screen) {
  titleScreen.style.display = screen === "title" ? "grid" : "none";
  gameScreen.style.display = screen === "game" ? "grid" : "none";
  resultScreen.style.display = screen === "result" ? "grid" : "none";

  titleScreen.setAttribute("aria-hidden", screen !== "title");
  gameScreen.setAttribute("aria-hidden", screen !== "game");
  resultScreen.setAttribute("aria-hidden", screen !== "result");
}

function resetGame() {
  state.catches = 0;
  state.lines = 5;
  state.failures = 0;
  state.phase = "move";
  state.crayX = 50;
  state.direction = Math.random() > 0.5 ? 1 : -1;
  state.speed = 0.24;
  state.baitX = 50;
  clearTimer();

  crayfish.className = "crayfish";
  line.className = "line";
  bait.className = "bait";

  dropButton.disabled = false;
  pullButton.disabled = true;

  updateHud();
  setMessage("ザリガニを狙え");
}

function updateHud() {
  catchCountEl.textContent = state.catches;
  lineCountEl.textContent = state.lines;
}

function setMessage(text, alert = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("alert", alert);
}

function clearTimer() {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
}

function startGame() {
  resetGame();
  showScreen("game");
  playBgm();
  startLoop();
}

function startLoop() {
  cancelAnimationFrame(state.animationId);

  const loop = () => {
    if (state.phase === "move" || state.phase === "baited" || state.phase === "bite") {
      moveCrayfish();
    }

    state.animationId = requestAnimationFrame(loop);
  };

  state.animationId = requestAnimationFrame(loop);
}

function moveCrayfish() {
  const pondWidth = pond.clientWidth;
  const crayWidth = 112;
  const minX = (crayWidth / 2 / pondWidth) * 100 + 2;
  const maxX = 100 - minX - 2;

  state.crayX += state.speed * state.direction;

  if (state.crayX < minX) {
    state.crayX = minX;
    state.direction = 1;
    randomizeSpeed();
  }

  if (state.crayX > maxX) {
    state.crayX = maxX;
    state.direction = -1;
    randomizeSpeed();
  }

  crayfish.style.left = `${state.crayX}%`;
}

function randomizeSpeed() {
  state.speed = 0.18 + Math.random() * 0.22 + state.catches * 0.04;
}

function dropBait() {
  if (state.phase !== "move") return;

  state.phase = "baited";
  state.baitX = 50;

  line.className = "line is-dropped";
  bait.className = "bait is-dropped";

  dropButton.disabled = true;
  pullButton.disabled = false;

  setMessage("食いつくか…？");

  const distance = Math.abs(state.crayX - state.baitX);
  const isNear = distance <= 14;

  if (!isNear) {
    state.timerId = setTimeout(() => {
      failEscape("そこにはいない！");
    }, 620);
    return;
  }

  state.readyAt = performance.now() + 350 + Math.random() * 450;
  state.biteAt = state.readyAt;
  state.biteLimitAt = state.biteAt + 850 - state.catches * 90;

  state.timerId = setTimeout(() => {
    startBite();
  }, state.readyAt - performance.now());
}

function startBite() {
  if (state.phase !== "baited") return;

  state.phase = "bite";
  crayfish.classList.add("is-ready");
  bait.classList.add("is-caught");
  setMessage("！");

  clearTimer();
  state.timerId = setTimeout(() => {
    failCut();
  }, Math.max(420, state.biteLimitAt - performance.now()));
}

function pullLine() {
  if (state.phase !== "baited" && state.phase !== "bite") return;

  const now = performance.now();

  if (state.phase === "baited" || now < state.biteAt + 80) {
    failEscape("早すぎた！");
    return;
  }

  if (now > state.biteLimitAt) {
    failCut();
    return;
  }

  catchCrayfish();
}

function catchCrayfish() {
  state.phase = "caught";
  clearTimer();

  state.catches += 1;
  updateHud();

  crayfish.classList.remove("is-ready");
  crayfish.classList.add("is-caught");

  dropButton.disabled = true;
  pullButton.disabled = true;

  setMessage("釣れた！", true);

  setTimeout(() => {
    if (state.catches >= 3) {
      finishGame(true);
      return;
    }

    nextRound("次のザリガニへ");
  }, 850);
}

function failEscape(text) {
  if (state.phase === "move" || state.phase === "result") return;

  state.phase = "escape";
  state.failures += 1;
  clearTimer();

  crayfish.classList.remove("is-ready");
  crayfish.classList.add("is-escape");
  bait.classList.remove("is-caught");

  dropButton.disabled = true;
  pullButton.disabled = true;

  setMessage(text, true);

  setTimeout(() => {
    nextRound("もう一回狙え");
  }, 780);
}

function failCut() {
  if (state.phase === "move" || state.phase === "result") return;

  state.phase = "cut";
  state.failures += 1;
  state.lines -= 1;
  clearTimer();

  line.classList.add("is-cut");
  bait.classList.remove("is-caught");
  crayfish.classList.remove("is-ready");

  dropButton.disabled = true;
  pullButton.disabled = true;

  updateHud();
  setMessage("チョキン！", true);

  setTimeout(() => {
    if (state.lines <= 0) {
      finishGame(false);
      return;
    }

    nextRound("糸をつけ直した");
  }, 880);
}

function nextRound(text) {
  state.phase = "move";

  line.className = "line";
  bait.className = "bait";
  crayfish.className = "crayfish";

  randomizeSpeed();

  dropButton.disabled = false;
  pullButton.disabled = true;

  setMessage(text);

  setTimeout(() => {
    if (state.phase === "move") {
      setMessage("ザリガニを狙え");
    }
  }, 900);
}

function finishGame(isClear) {
  state.phase = "result";
  cancelAnimationFrame(state.animationId);
  clearTimer();

  const rank = getRank(isClear);

  resultTitle.textContent = rank.title;
  resultText.textContent = rank.text;

  showScreen("result");
}

function getRank(isClear) {
  if (!isClear) {
    return {
      title: "エサだけ配った人",
      text: `釣果は${state.catches}匹。糸を全部チョキンされました。池への貢献度は高いです。`,
    };
  }

  if (state.failures === 0) {
    return {
      title: "池の覇者",
      text: "失敗なしで3匹ゲット。ザリガニ側に語り継がれる恐怖です。",
    };
  }

  if (state.failures <= 2) {
    return {
      title: "ザリガニ名人",
      text: `失敗${state.failures}回で3匹ゲット。ちゃんと釣りとして成立しています。`,
    };
  }

  if (state.failures <= 4) {
    return {
      title: "糸を犠牲にした者",
      text: `失敗${state.failures}回。結果的に釣れたので、池のルールでは勝ちです。`,
    };
  }

  return {
    title: "ほぼエサ係",
    text: `失敗${state.failures}回。でも3匹釣れたので、最終的には勝ちです。`,
  };
}

function playBgm() {
  if (state.isMuted) return;

  bgm.currentTime = 0;
  bgm.play().catch(() => {
    // ブラウザの自動再生制限対策。ユーザー操作後に再試行される。
  });
}

function toggleSound() {
  state.isMuted = !state.isMuted;
  bgm.muted = state.isMuted;
  soundButton.classList.toggle("is-muted", state.isMuted);
  soundButton.textContent = state.isMuted ? "×" : "♪";

  if (!state.isMuted && state.phase !== "title") {
    bgm.play().catch(() => {});
  }
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
dropButton.addEventListener("click", dropBait);
pullButton.addEventListener("click", pullLine);
soundButton.addEventListener("click", toggleSound);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    bgm.pause();
  } else if (!state.isMuted && state.phase !== "title") {
    bgm.play().catch(() => {});
  }
});

showScreen("title");