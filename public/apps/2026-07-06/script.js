const themeName = document.getElementById("themeName");
const themeFlavor = document.getElementById("themeFlavor");
const playerPicks = document.getElementById("playerPicks");
const cpuPicks = document.getElementById("cpuPicks");
const playerScore = document.getElementById("playerScore");
const cpuScore = document.getElementById("cpuScore");
const roundBadge = document.getElementById("roundBadge");
const turnText = document.getElementById("turnText");
const ingredientGrid = document.getElementById("ingredientGrid");
const resultPanel = document.getElementById("resultPanel");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const mvpPick = document.getElementById("mvpPick");
const weakPick = document.getElementById("weakPick");
const resetButton = document.getElementById("resetButton");

const stats = ["fresh", "protein", "color", "fullness", "value", "edge"];
const statNames = {
  fresh: "さっぱり",
  protein: "タンパク",
  color: "彩り",
  fullness: "腹持ち",
  value: "コスパ",
  edge: "クセ",
};

const themes = [
  {
    name: "夏バテ対策サラダ",
    flavor: "涼しさと回復力。重すぎる具材はベンチ。",
    weights: { fresh: 4, protein: 3, color: 2, fullness: -1, value: 1, edge: 0 },
  },
  {
    name: "筋トレ後サラダ",
    flavor: "タンパク質が正義。彩りだけの指名は荒れる。",
    weights: { fresh: 1, protein: 5, color: 1, fullness: 3, value: 1, edge: -1 },
  },
  {
    name: "映えサラダ",
    flavor: "皿の上で写真映えするスターを集めたい。",
    weights: { fresh: 2, protein: 1, color: 5, fullness: 0, value: -1, edge: 2 },
  },
  {
    name: "節約サラダ",
    flavor: "安い、うまい、ちゃんと食べた気がする。",
    weights: { fresh: 1, protein: 2, color: 1, fullness: 3, value: 5, edge: -1 },
  },
  {
    name: "深夜に許されるサラダ",
    flavor: "軽さが大事。でも空腹をなかったことにはできない。",
    weights: { fresh: 4, protein: 2, color: 1, fullness: 1, value: 0, edge: -2 },
  },
  {
    name: "給食サラダ",
    flavor: "なつかしさ、量、妙な甘さ。スター性より安心感。",
    weights: { fresh: 1, protein: 1, color: 2, fullness: 3, value: 4, edge: -1 },
  },
];

const ingredients = [
  { name: "レタス", emoji: "🥬", fresh: 5, protein: 0, color: 2, fullness: 1, value: 3, edge: 0 },
  { name: "トマト", emoji: "🍅", fresh: 4, protein: 0, color: 5, fullness: 1, value: 2, edge: 1 },
  { name: "鶏むね", emoji: "🍗", fresh: 1, protein: 5, color: 1, fullness: 4, value: 3, edge: 0 },
  { name: "豆腐", emoji: "⬜", fresh: 3, protein: 4, color: 1, fullness: 3, value: 4, edge: 0 },
  { name: "ゆで卵", emoji: "🥚", fresh: 1, protein: 4, color: 3, fullness: 4, value: 3, edge: 0 },
  { name: "アボカド", emoji: "🥑", fresh: 2, protein: 1, color: 4, fullness: 5, value: 1, edge: 2 },
  { name: "きゅうり", emoji: "🥒", fresh: 5, protein: 0, color: 3, fullness: 1, value: 4, edge: 0 },
  { name: "コーン", emoji: "🌽", fresh: 2, protein: 1, color: 4, fullness: 3, value: 5, edge: 1 },
  { name: "ツナ", emoji: "🐟", fresh: 1, protein: 5, color: 1, fullness: 4, value: 3, edge: 1 },
  { name: "紫玉ねぎ", emoji: "🧅", fresh: 3, protein: 0, color: 5, fullness: 1, value: 2, edge: 4 },
  { name: "海藻", emoji: "🌊", fresh: 4, protein: 1, color: 2, fullness: 2, value: 4, edge: 2 },
  { name: "クルトン", emoji: "🍞", fresh: 0, protein: 1, color: 2, fullness: 3, value: 2, edge: 3 },
  { name: "りんご", emoji: "🍎", fresh: 4, protein: 0, color: 4, fullness: 2, value: 2, edge: 3 },
  { name: "春雨", emoji: "🍜", fresh: 2, protein: 0, color: 1, fullness: 4, value: 5, edge: 1 },
];

let currentTheme;
let pool = [];
let player = [];
let cpu = [];
let finished = false;
let locked = false;

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function scoreIngredient(item, theme = currentTheme) {
  return stats.reduce((sum, stat) => sum + item[stat] * theme.weights[stat], 0);
}

function scoreTeam(picks) {
  const raw = picks.reduce((sum, item) => sum + scoreIngredient(item), 0);
  const colorBonus = new Set(picks.map((item) => item.emoji)).size >= 5 ? 8 : 0;
  const balancePenalty = picks.filter((item) => item.edge >= 3).length >= 3 ? -10 : 0;
  return Math.max(0, raw + colorBonus + balancePenalty);
}

