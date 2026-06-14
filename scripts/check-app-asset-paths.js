const fs = require("fs");
const path = require("path");

const appsDir = path.join(__dirname, "..", "public", "apps");
const appNamePattern = /^\d{4}-\d{2}-\d{2}$/;
const badRefs = [];

function readIndex(appName) {
  const indexPath = path.join(appsDir, appName, "index.html");
  if (!fs.existsSync(indexPath)) return null;
  return fs.readFileSync(indexPath, "utf8");
}

for (const appName of fs.readdirSync(appsDir)) {
  if (!appNamePattern.test(appName)) continue;

  const html = readIndex(appName);
  if (!html) continue;

  const expectedPrefix = `/apps/${appName}/`;
  const refPattern = /<(?:link|script)\b[^>]+(?:href|src)=["']([^"']+)["']/g;
  let match;

  while ((match = refPattern.exec(html))) {
    const ref = match[1];
    const isLocalAsset = /(?:^|\/)(?:styles?|style|main|app|script)\.(?:css|js)(?:\?|$)/.test(ref);
    if (isLocalAsset && !ref.startsWith(expectedPrefix)) {
      badRefs.push(`${appName}: ${ref} should start with ${expectedPrefix}`);
    }
  }
}

if (badRefs.length) {
  console.error("Invalid app asset paths:");
  for (const ref of badRefs) console.error(`- ${ref}`);
  process.exit(1);
}

console.log("App asset paths OK");
