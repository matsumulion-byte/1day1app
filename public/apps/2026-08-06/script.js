const rounds = [
  { target: 3, order: "サンドイッチ用に、ぴったり" },
  { target: 8, order: "ぜいたく厚切り、ぴったり" },
  { target: 1.5, order: "透けそうなうす切り、ぴったり" },
  { target: 11, order: "ステーキみたいに、ぴったり" },
  { target: 5, order: "最後は基本の、ぴったり" }
];
const state = { round: 0, score: 0, cuts: [], value: 0, direction: 1, speed: .008, running: true, sound: true, last: performance.now() };
const $ = id => document.getElementById(id);
let audio;

function setupRound() {
  const data = rounds[state.round];
  state.value = .2;
  state.direction = 1;
  state.speed = .0075 + state.round * .0008;
  state.running = true;
  state.last = performance.now();
  $("roundNow").textContent = state.round + 1;
  $("targetText").textContent = data.target.toFixed(1);
  $("orderText").innerHTML = `${data.order} <strong id="targetText">${data.target.toFixed(1)}</strong> mmで！`;
  const pct = data.target / 15 * 100;
  $("targetZone").style.left = `calc(${pct}% - 9px)`;
  $("targetZone").style.width = "18px";
  $("guide").style.left = `${9 + data.target / 15 * 83}%`;
  $("slice").className = "slice";
  $("knife").className = "knife";
  $("cutBtn").disabled = false;
}

function frame(now) {
  if (state.running) {
    const dt = Math.min(35, now - state.last);
    state.value += state.direction * state.speed * dt;
    if (state.value >= 15) { state.value = 15; state.direction = -1; }
    if (state.value <= 0) { state.value = 0; state.direction = 1; }
    draw();
  }
  state.last = now;
  requestAnimationFrame(frame);
}

function draw() {
  const pct = state.value / 15 * 100;
  $("currentText").textContent = state.value.toFixed(1);
  $("needle").style.left = `${pct}%`;
  const boardPct = 9 + pct * .83;
  $("knife").style.left = `calc(${boardPct}% - 39px)`;
  $("knife").style.setProperty("--knife-x", "0px");
}

function cut() {
  if (!state.running) return;
  state.running = false;
  $("cutBtn").disabled = true;
  const actual = Math.round(state.value * 10) / 10;
  const diff = Math.abs(actual - rounds[state.round].target);
  const points = Math.max(0, Math.round(100 - diff * 18));
  const rating = diff <= .2 ? ["神業！", "perfect"] : diff <= .6 ? ["職人技！", "great"] : diff <= 1.5 ? ["いい厚み！", "good"] : ["大胆カット！", "ok"];
  state.score += points;
  state.cuts.push({ actual, points });
  const width = Math.max(5, actual / 15 * 83);
  $("slice").style.left = `${9 + actual / 15 * 83}%`;
  $("slice").style.width = `${width}%`;
  $("knife").classList.add("chop");
  makeCrumbs();
  soundCut(rating[1] === "perfect");
  setTimeout(() => $("slice").classList.add("fall"), 180);
  setTimeout(() => showResult(actual, diff, points, rating[0]), 650);
}

function showResult(actual, diff, points, stamp) {
  $("actualText").textContent = actual.toFixed(1);
  $("diffText").textContent = `注文との差 ${diff.toFixed(1)} mm`;
  $("pointText").textContent = `${points}点`;
  $("stamp").textContent = stamp;
  $("resultSlice").style.transform = `scaleX(${Math.max(.35, Math.min(1.4, actual / 7))})`;
  $("nextBtn").textContent = state.round === rounds.length - 1 ? "盛り合わせ完成！" : "次の注文へ";
  $("resultModal").hidden = false;
  renderPlate();
}

function next() {
  $("resultModal").hidden = true;
  state.round++;
  if (state.round >= rounds.length) showFinal(); else setupRound();
}

function renderPlate() {
  $("scoreText").textContent = `${state.score}点`;
  $("plate").innerHTML = state.cuts.map((c, i) => `<i class="plate-slice" style="--r:${-15 + i * 8}deg;opacity:${.72 + c.points / 360}" title="${c.actual.toFixed(1)}mm"></i>`).join("");
}

function showFinal() {
  const avg = state.score / rounds.length;
  const result = avg >= 95 ? ["S", "伝説のハム職人"] : avg >= 82 ? ["A", "一流ハム職人"] : avg >= 65 ? ["B", "町のハム職人"] : ["C", "見習いハム職人"];
  $("rankText").textContent = result[0];
  $("finalTitle").textContent = result[1];
  $("finalScore").textContent = `${state.score}点`;
  $("finalModal").hidden = false;
  fanfare();
}

function retry() {
  $("finalModal").hidden = true;
  Object.assign(state, { round: 0, score: 0, cuts: [] });
  $("plate").innerHTML = "<p>切ったハムが<br>ここに並びます</p>";
  $("scoreText").textContent = "0点";
  setupRound();
}

function makeCrumbs() {
  const holder = $("crumbs");
  for (let i = 0; i < 7; i++) {
    const crumb = document.createElement("i");
    crumb.className = "crumb";
    crumb.style.cssText = `left:${44 + Math.random()*12}%;top:48%;--x:${-35+Math.random()*70}px;--y:${-20+Math.random()*70}px`;
    holder.appendChild(crumb);
    setTimeout(() => crumb.remove(), 700);
  }
}

function tone(freq, duration, type = "sine", gain = .04, delay = 0) {
  if (!state.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator(), vol = audio.createGain(), start = audio.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    vol.gain.setValueAtTime(gain, start); vol.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(vol); vol.connect(audio.destination); osc.start(start); osc.stop(start + duration);
  } catch (_) {}
}
function soundCut(perfect) { tone(120, .08, "sawtooth", .055); tone(650, .08, "triangle", .035, .07); if (perfect) tone(980, .22, "sine", .035, .16); }
function fanfare() { [440, 554, 659, 880].forEach((n, i) => tone(n, .25, "triangle", .035, i * .09)); }

$("cutBtn").addEventListener("click", cut);
$("nextBtn").addEventListener("click", next);
$("retryBtn").addEventListener("click", retry);
$("soundBtn").addEventListener("click", () => { state.sound = !state.sound; $("soundBtn").textContent = `音 ${state.sound ? "ON" : "OFF"}`; if (state.sound) tone(550, .08); });
document.addEventListener("keydown", e => { if ((e.code === "Space" || e.code === "Enter") && state.running) { e.preventDefault(); cut(); } });
setupRound();
requestAnimationFrame(frame);
