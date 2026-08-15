const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const random = (min, max) => Math.random() * (max - min) + min;
const pick = (items) => items[Math.floor(Math.random() * items.length)];

const screens = $$(".screen");
const state = {
  screen: "titleScreen", vegetable: "cucumber", length: 50, angle: 50, spacing: 55,
  stats: { speed: 72, stability: 65, jump: 58, completion: 82 }, sound: true,
  racing: false, guts: 3, racers: [], obstacles: [], startTime: 0, raceId: 0, result: null,
};
let audioContext;

const cpuNames = ["爆速キュウリ号", "帰りたくないナス", "紫紺の漬物", "ご先祖エクスプレス", "割り箸四天王", "盆ボヤージュ", "ヘタ付き大将"];
const obstacleTypes = [
  { key: "seam", icon: "╫", label: "畳の継ぎ目", difficulty: 8 },
  { key: "rakugan", icon: "◈", label: "お供え物の落雁", difficulty: 17 },
  { key: "hozuki", icon: "●", label: "転がるほおずき", difficulty: 22 },
  { key: "smoke", icon: "〰", label: "蚊取り線香の煙", difficulty: 13 },
  { key: "lantern", icon: "🏮", label: "小さな盆提灯", difficulty: 28 },
  { key: "updraft", icon: "↑", label: "迎え火の上昇気流", difficulty: 19 },
];
const commentary = {
  start: ["各馬、一斉にお盆へ帰ってきました！", "四頭そろって好発進！ 盆の大一番です！", "迎え火を背に、いま出走しました！"],
  fast: ["キュウリ号、驚異的な加速！", "速い、速すぎる！ 夕飯までには戻れそうです！", "割り箸が風を切る！ 見事な直線です！"],
  stable: ["ナス号、遅い！ しかし非常に安定しています！", "微動だにしない重厚な走り！", "この安定感、さすがナスの低重心！"],
  bad: ["前脚が長すぎる！ 明らかな設計ミスです！", "これは馬なのか、ただの野菜なのか！", "後ろ脚を引きずった！ それでも前へ進みます！", "逆方向を向きかけた！ 盆はあちらです！"],
  obstacle: ["割り箸が畳の継ぎ目を捉えた！", "お供え物を鮮やかにかわした！", "ほおずきが転がる！ 足元に注意！", "煙で前が見えない！ 野菜に目はあるのか！"],
  guts: ["ここで踏ん張った！ ご先祖への強い思い！", "渾身の踏ん張り！ 割り箸がしなる！", "踏ん張り札を切った！ 障害をねじ伏せる！"],
  finish: ["ゴール！ 無事に送り届けました！", "いま決着！ 盆の大一番を走り切りました！", "全馬完走！ 無事に着けば問題なし！"],
};

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  state.screen = id;
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function setVegetable(type) {
  state.vegetable = type;
  $$(".vegetable-card").forEach((card) => {
    const selected = card.dataset.veg === type;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-checked", selected);
  });
  updateHorseType($("#buildHorse"));
  calculateStats();
  updateTuning();
  tone(type === "cucumber" ? 510 : 360, .07);
}

function updateHorseType(horse) {
  if (!horse) return;
  horse.classList.toggle("cucumber", state.vegetable === "cucumber");
  horse.classList.toggle("eggplant", state.vegetable === "eggplant");
}

function calculateStats() {
  const lengthFit = 1 - Math.abs(state.length - 54) / 55;
  const angleFit = 1 - Math.abs(state.angle - 50) / 50;
  const spacingFit = 1 - Math.abs(state.spacing - 58) / 58;
  const completion = clamp((lengthFit * .34 + angleFit * .36 + spacingFit * .3) * 100);
  if (state.vegetable === "cucumber") {
    state.stats.speed = clamp(62 + state.length * .19 + angleFit * 16 - Math.abs(state.spacing - 58) * .12);
    state.stats.stability = clamp(25 + completion * .55 - Math.abs(state.length - 52) * .14);
    state.stats.jump = clamp(40 + Math.abs(state.length - 50) * .35 + (100 - angleFit * 100) * .28);
  } else {
    state.stats.speed = clamp(39 + state.length * .13 + angleFit * 12);
    state.stats.stability = clamp(51 + completion * .46);
    state.stats.jump = clamp(34 + state.length * .22 + (100 - state.spacing) * .1);
  }
  state.stats.completion = completion;
  Object.keys(state.stats).forEach((key) => { state.stats[key] = Math.round(state.stats[key]); });
}

