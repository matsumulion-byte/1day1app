const logoStage = document.getElementById("logoStage");
const taglineEl = document.getElementById("tagline");
const nameInput = document.getElementById("nameInput");
const energyInput = document.getElementById("energyInput");
const spaceInput = document.getElementById("spaceInput");
const shuffleBtn = document.getElementById("shuffleBtn");
const downloadBtn = document.getElementById("downloadBtn");
const modeButtons = Array.from(document.querySelectorAll(".mode"));

let mode = "studio";
let salt = 650;
let currentSvg = "";

const palettes = {
  studio: [
    ["#f7f2e8", "#151515", "#ff5a3d", "#0b8793"],
    ["#f3efe1", "#20252c", "#d7ff55", "#3867ff"],
    ["#f8f5ef", "#102027", "#ffb000", "#ef476f"],
  ],
  pop: [
    ["#fff8d6", "#25172d", "#ff4fa3", "#31d6ff"],
    ["#f4fff3", "#1d2733", "#73ff87", "#ff7b54"],
    ["#fff2f8", "#201b2c", "#ffe45e", "#6b5cff"],
  ],
  wa: [
    ["#f8f1df", "#22201c", "#b92525", "#245b45"],
    ["#fff9ed", "#1f2520", "#d8a31a", "#375d8a"],
    ["#f3ead9", "#251a17", "#8f1d2c", "#c9b36a"],
  ],
  mono: [
    ["#f6f6f2", "#111111", "#555555", "#d7d7d0"],
    ["#efefea", "#181a1d", "#2e2e32", "#c8c8c0"],
    ["#fbfbf7", "#0d1117", "#3d4651", "#b8bec6"],
  ],
};

const descriptors = {
  studio: ["余白で勝つ", "展示会に置ける", "朝から強い", "説明しすぎない"],
  pop: ["妙に覚えてしまう", "ステッカー向き", "声が大きい", "元気が余る"],
  wa: ["のれんに合う", "縁起がいい", "静かに強い", "老舗のふりがうまい"],
  mono: ["会議で通りそう", "余計なことをしない", "名刺に強い", "沈黙が似合う"],
};

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(arr, seed, offset = 0) {
  return arr[(seed + offset) % arr.length];
}

function escapeText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getInitials(text) {
  const source = text.replace(/[^\p{L}\p{N}]/gu, "");
  if (!source) return "L";
  const chars = Array.from(source);
  return chars.slice(0, Math.min(chars.length, 2)).join("").toUpperCase();
}

function getDisplayName() {
  return nameInput.value.trim() || "LOGO";
}

function buildMark({ seed, colors, energy, space, initials }) {
  const [paper, ink, accent, sub] = colors;
  const rotate = ((seed % 31) - 15) * (energy / 100);
  const radius = 28 + Math.round(space * 0.16);
  const ring = 106 + Math.round(space * 0.38);

  if (mode === "pop") {
    return `
      <g transform="translate(195 140) rotate(${rotate})">
        <path d="M0 -${ring} C66 -${ring} ${ring} -66 ${ring} 0 C${ring} 66 66 ${ring} 0 ${ring} C-66 ${ring} -${ring} 66 -${ring} 0 C-${ring} -66 -66 -${ring} 0 -${ring}Z" fill="${accent}"/>
        <circle cx="${28 - space * 0.18}" cy="${-22 + energy * 0.08}" r="${48 + energy * 0.12}" fill="${sub}"/>
        <text x="0" y="23" text-anchor="middle" font-size="70" font-weight="950" fill="${ink}" font-family="Arial Black, system-ui, sans-serif">${escapeText(initials)}</text>
      </g>`;
  }

  if (mode === "wa") {
    return `
      <g transform="translate(195 140)">
        <circle cx="0" cy="0" r="${ring}" fill="${accent}"/>
        <circle cx="0" cy="0" r="${ring - 18}" fill="${paper}" opacity="0.9"/>
        <path d="M-${ring} 0 H${ring} M0 -${ring} V${ring}" stroke="${accent}" stroke-width="10" opacity="0.42"/>
        <text x="0" y="28" text-anchor="middle" font-size="78" font-weight="900" fill="${ink}" font-family='serif'>${escapeText(initials)}</text>
      </g>`;
  }

  if (mode === "mono") {
    return `
      <g transform="translate(195 140) rotate(${rotate * 0.6})">
        <rect x="-${ring}" y="-${ring * 0.68}" width="${ring * 2}" height="${ring * 1.36}" rx="${radius}" fill="${ink}"/>
        <rect x="-${ring - 17}" y="-${ring * 0.68 - 17}" width="${(ring - 17) * 2}" height="${ring * 1.36 - 34}" rx="${Math.max(10, radius - 10)}" fill="${paper}"/>
        <text x="0" y="27" text-anchor="middle" font-size="76" font-weight="950" fill="${ink}" font-family="Arial Black, system-ui, sans-serif">${escapeText(initials)}</text>
      </g>`;
  }

  return `
    <g transform="translate(195 140) rotate(${rotate})">
      <rect x="-${ring}" y="-${ring}" width="${ring * 2}" height="${ring * 2}" rx="${radius}" fill="${accent}"/>
      <path d="M-${ring} ${ring * 0.35} C-${ring * 0.35} ${ring * 0.05} ${ring * 0.35} ${ring * 0.66} ${ring} ${ring * 0.28} L${ring} ${ring} L-${ring} ${ring}Z" fill="${sub}" opacity="0.9"/>
      <text x="0" y="25" text-anchor="middle" font-size="74" font-weight="950" fill="${ink}" font-family="Arial Black, system-ui, sans-serif">${escapeText(initials)}</text>
    </g>`;
}

