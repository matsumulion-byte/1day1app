const $ = (selector) => document.querySelector(selector);

const fileInput = $('#fileInput');
const analyzeBtn = $('#analyzeBtn');
const resetBtn = $('#resetBtn');
const previewWrap = $('#previewWrap');
const previewImage = $('#previewImage');
const statusText = $('#statusText');
const progressWrap = $('#progressWrap');
const progressBar = $('#progressBar');
const rawText = $('#rawText');
const toggleRawBtn = $('#toggleRawBtn');
const dropzone = $('#dropzone');

const shopNameEl = $('#shopName');
const totalAmountEl = $('#totalAmount');
const dateTextEl = $('#dateText');
const timeTextEl = $('#timeText');
const discountTextEl = $('#discountText');
const paymentTextEl = $('#paymentText');

const fortuneRankEl = document.querySelector('.fortune__rank');
const fortuneTitleEl = document.querySelector('.fortune__title');
const fortuneMessageEl = document.querySelector('.fortune__message');
const luckyAmountEl = $('#luckyAmount');
const wasteLevelEl = $('#wasteLevel');
const luckyCategoryEl = $('#luckyCategory');
const oracleTextEl = $('#oracleText');

let imageFile = null;
let imageUrl = '';
let isRawOpen = false;

const luckyCategories = [
  '雑費',
  '消耗品費',
  '交際費',
  '旅費交通費',
  '会議費',
  '研究開発費',
  '福利厚生費',
  '通信費',
];

const fortuneTitles = {
  daikichi: '黒字拡大型',
  chukichi: '堅実散財運',
  shokichi: '端数整頓型',
  suekichi: '予算管理ゆらぎ型',
  kyo: '説明不能出費注意',
};

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setFile(file);
});

analyzeBtn.addEventListener('click', () => {
  if (!imageFile) return;
  void analyzeReceipt(imageFile);
});

resetBtn.addEventListener('click', resetAll);

toggleRawBtn.addEventListener('click', () => {
  isRawOpen = !isRawOpen;
  rawText.hidden = !isRawOpen;
  toggleRawBtn.textContent = isRawOpen ? '閉じる' : '表示';
});

['dragenter', 'dragover'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  setFile(file);
});

function setFile(file) {
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }

  imageFile = file;
  imageUrl = URL.createObjectURL(file);

  previewImage.src = imageUrl;
  previewWrap.hidden = false;

  analyzeBtn.disabled = false;
  resetBtn.disabled = false;
  statusText.textContent = '準備できました。占えます。';

  clearReadResult();
  setFortuneIdle();
}

function resetAll() {
  imageFile = null;

  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
    imageUrl = '';
  }

  fileInput.value = '';
  previewImage.removeAttribute('src');
  previewWrap.hidden = true;

  analyzeBtn.disabled = true;
  resetBtn.disabled = true;

  progressWrap.hidden = true;
  progressBar.style.width = '0%';
  statusText.textContent = '画像を入れてください。';

  rawText.textContent = '';
  clearReadResult();
  setFortuneIdle();
}

function clearReadResult() {
  shopNameEl.textContent = '-';
  totalAmountEl.textContent = '-';
  dateTextEl.textContent = '-';
  timeTextEl.textContent = '-';
  discountTextEl.textContent = '-';
  paymentTextEl.textContent = '-';
}

function setFortuneIdle() {
  fortuneRankEl.textContent = '-';
  fortuneTitleEl.textContent = 'まだ占っていません';
  fortuneMessageEl.textContent = 'レシートを読み込むと結果が出ます。';
  luckyAmountEl.textContent = '-';
  wasteLevelEl.textContent = '-';
  luckyCategoryEl.textContent = '-';
  oracleTextEl.textContent = '-';
}

