const donors = [
  {
    name: "M. KIRISAME",
    type: "O+",
    hydration: "LOW",
    nerves: "STEADY",
    limit: 486,
    drawRate: 0.72,
    dangerRate: 0.5,
    drift: 18,
  },
  {
    name: "A. KUROSAWA",
    type: "AB-",
    hydration: "GOOD",
    nerves: "HIGH",
    limit: 442,
    drawRate: 0.58,
    dangerRate: 0.72,
    drift: 30,
  },
  {
    name: "N. SHIRAI",
    type: "A+",
    hydration: "NORMAL",
    nerves: "LOW",
    limit: 512,
    drawRate: 0.88,
    dangerRate: 0.42,
    drift: 24,
  },
  {
    name: "UNKNOWN",
    type: "--",
    hydration: "UNREADABLE",
    nerves: "SMILING",
    limit: 418,
    drawRate: 0.64,
    dangerRate: 0.96,
    drift: 42,
  },
];

const $ = (id) => document.getElementById(id);

const state = {
  round: 1,
  donorIndex: 0,
  maxRounds: 5,
  quotaMl: 2000,
  amount: 0,
  totalMl: 0,
  totalError: 0,
  danger: 0,
  score: 0,
  streak: 0,
  drawing: false,
  resolved: false,
  failing: false,
  lastTime: performance.now(),
  driftLeft: 0,
  drawRateBoost: 0,
  interventions: {
    rest: 1,
    water: 1,
    talk: 1,
  },
};

const audio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  },
  beep(freq, duration, type = "square", gain = 0.025) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start();
    amp.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  },
  flatline() {
    this.beep(880, 1.2, "sine", 0.045);
  },
  success() {
    this.beep(420, 0.08, "triangle", 0.03);
    setTimeout(() => this.beep(620, 0.1, "triangle", 0.03), 90);
  },
};

const els = {
  roundLabel: $("roundLabel"),
  shiftLabel: $("shiftLabel"),
  machineMood: $("machineMood"),
  quotaLabel: $("quotaLabel"),
  donorName: $("donorName"),
  bloodType: $("bloodType"),
  hydration: $("hydration"),
  nerves: $("nerves"),
  limitReadout: $("limitReadout"),
  warning: $("warning"),
  bloodFill: $("bloodFill"),
  dangerFill: $("dangerFill"),
  mlReadout: $("mlReadout"),
  resultText: $("resultText"),
  overLine: $("overLine"),
  score: $("score"),
  streak: $("streak"),
  drawButton: $("drawButton"),
  restButton: $("restButton"),
  waterButton: $("waterButton"),
  talkButton: $("talkButton"),
  nextButton: $("nextButton"),
  failureBackButton: $("failureBackButton"),
  failureCode: $("failureCode"),
  failureMessage: $("failureMessage"),
  shiftOverlay: $("shiftOverlay"),
  shiftResult: $("shiftResult"),
  shiftScore: $("shiftScore"),
  shiftVerdict: $("shiftVerdict"),
  shiftBackButton: $("shiftBackButton"),
};

function currentDonor() {
  return donors[state.donorIndex % donors.length];
}

function gradeFromError(error) {
  if (error <= 5) return "S";
  if (error <= 15) return "A";
  if (error <= 30) return "B";
  if (error <= 55) return "C";
  return "D";
}

function setRound() {
  const donor = currentDonor();
  state.amount = 0;
  state.danger = Math.max(0, state.round * 2 - 2);
  state.drawing = false;
  state.resolved = false;
  state.failing = false;
  state.driftLeft = 0;
  state.drawRateBoost = 0;
  state.interventions = { rest: 1, water: 1, talk: 1 };

  els.roundLabel.textContent = `ROUND ${String(state.round).padStart(2, "0")}`;
  els.shiftLabel.textContent = `SHIFT ${state.round - 1}/${state.maxRounds}`;
  els.quotaLabel.textContent = `${state.maxRounds}人で${state.quotaMl}ml`;
  els.machineMood.textContent =
    state.round < 3 ? "CALIBRATED" : state.round < 5 ? "HUNGRY" : "DON'T STOP";
  els.donorName.textContent = donor.name;
  els.bloodType.textContent = donor.type;
  els.hydration.textContent = donor.hydration;
  els.nerves.textContent = donor.nerves;
  els.limitReadout.textContent = state.round < 3 ? "VARIABLE" : `${donor.limit - 14}~${donor.limit + 14}ml`;
  els.warning.textContent = "GOAL: STOP NEAR 400ml";
  els.resultText.textContent = "長押しで増やす。400ml付近で離す。";
  els.nextButton.hidden = true;
  els.failureBackButton.hidden = true;
  els.shiftOverlay.classList.remove("show");
  els.shiftOverlay.setAttribute("aria-hidden", "true");
  els.drawButton.textContent = "HOLD TO DRAW";
  els.drawButton.disabled = false;
  els.restButton.disabled = false;
  els.waterButton.disabled = false;
  els.talkButton.disabled = false;
  els.drawButton.classList.remove("active");
  document.querySelector(".controls").classList.remove("round-over");
  els.donorName.classList.toggle("glitch", state.round >= 4);
  document.body.classList.remove("failure");
  render();
}

