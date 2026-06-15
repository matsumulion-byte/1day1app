const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const date = process.argv[2];
const productionUrl = process.argv.includes("--production")
  ? `https://1day1app.vercel.app/${date}`
  : null;

function fail(message) {
  console.error(`check-day-app: ${message}`);
  process.exitCode = 1;
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function head(url) {
  const result = spawnSync("curl", ["-fsSI", url], {
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.status !== 0) {
    return 0;
  }

  const statusLine = result.stdout
    .split(/\r?\n/)
    .find((line) => line.toLowerCase().startsWith("http/"));
  return Number(statusLine?.split(/\s+/)[1] || 0);
}

async function main() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    fail("usage: npm run check:app -- YYYY-MM-DD [--production]");
    return;
  }

  const root = process.cwd();
  const packagePath = path.join(root, "package.json");
  const packageJson = exists(packagePath)
    ? JSON.parse(fs.readFileSync(packagePath, "utf8"))
    : null;

  if (packageJson?.name !== "1day1app") {
    fail(`run this from /Users/matsumurahironori/1day1app, got ${root}`);
  }

  const appDir = path.join(root, "public", "apps", date);
  const indexPath = path.join(appDir, "index.html");

  if (!exists(indexPath)) {
    fail(`missing ${path.relative(root, indexPath)}`);
    return;
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const expectedPrefix = `/apps/${date}/`;

  if (html.includes('href="./') || html.includes('src="./')) {
    fail("index.html contains relative ./ asset paths");
  }

  const assetRefs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((ref) => !ref.startsWith("http") && !ref.startsWith("#"));

  for (const ref of assetRefs) {
    if (!ref.startsWith(expectedPrefix)) {
      fail(`asset path must start with ${expectedPrefix}: ${ref}`);
      continue;
    }

    const localPath = path.join(root, "public", ref.replace(/^\//, ""));
    if (!exists(localPath)) {
      fail(`asset does not exist: ${ref}`);
    }
  }

  const requiredFiles = ["index.html", "styles.css", "script.js"];
  for (const file of requiredFiles) {
    const filePath = path.join(appDir, file);
    if (!exists(filePath)) {
      fail(`missing ${path.relative(root, filePath)}`);
    }
  }

  if (productionUrl) {
    const urls = [productionUrl, ...assetRefs.map((ref) => `https://1day1app.vercel.app${ref}`)];
    for (const url of urls) {
      const status = head(url);
      if (status !== 200) {
        fail(`production URL returned ${status || "no response"}: ${url}`);
      }
    }
  }

  if (!process.exitCode) {
    console.log(`check-day-app: ${date} ok`);
  }
}

main();
