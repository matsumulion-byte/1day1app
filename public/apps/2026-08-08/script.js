const CONFIG = {
  reels: [
    ['ざ', 'ず', 'ぜ', 'ぞ', 'じゃ', 'さ'],
    ['まぁ', 'もぅ', 'みぃ', 'ま', 'めぇ', 'むぅ'],
    ['みろ', 'みな', 'むろ', 'めろ', 'もろ', 'しろ']
  ],
  jackpot: ['ざ', 'まぁ', 'みろ'],
  reactions: ['なんだそれ', '惜しくもない', '知らん言葉できた', 'もう一回やれ', 'ざまぁみろではない', '誰が言うねん'],
  winAfter: { min: 3, max: 5 },
  stopTimes: [920, 1280, 1660],
  live: {
    artist: 'the mammy rows',
    title: 'ざまぁみろ',
    date: '2026.08.08',
    venue: '両国SUNRIZE'
  }
};

const $ = (selector) => document.querySelector(selector);
const els = {
  app: $('#app'), slots: $('#slots'), spin: $('#spin'), word: $('#word'), reaction: $('#reaction'),
  result: $('#result'), share: $('#share'), jackpot: $('#jackpot'), hit: $('#hit'), flyer: $('#flyer'),
  flash: $('#flash'), again: $('#again'), shareWin: $('#shareWin')
};
const tracks = CONFIG.reels.map((_, index) => $(`#reel${index}`));
const state = { spinning: false, plays: 0, winAt: randomInt(CONFIG.winAfter.min, CONFIG.winAfter.max), timers: [], lastResult: CONFIG.jackpot, won: false };

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
function wait(ms) { return new Promise(resolve => state.timers.push(setTimeout(resolve, ms))); }
function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }

function fillTrack(track, values) {
  const sequence = Array.from({ length: 11 }, (_, i) => values[i % values.length]);
  track.innerHTML = sequence.map(value => `<span>${value}</span>`).join('');
}

function setReel(index, value) {
  tracks[index].classList.remove('rolling', 'stopping');
  tracks[index].innerHTML = `<span>${value}</span>`;
  tracks[index].parentElement.classList.add('stopped');
  setTimeout(() => tracks[index].parentElement.classList.remove('stopped'), 180);
}

function makeMiss() {
  let result;
  do {
    result = CONFIG.reels.map(pick);
  } while (result.every((value, index) => value === CONFIG.jackpot[index]));
  return result;
}

async function spin() {
  if (state.spinning) return;
  clearTimers();
  state.spinning = true;
  state.won = false;
  state.plays += 1;
  els.spin.disabled = true;
  els.spin.querySelector('span').textContent = '回転中…';
  els.result.classList.remove('show');
  els.share.hidden = true;
  els.slots.classList.add('is-spinning');

  const isWin = state.plays >= state.winAt;
  const result = isWin ? [...CONFIG.jackpot] : makeMiss();
  CONFIG.reels.forEach((values, index) => {
    fillTrack(tracks[index], values);
    tracks[index].classList.add('rolling');
    tracks[index].style.setProperty('--speed', `${105 + index * 13}ms`);
  });

  CONFIG.stopTimes.forEach((time, index) => {
    state.timers.push(setTimeout(() => setReel(index, result[index]), time));
  });
  await wait(CONFIG.stopTimes[2] + 120);
  els.slots.classList.remove('is-spinning');
  state.lastResult = result;
  state.spinning = false;

  if (isWin) {
    state.won = true;
    state.plays = 0;
    state.winAt = randomInt(CONFIG.winAfter.min, CONFIG.winAfter.max);
    await celebrate();
  } else {
    els.word.textContent = result.join('');
    els.reaction.textContent = pick(CONFIG.reactions);
    els.result.classList.add('show');
    els.share.hidden = false;
    els.spin.disabled = false;
    els.spin.querySelector('span').textContent = 'もう一回やる';
  }
}

async function celebrate() {
  await wait(160);
  els.app.classList.add('impact');
  if (navigator.vibrate) navigator.vibrate([50, 35, 90]);
  await wait(220);
  els.flash.classList.add('fire');
  els.jackpot.classList.add('open');
  els.jackpot.setAttribute('aria-hidden', 'false');
  els.hit.classList.add('blast');
  await wait(760);
  els.hit.classList.remove('blast');
  els.flyer.classList.add('show');
  els.app.classList.remove('impact');
  els.spin.querySelector('span').textContent = 'ざまぁみろする';
}

function resetJackpot() {
  clearTimers();
  els.jackpot.classList.remove('open');
  els.jackpot.setAttribute('aria-hidden', 'true');
  els.flyer.classList.remove('show');
  els.flash.classList.remove('fire');
  els.result.classList.remove('show');
  els.share.hidden = true;
  els.spin.disabled = false;
  els.spin.querySelector('span').textContent = 'ざまぁみろする';
  state.spinning = false;
  state.won = false;
}

async function share(win = false) {
  const text = win
    ? `ざまぁみろ揃った。\n\n${CONFIG.live.artist}\nレコ発「${CONFIG.live.title}」\n${CONFIG.live.date} ${CONFIG.live.venue}\n\n#ざまぁみろ\n#themammyrows`
    : `今日のざまぁみろスロット\n\n「${state.lastResult.join('')}」\n\n#ざまぁみろスロット\n#themammyrows`;
  const data = { title: 'ざまぁみろスロット', text, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${location.href}`)}`, '_blank', 'noopener,noreferrer');
  } catch (error) {
    if (error.name !== 'AbortError') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${location.href}`)}`, '_blank', 'noopener,noreferrer');
  }
}

els.spin.addEventListener('click', spin);
els.again.addEventListener('click', resetJackpot);
els.share.addEventListener('click', () => share(false));
els.shareWin.addEventListener('click', () => share(true));
document.addEventListener('visibilitychange', () => { if (document.hidden && state.spinning) resetJackpot(); });
