(() => {
  'use strict';

  const TICKET_PRICE = 300;
  const ADD_FUNDS = 1_000_000;
  const TOTAL_TICKETS = 460_000_000;
  const STORAGE_KEY = 'lottery-simulator-2026-09-02-v1';

  // 2025年末ジャンボ（第1082回）の発売総数と当選本数。
  // 1等・前後賞は連番の番号関係を再現するため、通常賞とは別に処理する。
  const PRIZES = [
    { key: 'second', label: '2等', value: 100_000_000, count: 23 },
    { key: 'third', label: '3等', value: 10_000_000, count: 92 },
    { key: 'fourth', label: '4等', value: 1_000_000, count: 920 },
    { key: 'fifth', label: '5等', value: 10_000, count: 1_380_000 },
    { key: 'sixth', label: '6等', value: 3_000, count: 4_600_000 },
    { key: 'seventh', label: '7等', value: 300, count: 46_000_000 },
    { key: 'different', label: '1等組違い賞', value: 100_000, count: 4_577 }
  ];

  const initialState = () => ({
    version: 1, method: 'sequence', invested: 0, won: 0, tickets: 0,
    plays: 0, cash: 0, history: [], records: {
      highestWin: 0, bestRound: 0, worstRound: 0,
      highestTotal: 0, lowestTotal: 0
    }
  });

  let state = loadState();
  let processing = false;
  let queued = 0;

  const $ = (id) => document.getElementById(id);
  const yen = new Intl.NumberFormat('ja-JP');
  const formatYen = (n) => `${yen.format(Math.round(n))}円`;
  const formatSigned = (n) => n === 0 ? '±0円' : `${n > 0 ? '+' : '-'}${yen.format(Math.abs(Math.round(n)))}円`;

  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!data || data.version !== 1) return initialState();
      return { ...initialState(), ...data, records: { ...initialState().records, ...data.records } };
    } catch (_) { return initialState(); }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  // 二項分布サンプラー。小さい期待値はポアソン近似、その他は正規近似を使う。
  // 1回につき賞の種類の数だけ計算するため、購入枚数が数百万枚でも処理量は一定。
  function sampleBinomial(n, p) {
    if (n <= 0 || p <= 0) return 0;
    const mean = n * p;
    if (mean < 30) return Math.min(n, samplePoisson(mean));
    const sd = Math.sqrt(n * p * (1 - p));
    return Math.max(0, Math.min(n, Math.round(mean + sd * normalRandom())));
  }

  function samplePoisson(lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normalRandom()));
    const limit = Math.exp(-lambda);
    let product = 1, k = 0;
    do { k++; product *= Math.random(); } while (product > limit);
    return k - 1;
  }

  function normalRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function emptyWins() {
    return { first: 0, adjacent: 0, different: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0, seventh: 0 };
  }

  // 連番：10枚セットを連続番号として扱う。セット内に1等が入る確率は10/2,000万。
  // 当選位置が中央なら前後賞2本、端なら片方だけ。残りなしの端数券も個別確率で補う。
  function drawSequence(ticketCount) {
    const wins = drawCommonPrizes(ticketCount);
    const sets = Math.floor(ticketCount / 10);
    const remainder = ticketCount % 10;
    const firstSets = sampleBinomial(sets, 10 / 20_000_000);
    wins.first = firstSets + sampleBinomial(remainder, 1 / 20_000_000);
    for (let i = 0; i < firstSets; i++) {
      const position = Math.floor(Math.random() * 10);
      wins.adjacent += position === 0 || position === 9 ? 1 : 2;
    }
    // 端数券で1等なら、所有範囲内の隣接番号だけを前後賞として数える。
    if (wins.first > firstSets && remainder > 0) {
      const position = Math.floor(Math.random() * remainder);
      if (position > 0) wins.adjacent++;
      if (position < remainder - 1) wins.adjacent++;
    }
    return wins;
  }

  // バラ：末尾0〜9を揃えた10枚セットだが番号は分散。
  // 各券の当選確率は同じまま、同一セットの1等と前後賞の抱き合わせは起こさない。
  function drawRandom(ticketCount) {
    const wins = drawCommonPrizes(ticketCount);
    wins.first = sampleBinomial(ticketCount, 23 / TOTAL_TICKETS);
    wins.adjacent = sampleBinomial(ticketCount, 46 / TOTAL_TICKETS);
    return wins;
  }

  function drawCommonPrizes(ticketCount) {
    const wins = emptyWins();
    PRIZES.forEach(prize => { wins[prize.key] = sampleBinomial(ticketCount, prize.count / TOTAL_TICKETS); });
    return wins;
  }

  function calculatePrize(wins) {
    return wins.first * 700_000_000 + wins.adjacent * 150_000_000 +
      PRIZES.reduce((sum, prize) => sum + wins[prize.key] * prize.value, 0);
  }

  function purchase() {
    state.cash += ADD_FUNDS;
    state.invested += ADD_FUNDS;
    const ticketCount = Math.floor(state.cash / TICKET_PRICE);
    const spent = ticketCount * TICKET_PRICE;
    state.cash -= spent;
    const wins = state.method === 'sequence' ? drawSequence(ticketCount) : drawRandom(ticketCount);
    const won = calculatePrize(wins);
    // 「今回の収支」は、この回に実際に購入した券の金額との差。
    // 繰越残金により3回目などは購入額が100万円を200円上回る場合がある。
    const balance = won - spent;
    state.won += won;
    state.tickets += ticketCount;
    state.plays++;
    const totalBalance = state.won - state.invested;
    state.records.highestWin = Math.max(state.records.highestWin, won);
    state.records.bestRound = Math.max(state.records.bestRound, balance);
    state.records.worstRound = Math.min(state.records.worstRound, balance);
    state.records.highestTotal = Math.max(state.records.highestTotal, totalBalance);
    state.records.lowestTotal = Math.min(state.records.lowestTotal, totalBalance);
    const result = { round: state.plays, method: state.method, ticketCount, spent, won, balance, wins, at: Date.now() };
    state.history.unshift(result);
    state.history = state.history.slice(0, 10);
    saveState();
    return result;
  }

  function processQueue() {
    if (processing || queued === 0) return;
    processing = true;
    queued--;
    const result = purchase();
    render(result);
    $('investButton').classList.remove('pulse');
    void $('investButton').offsetWidth;
    $('investButton').classList.add('pulse');
    const event = getHighPrizeEvent(result.wins);
    if (event) showJackpot(event, () => { processing = false; processQueue(); });
    else { processing = false; requestAnimationFrame(processQueue); }
  }

  function getHighPrizeEvent(wins) {
    if (wins.first && wins.adjacent >= 2) return { rank: '連番・1等前後賞', amount: '10億円', tier: 1 };
    if (wins.first) return { rank: wins.adjacent ? '1等＋前後賞' : '1等', amount: wins.adjacent ? '8億5,000万円' : '7億円', tier: 1 };
    if (wins.second) return { rank: '2等', amount: '1億円！！！', tier: 2 };
    if (wins.third) return { rank: '3等', amount: '1,000万円！！', tier: 3 };
    if (wins.fourth) return { rank: '4等', amount: '100万円！', tier: 4 };
    return null;
  }

  function render(latest) {
    const totalBalance = state.won - state.invested;
    setText('totalBalance', formatSigned(totalBalance));
    $('totalBalance').className = `balance-value ${totalBalance > 0 ? 'positive' : 'negative'}`;
    setText('totalInvested', formatYen(state.invested));
    setText('totalWon', formatYen(state.won));
    const recovery = state.invested ? state.won / state.invested * 100 : 0;
    setText('recoveryRate', `${recovery.toFixed(2)}%`);
    $('recoveryBar').style.width = `${Math.min(100, recovery)}%`;
    setText('totalTickets', `${yen.format(state.tickets)}枚`);
    setText('playCount', state.plays);
    setText('cashBalance', formatYen(state.cash));
    document.querySelectorAll('.segment').forEach(button => {
      const active = button.dataset.method === state.method;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    renderRecords();
    renderHistory();
    if (latest) renderLatest(latest);
    else if (state.history.length) renderLatest(state.history[0]);
  }

  function renderLatest(result) {
    $('latestResult').classList.remove('hidden');
    setText('latestMethod', result.method === 'sequence' ? '連番' : 'バラ');
    setText('latestWon', formatYen(result.won));
    setText('latestBalance', formatSigned(result.balance));
    $('latestBalance').className = result.balance > 0 ? 'positive' : 'negative';
    setText('latestTickets', `${yen.format(result.ticketCount)}枚`);
    setText('latestSpent', formatYen(result.spent));
    const rows = [];
    const all = [
      ['1等', 700_000_000, result.wins.first], ['1等前後賞', 150_000_000, result.wins.adjacent],
      ...PRIZES.map(p => [p.label, p.value, result.wins[p.key]])
    ];
    all.filter(([, , count]) => count > 0).forEach(([label, value, count]) => {
      rows.push(`<div class="prize-row"><span>${label} <b>${formatYen(value)}</b></span><strong>× ${yen.format(count)}本</strong></div>`);
    });
    const high = all.some(([, value, count]) => value >= 1_000_000 && count > 0);
    if (!high) rows.push('<div class="no-high">4等以上 なし　—　夢、継続中。</div>');
    $('breakdown').innerHTML = rows.join('');
  }

  function renderRecords() {
    setText('recordWin', formatYen(state.records.highestWin));
    setText('recordPlus', formatSigned(state.records.bestRound));
    setText('recordMinus', formatSigned(state.records.worstRound));
    setText('recordTotalPlus', formatSigned(state.records.highestTotal));
    setText('recordTotalMinus', formatSigned(state.records.lowestTotal));
  }

  function renderHistory() {
    if (!state.history.length) { $('history').innerHTML = '<p class="empty">まだ100万円は溶けていません。</p>'; return; }
    $('history').innerHTML = state.history.map(item => `
      <article class="history-item">
        <div class="history-round">${item.round}回目</div>
        <div class="history-meta"><b>${item.method === 'sequence' ? '連番' : 'バラ'}・${yen.format(item.ticketCount)}枚</b>投入 ${formatYen(ADD_FUNDS)} ／ 当選 ${formatYen(item.won)}</div>
        <div class="history-result"><span>収支</span><strong class="${item.balance > 0 ? 'positive' : 'negative'}">${formatSigned(item.balance)}</strong></div>
      </article>`).join('');
  }

  function showJackpot(event, done) {
    const overlay = $('jackpot');
    overlay.className = `jackpot tier${event.tier}`;
    setText('jackpotRank', event.rank);
    setText('jackpotAmount', event.amount);
    startConfetti();
    let finished = false;
    const close = () => {
      if (finished) return;
      finished = true;
      overlay.classList.add('hidden');
      stopConfetti();
      overlay.removeEventListener('pointerdown', close);
      done();
    };
    overlay.addEventListener('pointerdown', close);
    setTimeout(close, event.tier === 4 ? 1800 : 3500);
  }

  let confettiFrame = 0;
  function startConfetti() {
    const canvas = $('confetti'), ctx = canvas.getContext('2d');
    canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const pieces = Array.from({ length: 130 }, () => ({ x: Math.random()*innerWidth, y: -20-Math.random()*innerHeight, s: 4+Math.random()*8, v: 2+Math.random()*5, r: Math.random()*6, c: ['#ffd22e','#fff','#e60012','#ff8b18'][Math.floor(Math.random()*4)] }));
    const draw = () => {
      ctx.clearRect(0,0,innerWidth,innerHeight);
      pieces.forEach(p => { p.y += p.v; p.x += Math.sin(p.y/30+p.r)*1.2; if(p.y>innerHeight+10)p.y=-20; ctx.fillStyle=p.c; ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.y/30);ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.55);ctx.restore(); });
      confettiFrame = requestAnimationFrame(draw);
    }; draw();
  }
  function stopConfetti() { cancelAnimationFrame(confettiFrame); }
  function setText(id, value) { $(id).textContent = value; }

  $('investButton').addEventListener('click', () => { queued = Math.min(queued + 1, 30); processQueue(); });
  document.querySelectorAll('.segment').forEach(button => button.addEventListener('click', () => { state.method = button.dataset.method; saveState(); render(); }));
  $('infoButton').addEventListener('click', () => $('infoModal').classList.remove('hidden'));
  $('infoModal').addEventListener('click', event => { if (event.target === $('infoModal') || event.target.hasAttribute('data-close-modal')) $('infoModal').classList.add('hidden'); });
  $('resetButton').addEventListener('click', () => {
    if (!confirm('投入額も当選記録も、すべて最初からやり直しますか？')) return;
    state = initialState(); queued = 0; saveState(); $('latestResult').classList.add('hidden'); render();
  });
  render();
})();
