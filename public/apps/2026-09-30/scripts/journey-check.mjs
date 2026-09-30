import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const reports = [];
for (const mobile of [false, true]) {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8300/apps/2026-09-30/");
  await page.getByRole("button", { name: "ENTER THE WORLD" }).click();
  await page.getByRole("button", { name: "歩き始める" }).click();
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  await page.screenshot({
    path: `test-results/${mobile ? "mobile" : "desktop"}-chapters.png`,
  });
  await page
    .getByRole("button", { name: "2026.05の入口へ移動", exact: true })
    .click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".location strong").textContent(), "2026.05");
  await page.getByRole("button", { name: "自動で散策" }).click();
  assert.equal(
    await page.locator(".tour-button").getAttribute("aria-pressed"),
    "true",
  );
  await page.waitForTimeout(800);
  if (mobile) {
    const session = await context.newCDPSession(page);
    const rect = await page.locator(".joystick").boundingBox();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: rect.x + 55, y: rect.y + 20 }],
    });
    await page.waitForTimeout(200);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.keyboard.press("w");
  }
  assert.equal(
    await page.locator(".tour-button").getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "自動で散策" }).click();
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  await page.getByRole("button", { name: "一覧を閉じる" }).click();
  assert.equal(
    await page.locator(".tour-button").getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "全アプリ一覧を開く" }).click();
  await page
    .getByRole("button", { name: "最終エリアへ", exact: false })
    .click();
  await page.getByRole("region", { name: "最終エリア" }).waitFor();
  await page.getByRole("button", { name: "自動で散策" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".tour-button")?.getAttribute("aria-pressed") ===
      "false",
  );
  await page.screenshot({
    path: `test-results/${mobile ? "mobile" : "desktop"}-ending.png`,
  });
  await page.getByRole("button", { name: "日々を振り返る" }).click();
  await page
    .getByRole("button", { name: "最終エリアへ", exact: false })
    .click();
  await page.getByRole("region", { name: "最終エリア" }).waitFor();
  await page.getByRole("button", { name: "はじまりへ戻る" }).click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator(".location strong").textContent(), "2025.10");
  assert.equal(await page.locator(".journey-end").count(), 0);
  assert.deepEqual(errors, []);
  reports.push({
    mobile,
    chapterJump: "passed",
    tourManualStop: "passed",
    tourMenuStop: "passed",
    tourEndStop: "passed",
    endingReentry: "passed",
    errors,
  });
  await context.close();
}
// Missing app data should expose retry rather than hang on BUILDING forever.
const page = await browser.newPage();
await page.route("**/apps.json", (r) =>
  r.fulfill({ status: 500, body: "unavailable" }),
);
await page.goto("http://127.0.0.1:8300/apps/2026-09-30/");
assert.equal(
  await page.getByRole("button", { name: "読み込みをやり直す" }).isEnabled(),
  true,
);
await page.close();
await writeFile("test-results/journey.json", JSON.stringify(reports, null, 2));
console.log(reports);
await browser.close();
