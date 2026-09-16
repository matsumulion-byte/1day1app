import assert from "node:assert/strict";
import fs from "node:fs";
import { readProgress } from "./progress.mjs";
import {
  DIGITS,
  difference,
  moves,
  condition,
  judge,
  readEquation,
  countShapes,
  relocate,
} from "./engine.mjs";
const puzzles = JSON.parse(
  fs.readFileSync(new URL("./puzzles.json", import.meta.url)),
);
function* choose(a, n, start = 0, p = []) {
  if (!n) {
    yield p;
    return;
  }
  for (let i = start; i <= a.length - n; i++)
    yield* choose(a, n - 1, i + 1, [...p, a[i]]);
}
// Independent geometric oracle: enumerate vertex sets, then require every unit edge on each boundary.
function oracle(p, current) {
  const points = [
      ...new Map(
        p.slots.flatMap((s) => [s.a, s.b]).map((a) => [a.join(","), a]),
      ).values(),
    ],
    occupied = p.slots.filter((s) => current.includes(s.id)),
    equal = (a, b) => Math.abs(a - b) < 0.001,
    dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const edge = (a, b) => {
    const length = dist(a, b);
    const parts = occupied.filter((s) =>
      [s.a, s.b].every((v) => equal(dist(a, v) + dist(v, b), length)),
    );
    return equal(
      parts.reduce((sum, s) => sum + dist(s.a, s.b), 0),
      length,
    );
  };
  let count = 0;
  for (const vertices of choose(points, p.shapeName === "正方形" ? 4 : 3)) {
    const center = vertices.reduce(
      (a, v) => [a[0] + v[0] / vertices.length, a[1] + v[1] / vertices.length],
      [0, 0],
    );
    vertices.sort(
      (a, b) =>
        Math.atan2(a[1] - center[1], a[0] - center[0]) -
        Math.atan2(b[1] - center[1], b[0] - center[0]),
    );
    const length = dist(vertices[0], vertices[1]);
    if (
      !vertices.every(
        (a, i) =>
          equal(dist(a, vertices[(i + 1) % vertices.length]), length) &&
          edge(a, vertices[(i + 1) % vertices.length]),
      )
    )
      continue;
    if (
      vertices.length === 4 &&
      !equal(dist(vertices[0], vertices[2]), length * Math.SQRT2)
    )
      continue;
    count++;
  }
  return count;
}
assert.equal(puzzles.length, 12);
assert.equal(puzzles.filter((p) => p.kind === "equation").length, 6);
let alternate = 0,
  visited = 0;
for (const p of puzzles) {
  assert(!condition(p, p.initial), `${p.id} initially solved`);
  assert(judge(p, p.solution).ok, `${p.id} invalid solution`);
  assert.equal(moves(p, p.solution), p.moves);
  assert.equal(p.initial.length, p.solution.length);
  assert.equal(new Set(p.slots.map((s) => s.id)).size, p.slots.length);
  assert(!judge(p, p.initial).ok);
  assert(!judge(p, [...p.solution, p.solution[0]]).ok);
  const d = difference(p.initial, p.solution);
  let state = [...p.initial];
  for (let i = 0; i < d.removed.length; i++)
    state = relocate(p, state, d.removed[i], d.added[i]);
  assert.deepEqual(new Set(state), new Set(p.solution));
  for (let i = 0; i < d.removed.length; i++)
    state = relocate(p, state, d.added[i], d.removed[i]);
  assert.equal(moves(p, state), 0);
  assert.equal(relocate(p, p.initial, p.initial[0], p.initial[1]), null);
  assert.equal(relocate(p, p.initial, p.initial[0], "outside"), null);
  const empty = p.slots
    .filter((s) => !s.fixed && !p.initial.includes(s.id))
    .map((s) => s.id);
  let solutions = 0;
  for (const removed of choose(p.initial, p.moves))
    for (const added of choose(empty, p.moves)) {
      const v = [...p.initial.filter((id) => !removed.includes(id)), ...added];
      visited++;
      if (condition(p, v)) {
        assert(judge(p, v).ok);
        solutions++;
        if (difference(p.solution, v).removed.length) alternate++;
      }
    }
  assert(solutions > 0);
  if (p.kind === "shape") {
    assert.equal(countShapes(p, p.solution).count, oracle(p, p.solution));
    const all = p.slots.map((s) => s.id);
    assert.equal(
      countShapes(p, all).count,
      { 2: 5, 4: 10, 6: 8, 8: 14, 10: 12, 12: 8 }[p.id],
    );
    assert.equal(
      p.allowUnused,
      true,
      "All shipped shape puzzles allow unused matches",
    );
    assert.equal(
      countShapes(p, p.initial).unused.length,
      0,
      "Authored initial layout must be coherent",
    );
    assert.equal(
      countShapes(p, p.solution).unused.length,
      0,
      "Authored example should have no stray matches",
    );
    assert.equal(countShapes(p, all).count, oracle(p, all));
    for (let i = 0; i < 80; i++) {
      const v = p.slots
        .filter((s, k) => (k * 13 + i * 7) % 23 > i % 11)
        .map((s) => s.id);
      assert.equal(countShapes(p, v).count, oracle(p, v));
    }
    if (!p.allowUnused) {
      const extra = p.slots.find((s) => !p.solution.includes(s.id));
      if (extra) assert(!condition(p, [...p.solution, extra.id]));
    }
  }
  console.log(
    `Q${p.id}: verified ${solutions} solution(s), ${p.moves} move(s)`,
  );
}
// Check every equation permitted by these single-digit boards, independently of the example answers.
const base = puzzles.find((p) => p.kind === "equation");
let equations = 0;
for (let a = 0; a < 10; a++)
  for (let b = 0; b < 10; b++)
    for (let c = 0; c < 10; c++)
      for (const op of ["+", "-"]) {
        const v = [
          ...[a, b, c].flatMap((n, i) =>
            [...DIGITS[n]].map((k) => `d${i}:${k}`),
          ),
          "op:h",
          ...(op === "+" ? ["op:v"] : []),
        ];
        assert.equal(
          readEquation(base, v).valid,
          (op === "+" ? a + b : a - b) === c,
        );
        equations++;
      }
