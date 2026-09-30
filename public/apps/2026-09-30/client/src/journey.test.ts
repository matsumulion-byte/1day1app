import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceTour, entranceDistance, turnToward } from "./journey";
import { MONTH_LENGTH, WORLD_LENGTH, routeX } from "./layout";
test("monthly entrances remain within their chapter", () => {
  for (let i = 0; i < 12; i++) {
    const d = entranceDistance(i);
    assert.equal(Math.floor(d / MONTH_LENGTH), i);
  }
  assert.equal(entranceDistance(-2), 1);
  assert.equal(entranceDistance(100), 11 * MONTH_LENGTH + 1);
});
test("tour follows the curved route, caps time jumps and stops at the end", () => {
  const p = advanceTour(100, 1 / 60);
  assert.equal(p.x, routeX(p.distance));
  assert.ok(p.distance > 100);
  assert.ok(advanceTour(100, 20).distance <= 100.5);
  assert.equal(advanceTour(WORLD_LENGTH - 0.1, 1).distance, WORLD_LENGTH);
  assert.equal(advanceTour(WORLD_LENGTH, 1).ended, true);
});
test("look interpolation takes the shorter turn across the angle boundary", () => {
  const from = Math.PI - 0.01,
    to = -Math.PI + 0.01;
  const angle = turnToward(from, to, 1 / 60);
  assert.ok(angle > from);
  assert.ok(angle - from < 0.02);
});
