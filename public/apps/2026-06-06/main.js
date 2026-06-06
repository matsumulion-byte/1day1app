const pond = document.getElementById("pond");
const frog = document.getElementById("frog");
const dangerLayer = document.getElementById("dangerLayer");
const messageEl = document.getElementById("message");
const timeLeftEl = document.getElementById("timeLeft");
const frogCountEl = document.getElementById("leafLeft");
const scoreEl = document.getElementById("jumpCount");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const resultPanel = document.getElementById("resultPanel");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");

const START = { x: 12, y: 82 };
const GOAL = { x: 86, y: 17 };
const MAX_JUMP = 30;
const TIME_LIMIT = 66;
const TARGET_FROGS = 6;
const MAX_LIVES = 3;

let active = false;
let finished = false;
let startedAt = 0;
let lastFrameAt = 0;
let animationId = 0;
let frogPos = { ...START };
let frogLeaf = null;
let frogsHome = 0;
let lives = MAX_LIVES;
let score = 0;
let combo = 0;
let stunnedUntil = 0;
let respawning = false;
let leafSerial = 0;
let leaves = [];
let drops = [];
let nextDropAt = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function setMessage(text) {
  messageEl.textContent = text;
}

function setFrogPosition(pos) {
  frogPos = { x: clamp(pos.x, 6, 94), y: clamp(pos.y, 8, 92) };
  frog.style.left = `${frogPos.x}%`;
  frog.style.top = `${frogPos.y}%`;
}

function updateHud() {
  const elapsed = active ? (performance.now() - startedAt) / 1000 : 0;
  const left = finished ? 0 : active ? clamp(Math.ceil(TIME_LIMIT - elapsed), 0, TIME_LIMIT) : TIME_LIMIT;
  timeLeftEl.textContent = String(left);
  frogCountEl.textContent = `${frogsHome}/${TARGET_FROGS}  ${"♥".repeat(lives)}`;
  scoreEl.textContent = String(score);
}

function clearObjects() {
  leaves.forEach((leaf) => leaf.el.remove());
  drops.forEach((drop) => drop.el.remove());
  leaves = [];
  drops = [];
  dangerLayer.innerHTML = "";
}

function showResult(title, text) {
  resultTitleEl.textContent = title;
  resultTextEl.textContent = text;
  resultPanel.classList.remove("hidden");
}

function hideResult() {
  resultPanel.classList.add("hidden");
}

function createLeaf(pos) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "leaf";
  el.setAttribute("aria-label", "流れる葉っぱ");
  pond.appendChild(el);

  const leaf = {
    id: leafSerial,
    x: pos.x,
    y: pos.y,
    vx: -2.2 - Math.random() * 1.2,
    vy: 0.9 + Math.random() * 0.55,
    angle: (leafSerial * 37) % 80 - 40,
    el,
  };
  leafSerial += 1;
  leaves.push(leaf);
  positionLeaf(leaf);
  return leaf;
}

function positionLeaf(leaf) {
  leaf.el.style.left = `${leaf.x}%`;
  leaf.el.style.top = `${leaf.y}%`;
  leaf.el.style.transform = `translate(-50%, -50%) rotate(${leaf.angle}deg)`;
}

function createDrop(now) {
  const el = document.createElement("span");
  el.className = "drop";
  dangerLayer.appendChild(el);

  const drop = {
    x: 12 + Math.random() * 76,
    y: -8,
    speed: 24 + Math.random() * 12,
    el,
  };
  drops.push(drop);
  positionDrop(drop);
  nextDropAt = now + 650 + Math.random() * 500;
}

function positionDrop(drop) {
  drop.el.style.left = `${drop.x}%`;
  drop.el.style.top = `${drop.y}%`;
}

function markReachableLeaves() {
  leaves.forEach((leaf) => {
    const reachable = distance(frogPos, leaf) <= MAX_JUMP;
    leaf.el.classList.toggle("is-reachable", reachable && active && !finished);
  });
}

function setStunned(now) {
  stunnedUntil = now + 850;
  combo = 0;
  frog.classList.add("is-stunned");
  setMessage("雨粒に当たった。少しだけ動けません。");
  setTimeout(() => frog.classList.remove("is-stunned"), 850);
}

function loseLife(reason) {
  if (!active || finished) return;

  lives -= 1;
  combo = 0;
  frogLeaf = null;
  setFrogPosition(START);
  frog.classList.remove("jumping");
  void frog.offsetWidth;
  frog.classList.add("splash");
  setTimeout(() => frog.classList.remove("splash"), 420);

  if (lives <= 0) {
    endGame(false, "池に飲まれました", "葉っぱの流れを読み切れませんでした。次は早めの足場づくりです。");
    return;
  }

  setMessage(`${reason} ライフ残り${lives}。次のかえるを急がせましょう。`);
  updateHud();
}

function jumpTo(target) {
  if (!active || finished) return;
  if (respawning) return;
  const now = performance.now();
  if (now < stunnedUntil) return;

  const jumpDistance = distance(frogPos, target);
  if (jumpDistance > MAX_JUMP) {
    setMessage("遠すぎます。流れて近づくのを待つか、手前に置いてください。");
    return;
  }

  combo += 1;
  const bonus = Math.round(Math.max(0, jumpDistance - 12) * 2 + combo * 8);
  score += 20 + bonus;
  frogLeaf = target.id === "goal" ? null : target;
  frog.classList.remove("jumping");
  void frog.offsetWidth;
  frog.classList.add("jumping");
  setFrogPosition(target);

  if (target.id === "goal") {
    respawning = true;
    score += 120 + combo * 20 + lives * 30;
    frogsHome += 1;
    combo = 0;
    updateHud();

    if (frogsHome >= TARGET_FROGS) {
      endGame(true);
      return;
    }

    setMessage(`${frogsHome}匹目が帰宅。次のかえる、出発です。`);
    setTimeout(() => {
      frogLeaf = null;
      respawning = false;
      setFrogPosition(START);
      markReachableLeaves();
    }, 360);
    return;
  }

  setMessage(`ケロコンボ ${combo}。葉っぱは流れます、次を急いで。`);
  updateHud();
  markReachableLeaves();
}

