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

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const dayText = document.getElementById("dayText");
const shapeName = document.getElementById("shapeName");
const shapeNote = document.getElementById("shapeNote");
const branchLayer = document.getElementById("branchLayer");
const growBranches = Array.from(document.querySelectorAll(".grow-branch"));
const bgm = new Audio(asset("./assets/bgm.mp3"));
bgm.loop = true;
bgm.volume = 0.45;

const TICK_MS = 720;
const MAX_DAY = 36;

let timer = null;
let running = false;
let day = 1;
let pads = [];
let currentStyle = null;

const branchGrowthPlan = {
  b1: { startDay: 1, endDay: 8 },
  b2: { startDay: 2, endDay: 10 },
  b3: { startDay: 7, endDay: 16 },
  b4: { startDay: 9, endDay: 18 },
  b5: { startDay: 15, endDay: 24 },
  b6: { startDay: 17, endDay: 26 },
};

/**
 * 盆栽の型。
 * ここで完成形を設計しておく。
 * ランダム成長ではなく、綺麗な完成形に向かって育てる。
 */
const styles = [
  {
    id: "wide",
    name: "ひろがり松",
    note: "横に大きく張る、盆栽らしい枝ぶりです。",
    pads: [
      // 下段 左
      { x: 56, y: 336, angle: 205, start: 2, target: 31, growDay: 6 },
      { x: 90, y: 354, angle: 210, start: 3, target: 25, growDay: 7 },
      { x: 124, y: 362, angle: 206, start: 5, target: 20, growDay: 8 },

      // 下段 右
      { x: 310, y: 286, angle: 342, start: 2, target: 32, growDay: 6 },
      { x: 274, y: 306, angle: 338, start: 3, target: 26, growDay: 8 },
      { x: 238, y: 322, angle: 336, start: 5, target: 20, growDay: 10 },

      // 中段 左
      { x: 58, y: 238, angle: 205, start: 4, target: 28, growDay: 14 },
      { x: 96, y: 260, angle: 212, start: 5, target: 23, growDay: 16 },
      { x: 132, y: 280, angle: 214, start: 8, target: 18, growDay: 18 },

      // 中段 右
      { x: 286, y: 192, angle: 330, start: 4, target: 28, growDay: 15 },
      { x: 252, y: 214, angle: 330, start: 6, target: 23, growDay: 17 },
      { x: 218, y: 236, angle: 326, start: 9, target: 18, growDay: 19 },

      // 上段
      { x: 126, y: 160, angle: 218, start: 9, target: 21, growDay: 22 },
      { x: 154, y: 188, angle: 226, start: 10, target: 17, growDay: 24 },
      { x: 258, y: 108, angle: 316, start: 12, target: 22, growDay: 26 },
      { x: 226, y: 150, angle: 318, start: 14, target: 18, growDay: 28 },
    ],
  },
  {
    id: "heavy",
    name: "どっしり松",
    note: "下枝を残した、重心の低い姿です。",
    pads: [
      // 下段厚め
      { x: 56, y: 336, angle: 205, start: 1, target: 34, growDay: 6 },
      { x: 88, y: 354, angle: 210, start: 1, target: 30, growDay: 7 },
      { x: 122, y: 362, angle: 208, start: 3, target: 25, growDay: 8 },
      { x: 148, y: 356, angle: 214, start: 6, target: 18, growDay: 9 },

      { x: 312, y: 286, angle: 342, start: 1, target: 35, growDay: 6 },
      { x: 278, y: 306, angle: 338, start: 2, target: 31, growDay: 8 },
      { x: 244, y: 322, angle: 336, start: 4, target: 24, growDay: 10 },

      // 中段控えめ
      { x: 60, y: 238, angle: 205, start: 8, target: 23, growDay: 14 },
      { x: 100, y: 260, angle: 212, start: 11, target: 18, growDay: 16 },

      { x: 286, y: 192, angle: 330, start: 8, target: 24, growDay: 18 },
      { x: 252, y: 214, angle: 330, start: 11, target: 18, growDay: 20 },

      // 上段少なめ
      { x: 126, y: 160, angle: 218, start: 16, target: 16, growDay: 22 },
      { x: 258, y: 108, angle: 316, start: 17, target: 17, growDay: 24 },
    ],
  },
  {
    id: "flow",
    name: "流れ松",
    note: "片側へ流れる、少し癖のある姿です。",
    pads: [
      // 左を控えめ
      { x: 58, y: 336, angle: 205, start: 4, target: 22, growDay: 6 },
      { x: 96, y: 356, angle: 210, start: 8, target: 17, growDay: 8 },
      { x: 62, y: 238, angle: 205, start: 10, target: 18, growDay: 14 },

      // 右を強め
      { x: 314, y: 286, angle: 342, start: 1, target: 36, growDay: 6 },
      { x: 280, y: 306, angle: 338, start: 2, target: 31, growDay: 7 },
      { x: 244, y: 322, angle: 336, start: 5, target: 25, growDay: 10 },

      { x: 286, y: 192, angle: 330, start: 4, target: 31, growDay: 16 },
      { x: 252, y: 214, angle: 330, start: 7, target: 26, growDay: 18 },
      { x: 218, y: 236, angle: 326, start: 10, target: 20, growDay: 20 },

      { x: 258, y: 108, angle: 316, start: 12, target: 24, growDay: 24 },
      { x: 226, y: 150, angle: 318, start: 15, target: 18, growDay: 26 },
    ],
  },
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function polar(x, y, angleDeg, length) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x + Math.cos(rad) * length,
    y: y + Math.sin(rad) * length,
  };
}

function createSvgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);

  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });

  return el;
}

function initTree() {
  day = 1;
  currentStyle = pick(styles);
  setupGrowBranches();
  updateGrowBranches();

  pads = currentStyle.pads.map((seed, index) => {
    const jitterX = rand(-3, 3);
    const jitterY = rand(-3, 3);
    const jitterAngle = rand(-7, 7);
    const target = seed.target + rand(-2, 3);

    return {
      id: index + 1,
      x: seed.x + jitterX,
      y: seed.y + jitterY,
      angle: seed.angle + jitterAngle,
      start: seed.start,
      target,
      growDay: seed.growDay,
      size: Math.max(0, seed.start + rand(-1, 2)),
      cutSize: 0,
      visible: seed.growDay <= 4,
      age: 0,
    };
  });

  updateHud();
  render();
}

function getBranchPlanForPad(pad) {
  if (pad.y > 280) {
    return pad.x < 180 ? branchGrowthPlan.b1 : branchGrowthPlan.b2;
  }

  if (pad.y > 180) {
    return pad.x < 180 ? branchGrowthPlan.b3 : branchGrowthPlan.b4;
  }

  return pad.x < 180 ? branchGrowthPlan.b5 : branchGrowthPlan.b6;
}

function targetSizeForDay(pad) {
  const branchPlan = getBranchPlanForPad(pad);
  if (branchPlan && day < branchPlan.endDay) return 0;
  if (day < pad.growDay) return 0;

  const progress = clamp((day - pad.growDay) / 16, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 2);

  return pad.start + (pad.target - pad.start) * eased;
}

function setupGrowBranches() {
  growBranches.forEach((path) => {
    const length = path.getTotalLength();
    path.dataset.pathLength = String(length);
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
  });
}

function updateGrowBranches() {
  growBranches.forEach((path) => {
    const branchId = path.dataset.branchId;
    const plan = branchId ? branchGrowthPlan[branchId] : null;
    const length = Number(path.dataset.pathLength || path.getTotalLength());
    if (!plan) {
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = "0";
      return;
    }

    const progress = clamp(
      (day - plan.startDay) / Math.max(1, plan.endDay - plan.startDay),
      0,
      1
    );
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length * (1 - progress));
  });
}

function tick() {
  day += 1;
  updateGrowBranches();

  pads.forEach((pad) => {
    const naturalSize = targetSizeForDay(pad);

    if (naturalSize > 0) {
      pad.visible = true;
    }

    // 剪定した分は少しずつ戻る
    pad.cutSize *= 0.9;

    const finalSize = Math.max(0, naturalSize - pad.cutSize);

    // 急に大きくならず、少しずつ目標値へ寄せる
    pad.size += (finalSize - pad.size) * 0.28;

    if (pad.size < 1) {
      pad.size = 0;
    }

    pad.age += 1;
  });

  // 完成しきったあとも、ほんの少しだけ呼吸する
  if (day > MAX_DAY) {
    pads.forEach((pad) => {
      if (!pad.visible) return;
      pad.size = clamp(
        pad.size + Math.sin((day + pad.id) * 0.38) * 0.05,
        0,
        pad.target
      );
    });
  }

  updateHud();
  render();
}