async function analyzeReceipt(file) {
  analyzeBtn.disabled = true;
  statusText.textContent = '読み取り中...';
  progressWrap.hidden = false;
  progressBar.style.width = '0%';

  const worker = await Tesseract.createWorker('jpn+eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        const ratio = typeof message.progress === 'number' ? message.progress : 0;
        progressBar.style.width = `${Math.round(ratio * 100)}%`;
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);

    rawText.textContent = text?.trim() || '(結果なし)';
    statusText.textContent = '占いが出ました。';
    progressBar.style.width = '100%';

    const parsed = parseReceiptText(text || '');
    renderParsed(parsed);

    const fortune = buildFortune(parsed);
    renderFortune(fortune);
  } catch (error) {
    console.error(error);
    statusText.textContent = '読み取りに失敗しました。別の画像で試してください。';
  } finally {
    await worker.terminate();
    analyzeBtn.disabled = false;
  }
}

function parseReceiptText(text) {
  const normalized = normalizeText(text);
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const lowerText = normalized.toLowerCase();

  const date = detectDate(normalized);
  const time = detectTime(normalized);
  const total = detectTotal(lines);
  const shop = detectShop(lines);
  const discount = detectDiscount(lowerText);
  const payment = detectPayment(lowerText);

  return {
    raw: text,
    normalized,
    lines,
    shop,
    total,
    date,
    time,
    discount,
    payment,
  };
}

function normalizeText(text) {
  return text
    .replace(/[：]/g, ':')
    .replace(/[，]/g, ',')
    .replace(/[．。]/g, '.')
    .replace(/[¥￥]/g, '¥')
    .replace(/\r/g, '')
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .replace(/[Ａ-Ｚａ-ｚ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    );
}

function detectShop(lines) {
  const blacklist = [
    '合計',
    '小計',
    '値引',
    '割引',
    '税込',
    '税抜',
    '現金',
    'クレジット',
    'visa',
    'master',
    'jcb',
    'tel',
    '電話',
    'レシート',
    '領収書',
  ];

  const candidates = lines
    .slice(0, 8)
    .filter((line) => line.length >= 2 && line.length <= 28)
    .filter((line) => !/\d{2,}/.test(line))
    .filter(
      (line) =>
        !blacklist.some((word) => line.toLowerCase().includes(word.toLowerCase()))
    )
    .sort((a, b) => scoreShopLine(b) - scoreShopLine(a));

  return candidates[0] || '';
}

function scoreShopLine(line) {
  let score = 0;
  if (/^[A-Za-z0-9\s&.\-]+$/.test(line)) score += 2;
  if (/[ァ-ヶー々一-龠]/.test(line)) score += 2;
  if (line.length >= 4 && line.length <= 18) score += 2;
  if (!/\d/.test(line)) score += 2;
  return score;
}

function detectTotal(lines) {
  const amountLineKeywords = [
    '合計',
    'ご計',
    '総計',
    'total',
    'ttl',
    '計',
    '税込合計',
  ];

  const amountCandidates = [];

  lines.forEach((line, index) => {
    const normalizedLine = line.toLowerCase();
    const amounts = extractAmounts(line);
    if (!amounts.length) return;

    const hasKeyword = amountLineKeywords.some((keyword) =>
      normalizedLine.includes(keyword)
    );

    amounts.forEach((amount) => {
      let score = amount;
      if (hasKeyword) score += 1000000;
      if (index >= lines.length - 6) score += 5000;
      if (/¥/.test(line)) score += 500;
      amountCandidates.push({ amount, score, line });
    });
  });

  if (!amountCandidates.length) return null;

  amountCandidates.sort((a, b) => b.score - a.score);
  return amountCandidates[0].amount;
}

function extractAmounts(line) {
  const matches = [];
  const regex = /(?:¥\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{2,6})(?:\.[0-9]{1,2})?/g;

  let match;
  while ((match = regex.exec(line)) !== null) {
    const raw = match[1].replace(/,/g, '');
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 10 && value <= 999999) {
      matches.push(value);
    }
  }

  return matches;
}

function detectDate(text) {
  const patterns = [
    /(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/,
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/,
    /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === patterns[1]) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        const c = Number(match[3]);
        if (String(c).length === 4) {
          return `${c}年${a}月${b}日`;
        }
        return `${a}月${b}日`;
      }

      return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
    }
  }

  return '';
}

