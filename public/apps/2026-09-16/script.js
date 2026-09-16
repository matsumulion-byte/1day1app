import {
  DIGITS,
  polygonPoints,
  difference,
  moves,
  judge,
  relocate,
} from "/apps/2026-09-16/engine.mjs";
import { readProgress } from "/apps/2026-09-16/progress.mjs";
const $ = (id) => document.getElementById(id),
  NS = "http://www.w3.org/2000/svg",
  KEY = "matchstick-puzzles-v1";
let puzzles = [],
  index = 0,
  current = [],
  history = [],
  selected = null,
  gesture = null,
  hintLevel = 0,
  solved = false,
  cleared = new Set();
let stored = null,
  highestUnlocked = 1,
  diagnosis = null,
  inspected = 0;
try {
  stored = JSON.parse(localStorage.getItem(KEY) || "null");
} catch {}
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 2,
        cleared: [...cleared],
        unlocked: highestUnlocked,
      }),
    );
  } catch {
    $("storage-note").hidden = false;
  }
}
function unlocked(i) {
  return i + 1 <= highestUnlocked;
}
function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function line(parent, a, b, attrs) {
  parent.append(
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...attrs }),
  );
}
function stick(parent, s, { active = false, tint = null, ghost = false } = {}) {
  const g = el("g", { "pointer-events": "none", opacity: ghost ? 0.75 : 1 }),
    dx = s.b[0] - s.a[0],
    dy = s.b[1] - s.a[1],
    len = Math.hypot(dx, dy),
    ux = dx / len,
    uy = dy / len,
    a = [s.a[0] + ux * 6, s.a[1] + uy * 6],
    b = [s.b[0] - ux * 6, s.b[1] - uy * 6];
  if (active)
    line(g, s.a, s.b, {
      stroke: "#d6a464",
      "stroke-width": 17,
      "stroke-linecap": "round",
      opacity: 0.25,
    });
  line(g, [a[0] + 1, a[1] + 3], [b[0] + 1, b[1] + 3], {
    stroke: "#5e3d20",
    "stroke-width": 8,
    "stroke-linecap": "round",
    opacity: 0.13,
  });
  line(g, a, b, {
    stroke: tint || "#ba8b51",
    "stroke-width": 7,
    "stroke-linecap": "round",
  });
  line(g, [a[0] - 0.6, a[1] - 0.7], [b[0] - 0.6, b[1] - 0.7], {
    stroke: tint || "#e8c58d",
    "stroke-width": 4,
    "stroke-linecap": "round",
  });
  const head = [b[0] - ux * 6, b[1] - uy * 6];
  line(g, head, b, {
    stroke: tint || "#b44432",
    "stroke-width": 9,
    "stroke-linecap": "round",
  });
  line(g, [head[0] - 0.9, head[1] - 0.9], [b[0] - 0.9, b[1] - 0.9], {
    stroke: tint || "#ce6750",
    "stroke-width": 2.5,
    "stroke-linecap": "round",
    opacity: 0.7,
  });
  parent.append(g);
  return g;
}
function hitBox(parent, s) {
  const dx = s.b[0] - s.a[0],
    dy = s.b[1] - s.a[1];
  parent.append(
    el("rect", {
      x: 4,
      y: -13,
      width: Math.hypot(dx, dy) - 8,
      height: 26,
      fill: "transparent",
      transform: `translate(${s.a[0]} ${s.a[1]}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`,
    }),
  );
}
function scene(
  svg,
  p,
  occupied,
  { interactive = false, highlight = [], tint = null } = {},
) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", p.viewBox.join(" "));
  const set = new Set(occupied);
  if (interactive && selected && !solved) {
    for (const s of p.slots.filter((s) => !s.fixed && !set.has(s.id))) {
      const g = el("g", {
        "data-slot": s.id,
        tabindex: 0,
        role: "button",
        "aria-label": `置き場所 ${p.slots.indexOf(s) + 1}`,
      });
      line(g, s.a, s.b, {
        stroke: "#ab9d88",
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-dasharray": "3 6",
        opacity: 0.65,
      });
      hitBox(g, s);
      svg.append(g);
    }
  }
  for (const s of p.slots) {
    if (s.fixed) {
      line(svg, s.a, s.b, {
        stroke: "#a69e8e",
        "stroke-width": 6,
        "stroke-linecap": "round",
      });
      continue;
    }
    if (!set.has(s.id)) continue;
    const g = el(
      "g",
      interactive
        ? {
            "data-slot": s.id,
            tabindex: solved ? -1 : 0,
            role: "button",
            "aria-label": `マッチ棒 ${p.slots.indexOf(s) + 1}`,
            "aria-pressed": selected === s.id,
          }
        : {},
    );
    stick(g, s, {
      active: interactive && selected === s.id,
      tint: highlight.includes(s.id) ? tint : null,
    });
    if (interactive) hitBox(g, s);
    svg.append(g);
  }
  if (p.kind === "equation") {
    const text = el("text", {
      x: 295,
      y: 188,
      "text-anchor": "middle",
      fill: "#aaa18f",
      "font-size": 9,
    });
    text.textContent = "固定";
    svg.append(text);
  }
}
function render() {
  const p = puzzles[index];
  scene($("board"), p, current, { interactive: true });
  showDiagnosis();
  $("move-count").textContent = `${moves(p, current)} / ${p.moves} 本 移動`;
  $("move-count").classList.toggle("over", moves(p, current) > p.moves);
  $("undo").disabled = !history.length || solved;
  $("reset").disabled = !history.length && !selected && !diagnosis;
  $("check").disabled = solved;
  $("hint").disabled = solved;
  $("interaction-note").textContent = solved
    ? "お見事。少しずつ、ひらめきが形に。"
    : selected
      ? "薄い置き場所へ。向きは自動で変わります"
      : "棒をドラッグ、または 棒 → 置き場所をタップ";
}
function showDiagnosis() {
  $("inspection").hidden = !diagnosis?.shapes;
  if (diagnosis?.shapes) {
    const p = puzzles[index],
      r = diagnosis.shapes;
    $("checklist").textContent =
      `${diagnosis.moveOK ? "✓" : "△"} 移動 ${diagnosis.moveCount} / ${p.moves}本　${diagnosis.shapeOK ? "✓" : "△"} ${p.shapeName} ${r.count} / ${p.target}つ`;
    $("shape-list").replaceChildren();
    r.complete.forEach((poly, i) => {
      const size = poly.length / (p.shapeName === "正方形" ? 4 : 3),
        button = document.createElement("button");
      button.textContent = `${i + 1} · ${size === 1 ? "小" : `大（辺${size}本）`}`;
      button.setAttribute("aria-pressed", i === inspected);
      button.onclick = () => {
        inspected = i;
        render();
      };
      $("shape-list").append(button);
    });
    const poly = r.complete[inspected];
    if (poly) {
      const pts = polygonPoints(p, poly),
        g = el("g", {
          "pointer-events": "none",
          "aria-label": `数えた${p.shapeName} ${inspected + 1}`,
        });
      g.append(
        el("polygon", {
          points: pts.map((v) => v.join(",")).join(" "),
          fill: "#4b887926",
          stroke: "#387a6a",
          "stroke-width": 2.8,
          "stroke-linejoin": "round",
        }),
      );
      const center = pts.reduce(
        (a, v) => [a[0] + v[0] / pts.length, a[1] + v[1] / pts.length],
        [0, 0],
      );
      g.append(
        el("circle", { cx: center[0], cy: center[1], r: 9, fill: "#387a6a" }),
      );
      const label = el("text", {
        x: center[0],
        y: center[1] + 3.5,
        "text-anchor": "middle",
        fill: "white",
        "font-size": 10,
      });
      label.textContent = inspected + 1;
      g.append(label);
      $("board").append(g);
    }
  }
  if (diagnosis?.issues) {
    const p = puzzles[index];
    for (const issue of diagnosis.issues) {
      const pts = p.slots
          .filter((s) => issue.slots.includes(s.id))
          .flatMap((s) => [s.a, s.b]),
        xs = pts.map((v) => v[0]),
        ys = pts.map((v) => v[1]);
      $("board").append(
        el("rect", {
          x: Math.min(...xs) - 12,
          y: Math.min(...ys) - 12,
          width: Math.max(...xs) - Math.min(...xs) + 24,
          height: Math.max(...ys) - Math.min(...ys) + 24,
          rx: 8,
          fill: "none",
          stroke: "#b64a35",
          "stroke-width": 2,
          "stroke-dasharray": "5 4",
          "pointer-events": "none",
        }),
      );
    }
  }
}
function message(text, error = false) {
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
}
function load(i) {
  diagnosis = null;
  inspected = 0;
  index = i;
  const p = puzzles[i];
  current = [...p.initial];
  history = [];
  selected = null;
  gesture = null;
  hintLevel = 0;
  solved = false;
  $("success").hidden = true;
  $("hint-panel").hidden = true;
  $("number").textContent =
    `QUESTION ${String(i + 1).padStart(2, "0")} / ${puzzles.length}`;
  $("type").textContent =
    p.kind === "equation" ? "数式のパズル" : "図形のパズル";
  $("question").textContent = p.title;
  $("rule").textContent =
    p.kind === "equation"
      ? "見本の0〜9と＋・−を使い、等号の左右を同じ値に。"
      : `${p.name}。${p.shapeName}をちょうど${p.target}つにしてください。`;
  $("shape-rules").hidden = p.kind !== "shape";
  $("digit-guide").hidden = p.kind !== "equation";
  $("fixed-note").textContent =
    p.kind === "equation" ? "＝ は固定" : "大きな図形も数えます";
  $("progress").innerHTML = puzzles
    .map(
      (_, j) =>
        `<i class="${j === i ? "current" : cleared.has(j + 1) ? "done" : ""}"></i>`,
    )
    .join("");
  message("あわてず、ひとつずつ。");
  render();
  window.scrollTo({ top: 0, left: 0 });
}
function move(from, to) {
  const next = relocate(puzzles[index], current, from, to);
  if (!next) return false;
  history.push([...current]);
  current = next;
  diagnosis = null;
  selected = null;
  message("配置できました。「判定」で確かめましょう。");
  render();
  return true;
}
const board = $("board");
function point(e) {
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(
    board.getScreenCTM().inverse(),
  );
}
function distance(pt, s) {
  const dx = s.b[0] - s.a[0],
    dy = s.b[1] - s.a[1],
    t = Math.max(
      0.12,
      Math.min(
        0.88,
        ((pt.x - s.a[0]) * dx + (pt.y - s.a[1]) * dy) / (dx * dx + dy * dy),
      ),
    );
  return Math.hypot(pt.x - s.a[0] - t * dx, pt.y - s.a[1] - t * dy);
}
function nearest(pt, empty = false) {
  const candidates = puzzles[index].slots
    .filter(
      (s) =>
        !s.fixed && (empty ? !current.includes(s.id) : current.includes(s.id)),
    )
    .map((s) => ({ s, d: distance(pt, s) }))
    .sort((a, b) => a.d - b.d);
  return candidates[0]?.d < 24 ? candidates[0].s : null;
}
board.addEventListener("pointerdown", (e) => {
  if (solved || gesture || e.button > 0) return;
  e.preventDefault();
  const pt = point(e),
    targetId = e.target.closest("[data-slot]")?.dataset.slot,
    hit = targetId
      ? current.includes(targetId)
        ? puzzles[index].slots.find((s) => s.id === targetId)
        : null
      : nearest(pt);
  gesture = {
    pointer: e.pointerId,
    start: pt,
    from: hit?.id || null,
    was: selected,
    drag: false,
  };
  if (hit) selected = hit.id;
  board.setPointerCapture(e.pointerId);
  render();
});
board.addEventListener("pointermove", (e) => {
  if (!gesture || e.pointerId !== gesture.pointer || !gesture.from) return;
  const pt = point(e);
  if (Math.hypot(pt.x - gesture.start.x, pt.y - gesture.start.y) > 6)
    gesture.drag = true;
  if (!gesture.drag) return;
  board.querySelector("#ghost")?.remove();
  const target = nearest(pt, true),
    s = target || puzzles[index].slots.find((s) => s.id === gesture.from),
    dx = pt.x - (s.a[0] + s.b[0]) / 2,
    dy = pt.y - (s.a[1] + s.b[1]) / 2;
  const g = stick(
    board,
    target || { a: [s.a[0] + dx, s.a[1] + dy], b: [s.b[0] + dx, s.b[1] + dy] },
    { ghost: true, tint: target ? "#698565" : null },
  );
  g.id = "ghost";
});
board.addEventListener("pointerup", (e) => {
  if (!gesture || e.pointerId !== gesture.pointer) return;
  const g = gesture;
  gesture = null;
  const pt = point(e);
  if (g.drag) {
    const target = nearest(pt, true);
    if (target && move(g.from, target.id)) return;
    selected = null;
    message("置ける場所の外だったので、元に戻しました。");
  } else if (!g.from && selected) {
    const target = nearest(pt, true);
    if (target && move(selected, target.id)) return;
    selected = null;
  } else if (g.from === g.was) selected = null;
  render();
});
function cancel() {
  if (gesture) {
    gesture = null;
    selected = null;
    render();
  }
}
board.addEventListener("pointercancel", cancel);
board.addEventListener("lostpointercapture", cancel);
board.addEventListener("contextmenu", (e) => e.preventDefault());
board.addEventListener("dblclick", (e) => e.preventDefault());
board.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    selected = null;
    render();
    return;
  }
  if (!["Enter", " "].includes(e.key) || solved) return;
  const id = e.target.closest("[data-slot]")?.dataset.slot;
  if (!id) return;
  e.preventDefault();
  if (current.includes(id)) {
    selected = selected === id ? null : id;
    render();
    board.querySelector(`[data-slot="${id}"]`)?.focus();
  } else if (selected) move(selected, id);
});
$("undo").onclick = () => {
  if (!history.length) return;
  current = history.pop();
  diagnosis = null;
  selected = null;
  solved = false;
  $("success").hidden = true;
  message("ひとつ前の配置に戻しました。");
  render();
};
$("reset").onclick = () => {
  load(index);
  message("最初の配置に戻しました。");
};
$("check").onclick = () => {
  selected = null;
  const result = judge(puzzles[index], current);
  diagnosis = result;
  inspected = 0;
  message(result.message, !result.ok);
  if (result.ok) {
    solved = true;
    cleared.add(index + 1);
    highestUnlocked = Math.min(
      puzzles.length,
      Math.max(highestUnlocked, index + 2),
    );
    save();
    $("success").hidden = false;
    $("success-text").textContent =
      index === puzzles.length - 1
        ? cleared.size === puzzles.length
          ? `全${puzzles.length}問クリア。おつかれさまでした。`
          : "最後の問題をクリアしました。ほかの問題も選び直せます。"
        : "次の問題が開きました。";
    $("next").textContent =
      index === puzzles.length - 1 ? "問題を選ぶ →" : "次の問題へ →";
    $("hint-panel").hidden = true;
  }
  render();
  if (result.ok && puzzles[index].kind !== "shape")
    $("success").scrollIntoView({ block: "nearest" });
};
$("next").onclick = () =>
  index < puzzles.length - 1 ? load(index + 1) : openPicker();
