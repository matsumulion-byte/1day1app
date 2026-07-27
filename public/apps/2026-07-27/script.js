const $ = (selector) => document.querySelector(selector);
const ui = {
  intro: $("#intro"),
  blindfold: $("#blindfold"),
  result: $("#result"),
  startButton: $("#startButton"),
  retryButton: $("#retryButton"),
  soundButton: $("#soundButton"),
  round: $("#round"),
  steps: $("#steps"),
  speaker: $("#speaker"),
  voiceMain: $("#voiceMain"),
  voiceSub: $("#voiceSub"),
  voiceLines: $("#voiceLines"),
  controls: $("#controls"),
  directions: [...document.querySelectorAll(".direction")],
  swingButton: $("#swingButton"),
  reveal: $("#reveal"),
  melon: $("#melon"),
  revealLabel: $("#revealLabel"),
  revealScore: $("#revealScore"),
  resultTitle: $("#resultTitle"),
  totalScore: $("#totalScore"),
  resultCopy: $("#resultCopy"),
  roundResults: $("#roundResults"),
};

const people = ["左の人", "右の人", "後ろのみんな", "ちびっこ応援団"];
let round = 1;
let steps = 12;
let player = { x: 0, y: 0 };
let target = { x: 0, y: 0 };
let results = [];
let locked = false;
let soundOn = true;
let audioContext;
let touchStart = null;

function randomTarget() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 4.5 + Math.random() * 2.5;
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
  };
}

function distanceToTarget() {
  return Math.hypot(target.x - player.x, target.y - player.y);
}

function speak(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[！!]/g, "！"));
  utterance.lang = "ja-JP";
  utterance.rate = 1.12;
  utterance.pitch = 1.15;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
}