function render() {
  const donor = currentDonor();
  const fillPct = Math.min(100, (state.amount / 600) * 100);
  const dangerPct = Math.min(100, state.danger);
  const overBottom = Math.max(4, 100 - (donor.limit / 600) * 100);

  els.bloodFill.style.height = `${fillPct}%`;
  els.dangerFill.style.height = `${dangerPct}%`;
  els.dangerFill.style.width = `${dangerPct}%`;
  els.mlReadout.textContent = `${String(Math.floor(state.amount)).padStart(3, "0")}ml`;
  els.overLine.style.bottom = `${overBottom}%`;
  els.score.textContent = String(state.score);
  els.streak.textContent = String(state.streak);

  if (!state.resolved && !state.failing) {
    if (state.amount >= 390 && state.amount <= 410) {
      els.warning.textContent = "SEAL NOW";
    } else if (state.amount > 410) {
      els.warning.textContent = state.round >= 3 ? "DON'T STOP" : "OVER TARGET";
    } else if (state.danger > 72) {
      els.warning.textContent = "STOP";
    } else if (state.danger > 46) {
      els.warning.textContent = "CAUTION";
    } else {
      els.warning.textContent = "GOAL: STOP NEAR 400ml";
    }
  }
}

function tick(now) {
  const dt = Math.min(48, now - state.lastTime);
  state.lastTime = now;

  if (!state.resolved && !state.failing) {
    const donor = currentDonor();
    const roundPressure = 1 + state.round * 0.04;

    if (state.drawing) {
      state.amount += (donor.drawRate + state.drawRateBoost) * roundPressure * dt;
      state.danger += donor.dangerRate * roundPressure * (dt / 100);
    } else if (state.driftLeft > 0) {
      const drift = Math.min(state.driftLeft, (donor.drawRate + state.drawRateBoost) * 0.42 * dt);
      state.amount += drift;
      state.driftLeft -= drift;
      state.danger += donor.dangerRate * (dt / 220);
    } else {
      state.danger = Math.max(0, state.danger - dt / 260);
    }

    if (state.amount > donor.limit || state.danger >= 100) {
      fail();
    }
  }

  render();
  requestAnimationFrame(tick);
}

function beginDraw(event) {
  event.preventDefault();
  if (state.resolved || state.failing) return;
  audio.init();
  state.drawing = true;
  els.drawButton.classList.add("active");
  els.drawButton.textContent = "RELEASE TO SEAL";
  els.resultText.textContent = "400mlに近づいたら離す。赤ライン超過で失敗。";
}

function endDraw() {
  if (!state.drawing || state.resolved || state.failing) return;
  state.drawing = false;
  els.drawButton.classList.remove("active");
  els.drawButton.textContent = "SEALING...";
  els.resultText.textContent = "シール中... 少しだけ惰性で増える。";
  state.driftLeft += currentDonor().drift + state.round * 2;
  setTimeout(resolveIfStable, 520);
}

function resolveIfStable() {
  if (state.drawing || state.resolved || state.failing || state.driftLeft > 0.5) return;
  const distance = Math.abs(400 - state.amount);
  const sealedMl = Math.round(state.amount);
  const errorMl = Math.round(Math.abs(400 - sealedMl));
  const grade = gradeFromError(errorMl);
  const points = Math.max(0, Math.round(1200 - distance * 18 - state.danger * 3));
  state.totalMl += sealedMl;
  state.totalError += errorMl;
  state.score += points;
  state.streak += 1;
  state.resolved = true;
  els.shiftLabel.textContent = `SHIFT ${state.round}/${state.maxRounds}`;
  els.resultText.textContent =
    distance <= 4
      ? `GRADE ${grade}: ${sealedMl}ml / ERROR ${errorMl}ml / TOTAL ${state.totalMl}ml`
      : `GRADE ${grade}: ${sealedMl}ml / ERROR ${errorMl}ml / TOTAL ${state.totalMl}ml`;
  els.warning.textContent = distance <= 10 ? "THANK YOU FOR YOUR CONTRIBUTION" : "ACCEPTED";
  els.nextButton.hidden = false;
  document.querySelector(".controls").classList.add("round-over");
  els.drawButton.disabled = true;
  els.restButton.disabled = true;
  els.waterButton.disabled = true;
  els.talkButton.disabled = true;
  audio.success();

  if (state.round >= state.maxRounds) {
    setTimeout(completeShift, 650);
  }
}

