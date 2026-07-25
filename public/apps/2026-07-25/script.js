const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const orders = [
  { size: 46, label: "小盛り", flavor: "れもん", text: "小さめで、れもんをさっぱりと。", color: "#e9a250" },
  { size: 68, label: "ふつう", flavor: "メロン", text: "ふわふわで、メロンをお願いします。", color: "#657bd1" },
  { size: 88, label: "大盛り", flavor: "いちご", text: "山盛りで、いちごをたっぷり！", color: "#e75b4e" },
  { size: 58, label: "ふつう", flavor: "いちご", text: "いちご味を、少し控えめの量で。", color: "#8e6fb2" },
  { size: 80, label: "大盛り", flavor: "れもん", text: "暑くてたまらん。れもんを大盛りで！", color: "#4e9a77" },
  { size: 52, label: "小盛り", flavor: "メロン", text: "小ぶりなメロン味をひとつ。", color: "#d47c49" }
];

const startScreen = $("#startScreen");
const resultScreen = $("#resultScreen");
const shaveBtn = $("#shaveBtn");
const serveBtn = $("#serveBtn");
const machine = $(".machine");
const ice = $("#ice");
const amountBar = $("#amountBar");
const targetMark = $("#targetMark");
const feedback = $("#feedback");

let currentOrder;
let amount = 0;
let selectedFlavor = "";
let customerIndex = 0;
let score = 0;
let time = 20;
let timerId = null;
let shaveFrame = null;
let running = false;
let served = 0;
let perfects = 0;

function pickOrder() {
  const candidates = orders.filter(order => order !== currentOrder);
  currentOrder = candidates[Math.floor(Math.random() * candidates.length)];
}

function startGame() {
  clearInterval(timerId);
  score = 0;
  time = 20;
  customerIndex = 0;
  served = 0;
  perfects = 0;
  running = true;
  startScreen.classList.remove("is-visible");
  resultScreen.classList.remove("is-visible");
  nextCustomer();
  renderHud();
  timerId = setInterval(() => {
    time -= 1;
    renderHud();
    if (time <= 0) finishGame();
  }, 1000);
}

function nextCustomer() {
  pickOrder();
  amount = 0;
  selectedFlavor = "";
  feedback.textContent = "";
  ice.className = "ice";
  $$(".flavor").forEach(button => button.classList.remove("is-selected"));
  $("#orderText").textContent = currentOrder.text;
  $("#orderSize").textContent = currentOrder.label;
  $("#orderFlavor").textContent = currentOrder.flavor;
  $("#customerNo").textContent = Math.min(customerIndex + 1, 5);
  $(".customer-body").style.background = currentOrder.color;
  targetMark.style.left = `${currentOrder.size}%`;
  updateIce();
}

function renderHud() {
  $("#score").textContent = score;
  $("#time").textContent = Math.max(0, time);
}

function updateIce() {
  ice.style.setProperty("--amount", amount);
  amountBar.style.width = `${amount}%`;
  $("#amountText").textContent =
    amount < 8 ? "まだ空っぽ" :
    amount < 45 ? "小盛り" :
    amount < 76 ? "ふつう" :
    amount < 96 ? "大盛り" : "こぼれそう！";
  serveBtn.disabled = amount < 12 || !selectedFlavor || !running;
}

function beginShaving(event) {
  if (!running) return;
  event.preventDefault();
  shaveBtn.setPointerCapture?.(event.pointerId);
  shaveBtn.classList.add("is-active");
  machine.classList.add("is-running");
  let previous = performance.now();
  const shave = (now) => {
    amount = Math.min(100, amount + (now - previous) * 0.024);
    previous = now;
    updateIce();
    if (amount < 100 && shaveBtn.classList.contains("is-active")) {
      shaveFrame = requestAnimationFrame(shave);
    } else {
      stopShaving();
    }
  };
  shaveFrame = requestAnimationFrame(shave);
}

function stopShaving() {
  cancelAnimationFrame(shaveFrame);
  shaveBtn.classList.remove("is-active");
  machine.classList.remove("is-running");
}

function selectFlavor(button) {
  if (!running || amount < 8) {
    feedback.textContent = "先に氷を削りましょう";
    return;
  }
  selectedFlavor = button.dataset.flavor;
  $$(".flavor").forEach(item => item.classList.toggle("is-selected", item === button));
  ice.className = `ice has-syrup ${button.classList[1]}`;
  feedback.textContent = `${selectedFlavor}蜜をかけました`;
  updateIce();
}

function serve() {
  if (serveBtn.disabled || !running) return;
  const amountDiff = Math.abs(amount - currentOrder.size);
  const amountPoints = Math.max(0, Math.round(65 - amountDiff * 1.8));
  const flavorPoints = selectedFlavor === currentOrder.flavor ? 35 : 0;
  const earned = amountPoints + flavorPoints;
  score += earned;
  served += 1;

  if (earned >= 90) {
    perfects += 1;
    feedback.textContent = `ぴったり！ ＋${earned}点`;
  } else if (flavorPoints === 0) {
    feedback.textContent = `味が違います… ＋${earned}点`;
  } else if (amountDiff > 18) {
    feedback.textContent = `量がおしい！ ＋${earned}点`;
  } else {
    feedback.textContent = `いい仕上がり！ ＋${earned}点`;
  }

  renderHud();
  customerIndex += 1;
  running = false;
  serveBtn.disabled = true;
  setTimeout(() => {
    if (time <= 0 || customerIndex >= 5) {
      finishGame();
    } else {
      running = true;
      nextCustomer();
    }
  }, 850);
}

function finishGame() {
  if (!timerId && resultScreen.classList.contains("is-visible")) return;
  clearInterval(timerId);
  timerId = null;
  running = false;
  stopShaving();
  serveBtn.disabled = true;

  let stamp = "涼";
  let title = "今日もいい氷でした";
  let copy = "町に、ささやかな涼を届けました。";
  if (score >= 430) {
    stamp = "極";
    title = "氷の名人";
    copy = "ふわりと消える、見事なかき氷です。";
  } else if (score >= 330) {
    stamp = "涼";
    title = "評判の氷屋さん";
    copy = "また明日も、と声をかけられました。";
  } else if (score < 220) {
    stamp = "努";
    title = "明日はもっとふわふわに";
    copy = "氷のごきげんを、もう少し見てみましょう。";
  }

  $("#resultStamp").textContent = stamp;
  $("#resultTitle").textContent = title;
  $("#resultScore").textContent = `${score}点`;
  $("#resultCopy").textContent = copy;
  $("#resultStats").innerHTML = `<span>${served}杯お渡し</span><span>ぴったり ${perfects}杯</span>`;
  resultScreen.classList.add("is-visible");
}

$("#startBtn").addEventListener("click", startGame);
$("#retryBtn").addEventListener("click", startGame);
shaveBtn.addEventListener("pointerdown", beginShaving);
shaveBtn.addEventListener("pointerup", stopShaving);
shaveBtn.addEventListener("pointercancel", stopShaving);
shaveBtn.addEventListener("pointerleave", stopShaving);
$$(".flavor").forEach(button => button.addEventListener("click", () => selectFlavor(button)));
serveBtn.addEventListener("click", serve);
window.addEventListener("blur", stopShaving);

pickOrder();
targetMark.style.left = `${currentOrder.size}%`;
