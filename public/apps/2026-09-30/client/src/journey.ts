import { MONTH_LENGTH, WORLD_LENGTH, routeX } from "./layout";
export type Destination = { nonce: number } & (
  { id: string | number } | { month: number } | { finale: true }
);
export function entranceDistance(month: number) {
  return Math.max(0, Math.min(11, Math.floor(month))) * MONTH_LENGTH + 1;
}
export function advanceTour(distance: number, delta: number) {
  const next = Math.min(
    WORLD_LENGTH,
    distance + Math.min(Math.max(delta, 0), 0.05) * 10,
  );
  return {
    distance: next,
    x: routeX(next),
    yaw: Math.atan2(-(routeX(next + 12) - routeX(next)), 12),
    ended: next >= WORLD_LENGTH,
  };
}
export function turnToward(from: number, to: number, delta: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * (1 - Math.exp(-Math.max(0, delta) * 3));
}
