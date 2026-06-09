const cardEl = document.getElementById("card");
const caseCountEl = document.getElementById("caseCount");
const foundCountEl = document.getElementById("foundCount");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const hintBtn = document.getElementById("hintBtn");
const nextBtn = document.getElementById("nextBtn");
const resultEl = document.getElementById("result");
const resultTitleEl = document.getElementById("resultTitle");
const resultTextEl = document.getElementById("resultText");
const retryBtn = document.getElementById("retryBtn");

const cases = [
  {
    icon: "A",
    sender: [{ text: "Amazonセキュリティ", bad: false }],
    address: [{ text: "support@amaz0n-login.example", bad: true, reason: "Amazonのoが数字の0に置き換わっています。" }],
    subject: [
      { text: "【緊急】", bad: true, reason: "急がせる言葉はフィッシングの定番です。" },
      { text: "アカウント停止のお知らせ", bad: false }
    ],
    url: [
      { text: "https://", bad: false },
      { text: "amaz0n-login", bad: true, reason: "正規ドメインに見せかけた別物です。" },
      { text: ".support", bad: false }
    ],
    body: [
      { text: "24時間以内", bad: true, reason: "短い期限で焦らせています。" },
      { text: "に本人確認しない場合、永久停止されます。", bad: false }
    ],
    button: [
      { text: "今すぐ確認", bad: false }
    ]
  },
  {
    icon: "宅",
    sender: [{ text: "宅配便のお知らせ", bad: false }],
    address: [{ text: "notice@kuroneko.co.jp", bad: false }],
    subject: [
      { text: "荷物の配達予定があります", bad: false }
    ],
    url: [
      { text: "https://www.kuroneko.co.jp", bad: false }
    ],
    body: [
      { text: "本日18:00-20:00に配達予定です。アプリでも確認できます。", bad: false }
    ],
    button: [
      { text: "公式アプリで確認", bad: false }
    ],
    safe: true
  },
  {
    icon: "林",
    sender: [{ text: "三菱UFJ銀行", bad: false }],
    address: [{ text: "alert@muFG-bank-security.net", bad: true, reason: "送信元ドメインが公式と違います。" }],
    subject: [
      { text: "取引を制限しました", bad: false }
    ],
    url: [
      { text: "https://mufg-bank-security.net/login", bad: true, reason: "公式サイトに見せかけた別ドメインです。" }
    ],
    body: [
      { text: "異常ログインを検知しました。", bad: false },
      { text: "暗証番号とワンタイムパスワード", bad: true, reason: "暗証番号やワンタイムパスワード入力要求は危険です。" },
      { text: "を入力してください。", bad: false }
    ],
    button: [
      { text: "制限を解除する", bad: true, reason: "安全確認を装ってログインさせる誘導です。" }
    ]
  },
  {
    icon: "社",
    sender: [{ text: "社内 情シス", bad: false }],
    address: [{ text: "it-helpdesk@company.example", bad: false }],
    subject: [
      { text: "パスワード変更期限が近づいています", bad: false }
    ],
    url: [
      { text: "社内ポータルから確認してください", bad: false }
    ],
    body: [
      { text: "メール内リンクではなく、ブックマーク済みの社内ポータルから変更してください。", bad: false }
    ],
    button: [
      { text: "これは公式確認案件", bad: false }
    ],
    safe: true
  },
  {
    icon: "P",
    sender: [{ text: "PayPaIサポート", bad: true, reason: "最後の文字が小文字lではなく大文字Iに見えます。" }],
    address: [{ text: "security@paypal-customer-check.xyz", bad: true, reason: "公式ではない.xyzドメインです。" }],
    subject: [
      { text: "支払いが保留されています", bad: false }
    ],
    url: [
      { text: "https://paypal-customer-check.xyz", bad: true, reason: "公式ではない.xyzドメインのURLです。" }
    ],
    body: [
      { text: "添付ファイル", bad: true, reason: "心当たりのない添付ファイルは開かないでください。" },
      { text: "の請求書を確認してください。", bad: false }
    ],
    button: [
      { text: "invoice_urgent.zip", bad: true, reason: "zip添付を急いで開かせるのは危険です。" }
    ]
  }
];

let currentIndex = 0;
let found = new Set();
let score = 0;
let misses = 0;
let hints = 0;
let lastTapAt = 0;

