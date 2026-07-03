const ingredients = [
  {
    id: "togarashi",
    name: "唐辛子",
    kind: "辛味",
    source: "七味唐からし",
    score: { hot: 95, aroma: 30, numbing: 4, savory: 18, sweet: 4, wild: 18 },
  },
  {
    id: "sansho",
    name: "山椒",
    kind: "しびれ",
    source: "七味唐からし",
    score: { hot: 18, aroma: 82, numbing: 92, savory: 18, sweet: 8, wild: 36 },
  },
  {
    id: "huajiao",
    name: "花椒",
    kind: "しびれ",
    source: "拉麺七味",
    score: { hot: 25, aroma: 72, numbing: 100, savory: 16, sweet: 5, wild: 52 },
  },
  {
    id: "ginger",
    name: "生姜",
    kind: "香味",
    source: "七味唐からし",
    score: { hot: 40, aroma: 70, numbing: 12, savory: 20, sweet: 16, wild: 24 },
  },
  {
    id: "chenpi",
    name: "陳皮",
    kind: "香り",
    source: "七味唐からし",
    score: { hot: 6, aroma: 84, numbing: 2, savory: 12, sweet: 44, wild: 18 },
  },
  {
    id: "yuzu",
    name: "柚子",
    kind: "香り",
    source: "ゆず七味",
    score: { hot: 4, aroma: 95, numbing: 1, savory: 10, sweet: 35, wild: 26 },
  },
  {
    id: "shiso",
    name: "紫蘇",
    kind: "香草",
    source: "七味唐からし",
    score: { hot: 3, aroma: 78, numbing: 1, savory: 18, sweet: 20, wild: 20 },
  },
  {
    id: "aonori",
    name: "青海苔",
    kind: "旨み",
    source: "深煎七味",
    score: { hot: 1, aroma: 62, numbing: 1, savory: 82, sweet: 8, wild: 24 },
  },
  {
    id: "black_sesame",
    name: "黒胡麻",
    kind: "香ばしさ",
    source: "深煎七味",
    score: { hot: 0, aroma: 58, numbing: 0, savory: 62, sweet: 28, wild: 12 },
  },
  {
    id: "white_sesame",
    name: "白胡麻",
    kind: "香ばしさ",
    source: "七味唐からし",
    score: { hot: 0, aroma: 48, numbing: 0, savory: 56, sweet: 34, wild: 8 },
  },
  {
    id: "hemp",
    name: "麻種",
    kind: "香ばしさ",
    source: "七味唐からし",
    score: { hot: 0, aroma: 44, numbing: 0, savory: 50, sweet: 26, wild: 18 },
  },
  {
    id: "blackpepper",
    name: "ブラックペッパー",
    kind: "辛味",
    source: "拉麺七味",
    score: { hot: 58, aroma: 74, numbing: 18, savory: 18, sweet: 2, wild: 30 },
  },
  {
    id: "whitepepper",
    name: "ホワイトペッパー",
    kind: "辛味",
    source: "拉麺七味",
    score: { hot: 52, aroma: 48, numbing: 14, savory: 16, sweet: 1, wild: 22 },
  },
  {
    id: "garlic",
    name: "ガーリック",
    kind: "旨み",
    source: "拉麺七味",
    score: { hot: 18, aroma: 72, numbing: 2, savory: 92, sweet: 18, wild: 38 },
  },
  {
    id: "onion",
    name: "オニオン",
    kind: "旨み",
    source: "拉麺七味",
    score: { hot: 6, aroma: 58, numbing: 1, savory: 82, sweet: 42, wild: 24 },
  },
  {
    id: "cumin",
    name: "クミン",
    kind: "香辛料",
    source: "七味ガラム・マサラ",
    score: { hot: 12, aroma: 92, numbing: 4, savory: 48, sweet: 10, wild: 68 },
  },
  {
    id: "coriander",
    name: "コリアンダー",
    kind: "香辛料",
    source: "七味ガラム・マサラ",
    score: { hot: 5, aroma: 78, numbing: 2, savory: 28, sweet: 24, wild: 48 },
  },
  {
    id: "clove",
    name: "クローブ",
    kind: "香辛料",
    source: "七味ガラム・マサラ",
    score: { hot: 10, aroma: 88, numbing: 18, savory: 20, sweet: 36, wild: 72 },
  },
  {
    id: "cinnamon",
    name: "シナモン",
    kind: "香辛料",
    source: "七味ガラム・マサラ",
    score: { hot: 4, aroma: 86, numbing: 2, savory: 8, sweet: 62, wild: 56 },
  },
  {
    id: "ume",
    name: "梅肉",
    kind: "酸味",
    source: "梅七味ごま",
    score: { hot: 3, aroma: 54, numbing: 1, savory: 38, sweet: 22, wild: 50 },
  },
];

