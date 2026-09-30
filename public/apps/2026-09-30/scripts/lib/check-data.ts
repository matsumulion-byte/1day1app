import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { validateApps } from "../../client/src/layout";
export type DataReport = {
  records: number;
  localImages: number;
  totalImageBytes: number;
  errors: string[];
  warnings: string[];
};
export async function inspectData(
  manifest: string,
  publicRoot: string,
): Promise<DataReport> {
  const report: DataReport = {
    records: 0,
    localImages: 0,
    totalImageBytes: 0,
    errors: [],
    warnings: [],
  };
  let apps;
  try {
    apps = validateApps(JSON.parse(await readFile(manifest, "utf8")));
  } catch (e) {
    report.errors.push(String(e));
    return report;
  }
  report.records = apps.length;
  const checked = new Map<
    string,
    { width: number; height: number; size: number }
  >();
  for (const app of apps) {
    if (!app.image.startsWith("/")) {
      report.warnings.push(`${app.id}: 外部画像は未検証（CORS許可が必要）`);
      continue;
    }
    let file: string;
    try {
      const pathname = decodeURIComponent(
        new URL(app.image, "https://archive.invalid").pathname,
      );
      file = path.resolve(publicRoot, "." + pathname);
      if (!file.startsWith(path.resolve(publicRoot) + path.sep))
        throw Error("公開ルート外の画像パス");
    } catch (e) {
      report.errors.push(`${app.id}: ${e}`);
      continue;
    }
    try {
      let info = checked.get(file);
      if (!info) {
        const metadata = await sharp(file).metadata();
        if (!metadata.width || !metadata.height)
          throw Error("画像の寸法を取得できません");
        const fileStat = await stat(file);
        info = {
          width: metadata.width,
          height: metadata.height,
          size: fileStat.size,
        };
        checked.set(file, info);
        report.localImages++;
        report.totalImageBytes += info.size;
        if (!["webp", "avif", "heif"].includes(metadata.format || ""))
          report.warnings.push(`${app.id}: WebP / AVIFへの変換を推奨`);
        if (Math.max(info.width, info.height) > 1024)
          report.warnings.push(
            `${app.id}: 長辺${Math.max(info.width, info.height)}px。モバイル用に768px以下を推奨`,
          );
        if (info.size > 100 * 1024)
          report.warnings.push(
            `${app.id}: 画像が${Math.round(info.size / 1024)}KB。100KB以下を推奨`,
          );
      }
      const actual = info.width / info.height;
      if (app.aspect === undefined)
        report.warnings.push(
          `${app.id}: aspect未指定。遠景用に ${Number(actual.toFixed(4))} を設定してください`,
        );
      else if (Math.abs(app.aspect - actual) / actual > 0.02)
        report.errors.push(
          `${app.id}: aspect=${app.aspect} と実画像 ${info.width}×${info.height} が不一致（推奨 ${Number(actual.toFixed(4))}）`,
        );
    } catch (e) {
      report.errors.push(
        `${app.id}: 画像を読めません ${app.image} (${e instanceof Error ? e.message : e})`,
      );
    }
  }
  return report;
}
