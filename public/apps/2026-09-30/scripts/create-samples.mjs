import sharp from "sharp";
import { writeFile } from "node:fs/promises";
const titles = [
  "余白の時計",
  "雨音の標本室",
  "ことばの庭",
  "夜の散歩地図",
  "冬の色を集める",
  "小さな習慣帳",
  "星をつなぐ",
  "お茶の時間",
  "春の音風景",
  "気分のパレット",
  "雲の観察ノート",
  "一行日記",
  "波を描く",
  "光のカケラ",
  "夏の記憶装置",
  "月を待つ",
  "今日を編む",
  "世界のつづき",
];
const en = [
  "QUIET HOURS",
  "RAIN ARCHIVE",
  "WORD GARDEN",
  "NIGHT WALK",
  "WINTER COLORS",
  "LITTLE RITUALS",
  "CONSTELLATION",
  "TEA TIME",
  "SOUND OF SPRING",
  "MOOD PALETTE",
  "CLOUD STUDIES",
  "ONE LINE A DAY",
  "TIDAL STUDY",
  "FRAGMENTS OF LIGHT",
  "SUMMER MEMORY",
  "MOON JOURNAL",
  "WEAVE TODAY",
  "ANOTHER WORLD",
];
const dates = [
  "2025-10-01",
  "2025-10-18",
  "2025-11-08",
  "2025-11-24",
  "2025-12-15",
  "2026-01-05",
  "2026-01-28",
  "2026-02-14",
  "2026-03-21",
  "2026-04-06",
  "2026-04-25",
  "2026-05-11",
  "2026-06-08",
  "2026-06-23",
  "2026-07-19",
  "2026-08-12",
  "2026-09-10",
  "2026-09-30",
];
const colors = [
  "#91bcb1",
  "#869baf",
  "#ccbc74",
  "#728b86",
  "#b4b8b2",
  "#cc9476",
  "#8c9d9e",
  "#b3b888",
  "#d8b093",
  "#99b9a8",
  "#95bfc8",
  "#d8c7a1",
  "#87aba8",
  "#d8af71",
  "#93b094",
  "#acaaa1",
  "#ba9979",
  "#da8358",
];
const records = [];
for (let i = 0; i < titles.length; i++) {
  const color = colors[i],
    dark = i % 4 === 3,
    bg = dark ? "#233d38" : "#f2f0e5",
    fg = dark ? "#e4eadb" : "#2d4840";
  let art = "";
  if (i % 4 === 0)
    art = `<circle cx="480" cy="288" r="145" fill="none" stroke="${color}" stroke-width="2"/><circle cx="480" cy="288" r="126" fill="none" stroke="${color}" stroke-width="28" stroke-dasharray="1 13"/><path d="M480 190V288L552 322" fill="none" stroke="${fg}" stroke-width="4"/><circle cx="480" cy="288" r="7" fill="${color}"/>`;
  if (i % 4 === 1)
    art = Array.from(
      { length: 18 },
      (_, j) =>
        `<path d="M${160 + j * 37} ${180 + (j % 4) * 22}q-30 95 0 170" stroke="${color}" stroke-width="${2 + (j % 4)}" fill="none"/>`,
    ).join("");
  if (i % 4 === 2)
    art = Array.from(
      { length: 7 },
      (_, j) =>
        `<rect x="${185 + j * 88}" y="${190 + (j % 3) * 35}" width="65" height="${170 - (j % 3) * 35}" rx="32" fill="${color}" opacity="${0.4 + j * 0.08}"/>`,
    ).join("");
  if (i % 4 === 3)
    art = `<circle cx="480" cy="270" r="114" fill="${color}"/><circle cx="520" cy="239" r="105" fill="${bg}"/><path d="M190 396Q380 270 570 402T840 382" fill="none" stroke="${color}"/><circle cx="230" cy="180" r="3" fill="${color}"/><circle cx="730" cy="225" r="3" fill="${color}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="${bg}"/><text x="48" y="51" fill="${fg}" font-family="sans-serif" font-size="14" letter-spacing="3">${en[i]}</text><text x="820" y="51" fill="${fg}" font-family="sans-serif" font-size="12">${String(i + 1).padStart(2, "0")} / 365</text><path d="M48 74H912" stroke="${color}" opacity=".4"/>${art}<text x="480" y="480" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="30" letter-spacing="6">${en[i]}</text><rect x="390" y="520" width="180" height="39" rx="20" fill="${color}"/><text x="480" y="545" text-anchor="middle" fill="${bg}" font-family="sans-serif" font-size="11" letter-spacing="3">EXPLORE</text><text x="48" y="604" fill="${fg}" font-family="sans-serif" font-size="10" letter-spacing="2">DAILY EXPERIMENT / SAMPLE</text><text x="814" y="604" fill="${fg}" font-family="sans-serif" font-size="10">${dates[i]}</text></svg>`;
  await sharp(Buffer.from(svg))
    .resize(768)
    .webp({ quality: 78 })
    .toFile(`screenshots/sample-${i + 1}.webp`);
  records.push({
    id: i + 1,
    date: dates[i],
    title: titles[i],
    image: `/apps/2026-09-30/screenshots/sample-${i + 1}.webp`,
    url: `/apps/2026-09-30/sample.html?id=${i + 1}`,
    featured: [0, 6, 12, 17].includes(i),
    aspect: 1.5,
    color,
    demo: true,
  });
}
await writeFile("apps.sample.json", JSON.stringify(records, null, 2) + "\n");