function showHint() {
  hintLevel = Math.min(3, hintLevel + 1);
  const p = puzzles[index],
    d = difference(p.initial, p.solution);
  $("hint-panel").hidden = false;
  $("hint-label").textContent = `ヒント ${hintLevel} / 3`;
  $("hint-text").textContent =
    hintLevel === 1
      ? p.hints[0]
      : hintLevel === 2
        ? "最初の配置から、赤く示した棒を動かしてみましょう。"
        : "赤い棒を取り除き、緑の場所に置きます。これは正解の一例です。";
  $("hint-example").replaceChildren();
  if (hintLevel >= 2) {
    for (const [caption, config, highlight, tint] of [
      ["最初の配置 · 赤い棒を動かす", p.initial, d.removed, "#bf5a45"],
      ...(hintLevel === 3
        ? [["正解の一例 · 緑の場所へ", p.solution, d.added, "#608565"]]
        : []),
    ]) {
      const figure = document.createElement("figure"),
        svg = el("svg"),
        cap = document.createElement("figcaption");
      svg.setAttribute("aria-label", caption);
      scene(svg, p, config, { highlight, tint });
      cap.textContent = caption;
      figure.append(svg, cap);
      $("hint-example").append(figure);
    }
  }
  $("more-hint").hidden = hintLevel === 3;
  $("hint-panel").scrollIntoView({ block: "nearest" });
}
$("hint").onclick = () => {
  if ($("hint-panel").hidden && hintLevel > 0) hintLevel--;
  showHint();
};
$("more-hint").onclick = showHint;
$("close-hint").onclick = () => {
  $("hint-panel").hidden = true;
};
function openPicker() {
  $("problem-list").replaceChildren();
  puzzles.forEach((p, i) => {
    const b = document.createElement("button");
    b.disabled = !unlocked(i);
    b.className = cleared.has(i + 1) ? "cleared" : "";
    b.innerHTML = `<strong>${String(i + 1).padStart(2, "0")} ${cleared.has(i + 1) ? "✓" : ""}</strong><small>${!unlocked(i) ? "未解放" : p.kind === "equation" ? "数式" : p.shapeName}</small>`;
    b.onclick = () => {
      load(i);
      $("picker").close();
    };
    $("problem-list").append(b);
  });
  $("picker").showModal();
}
$("digit-guide").onclick = () => {
  $("digit-examples").replaceChildren();
  const p = puzzles.find((p) => p.kind === "equation");
  DIGITS.forEach((mask, n) => {
    const item = document.createElement("figure"),
      svg = el("svg", { viewBox: "17 82 80 137", "aria-label": `数字 ${n}` }),
      cap = document.createElement("figcaption");
    for (const s of p.slots.filter(
      (s) => s.id.startsWith("d0:") && mask.includes(s.id.split(":")[1]),
    ))
      stick(svg, s);
    cap.textContent = n;
    item.append(svg, cap);
    $("digit-examples").append(item);
  });
  $("digits-dialog").showModal();
};
$("choose").onclick = openPicker;
$("help").onclick = () => $("help-dialog").showModal();
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
try {
  const response = await fetch("/apps/2026-09-16/puzzles.json");
  if (!response.ok) throw Error("load");
  puzzles = await response.json();
  const progress = readProgress(stored, puzzles.length);
  cleared = new Set(progress.cleared);
  highestUnlocked = progress.unlocked;
  $("update-note").hidden = !progress.updated;
  save();
  load(
    Math.max(
      0,
      puzzles.findIndex((p, i) => unlocked(i) && !cleared.has(p.id)),
    ),
  );
} catch {
  message("問題を読み込めませんでした。ページを再読み込みしてください。", true);
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
}