function intervene(type) {
  if (state.resolved || state.failing || state.interventions[type] <= 0) return;
  audio.init();
  state.interventions[type] -= 1;

  if (type === "rest") {
    state.danger = Math.max(0, state.danger - 22);
    state.driftLeft = Math.max(0, state.driftLeft - 8);
    els.resultText.textContent = "REST CYCLE ACCEPTED";
    els.restButton.disabled = true;
  }

  if (type === "water") {
    state.danger = Math.max(0, state.danger - 14);
    state.drawRateBoost = 0.02;
    els.resultText.textContent = "HYDRATION SIGNAL IMPROVED";
    els.waterButton.disabled = true;
  }

  if (type === "talk") {
    state.danger = Math.max(0, state.danger - 17);
    els.resultText.textContent = state.round >= 4 ? "THE MACHINE ANSWERED FIRST" : "NERVES REDUCED";
    els.talkButton.disabled = true;
  }

  audio.beep(260, 0.08, "triangle", 0.02);
}

function fail() {
  if (state.failing) return;
  state.failing = true;
  state.drawing = false;
  state.resolved = true;
  state.streak = 0;
  els.drawButton.classList.remove("active");
  els.drawButton.textContent = "SIGNAL LOST";
  els.drawButton.disabled = true;
  els.restButton.disabled = true;
  els.waterButton.disabled = true;
  els.talkButton.disabled = true;
  els.failureCode.textContent = state.round >= 4 ? "DONOR NAME: UNKNOWN" : "DONOR SIGNAL LOST";
  els.failureMessage.textContent =
    state.amount > currentDonor().limit ? "OVERDRAW DETECTED" : "SAFETY DEVICE DID NOT RESPOND";
  els.resultText.textContent = "NO SEAL CONFIRMED";
  els.warning.textContent = "DON'T STOP";
  document.body.classList.add("failure");
  audio.flatline();
  setTimeout(() => {
    els.nextButton.hidden = false;
    els.nextButton.textContent = "REBOOT UNIT";
    els.failureBackButton.hidden = false;
    document.querySelector(".controls").classList.add("round-over");
  }, 2900);
}

function resetGame() {
  state.round = 1;
  state.donorIndex = 0;
  state.score = 0;
  state.totalMl = 0;
  state.totalError = 0;
  state.streak = 0;
  els.nextButton.textContent = "NEXT FILE";
  setRound();
}

function completeShift() {
  const metQuota = state.totalMl >= state.quotaMl;
  const averageError = Math.round(state.totalError / state.maxRounds);
  const grade = gradeFromError(averageError);
  els.nextButton.hidden = true;
  els.shiftResult.textContent = metQuota ? "SHIFT COMPLETE" : "SHIFT FAILED";
  els.shiftScore.textContent = `${state.totalMl}ml / ${state.quotaMl}ml`;
  els.shiftVerdict.textContent = metQuota
    ? `GRADE ${grade} / AVG ERROR ${averageError}ml`
    : `GRADE ${grade} / QUOTA MISSED`;
  els.shiftVerdict.style.color = metQuota ? "var(--cyan)" : "var(--red)";
  els.shiftOverlay.classList.add("show");
  els.shiftOverlay.setAttribute("aria-hidden", "false");
}

function nextRound() {
  state.round += 1;
  state.donorIndex += 1;
  els.nextButton.textContent = "NEXT FILE";
  setRound();
}

els.drawButton.addEventListener("pointerdown", beginDraw);
window.addEventListener("pointerup", endDraw);
window.addEventListener("pointercancel", endDraw);
els.restButton.addEventListener("click", () => intervene("rest"));
els.waterButton.addEventListener("click", () => intervene("water"));
els.talkButton.addEventListener("click", () => intervene("talk"));
els.nextButton.addEventListener("click", nextRound);
els.failureBackButton.addEventListener("click", resetGame);
els.shiftBackButton.addEventListener("click", resetGame);

setRound();
requestAnimationFrame((time) => {
  state.lastTime = time;
  requestAnimationFrame(tick);
});
