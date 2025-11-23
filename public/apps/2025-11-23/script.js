// Vercel用のパス解決
const DATE_SEGMENT = (location.pathname.match(/\d{4}-\d{2}-\d{2}/) || [""])[0];
const DATE_BASE = DATE_SEGMENT ? `/${DATE_SEGMENT}/` : '/';
const asset = (p) => {
  const clean = String(p || '').replace(/^\.?\//, '');
  return `${DATE_BASE}${clean}`;
};

const ASSETS = {
    good: asset("./assets/normal.png"),
    bad: asset("./assets/defect.png"),
    bgm: asset("./assets/bgm.m4a"),
  };
  
  // BGM
  const bgm = new Audio(ASSETS.bgm);
  bgm.loop = true;
  bgm.volume = 0.6; // 好みで調整
  

// DOM取得
const screenStart = document.getElementById("screen-start");
const screenGame = document.getElementById("screen-game");
const screenResult = document.getElementById("screen-result");

const btnStart = document.getElementById("btn-start");
const btnRetry = document.getElementById("btn-retry");

const conveyor = document.getElementById("conveyor");

const timeRemainingEl = document.getElementById("time-remaining");
const countCorrectEl = document.getElementById("count-correct");
const countWrongEl = document.getElementById("count-wrong");

const resultTotalEl = document.getElementById("result-total");
const resultOkEl = document.getElementById("result-ok");
const resultNgEl = document.getElementById("result-ng");
const resultAccuracyEl = document.getElementById("result-accuracy");
const resultCommentEl = document.getElementById("result-comment");

// ゲーム状態
const GAME_DURATION = 30_000; // ms
let timerId = null;
let spawnId = null;
let gameStartTime = null;
let gameRunning = false;

let correctCount = 0;
let wrongCount = 0;

// 画面切り替え
function showScreen(target) {
  [screenStart, screenGame, screenResult].forEach((s) => {
    s.classList.remove("active");
  });
  target.classList.add("active");
}

// リセット
function resetGameState() {
  correctCount = 0;
  wrongCount = 0;
  updateScoreUI();
  timeRemainingEl.textContent = (GAME_DURATION / 1000).toFixed(1);
  conveyor.innerHTML = "";
}

// ゲーム開始
function startGame() {
    resetGameState();
    showScreen(screenGame);
    gameRunning = true;
    gameStartTime = performance.now();
  
    // BGM 再生（ボタンタップ後なので iOS でもOKなはず）
    try {
      bgm.currentTime = 0;
      bgm.play();
    } catch (e) {
      // もし失敗しても無視
    }
  
    timerId = requestAnimationFrame(updateTimer);
    spawnId = spawnLoop();
  }
  

// タイマー更新
function updateTimer(now) {
  if (!gameRunning) return;

  const elapsed = now - gameStartTime;
  const remaining = Math.max(GAME_DURATION - elapsed, 0);
  timeRemainingEl.textContent = (remaining / 1000).toFixed(1);

  if (remaining <= 0) {
    endGame();
  } else {
    timerId = requestAnimationFrame(updateTimer);
  }
}

// 松村をランダムに流し続ける
// 松村をランダムに流し続ける（同時2体まで）
function spawnLoop() {
    if (!gameRunning) return null;
  
    // 画面内のアイテムが2体未満のときだけ追加
    if (conveyor.children.length < 2) {
      spawnItem();
    }
  
    const nextDelay = 1000 + Math.random() * 700; // 1.0〜1.7秒おき
    return setTimeout(() => {
      spawnId = spawnLoop();
    }, nextDelay);
  }
  

// 松村1体生成
function spawnItem() {
  const el = document.createElement("div");
  const isGood = Math.random() < 0.65; // 良品の確率
  el.className = "item " + (isGood ? "good" : "bad");
  el.dataset.type = isGood ? "good" : "bad";

  // 松村画像（まだ無ければ背景色だけでもOK）
  el.style.backgroundImage = `url("${
    isGood ? ASSETS.good : ASSETS.bad
  }")`;


  // スワイプ判定用
  attachSwipeHandler(el);

  // 流れ切ったらミス扱い
  el._resolved = false;
  el.addEventListener("animationend", () => {
    if (!el._resolved && gameRunning) {
      markWrong(el, "miss");
    }
    el.remove();
  });

  conveyor.appendChild(el);
}

// スワイプ処理
function attachSwipeHandler(el) {
  let startX = null;
  let startY = null;
  const threshold = 30; // px

  const onPointerDown = (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e) => {
    if (!gameRunning) return;
    if (startX == null) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    startX = null;
    startY = null;

    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < threshold) return;

    const dir = dx > 0 ? "right" : "left";
    handleSwipe(el, dir);
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
}

// スワイプ結果の判定
function handleSwipe(el, dir) {
  if (el._resolved || !gameRunning) return;
  el._resolved = true;

  const type = el.dataset.type; // "good" or "bad"

  const isCorrect =
    (type === "good" && dir === "right") ||
    (type === "bad" && dir === "left");

  if (isCorrect) {
    correctCount++;
    animateFly(el, dir);
  } else {
    markWrong(el, "swipe", dir);
  }

  updateScoreUI();
}

// 正解アニメーション
function animateFly(el, dir) {
  el.classList.add(dir === "right" ? "fly-right" : "fly-left");
  setTimeout(() => {
    el.remove();
  }, 230);
}

// ミス処理
function markWrong(el, reason, dir) {
  wrongCount++;

  if (reason === "swipe" && dir) {
    el.classList.add(dir === "right" ? "fly-right" : "fly-left", "missed");
    setTimeout(() => el.remove(), 230);
  } else {
    el.classList.add("missed");
    setTimeout(() => el.remove(), 260);
  }

  updateScoreUI();
}

// スコアUI更新
function updateScoreUI() {
  countCorrectEl.textContent = String(correctCount);
  countWrongEl.textContent = String(wrongCount);
}

// ゲーム終了
function endGame() {
    if (!gameRunning) return;
    gameRunning = false;
  
    // BGM 停止
    bgm.pause();
  
  if (timerId) {
    cancelAnimationFrame(timerId);
    timerId = null;
  }
  if (spawnId) {
    clearTimeout(spawnId);
    spawnId = null;
  }

  const total = correctCount + wrongCount;
  const acc = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  resultTotalEl.textContent = String(total);
  resultOkEl.textContent = String(correctCount);
  resultNgEl.textContent = String(wrongCount);
  resultAccuracyEl.textContent = `${acc}%`;

  let comment = "";
  if (total === 0) {
    comment = "今日は…働いたことにしておきましょう。";
  } else if (acc >= 90 && total >= 20) {
    comment = "伝説のライン作業員レベルです。お疲れさまです。";
  } else if (acc >= 70) {
    comment = "かなり優秀な松村検品係。明日もお願いします。";
  } else if (acc >= 40) {
    comment = "まぁ…人手不足なので助かってます。";
  } else {
    comment = "とりあえず今日来てくれたのでOKです。";
  }
  resultCommentEl.textContent = comment;

  setTimeout(() => {
    showScreen(screenResult);
  }, 600);
}

// イベント
btnStart.addEventListener("click", () => {
  startGame();
});

btnRetry.addEventListener("click", () => {
  showScreen(screenStart);
});

// 右クリック無効
window.addEventListener("contextmenu", (e) => e.preventDefault());
