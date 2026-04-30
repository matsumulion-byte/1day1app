const asset = (p) => new URL(p, import.meta.url).toString();

const whoItems = [
  "松村と",
  "架空の友達と",
  "未来の自分と",
  "左から二番目の人と",
  "まだ予定を聞いてない人と",
  "なんか毎年いる人と",
  "誘った記憶がない人と",
  "休みの日だけ元気な人と",
  "たまたま隣にいた人と",
  "去年も見た人と",
  "集合場所だけ知ってる人と",
  "急に来れなくなりそうな人と",
];

const whereItems = [
  "サービスエリアで",
  "やたら混んでる駅で",
  "何もない河川敷で",
  "近所のイオンで",
  "予約してない旅館で",
  "まだ開いてない店の前で",
  "実家の廊下で",
  "Googleマップ上の海で",
  "目的地の手前で",
  "帰り道の途中で",
  "よく知らない道の駅で",
  "名前だけ聞いた公園で",
];

const whatItems = [
  "渋滞を眺める",
  "予定を立て直す",
  "たこ焼きを分ける",
  "写真だけ撮って帰る",
  "休んだ気になる",
  "目的地を変更する",
  "何もしてないのに疲れる",
  "帰りの心配をする",
  "充電器を探す",
  "人混みに飲まれる",
  "集合写真に写り損ねる",
  "現地の空気だけ吸う",
];

const slots = [
  {
    element: document.querySelector('[data-slot="0"]'),
    text: document.getElementById("slotWho"),
    items: whoItems,
    value: "",
    timer: null,
  },
  {
    element: document.querySelector('[data-slot="1"]'),
    text: document.getElementById("slotWhere"),
    items: whereItems,
    value: "",
    timer: null,
  },
  {
    element: document.querySelector('[data-slot="2"]'),
    text: document.getElementById("slotWhat"),
    items: whatItems,
    value: "",
    timer: null,
  },
];

const mainButton = document.getElementById("mainButton");
const resetButton = document.getElementById("resetButton");
const note = document.getElementById("note");

const modal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const modalCloseButton = document.getElementById("modalCloseButton");

let isRunning = false;
let stopIndex = 0;

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomItemWithBoost(items, boostedItem, boost = 1) {
  const weighted = items.flatMap((item) =>
    item === boostedItem ? Array(boost + 1).fill(item) : [item],
  );
  return randomItem(weighted);
}

function startSlot(slot) {
  slot.element.classList.remove("stopped");
  slot.element.classList.add("spinning");

  slot.timer = setInterval(() => {
    slot.text.textContent = randomItem(slot.items);
  }, 70);
}

function stopSlot(slot) {
  clearInterval(slot.timer);
  slot.timer = null;

  slot.value =
    slot.items === whoItems
      ? randomItemWithBoost(slot.items, "松村と", 4)
      : randomItem(slot.items);
  slot.text.textContent = slot.value;

  slot.element.classList.remove("spinning");
  slot.element.classList.add("stopped");
}

function startRoulette() {
  isRunning = true;
  stopIndex = 0;

  slots.forEach((slot) => {
    slot.value = "";
    startSlot(slot);
  });

  mainButton.textContent = "誰とを止める";
  resetButton.hidden = true;
  note.textContent = "まずは「誰と」を止めます。";
}

function stopNextSlot() {
  if (!isRunning) return;

  stopSlot(slots[stopIndex]);
  stopIndex += 1;

  if (stopIndex === 1) {
    mainButton.textContent = "どこでを止める";
    note.textContent = "次は「どこで」を止めます。";
    return;
  }

  if (stopIndex === 2) {
    mainButton.textContent = "何をするを止める";
    note.textContent = "最後に「何をする」を止めます。";
    return;
  }

  finishRoulette();
}

function finishRoulette() {
  isRunning = false;

  mainButton.textContent = "結果を見る";
  mainButton.disabled = true;
  note.textContent = "今年のGW予定が決まりました。";

  setTimeout(() => {
    showResult();
    mainButton.disabled = false;
    resetButton.hidden = false;
  }, 450);
}

function showResult() {
  const [who, where, what] = slots.map((slot) => slot.value);

  resultText.textContent = `${who}、${where}、${what}。`;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeResult() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function resetRoulette() {
  closeResult();

  slots.forEach((slot) => {
    clearInterval(slot.timer);
    slot.timer = null;
    slot.value = "";
    slot.text.textContent = "？？？";
    slot.element.classList.remove("spinning", "stopped");
  });

  isRunning = false;
  stopIndex = 0;

  mainButton.textContent = "スタート";
  mainButton.disabled = false;
  resetButton.hidden = true;
  note.textContent = "ボタンを押すとルーレットが回ります。";
}

mainButton.addEventListener("click", () => {
  if (!isRunning && stopIndex === 0) {
    startRoulette();
    return;
  }

  if (isRunning) {
    stopNextSlot();
  }
});

resetButton.addEventListener("click", resetRoulette);
modalCloseButton.addEventListener("click", resetRoulette);

modal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    resetRoulette();
  }
});

window.addEventListener("beforeunload", () => {
  slots.forEach((slot) => clearInterval(slot.timer));
});