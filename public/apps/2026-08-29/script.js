(() => {
  "use strict";

  const GAME_SECONDS = 60;
  const MAX_MEAT = 7;
  const TYPES = [
    { key: "tongue", name: "タン", speed: 0.00028, perfect: [0.77, 1.03], char: 1.42, weight: 26 },
    { key: "kalbi", name: "カルビ", speed: 0.00022, perfect: [0.74, 1.08], char: 1.55, weight: 32 },
    { key: "harami", name: "ハラミ", speed: 0.000235, perfect: [0.82, 1.04], char: 1.43, weight: 24 },
    { key: "hormone", name: "ホルモン", speed: 0.00016, perfect: [0.78, 1.07], char: 1.32, weight: 18 }
  ];

  const $ = (selector) => document.querySelector(selector);
  const grill = $("#grill");
  const effects = $("#effects");
  const bgm = new Audio("/apps/2026-08-29/assets/bgm.mp3");
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.45;
  let state;

  function resetState() {
    state = { running: false, score: 0, combo: 0, maxCombo: 0, perfect: 0, char: 0,
      served: 0, elapsed: 0, spawnAt: 250, meats: new Map(), lastFrame: 0, id: 0 };
    grill.replaceChildren();
    $("#score").textContent = "0";
    $("#combo").textContent = "0";
    $("#time").textContent = GAME_SECONDS;
    setMessage("網は熱々。準備よし！");
  }

  function startGame() {
    resetState();
    $("#startPanel").classList.remove("open");
    $("#resultPanel").classList.remove("open");
    $("#resultPanel").setAttribute("aria-hidden", "true");
    bgm.pause();
    bgm.currentTime = 0;
    bgm.play().catch(() => setMessage("端末の音声設定をご確認ください"));
    state.running = true;
    state.lastFrame = performance.now();
    spawnMeat();
    requestAnimationFrame(tick);
  }

  function pickType() {
    let n = Math.random() * 100;
    return TYPES.find(t => (n -= t.weight) <= 0) || TYPES[1];
  }

  function findPosition() {
    for (let tries = 0; tries < 30; tries++) {
      const p = { x: 15 + Math.random() * 70, y: 13 + Math.random() * 74 };
      const clear = [...state.meats.values()].every(m => Math.hypot(m.x - p.x, m.y - p.y) > 22);
      if (clear) return p;
    }
    return { x: 15 + Math.random() * 70, y: 13 + Math.random() * 74 };
  }

  function spawnMeat() {
    if (!state.running || state.meats.size >= MAX_MEAT) return;
    const type = pickType();
    const pos = findPosition();
    const meat = { id: ++state.id, type, ...pos, side: 0, progress: 0, firstCook: null, flipQuality: 0 };
    const el = document.createElement("button");
    el.type = "button";
    el.className = "meat";
    el.dataset.id = meat.id;
    el.dataset.type = type.key;
    el.setAttribute("aria-label", `${type.name}、片面目`);
    el.style.cssText = `left:${pos.x}%;top:${pos.y}%;--rotate:${-18 + Math.random() * 36}deg`;
    el.innerHTML = `<span class="cut"></span><span class="gauge"><i></i></span><span class="meat-label"><b>${type.name}</b><span class="side">片面目</span></span>`;
    el.addEventListener("pointerup", handleMeat, { passive: true });
    meat.el = el;
    state.meats.set(meat.id, meat);
    grill.append(el);
  }

  function qualityFor(value, type) {
    const [low, high] = type.perfect;
    if (value < 0.42) return { key: "raw", label: "生焼け！", points: 0 };
    if (value < low) return { key: "rare", label: "ちょい生", points: 30 };
    if (value <= high) return { key: "perfect", label: "PERFECT!", points: 100 };
    if (value < type.char) return { key: "over", label: "焼きすぎ", points: 50 };
    return { key: "char", label: "炭…", points: -30 };
  }

  function handleMeat(event) {
    if (!state.running || event.pointerType === "mouse" && event.button !== 0) return;
    const el = event.currentTarget;
    const meat = state.meats.get(Number(el.dataset.id));
    if (!meat) return;
    if (meat.side === 0) {
      const q = qualityFor(meat.progress, meat.type);
      meat.firstCook = meat.progress;
      meat.flipQuality = q.points;
      meat.side = 1;
      meat.progress = 0;
      el.classList.add("flipped");
      setTimeout(() => el.classList.remove("flipped"), 370);
      el.querySelector(".side").textContent = "両面目";
      el.setAttribute("aria-label", `${meat.type.name}、両面目、もう一度押すと皿へ`);
      pop(el, q.key === "perfect" ? "いい返し！" : q.label, q.key === "perfect");
      setMessage(q.key === "perfect" ? "その返し、見事！両面目も見極めろ" : "両面目で挽回だ！");
    } else serve(meat);
  }

  function serve(meat) {
    const second = qualityFor(meat.progress, meat.type);
    const first = qualityFor(meat.firstCook, meat.type);
    // 最終点は両面の平均。悪すぎる裏返しは判定を一段階以上落とす。
    const rawScore = Math.round((meat.flipQuality * 0.45 + second.points * 0.55) / 5) * 5;
    let final = second;
    if (first.key === "char" || second.key === "char") final = { key: "char", label: "炭…", points: -30 };
    else if (first.key === "raw" || second.key === "raw") final = { key: "raw", label: "生焼け！", points: 0 };
    else if (first.key === "perfect" && second.key === "perfect") final = { key: "perfect", label: "PERFECT!", points: 100 };
    else if (rawScore <= 20) final = { key: "rare", label: "ちょい生", points: 30 };
    else if (rawScore < 75) final = { key: "over", label: "焼きすぎ", points: 50 };

    let awarded = final.points;
    if (final.key === "perfect") {
      state.combo++;
      state.perfect++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      awarded += Math.min(100, state.combo * 10);
      burst(meat.el);
    } else {
      state.combo = 0;
      if (final.key === "char") state.char++;
    }
    state.served++;
    state.score = Math.max(0, state.score + awarded);
    $("#score").textContent = state.score.toLocaleString();
    $("#combo").textContent = state.combo;
    pop(meat.el, `${final.label} ${awarded >= 0 ? "+" : ""}${awarded}`, final.key === "perfect");
    setMessage(final.label === "PERFECT!" ? `${state.combo}連続！奉行の采配が冴える！` : final.label);
    state.meats.delete(meat.id);
    meat.el.remove();
  }

  function updateMeat(meat, dt) {
    meat.progress += dt * meat.type.speed;
    const p = meat.progress;
    let color;
    if (p < .45) color = mix("#ec655c", "#c64a36", p / .45);
    else if (p < 1.05) color = mix("#c64a36", "#a75b2d", (p - .45) / .6);
    else color = mix("#8a4b29", "#15100e", Math.min(1, (p - 1.05) / Math.max(.2, meat.type.char - 1.05)));
    meat.el.style.setProperty("--meat", color);
    const gauge = meat.el.querySelector(".gauge i");
    gauge.style.width = `${Math.min(100, p / meat.type.char * 100)}%`;
    gauge.style.background = p < meat.type.perfect[0] ? "#e6574f" : p <= meat.type.perfect[1] ? "#ffb52e" : p < meat.type.char ? "#8c4b2d" : "#17110f";
    meat.el.classList.toggle("warning", p > meat.type.perfect[1]);
  }

  function mix(a, b, t) {
    const x = a.match(/\w\w/g).map(v => parseInt(v, 16));
    const y = b.match(/\w\w/g).map(v => parseInt(v, 16));
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
  }

  function tick(now) {
    if (!state.running) return;
    const dt = Math.min(40, now - state.lastFrame);
    state.lastFrame = now;
    state.elapsed += dt;
    state.meats.forEach(meat => updateMeat(meat, dt));
    if (state.elapsed >= state.spawnAt) {
      spawnMeat();
      const progress = state.elapsed / (GAME_SECONDS * 1000);
      state.spawnAt = state.elapsed + Math.max(1250, 3200 - progress * 1850) * (.82 + Math.random() * .36);
    }
    const remaining = Math.max(0, Math.ceil(GAME_SECONDS - state.elapsed / 1000));
    $("#time").textContent = remaining;
    if (state.elapsed >= GAME_SECONDS * 1000) return endGame();
    requestAnimationFrame(tick);
  }

  function endGame() {
    state.running = false;
    bgm.pause();
    bgm.currentTime = 0;
    const accuracy = state.served ? state.perfect / state.served : 0;
    const power = Math.min(100, Math.round(state.score / 38 + accuracy * 28 - state.char * 3));
    const title = power < 25 ? "見習い店員" : power < 45 ? "トング係" : power < 65 ? "焼き担当" : power < 85 ? "焼肉奉行" : "他人の肉まで勝手に管理する真の奉行";
    $("#title").textContent = title;
    $("#power").textContent = power;
    $("#finalScore").textContent = state.score.toLocaleString();
    $("#perfectCount").textContent = state.perfect;
    $("#charCount").textContent = state.char;
    $("#maxCombo").textContent = state.maxCombo;
    $("#resultPanel").classList.add("open");
    $("#resultPanel").setAttribute("aria-hidden", "false");
  }

  function pop(el, text, perfect = false) {
    const rect = el.getBoundingClientRect();
    const root = effects.getBoundingClientRect();
    const node = document.createElement("span");
    node.className = `pop${perfect ? " perfect" : ""}`;
    node.textContent = text;
    node.style.left = `${rect.left - root.left + rect.width / 2}px`;
    node.style.top = `${rect.top - root.top + rect.height / 2}px`;
    effects.append(node);
    setTimeout(() => node.remove(), 1000);
  }

  function burst(el) {
    const rect = el.getBoundingClientRect();
    const root = effects.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      s.style.left = `${rect.left - root.left + rect.width / 2}px`;
      s.style.top = `${rect.top - root.top + rect.height / 2}px`;
      const angle = Math.PI * 2 * i / 10;
      s.style.setProperty("--x", `${Math.cos(angle) * 55}px`);
      s.style.setProperty("--y", `${Math.sin(angle) * 55}px`);
      effects.append(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  function setMessage(text) { $("#message").textContent = text; }
  $("#startButton").addEventListener("click", startGame);
  $("#retryButton").addEventListener("click", startGame);
  document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });
  resetState();
})();
