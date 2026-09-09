import * as THREE from "/apps/2026-09-10/vendor/three.module.js";
const $ = (id) => document.getElementById(id),
  mobile = matchMedia("(max-width: 600px)").matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("loading").textContent =
    "3Dを表示できません。WebGLが使えるブラウザで開いてください。";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$("world").appendChild(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(
    mobile ? 80 : 58,
    innerWidth / innerHeight,
    0.1,
    240,
  );
scene.fog = new THREE.FogExp2(0x494659, 0.008);
const hemi = new THREE.HemisphereLight(0xaba9e6, 0x25354d, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb78b, 2.4);
sun.position.set(-30, 50, 30);
scene.add(sun);
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(190, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader:
      "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec3 v;uniform float night;void main(){float h=smoothstep(-.1,.6,normalize(v).y);vec3 dusk=mix(vec3(.83,.39,.29),vec3(.12,.19,.38),h);vec3 dark=mix(vec3(.055,.075,.15),vec3(.008,.019,.065),h);gl_FragColor=vec4(mix(dusk,dark,night),1.);}",
  }),
);
scene.add(sky);
const ads = [],
  blocks = [],
  windows = [],
  glows = [],
  lamps = [];
let seed = 19;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const windowMats = [0xffd594, 0x5bc5eb].map(
  (c) =>
    new THREE.MeshStandardMaterial({
      color: 0x172735,
      emissive: c,
      emissiveIntensity: 0.1,
      roughness: 0.3,
      metalness: 0.4,
    }),
);
windowMats.push(
  new THREE.MeshStandardMaterial({
    color: 0x152431,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0x07131e,
    emissiveIntensity: 0.1,
  }),
);
const materials = {};
function mat(color, roughness = 0.7) {
  const key = color + ":" + roughness;
  return (materials[key] ??= new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: roughness < 0.4 ? 0.55 : 0.12,
  }));
}
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, x, y, z, color, material) {
  const m = new THREE.Mesh(cubeGeometry, material || mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}
box(160, 0.2, 160, 0, -0.15, 0, 0x121b29, mat(0x182435, 0.27));
// Fine road grain, broken wet highlights and lane markings.
const noise = document.createElement("canvas");
noise.width = noise.height = 256;
const nc = noise.getContext("2d");
nc.fillStyle = "#283344";
nc.fillRect(0, 0, 256, 256);
for (let i = 0; i < 10000; i++) {
  nc.fillStyle = `rgba(180,198,212,${rnd() * 0.11})`;
  nc.fillRect(rnd() * 256, rnd() * 256, 1, 1);
}
const nt = new THREE.CanvasTexture(noise);
nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
nt.repeat.set(35, 35);
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshStandardMaterial({
    map: nt,
    color: 0x657082,
    roughness: 0.32,
    metalness: 0.45,
  }),
);
road.rotation.x = -Math.PI / 2;
road.position.y = -0.035;
scene.add(road);
for (let n = -55; n < 60; n += 7) {
  if (Math.abs(n) > 13) {
    box(0.12, 0.015, 3, 0, 0.01, n, 0xc4b799);
    box(3, 0.015, 0.12, n, 0.01, 0, 0xc4b799);
  }
}
for (const s of [-1, 1])
  for (let i = -5; i <= 5; i++) {
    box(0.85, 0.02, 3.6, i * 1.4, 0.02, s * 10, 0xc7c6bf);
    box(3.6, 0.02, 0.85, s * 10, 0.02, i * 1.4, 0xc7c6bf);
  }
const palettes = [
  ["#cdf652", "#15252a"],
  ["#fc663d", "#171527"],
  ["#5be0ed", "#10213e"],
  ["#eee8dc", "#111622"],
  ["#e59bff", "#241630"],
];
let photo = null,
  cropX = 0,
  cropY = 0,
  zoom = 1,
  message = "松村です",
  userTextures = [];