function tryJumpToLeaf(leaf) {
  if (!active || finished) return;
  if (performance.now() < stunnedUntil) return;
  if (distance(frogPos, leaf) <= MAX_JUMP) {
    jumpTo(leaf);
  } else {
    setMessage("置いた葉っぱはまだ遠いです。流れを待つか、手前にもう一枚。");
  }
}

function placeLeaf(pos) {
  if (!active || finished) return;
  if (respawning) return;

  const now = performance.now();
  if (now < stunnedUntil) {
    setMessage("今は雨粒でふらついています。少し待ってください。");
    return;
  }

  if (distance(pos, GOAL) < 7) {
    if (distance(frogPos, GOAL) <= MAX_JUMP) {
      jumpTo({ ...GOAL, id: "goal" });
    } else {
      setMessage("おうちは見えています。届く位置まで葉っぱで近づきましょう。");
    }
    return;
  }

  const leaf = createLeaf(pos);
  tryJumpToLeaf(leaf);
  markReachableLeaves();
}

function updateObjects(dt, now) {
  if (now >= nextDropAt) createDrop(now);

  leaves.forEach((leaf) => {
    leaf.x += leaf.vx * dt;
    leaf.y += leaf.vy * dt;
    leaf.angle += 10 * dt;
    positionLeaf(leaf);
  });

  drops.forEach((drop) => {
    drop.y += drop.speed * dt;
    positionDrop(drop);
  });

  if (frogLeaf) {
    const riding = leaves.find((leaf) => leaf.id === frogLeaf.id);
    if (riding) {
      setFrogPosition(riding);
    }
  }

  drops.forEach((drop) => {
    if (distance(drop, frogPos) < 8 && now > stunnedUntil) {
      drop.y = 110;
      setStunned(now);
    }
  });

  leaves = leaves.filter((leaf) => {
    const alive = leaf.x > -12 && leaf.y < 112;
    if (!alive) {
      if (frogLeaf?.id === leaf.id) {
        leaf.el.remove();
        loseLife("乗っていた葉っぱが流されました。");
      } else {
        leaf.el.remove();
      }
    }
    return alive;
  });

  drops = drops.filter((drop) => {
    const alive = drop.y < 112;
    if (!alive) drop.el.remove();
    return alive;
  });

  if (!respawning && distance(frogPos, GOAL) <= 12) {
    jumpTo({ ...GOAL, id: "goal" });
  }

  markReachableLeaves();
}

function endGame(won, title, text) {
  if (finished) return;

  finished = true;
  active = false;
  window.cancelAnimationFrame(animationId);
  startBtn.disabled = false;
  startBtn.textContent = "もう一回";
  updateHud();

  if (won) {
    if (lives === MAX_LIVES && score >= 1200) {
      showResult("ケロっと完全帰宅", "6匹全員ノーミス。雨の日の交通整理がうますぎます。");
    } else {
      showResult("6匹帰宅", `スコア ${score}。流れる葉っぱを読み切りました。`);
    }
    setMessage("6匹全員、おうちに帰れました。");
    return;
  }

  showResult(title || "帰宅失敗", text || "池が強かったです。もう一度、流れを読んでください。");
}

function tick(now) {
  if (!active) return;

  if (!lastFrameAt) lastFrameAt = now;
  const dt = clamp((now - lastFrameAt) / 1000, 0, 0.05);
  lastFrameAt = now;

  updateObjects(dt, now);
  updateHud();

  if ((now - startedAt) / 1000 >= TIME_LIMIT) {
    endGame(false, "時間切れ", `${frogsHome}匹帰宅。あと少し、葉っぱの先読みが必要でした。`);
    return;
  }

  animationId = window.requestAnimationFrame(tick);
}

function getPondPoint(event) {
  const rect = pond.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function resetGame() {
  active = false;
  finished = false;
  window.cancelAnimationFrame(animationId);
  clearObjects();
  frogLeaf = null;
  frogsHome = 0;
  lives = MAX_LIVES;
  score = 0;
  combo = 0;
  stunnedUntil = 0;
  respawning = false;
  leafSerial = 0;
  nextDropAt = 0;
  lastFrameAt = 0;
  setFrogPosition(START);
  hideResult();
  startBtn.disabled = false;
  startBtn.textContent = "スタート";
  frog.classList.remove("is-stunned", "jumping", "splash");
  setMessage("流れる葉っぱで6匹のかえるを帰してください。遠い葉っぱは流れて近づくのを待ちます。");
  updateHud();
}

function startGame() {
  resetGame();
  active = true;
  startedAt = performance.now();
  lastFrameAt = 0;
  nextDropAt = startedAt + 900;
  startBtn.disabled = true;
  startBtn.textContent = "帰宅中";
  setMessage("タップで葉っぱを置く。届けば自動ジャンプ。雨粒と流れに注意。");
  updateHud();
  animationId = window.requestAnimationFrame(tick);
}

pond.addEventListener("click", (event) => {
  if (!active || finished) return;
  placeLeaf(getPondPoint(event));
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

resetGame();