function detectTime(text) {
  const match = text.match(/([01]?\d|2[0-3])[:時]([0-5]\d)/);
  if (!match) return '';
  return `${match[1]}:${match[2]}`;
}

function detectDiscount(text) {
  const found = [];
  if (text.includes('値引')) found.push('値引');
  if (text.includes('割引')) found.push('割引');
  if (text.includes('引')) found.push('引');
  if (text.includes('off')) found.push('OFF');
  return dedupe(found).join(' / ');
}

function detectPayment(text) {
  const found = [];
  if (text.includes('現金')) found.push('現金');
  if (text.includes('クレジット')) found.push('クレジット');
  if (text.includes('credit')) found.push('CREDIT');
  if (text.includes('visa')) found.push('VISA');
  if (text.includes('master')) found.push('MASTER');
  if (text.includes('jcb')) found.push('JCB');
  if (text.includes('電子マネー')) found.push('電子マネー');
  if (text.includes('交通系')) found.push('交通系');
  return dedupe(found).join(' / ');
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function renderParsed(parsed) {
  shopNameEl.textContent = parsed.shop || '-';
  totalAmountEl.textContent =
    parsed.total !== null ? `¥${formatNumber(parsed.total)}` : '-';
  dateTextEl.textContent = parsed.date || '-';
  timeTextEl.textContent = parsed.time || '-';
  discountTextEl.textContent = parsed.discount || '-';
  paymentTextEl.textContent = parsed.payment || '-';
}

function buildFortune(parsed) {
  let score = 50;
  const notes = [];

  if (parsed.total !== null) {
    const amount = parsed.total;

    if (isRepeatedDigits(amount)) {
      score += 22;
      notes.push('数字の並びが妙に強いです。');
    }

    if (amount < 500) {
      score += 8;
      notes.push('小さくまとめる力があります。');
    } else if (amount < 1200) {
      score += 4;
      notes.push('日常運転の出費です。');
    } else if (amount < 3000) {
      score -= 4;
      notes.push('やや気前が良くなっています。');
    } else {
      score -= 14;
      notes.push('勢いで押し切る出費が見えます。');
    }

    if (amount % 8 === 0) {
      score += 7;
      notes.push('8の気配があります。');
    }
    if (amount % 5 === 0) {
      score += 3;
      notes.push('5で割り切れる整いがあります。');
    }
    if (String(amount).endsWith('1')) {
      score += 5;
      notes.push('1で終わるので始動運があります。');
    }
    if (String(amount).endsWith('9')) {
      score -= 3;
      notes.push('最後が9なので詰めの甘さがあります。');
    }
  } else {
    notes.push('金額の像が少しぼやけています。');
  }

  if (parsed.discount) {
    score += 10;
    notes.push('割引の気配を拾いました。');
  }

  if (parsed.payment) {
    if (parsed.payment.includes('現金')) {
      score += 6;
      notes.push('足元が見えています。');
    }
    if (
      parsed.payment.includes('クレジット') ||
      parsed.payment.includes('CREDIT') ||
      parsed.payment.includes('VISA') ||
      parsed.payment.includes('MASTER') ||
      parsed.payment.includes('JCB')
    ) {
      score -= 5;
      notes.push('未来の自分に任せる傾向があります。');
    }
  }

  if (parsed.time) {
    const hour = Number(parsed.time.split(':')[0]);
    if (hour <= 9) {
      score += 7;
      notes.push('朝の判断はまだ澄んでいます。');
    } else if (hour >= 18 && hour <= 22) {
      score -= 4;
      notes.push('夕方以降は財布がゆるみがちです。');
    } else if (hour >= 23 || hour <= 3) {
      score -= 10;
      notes.push('深い時間の出費はだいぶ勢いです。');
    }
  }

  if (parsed.shop) {
    const shopLen = parsed.shop.length;
    if (shopLen >= 4 && shopLen <= 8) {
      score += 4;
      notes.push('店名の収まりが良いです。');
    } else if (shopLen >= 14) {
      score -= 3;
      notes.push('情報量が多めです。');
    }
  }

  score = Math.max(0, Math.min(100, score));

  let rank = '末吉';
  let typeKey = 'suekichi';

  if (score >= 82) {
    rank = '大吉';
    typeKey = 'daikichi';
  } else if (score >= 66) {
    rank = '中吉';
    typeKey = 'chukichi';
  } else if (score >= 52) {
    rank = '小吉';
    typeKey = 'shokichi';
  } else if (score < 36) {
    rank = '凶';
    typeKey = 'kyo';
  }

  const luckyAmount = makeLuckyAmount(parsed.total);
  const wasteLevel = `${Math.max(8, 100 - score)}%`;
  const luckyCategory = luckyCategories[score % luckyCategories.length];
  const title = fortuneTitles[typeKey];
  const message = composeMessage(typeKey, parsed, notes);
  const oracle = composeOracle(typeKey, parsed);

  return {
    rank,
    title,
    message,
    luckyAmount,
    wasteLevel,
    luckyCategory,
    oracle,
  };
}

function composeMessage(typeKey, parsed, notes) {
  const first = {
    daikichi:
      '今日はお金の流れが前向きです。払っても不思議と崩れにくい日です。',
    chukichi:
      '今日は使っているようで守れている日です。派手さはないですが地盤はあります。',
    shokichi:
      '小さく整える力が出ています。大勝ちはないですが荒れにくい日です。',
    suekichi:
      '予算の境界線が少し曖昧です。必要の定義がいつもより広がりやすい日です。',
    kyo:
      '財布より気分が先に動きやすい日です。買う前に一拍置くとだいぶ変わります。',
  }[typeKey];

  const noteText = notes.slice(0, 3).join(' ');
  const add =
    parsed.total !== null
      ? ` 合計は ¥${formatNumber(parsed.total)} と出ています。`
      : ' 合計の輪郭は見えています。';

  return `${first}${add} ${noteText}`.trim();
}

function composeOracle(typeKey, parsed) {
  const paymentHint = parsed.payment
    ? `支払いの気配は「${parsed.payment}」です。`
    : '支払い方法は静かです。';

  const dateHint = parsed.date ? `${parsed.date}の明細として見えています。` : '';
  const timeHint = parsed.time ? `${parsed.time}あたりの出費です。` : '';
  const shopHint = parsed.shop ? `店名は「${parsed.shop}」っぽいです。` : '';

  const core = {
    daikichi: '今日のあなたは、出しても崩れにくい運を持っています。',
    chukichi: '今日のあなたは、散財と管理のあいだでうまく立っています。',
    shokichi: '今日は端数や小さな判断で差がつく日です。',
    suekichi: '今日は勢いでカゴに入れる前に、必要かだけ見てください。',
    kyo: '今日は「安いから買う」を一度だけ疑ってください。',
  }[typeKey];

  return [core, shopHint, dateHint, timeHint, paymentHint].filter(Boolean).join(' ');
}

function makeLuckyAmount(total) {
  if (total === null) {
    return '¥358';
  }

  const digits = String(total).split('').map(Number).filter((n) => Number.isFinite(n));
  const sum = digits.reduce((acc, cur) => acc + cur, 0) || 8;
  const amount = Math.max(88, sum * 111);
  return `¥${formatNumber(amount)}`;
}

function isRepeatedDigits(value) {
  const raw = String(value);
  return /^(\d)\1+$/.test(raw) || ['777', '888', '1111', '333', '555'].includes(raw);
}

function renderFortune(fortune) {
  fortuneRankEl.textContent = fortune.rank;
  fortuneTitleEl.textContent = fortune.title;
  fortuneMessageEl.textContent = fortune.message;
  luckyAmountEl.textContent = fortune.luckyAmount;
  wasteLevelEl.textContent = fortune.wasteLevel;
  luckyCategoryEl.textContent = fortune.luckyCategory;
  oracleTextEl.textContent = fortune.oracle;
}

function formatNumber(value) {
  return Number(value).toLocaleString('ja-JP');
}