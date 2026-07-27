const $ = (selector) => document.querySelector(selector);

const ui = {
  startModal: $("#startModal"),
  resultModal: $("#resultModal"),
  startButton: $("#startButton"),
  retryButton: $("#retryButton"),
  soundButton: $("#soundButton"),
  leftButton: $("#leftButton"),
  rightButton: $("#rightButton"),
  swingButton: $("#swingButton"),
  player: $("#player"),
  watermelon: $("#watermelon"),
  burst: $("#burst"),
  callout: $("#callout"),
  score: $("#score"),
  turns: $("#turns"),
  best: $("#best"),
  powerFill: $("#powerFill"),
  powerText: $("#powerText"),
  finalScore: $("#finalScore"),
  resultTitle: $("#resultTitle"),
  resultCopy: $("#resultCopy"),
  resultList: $("#resultList"),
};

let playerX = 50;
let targetX = 50;
let score = 0;
let turns = 3;
let results = [];
let active = false;
let locked = false;
let charging = false;
let charge = 0;
let chargeDirection = 1;
let chargeFrame = 0;
let moveTimer = 0;
let soundOn = true;
let audioContext = null;

function safeBest() {
  try { return Number(localStorage.getItem("suika-wari-best") || 0); }
  catch { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem("suika-wari-best", String(value)); }
  catch { /* Private browsing can deny storage. */ }
}

function tone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playHit(kind) {
  if (kind === "空振り") {
    tone(180, .22, "sawtooth", .05);
    tone(120, .22, "sawtooth", .04, .12);
    return;
  }
  tone(130, .14, "square", .1);
  tone(kind === "粉砕！" ? 520 : 360, .28, "triangle", .09, .06);
  if (kind === "真っ二つ！" || kind === "粉砕！") tone(760, .32, "sine", .06, .15);
}

function setCallout(text, pop = false) {
  ui.callout.textContent = text;
  if (pop) {
    ui.callout.classList.remove("pop");
    requestAnimationFrame(() => ui.callout.classList.add("pop"));
    setTimeout(() => ui.callout.classList.remove("pop"), 350);
  }
}

function updatePosition() {
  ui.player.style.left = `${playerX}%`;
}

function updatePower() {
  const rounded = Math.round(charge);
  ui.powerFill.style.width = `${rounded}%`;
  ui.powerText.textContent = `${rounded}%`;
}

function move(direction) {
  if (!active || locked || charging) return;
  playerX = Math.max(10, Math.min(90, playerX + direction * 2.2));
  updatePosition();
  tone(280 + playerX * 1.2, .035, "sine", .018);
}

function beginMove(direction) {
  move(direction);
  clearInterval(moveTimer);
  moveTimer = setInterval(() => move(direction), 45);
}

function stopMove() {
  clearInterval(moveTimer);
  moveTimer = 0;
}

function beginCharge(event) {
  if (event) event.preventDefault();
  if (!active || locked || charging) return;
  stopMove();
  charging = true;
  charge = 0;
  chargeDirection = 1;
  ui.swingButton.classList.add("charging");
  ui.swingButton.setPointerCapture?.(event?.pointerId);
  setCallout("力をためて…");

  const tick = () => {
    if (!charging) return;
    charge += 1.75 * chargeDirection;
    if (charge >= 100) { charge = 100; chargeDirection = -1; }
    if (charge <= 0) { charge = 0; chargeDirection = 1; }
    updatePower();
    chargeFrame = requestAnimationFrame(tick);
  };
  chargeFrame = requestAnimationFrame(tick);
}

function releaseCharge(event) {
  if (event) event.preventDefault();
  if (!charging) return;
  charging = false;
  cancelAnimationFrame(chargeFrame);
  ui.swingButton.classList.remove("charging");
  swing();
}

function calculateResult(distance, power) {
  const accuracy = Math.max(0, 1 - distance / 30);
  const idealPower = Math.max(0, 1 - Math.abs(power - 82) / 55);
  const points = Math.round(accuracy * 700 + idealPower * 300);

  if (distance > 19) return { label: "空振り", points: Math.round(points * .08), className: "" };
  if (distance > 11 || power < 38) return { label: "ひび割れ", points: Math.max(120, Math.round(points * .55)), className: "cracked" };
  if (distance <= 4.5 && power >= 72 && power <= 94) return { label: "真っ二つ！", points: 1000, className: "split" };
  if (power > 94 && distance <= 8) return { label: "粉砕！", points: Math.min(920, points), className: "smashed" };
  return { label: "いい一撃！", points: Math.min(880, points), className: "split" };
}

