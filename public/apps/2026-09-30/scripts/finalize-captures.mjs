import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
const report = JSON.parse(await readFile("capture-report.json", "utf8"));
for (const r of report.results) {
  if (r.status !== "captured") continue;
  r.captureMode = "initial";
  const dir = path.resolve("..", r.date);
  let source = "";
  for (const f of await readdir(dir)) {
    if (/\.(html|js)$/.test(f)) {
      try {
        source += await readFile(path.join(dir, f), "utf8");
      } catch {}
    }
  }
  const note =
    "カメラ／マイクを使うアプリ：入力を許可せず初期画面を撮影しています";
  if (source.includes("getUserMedia") && !r.warnings.includes(note))
    r.warnings.push(note);
  if (r.visualDeviation < 8 && !r.warnings.some((s) => s.includes("色変化")))
    r.warnings.push("画面の色変化が小さいため要確認");
  if (r.date === "2025-12-27")
    r.warnings.push("初期画面では背景と操作案内のみ表示されています");
}
report.completedAt = new Date().toISOString();
report.summary = {
  captured: report.results.filter((r) => r.status === "captured").length,
  failed: report.results.filter((r) => r.status !== "captured").length,
  withNotes: report.results.filter((r) => r.warnings.length > 0).length,
  totalBytes: report.results.reduce((s, r) => s + (r.bytes || 0), 0),
};
await writeFile("capture-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(report.summary);