function drawPhoto(ctx, x, y, w, h) {
  if (!photo) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const side = Math.min(photo.width, photo.height) / zoom;
  const sx = (photo.width - side) / 2 + (cropX * (photo.width - side)) / 2,
    sy = (photo.height - side) / 2 + (cropY * (photo.height - side)) / 2;
  const target = Math.max(w, h);
  ctx.drawImage(
    photo,
    sx,
    sy,
    side,
    side,
    x + (w - target) / 2,
    y + (h - target) / 2,
    target,
    target,
  );
  ctx.restore();
}
function lines(ctx, text, x, y, w, h, color, maxSize = 110) {
  let chars = Array.from(text),
    size = maxSize,
    out = [];
  for (; size >= 12; size -= 2) {
    ctx.font = `900 ${size}px Arial,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
    out = [];
    let line = "";
    for (const c of chars) {
      if (ctx.measureText(line + c).width > w && line) {
        out.push(line);
        line = c;
      } else line += c;
    }
    if (line) out.push(line);
    if (out.length * size * 1.18 <= h) break;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  out.forEach((l, i) =>
    ctx.fillText(
      l,
      x,
      y + (h - out.length * size * 1.18) / 2 + size * 0.6 + i * size * 1.18,
    ),
  );
}
function artwork(kind, index, personal, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  let [bg, fg] = palettes[index % 5];
  if (kind === "roof") {
    fg = bg;
    bg = "#080f1e";
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  let text = personal
    ? message
    : [
        "明日を、ここから。",
        "夜を楽しもう",
        "中央レコード",
        "喫茶 月光",
        "NEW CITY",
        "星野百貨店",
      ][index % 6];
  const has = personal && photo;
  const pad = Math.min(w, h) * 0.065;
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.max(12, h * 0.042)}px Arial`;
  ctx.fillText(
    personal ? "MATSUMURA / CITY TAKEOVER" : "CHUO / CITY INFORMATION",
    pad,
    pad + 12,
  );
  if (kind === "vertical") {
    if (has) drawPhoto(ctx, pad, pad * 2, w - pad * 2, w - pad * 2);
    const top = has ? w + pad : pad * 3;
    const chars = Array.from(text);
    const cols = Math.max(1, Math.ceil(chars.length / 8)),
      rows = Math.ceil(chars.length / cols),
      sz = Math.min((w - pad * 2) / cols, (h - top - pad * 2) / rows) * 0.82;
    ctx.font = `900 ${sz}px sans-serif`;
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    chars.forEach((ch, i) =>
      ctx.fillText(
        ch,
        w - pad - ((Math.floor(i / rows) + 0.5) * (w - 2 * pad)) / cols,
        top + (((i % rows) + 0.5) * (h - top - pad)) / rows,
      ),
    );
    ctx.textAlign = "left";
  } else if (kind === "repeat" && has) {
    for (let k = 0; k < 6; k++)
      drawPhoto(
        ctx,
        ((k % 3) * w) / 3,
        Math.floor(k / 3) * h * 0.31 + h * 0.12,
        w / 3 - 3,
        h * 0.3,
      );
    lines(ctx, text, pad, h * 0.77, w - pad * 2, h * 0.19, fg, h * 0.12);
  } else if (kind === "ticker" || kind === "roof") {
    if (kind === "roof") {
      ctx.shadowColor = fg;
      ctx.shadowBlur = 12;
    }
    lines(ctx, text, pad, h * 0.16, w - 2 * pad, h * 0.72, fg, h * 0.6);
    ctx.shadowBlur = 0;
  } else if (kind === "vision" && has) {
    drawPhoto(ctx, 0, 0, w, h);
    ctx.fillStyle = "#07122199";
    ctx.fillRect(0, h * 0.66, w, h * 0.34);
    lines(ctx, text, pad, h * 0.69, w - pad * 2, h * 0.26, "#ffffff", h * 0.23);
  } else {
    if (has) {
      drawPhoto(ctx, w * 0.47, h * 0.1, w * 0.53, h * 0.9);
      lines(ctx, text, pad, h * 0.19, w * 0.39, h * 0.65, fg, h * 0.27);
    } else {
      lines(ctx, text, pad, h * 0.16, w - 2 * pad, h * 0.7, fg, h * 0.33);
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.86, h * 0.7, h * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = fg;
  ctx.fillRect(pad, h - pad * 0.8, w - pad * 2, 2);
  if (kind === "vision") {
    ctx.fillStyle = "#0000001b";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy() > 4 ? 4 : 1;
  return tex;
}
const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 64;
const gc = glowCanvas.getContext("2d"),
  grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, "rgba(255,255,255,.32)");
grad.addColorStop(0.3, "rgba(255,255,255,.12)");
grad.addColorStop(1, "rgba(255,255,255,0)");
gc.fillStyle = grad;
gc.fillRect(0, 0, 64, 64);
const glowTex = new THREE.CanvasTexture(glowCanvas);
function ad(w, h, x, y, z, rot, kind = "wide") {
  const index = ads.length;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rot;
  scene.add(group);
  const frame = new THREE.Mesh(cubeGeometry, mat(0x080f1b, 0.3));
  frame.scale.set(w + 0.3, h + 0.3, 0.3);
  group.add(frame);
  const base = artwork(
    kind,
    index,
    false,
    kind === "vertical" ? 256 : 1024,
    kind === "vertical" ? 1024 : kind === "ticker" ? 128 : 512,
  );
  const material = new THREE.MeshBasicMaterial({
    map: base,
    toneMapped: false,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  panel.position.z = 0.17;
  group.add(panel);
  let scan = null;
  if (kind === "vision") {
    scan = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.055),
      new THREE.MeshBasicMaterial({
        color: 0xbbeeff,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scan.position.z = 0.185;
    group.add(scan);
  }
  const sm = new THREE.SpriteMaterial({
    map: glowTex,
    color: palettes[index % 5][0],
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(sm);
  glow.scale.set(w * 1.6, h * 1.7, 1);
  glow.position.z = 0.2;
  group.add(glow);
  glows.push(sm);
  const reflection = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.15, h * 1.8),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { image: { value: base }, strength: { value: 0 } },
      vertexShader:
        "varying vec2 uv2;void main(){uv2=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 uv2;uniform sampler2D image;uniform float strength;void main(){vec2 p=vec2(uv2.x+sin(uv2.y*230.)*.006,1.-uv2.y);vec3 c=texture2D(image,p).rgb;float a=pow(sin(uv2.x*3.14159),.5)*pow(uv2.y,1.6)*(.55+.45*sin(uv2.y*310.));gl_FragColor=vec4(c,a*strength);}",
    }),
  );
  reflection.rotation.x = -Math.PI / 2;
  reflection.rotation.z = -rot;
  reflection.position.set(
    x + Math.sin(rot) * h * 0.55,
    0.035,
    z + Math.cos(rot) * h * 0.55,
  );
  scene.add(reflection);
  ads.push({
    scan,
    position: group.position.clone(),
    panel,
    base,
    kind,
    index,
    w,
    h,
    glow: sm,
    reflection: reflection.material,
    changed: false,
  });
}
function building(x, z, w, d, h, index) {
  blocks.push({ x, z, w: w + 0.6, d: d + 0.6 });
  box(w + 0.7, 0.28, d + 0.7, x, 0.1, z, 0x59616b);
  box(
    w,
    h,
    d,
    x,
    h / 2,
    z,
    [0x39414e, 0x252d3c, 0x49505b, 0x34323c][index % 4],
  );
  box(w + 0.2, 0.4, d + 0.2, x, h, z, 0x171f2d);
  if (index % 2 === 0) box(w * 0.66, 3, d * 0.7, x, h + 1.5, z, 0x323d49);
  if (index % 4 === 1) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 2.4, 12),
      mat(0x83909b, 0.36),
    );
    tank.position.set(x + 2, h + 1.8, z);
    scene.add(tank);
    box(0.12, 6, 0.12, x - 3, h + 3, z, 0x83909b);
    box(3, 0.08, 0.08, x - 3, h + 5, z, 0x83909b);
  }
  if (index % 3 === 0) {
    for (const offset of [-w * 0.3, w * 0.3])
      box(0.18, 3, 0.2, x + offset, h + 1.5, z, 0x6c7988);
  }
  for (let a = 0; a < 3; a++)
    box(1.5, 1, 1.8, x - w * 0.3 + a * 2, h + 0.7, z, 0x727b85);
  const face = z > 0 ? -1 : 1,
    front = z + (face * d) / 2;
  for (let yy = 5; yy < h - 1; yy += 2.8) {
    box(w + 0.12, 0.15, 0.2, x, yy - 1.15, front, 0x141d2b);
    for (let xx = -w / 2 + 1; xx < w / 2 - 0.5; xx += 1.7) {
      const wm = windowMats[rnd() > 0.48 ? 2 : rnd() > 0.4 ? 0 : 1];
      box(1.1, 1.65, 0.08, x + xx, yy, front + face * 0.08, 0, wm);
      windows.push(wm);
    }
  }
  for (let xx = -w / 2 + 1.5; xx < w / 2; xx += 3) {
    box(2.3, 2.5, 0.16, x + xx, 1.5, front + face * 0.1, 0x172a37);
    box(0.08, 2.5, 0.2, x + xx, 1.5, front + face * 0.22, 0x87939b);
    box(
      2.8,
      0.22,
      1.3,
      x + xx,
      3.1,
      front + face * 0.5,
      index % 2 ? 0x697b68 : 0x764c48,
    );
  }
  for (const side of [-1, 1]) {
    for (let yy = 5; yy < h - 1; yy += 2.8) {
      box(0.16, 0.14, d, x + (side * w) / 2, yy - 1.1, z, 0x131f30);
      for (let zz = -d / 2 + 1; zz < d / 2; zz += 2.2)
        box(
          0.08,
          1.45,
          1.2,
          x + side * (w / 2 + 0.04),
          yy,
          z + zz,
          0,
          windowMats[rnd() > 0.5 ? 2 : index % 2],
        );
    }
  }
  const rot = face > 0 ? 0 : Math.PI;
  ad(
    w * 0.82,
    Math.min(6, h * 0.3),
    x,
    Math.min(h - 3, 9.3),
    front + face * 0.35,
    rot,
    index % 3 === 0 ? "vision" : "wide",
  );
  ad(w * 0.88, 1.1, x, 3.65, front + face * 0.42, rot, "ticker");
  if (index % 2 === 0)
    ad(
      1.8,
      7,
      x + w * 0.43,
      Math.min(h - 3, 12),
      front + face * 0.9,
      rot,
      "vertical",
    );
  if (index % 3 === 0)
    ad(w * 0.92, 3.3, x, h + 2, front + face * 0.2, rot, "roof");
  // Side-facing billboards draw the intersection into the composition.
  if (Math.abs(x) < 22) {
    const side = x > 0 ? -1 : 1;
    ad(
      d * 0.78,
      6.5,
      x + side * (w / 2 + 0.25),
      h * 0.62,
      z,
      (side * Math.PI) / 2,
      "vision",
    );
    ad(
      2,
      4,
      x + side * (w / 2 + 0.32),
      3.1,
      z + 2,
      (side * Math.PI) / 2,
      "repeat",
    );
  }
}
let bi = 0;
for (const z of [-22, 22, -42, 42])
  for (const x of [-36, -21, 21, 36])
    building(x, z, 12, 14, 14 + rnd() * 15, bi++);
// A terminating landmark keeps the central avenue visually dense.
building(0, -62, 17, 10, 29, bi++);
for (const x of [-57, 57])
  for (const z of [-38, -18, 18, 38]) {
    box(12, 24 + rnd() * 25, 13, x, 12, z, 0x30394b);
  }
for (const x of [-11, 11])
  for (const z of [-31, -12, 12, 31]) {
    box(0.16, 5.8, 0.16, x, 2.9, z, 0x1c2532);
    box(2, 0.12, 0.22, x + (x > 0 ? -1 : 1) * 0.85, 5.8, z, 0x283647);
    const bulb = new THREE.MeshBasicMaterial({ color: 0xffdfaa });
    box(0.9, 0.08, 0.27, x + (x > 0 ? -1 : 1) * 1.3, 5.72, z, 0, bulb);
    const light = new THREE.PointLight(0xffcc91, 0, 13, 2);
    light.position.set(x, 5, z);
    scene.add(light);
    lamps.push(light);
    if (Math.abs(z) === 12) {
      box(2, 0.55, 0.45, x, 4.6, z, 0x121a24);
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 8),
          new THREE.MeshBasicMaterial({ color: k === 0 ? 0x57f0b5 : 0x432b30 }),
        );
        b.position.set(x - 0.6 + k * 0.6, 4.6, z + (z > 0 ? -0.26 : 0.26));
        scene.add(b);
      }
    }
  }