function updateTuning() {
  const horse = $("#buildHorse");
  if (!horse) return;
  const length = 26 + state.length * .43;
  const angle = (state.angle - 50) * .42;
  const gap = 42 + state.spacing * .48;
  horse.style.setProperty("--leg-l", `${length}px`);
  horse.style.setProperty("--leg-a", `${angle}deg`);
  horse.style.setProperty("--front", `${65 - gap / 2}px`);
  horse.style.setProperty("--back", `${65 + gap / 2}px`);
  const outputs = {
    lengthOut: state.length < 30 ? "かなり短い" : state.length > 72 ? "かなり長い" : "ふつう",
    angleOut: state.angle < 30 ? "内股" : state.angle > 70 ? "大股" : "まっすぐ",
    spacingOut: state.spacing < 30 ? "ぎゅっと" : state.spacing > 75 ? "広すぎ" : "ふつう",
  };
  Object.entries(outputs).forEach(([id, text]) => { $(`#${id}`).textContent = text; });
  [["speed", "speedBar", "speedValue"], ["stability", "stabilityBar", "stabilityValue"], ["jump", "jumpBar", "jumpValue"]].forEach(([key, bar, value]) => {
    $(`#${bar}`).style.width = `${state.stats[key]}%`; $(`#${value}`).textContent = state.stats[key];
  });
}

function syncSlider(event) {
  const key = { legLength: "length", legAngle: "angle", legSpacing: "spacing" }[event.target.id];
  state[key] = Number(event.target.value); calculateStats(); updateTuning();
}

function applyHorseSetup(horse, racerConfig = state) {
  const length = 26 + racerConfig.length * .43;
  const angle = (racerConfig.angle - 50) * .42;
  const gap = 42 + racerConfig.spacing * .48;
  horse.style.setProperty("--leg-l", `${length}px`); horse.style.setProperty("--leg-a", `${angle}deg`);
  horse.style.setProperty("--front", `${65 - gap / 2}px`); horse.style.setProperty("--back", `${65 + gap / 2}px`);
}

function createHorse(type, extraClass = "") {
  const horse = document.createElement("div");
  horse.className = `horse ${type} ${extraClass}`;
  horse.innerHTML = '<span class="body"><b></b></span><i></i><i></i><i></i><i></i>';
  return horse;
}

function startRace() {
  if (state.racing) return;
  showScreen("raceScreen"); state.racing = true; state.guts = 3; state.raceId += 1;
  const raceId = state.raceId; $("#gutsButton").disabled = false; updateGuts();
  $("#racersLayer").replaceChildren(); $("#obstacleLayer").replaceChildren();
  const usedNames = new Set();
  state.racers = Array.from({ length: 4 }, (_, index) => {
    const player = index === 0; let name;
    if (player) name = state.vegetable === "cucumber" ? "あなたのキュウリ号" : "あなたのナス号";
    else { do { name = pick(cpuNames); } while (usedNames.has(name)); usedNames.add(name); }
    const type = player ? state.vegetable : (Math.random() > .5 ? "cucumber" : "eggplant");
    const config = player ? { ...state, stats: { ...state.stats } } : makeCpu(type);
    const element = document.createElement("div"); element.className = `racer${player ? " player" : ""}`;
    element.style.top = `${index * 25 + 2}%`; element.innerHTML = `<span class="name-tag">${index + 1} ${name}</span><span class="dust">≋</span>`;
    const horse = createHorse(type); applyHorseSetup(horse, config); element.append(horse); $("#racersLayer").append(element);
    return { name, type, player, config, element, progress: 0, velocity: 0, finished: false, finishTime: 0, nextEvent: random(14, 22), bracingUntil: 0, stumbleUntil: 0 };
  });
  buildObstacles(); updateRanks(); setCommentary(pick(commentary.start)); playFanfare();
  state.startTime = performance.now(); requestAnimationFrame((now) => raceFrame(now, raceId));
}

function makeCpu(type) {
  const stats = type === "cucumber" ? { speed: random(64, 91), stability: random(32, 69), jump: random(45, 84) } : { speed: random(44, 67), stability: random(68, 94), jump: random(38, 66) };
  return { vegetable: type, length: random(20, 85), angle: random(20, 80), spacing: random(25, 85), stats };
}