const flavorLabels = [
  ["hot", "辛さ"],
  ["aroma", "香り"],
  ["numbing", "しびれ"],
  ["savory", "旨み"],
  ["sweet", "甘み"],
  ["wild", "個性"],
];

const flavorWeights = {
  hot: 1.16,
  aroma: 0.74,
  numbing: 1.22,
  savory: 1.08,
  sweet: 1.28,
  wild: 1.15,
};

const selected = new Map();

const ingredientGrid = document.getElementById("ingredientGrid");
const selectedCount = document.getElementById("selectedCount");
const blendRows = document.getElementById("blendRows");
const emptyState = document.getElementById("emptyState");
const totalBadge = document.getElementById("totalBadge");
const balanceBtn = document.getElementById("balanceBtn");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const blendName = document.getElementById("blendName");
const blendNote = document.getElementById("blendNote");
const flavorBars = document.getElementById("flavorBars");
const recipeList = document.getElementById("recipeList");

function renderIngredients() {
  const maxed = selected.size >= 7;

  ingredientGrid.innerHTML = ingredients.map((item) => {
    const isSelected = selected.has(item.id);
    const disabled = maxed && !isSelected ? "disabled" : "";
    const selectedClass = isSelected ? " selected" : "";
    return `
      <button class="ingredient${selectedClass}" type="button" data-id="${item.id}" ${disabled}>
        <span class="ingredientTop">
          <span class="ingredientName">${item.name}</span>
          <span class="kind">${item.kind}</span>
        </span>
        <span class="source">${item.source}で使用</span>
      </button>
    `;
  }).join("");
}

function renderBlend() {
  selectedCount.textContent = selected.size;
  emptyState.style.display = selected.size ? "none" : "grid";
  blendRows.innerHTML = Array.from(selected.values()).map((entry) => `
    <div class="blendRow">
      <div class="rowTop">
        <span>${entry.name}</span>
        <button type="button" data-remove="${entry.id}" aria-label="${entry.name}を外す">x</button>
      </div>
      <div class="rowControl">
        <input type="range" min="1" max="60" value="${entry.percent}" data-range="${entry.id}" />
        <span class="percent">${entry.percent}%</span>
      </div>
    </div>
  `).join("");

  const total = getTotal();
  totalBadge.textContent = `${total}%`;
  totalBadge.classList.toggle("ok", total === 100 && selected.size === 7);
  totalBadge.classList.toggle("bad", total !== 100 && selected.size > 0);
}

function renderLabel() {
  const entries = Array.from(selected.values());
  const total = getTotal();
  const scores = calculateScores(entries, total);
  const ready = entries.length === 7 && total === 100;

  blendName.textContent = ready ? makeName(scores, entries) : entries.length === 7 ? "配合を100%へ" : "七つを選ぶ";
  blendNote.textContent = ready
    ? makeNote(scores, entries)
    : entries.length === 7
      ? "合計が100%になると、ラベルと味の輪郭が完成します。"
      : "実際の七味系素材だけで、自分の配合を作る。";

  flavorBars.innerHTML = flavorLabels.map(([key, label]) => {
    const value = Math.round(scores[key] || 0);
    return `
      <div class="flavor">
        <span>${label}</span>
        <span class="track"><span class="fill" style="width:${value}%"></span></span>
        <span>${value}</span>
      </div>
    `;
  }).join("");

  recipeList.innerHTML = entries
    .sort((a, b) => b.percent - a.percent)
    .map((entry) => `<div class="recipeItem"><span>${entry.name}</span><span>${entry.percent}%</span></div>`)
    .join("");
}

function getTotal() {
  return Array.from(selected.values()).reduce((sum, entry) => sum + entry.percent, 0);
}

function calculateScores(entries, total) {
  const base = { hot: 0, aroma: 0, numbing: 0, savory: 0, sweet: 0, wild: 0 };
  if (!entries.length || !total) return base;

  entries.forEach((entry) => {
    Object.keys(base).forEach((key) => {
      base[key] += entry.score[key] * (entry.percent / total);
    });
  });

  Object.keys(base).forEach((key) => {
    base[key] = Math.min(100, base[key]);
  });

  return base;
}

function makeName(scores, entries) {
  const main = [...entries].sort((a, b) => b.percent - a.percent)[0];
  const accent = [...entries]
    .filter((entry) => entry.id !== main.id)
    .sort((a, b) => b.percent - a.percent)[0];
  const topScore = getLeadFlavor(scores, main);
  const prefixes = {
    hot: "火口",
    aroma: "香房",
    numbing: "雷山椒",
    savory: "旨蔵",
    sweet: "甘橙",
    wild: "異国",
  };
  const joins = {
    hot: "焦がし",
    aroma: "香る",
    numbing: "しびれ",
    savory: "だし",
    sweet: "まろみ",
    wild: "旅路",
  };
  return `${prefixes[topScore.key]} ${main.name}${accent ? `と${accent.name}` : ""}の${joins[topScore.key]}七味`;
}

