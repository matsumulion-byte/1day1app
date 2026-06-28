const startScreen = document.getElementById("startScreen");
const resultScreen = document.getElementById("resultScreen");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const cashEl = document.getElementById("cash");
const assetEl = document.getElementById("asset");
const timeEl = document.getElementById("time");
const creditTextEl = document.getElementById("creditText");
const creditBarEl = document.getElementById("creditBar");
const newsEl = document.getElementById("news");
const marketEl = document.getElementById("market");
const toastEl = document.getElementById("toast");
const logEl = document.getElementById("log");

const resultTitleEl = document.getElementById("resultTitle");
const resultAssetEl = document.getElementById("resultAsset");
const resultTextEl = document.getElementById("resultText");
const resultSmallEl = document.getElementById("resultSmall");

const masterItems = [
  { id: "castella", name: "カステラ", icon: "🍰", base: 130, tags: ["長崎", "菓子"] },
  { id: "coffee", name: "コーヒー", icon: "☕", base: 160, tags: ["横浜", "流行"] },
  { id: "hat", name: "シルクハット", icon: "🎩", base: 230, tags: ["文明開化", "服飾"] },
  { id: "telescope", name: "望遠鏡", icon: "🔭", base: 270, tags: ["舶来", "機械"] },
  { id: "perfume", name: "香水", icon: "🧴", base: 190, tags: ["舶来", "贅沢"] },
  { id: "squid", name: "イカ", icon: "🦑", base: 90, tags: ["函館", "海産"] },
  { id: "chikuwa", name: "ちくわ", icon: "🟫", base: 45, tags: ["謎"] },
  { id: "matsumura", name: "松村", icon: "👓", base: 300, tags: ["在庫過多"] },
];

const newsPool = [
  {
    text: "横浜でコーヒーが流行。眠れない商人が増えています。",
    target: "coffee",
    multiplier: 1.55
  },
  {
    text: "長崎でカステラが話題。甘いものはだいたい売れます。",
    target: "castella",
    multiplier: 1.45
  },
  {
    text: "函館でイカが暴騰。海がざわついています。",
    target: "squid",
    multiplier: 1.85
  },
  {
    text: "文明開化ブーム。シルクハットをかぶれば偉そうに見えます。",
    target: "hat",
    multiplier: 1.6
  },
  {
    text: "遠くを見たい人が急増。望遠鏡が売れています。",
    target: "telescope",
    multiplier: 1.45
  },
  {
    text: "香水ブーム到来。港が急にいい匂いです。",
    target: "perfume",
    multiplier: 1.5
  },
  {
    text: "ちくわを舶来品と言い張る商人が現れました。",
    target: "chikuwa",
    multiplier: 0.55
  },
  {
    text: "松村、在庫過多。市場が静まり返っています。",
    target: "matsumura",
    multiplier: 0.35
  },
  {
    text: "港全体が浮かれています。なんでも少し高く売れそうです。",
    target: "all",
    multiplier: 1.2
  },
  {
    text: "買い手が急に冷静になりました。全体的に値崩れです。",
    target: "all",
    multiplier: 0.82
  }
];

let items = [];
let cash = 1000;
let time = 35;
let credit = 100;
let gameActive = false;
let priceTimer = null;
let countdownTimer = null;
let newsTimer = null;
let toastTimer = null;
let logs = [];
let currentNews = null;
let labelUses = 0;

function yen(num) {
  return `¥${Math.round(num).toLocaleString()}`;
}

function cloneItems() {
  items = masterItems.map(item => ({
    ...item,
    price: item.base,
    prevPrice: item.base,
    stock: 0,
    labeledUntil: 0,
    trend: 0,
  }));
}