function strongestTraits(item) {
  return stats
    .filter((stat) => item[stat] >= 4)
    .map((stat) => statNames[stat])
    .slice(0, 2)
    .join(" / ");
}

function createChip(item) {
  const chip = document.createElement("span");
  chip.className = "pick-chip";
  chip.textContent = item.emoji;
  chip.title = item.name;
  return chip;
}

function renderPicks(container, picks) {
  container.innerHTML = "";
  picks.forEach((item) => container.appendChild(createChip(item)));
}

function createCard(item) {
  const button = document.createElement("button");
  button.className = "ingredient-card";
  button.type = "button";
  button.disabled = locked || finished || player.length >= 5 || !pool.includes(item);
  button.setAttribute("aria-label", `${item.name}を指名`);

  const powerDots = Array.from({ length: 5 }, (_, index) => {
    const dot = document.createElement("span");
    dot.className = index < Math.min(5, Math.max(0, Math.round(scoreIngredient(item) / 7))) ? "dot on" : "dot";
    return dot;
  });

  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = item.emoji;

  const name = document.createElement("span");
  name.className = "ingredient-name";
  name.textContent = item.name;

  const traits = document.createElement("span");
  traits.className = "trait-line";
  traits.textContent = strongestTraits(item) || "地味に効く";

  const power = document.createElement("span");
  power.className = "power";
  powerDots.forEach((dot) => power.appendChild(dot));

  button.append(emoji, name, traits, power);
  button.addEventListener("click", () => draftPlayer(item));
  return button;
}

function renderPool() {
  ingredientGrid.innerHTML = "";
  pool.forEach((item) => ingredientGrid.appendChild(createCard(item)));
}

function renderScores() {
  renderPicks(playerPicks, player);
  renderPicks(cpuPicks, cpu);
  playerScore.textContent = scoreTeam(player);
  cpuScore.textContent = scoreTeam(cpu);
  roundBadge.textContent = finished ? "終了" : `${player.length + 1}巡目`;
  turnText.textContent = finished ? "ドラフト完了" : "あなたの指名";
}

function removeFromPool(item) {
  pool = pool.filter((entry) => entry !== item);
}

function cpuDraft() {
  if (cpu.length >= 5 || pool.length === 0) return;

  const ranked = [...pool].sort((a, b) => scoreIngredient(b) - scoreIngredient(a));
  const top = ranked.slice(0, Math.min(3, ranked.length));
  const pick = Math.random() < 0.78 ? top[0] : pickRandom(top);
  cpu.push(pick);
  removeFromPool(pick);
}

function draftPlayer(item) {
  if (locked || finished || !pool.includes(item) || player.length >= 5) return;

  player.push(item);
  removeFromPool(item);

  if (player.length < 5) {
    locked = true;
    turnText.textContent = "CPU指名中";
    renderPool();
    renderScores();
    window.setTimeout(() => {
      cpuDraft();
      locked = false;
      renderAll();
    }, 360);
    return;
  }

  cpuDraft();
  finished = true;
  renderAll();
  showResult();
}

function bestPick(picks) {
  return [...picks].sort((a, b) => scoreIngredient(b) - scoreIngredient(a))[0];
}

function weakestPick(picks) {
  return [...picks].sort((a, b) => scoreIngredient(a) - scoreIngredient(b))[0];
}

function showResult() {
  const playerTotal = scoreTeam(player);
  const cpuTotal = scoreTeam(cpu);
  const best = bestPick(player);
  const weak = weakestPick(player);
  const diff = playerTotal - cpuTotal;

  resultPanel.hidden = false;
  mvpPick.textContent = `${best.emoji} ${best.name}`;
  weakPick.textContent = `${weak.emoji} ${weak.name}`;

  if (diff > 8) {
    resultTitle.textContent = "ドラフト勝利";
    resultCopy.textContent = `${currentTheme.name}に必要な具材を先に押さえた。CPUは会見で「読み負けです」とだけ話した。`;
  } else if (diff >= 0) {
    resultTitle.textContent = "僅差で勝利";
    resultCopy.textContent = `皿の完成度はギリギリ上。${weak.name}の起用には議論が残るが、勝ちは勝ち。`;
  } else if (diff > -9) {
    resultTitle.textContent = "惜敗";
    resultCopy.textContent = `方針は悪くない。ただCPUに${bestPick(cpu).name}を渡した代償が少し重かった。`;
  } else {
    resultTitle.textContent = "指名再考";
    resultCopy.textContent = `テーマとの相性でCPUに押し切られた。次はスター具材を情で逃がさない。`;
  }
}

function renderAll() {
  renderScores();
  renderPool();
}

function startGame() {
  currentTheme = pickRandom(themes);
  pool = [...ingredients].sort(() => Math.random() - 0.5).slice(0, 12);
  player = [];
  cpu = [];
  finished = false;
  locked = false;
  resultPanel.hidden = true;
  themeName.textContent = currentTheme.name;
  themeFlavor.textContent = currentTheme.flavor;
  renderAll();
}

resetButton.addEventListener("click", startGame);
document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });

startGame();
