const app = document.querySelector(".app");
const targetBoard = document.getElementById("targetBoard");
const crateGrid = document.getElementById("crateGrid");
const progressText = document.getElementById("progressText");
const completionText = document.getElementById("completionText");
const hintButton = document.getElementById("hintButton");
const scatterButton = document.getElementById("scatterButton");
const resetButton = document.getElementById("resetButton");
const timeText = document.getElementById("timeText");
const missText = document.getElementById("missText");
const orderText = document.getElementById("orderText");

const columns = 2;
const rows = 4;
const pieceCount = columns * rows;
const snapDistance = 74;
const dragThreshold = 10;
const startTime = 20;
const missPenalty = 1.5;

const pieceNames = ["衣の左上", "たいまつと顔", "衣のすそ左", "胸元と腕", "顔と楽器", "衣のすそ右", "たいまつの先", "衣の中央"];

const state = {
  pieces: [],
  slots: [],
  dragged: null,
  pendingDrag: null,
  placed: 0,
  misses: 0,
  timeLeft: startTime,
  active: false,
  finished: false,
  targetIndex: null,
  timerId: null,
  lastTick: 0,
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function piecePosition(index) {
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    col,
    row,
    left: `${col * 50}%`,
    top: `${row * 25}%`,
    backgroundPosition: `${col * 100}% ${row * (100 / (rows - 1))}%`,
  };
}

function createSlot(index) {
  const slot = document.createElement("div");
  const position = piecePosition(index);
  slot.className = "slot";
  slot.dataset.index = String(index);
  slot.style.left = position.left;
  slot.style.top = position.top;
  slot.style.backgroundPosition = position.backgroundPosition;
  targetBoard.appendChild(slot);
  return slot;
}

function createPiece(index) {
  const piece = document.createElement("div");
  const position = piecePosition(index);
  piece.className = "piece";
  piece.dataset.index = String(index);
  piece.dataset.name = pieceNames[index];
  piece.tabIndex = 0;
  piece.role = "button";
  piece.style.backgroundPosition = position.backgroundPosition;
  piece.style.setProperty("--tilt", `${-5 + Math.random() * 10}deg`);
  piece.setAttribute("aria-label", `松村像の部品 ${index + 1}`);
  piece.addEventListener("pointerdown", startDrag);
  piece.addEventListener("click", () => {
    if (piece.dataset.skipClick === "true") return;
    choosePiece(piece);
  });
  piece.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choosePiece(piece);
    }
  });
  return piece;
}

function createCrate(piece, number) {
  const crate = document.createElement("div");
  crate.className = "crate";
  crate.dataset.label = `NO.${String(number + 1).padStart(3, "0")}`;
  crate.appendChild(piece);
  return crate;
}

function buildPuzzle() {
  targetBoard.replaceChildren();
  crateGrid.replaceChildren();
  state.slots = Array.from({ length: pieceCount }, (_, index) => createSlot(index));
  state.pieces = shuffle(Array.from({ length: pieceCount }, (_, index) => createPiece(index)));

  state.pieces.forEach((piece, index) => {
    crateGrid.appendChild(createCrate(piece, index));
  });

  state.dragged = null;
  state.pendingDrag = null;
  state.misses = 0;
  state.timeLeft = startTime;
  state.active = false;
  state.finished = false;
  state.targetIndex = null;
  stopTimer();
  app.classList.remove("playing", "failed");
  hintButton.textContent = "検品スタート";
  orderText.textContent = "松村像を開始";
  missText.textContent = "0";
  timeText.textContent = startTime.toFixed(1);
  updateProgress();
  setTargetHighlight();
}

function updateProgress() {
  state.placed = state.pieces.filter((piece) => piece.classList.contains("placed")).length;
  progressText.textContent = `${state.placed}/${pieceCount}`;
  const done = state.placed === pieceCount;
  app.classList.toggle("complete", done && !state.finished);
  completionText.classList.toggle("done", done);

  if (done && !state.finished) {
    finishGame(true);
    return;
  }

  if (!state.finished) {
    completionText.textContent = state.active
      ? "指示された箱を見つけてタップ。違う箱は検品ロス。"
      : "検品スタートで、指定された部品の箱を探そう。";
  }
}