for (const s of [-1, 1]) {
  box(0.65, 2.8, 0.65, s * 10.8, 1.4, 5, 0x363e4e);
  ad(0.7, 1.6, s * 10.8, 1.8, 5.35, 0, "repeat");
  for (let z = -45; z < 50; z += 5)
    box(0.12, 0.65, 0.12, s * 12, 0.32, z, 0x99958b);
}
// Batch static architecture so mobile renders hundreds of details in a few calls.
const batches = new Map();
for (const m of [...scene.children]) {
  if (m.isMesh && m.geometry === cubeGeometry) {
    if (!batches.has(m.material)) batches.set(m.material, []);
    batches.get(m.material).push(m);
  }
}
for (const [material, meshes] of batches) {
  const batch = new THREE.InstancedMesh(cubeGeometry, material, meshes.length);
  meshes.forEach((m, i) => {
    m.updateMatrix();
    batch.setMatrixAt(i, m.matrix);
    scene.remove(m);
  });
  scene.add(batch);
}
ads.sort(
  (a, b) =>
    a.position.distanceToSquared(new THREE.Vector3(15, 14, -22)) -
    b.position.distanceToSquared(new THREE.Vector3(15, 14, -22)),
);
let state = "edit",
  mode = "auto",
  started = 0,
  night = 0,
  tourStart = 0,
  last = 0,
  yaw = 0,
  pitch = 0;