function buildSvg() {
  const name = getDisplayName();
  const seed = hashString(`${name}-${mode}-${energyInput.value}-${spaceInput.value}-${salt}`);
  const colors = pick(palettes[mode], seed);
  const [paper, ink, accent, sub] = colors;
  const initials = getInitials(name);
  const energy = Number(energyInput.value);
  const space = Number(spaceInput.value);
  const nameSize = Math.max(40, Math.min(72, 360 / Math.max(Array.from(name).length, 5)));
  const letterSpace = mode === "wa" ? 8 : mode === "mono" ? 2 : 4 + Math.round(space / 18);
  const underlineWidth = 250 + Math.round(energy * 1.1);
  const mark = buildMark({ seed, colors, energy, space, initials });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540" role="img" aria-label="${escapeText(name)} logo">
  <rect width="900" height="540" rx="44" fill="${paper}"/>
  <circle cx="758" cy="88" r="${42 + energy * 0.24}" fill="${sub}" opacity="0.22"/>
  <circle cx="92" cy="446" r="${58 + space * 0.18}" fill="${accent}" opacity="0.14"/>
  ${mark}
  <g transform="translate(430 142)">
    <text x="0" y="26" font-size="${nameSize}" font-weight="950" letter-spacing="${letterSpace}" fill="${ink}" font-family="Arial Black, Helvetica, system-ui, sans-serif">${escapeText(name.toUpperCase())}</text>
    <rect x="0" y="62" width="${underlineWidth}" height="12" rx="6" fill="${accent}"/>
    <rect x="${Math.max(74, underlineWidth - 92)}" y="62" width="92" height="12" rx="6" fill="${sub}"/>
    <text x="0" y="126" font-size="26" font-weight="800" letter-spacing="4" fill="${ink}" opacity="0.62" font-family="system-ui, sans-serif">LOGO DAY / 06.05</text>
  </g>
  <g transform="translate(430 350)">
    <rect x="0" y="0" width="318" height="64" rx="32" fill="${ink}" opacity="0.08"/>
    <circle cx="38" cy="32" r="13" fill="${accent}"/>
    <circle cx="78" cy="32" r="13" fill="${sub}"/>
    <circle cx="118" cy="32" r="13" fill="${ink}" opacity="0.82"/>
    <text x="160" y="41" font-size="22" font-weight="900" fill="${ink}" opacity="0.78" font-family="system-ui, sans-serif">made in 6/5</text>
  </g>
</svg>`.trim();

  const desc = pick(descriptors[mode], seed, 3);
  taglineEl.textContent = `判定：${desc}ロゴ`;
  return svg;
}

function render() {
  currentSvg = buildSvg();
  logoStage.innerHTML = currentSvg;
}

function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  render();
}

function downloadSvg() {
  const name = getDisplayName().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-|-$/g, "") || "logo";
  const blob = new Blob([currentSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-logo-day.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

nameInput.addEventListener("input", render);
energyInput.addEventListener("input", render);
spaceInput.addEventListener("input", render);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

shuffleBtn.addEventListener("click", () => {
  salt += 97 + Math.floor(Math.random() * 900);
  energyInput.value = String(24 + Math.floor(Math.random() * 64));
  spaceInput.value = String(22 + Math.floor(Math.random() * 62));
  render();
});

downloadBtn.addEventListener("click", downloadSvg);

render();
