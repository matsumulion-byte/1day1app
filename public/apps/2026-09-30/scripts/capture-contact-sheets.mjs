import sharp from "sharp";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const data = JSON.parse(await readFile("capture-report.json", "utf8"));
await mkdir("test-results/captures", { recursive: true });
for (const month of [...new Set(data.results.map((r) => r.date.slice(0, 7)))]) {
  const rows = data.results.filter(
    (r) => r.date.startsWith(month) && r.status === "captured",
  );
  const tiles = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i],
      x = (i % 6) * 240,
      y = Math.floor(i / 6) * 180;
    const image = await sharp("." + r.image.replace("/apps/2026-09-30", ""))
      .resize(230, 153)
      .toBuffer();
    tiles.push({ input: image, left: x + 5, top: y + 22 });
    const label = Buffer.from(
      `<svg width="240" height="20"><text x="6" y="15" font-size="12" font-family="sans-serif" fill="#263d30">${r.date}</text></svg>`,
    );
    tiles.push({ input: label, left: x, top: y });
  }
  if (rows.length)
    await sharp({
      create: {
        width: 1440,
        height: Math.ceil(rows.length / 6) * 180,
        channels: 3,
        background: "#e7e9df",
      },
    })
      .composite(tiles)
      .png()
      .toFile(`test-results/captures/${month}.png`);
}
