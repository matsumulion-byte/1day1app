// Authoring-time geometry only; runtime uses precomputed polygons.
export function makeGrid(tri = false) {
  const points = [];
  for (let y = 0; y <= 3; y++)
    for (let x = 0; x <= (tri ? 5 : 4); x++)
      points.push(
        tri ? [x * 60 - y * 30, (y * 60 * Math.sqrt(3)) / 2] : [x * 60, y * 60],
      );
  const slots = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      if (
        Math.abs(
          Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) -
            60,
        ) < 0.001
      )
        slots.push({ id: `e${i}-${j}`, a: points[i], b: points[j] });
    }
  const polygons = [],
    seen = new Set();
  function side(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const on = (v) =>
      Math.abs(
        Math.hypot(v[0] - a[0], v[1] - a[1]) +
          Math.hypot(v[0] - b[0], v[1] - b[1]) -
          d,
      ) < 0.001;
    const s = slots.filter((e) => on(e.a) && on(e.b));
    return Math.abs(s.length * 60 - d) < 0.001 ? s.map((e) => e.id) : null;
  }
  for (const a of points)
    for (const b of points) {
      if (a === b) continue;
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        v = tri
          ? [
              a,
              b,
              [
                a[0] + dx / 2 - (dy * Math.sqrt(3)) / 2,
                a[1] + dy / 2 + (dx * Math.sqrt(3)) / 2,
              ],
            ]
          : [a, b, [b[0] - dy, b[1] + dx], [a[0] - dy, a[1] + dx]];
      const sides = v.map((a, i) => side(a, v[(i + 1) % v.length]));
      if (sides.some((s) => !s)) continue;
      const poly = [...new Set(sides.flat())].sort();
      if (!seen.has(poly.join(","))) {
        polygons.push(poly);
        seen.add(poly.join(","));
      }
    }
  return {
    kind: "shape",
    shapeName: tri ? "正三角形" : "正方形",
    slots,
    polygons,
    viewBox: tri ? [-105, -15, 360, 190] : [-15, -15, 270, 210],
  };
}