function makeNote(scores, entries) {
  const ranked = getRankedFlavors(scores);
  const main = [...entries].sort((a, b) => b.percent - a.percent)[0];
  const lead = getLeadFlavor(scores, main);
  const second = ranked.find((item) => item.key !== lead.key) || ranked[1];
  const top = [lead, second].map((item) => item.label).join("と");
  const uses = {
    hot: "焼き鳥、豚汁、麻婆豆腐",
    aroma: "うどん、蕎麦、湯豆腐",
    numbing: "ラーメン、餃子、唐揚げ",
    savory: "味噌汁、炒めもの、卵かけご飯",
    sweet: "かぼちゃ煮、焼き餅、照り焼き",
    wild: "カレー、ラム、焼き野菜",
  };

  return `${top}が前に出る配合。まず合わせたいのは、${uses[lead.key]}あたりです。`;
}

function getLeadFlavor(scores, main) {
  const ranked = getRankedFlavors(scores);
  if (!main || main.percent < 24) return ranked[0];

  const keyByKind = {
    "辛味": "hot",
    "しびれ": "numbing",
    "旨み": "savory",
    "香ばしさ": "savory",
    "香辛料": "wild",
    "酸味": "wild",
    "香味": "aroma",
    "香り": "aroma",
    "香草": "aroma",
  };
  const leadKey = keyByKind[main.kind] || ranked[0].key;
  const flavor = flavorLabels.find(([key]) => key === leadKey);

  return {
    key: flavor[0],
    label: flavor[1],
    value: scores[flavor[0]],
    signal: scores[flavor[0]] * flavorWeights[flavor[0]],
  };
}

function getRankedFlavors(scores) {
  return flavorLabels
    .map(([key, label]) => ({
      key,
      label,
      value: scores[key],
      signal: scores[key] * flavorWeights[key],
    }))
    .sort((a, b) => b.signal - a.signal);
}

function toggleIngredient(id) {
  if (selected.has(id)) {
    selected.delete(id);
  } else if (selected.size < 7) {
    const item = ingredients.find((ingredient) => ingredient.id === id);
    selected.set(id, { ...item, percent: 14 });
    normalizeToHundred();
  }
  render();
}

function normalizeToHundred() {
  const entries = Array.from(selected.values());
  if (!entries.length) return;

  const base = Math.floor(100 / entries.length);
  let rest = 100 - base * entries.length;
  entries.forEach((entry) => {
    entry.percent = base + (rest > 0 ? 1 : 0);
    rest -= 1;
  });
}

function applyRandomComposition(entries) {
  const weights = entries.map((_, index) => {
    if (index === 0) return 28 + Math.random() * 22;
    if (index === 1) return 16 + Math.random() * 12;
    return 4 + Math.random() * 15;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let used = 0;

  entries.forEach((entry, index) => {
    if (index === entries.length - 1) {
      entry.percent = Math.max(1, 100 - used);
      return;
    }
    entry.percent = Math.max(1, Math.round((weights[index] / totalWeight) * 100));
    used += entry.percent;
  });

  let diff = 100 - getTotal();
  while (diff !== 0) {
    const candidates = entries.filter((entry) => diff > 0 || entry.percent > 1);
    if (!candidates.length) break;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    target.percent += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
}

function balanceFromCurrent() {
  const entries = Array.from(selected.values());
  if (!entries.length) return;

  const total = getTotal();
  if (!total) {
    normalizeToHundred();
    return;
  }

  let used = 0;
  entries.forEach((entry, index) => {
    if (index === entries.length - 1) {
      entry.percent = Math.max(1, 100 - used);
      return;
    }
    entry.percent = Math.max(1, Math.round((entry.percent / total) * 100));
    used += entry.percent;
  });

  let diff = 100 - getTotal();
  while (diff !== 0) {
    const target = entries.find((entry) => diff > 0 || entry.percent > 1);
    if (!target) break;
    target.percent += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
}

function setRandomSeven() {
  selected.clear();
  const picks = [...ingredients]
    .sort(() => Math.random() - 0.5)
    .slice(0, 7);

  picks.forEach((item) => selected.set(item.id, { ...item, percent: 14 }));
  applyRandomComposition(Array.from(selected.values()));
  render();
}

function render() {
  renderIngredients();
  renderBlend();
  renderLabel();
}

ingredientGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  toggleIngredient(button.dataset.id);
});

blendRows.addEventListener("input", (event) => {
  const input = event.target.closest("[data-range]");
  if (!input) return;
  selected.get(input.dataset.range).percent = Number(input.value);
  renderBlend();
  renderLabel();
});

blendRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  selected.delete(button.dataset.remove);
  render();
});

balanceBtn.addEventListener("click", () => {
  balanceFromCurrent();
  render();
});

clearBtn.addEventListener("click", () => {
  selected.clear();
  render();
});

randomBtn.addEventListener("click", setRandomSeven);

render();
