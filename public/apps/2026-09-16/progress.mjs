// Keep unlocked access when replacing shape puzzles, without marking new puzzles solved.
export function readProgress(raw, total) {
  const legacy = Array.isArray(raw),
    valid = (n) => Number.isInteger(n) && n >= 1 && n <= total;
  const list = legacy ? raw : raw?.cleared;
  const previous = (Array.isArray(list) ? list : []).filter(valid);
  const cleared = legacy ? previous.filter((n) => n % 2 === 1) : previous;
  const inferred = Math.min(total, Math.max(0, ...previous) + 1);
  const unlocked = legacy
    ? inferred
    : Math.max(inferred, valid(raw?.unlocked) ? raw.unlocked : 1);
  return {
    version: 2,
    cleared,
    unlocked,
    updated: legacy && previous.some((n) => n % 2 === 0),
  };
}