function renderCase() {
  const current = cases[currentIndex];
  found = new Set();
  cardEl.innerHTML = `
    <div class="mail-head">
      <div class="avatar">${current.icon}</div>
      <div>
        <span class="mini-label">差出人</span>
        <p class="sender">${renderParts(current.sender, "sender")}</p>
        <p class="subject">${renderParts(current.subject, "subject")}</p>
      </div>
    </div>
    <div class="field">
      <span class="field-label">メールアドレス</span>
      <span class="field-value">${renderParts(current.address, "address")}</span>
    </div>
    <div class="field">
      <span class="field-label">URL</span>
      <span class="field-value">${renderParts(current.url, "url")}</span>
    </div>
    <div class="field">
      <span class="field-label">本文</span>
      <span class="field-value">${renderParts(current.body, "body")}</span>
    </div>
    <div class="cta">${renderParts(current.button, "button")}</div>
  `;
  cardEl.querySelectorAll(".hotspot").forEach((button) => {
    button.addEventListener("click", onHotspotClick);
  });
  nextBtn.disabled = true;
  hintBtn.disabled = getBadCount(current) === 0;
  updateUi();
  messageEl.textContent = current.safe ? "このカードは基本的に安全です。変なところがなければ次へ。" : "怪しいところを直接タップしてください。";
}

function renderParts(parts, group) {
  return parts.map((part, index) => {
    const id = `${group}-${index}`;
    return `<button class="hotspot" type="button" data-id="${id}" data-bad="${part.bad ? "1" : "0"}" data-reason="${escapeAttr(part.reason || "")}">${escapeHtml(part.text)}</button>`;
  }).join("");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text) {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function onHotspotClick(event) {
  const target = event.currentTarget;
  const id = target.dataset.id;
  if (target.dataset.bad === "1") {
    if (found.has(id)) {
      return;
    }
    found.add(id);
    target.classList.add("is-found");
    score += 120;
    messageEl.textContent = target.dataset.reason || "怪しいポイントを発見しました。";
    if (found.size >= getBadCount(cases[currentIndex])) {
      score += 80;
      messageEl.textContent = "この通知の怪しいところを見抜きました。";
      nextBtn.disabled = false;
      hintBtn.disabled = true;
    }
  } else {
    misses += 1;
    score = Math.max(0, score - 45);
    target.classList.remove("is-wrong");
    target.offsetWidth;
    target.classList.add("is-wrong");
    messageEl.textContent = cases[currentIndex].safe ? "ここは普通です。安全な通知も混ざっています。" : "そこは普通です。別の場所を見てみましょう。";
  }
  updateUi();
}

function getBadCount(current) {
  return ["sender", "address", "subject", "url", "body", "button"].reduce((sum, key) => (
    sum + current[key].filter((part) => part.bad).length
  ), 0);
}

function updateUi() {
  const badCount = getBadCount(cases[currentIndex]);
  caseCountEl.textContent = `${currentIndex + 1}/${cases.length}`;
  foundCountEl.textContent = `${found.size}/${badCount}`;
  scoreEl.textContent = String(score);
  if (badCount === 0) {
    foundCountEl.textContent = "SAFE";
    nextBtn.disabled = false;
  }
}

function showHint() {
  const current = cases[currentIndex];
  const candidates = Array.from(cardEl.querySelectorAll('.hotspot[data-bad="1"]'))
    .filter((button) => !found.has(button.dataset.id));
  if (candidates.length === 0) {
    return;
  }
  hints += 1;
  score = Math.max(0, score - 30);
  const target = candidates[0];
  target.classList.add("is-hint");
  messageEl.textContent = current.safe ? "安全な通知です。" : "光っているあたりをもう一度見てください。";
  updateUi();
}

function goNext() {
  if (currentIndex >= cases.length - 1) {
    finish();
    return;
  }
  currentIndex += 1;
  renderCase();
}

function finish() {
  resultTitleEl.textContent = getTitle();
  resultTextEl.textContent = `スコア ${score} / ミス ${misses} / ヒント ${hints}`;
  resultEl.classList.remove("hidden");
  hintBtn.disabled = true;
  nextBtn.disabled = true;
}

function getTitle() {
  if (score >= 1700 && misses === 0) return "URL鑑識官";
  if (score >= 1300 && misses <= 2) return "ボタン押す前に読む人";
  if (score >= 900) return "焦らされ耐性あり";
  if (misses >= 8) return "即クリック危険区域";
  return "訓練継続中";
}

function reset() {
  currentIndex = 0;
  score = 0;
  misses = 0;
  hints = 0;
  resultEl.classList.add("hidden");
  renderCase();
}

document.addEventListener("touchend", (event) => {
  const now = Date.now();
  if (now - lastTapAt < 420) {
    event.preventDefault();
  }
  lastTapAt = now;
}, { passive: false });

document.addEventListener("gesturestart", (event) => {
  event.preventDefault();
});

hintBtn.addEventListener("click", showHint);
nextBtn.addEventListener("click", goNext);
retryBtn.addEventListener("click", reset);

renderCase();