function startGame() {
  clearTimers();

  cash = 1000;
  time = 35;
  credit = 100;
  labelUses = 0;
  currentNews = null;
  logs = [];
  gameActive = true;

  cloneItems();

  startScreen.classList.remove("active");
  resultScreen.classList.remove("active");

  addLog("港が開きました。とにかく儲けてください。");
  updatePrices(true);
  render();
  showToast("開港しました");

  priceTimer = setInterval(() => {
    updatePrices(false);
    render();
  }, 1400);

  newsTimer = setInterval(() => {
    triggerNews();
    updatePrices(false);
    render();
  }, 5600);

  countdownTimer = setInterval(() => {
    time--;
    if (time <= 0) endGame("time");
    renderHud();
  }, 1000);
}

function clearTimers() {
  clearInterval(priceTimer);
  clearInterval(countdownTimer);
  clearInterval(newsTimer);
  clearTimeout(toastTimer);
}

function updatePrices(initial) {
  const now = Date.now();

  items.forEach(item => {
    item.prevPrice = item.price;

    if (initial) {
      item.price = item.base;
      return;
    }

    let newsMultiplier = 1;

    if (currentNews) {
      if (currentNews.target === "all" || currentNews.target === item.id) {
        newsMultiplier = currentNews.multiplier;
      }
    }

    const randomSwing = 0.82 + Math.random() * 0.42;
    const correction = 1 + ((item.base - item.price) / item.base) * 0.12;
    const labelBoost = item.labeledUntil > now ? 1.45 : 1;

    let newPrice = item.price * randomSwing * correction * newsMultiplier * labelBoost;

    newPrice = Math.max(8, Math.min(item.base * 3.2, newPrice));
    item.price = Math.round(newPrice);

    item.trend = item.price - item.prevPrice;
  });
}

function triggerNews() {
  currentNews = newsPool[Math.floor(Math.random() * newsPool.length)];
  newsEl.textContent = currentNews.text;
  addLog(`号外：${currentNews.text}`);
}

function buyItem(id) {
  if (!gameActive) return;

  const item = items.find(x => x.id === id);
  if (!item) return;

  if (cash < item.price) {
    showToast("金が足りません");
    addLog(`${item.name}を仕入れようとしたが、金が足りない。`);
    return;
  }

  cash -= item.price;
  item.stock++;

  addLog(`${item.name}を${yen(item.price)}で仕入れ。`);
  showToast(`${item.name}を仕入れました`);
  render();
}

function sellItem(id) {
  if (!gameActive) return;

  const item = items.find(x => x.id === id);
  if (!item) return;

  if (item.stock <= 0) {
    showToast("在庫がありません");
    return;
  }

  const sellPrice = item.price;
  cash += sellPrice;
  item.stock--;

  const diff = sellPrice - item.base;
  if (diff >= 0) {
    addLog(`${item.name}を${yen(sellPrice)}で売却。よい商売です。`);
  } else {
    addLog(`${item.name}を${yen(sellPrice)}で売却。損切りです。`);
  }

  showToast(`${item.name}を売却しました`);
  render();
}

function labelItem(id) {
  if (!gameActive) return;

  const item = items.find(x => x.id === id);
  if (!item) return;

  const now = Date.now();

  if (item.labeledUntil > now) {
    showToast("すでに舶来品と言い張っています");
    return;
  }

  labelUses++;

  const cost = Math.round(35 + labelUses * 8);
  if (cash < cost) {
    showToast("ラベル代がありません");
    return;
  }

  cash -= cost;
  item.labeledUntil = now + 5200;

  let creditLoss = 7;

  if (item.id === "chikuwa") creditLoss = 22;
  if (item.id === "matsumura") creditLoss = 30;
  if (item.id === "squid") creditLoss = 14;

  credit = Math.max(0, credit - creditLoss);

  addLog(`${item.name}に舶来品ラベルを貼った。信用 -${creditLoss}。`);
  showToast(`${item.name}を舶来品と言い張った`);

  if (credit <= 0) {
    render();
    endGame("credit");
    return;
  }

  updatePrices(false);
  render();
}

function calcAsset() {
  const stockValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);
  return cash + stockValue;
}

