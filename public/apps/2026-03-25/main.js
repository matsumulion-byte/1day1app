const ASSET_BASE = '/apps/2026-03-25';

const ON_IMG = `${ASSET_BASE}/assets/bulb_on.png`;
const OFF_IMG = `${ASSET_BASE}/assets/bulb_off.png`;
const BGM_SRC = `${ASSET_BASE}/assets/bgm.mp3`;

const grid = document.getElementById('grid');
const info = document.getElementById('info');
const startBtn = document.getElementById('startBtn');

const SIZE = 4;
let cells = [];
let sequence = [];
let userIndex = 0;
let playing = false;

const bgm = new Audio(BGM_SRC);
bgm.loop = true;
bgm.volume = 0.4;

function createGrid() {
  grid.innerHTML = '';
  cells = [];

  for (let i = 0; i < SIZE; i++) {
    const div = document.createElement('div');
    div.className = 'cell';
    div.style.backgroundImage = `url(${OFF_IMG})`;

    div.addEventListener('click', () => onTap(i));

    grid.appendChild(div);
    cells.push(div);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function playSequence() {
  playing = true;
  info.textContent = '見て覚えて！';

  await sleep(400);

  for (let i = 0; i < sequence.length; i++) {
    const idx = sequence[i];

    cells[idx].classList.add('on');
    cells[idx].style.backgroundImage = `url(${ON_IMG})`;

    await sleep(500);

    cells[idx].classList.remove('on');
    cells[idx].style.backgroundImage = `url(${OFF_IMG})`;

    await sleep(200);
  }

  await sleep(200);
  playing = false;
  info.textContent = '押して！';
}

function nextRound() {
  userIndex = 0;
  sequence.push(Math.floor(Math.random() * SIZE));
  info.textContent = `Round ${sequence.length}`;

  setTimeout(playSequence, 500);
}

function onTap(index) {
  if (playing) return;

  // 押した瞬間光らせる
  cells[index].classList.add('on');
  cells[index].style.backgroundImage = `url(${ON_IMG})`;

  setTimeout(() => {
    cells[index].classList.remove('on');
    cells[index].style.backgroundImage = `url(${OFF_IMG})`;
  }, 200);

  if (index === sequence[userIndex]) {
    userIndex++;

    if (userIndex === sequence.length) {
      setTimeout(nextRound, 500);
    }
  } else {
    gameOver();
  }
}

function gameOver() {
  info.textContent = `終了：スコア ${sequence.length - 1}`;
  sequence = [];
  playing = true;
  bgm.pause();
  startBtn.style.display = 'inline-block';
}

startBtn.addEventListener('click', () => {
  startBtn.style.display = 'none';
  sequence = [];
  createGrid();
  bgm.currentTime = 0;
  bgm.play();
  nextRound();
});

// 初期化
createGrid();