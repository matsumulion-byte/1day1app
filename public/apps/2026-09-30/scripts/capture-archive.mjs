import { chromium } from "@playwright/test";
import sharp from "sharp";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("."),
  sourceRoot = path.resolve("..");
const days = (await readdir(sourceRoot))
  .filter(
    (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= "2025-10-01" && s < "2026-09-30",
  )
  .sort();
await mkdir("screenshots/archive", { recursive: true });
let report = {
  capturedAt: new Date().toISOString(),
  viewport: { width: 1440, height: 960 },
  source: "https://1day1app.vercel.app",
  results: [],
};
try {
  report = JSON.parse(await readFile("capture-report.json", "utf8"));
} catch {}
const finished = new Map(report.results.map((r) => [r.date, r]));
const todo = days.filter(
  (d) =>
    !finished.has(d) ||
    (process.argv.includes("--retry") && finished.get(d).status !== "captured"),
);
let cursor = 0,
  saveChain = Promise.resolve();
const within = (promise, ms) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(Error(`処理時間上限 ${ms / 1000}秒`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
};
async function save() {
  saveChain = saveChain.then(async () => {
    report.results = [...finished.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    await writeFile(
      "capture-report.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    const apps = report.results
      .filter((r) => r.status === "captured")
      .map((r) => ({
        id: r.date,
        date: r.date,
        title: r.title || r.date,
        image: r.image,
        url: r.url,
        featured: false,
        aspect: 1.5,
      }));
    await writeFile("apps.captured.json", JSON.stringify(apps, null, 2) + "\n");
  });
  return saveChain;
}
async function worker() {
  let server,
    browser,
    used = 0;
  async function close() {
    if (server) await within(server.kill(), 5000).catch(() => {});
    server = null;
    browser = null;
    used = 0;
  }
  while (cursor < todo.length) {
    const date = todo[cursor++],
      url = `${report.source}/${date}`;
    const result = {
      date,
      url,
      status: "failed",
      title: "",
      image: `/apps/2026-09-30/screenshots/archive/${date}.webp`,
      warnings: [],
      captureMode: "initial",
    };
    let context;
    try {
      if (!browser || used >= 12) {
        await close();
        server = await chromium.launchServer({
          channel: "chrome",
          headless: true,
          args: ["--mute-audio"],
        });
        browser = await chromium.connect(server.wsEndpoint());
      }
      used++;
      await within(
        (async () => {
          context = await browser.newContext({
            viewport: report.viewport,
            deviceScaleFactor: 1,
            locale: "ja-JP",
            timezoneId: "Asia/Tokyo",
            colorScheme: "light",
            acceptDownloads: false,
          });
          const page = await context.newPage();
          page.setDefaultTimeout(10000);
          page.on("pageerror", (e) => {
            if (result.warnings.length < 6)
              result.warnings.push(e.message.slice(0, 250));
          });
          page.on("dialog", (d) => d.dismiss());
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          result.httpStatus = response?.status();
          result.finalUrl = page.url();
          if (!response || response.status() >= 400)
            throw Error(`HTTP ${response?.status()}`);
          await page
            .waitForLoadState("load", { timeout: 5000 })
            .catch(() => {});
          await page.evaluate(() =>
            Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 1500)),
            ]),
          );
          await page.waitForTimeout(1600);
          result.title = (await page.title()).trim();
          const info = await page.evaluate(() => ({
            text: document.body?.innerText?.trim().slice(0, 1200) || "",
            visuals: document.querySelectorAll("canvas,svg,img,video").length,
          }));
          result.previewText = info.text.slice(0, 350);
          if (!info.text && !info.visuals) throw Error("ページが空です");
          if (
            /404|not found|application error|security checkpoint/i.test(
              result.title,
            )
          )
            throw Error("エラーページの可能性: " + result.title);
          const png = await page.screenshot({
            type: "png",
            fullPage: false,
            timeout: 10000,
          });
          const file = path.join(root, "screenshots/archive", date + ".webp");
          await sharp(png).resize(768, 512).webp({ quality: 80 }).toFile(file);
          const stats = await sharp(png).stats();
          result.visualDeviation = Math.max(
            ...stats.channels.map((c) => c.stdev),
          );
          if (result.visualDeviation < 8)
            result.warnings.push("画面の色変化が小さいため要確認");
          result.bytes = (await stat(file)).size;
          result.capturedAt = new Date().toISOString();
          result.status = "captured";
        })(),
        40000,
      );
    } catch (e) {
      result.error = e.message;
      await close();
    } finally {
      if (context)
        await within(context.close(), 3000).catch(async () => close());
    }
    finished.set(date, result);
    await save();
    console.log(
      `${finished.size}/${days.length} ${date} ${result.status} ${result.title.slice(0, 45)} ${result.error || ""}`,
    );
  }
  await close();
}
await Promise.all(Array.from({ length: 3 }, () => worker()));
await save();
console.log(
  `DONE captured=${report.results.filter((r) => r.status === "captured").length} failed=${report.results.filter((r) => r.status !== "captured").length}`,
);