function startGame() {
  if (state.active || state.finished) {
    resetPuzzle();
    return;
  }

  state.active = true;
  state.lastTick = performance.now();
  hintButton.textContent = "やり直す";
  app.classList.add("playing");
  completionText.textContent = "指示された箱を見つけてタップ。違う箱は検品ロス。";
  pickNextTarget();
  tickTimer();
}

function stopTimer() {
  if (state.timerId) {
    cancelAnimationFrame(state.timerId);
    state.timerId = null;
  }
}

function tickTimer(now = performance.now()) {
  if (!state.active || state.finished) return;
  const delta = (now - state.lastTick) / 1000;
  state.lastTick = now;
  state.timeLeft = Math.max(0, state.timeLeft - delta);
  timeText.textContent = state.timeLeft.toFixed(1);

  if (state.timeLeft <= 0) {
    finishGame(false);
    return;
  }

  state.timerId = requestAnimationFrame(tickTimer);
}

function pickNextTarget() {
  const loose = state.pieces.filter((piece) => !piece.classList.contains("placed"));
  if (!loose.length) return;
  const next = loose[Math.floor(Math.random() * loose.length)];
  state.targetIndex = Number(next.dataset.index);
  orderText.textContent = pieceNames[state.targetIndex];
  setTargetHighlight();
}

function setTargetHighlight() {
  for (const piece of state.pieces) {
    piece.classList.remove("target-piece");
  }

  for (const slot of state.slots) {
    const isTarget = Number(slot.dataset.index) === state.targetIndex && state.active;
    slot.classList.toggle("target-slot", isTarget);
  }
}

function choosePiece(piece) {
  if (piece.classList.contains("placed") || state.finished) return;
  if (!state.active) {
    startGame();
    return;
  }

  const index = Number(piece.dataset.index);
  if (index !== state.targetIndex) {
    registerMiss(piece);
    return;
  }

  placePiece(piece, true);
  pickNextTarget();
}

function registerMiss(piece) {
  state.misses += 1;
  state.timeLeft = Math.max(0, state.timeLeft - missPenalty);
  missText.textContent = String(state.misses);
  timeText.textContent = state.timeLeft.toFixed(1);
  const crate = piece.closest(".crate");
  crate?.classList.remove("miss");
  void crate?.offsetWidth;
  crate?.classList.add("miss");
  completionText.textContent = `${piece.dataset.name}ではない。-${missPenalty.toFixed(1)}秒`;

  if (state.timeLeft <= 0) {
    finishGame(false);
  }
}

function finishGame(success) {
  state.finished = true;
  state.active = false;
  stopTimer();
  app.classList.remove("playing");
  app.classList.toggle("failed", !success);
  app.classList.toggle("complete", success);
  state.targetIndex = null;
  setTargetHighlight();
  hintButton.textContent = "もう一回";

  if (!success) {
    orderText.textContent = "検品失敗";
    completionText.textContent = "入港検品に失敗。積み直して再挑戦。";
    return;
  }

  const timeUsed = Math.max(0, startTime - state.timeLeft);
  const rank = state.misses === 0 && timeUsed < 8 ? "港の伝説" : state.misses <= 2 ? "一等検品士" : "見習い荷役";
  orderText.textContent = rank;
  completionText.textContent = `${rank}: ${timeUsed.toFixed(1)}秒 / ミス${state.misses}で自由の松村が立ちました。`;
}

function boardMetrics() {
  const boardRect = targetBoard.getBoundingClientRect();
  return {
    boardRect,
    pieceWidth: boardRect.width / columns,
    pieceHeight: boardRect.height / rows,
  };
}

function slotPoint(index) {
  const { boardRect, pieceWidth, pieceHeight } = boardMetrics();
  const { col, row } = piecePosition(index);
  return {
    x: boardRect.left + col * pieceWidth,
    y: boardRect.top + row * pieceHeight,
    width: pieceWidth,
    height: pieceHeight,
  };
}

function ghostPiece(piece) {
  const rect = piece.getBoundingClientRect();
  piece.style.position = "fixed";
  piece.style.left = `${rect.left}px`;
  piece.style.top = `${rect.top}px`;
  piece.style.width = `${rect.width}px`;
  piece.style.height = `${rect.height}px`;
  document.body.appendChild(piece);
}

