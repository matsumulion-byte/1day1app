const asset = (p) => new URL(p, import.meta.url).toString();

const horse = document.getElementById("horse");
const runBtn = document.getElementById("runBtn");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const resultText = document.getElementById("resultText");

const distanceText = document.getElementById("distanceText");
const timeText = document.getElementById("timeText");
const staminaBar = document.getElementById("staminaBar");

const grassA = document.querySelector(".grass-a");
const grassB = document.querySelector(".grass-b");
const railBack = document.querySelector(".rail-back");
const railFront = document.querySelector(".rail-front");
const goalLine = document.getElementById("goalLine");

const bgm = document.getElementById("bgm");

const horseFrames = [
  asset("./assets/horse1.png"),
  asset("./assets/horse2.png")
];

const GOAL_DISTANCE = 3200;
const BASE_SPEED = 0.45;
const MAX_SPEED = 7.6;

let state = "ready";
let distance = 0;
let speed = 0;
let stamina = 100;
let frameTick = 0;
let bgX = 0;
let railX = 0;
let startTime = 0;
let lastTime = 0;
let recentTaps = [];
let recoveryDelay = 0;

horse.src = horseFrames[0];

function resetGame() {
  state = "ready";
  distance = 0;
  speed = 0;
  stamina = 100;
  frameTick = 0;
  bgX = 0;
  railX = 0;
  startTime = 0;
  lastTime = 0;
  recentTaps = [];
  recoveryDelay = 0;

  horse.src = horseFrames[0];
  horse.style.transform = "translateX(-50%) translateY(0)";
  grassA.style.transform = "translateX(0)";
  grassB.style.transform = "translateX(0)";
  railBack.style.transform = "translateX(0) scaleY(.7)";
  railFront.style.transform = "translateX(0)";
  goalLine.style.right = "-60px";

  distanceText.textContent = "0";
  timeText.textContent = "0.00";
  staminaBar.style.transform = "scaleX(1)";

  runBtn.disabled = false;
  resultPanel.classList.add("hidden");
  startPanel.classList.remove("hidden");

  bgm.pause();
  bgm.currentTime = 0;
}

async function startGame() {
  state = "running";
  startPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  startTime = performance.now();
  lastTime = startTime;

  try {
    bgm.currentTime = 0;
    bgm.volume = 0.55;
    await bgm.play();
  } catch (e) {}

  requestAnimationFrame(loop);
}

function tapRun() {
  if (state !== "running") return;

  const now = performance.now();
  recentTaps = recentTaps.filter((t) => now - t < 800);
  recentTaps.push(now);

  const tapPressure = recentTaps.length;

  if (stamina > 0) {
    speed += 0.95;

    // 連打するほどスタミナを大きく消費
    stamina -= 5.5 + Math.max(0, tapPressure - 3) * 2.2;

    // 過連打ペナルティ
    if (tapPressure >= 7) {
      speed *= 0.84;
    }
  } else {
    // スタミナ切れ中に押すとほぼ止まる
    speed *= 0.15;
    stamina -= 8;
    recoveryDelay = 1200;
  }

  speed = clamp(speed, 0, MAX_SPEED);
  stamina = clamp(stamina, 0, 100);
}

function loop(now) {
  if (state !== "running") return;

  const dt = Math.min((now - lastTime) / 16.666, 2);
  lastTime = now;

  const staminaFactor = stamina <= 0 ? 0 : 1;
  const naturalSpeed = BASE_SPEED * staminaFactor;

  if (stamina <= 0) {
    // スタミナ切れ中は強制失速
    speed *= Math.pow(0.88, dt);
    // 失速後の速度も低く抑えて、明確に失速した見た目にする
    speed = Math.min(speed, 1.2);
  } else {
    speed += naturalSpeed * 0.035 * dt;
    speed *= Math.pow(0.982, dt);
  }

  if (recoveryDelay > 0) {
    recoveryDelay -= 16.666 * dt;
  } else if (stamina < 100) {
    // 速く走っている間はほぼ回復しない
    stamina += (speed < 1.8 ? 0.38 : 0.06) * dt;
  }

  speed = clamp(speed, 0, MAX_SPEED);
  stamina = clamp(stamina, 0, 100);

  distance += speed * dt;

  bgX -= speed * 5.8 * dt;
  railX -= speed * 8.5 * dt;

  grassA.style.transform = `translateX(${bgX % window.innerWidth}px)`;
  grassB.style.transform = `translateX(${(bgX * 1.7) % window.innerWidth}px)`;
  railBack.style.transform = `translateX(${(railX * 0.65) % window.innerWidth}px) scaleY(.7)`;
  railFront.style.transform = `translateX(${railX % window.innerWidth}px)`;

  frameTick += (0.16 + speed * 0.07) * dt;
  horse.src = horseFrames[Math.floor(frameTick) % horseFrames.length];

  const bob = Math.sin(frameTick * Math.PI) * Math.min(8, 2 + speed);
  const tiredDrop = stamina <= 0 ? 10 : 0;
  horse.style.transform = `translateX(-50%) translateY(${bob + tiredDrop}px)`;

  const elapsed = (now - startTime) / 1000;
  distanceText.textContent = Math.floor(Math.min(distance, GOAL_DISTANCE));
  timeText.textContent = elapsed.toFixed(2);
  staminaBar.style.transform = `scaleX(${stamina / 100})`;

  const remain = GOAL_DISTANCE - distance;
  if (remain < 260) {
    const goalRight = -60 + (260 - remain) * 1.25;
    goalLine.style.right = `${goalRight}px`;
  }

  runBtn.disabled = false;

  if (distance >= GOAL_DISTANCE) {
    finish(elapsed);
    return;
  }

  requestAnimationFrame(loop);
}

function finish(time) {
  state = "finished";
  bgm.pause();

  let rank = "掲示板外";
  let comment = "最後は脚色が鈍った。次走に期待。";

  if (time <= 22) {
    rank = "1着";
    comment = "直線一気。完勝。";
  } else if (time <= 25) {
    rank = "2着";
    comment = "勝ち馬には届かずも、内容は上々。";
  } else if (time <= 28) {
    rank = "3着";
    comment = "粘り込み成功。馬券圏内。";
  }

  resultText.innerHTML = `
    着順：<b>${rank}</b><br>
    タイム：<b>${time.toFixed(2)}秒</b><br>
    ${comment}
  `;

  resultPanel.classList.remove("hidden");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", resetGame);
runBtn.addEventListener("pointerdown", tapRun);

resetGame();