function renderHud() {
  cashEl.textContent = yen(cash);
  assetEl.textContent = yen(calcAsset());
  timeEl.textContent = time;
  creditTextEl.textContent = credit;

  creditBarEl.style.width = `${credit}%`;

  if (credit >= 60) {
    creditBarEl.style.background = "#1d9c63";
  } else if (credit >= 30) {
    creditBarEl.style.background = "#d9a21f";
  } else {
    creditBarEl.style.background = "#d92b24";
  }
}

function renderMarket() {
  const now = Date.now();

  marketEl.innerHTML = items.map(item => {
    const trendClass = item.trend > 0 ? "up" : item.trend < 0 ? "down" : "";
    const trendText = item.trend > 0 ? `▲ ${yen(item.trend)}` : item.trend < 0 ? `▼ ${yen(Math.abs(item.trend))}` : "－";
    const isLabeled = item.labeledUntil > now;
    const isHot = item.trend > item.base * 0.25;
    const isCrash = item.trend < -item.base * 0.25;

    return `
      <article class="card ${isLabeled ? "labeled" : ""} ${isHot ? "hot" : ""} ${isCrash ? "crash" : ""}">
        <div class="label">舶来品</div>
        <div class="icon">${item.icon}</div>
        <div class="name">${item.name}</div>
        <div class="price">${yen(item.price)}</div>
        <div class="diff ${trendClass}">${trendText}</div>
        <div class="stock">在庫：${item.stock}</div>
        <div class="actions">
          <button onclick="buyItem('${item.id}')">仕入れ</button>
          <button class="sellBtn" onclick="sellItem('${item.id}')" ${item.stock <= 0 ? "disabled" : ""}>売却</button>
          <button class="labelBtn" onclick="labelItem('${item.id}')">${isLabeled ? "主張中" : "舶来品ラベル"}</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderLog() {
  logEl.innerHTML = logs.slice(-4).map(line => `<div class="logLine">${line}</div>`).join("");
}

function render() {
  renderHud();
  renderMarket();
  renderLog();
}

function addLog(text) {
  logs.push(text);
  if (logs.length > 20) logs.shift();
  renderLog();
}

function showToast(text) {
  clearTimeout(toastTimer);
  toastEl.textContent = text;
  toastEl.classList.add("show");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 900);
}

function endGame(reason) {
  if (!gameActive) return;

  gameActive = false;
  clearTimers();

  const finalAsset = calcAsset();
  const profit = finalAsset - 1000;

  resultAssetEl.textContent = yen(finalAsset);

  if (reason === "credit") {
    resultTitleEl.textContent = "信用ゼロ";
    resultTextEl.innerHTML = "舶来品と言い張りすぎました。<br>商売ではなく、だいたい詐欺です。";
  } else if (finalAsset >= 2200) {
    resultTitleEl.textContent = "貿易王";
    resultTextEl.innerHTML = "大儲けです。<br>ほぼ文明開化を私物化しました。";
  } else if (finalAsset >= 1500) {
    resultTitleEl.textContent = "港のやり手";
    resultTextEl.innerHTML = "まあまあ儲かりました。<br>港でよく見る商人です。";
  } else if (finalAsset >= 1000) {
    resultTitleEl.textContent = "普通の商人";
    resultTextEl.innerHTML = "赤字ではありません。<br>ただし歴史には残りません。";
  } else {
    resultTitleEl.textContent = "開港破産";
    resultTextEl.innerHTML = "開港したのに破産しました。<br>向いていません。";
  }

  const stockSummary = items
    .filter(item => item.stock > 0)
    .map(item => `${item.name}×${item.stock}`)
    .join("、") || "在庫なし";

  resultSmallEl.innerHTML = `
    利益：${profit >= 0 ? "+" : ""}${yen(profit)}<br>
    信用：${credit}<br>
    最終在庫：${stockSummary}
  `;

  resultScreen.classList.add("active");
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

window.buyItem = buyItem;
window.sellItem = sellItem;
window.labelItem = labelItem;