function startDrag(event) {
  const piece = event.currentTarget;
  if (piece.classList.contains("placed")) return;

  event.preventDefault();
  piece.setPointerCapture(event.pointerId);
  const rect = piece.getBoundingClientRect();
  state.pendingDrag = {
    piece,
    pointerId: event.pointerId,
    originCrate: piece.closest(".crate"),
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
}

function moveDrag(event) {
  if (state.pendingDrag && event.pointerId === state.pendingDrag.pointerId) {
    const distance = Math.hypot(event.clientX - state.pendingDrag.startX, event.clientY - state.pendingDrag.startY);
    if (distance < dragThreshold) return;

    state.dragged = state.pendingDrag;
    state.pendingDrag = null;
    state.dragged.originCrate?.classList.add("empty");
    ghostPiece(state.dragged.piece);
    state.dragged.piece.classList.add("dragging");
  }

  if (!state.dragged) return;
  const { piece, offsetX, offsetY } = state.dragged;
  piece.style.left = `${event.clientX - offsetX}px`;
  piece.style.top = `${event.clientY - offsetY}px`;
}

function endDrag(event) {
  if (state.pendingDrag && event.pointerId === state.pendingDrag.pointerId) {
    const { piece } = state.pendingDrag;
    state.pendingDrag = null;
    piece.dataset.skipClick = "true";
    window.setTimeout(() => {
      delete piece.dataset.skipClick;
    }, 0);
    choosePiece(piece);
    return;
  }

  if (!state.dragged) return;
  const { piece, originCrate } = state.dragged;
  const index = Number(piece.dataset.index);
  const rect = piece.getBoundingClientRect();
  const target = slotPoint(index);
  const dx = rect.left - target.x;
  const dy = rect.top - target.y;
  const distance = Math.hypot(dx, dy);

  piece.classList.remove("dragging");
  piece.dataset.skipClick = "true";
  window.setTimeout(() => {
    delete piece.dataset.skipClick;
  }, 0);
  if (distance < snapDistance) {
    state.dragged = null;
    choosePiece(piece);
    return;
  }

  state.dragged = null;
  returnToCrate(piece, originCrate);
}

function returnToCrate(piece, originCrate) {
  piece.removeAttribute("style");
  piece.style.backgroundPosition = piecePosition(Number(piece.dataset.index)).backgroundPosition;
  piece.style.setProperty("--tilt", `${-5 + Math.random() * 10}deg`);
  if (originCrate) {
    originCrate.classList.remove("empty");
    originCrate.appendChild(piece);
  } else {
    const freshCrate = createCrate(piece, crateGrid.children.length);
    crateGrid.appendChild(freshCrate);
  }
}

function placePiece(piece, animate) {
  if (piece.classList.contains("placed")) return;

  const index = Number(piece.dataset.index);
  const position = piecePosition(index);
  const slot = state.slots[index];
  const oldCrate = piece.closest(".crate");

  if (oldCrate) {
    oldCrate.classList.add("empty");
    oldCrate.dataset.piece = index;
  }

  piece.classList.add("placed");
  piece.removeAttribute("style");
  piece.style.left = position.left;
  piece.style.top = position.top;
  piece.style.backgroundPosition = position.backgroundPosition;
  targetBoard.appendChild(piece);
  slot.classList.add("filled");

  if (animate) {
    piece.animate(
      [
        { transform: "scale(0.92) rotate(-4deg)", opacity: 0.7 },
        { transform: "scale(1) rotate(0deg)", opacity: 1 },
      ],
      { duration: 240, easing: "ease-out" },
    );
  }

  updateProgress();
}

function placeNextPiece() {
  const next = state.pieces.find((piece) => !piece.classList.contains("placed"));
  if (next) placePiece(next, true);
}

function resetPuzzle() {
  buildPuzzle();
}

function scatterCrates() {
  const loosePieces = state.pieces.filter((piece) => !piece.classList.contains("placed"));
  const crates = shuffle(loosePieces).map((piece, index) => {
    piece.removeAttribute("style");
    piece.style.backgroundPosition = piecePosition(Number(piece.dataset.index)).backgroundPosition;
    piece.style.setProperty("--tilt", `${-9 + Math.random() * 18}deg`);
    return createCrate(piece, index);
  });

  crateGrid.replaceChildren(...crates);
  setTargetHighlight();
}

window.addEventListener("pointermove", moveDrag);
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
hintButton.addEventListener("click", startGame);
scatterButton.addEventListener("click", scatterCrates);
resetButton.addEventListener("click", resetPuzzle);

buildPuzzle();
