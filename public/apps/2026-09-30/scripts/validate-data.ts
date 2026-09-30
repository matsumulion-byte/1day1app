import path from "node:path";
import { inspectData } from "./lib/check-data";
const manifest = path.resolve(process.argv[2] || "apps.json");
const report = await inspectData(manifest, path.resolve("../.."));
console.log(
  `データ: ${report.records}件 / ローカル画像: ${report.localImages}枚 / 合計: ${Math.round(report.totalImageBytes / 1024)}KB`,
);
for (const warning of report.warnings) console.warn(`注意: ${warning}`);
for (const error of report.errors) console.error(`エラー: ${error}`);
if (report.errors.length) process.exitCode = 1;
else console.log("アプリデータ・画像チェック OK");
