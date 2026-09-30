import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLayout,
  buildEchoes,
  routeX,
  validateApps,
  safeUrl,
} from "./layout";
const apps = Array.from({ length: 365 }, (_, i) => ({
  id: i,
  date: new Date(Date.UTC(2025, 9, 1 + i)).toISOString().slice(0, 10),
  title: `App ${i}`,
  image: "/apps/test.webp",
  url: `/apps/${i}/`,
  aspect: 1.5,
}));
test("365 daily records fit chronological months and preserve walking corridor", () => {
  const ps = buildLayout(validateApps(apps));
  assert.equal(ps.length, 365);
  ps.forEach((p, i) => {
    assert.ok(
      Math.abs(p.position[0] - routeX(-p.position[2])) - p.width / 2 > 3.25,
    );
    if (i) assert.ok(p.position[2] < ps[i - 1].position[2]);
    assert.ok(p.month >= 0 && p.month < 12);
  });
});
test("layout is stable across input ordering and all archive echoes reference real apps", () => {
  assert.deepEqual(
    buildLayout(validateApps(apps)),
    buildLayout(validateApps([...apps].reverse())),
  );
  const echo = buildEchoes(buildLayout(apps));
  assert.ok(echo.length > 2000);
  assert.ok(echo.every((p) => apps.some((a) => a.id === p.app.id)));
});
test("validate rejects duplicate ids, impossible dates and executable URLs", () => {
  assert.throws(() => validateApps([apps[0], apps[0]]));
  assert.throws(() => validateApps([{ ...apps[0], date: "2026-02-30" }]));
  assert.throws(() =>
    validateApps([{ ...apps[0], url: "javascript:alert(1)" }]),
  );
  assert.equal(safeUrl("//evil.example"), false);
  assert.equal(safeUrl("https://example.com"), true);
});