const keys = new Set(),
  pendingKeys = new Set(),
  held = (k) => keys.has(k) || pendingKeys.has(k),
  move = { x: 0, y: 0 };
const route = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1, 3, 23),
  new THREE.Vector3(-1, 4, 12),
  new THREE.Vector3(2, 4.5, 0),
  new THREE.Vector3(3, 6, -9),
  new THREE.Vector3(0, 13, 3),
  new THREE.Vector3(0, mobile ? 34 : 30, mobile ? 49 : 32),
]);
const targetRoute = new THREE.CatmullRomCurve3([
  new THREE.Vector3(20, 11, -15),
  new THREE.Vector3(20, 12, -20),
  new THREE.Vector3(-20, 12, -21),
  new THREE.Vector3(0, 16, -50),
  new THREE.Vector3(0, 10, -17),
  new THREE.Vector3(0, 9, -10),
]);
function setNight(v) {
  night = v;
  sky.material.uniforms.night.value = v;
  hemi.intensity = 2.1 - v * 1.05;
  sun.intensity = 2.4 * (1 - v) + 0.24;
  scene.fog.color.setRGB(0.28 - v * 0.245, 0.27 - v * 0.22, 0.35 - v * 0.25);
  windows.forEach((m) => (m.emissiveIntensity = 0.12 + v * 0.42));
  lamps.forEach((l) => (l.intensity = v * 19));
  ads.forEach((a) => {
    a.glow.opacity = v * 0.3;
    a.reflection.uniforms.strength.value = v * 0.24;
  });
}
function prepare() {
  userTextures.forEach((t) => t.dispose());
  userTextures = [];
  message = $("message").value.trim() || "松村です";
  ads.forEach((a) => {
    const tex = artwork(
      a.kind,
      a.index,
      true,
      a.kind === "vertical" ? 256 : 1024,
      a.kind === "vertical" ? 1024 : a.kind === "ticker" ? 128 : 512,
    );
    if (a.kind === "ticker") {
      tex.wrapS = THREE.RepeatWrapping;
    }
    a.user = tex;
    userTextures.push(tex);
    a.panel.material.map = a.base;
    a.changed = false;
  });
}
function start() {
  prepare();
  state = "cinema";
  started = performance.now();
  $("editor").hidden = true;
  $("completed").hidden = true;
  $("idle").hidden = true;
  $("cinema").hidden = false;
  $("stick").hidden = true;
  $("lookHint").hidden = true;
  document.body.classList.add("playing");
  setNight(0);
}
function finish() {
  state = "done";
  mode = "auto";
  tourStart = performance.now();
  ads.forEach((a) => {
    a.panel.material.map = a.user;
    a.panel.material.color.setScalar(1);
    a.changed = true;
  });
  setNight(1);
  $("cinema").hidden = true;
  $("completed").hidden = false;
  $("total").textContent = `${ads.length} ADS`;
  $("auto").classList.add("selected");
  $("free").classList.remove("selected");
  $("help").textContent = "ゆっくり、街を巡っています";
}
$("start").onclick = start;
$("again").onclick = start;
$("skip").onclick = finish;
$("edit").onclick = () => {
  state = "edit";
  $("editor").hidden = false;
  $("completed").hidden = true;
  $("idle").hidden = false;
  $("stick").hidden = true;
  $("lookHint").hidden = true;
  document.body.classList.remove("playing");
  ads.forEach((a) => (a.panel.material.map = a.base));
  setNight(0);
};
$("free").onclick = () => {
  mode = "free";
  camera.position.set(0, 1.75, 8);
  yaw = 0;
  pitch = 0.15;
  keys.clear();
  pendingKeys.clear();
  $("free").classList.add("selected");
  $("auto").classList.remove("selected");
  $("help").textContent = mobile
    ? "左スティックで移動・右ドラッグで見回す"
    : "WASD / 矢印キーで移動・ドラッグで見回す";
  $("stick").hidden = !mobile;
  $("lookHint").hidden = !mobile;
};
$("auto").onclick = () => {
  mode = "auto";
  tourStart = performance.now();
  $("auto").classList.add("selected");
  $("free").classList.remove("selected");
  $("stick").hidden = true;
  $("lookHint").hidden = true;
  $("help").textContent = "ゆっくり、街を巡っています";
};
function preview() {
  const ctx = $("preview").getContext("2d");
  ctx.fillStyle = "#d6ff63";
  ctx.fillRect(0, 0, 240, 240);
  if (photo) drawPhoto(ctx, 0, 0, 240, 240);
  else
    lines(
      ctx,
      $("message").value.trim() || "松村です",
      20,
      20,
      200,
      200,
      "#18222b",
      70,
    );
}
$("message").oninput = () => {
  $("count").textContent = `${$("message").value.length} / 40`;
  preview();
};
$("zoom").oninput = () => {
  zoom = Number($("zoom").value);
  preview();
};
let photoRequest = 0;
$("photo").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const request = ++photoRequest;
  if (file.size > 20 * 1024 * 1024) {
    $("error").textContent = "20MB以下の画像を選んでください。";
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    if (request !== photoRequest) {
      bitmap.close();
      return;
    }
    if (bitmap.width < 1) throw Error();
    photo?.close();
    photo = bitmap;
    cropX = cropY = 0;
    zoom = 1;
    $("zoom").value = 1;
    $("crop").hidden = false;
    $("remove").hidden = false;
    $("error").textContent = "";
    preview();
  } catch {
    $("error").textContent =
      "この画像を読み込めません。JPEG・PNGなどの画像を選んでください。";
  }
};
$("remove").onclick = () => {
  photoRequest++;
  photo?.close();
  photo = null;
  $("photo").value = "";
  $("crop").hidden = true;
  $("remove").hidden = true;
  preview();
};
let dragPhoto = null;
$("preview").onpointerdown = (e) => {
  dragPhoto = { x: e.clientX, y: e.clientY, cx: cropX, cy: cropY };
  $("preview").setPointerCapture(e.pointerId);
};
$("preview").onpointermove = (e) => {
  if (!dragPhoto) return;
  cropX = THREE.MathUtils.clamp(
    dragPhoto.cx - (e.clientX - dragPhoto.x) / 60,
    -1,
    1,
  );
  cropY = THREE.MathUtils.clamp(
    dragPhoto.cy - (e.clientY - dragPhoto.y) / 60,
    -1,
    1,
  );
  preview();
};
$("preview").onpointerup = $("preview").onpointercancel = () =>
  (dragPhoto = null);
