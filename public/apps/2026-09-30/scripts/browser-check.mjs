import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const apps = JSON.parse(await readFile("apps.json", "utf8"));
const target = apps.find(a=>a.date==="2026-08-12") || apps[0];
const last = apps[apps.length-1];
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const result = [];
await mkdir("test-results", { recursive: true });
for (const mobile of [false, true]) {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    if (r.url().endsWith(".webp")) requests.push(r.url());
  });
  await page.goto("http://127.0.0.1:8300/apps/2026-09-30/");
  await page
    .getByRole("button", { name: "ENTER THE WORLD" })
    .waitFor({ timeout: 45000 });
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: `test-results/${mobile ? "mobile" : "desktop"}-cover.png`,
  });
  await page.getByRole("button", { name: "ENTER THE WORLD" }).click();
  await page.getByRole("button", { name: "歩き始める" }).click();
  await page.waitForTimeout(400);
  if (mobile) {
    const stick = page.getByRole("group", { name: "移動スティック" });
    const b = await stick.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 20);
    await page.mouse.down();
    await page.waitForTimeout(1600);
    await page.mouse.up();
    await stick.dblclick();
    assert.equal(await page.evaluate(() => visualViewport.scale), 1);
    assert.equal(await page.evaluate(() => scrollY), 0);
  } else {
    await page.keyboard.down("w");
    await page.waitForTimeout(1600);
    await page.keyboard.up("w");
  }
  await page.screenshot({
    path: `test-results/${mobile ? "mobile" : "desktop"}-world.png`,
  });
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  assert.equal(await page.locator(".app-card").count(), apps.length);
  await page
    .getByRole("textbox", { name: "タイトル・日付で検索" })
    .fill(target.date);
  assert.equal(await page.locator(".app-card").count(), 1);
  await page.getByRole("button", { name: "ここへ移動" }).click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator(".location strong").textContent(), "2026.08");
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  await page.getByRole("textbox", { name: "タイトル・日付で検索" }).fill("");
  await page.getByLabel("月別表示").selectOption("11");
  assert.equal(await page.locator(".app-card").count(), apps.filter(a=>a.date.startsWith("2026-09")).length);
  await page
    .locator(".app-card")
    .filter({ has: page.getByRole("heading", { name: last.title, exact:true }) })
    .locator(".card-image")
    .click();
  await page.getByRole("link", { name: "このアプリを開く" }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "このアプリを開く" })
      .getAttribute("href"),
    last.url,
  );
  await page.getByRole("button", { name: "3D世界内の場所へ移動" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `test-results/${mobile ? "mobile" : "desktop"}-finale.png`,
  });
  await page
    .locator("canvas")
    .click({ position: { x: mobile ? 195 : 720, y: mobile ? 422 : 480 } });
  await page.getByRole("link", { name: "このアプリを開く" }).waitFor();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  assert.deepEqual(errors, []);
  result.push({ mobile, errors, imageRequests: new Set(requests).size });
  await context.close();
}
await writeFile("test-results/browser.json", JSON.stringify(result, null, 2));
console.log(result);
await browser.close();
