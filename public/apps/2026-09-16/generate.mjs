// Authoring-only deterministic generator. The browser loads the saved JSON, never this file.
import fs from "node:fs";
import { makeGrid } from "./geometry.mjs";
import { DIGITS, condition, moves, countShapes } from "./engine.mjs";
const slot = (id, a, b, fixed = false) => ({ id, a, b, fixed });
function equation(a, op, b, c) {
  const slots = [],
    cells = [];
  for (const [i, x] of [35, 195, 355].entries()) {
    const cell = { kind: "digit", slots: [] };
    for (const [k, u, v] of [
      ["a", [0, 0], [45, 0]],
      ["b", [45, 0], [45, 50]],
      ["c", [45, 50], [45, 100]],
      ["d", [0, 100], [45, 100]],
      ["e", [0, 50], [0, 100]],
      ["f", [0, 0], [0, 50]],
      ["g", [0, 50], [45, 50]],
    ]) {
      const id = `d${i}:${k}`;
      slots.push(slot(id, [x + u[0], 100 + u[1]], [x + v[0], 100 + v[1]]));
      cell.slots.push(id);
    }
    cells.push(cell);
  }
  const operator = { kind: "operator", slots: ["op:h", "op:v"] };
  slots.push(
    slot("op:h", [115, 150], [160, 150]),
    slot("op:v", [137.5, 127.5], [137.5, 172.5]),
    slot("eq:1", [275, 140], [315, 140], true),
    slot("eq:2", [275, 160], [315, 160], true),
  );
  const initial = [
    ...[a, b, c].flatMap((n, i) => [...DIGITS[n]].map((k) => `d${i}:${k}`)),
    "op:h",
    ...(op === "+" ? ["op:v"] : []),
  ];
  return {
    kind: "equation",
    slots,
    cells: [cells[0], operator, cells[1], cells[2]],
    initial,
    viewBox: [0, 55, 440, 205],
  };
}
function* combinations(a, n, start = 0, p = []) {
  if (n === 0) {
    yield p;
    return;
  }
  for (let i = start; i <= a.length - n; i++)
    yield* combinations(a, n - 1, i + 1, [...p, a[i]]);
}
function* variations(p, n) {
  const empty = p.slots
    .filter((s) => !s.fixed && !p.initial.includes(s.id))
    .map((s) => s.id);
  for (const remove of combinations(p.initial, n))
    for (const add of combinations(empty, n))
      yield [...p.initial.filter((id) => !remove.includes(id)), ...add];
}
const eq = [];
for (const [a, op, b, c, n] of [
  [1, "+", 1, 3, 1],
  [6, "+", 4, 4, 1],
  [9, "-", 5, 9, 1],
  [5, "+", 3, 9, 2],
  [8, "-", 3, 3, 2],
  [6, "+", 2, 5, 2],
]) {
  const p = equation(a, op, b, c);
  p.moves = n;
  p.title = `${n}本動かして、正しい式に`;
  p.hints = ["数字だけでなく、＋や−も見直してみましょう。"];
  p.solution = [...variations(p, n)].find((v) => condition(p, v));
  if (!p.solution || condition(p, p.initial))
    throw Error("bad equation " + [a, op, b, c]);
  eq.push(p);
}
// Six deliberately authored transformations; no random scatter/reverse generation.
const recipes = JSON.parse(
  fs.readFileSync(new URL("./shape-recipes.json", import.meta.url)),
);
const shapes = recipes.map((recipe) => {
  const raw = makeGrid(recipe.triangle);
  const solution = [
    ...recipe.initial.filter((id) => !recipe.remove.includes(id)),
    ...recipe.add,
  ];
  const used = new Set([...recipe.initial, ...solution]);
  const vertices = raw.slots
    .filter((s) => used.has(s.id))
    .flatMap((s) => [s.a, s.b]);
  const minX = Math.min(...vertices.map((v) => v[0])),
    maxX = Math.max(...vertices.map((v) => v[0]));
  const minY = Math.min(...vertices.map((v) => v[1])),
    maxY = Math.max(...vertices.map((v) => v[1]));
  const slots = raw.slots.filter((s) =>
    [s.a, s.b].every(
      (v) =>
        v[0] >= minX - 0.01 &&
        v[0] <= maxX + 0.01 &&
        v[1] >= minY - 0.01 &&
        v[1] <= maxY + 0.01,
    ),
  );
  const available = new Set(slots.map((s) => s.id));
  const p = {
    ...raw,
    slots,
    polygons: raw.polygons.filter((poly) =>
      poly.every((id) => available.has(id)),
    ),
    viewBox: [minX - 28, minY - 25, maxX - minX + 56, maxY - minY + 50],
    name: recipe.name,
    target: recipe.target,
    moves: recipe.moves,
    initial: recipe.initial,
    solution,
    allowUnused: true,
    title: `${recipe.moves}本動かして、${raw.shapeName}を${recipe.target}つに`,
    hints: [recipe.hint],
    revision: 2,
  };
  if (
    condition(p, p.initial) ||
    !condition(p, p.solution) ||
    moves(p, p.solution) !== p.moves
  )
    throw Error("Invalid authored puzzle " + p.name);
  if (
    countShapes(p, p.initial).unused.length ||
    countShapes(p, p.solution).unused.length
  )
    throw Error("Stray sticks in authored arrangement " + p.name);
  return p;
});
const equationHints = [
  "右側の数字に注目。1＋1の答えを作ってみましょう。",
  "左側の数字の中央を空ける方法と、＋を変える方法があります。",
  "右側の9は、1本取り除くと別の数字になります。",
  "左側と右側の数字を、1本ずつ組み替えてみましょう。",
  "左側の8から1本取り、真ん中の数字に渡してみましょう。",
  "真ん中の2は、中心を空けると別の数字に近づきます。",
];
eq.forEach((p, i) => (p.hints = [equationHints[i]]));
const problems = eq
  .flatMap((p, i) => [p, shapes[i]])
  .map((p, i) => ({ ...p, id: i + 1 }));
fs.writeFileSync(
  new URL("./puzzles.json", import.meta.url),
  JSON.stringify(problems, null, 2) + "\n",
);
console.log(
  problems
    .map((p) => `${p.id}: ${p.title} (${p.initial.length} sticks)`)
    .join("\n"),
);