function buildObstacles() {
  state.obstacles = [22, 38, 55, 71, 84].map((position) => ({ position: position + random(-3, 3), type: pick(obstacleTypes) }));
  state.obstacles.forEach(({ position, type }, index) => {
    const obstacle = document.createElement("div"); obstacle.className = `obstacle ${type.key}`;
    obstacle.style.cssText = `left:${position}%;top:${(index % 4) * 25 + 12}%`; obstacle.innerHTML = `<b>${type.icon}</b>${type.label}`;
    $("#obstacleLayer").append(obstacle);
  });
}

function raceFrame(now, raceId) {
  if (!state.racing || raceId !== state.raceId) return;
  const elapsed = (now - state.startTime) / 1000; $("#raceClock").textContent = elapsed.toFixed(1);
  state.racers.forEach((racer) => {
    if (racer.finished) return;
    const stat = racer.config.stats; const bracing = now < racer.bracingUntil; const stumbling = now < racer.stumbleUntil;
    const base = 4.25 + stat.speed * .036; const instability = Math.max(0, 62 - stat.stability) / 100;
    racer.velocity = base * (bracing ? .76 : 1) * (stumbling ? .32 : 1) * random(.94, 1.05);
    racer.progress += racer.velocity / 60;
    if (racer.progress >= racer.nextEvent) triggerCourseEvent(racer, now);
    racer.element.style.left = `${Math.min(88, 7 + racer.progress * .81)}%`;
    racer.element.classList.toggle("bracing", bracing); racer.element.classList.toggle("wobble", stumbling || (!bracing && Math.random() < instability * .04));
    if (racer.progress >= 100) { racer.finished = true; racer.finishTime = elapsed; racer.element.style.left = "88%"; }
  });
  updateRanks();
  const player = state.racers[0];
  if (Math.floor(elapsed) === 5 && !state.midCalled) { state.midCalled = true; setCommentary(pick(player.config.stats.stability < 48 ? commentary.bad : player.type === "eggplant" ? commentary.stable : commentary.fast)); }
  if (state.racers.every((racer) => racer.finished) || elapsed > 18) finishRace(); else requestAnimationFrame((next) => raceFrame(next, raceId));
}

function triggerCourseEvent(racer, now) {
  const obstacle = state.obstacles.find((item) => item.position >= racer.nextEvent - 4) || pick(state.obstacles);
  const stat = racer.config.stats; const protectedNow = now < racer.bracingUntil;
  const success = protectedNow || stat.stability * .58 + stat.jump * .42 + random(-22, 22) > 56 + obstacle.type.difficulty * .35;
  if (!success) { racer.stumbleUntil = now + random(650, 1300); if (racer.player) { setCommentary(pick(commentary.bad)); tone(130, .15, "sawtooth"); } }
  else if (racer.player) setCommentary(pick(commentary.obstacle));
  racer.nextEvent += random(15, 23);
}

function useGuts() {
  if (!state.racing || state.guts <= 0) return;
  state.guts -= 1; const player = state.racers[0]; player.bracingUntil = performance.now() + 1900; player.stumbleUntil = 0;
  updateGuts(); setCommentary(pick(commentary.guts)); tone(220, .12); setTimeout(() => tone(440, .12), 100);
  $("#speedLines").classList.add("show"); setTimeout(() => $("#speedLines").classList.remove("show"), 700);
}

function updateGuts() {
  $("#gutsCount").textContent = `${"● ".repeat(state.guts)}${"○ ".repeat(3 - state.guts)}`.trim();
  $("#gutsButton").disabled = state.guts <= 0 || !state.racing;
  $("#gutsButton").setAttribute("aria-label", `踏ん張る。残り${state.guts}回`);
}

function updateRanks() {
  const order = [...state.racers].sort((a, b) => b.progress - a.progress);
  $("#rankBoard").innerHTML = order.map((racer, index) => `<li class="${racer.player ? "player-rank" : ""}" title="${racer.name}">${index + 1}</li>`).join("");
}

function finishRace() {
  if (!state.racing) return; state.racing = false; $("#gutsButton").disabled = true; setCommentary(pick(commentary.finish)); playGoal();
  const order = [...state.racers].sort((a, b) => (a.finishTime || 99) - (b.finishTime || 99));
  const rank = order.findIndex((racer) => racer.player) + 1; const player = state.racers[0];
  state.result = { rank, time: player.finishTime || 18, award: chooseAward(rank), score: state.stats.completion };
  setTimeout(showResult, 1450);
}

