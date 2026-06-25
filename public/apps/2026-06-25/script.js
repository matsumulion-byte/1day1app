(() => {
  "use strict";

  const $ = (id) => document.querySelector(id);
  const ui = {
    stage: $(".stage"),
    leaner: $("#leaner"),
    shadow: $("#shadow"),
    rings: $("#rings"),
    crack: $("#crack"),
    countdown: $("#countdown"),
    actionbar: $("#actionbar"),
    hint: $("#hint"),
    panel: $("#panel"),
    kicker: $("#kicker"),
    title: $("#title"),
    message: $("#message"),
    main: $("#mainButton"),
    best: $("#best"),
    leanButton: $("#leanButton")
  };

  const savedBest = Number(localStorage.getItem("matsugravity-best") || 0);
  const state = {
    mode: "ready",
    angle: 23,
    velocity: 0,
    limit: 46,
    wobble: 0,
    hold: 0,
    score: 0,
    best: savedBest,
    pressingLean: false,
    hasPressed: false,
    last: 0,
    revealed: false
  };

  ui.best.textContent = String(state.best);
  applyPose();

  function newLimit() {
    const base = 39 + Math.random() * 11.5;
    const nasty = Math.random() < .22 ? -2.5 - Math.random() * 2.2 : 0;
    return base + nasty;
  }

  function start() {
    state.mode = "playing";
    state.angle = 24 + Math.random() * 2;
    state.velocity = 0;
    state.limit = newLimit();
    state.wobble = 0;
    state.hold = 0;
    state.score = 0;
    state.hasPressed = false;
    state.pressingLean = false;
    state.revealed = false;
    state.last = performance.now();
    ui.panel.classList.add("hidden");
    ui.stage.classList.remove("fallen", "ready", "holding");
    ui.stage.classList.add("playing");
    ui.leanButton.classList.remove("pressing");
    ui.hint.textContent = "押しっぱなしで前へ。離したら3秒。";
    requestAnimationFrame(tick);
  }

  function tick(now) {
    const dt = Math.min(.034, (now - state.last) / 1000 || .016);
    state.last = now;
    update(dt);
    applyPose();
    if (state.mode === "playing") requestAnimationFrame(tick);
  }

  function update(dt) {
    const risk = Math.max(0, state.angle / state.limit);
    state.wobble += dt * (4 + risk * 11);

    if (state.pressingLean) {
      state.hasPressed = true;
      state.hold = 0;
      state.velocity = 12 + risk * 18;
      state.angle += state.velocity * dt;
      ui.stage.classList.remove("holding");
      ui.hint.textContent = risk > .88 ? "足元が言ってる。もうやばい。" : "まだいける？";
    } else if (state.hasPressed) {
      state.hold += dt;
      ui.stage.classList.add("holding");
      ui.hint.textContent = "触るな。耐えろ。";
      const drift = Math.max(0, risk - .82) * (1.8 + Math.sin(state.wobble * 1.7) * 1.2);
      state.angle += drift * dt;
    }

    const closeness = Math.min(1.25, state.angle / state.limit);
    const holdBonus = Math.min(3, state.hold);
    state.score = Math.max(state.score, Math.floor((closeness ** 4) * 1000 + holdBonus * 120));

    if (state.angle >= state.limit) {
      fall();
      return;
    }
    if (state.hold >= 3) {
      clear();
    }
  }

  function applyPose() {
    const danger = Math.max(0, Math.min(1, state.angle / state.limit));
    const shake = danger > .86 && state.mode === "playing";
    const finalAngle = state.mode === "fallen" ? state.angle + 18 : state.angle;
    const countdown = Math.max(0, 3 - state.hold);

    ui.leaner.style.transform = `translateX(-50%) rotate(${finalAngle + Math.sin(state.wobble) * danger * 1.4}deg)`;
    ui.shadow.style.transform = `translateX(-50%) scaleX(${1 + state.angle / 44})`;
    ui.shadow.style.opacity = String(Math.max(.25, 1 - state.angle / 80));
    ui.stage.classList.toggle("shake", shake);
    ui.rings.classList.toggle("hot", danger > .88 && state.mode === "playing");
    ui.crack.textContent = crackText(danger);
    ui.crack.classList.toggle("show", danger > .68 && state.mode === "playing");
    ui.countdown.textContent = state.hasPressed && !state.pressingLean && state.mode === "playing" ? Math.ceil(countdown) : "";
    ui.countdown.classList.toggle("show", !!ui.countdown.textContent);
    ui.leanButton.classList.toggle("pressing", state.pressingLean);
  }

  function clear() {
    state.mode = "clear";
    state.revealed = true;
    const previousBest = state.best;
    saveBest();
    ui.stage.classList.remove("playing", "holding");
    ui.stage.classList.add("ready");
    ui.panel.classList.remove("hidden");
    ui.kicker.textContent = "ZERO GRAVITY HELD";
    ui.title.innerHTML = "重力に、<br>バレなかった。";
    ui.message.textContent = `SCORE ${state.score}点${state.score > previousBest ? " / BEST更新" : ""}。限界 ${state.limit.toFixed(1)}度 / 松村 ${state.angle.toFixed(1)}度。あと${Math.max(0, state.limit - state.angle).toFixed(1)}度で終わってた。`;
    ui.main.textContent = "もう一度";
    applyPose();
  }

  function fall() {
    state.mode = "fallen";
    state.revealed = true;
    state.score = Math.max(0, state.score - 160);
    const previousBest = state.best;
    ui.stage.classList.remove("playing", "holding");
    ui.stage.classList.add("fallen", "ready");
    saveBest();
    ui.panel.classList.remove("hidden");
    ui.kicker.textContent = "GRAVITY WINS";
    ui.title.innerHTML = "松村、<br>重力にバレる。";
    ui.message.textContent = `SCORE ${state.score}点${state.score > previousBest ? " / BEST更新" : ""}。限界 ${state.limit.toFixed(1)}度。あなたは ${state.angle.toFixed(1)}度まで欲張った。`;
    ui.main.textContent = "リトライ";
    applyPose();
  }

  function saveBest() {
    state.best = Math.max(state.best, state.score);
    localStorage.setItem("matsugravity-best", String(state.best));
    ui.best.textContent = String(state.best);
  }

  function crackText(danger) {
    if (danger < .68) return "...";
    if (danger < .8) return "ミシ...";
    if (danger < .9) return "ギリ...";
    if (danger < .97) return "パキ...";
    return "無音";
  }

  function bindHold(button) {
    const on = (event) => {
      event.preventDefault();
      if (state.mode !== "playing") return;
      state.pressingLean = true;
      button.setPointerCapture?.(event.pointerId);
    };
    const off = (event) => {
      event.preventDefault();
      state.pressingLean = false;
    };
    button.addEventListener("pointerdown", on);
    button.addEventListener("pointerup", off);
    button.addEventListener("pointercancel", off);
    button.addEventListener("pointerleave", off);
  }

  bindHold(ui.leanButton);

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowRight") {
      event.preventDefault();
      if (state.mode === "ready" || state.mode === "clear" || state.mode === "fallen") start();
      else state.pressingLean = true;
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space" || event.code === "ArrowRight") state.pressingLean = false;
  });
  ui.main.addEventListener("click", start);
})();
