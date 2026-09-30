import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
const images = new Set();
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes(".webp")) images.add(r.url());
});
const apps = Array.from({ length: 365 }, (_, i) => ({
  id: i,
  date: new Date(Date.UTC(2025, 9, 1 + i)).toISOString().slice(0, 10),
  title: `Stress app ${i}`,
  image: `/apps/2026-09-30/screenshots/sample-${(i % 18) + 1}.webp?record=${i}`,
  url: "/apps/2026-09-30/sample.html",
  aspect: 1.5,
  featured: i % 50 === 0,
}));
await page.route("**/apps.json", (r) => r.fulfill({ json: apps }));
await page.goto("http://127.0.0.1:8300/apps/2026-09-30/");
await page.getByRole("button", { name: "ENTER THE WORLD" }).waitFor();
await page.waitForTimeout(1500);
const initialRequests = images.size;
assert.ok(initialRequests < 32, `Initial textures: ${initialRequests}`);
await page.getByRole("button", { name: "ENTER THE WORLD" }).click();
await page.getByRole("button", { name: "歩き始める" }).click();
const session = await context.newCDPSession(page);
const b = await page.locator(".joystick").boundingBox();
const x = b.x + b.width / 2,
  y = b.y + 16;
await session.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x, y }],
});
await page.waitForTimeout(700);
await session.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
for (let i = 0; i < 2; i++) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}
assert.equal(await page.evaluate(() => visualViewport.scale), 1);
assert.equal(await page.evaluate(() => scrollY), 0);
await session.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: 315, y: 420 }],
});
await session.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x: 245, y: 440 }],
});
await session.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
for (const i of [364, 120, 240, 0, 364]) {
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  await page
    .getByRole("textbox", { name: "タイトル・日付で検索" })
    .fill(`Stress app ${i}`);
  await page
    .locator(".app-card")
    .filter({
      has: page.getByRole("heading", { name: `Stress app ${i}`, exact: true }),
    })
    .getByRole("button", { name: "ここへ移動" })
    .click();
  await page.waitForTimeout(1800);
}
await page.screenshot({ path: "test-results/mobile-365.png" });
assert.deepEqual(errors, []);
const report = {
  records: apps.length,
  initialTextureRequests: initialRequests,
  errors,
  touchHoldAndDoubleTap: "passed",
  teleports: 5,
};
console.log(report);
await writeFile("test-results/stress.json", JSON.stringify(report, null, 2));
await browser.close();
