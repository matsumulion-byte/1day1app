const ideas = {
  near: [
    "エレベーターやドアを一拍長く押さえる",
    "目が合った人に先に会釈する",
    "落ちている小さなゴミをひとつ拾う",
    "レジや受付で最後に一言お礼を足す",
    "困っていそうな人に「大丈夫ですか」と聞く",
    "誰かの作業スペースを少し整える"
  ],
  work: [
    "返信が遅れている人に短く助け舟を出す",
    "誰かの良かった仕事を具体的にひとつ褒める",
    "共有ファイル名を一つだけ分かりやすく直す",
    "次の人が迷わないようにメモを一行残す",
    "忙しそうな人に5分だけ代われることを聞く",
    "会議前にリンクや資料を先に貼っておく"
  ],
  town: [
    "倒れている自転車や看板を戻せる範囲で直す",
    "道を譲られたら振り返ってお礼する",
    "募金箱や地域掲示を一度ちゃんと見る",
    "店員さんの名前札を見て名前つきでお礼する",
    "濡れた床や段差に気づいたら近くの人に伝える",
    "次に使う人のために席や台をきれいにする"
  ],
  self: [
    "5分だけ未来の自分が楽になる片付けをする",
    "今日の自分に水を一杯出す",
    "後回しの連絡を一通だけ短く返す",
    "明日の最初の一手を紙に書いておく",
    "できたことを一つだけ声に出して認める",
    "寝る前の画面時間を13分だけ減らす"
  ]
};

const targetLabels = {
  near: "近くの人",
  work: "仕事・学校",
  town: "まち",
  self: "自分"
};

const wheel = document.querySelector("#wheel");
const spinButton = document.querySelector("#spinButton");
const resultModal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultMeta = document.querySelector("#resultMeta");
const closeModal = document.querySelector("#closeModal");

let currentResult = null;
let spinIndex = 0;
let wheelRotation = 0;

function selectedTarget() {
  return document.querySelector("input[name='target']:checked").value;
}

function pickKindness() {
  const target = selectedTarget();
  const pool = ideas[target];
  const seed = Date.now() + spinIndex * 613;
  const index = seed % pool.length;
  currentResult = {
    target,
    text: pool[index]
  };
}

function renderResult() {
  resultTitle.textContent = currentResult.text;
  resultMeta.textContent = targetLabels[currentResult.target];
  resultModal.hidden = false;
  closeModal.focus();
}

function clearResult() {
  currentResult = null;
  resultModal.hidden = true;
}

function spin() {
  spinIndex += 1;
  spinButton.disabled = true;
  pickKindness();

  const slice = ideas[currentResult.target].indexOf(currentResult.text);
  const segmentCenter = slice * 60 + 30;
  const extraTurns = 4 + (spinIndex % 3);
  const pointerAngle = 270;
  const targetRotation = (pointerAngle - segmentCenter + 360) % 360;
  const currentRotation = ((wheelRotation % 360) + 360) % 360;
  const forwardDelta = (targetRotation - currentRotation + 360) % 360;
  wheelRotation += extraTurns * 360 + forwardDelta;
  wheel.style.setProperty("--rotation", `${wheelRotation}deg`);

  window.setTimeout(() => {
    renderResult();
    spinButton.disabled = false;
  }, 2100);
}

spinButton.addEventListener("click", spin);
closeModal.addEventListener("click", clearResult);
resultModal.addEventListener("click", (event) => {
  if (event.target.dataset.close) {
    clearResult();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !resultModal.hidden) {
    clearResult();
  }
});
document.querySelectorAll("input[name='target']").forEach((input) => {
  input.addEventListener("change", () => {
    clearResult();
  });
});

clearResult();
