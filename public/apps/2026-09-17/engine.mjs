export const STATIONS = [
  { name: '中央未来', en: 'CHUO MIRAI', position: 400 },
  { name: 'ニュータウン北', en: 'NEW TOWN NORTH', position: 890 },
  { name: '第七码頭', en: 'PIER SEVEN', position: 1420 },
];
export const MAX_SPEED = 22.22;
export function evaluateStop(error, overrun = false) {
  const d = Math.abs(error);
  const rating = overrun ? 'OVERRUN' : d <= .5 ? 'PERFECT' : d <= 2 ? 'GOOD' : d <= 5 ? 'OK' : 'OVER';
  const points = overrun ? 0 : d <= .5 ? 1000 : d <= 2 ? Math.round(950 - (d - .5) * 100) : d <= 5 ? Math.round(800 - (d - 2) * 100) : Math.max(0, Math.round(500 - (d - 5) * 25));
  return { error, rating, points };
}
export class Monorail {
  constructor() { this.reset(); }
  reset() { this.position = 0; this.speed = 0; this.acceleration = 0; this.station = 0; this.phase = 'title'; this.results = []; this.hold = 0; this.dwell = 0; this.brake = 0; this.mode = 'STANDBY'; }
  start() { this.reset(); this.phase = 'running'; this.speed = 4; }
  get distance() { return STATIONS[Math.min(this.station, 2)].position - this.position; }
  finishStop(overrun) {
    this.results.push({ ...evaluateStop(-this.distance, overrun), station: this.station });
    this.phase = 'dwell'; this.dwell = 4; this.speed = 0; this.acceleration = 0; this.hold = 0; this.brake = 0; this.mode = 'STOPPED';
  }
  update(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Bound each physics step; callers substep long frames.
    dt = Math.min(dt, .05);
    if (this.phase === 'dwell') {
      this.dwell -= dt;
      if (this.dwell <= 0) {
        if (this.station === 2) { this.phase = 'complete'; return; }
        this.station++; this.phase = 'running'; this.speed = 4; this.acceleration = 0; this.mode = 'DEPARTURE';
      }
      return;
    }
    if (this.phase !== 'running') return;
    const emergency = !!input.emergency;
    const braking = emergency || !!input.brake;
    const target = emergency ? -4 : braking ? -1.5 : input.accelerate ? 1.05 : -.035;
    this.acceleration += (target - this.acceleration) * (1 - Math.exp(-dt * (emergency ? 10 : 3)));
    const previousSpeed = this.speed;
    this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed + this.acceleration * dt));
    this.position += (previousSpeed + this.speed) * .5 * dt;
    this.brake = braking ? Math.min(1, Math.max(0, -this.acceleration) / (emergency ? 4 : 1.5)) : 0;
    this.mode = emergency ? 'EMERGENCY' : braking ? 'BRAKING' : input.accelerate ? 'POWER' : 'COAST';
    if (this.distance < -18) { this.finishStop(true); return; }
    if (Math.abs(this.distance) <= 65 && this.speed < .08) {
      this.hold += dt;
      if (this.hold >= .7) this.finishStop(false);
    } else { this.hold = 0; }
  }
}
