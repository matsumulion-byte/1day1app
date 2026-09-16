export const DIGITS = [
  "abcdef",
  "bc",
  "abdeg",
  "abcdg",
  "bcfg",
  "acdfg",
  "acdefg",
  "abc",
  "abcdefg",
  "abcdfg",
].map((s) => [...s].sort().join(""));
export function difference(initial, current) {
  const a = new Set(initial),
    b = new Set(current);
  return {
    removed: [...a].filter((x) => !b.has(x)),
    added: [...b].filter((x) => !a.has(x)),
  };
}
export function moves(p, current) {
  return difference(p.initial, current).removed.length;
}
export function readEquation(p, current) {
  const set = new Set(current);
  const values = [];
  for (const cell of p.cells) {
    const mask = cell.slots
      .filter((id) => set.has(id))
      .map((id) => id.split(":")[1])
      .sort()
      .join("");
    if (cell.kind === "digit") {
      const n = DIGITS.indexOf(mask);
      if (n < 0) return null;
      values.push(n);
    } else {
      if (mask === "h") values.push("-");
      else if (mask === "hv") values.push("+");
      else return null;
    }
  }
  const [a, op, b, c] = values;
  return {
    text: `${a} ${op} ${b} = ${c}`,
    valid: (op === "+" ? a + b : a - b) === c,
  };
}
export function countShapes(p, current) {
  const set = new Set(current);
  const complete = p.polygons.filter((poly) => poly.every((id) => set.has(id)));
  const used = new Set(complete.flat());
  return {
    count: complete.length,
    complete,
    unused: [...set].filter((id) => !used.has(id)),
  };
}
export function condition(p, current) {
  if (p.kind === "equation") return readEquation(p, current)?.valid === true;
  const r = countShapes(p, current);
  return r.count === p.target && (p.allowUnused || r.unused.length === 0);
}
export function equationIssues(p, current) {
  const set = new Set(current),
    names = ["左の数字", "計算記号", "中央の数字", "右の数字"];
  return p.cells.flatMap((cell, i) => {
    const mask = cell.slots
      .filter((id) => set.has(id))
      .map((id) => id.split(":")[1])
      .sort()
      .join("");
    const valid =
      cell.kind === "digit"
        ? DIGITS.includes(mask)
        : ["h", "hv"].includes(mask);
    if (valid) return [];
    return [
      {
        index: i,
        slots: cell.slots,
        message:
          cell.kind === "digit" && mask === "abcfg"
            ? `${names[i]}は「9」の下の横棒がない形です。`
            : `${names[i]}が使える${cell.kind === "digit" ? "数字" : "記号"}の形になっていません。`,
      },
    ];
  });
}
export function judge(p, current) {
  const allowed = new Set(p.slots.filter((s) => !s.fixed).map((s) => s.id));
  if (
    new Set(current).size !== current.length ||
    current.length !== p.initial.length ||
    current.some((id) => !allowed.has(id))
  )
    return { ok: false, message: "棒の数や配置を確認してください。" };
  const d = difference(p.initial, current),
    moveCount = d.removed.length;
  const moveOK = moveCount === p.moves && d.added.length === p.moves;
  if (p.kind === "shape") {
    const shapes = countShapes(p, current),
      shapeOK = shapes.count === p.target;
    const unusedOK = p.allowUnused || shapes.unused.length === 0;
    const ok = moveOK && shapeOK && unusedOK;
    const reasons = [];
    if (!shapeOK)
      reasons.push(
        `${p.shapeName}は${shapes.count}つです。目標は${p.target}つです。`,
      );
    if (!moveOK)
      reasons.push(
        `${shapeOK ? "形の数は合っています。" : ""}指定の${p.moves}本に対し、移動は${moveCount}本です。`,
      );
    if (!unusedOK)
      reasons.push(`${shapes.unused.length}本が図形の辺に使われていません。`);
    return {
      ok,
      moveCount,
      moveOK,
      shapeOK,
      shapes,
      message: ok
        ? `${p.shapeName}${shapes.count}つ、${p.moves}本移動。正解です。`
        : reasons.join(" "),
    };
  }
  const issues = equationIssues(p, current);
  if (issues.length)
    return {
      ok: false,
      issues,
      moveCount,
      moveOK,
      message:
        issues.map((x) => x.message).join(" ") +
        "「数字の形」で見本を確認できます。",
    };
  if (!moveOK)
    return {
      ok: false,
      moveCount,
      moveOK,
      message: `今は${moveCount}本移動しています。ちょうど${p.moves}本動かしてみましょう。`,
    };
  const eq = readEquation(p, current);
  return {
    ok: eq.valid,
    message: eq.valid ? "正解です。" : `${eq.text} は、まだ成立していません。`,
  };
}
export function polygonPoints(p, ids) {
  const unique = new Map(
    p.slots
      .filter((s) => ids.includes(s.id))
      .flatMap((s) => [s.a, s.b])
      .map((v) => [v.join(","), v]),
  );
  const points = [...unique.values()],
    center = points.reduce(
      (a, v) => [a[0] + v[0] / points.length, a[1] + v[1] / points.length],
      [0, 0],
    );
  return points.sort(
    (a, b) =>
      Math.atan2(a[1] - center[1], a[0] - center[0]) -
      Math.atan2(b[1] - center[1], b[0] - center[0]),
  );
}
export function relocate(p, current, from, to) {
  if (
    from === to ||
    !current.includes(from) ||
    current.includes(to) ||
    !p.slots.some((s) => s.id === to && !s.fixed)
  )
    return null;
  return current.map((id) => (id === from ? to : id));
}