function prunePad(id) {
  const pad = pads.find((item) => item.id === id);
  if (!pad || !pad.visible || pad.size <= 0) return;

  // 消すのではなく「整える」
  const cutAmount = clamp(pad.size * 0.36, 5, 12);
  pad.cutSize += cutAmount;

  const naturalSize = targetSizeForDay(pad);
  const finalSize = Math.max(3, naturalSize - pad.cutSize);

  pad.size += (finalSize - pad.size) * 0.72;

  // 小さくしすぎた場合だけ消える
  if (pad.size < 4) {
    pad.size = 0;
    pad.cutSize = naturalSize + 10;
  }

  updateHud();
  render();
}

function startLoop() {
  stopLoop();
  running = true;
  pauseBtn.textContent = "止める";
  timer = setInterval(tick, TICK_MS);
}

function stopLoop() {
  running = false;
  if (timer) clearInterval(timer);
  timer = null;
  pauseBtn.textContent = "動かす";
  bgm.pause();
}

function renderNeedlePad(pad) {
  const group = createSvgEl("g", {
    class: "branch-pop",
    "data-pad-id": String(pad.id),
  });

  const size = clamp(pad.size, 2, pad.target + 4);

  if (size <= 0) return group;

  const core = createSvgEl("ellipse", {
    class: "leaf-core",
    cx: pad.x,
    cy: pad.y,
    rx: size * 0.72,
    ry: size * 0.34,
    transform: `rotate(${pad.angle} ${pad.x} ${pad.y})`,
  });

  group.appendChild(core);

  const needleCount = Math.round(clamp(size * 0.95, 8, 26));

  for (let i = 0; i < needleCount; i += 1) {
    const spread = rand(-84, 84);
    const a = pad.angle + spread;
    const p1 = polar(pad.x, pad.y, a, rand(1, 4));
    const p2 = polar(pad.x, pad.y, a, rand(size * 0.46, size * 1.06));

    const needle = createSvgEl("line", {
      class: i % 3 === 0 ? "needle light" : "needle",
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    });

    group.appendChild(needle);
  }

  const hit = createSvgEl("circle", {
    class: "leaf-hit",
    cx: pad.x,
    cy: pad.y,
    r: size + 18,
  });

  hit.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    prunePad(pad.id);
  });

  group.appendChild(hit);

  if (size >= 8) {
    const ring = createSvgEl("circle", {
      class: "cut-ring",
      cx: pad.x,
      cy: pad.y,
      r: size + 7,
    });

    group.appendChild(ring);
  }

  return group;
}

function render() {
  branchLayer.innerHTML = "";

  pads
    .filter((pad) => pad.visible && pad.size > 0.5)
    .forEach((pad) => {
      branchLayer.appendChild(renderNeedlePad(pad));
    });
}

function getShapeProfile() {
  const visiblePads = pads.filter((pad) => pad.visible && pad.size > 1);

  if (!visiblePads.length) {
    return {
      name: "芽吹き待ち",
      note: "少し待つと、枝先から松葉が出てきます。",
    };
  }

  const totalSize = visiblePads.reduce((sum, pad) => sum + pad.size, 0);
  const averageCut =
    pads.reduce((sum, pad) => sum + pad.cutSize, 0) / Math.max(1, pads.length);

  if (averageCut > 10) {
    return {
      name: "剪定の途中",
      note: "かなり手が入っています。少し待つとまた自然に整ってきます。",
    };
  }

  if (day < 9) {
    return {
      name: "芽吹き松",
      note: "下枝から少しずつ育っています。",
    };
  }

  if (day < 18) {
    return {
      name: "育ち松",
      note: "枝棚が見えてきました。気になる房だけ軽く整えられます。",
    };
  }

  if (totalSize > 300) {
    return {
      name: "もさり松",
      note: "かなり茂っています。少し剪定すると風が通りそうです。",
    };
  }

  return {
    name: currentStyle?.name || "おだやか松",
    note: currentStyle?.note || "好きなところで止めて眺めてください。",
  };
}

function updateHud() {
  dayText.textContent = `${day}日目`;

  const profile = getShapeProfile();
  shapeName.textContent = profile.name;
  shapeNote.textContent = profile.note;
}

function showGame() {
  startScreen.classList.remove("active");
  gameScreen.classList.add("active");
}

function playBgmSafely() {
  bgm.play().catch(() => {});
}

startBtn.addEventListener("click", () => {
  initTree();
  showGame();
  startLoop();
  playBgmSafely();
});

pauseBtn.addEventListener("click", () => {
  if (running) {
    stopLoop();
  } else {
    startLoop();
    playBgmSafely();
  }
});

resetBtn.addEventListener("click", () => {
  initTree();
  startLoop();
  playBgmSafely();
});