function noise(frequency = 180, duration = .12) {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.06, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function setVoice(main, sub = "", shouldSpeak = true) {
  ui.voiceMain.textContent = main;
  ui.voiceSub.textContent = sub;
  ui.speaker.textContent = people[Math.floor(Math.random() * people.length)];
  ui.voiceMain.classList.remove("shout");
  ui.voiceLines.innerHTML = "<i></i><i></i><i></i>";
  requestAnimationFrame(() => ui.voiceMain.classList.add("shout"));
  if (shouldSpeak) speak(main);
}

function guide() {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = distanceToTarget();

  ui.swingButton.classList.toggle("ready", distance <= 1.45);

  if (distance <= .7) {
    setVoice("そこ！ そこだよ！", "今だ、棒を振って！");
    navigator.vibrate?.([35, 30, 35]);
    return;
  }

  if (distance <= 1.45) {
    setVoice("すぐそこ！", "もう動かずに振って！");
    return;
  }

  const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
  let main;
  let amount;

  if (horizontalFirst) {
    main = dx > 0 ? "右！" : "左！";
    amount = Math.min(3, Math.max(1, Math.round(Math.abs(dx))));
  } else {
    main = dy > 0 ? "前！" : "後ろ！";
    amount = Math.min(3, Math.max(1, Math.round(Math.abs(dy))));
  }

  if (distance > 5) main = `${main} もっと！`;
  else if (distance < 2.5) main = `${main} ちょっと！`;
  setVoice(main, `あと${amount}歩くらい`);
}

function setControls(disabled) {
  ui.directions.forEach((button) => { button.disabled = disabled; });
  ui.swingButton.disabled = disabled;
}

function startRound() {
  player = { x: 0, y: 0 };
  target = randomTarget();
  steps = 12;
  locked = true;
  ui.round.textContent = round;
  ui.steps.textContent = steps;
  ui.reveal.classList.remove("active");
  ui.melon.className = "melon";
  setControls(true);
  setVoice("目隠し完了。", "声が聞こえるまで待って…", false);

  let count = 3;
  const countdown = setInterval(() => {
    if (count > 0) {
      setVoice(String(count), "", true);
      count -= 1;
    } else {
      clearInterval(countdown);
      locked = false;
      setControls(false);
      guide();
    }
  }, 720);
}

function startGame() {
  window.speechSynthesis?.cancel();
  round = 1;
  results = [];
  ui.intro.classList.remove("active");
  ui.result.classList.remove("active");
  ui.blindfold.classList.add("active");
  startRound();
}

function move(direction) {
  if (locked || steps <= 0) return;
  const vectors = {
    up: { x: 0, y: 1 },
    down: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const vector = vectors[direction];
  player.x += vector.x;
  player.y += vector.y;
  steps -= 1;
  ui.steps.textContent = steps;
  noise(125 + steps * 5, .08);
  navigator.vibrate?.(18);

  if (steps <= 0) {
    setVoice("もう振るしかない！", "最後のチャンス！");
    ui.directions.forEach((button) => { button.disabled = true; });
    ui.swingButton.classList.add("ready");
    return;
  }
  guide();
}

function evaluateSwing() {
  const distance = distanceToTarget();
  if (distance <= .7) return { label: "真っ二つ！", score: 1000, style: "split" };
  if (distance <= 1.45) return { label: "命中！", score: Math.round(920 - distance * 160), style: "hit" };
  if (distance <= 2.6) return { label: "かすった！", score: Math.round(560 - distance * 90), style: "hit" };
  return { label: "空振り…", score: 0, style: "" };
}

function swing() {
  if (locked) return;
  locked = true;
  setControls(true);
  window.speechSynthesis?.cancel();
  setVoice("いけーっ！", "", true);
  noise(95, .28);

  setTimeout(() => {
    const outcome = evaluateSwing();
    results.push(outcome);
    ui.melon.className = `melon ${outcome.style}`;
    ui.revealLabel.textContent = outcome.label;
    ui.revealScore.textContent = `+${outcome.score}点`;
    ui.reveal.classList.add("active");
    speak(outcome.label);
    navigator.vibrate?.(outcome.score ? [70, 35, 110] : 35);

    setTimeout(() => {
      if (round < 3) {
        round += 1;
        startRound();
      } else {
        finishGame();
      }
    }, 1800);
  }, 650);
}

function finishGame() {
  window.speechSynthesis?.cancel();
  ui.blindfold.classList.remove("active");
  ui.result.classList.add("active");
  const total = results.reduce((sum, item) => sum + item.score, 0);
  ui.totalScore.textContent = total;

  if (total >= 2600) {
    ui.resultTitle.textContent = "スイカ割り名人！";
    ui.resultCopy.textContent = "目隠しでも迷いなし。声と心が完全に通じています。";
  } else if (total >= 1600) {
    ui.resultTitle.textContent = "夏の達人！";
    ui.resultCopy.textContent = "いい耳をしています。あと一歩で名人です。";
  } else if (total > 0) {
    ui.resultTitle.textContent = "惜しい！";
    ui.resultCopy.textContent = "声は聞こえていました。次は「そこ！」を信じよう。";
  } else {
    ui.resultTitle.textContent = "方向音痴の夏";
    ui.resultCopy.textContent = "スイカは無事でした。みんなの声をもう一度よく聞こう。";
  }

  ui.roundResults.innerHTML = results.map((item, index) => `
    <div class="result-chip"><b>${index + 1}回目</b><span>${item.score}点</span></div>
  `).join("");
}

ui.startButton.addEventListener("click", startGame);
ui.retryButton.addEventListener("click", startGame);
ui.directions.forEach((button) => button.addEventListener("click", () => move(button.dataset.move)));
ui.swingButton.addEventListener("click", swing);

ui.soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  ui.soundButton.setAttribute("aria-pressed", String(soundOn));
  ui.soundButton.textContent = soundOn ? "音声 ON" : "音声 OFF";
  if (!soundOn) window.speechSynthesis?.cancel();
  else guide();
});

window.addEventListener("keydown", (event) => {
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  if (keys[event.key]) {
    event.preventDefault();
    move(keys[event.key]);
  }
  if ((event.code === "Space" || event.key === "Enter") && !event.repeat) {
    event.preventDefault();
    swing();
  }
});

ui.blindfold.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  touchStart = { x: event.clientX, y: event.clientY };
});
ui.blindfold.addEventListener("pointerup", (event) => {
  if (!touchStart || event.target.closest("button")) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 35) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
});
