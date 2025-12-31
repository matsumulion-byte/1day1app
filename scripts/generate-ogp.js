#!/usr/bin/env node
/*
  OGP/Twitter meta injector for static apps under public/apps/YYYY-MM-DD
  - Reads optional ogp.json in each app dir
  - Falls back to <title> and heuristics for description and image
  - Inserts or replaces a marked OGP block inside <head>
*/
import fs from "fs";
import path from "path";

const candidates = [
  path.join(process.cwd(), ".next/server/pages/index.html"),
  path.join(process.cwd(), ".next/server/app/page.html"),
];

const htmlPath = candidates.find(p => fs.existsSync(p));

if (!htmlPath) {
  console.log("[OGP] index page not found. skip OGP generation.");
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC_APPS_DIR = path.join(ROOT, 'public', 'apps');

function toAbsoluteUrl(maybePath, baseUrl) {
  if (!maybePath) return '';
  if (/^https?:\/\//i.test(maybePath)) return maybePath;
  if (!baseUrl) return maybePath; // leave as path if no baseUrl provided
  return baseUrl.replace(/\/$/, '') + '/' + maybePath.replace(/^\//, '');
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (m) return m[1].trim();
  return '';
}

function extractDescription(html) {
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*>/i);
  if (metaDesc) {
    const c = metaDesc[0].match(/content=["']([\s\S]*?)["']/i);
    if (c) return c[1].trim();
  }
  // fallback: first meaningful text from body (simple heuristic)
  const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const tmp = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return tmp.slice(0, 140);
  }
  return '';
}

function findImage(appDir) {
  // Prefer ogp.(png|jpg|jpeg|webp)
  const candidates = [
    'ogp.png', 'ogp.jpg', 'ogp.jpeg', 'ogp.webp',
  ];
  for (const name of candidates) {
    const p = path.join(appDir, name);
    if (fs.existsSync(p)) return name;
  }
  // Look into assets/* for first image
  const assetsDir = path.join(appDir, 'assets');
  if (fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory()) {
    const files = fs.readdirSync(assetsDir);
    const img = files.find(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f));
    if (img) return path.join('assets', img);
  }
  return '';
}

function buildOgpBlock({ title, description, imageAbsUrl, pageUrl }) {
  const lines = [];
  lines.push('  <!-- OGP AUTO-GENERATED START (do not edit by hand) -->');
  if (title) {
    lines.push(`  <meta property="og:title" content="${title}">`);
    lines.push(`  <meta name="twitter:title" content="${title}">`);
  }
  if (description) {
    lines.push(`  <meta property="og:description" content="${description}">`);
    lines.push(`  <meta name="twitter:description" content="${description}">`);
  }
  if (imageAbsUrl) {
    lines.push(`  <meta property="og:image" content="${imageAbsUrl}">`);
    lines.push(`  <meta name="twitter:image" content="${imageAbsUrl}">`);
  }
  if (pageUrl) {
    lines.push(`  <meta property="og:url" content="${pageUrl}">`);
  }
  lines.push('  <meta property="og:type" content="website">');
  lines.push('  <meta name="twitter:card" content="summary_large_image">');
  lines.push('  <!-- OGP AUTO-GENERATED END -->');
  return lines.join('\n');
}

function injectIntoHead(html, ogpBlock) {
  // Remove existing auto block if any
  html = html.replace(/\n?\s*<!-- OGP AUTO-GENERATED START[\s\S]*?OGP AUTO-GENERATED END -->\s*\n?/i, '\n');
  // Insert after opening <head>
  const headOpen = html.match(/<head[^>]*>/i);
  if (!headOpen) return html; // do nothing
  const idx = html.indexOf(headOpen[0]) + headOpen[0].length;
  return html.slice(0, idx) + '\n' + ogpBlock + '\n' + html.slice(idx);
}

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`WARN: Failed to parse ${filePath}:`, e.message);
    return null;
  }
}

function main() {
  const baseUrl = process.env.SITE_BASE_URL || '';
  if (!fs.existsSync(PUBLIC_APPS_DIR)) {
    console.error(`Not found: ${PUBLIC_APPS_DIR}`);
    process.exit(1);
  }
  const appDirs = fs.readdirSync(PUBLIC_APPS_DIR)
    .map(name => path.join(PUBLIC_APPS_DIR, name))
    .filter(p => fs.statSync(p).isDirectory());

  appDirs.forEach(appDir => {
    const indexHtmlPath = path.join(appDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) return;
    const relAppPath = path.relative(path.join(ROOT, 'public'), appDir).replace(/\\/g, '/');
    const ogpJson = loadJsonIfExists(path.join(appDir, 'ogp.json')) || {};
    let html = fs.readFileSync(indexHtmlPath, 'utf8');

    const title = ogpJson.title || extractTitle(html) || '';
    const description = ogpJson.description || extractDescription(html) || '';
    const imageRel = ogpJson.image || findImage(appDir) || '';
    const imageAbs = imageRel ? toAbsoluteUrl('/' + relAppPath + '/' + imageRel, baseUrl) : '';
    const pageUrl = toAbsoluteUrl('/' + relAppPath + '/index.html', baseUrl);

    const ogpBlock = buildOgpBlock({ title, description, imageAbsUrl: imageAbs, pageUrl });
    const updated = injectIntoHead(html, ogpBlock);
    if (updated !== html) {
      fs.writeFileSync(indexHtmlPath, updated, 'utf8');
      console.log(`Injected OGP: ${indexHtmlPath}`);
    } else {
      console.log(`No changes: ${indexHtmlPath}`);
    }
  });
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('OGP generation failed:', e);
    console.error('Continuing build...');
    process.exit(0); // エラーでもビルドを続行
  }
}


