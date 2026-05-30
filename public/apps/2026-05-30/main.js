const ASSET_BASE = "/apps/2026-05-30";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const boardEl = document.getElementById("board");
const stageTextEl = document.getElementById("stageText");
const dustTextEl = document.getElementById("dustText");
const messageEl = document.getElementById("message");
const resetBtn = document.getElementById("resetBtn");
const nextBtn = document.getElementById("nextBtn");
const bgmBtn = document.getElementById("bgmBtn");
const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;
const seClear = new Audio(asset("./assets/se-clear.mp3"));

let isBgmPlaying = false;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const STAGES = [
  {
    name: "まずは六畳",
    grid: [
      "#####",
      "#S.D#",
      "#...#",
      "#D.D#",
      "#####",
    ],
    message: "ホコリだけを全部吸えばOKです。コードで戻れなくならないように進んでください。",
  },
  {
    name: "家具あり",
    grid: [
      "######",
      "#S..D#",
      "#.##.#",
      "#D...#",
      "#..D.#",
      "######",
    ],
    message: "家具は通れません。ホコリを取る順番を考えてください。",
  },
  {
    name: "くねくね部屋",
    grid: [
      "#######",
      "#S...D#",
      "###.#.#",
      "#D..#.#",
      "#.###.#",
      "#...D.#",
      "#######",
    ],
    message: "奥のホコリから取るか、手前から取るか。間違えると詰みます。",
  },
  {
    name: "からまり予報",
    grid: [
      "########",
      "#S...D.#",
      "#.####.#",
      "#.#D...#",
      "#.#.##.#",
      "#...#D.#",
      "#D.....#",
      "########",
    ],
    message: "全部の床ではなく、全部のホコリを回収してください。",
  },
  {
    name: "コード地獄",
    grid: [
      "#########",
      "#S...D..#",
      "###.#.###",
      "#..D....#",
      "#...###.#",
      "#D....#D#",
      "#.#.###.#",
      "#D......#",
      "#########",
    ],
    message: "最後の部屋です。近いホコリから吸うと、だいたい詰みます。",
  },
];

let stageIndex = 0;
let stage = null;
let width = 0;
let height = 0;
let player = { x: 0, y: 0 };
let start = { x: 0, y: 0 };
let walls = new Set();
let dusts = new Set();
let collectedDusts = new Set();
let visited = new Set();
let cleared = false;
let failed = false;

function keyOf(x, y) {
  return `${x},${y}`;
}

function parseStage() {
  stage = STAGES[stageIndex];
  height = stage.grid.length;
  width = stage.grid[0].length;

  walls = new Set();
  dusts = new Set();
  collectedDusts = new Set();
  visited = new Set();
  cleared = false;
  failed = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = stage.grid[y][x];

      if (cell === "#") {
        walls.add(keyOf(x, y));
      }

      if (cell === "S") {
        player = { x, y };
        start = { x, y };
        visited.add(keyOf(x, y));
      }

      if (cell === "D") {
        dusts.add(keyOf(x, y));
      }
    }
  }
}

function render() {
  stageTextEl.textContent = `${stageIndex + 1}`;
  dustTextEl.textContent = `${collectedDusts.size}/${dusts.size}`;

  boardEl.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${height}, 1fr)`;
  boardEl.innerHTML = "";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = keyOf(x, y);
      const cell = document.createElement("div");
      cell.classList.add("cell");

      if (walls.has(key)) {
        cell.classList.add("wall");
      } else {
        cell.classList.add("floor");

        if (key === keyOf(start.x, start.y)) {
          cell.classList.add("start");
        }

        if (visited.has(key) && key !== keyOf(player.x, player.y) && key !== keyOf(start.x, start.y)) {
          cell.classList.add("cord");
        }

        if (dusts.has(key) && !collectedDusts.has(key)) {
          for (let i = 0; i < 3; i++) {
            const dot = document.createElement("span");
            dot.classList.add("dust-dot");
            cell.appendChild(dot);
          }
        }

        if (key === keyOf(player.x, player.y)) {
          const vacuum = document.createElement("div");
          vacuum.classList.add("vacuum");
          vacuum.innerHTML = `
            <div class="vacuum-nozzle"></div>
            <div class="vacuum-body"></div>
          `;
          cell.appendChild(vacuum);
        }
      }

      boardEl.appendChild(cell);
    }
  }

  nextBtn.classList.toggle("hidden", !cleared);
}

function setMessage(text) {
  messageEl.textContent = text;
}

function playSe(audio) {
  try {
    audio.currentTime = 0;
    audio.play();
  } catch {
    // no-op
  }
}

function canMoveTo(x, y) {
  const key = keyOf(x, y);

  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  if (walls.has(key)) return false;
  if (visited.has(key)) return false;

  return true;
}

function hasAnyMove() {
  return Object.values(DIRS).some((dir) => {
    const nx = player.x + dir.x;
    const ny = player.y + dir.y;
    return canMoveTo(nx, ny);
  });
}

function move(dirName) {
  if (cleared || failed) return;

  const dir = DIRS[dirName];
  if (!dir) return;

  const nx = player.x + dir.x;
  const ny = player.y + dir.y;
  const nextKey = keyOf(nx, ny);

  if (!canMoveTo(nx, ny)) {
    setMessage("そこは通れません。家具か、さっき伸ばしたコードです。");
    return;
  }

  player = { x: nx, y: ny };
  visited.add(nextKey);

  if (dusts.has(nextKey)) {
    collectedDusts.add(nextKey);
  }

  if (collectedDusts.size >= dusts.size) {
    cleared = true;
    playSe(seClear);
    setMessage(stageIndex === STAGES.length - 1
      ? "全室掃除完了！コードも部屋も、ギリギリ無事です。"
      : "掃除完了！次の部屋へ進めます。"
    );
    render();
    return;
  }

  if (!hasAnyMove()) {
    failed = true;
    setMessage("コードが絡まりました。まだホコリが残っています。");
    render();
    return;
  }

  setMessage("いい感じです。戻れないので、次の一歩は慎重に。");
  render();
}

function resetStage() {
  parseStage();
  setMessage(stage.message);
  render();
}

function nextStage() {
  if (!cleared) return;

  if (stageIndex < STAGES.length - 1) {
    stageIndex += 1;
    resetStage();
  } else {
    setMessage("あなたは一筆掃除機マスターです。現実の掃除もこのくらい単純ならよかったのに。");
  }
}

document.querySelectorAll(".control-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    move(btn.dataset.dir);
  });
});

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  const dir = keyMap[event.key];
  if (!dir) return;

  event.preventDefault();
  move(dir);
});

resetBtn.addEventListener("click", resetStage);
nextBtn.addEventListener("click", nextStage);

bgmBtn.addEventListener("click", async () => {
  try {
    if (isBgmPlaying) {
      bgm.pause();
      isBgmPlaying = false;
      bgmBtn.textContent = "♪ BGM ON";
      return;
    }

    await bgm.play();
    isBgmPlaying = true;
    bgmBtn.textContent = "♪ BGM OFF";
  } catch (error) {
    setMessage("BGMを再生できませんでした。もう一度タップしてください。");
  }
});

resetStage();