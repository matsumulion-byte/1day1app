"use strict";
// Pure generation and scoring helpers, independent of the screen lifecycle.
const MemoryRules = (() => {
  const emojis = ["🍎", "🚗", "🐕", "☂️", "🌻", "🍋", "🐟", "🚀", "🎸", "🍰"];
  const shuffle = (array) => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const positional = (a, b) => [...a].filter((v, i) => v === b[i]).length;
  const positionScore = (count) => [0, 30, 60, 100][count];
  const orderScore = (count) => [0, 20, 40, 70, 100][count];
  const nbackScore = (hits, falseTaps, targets) =>
    Math.max(0, Math.round((100 * (hits - falseTaps)) / targets));
  function sequence() {
    const matches = new Set(
      shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, pick([2, 3, 4])),
    );
    const items = [];
    for (let i = 0; i < 10; i++)
      items.push(
        matches.has(i)
          ? items[i - 2]
          : pick(emojis.filter((e) => i < 2 || e !== items[i - 2])),
      );
    return { items, matches };
  }
  function snapshot() {
    const colors = ["青い", "赤い", "黄色い", "白い"],
      belongings = ["帽子", "かばん", "傘", "時計"],
      animals = ["犬", "猫", "うさぎ", "パンダ"],
      vehicles = ["車", "電車", "自転車", "飛行機"];
    const color = pick(colors),
      thing = pick(belongings),
      animal = pick(animals),
      vehicle = pick(vehicles),
      number = String(10 + Math.floor(Math.random() * 90));
    const question = pick([
      {
        text: "数字はいくつだった？",
        answer: number,
        options: shuffle(
          Array.from({ length: 90 }, (_, i) => String(i + 10)).filter(
            (x) => x !== number,
          ),
        ).slice(0, 3),
      },
      {
        text: "持ち物は何色だった？",
        answer: color,
        options: colors.filter((x) => x !== color),
      },
      {
        text: "動物は何だった？",
        answer: animal,
        options: animals.filter((x) => x !== animal),
      },
      {
        text: "持ち物は何だった？",
        answer: thing,
        options: belongings.filter((x) => x !== thing),
      },
      {
        text: "乗り物は何だった？",
        answer: vehicle,
        options: vehicles.filter((x) => x !== vehicle),
      },
    ]);
    return {
      facts: [color + thing, number, animal, pick(colors) + vehicle],
      ...question,
      choices: shuffle([question.answer, ...question.options]),
    };
  }
  function age(score) {
    const ranges = [
      [450, 18, 25],
      [400, 26, 35],
      [350, 36, 45],
      [300, 46, 55],
      [250, 56, 65],
      [200, 66, 75],
      [150, 76, 85],
      [0, 86, 99],
    ];
    const [min, young, old] = ranges.find((r) => score >= r[0]);
    const max = min === 450 ? 500 : min === 0 ? 149 : min + 49;
    return Math.round(old - ((score - min) / (max - min)) * (old - young));
  }
  return {
    shuffle,
    pick,
    positional,
    positionScore,
    orderScore,
    nbackScore,
    sequence,
    snapshot,
    age,
    emojis,
  };
})();
const app = document.querySelector("#app");
const names = [
  "位置記憶",
  "順番記憶",
  "瞬間記憶",
  "邪魔される記憶",
  "2つ前を覚えろ",
];
const hints = [
  "光る3マスを覚えよう",
  "4つの絵を順番どおりに",
  "4つの情報を一瞬でキャッチ",
  "計算しても、忘れない？",
  "2つ前と同じならタップ",
];
const state = {
  stage: 0,
  scores: [],
  phase: "home",
  timers: new Set(),
  paused: false,
  numberHandler: null,
};
// All timeouts share a cancellable, pausable lifecycle, including replay.
function later(fn, ms) {
  const timer = { fn, remaining: ms, started: performance.now(), id: null };
  timer.id = setTimeout(() => {
    state.timers.delete(timer);
    fn();
  }, ms);
  state.timers.add(timer);
  return timer;
}
function clearTimers() {
  state.timers.forEach((t) => clearTimeout(t.id));
  state.timers.clear();
  state.numberHandler = null;
}
function button(text, fn, className = "primary") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = text;
  b.onclick = fn;
  return b;
}
function home() {
  clearTimers();
  state.phase = "home";
  state.scores = [];
  app.innerHTML = `<section class="hero"><span class="pill">あなたの「覚える」を、ちょっと試そう</span><h1>記憶力、<em>何歳？</em></h1><p class="lead">5つの記憶力テストに挑戦して、<br>あなたの記憶年齢を測定します。</p><div class="memory-art" aria-hidden="true"><div class="tile-art">🍎</div><div class="tile-art middle">?</div><div class="tile-art last">⚡</div><span class="spark">✦</span></div><div class="panel"><div class="features"><span><b>◷</b> 約1〜2分</span><span><b>▦</b> 5ステージ</span><span><b>✓</b> タップで簡単</span></div><div id="start"></div><p class="note">※これは医療的な診断ではありません<br>「記憶年齢」はスコアに応じたゲーム上の目安です。</p></div><div class="stage-list">${["位置", "順番", "瞬間", "邪魔", "2バック"].map((n, i) => `<span><b>0${i + 1}</b>${n}記憶</span>`).join("")}</div></section>`;
  document.querySelector("#start").append(
    button("記憶力を測る　→", () => {
      state.scores = [];
      startStage(0);
    }),
  );
}
function frame() {
  app.innerHTML = `<div class="hud"><div>STAGE <b>${state.stage + 1}</b> <small>/ 5</small></div><div><strong>${state.scores.reduce((a, b) => a + b, 0)}</strong> <small>/ 500 pt</small></div></div><div class="progress">${names.map((_, i) => `<i class="${i <= state.stage ? "done" : ""}"></i>`).join("")}</div><section class="panel game" id="game"></section>`;
  app.append(button("はじめからやり直す", home, "back"));
  return document.querySelector("#game");
}
function view(title, instruction, phase = "回答タイム") {
  const area = frame();
  area.innerHTML = `<span class="phase">${phase}</span><h2>${title}</h2><p class="instruction">${instruction}</p><div id="content"></div>`;
  return document.querySelector("#content");
}
function bar(area, ms) {
  const el = document.createElement("div");
  el.className = "timer";
  el.innerHTML = `<span style="--duration:${ms}ms"></span>`;
  area.append(el);
}
function startStage(index) {
  clearTimers();
  state.stage = index;
  state.phase = "intro";
  const area = frame();
  area.innerHTML = `<div class="splash"><p class="big">0${index + 1}</p><p class="eyebrow">STAGE ${index + 1}</p><h2>${names[index]}</h2><p class="instruction">${hints[index]}</p></div>`;
  later(() => [stage1, stage2, stage3, stage4, stage5][index](), 1100);
}
function finish(score, detail) {
  if (state.phase === "feedback") return;
  clearTimers();
  state.phase = "feedback";
  state.scores.push(score);
  const area = frame();
  area.innerHTML = `<div class="splash feedback ${score === 100 ? "" : "bad"}"><p class="eyebrow">STAGE ${state.stage + 1} COMPLETE</p><h2>${score === 100 ? "パーフェクト！" : score > 0 ? "ナイスチャレンジ！" : "次で取り返そう！"}</h2><div class="feedback-score">+${score}<small> pt</small></div><p class="instruction">${detail}</p><p class="counter">${state.stage === 4 ? "結果を集計しています…" : "次のステージへ →"}</p></div>`;
  later(
    () => (state.stage === 4 ? result() : startStage(state.stage + 1)),
    1700,
  );
}
function stage1() {
  state.phase = "memorize";
  const targets = MemoryRules.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3);
  let chosen = [];
  const render = (memorize) => {
    const area = view(
      names[0],
      memorize ? "光っている3マスを覚えてください" : "光っていた3マスをタップ",
      memorize ? "記憶タイム · 2秒" : "回答タイム",
    );
    const grid = document.createElement("div");
    grid.className = "grid";
    for (let i = 0; i < 9; i++) {
      const b = button(
        "✓",
        () => {
          if (state.phase !== "answer" || chosen.includes(i)) return;
          chosen.push(i);
          b.classList.add("selected");
          b.setAttribute("aria-pressed", "true");
          document.querySelector(".counter").textContent =
            `${chosen.length} / 3 マス選択`;
          if (chosen.length === 3) {
            const hits = chosen.filter((x) => targets.includes(x)).length;
            finish(MemoryRules.positionScore(hits), `${hits} / 3 マス正解`);
          }
        },
        "cell" + (memorize && targets.includes(i) ? " lit" : ""),
      );
      b.disabled = memorize;
      b.setAttribute(
        "aria-label",
        `${Math.floor(i / 3) + 1}行 ${(i % 3) + 1}列`,
      );
      b.setAttribute("aria-pressed", "false");
      grid.append(b);
    }
    area.append(grid);
    area.insertAdjacentHTML(
      "beforeend",
      '<p class="counter">0 / 3 マス選択</p>',
    );
    if (memorize) bar(area, 2000);
  };
  render(true);
  later(() => {
    state.phase = "answer";
    render(false);
  }, 2000);
}
function stage2() {
  state.phase = "memorize";
  const items = MemoryRules.shuffle(MemoryRules.emojis).slice(0, 4);
  let answer = [];
  let area = view(names[1], "左から順番に覚えてください", "記憶タイム · 3秒");
  area.innerHTML = `<div class="emoji-row">${items.map((x) => `<span class="emoji-box">${x}</span>`).join("")}</div>`;
  bar(area, 3000);
  later(() => {
    state.phase = "answer";
    area = view(names[1], "覚えた順番でタップ");
    area.innerHTML =
      '<div class="emoji-row" id="slots">' +
      items
        .map((_, i) => `<span class="emoji-box empty">${i + 1}</span>`)
        .join("") +
      '</div><div class="emoji-row" id="options"></div><p class="counter">0 / 4 個選択</p>';
    MemoryRules.shuffle(items).forEach((item) => {
      const b = button(
        item,
        () => {
          if (state.phase !== "answer" || b.disabled) return;
          b.disabled = true;
          answer.push(item);
          const slot =
            document.querySelector("#slots").children[answer.length - 1];
          slot.textContent = item;
          slot.classList.remove("empty");
          document.querySelector(".counter").textContent =
            `${answer.length} / 4 個選択`;
          if (answer.length === 4) {
            const hits = MemoryRules.positional(answer, items);
            finish(MemoryRules.orderScore(hits), `${hits} / 4 個が正しい位置`);
          }
        },
        "emoji-box",
      );
      document.querySelector("#options").append(b);
    });
  }, 3000);
}
function stage3() {
  state.phase = "memorize";
  const question = MemoryRules.snapshot();
  let area = view(names[2], "4つの情報を覚えてください", "記憶タイム · 3秒");
  area.innerHTML = `<div class="facts">${question.facts.map((f) => `<div class="fact">${f}</div>`).join("")}</div>`;
  bar(area, 3000);
  later(() => {
    state.phase = "answer";
    area = view(question.text, "覚えている答えを1つタップ");
    const choices = document.createElement("div");
    choices.className = "choices";
    question.choices.forEach((c) =>
      choices.append(
        button(
          c,
          () =>
            finish(
              c === question.answer ? 100 : 0,
              `正解は「${question.answer}」`,
            ),
          "choice",
        ),
      ),
    );
    area.append(choices);
  }, 3000);
}
function stage4() {
  state.phase = "memorize";
  const number = String(1000 + Math.floor(Math.random() * 9000));
  const area = view(names[3], "この数字を覚えてください", "記憶タイム · 3秒");
  area.innerHTML = `<div class="digits">${number}</div>`;
  bar(area, 3000);
  later(() => mathQuestion(0, number), 3000);
}
function mathQuestion(index, number) {
  state.phase = "math";
  const a = 3 + Math.floor(Math.random() * 7),
    b = 2 + Math.floor(Math.random() * 7);
  const answer = index === 0 ? a + b : index === 1 ? a : b * a;
  const expression =
    index === 0
      ? `${a} + ${b}`
      : index === 1
        ? `${a + b} − ${b}`
        : `${a} × ${b}`;
  const area = view(
    "ちょっと、計算。",
    `計算 ${index + 1} / 3 問 · 最初の数字も忘れずに`,
    "計算は得点に含みません",
  );
  area.innerHTML = `<div class="math">${expression} = ?</div><div class="choices three"></div>`;
  MemoryRules.shuffle([
    answer,
    answer + MemoryRules.pick([1, 2, 3]),
    answer - MemoryRules.pick([1, 2]),
  ]).forEach((n) =>
    area.querySelector(".choices").append(
      button(
        n,
        () => {
          if (state.phase !== "math") return;
          state.phase = "mathFeedback";
          area.querySelectorAll("button").forEach((b) => (b.disabled = true));
          area.insertAdjacentHTML(
            "beforeend",
            `<p class="counter">${n === answer ? "正解！" : `正解は ${answer}`}</p>`,
          );
          later(
            () =>
              index === 2 ? recall(number) : mathQuestion(index + 1, number),
            450,
          );
        },
        "choice",
      ),
    ),
  );
}
function recall(number) {
  state.phase = "recall";
  let entered = "";
  const area = view("最初の数字は？", "4桁を入力して「回答」");
  area.innerHTML =
    '<div class="number-display" role="status" aria-label="入力した数字">' +
    Array(4).fill('<span class="digit">・</span>').join("") +
    '</div><div class="keypad"></div>';
  const update = (key) => {
    if (state.phase !== "recall" || state.paused) return;
    if (key === "回答") {
      if (entered.length === 4) {
        const hits = MemoryRules.positional(entered, number);
        finish(
          MemoryRules.orderScore(hits),
          `${hits} / 4 桁一致 · 正解 ${number}`,
        );
      }
      return;
    }
    entered =
      key === "消す"
        ? entered.slice(0, -1)
        : entered.length < 4
          ? entered + key
          : entered;
    area
      .querySelectorAll(".digit")
      .forEach((d, i) => (d.textContent = entered[i] || "・"));
    area.querySelector(".enter").disabled = entered.length !== 4;
  };
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消す", "0", "回答"].forEach(
    (k) => {
      const b = button(
        k,
        () => update(k),
        k === "回答" ? "enter" : k === "消す" ? "delete" : "",
      );
      b.disabled = k === "回答";
      area.querySelector(".keypad").append(b);
    },
  );
  state.numberHandler = update;
}
function stage5() {
  state.phase = "nbackIntro";
  const area = view(
    names[4],
    "2つ前と同じ絵が出たら「同じ！」<br>違うときは押さずに待とう。",
    "最後のチャレンジ",
  );
  area.innerHTML =
    '<div class="emoji-row"><span class="emoji-box">🍎</span><span class="emoji-box">🐕</span><span class="emoji-box">🍎</span></div><p class="instruction">この3つ目なら「同じ！」<br>最初の2つは見るだけ。全10個、約1秒ずつ。</p><p class="counter">まもなくスタート…</p>';
  later(nbackPlay, 4200);
}
function nbackPlay() {
  state.phase = "nback";
  const { items, matches } = MemoryRules.sequence();
  let index = -1,
    hits = 0,
    falseTaps = 0,
    tapped = false;
  const area = view(names[4], "2つ前と同じときだけタップ", "2バック · 全10個");
  area.innerHTML =
    '<p class="counter" id="ncount"></p><div class="nback-slot"></div><p class="nback-hint" role="status"></p>';
  const tap = button("同じ！", () => {
    if (state.phase !== "nback" || tapped || index < 0) return;
    tapped = true;
    tap.disabled = true;
    if (matches.has(index)) hits++;
    else falseTaps++;
    area.querySelector(".nback-hint").textContent = "タップしました";
  });
  area.append(tap);
  function next() {
    index++;
    if (index === 10) {
      finish(
        MemoryRules.nbackScore(hits, falseTaps, matches.size),
        `成功 ${hits} / ${matches.size} 回 · 誤タップ ${falseTaps} 回`,
      );
      return;
    }
    tapped = false;
    tap.disabled = false;
    area.querySelector("#ncount").textContent = `${index + 1} / 10 個目`;
    area.querySelector(".nback-slot").innerHTML =
      `<div class="nback-emoji">${items[index]}</div>`;
    area.querySelector(".nback-hint").textContent =
      index < 2 ? "まずは覚えよう" : "2つ前と同じ？";
    later(next, 1150);
  }
  next();
}
function result() {
  clearTimers();
  state.phase = "result";
  const total = state.scores.reduce((a, b) => a + b, 0),
    age = MemoryRules.age(total);
  const comment =
    age <= 30
      ? "かなり冴えています。"
      : age <= 50
        ? "まだまだ覚えています。"
        : age <= 70
          ? "メモという相棒も、頼りになります。"
          : "おつかれさま。もう一回でリベンジ？";
  app.innerHTML = `<section class="panel result"><span class="pill">MEMORY CHECK COMPLETE</span><h2 style="margin-top:24px">あなたの記憶年齢は</h2><div class="age">${age}<span>歳</span></div><p class="comment">${comment}</p><div class="total">TOTAL SCORE　<b>${total}</b> / 500</div><div class="breakdown">${state.scores.map((s, i) => `<div class="score-row"><label>${names[i]}</label><span class="score-track"><i style="width:${s}%"></i></span><b>${s}</b></div>`).join("")}</div><div id="result-actions"></div><p class="note">※これは医療的な診断ではありません。<br>「記憶年齢」はゲーム独自のスコア換算です。<br>実際の年齢・認知機能・疾患の有無を示しません。</p></section>`;
  const actions = document.querySelector("#result-actions");
  actions.append(
    button("もう一度測る　↻", () => {
      state.scores = [];
      startStage(0);
    }),
  );
  if (navigator.share)
    actions.append(
      button(
        "結果をシェア",
        async () => {
          try {
            await navigator.share({
              title: "記憶力、何歳？",
              text: `私の記憶年齢は${age}歳でした。 #記憶力何歳\n※ゲーム上の目安です。`,
              url: location.href,
            });
          } catch (e) {
            if (e.name !== "AbortError") {
              let note = document.querySelector("#share-note");
              if (!note) {
                note = document.createElement("p");
                note.id = "share-note";
                note.className = "note";
                actions.append(note);
              }
              note.textContent =
                "共有できませんでした。もう一度お試しください。";
            }
          }
        },
        "secondary",
      ),
    );
}
document.addEventListener("keydown", (e) => {
  if (!state.numberHandler || state.paused) return;
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    state.numberHandler(e.key);
  } else if (["Backspace", "Enter"].includes(e.key)) {
    e.preventDefault();
    state.numberHandler(e.key === "Enter" ? "回答" : "消す");
  }
});
// Do not consume timed memory stimuli while the page is in the background.
document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden ||
    state.paused ||
    ["home", "result"].includes(state.phase)
  )
    return;
  state.paused = true;
  state.timers.forEach((t) => {
    clearTimeout(t.id);
    t.remaining = Math.max(0, t.remaining - (performance.now() - t.started));
  });
  document.getAnimations().forEach((a) => a.pause());
  const overlay = document.createElement("div");
  overlay.className = "paused";
  overlay.innerHTML =
    '<div class="panel"><p class="eyebrow">PAUSED</p><h2>ひとやすみ中</h2><p class="instruction">準備ができたら再開しよう。</p></div>';
  overlay.querySelector(".panel").append(
    button("つづける", () => {
      overlay.remove();
      state.paused = false;
      document.getAnimations().forEach((a) => a.play());
      state.timers.forEach((t) => {
        t.started = performance.now();
        t.id = setTimeout(() => {
          state.timers.delete(t);
          t.fn();
        }, t.remaining);
      });
    }),
  );
  document.body.append(overlay);
});
document.addEventListener("dblclick", (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener("gesturestart", (e) => e.preventDefault(), {
  passive: false,
});
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest("button,.game")) e.preventDefault();
});
document.addEventListener("dragstart", (e) => e.preventDefault());
home();