let look = null;
renderer.domElement.onpointerdown = (e) => {
  if (
    state === "done" &&
    mode === "free" &&
    (!mobile || e.clientX > innerWidth * 0.42)
  ) {
    look = { x: e.clientX, y: e.clientY };
    renderer.domElement.setPointerCapture(e.pointerId);
  }
};
renderer.domElement.onpointermove = (e) => {
  if (!look) return;
  yaw -= (e.clientX - look.x) * 0.004;
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - look.y) * 0.003,
    -0.65,
    1.1,
  );
  look = { x: e.clientX, y: e.clientY };
};
renderer.domElement.onpointerup = renderer.domElement.onpointercancel = () =>
  (look = null);
let stickId = null;
function updateStick(e) {
  const r = $("stick").getBoundingClientRect();
  let x = e.clientX - r.left - 50,
    y = e.clientY - r.top - 50;
  const len = Math.hypot(x, y);
  if (len > 33) {
    x *= 33 / len;
    y *= 33 / len;
  }
  move.x = x / 33;
  move.y = y / 33;
  $("stick").firstElementChild.style.transform = `translate(${x}px,${y}px)`;
}
$("stick").onpointerdown = (e) => {
  stickId = e.pointerId;
  $("stick").setPointerCapture(e.pointerId);
  updateStick(e);
};
$("stick").onpointermove = (e) => {
  if (e.pointerId === stickId) updateStick(e);
};
$("stick").onpointerup = $("stick").onpointercancel = () => {
  stickId = null;
  move.x = move.y = 0;
  $("stick").firstElementChild.style.transform = "";
};
addEventListener("keydown", (e) => {
  if (state !== "done" || mode !== "free") return;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D",
    ].includes(e.key)
  ) {
    e.preventDefault();
    keys.add(e.key.toLowerCase());
    pendingKeys.add(e.key.toLowerCase());
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
  keys.clear();
  pendingKeys.clear();
  move.x = move.y = 0;
  look = null;
});
document.addEventListener(
  "dblclick",
  (e) => {
    if (!e.target.closest("input")) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener("gesturestart", (e) => e.preventDefault(), {
  passive: false,
});
renderer.domElement.oncontextmenu = (e) => e.preventDefault();
$("stick").oncontextmenu = (e) => e.preventDefault();
function allowed(x, z) {
  return (
    Math.abs(x) < 52 &&
    Math.abs(z) < 55 &&
    !blocks.some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + 0.6 && Math.abs(z - b.z) < b.d / 2 + 0.6,
    )
  );
}
const tmp = new THREE.Vector3();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state === "edit") {
    const t = now * 0.00009;
    camera.position.set(4 + Math.sin(t) * 2, 7.5, 29);
    camera.lookAt(7, 11, -18);
  } else if (state === "cinema") {
    const p = Math.min((now - started) / 24000, 1);
    const ease = p * p * (3 - 2 * p);
    camera.position.copy(route.getPoint(ease));
    camera.lookAt(targetRoute.getPoint(ease));
    setNight(THREE.MathUtils.smoothstep(p, 0.18, 0.9));
    ads.forEach((a, i) => {
      const threshold = 0.07 + (i / ads.length) * 0.68;
      const elapsed = p - threshold;
      if (elapsed >= 0) {
        a.panel.material.map = a.user;
        a.changed = true;
        a.panel.material.color.setScalar(
          elapsed < 0.015 ? (Math.sin(now * 0.09) > 0 ? 0.18 : 1) : 1,
        );
      }
    });
    $("progress").style.width = `${p * 100}%`;
    $("phase").textContent =
      p < 0.78 ? "SIGNAL TAKEOVER" : "MIDNIGHT / MATSUMURA";
    if (p >= 1) finish();
  } else if (mode === "auto") {
    const t = (now - tourStart) / 1000;
    camera.position.set(
      Math.sin(t * 0.09) * 7,
      (mobile ? 27 : 23) + Math.cos(t * 0.09) * 7,
      (mobile ? 41 : 24) + Math.cos(t * 0.09) * 8,
    );
    camera.lookAt(0, 9, -12);
  } else {
    let x =
        move.x +
        (held("d") || held("arrowright") ? 1 : 0) -
        (held("a") || held("arrowleft") ? 1 : 0),
      z =
        move.y +
        (held("s") || held("arrowdown") ? 1 : 0) -
        (held("w") || held("arrowup") ? 1 : 0);
    const len = Math.max(1, Math.hypot(x, z));
    x /= len;
    z /= len;
    const dx = (x * Math.cos(yaw) + z * Math.sin(yaw)) * dt * 5,
      dz = (-x * Math.sin(yaw) + z * Math.cos(yaw)) * dt * 5;
    if (allowed(camera.position.x + dx, camera.position.z))
      camera.position.x += dx;
    if (allowed(camera.position.x, camera.position.z + dz))
      camera.position.z += dz;
    tmp
      .set(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      )
      .add(camera.position);
    camera.lookAt(tmp);
    pendingKeys.clear();
  }
  if (state !== "edit")
    ads.forEach((a) => {
      if (a.changed && a.kind === "ticker")
        a.user.offset.x = (now * 0.000025) % 1;
    });
  ads.forEach((a) => {
    a.reflection.uniforms.image.value = a.panel.material.map;
    if (a.scan)
      a.scan.position.y = (((now * 0.00016 + a.index * 0.1) % 1) - 0.5) * a.h;
  });
  renderer.render(scene, camera);
  if (Math.floor(now / 1000) !== Math.floor((now - dt * 1000) / 1000))
    $("world").dataset.diagnostics = JSON.stringify({
      state,
      mode,
      night,
      changed: ads.filter((a) => a.changed).length,
      ads: ads.length,
      textures: renderer.info.memory.textures,
      drawCalls: renderer.info.render.calls,
      position: camera.position.toArray(),
      collision:
        mode === "free" && !allowed(camera.position.x, camera.position.z),
    });
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  $("loading").hidden = false;
  $("loading").textContent =
    "描画が中断されました。ページを再読み込みしてください。";
});
const routeClear = Array.from({ length: 1001 }, (_, i) =>
  route.getPoint(i / 1000),
).every((p) => allowed(p.x, p.z));
$("world").dataset.geometryChecks = JSON.stringify({
  routeClear,
  buildingCentersBlocked: blocks.every((b) => !allowed(b.x, b.z)),
  boundaryBlocked:
    !allowed(53, 0) && !allowed(-53, 0) && !allowed(0, 56) && !allowed(0, -56),
});
preview();
setNight(0);
$("loading").hidden = true;
$("editor").hidden = false;
requestAnimationFrame(animate);
// Read-only diagnostics for browser verification.
window.matsumuraDebug = () => ({
  state,
  mode,
  ads: ads.length,
  changed: ads.filter((a) => a.changed).length,
  night,
  position: camera.position.toArray(),
  collision: !allowed(camera.position.x, camera.position.z),
  textures: renderer.info.memory.textures,
  drawCalls: renderer.info.render.calls,
});