assert.equal(readEquation(base, ["d0:a"]), null);
assert.equal(relocate(base, base.initial, base.initial[0], "eq:1"), null);
assert(alternate > 0);
console.log(
  `PASS: ${visited} reachable configurations; ${alternate} alternate solutions; ${equations} expressions; 480 geometric oracle comparisons.`,
);

// Regression: the user's screenshot contains four triangles and two spare sticks.
const legacy = JSON.parse(
  fs.readFileSync(new URL("./legacy-shape-fixture.json", import.meta.url)),
);
const screenshot = [
  ...legacy.initial.filter((id) => !["s1-4", "s7-8"].includes(id)),
  "s4-8",
  "s6-7",
];
assert.equal(countShapes(legacy, screenshot).count, 4);
assert.equal(oracle(legacy, screenshot), 4);
assert.equal(countShapes(legacy, screenshot).unused.length, 2);
assert.equal(moves(legacy, screenshot), 2);
assert(
  judge({ ...legacy, allowUnused: true }, screenshot).ok,
  "Four triangles and two moved sticks must pass",
);
const wrongMoves = judge(
  { ...legacy, allowUnused: true, moves: 3 },
  screenshot,
);
assert(!wrongMoves.ok);
assert(wrongMoves.shapeOK);
assert(!wrongMoves.moveOK);
assert.match(wrongMoves.message, /形の数は合っています/);
const nineScreenshot = [
  ...[5, 4, 9].flatMap((n, i) =>
    [...DIGITS[n]]
      .filter((k) => !(i === 2 && k === "d"))
      .map((k) => `d${i}:${k}`),
  ),
  "op:h",
  "op:v",
];
const nineResult = judge(puzzles[2], nineScreenshot);
assert(!nineResult.ok);
assert.equal(nineResult.issues[0].index, 3);
assert.match(nineResult.message, /右の数字.*下の横棒/);
const migrated = readProgress([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 12);
assert.deepEqual(migrated.cleared, [1, 3, 5, 7, 9]);
assert.equal(migrated.unlocked, 11);
assert(migrated.updated);
const saved = readProgress({ version: 2, cleared: [1, 2], unlocked: 11 }, 12);
assert.deepEqual(saved.cleared, [1, 2]);
assert.equal(saved.unlocked, 11);
assert.equal(readProgress(null, 12).unlocked, 1);
assert.deepEqual(readProgress({ cleared: "invalid" }, 12).cleared, []);
console.log(
  "PASS: screenshot regressions, visible diagnosis, coherent authored layouts, progress migration.",
);
