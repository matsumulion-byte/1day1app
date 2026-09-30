import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { inspectData } from "./check-data";
test("asset check detects missing images and aspect mismatches without mutating data", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "archive-data-"));
  try {
    await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#778877" },
    })
      .webp()
      .toFile(path.join(dir, "good.webp"));
    const apps = [
      {
        id: 1,
        date: "2025-10-01",
        title: "Good",
        image: "/good.webp",
        url: "/app/",
        aspect: 1.5,
      },
    ];
    const manifest = path.join(dir, "apps.json");
    await writeFile(manifest, JSON.stringify(apps));
    assert.equal((await inspectData(manifest, dir)).errors.length, 0);
    apps[0].aspect = 2;
    await writeFile(manifest, JSON.stringify(apps));
    assert.match((await inspectData(manifest, dir)).errors[0], /不一致/);
    apps[0].image = "/missing.webp";
    await writeFile(manifest, JSON.stringify(apps));
    assert.match(
      (await inspectData(manifest, dir)).errors[0],
      /画像を読めません/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