function chooseAward(rank) {
  const { speed, stability, completion } = state.stats;
  if (completion < 22) return speed > 70 ? "暴れキュウリ将軍" : "ただの野菜";
  if (completion < 38) return pick(["お盆の珍獣", "脚が多そうに見えます", "ほぼ漬物"]);
  if (state.vegetable === "eggplant" && speed < 58) return "帰りたくないナス";
  if (rank === 1 && speed > 76) return "お盆最速伝説";
  if (completion > 84) return "割り箸の魔術師";
  if (rank <= 2 && stability > 65) return "ご先祖送迎のプロ";
  return "無事に着けば問題なし";
}

function showResult() {
  const { rank, time, award, score } = state.result; showScreen("resultScreen");
  $("#resultRank").textContent = rank; $("#resultTime").textContent = `${time.toFixed(1)} 秒`; $("#awardTitle").textContent = award;
  $("#finalSpeed").textContent = state.stats.speed; $("#finalStability").textContent = state.stats.stability; $("#legScore").textContent = score;
  $("#resultComment").textContent = score < 35 ? "設計図はありません。それでも無事に着けば問題なし。" : rank === 1 ? "見事な脚さばき。ご先祖さまも驚く速さです。" : state.stats.stability > 72 ? "派手さはなくとも、安心安全の送り迎えでした。" : "多少跳ねましたが、愛嬌なら本日一番です。";
  const resultHorse = $("#resultHorse"); updateHorseType(resultHorse); applyHorseSetup(resultHorse, state); makeConfetti(rank === 1 ? 32 : 16);
}

function makeConfetti(count) {
  const layer = $("#confetti"); layer.replaceChildren();
  for (let index = 0; index < count; index += 1) { const bit = document.createElement("i"); bit.style.cssText = `--x:${random(0, 100)}%;--d:${random(1.8, 3.8)}s;--drift:${random(-70, 70)}px;--c:${pick(["#d84932", "#e8b74d", "#f5e8c8", "#4f8b47", "#76528a"])}`; layer.append(bit); }
}

function setCommentary(text) { $("#commentaryText").textContent = text; }
function toggleSound() { state.sound = !state.sound; const button = $("#soundButton"); button.textContent = `音 ${state.sound ? "ON" : "OFF"}`; button.setAttribute("aria-pressed", state.sound); button.setAttribute("aria-label", `音を${state.sound ? "オフ" : "オン"}にする`); if (state.sound) tone(520, .08); }
function tone(frequency, duration = .1, type = "square") { if (!state.sound) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.045, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); } catch (_) {} }
function playFanfare() { [330, 440, 550].forEach((note, index) => setTimeout(() => tone(note, .12), index * 120)); }
function playGoal() { [440, 550, 660, 880].forEach((note, index) => setTimeout(() => tone(note, .18), index * 115)); }

async function shareResult() {
  const text = `精霊馬グランプリで「${state.result.award}」になりました。順位は${state.result.rank}位、脚の完成度は${state.result.score}点です。 #精霊馬グランプリ #1日1アプリ`;
  try {
    if (navigator.share) await navigator.share({ title: "精霊馬グランプリ", text, url: location.href });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text); $("#shareStatus").textContent = "結果をコピーしました！"; }
    else { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); $("#shareStatus").textContent = "結果をコピーしました！"; }
  } catch (error) { if (error.name !== "AbortError") $("#shareStatus").textContent = "共有できませんでした"; }
}

$("#startButton").addEventListener("click", () => { showScreen("selectScreen"); tone(440, .08); });
$$(".vegetable-card").forEach((card) => card.addEventListener("click", () => setVegetable(card.dataset.veg)));
$("#toTuneButton").addEventListener("click", () => { showScreen("tuneScreen"); updateTuning(); tone(520, .08); });
$("#backSelect").addEventListener("click", () => showScreen("selectScreen"));
[$("#legLength"), $("#legAngle"), $("#legSpacing")].forEach((slider) => slider.addEventListener("input", syncSlider));
$("#randomLegs").addEventListener("click", () => { [["length", "legLength"], ["angle", "legAngle"], ["spacing", "legSpacing"]].forEach(([key, id]) => { state[key] = Math.round(random(4, 96)); $(`#${id}`).value = state[key]; }); calculateStats(); updateTuning(); tone(300, .08); });
$("#raceButton").addEventListener("click", startRace); $("#gutsButton").addEventListener("click", useGuts);
$("#retryButton").addEventListener("click", () => { state.midCalled = false; showScreen("selectScreen"); });
$("#shareButton").addEventListener("click", shareResult); $("#soundButton").addEventListener("click", toggleSound);
calculateStats(); updateTuning();
