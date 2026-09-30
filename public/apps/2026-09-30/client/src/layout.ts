export type AppRecord = {
  id: string | number;
  date: string;
  title: string;
  image: string;
  url: string;
  featured?: boolean;
  aspect?: number;
  color?: string;
  demo?: boolean;
};
export type Placement = {
  app: AppRecord;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  month: number;
  primary: boolean;
};
export const START = "2025-10-01";
export const MONTH_LENGTH = 80;
export const WORLD_LENGTH = 12 * MONTH_LENGTH;
export const routeX = (distance: number) => Math.sin(distance / 48) * 6;
export function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value, "https://local.invalid");
    return (
      /^https?:$/.test(u.protocol) &&
      !value.startsWith("//") &&
      (value.startsWith("/") || /^https?:\/\//.test(value))
    );
  } catch {
    return false;
  }
}
export function validateApps(data: unknown): AppRecord[] {
  if (!Array.isArray(data) || !data.length)
    throw new Error("アプリデータが空です。apps.json を確認してください。");
  const ids = new Set<string>();
  for (const a of data) {
    if (
      !a ||
      !["string", "number"].includes(typeof a.id) ||
      ids.has(String(a.id)) ||
      (typeof a.id === "string" && !a.id.trim()) ||
      (typeof a.id === "number" && !Number.isFinite(a.id)) ||
      (a.featured !== undefined && typeof a.featured !== "boolean") ||
      (a.demo !== undefined && typeof a.demo !== "boolean") ||
      typeof a.title !== "string" ||
      !a.title.trim() ||
      typeof a.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
      Number.isNaN(Date.parse(a.date)) ||
      new Date(a.date).toISOString().slice(0, 10) !== a.date ||
      a.date < START ||
      a.date > "2026-09-30" ||
      typeof a.image !== "string" ||
      !safeUrl(a.image) ||
      typeof a.url !== "string" ||
      !safeUrl(a.url) ||
      (a.aspect !== undefined &&
        (!Number.isFinite(a.aspect) || a.aspect < 0.15 || a.aspect > 6)) ||
      (a.color !== undefined && !/^#[0-9a-f]{6}$/i.test(a.color))
    )
      throw new Error("apps.json の日付・ID・画像・URLを確認してください。");
    ids.add(String(a.id));
  }
  return [...data].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)),
  );
}
export function monthOf(date: string) {
  const d = new Date(date + "T00:00:00Z");
  return (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth() - 9;
}
export function buildLayout(apps: AppRecord[]): Placement[] {
  return apps.map((a) => {
    const m = monthOf(a.date);
    const seed = hash(String(a.id));
    const day = Number(a.date.slice(-2));
    const distance =
      m * MONTH_LENGTH + 7 + ((day - 1) / 31) * (MONTH_LENGTH - 12);
    const side = day % 2 ? 1 : -1;
    const intensity = m / 11;
    return {
      app: a,
      month: m,
      primary: true,
      position: [
        routeX(distance) + side * (7 + seed * 5),
        2.8 + intensity * seed * 4,
        -distance,
      ],
      rotation: [
        0,
        -side * (1.05 + seed * 0.22),
        (seed - 0.5) * intensity * 0.3,
      ],
      width: (a.featured ? 8 : 4.6) + intensity * 2,
    };
  });
}
export function buildEchoes(primary: Placement[]): Placement[] {
  const result: Placement[] = [];
  primary.forEach((p, index) => {
    const n = 5 + Math.floor(p.month * 0.85);
    for (let j = 0; j < n; j++) {
      const r = hash(`${p.app.id}:${j}`);
      const distance = -p.position[2] + (r - 0.5) * 28;
      const side = j % 2 ? 1 : -1;
      result.push({
        ...p,
        primary: false,
        position: [
          routeX(distance) + side * (19 + r * 22),
          1.8 + (j % 4) * (2.6 + p.month * 0.35),
          -distance,
        ],
        rotation: [
          (r - 0.5) * 0.12,
          -side * (0.15 + r * 0.65),
          (r - 0.5) * p.month * 0.055,
        ],
        width: 3.4 + r * 6,
      });
    }
  });
  primary
    .filter((p) => p.month >= 8)
    .forEach((p) => {
      const d = -p.position[2];
      result.push({
        ...p,
        primary: false,
        position: [routeX(d) + 2, 0.075, -d],
        rotation: [-Math.PI / 2, 0, 0.12],
        width: 3.2,
      });
      result.push({
        ...p,
        primary: false,
        position: [routeX(d) - 2, 13, -d - 3],
        rotation: [Math.PI / 2, 0.1, 0.25],
        width: 8,
      });
    });
  // The end is a ring made from the actual archive; no invented records.
  for (let j = 0; j < 72; j++) {
    const p = primary[Math.floor((j / 72) * primary.length)];
    const angle = (j / 24) * Math.PI * 2;
    result.push({
      ...p,
      primary: false,
      position: [
        routeX(WORLD_LENGTH) + Math.cos(angle) * 19,
        3 + Math.floor(j / 24) * 6,
        -WORLD_LENGTH + Math.sin(angle) * 15,
      ],
      rotation: [0, -angle - Math.PI / 2, (hash(String(j)) - 0.5) * 0.24],
      width: 7,
    });
  }
  return result;
}