function swing() {
  locked = true;
  ui.player.classList.add("swinging");
  ui.leftButton.disabled = true;
  ui.rightButton.disabled = true;
  ui.swingButton.disabled = true;

  const distance = Math.abs(playerX - targetX);
  const result = calculateResult(distance, charge);

  setTimeout(() => {
    ui.watermelon.classList.add("hit");
    if (result.className) ui.watermelon.classList.add(result.className);
    if (result.label !== "空振り") ui.burst.classList.add("show");
    playHit(result.label);
    score += result.points;
    turns -= 1;
    results.push(result);
    ui.score.textContent = score;
    ui.turns.textContent = turns;
    setCallout(`${result.label}　+${result.points}点`, true);
    navigator.vibrate?.(result.label === "空振り" ? 25 : [40, 30, 80]);
  }, 310);

  setTimeout(() => {
    ui.player.classList.remove("swinging");
    if (turns <= 0) {
      finishGame();
    } else {
      nextRound();
    }
  }, 1450);
}

function nextRound() {
  targetX = 24 + Math.random() * 52;
  playerX = Math.max(12, Math.min(88, 50 + (Math.random() - .5) * 12));
  charge = 0;
  updatePower();
  updatePosition();
  ui.watermelon.className = "watermelon";
  ui.watermelon.style.left = `${targetX}%`;
  ui.burst.classList.remove("show");
  ui.leftButton.disabled = false;
  ui.rightButton.disabled = false;
  ui.swingButton.disabled = false;
  locked = false;
  setCallout("次のスイカ！ 狙いを定めよう");
}

function startGame() {
  score = 0;
  turns = 3;
  results = [];
  active = true;
  locked = false;
  charge = 0;
  ui.score.textContent = "0";
  ui.turns.textContent = "3";
  ui.best.textContent = safeBest();
  ui.startModal.classList.remove("active");
  ui.resultModal.classList.remove("active");
  nextRound();
  tone(440, .12, "sine", .06);
  tone(660, .2, "sine", .06, .1);
}

function finishGame() {
  active = false;
  locked = true;
  const previousBest = safeBest();
  if (score > previousBest) saveBest(score);
  ui.best.textContent = Math.max(score, previousBest);
  ui.finalScore.textContent = score;

  if (score >= 2700) {
    ui.resultTitle.textContent = score > previousBest ? "新記録！" : "スイカ割り名人！";
    ui.resultCopy.textContent = "狙いも力加減も完璧。夏があなたを呼んでいます。";
  } else if (score >= 1900) {
    ui.resultTitle.textContent = "夏の達人！";
    ui.resultCopy.textContent = "見事な振り下ろし。もう一度なら名人に届きそう！";
  } else if (score >= 1000) {
    ui.resultTitle.textContent = "なかなかの一撃！";
    ui.resultCopy.textContent = "コツは力みすぎないこと。真っ二つを狙おう！";
  } else {
    ui.resultTitle.textContent = "砂浜の人気者";
    ui.resultCopy.textContent = "スイカは無事でした。次こそ狙いを合わせよう！";
  }

  ui.resultList.innerHTML = results.map((result, index) => `
    <div class="result-chip">
      <b>${index + 1}振り目</b>
      <span>${result.points}点</span>
    </div>
  `).join("");

  setTimeout(() => ui.resultModal.classList.add("active"), 280);
}

function bindHold(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    beginMove(direction);
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach((name) => {
    button.addEventListener(name, stopMove);
  });
}

bindHold(ui.leftButton, -1);
bindHold(ui.rightButton, 1);

ui.swingButton.addEventListener("pointerdown", beginCharge);
ui.swingButton.addEventListener("pointerup", releaseCharge);
ui.swingButton.addEventListener("pointercancel", releaseCharge);
ui.swingButton.addEventListener("lostpointercapture", releaseCharge);
ui.startButton.addEventListener("click", startGame);
ui.retryButton.addEventListener("click", startGame);
ui.soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  ui.soundButton.setAttribute("aria-pressed", String(soundOn));
  ui.soundButton.textContent = soundOn ? "♪" : "×";
  if (soundOn) tone(660, .13, "sine", .06);
});

window.addEventListener("keydown", (event) => {
  if (event.repeat && event.code === "Space") return;
  if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  if (event.code === "Space") { event.preventDefault(); beginCharge(); }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") { event.preventDefault(); releaseCharge(); }
});

window.addEventListener("blur", () => {
  stopMove();
  if (charging) releaseCharge();
});

ui.best.textContent = safeBest();
