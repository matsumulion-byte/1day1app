const canvas = document.getElementById("rainCanvas");
const ctx = canvas.getContext("2d");
const flowMeter = document.getElementById("flowMeter");
const toneMeter = document.getElementById("toneMeter");
const caption = document.getElementById("caption");
const rainBtn = document.getElementById("rainBtn");
const clearBtn = document.getElementById("clearBtn");

const notes = ["C", "D", "E", "G", "A", "C+", "D+"];
const noteFreqs = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
const captions = [
  "近い雨粒は勝手にひとつになります。",
  "指で道を作ると、水滴が少しだけ覚えます。",
  "大きい粒ほど低く、小さい粒ほど高く鳴ります。",
  "下まで落ちた粒は、今日のリズムになります。",
  "拭くと窓は静かになります。"
];

let width = 0;
let height = 0;
let dpr = 1;
let droplets = [];
let trails = [];
let ripples = [];
let frame = 0;
let flowScore = 0;
let audioContext = null;
let pointer = {
  active: false,
  x: 0,
  y: 0,
  px: 0,
  py: 0
};
let lastTapAt = 0;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (droplets.length === 0) {
    seedRain();
  }
}

function seedRain() {
  droplets = [];
  const count = Math.floor(clamp(width * height / 19000, 26, 62));
  for (let i = 0; i < count; i += 1) {
    droplets.push(createDroplet(rand(0, width), rand(-height * 0.15, height * 0.96), rand(3.5, 11)));
  }
}

function createDroplet(x, y, radius) {
  return {
    x,
    y,
    radius,
    vx: rand(-0.08, 0.08),
    vy: rand(0.14, 0.72) + radius * 0.018,
    wobble: rand(0, Math.PI * 2),
    tone: Math.floor(rand(0, notes.length)),
    shine: rand(0.28, 0.82),
    age: rand(0, 100)
  };
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(index, volume = 0.14) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(noteFreqs[index % noteFreqs.length], now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(980, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.42);

  toneMeter.textContent = notes[index % notes.length];
}

function addRain(amount = 18) {
  for (let i = 0; i < amount; i += 1) {
    droplets.push(createDroplet(rand(0, width), rand(-80, height * 0.18), rand(3.4, 10.8)));
  }
  caption.textContent = captions[Math.floor(rand(0, captions.length))];
}

function addTrail(x, y, strength = 1) {
  trails.push({
    x,
    y,
    radius: rand(34, 64) * strength,
    life: 1,
    pull: rand(0.1, 0.2) * strength,
    flowX: 0,
    flowY: 1
  });

  if (trails.length > 170) {
    trails.splice(0, trails.length - 170);
  }
}

function addFlowTrail(x, y, strength, flowX, flowY) {
  const length = Math.hypot(flowX, flowY) || 1;
  trails.push({
    x,
    y,
    radius: rand(38, 72) * strength,
    life: 1,
    pull: rand(0.13, 0.24) * strength,
    flowX: flowX / length,
    flowY: flowY / length
  });

  if (trails.length > 170) {
    trails.splice(0, trails.length - 170);
  }
}

function addRipple(x, y, radius, tone) {
  ripples.push({
    x,
    y,
    radius,
    life: 1,
    tone
  });
}

function mergeDroplets(a, b) {
  const area = a.radius * a.radius + b.radius * b.radius;
  const radius = clamp(Math.sqrt(area) * 0.93, 3, 22);
  const tone = Math.floor((a.tone + b.tone + 1) / 2) % notes.length;
  const merged = {
    ...a,
    x: (a.x * a.radius + b.x * b.radius) / (a.radius + b.radius),
    y: (a.y * a.radius + b.y * b.radius) / (a.radius + b.radius),
    radius,
    vx: (a.vx + b.vx) * 0.42,
    vy: Math.max(a.vy, b.vy) + radius * 0.025,
    tone,
    shine: Math.max(a.shine, b.shine),
    age: 0
  };
  addRipple(merged.x, merged.y, merged.radius * 2, tone);
  playTone(tone, clamp(radius / 80, 0.06, 0.18));
  flowScore += Math.round(radius);
  return merged;
}

function updateDroplets() {
  for (const drop of droplets) {
    drop.age += 1;
    drop.wobble += 0.034;
    drop.vy += 0.0018 * drop.radius;
    drop.vx += Math.sin(drop.wobble) * 0.0028;

    for (const trail of trails) {
      const dx = trail.x - drop.x;
      const dy = trail.y - drop.y;
      const distance = Math.hypot(dx, dy);
      if (distance < trail.radius + drop.radius) {
        const force = (1 - distance / (trail.radius + drop.radius)) * trail.pull * trail.life;
        drop.vx += (dx / Math.max(distance, 1)) * force * 0.68;
        drop.vx += trail.flowX * force * 1.9;
        drop.vy += Math.abs(dy / Math.max(distance, 1)) * force * 0.42;
        drop.vy += Math.max(0.2, trail.flowY) * force * 1.5;
      }
    }

    if (pointer.active) {
      const dx = pointer.x - drop.x;
      const dy = pointer.y - drop.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 92) {
        const force = (1 - distance / 92) * 0.12;
        drop.vx += (dx / Math.max(distance, 1)) * force;
        drop.vy += (dy / Math.max(distance, 1)) * force + 0.028;
      }
    }

    drop.x += drop.vx;
    drop.y += drop.vy;
    drop.vx *= 0.986;
    drop.vy *= 0.992;

    if (drop.x < -30) drop.x = width + 24;
    if (drop.x > width + 30) drop.x = -24;

    if (drop.y - drop.radius > height + 16) {
      addRipple(drop.x, height - 10, drop.radius * 2.2, drop.tone);
      playTone(drop.tone, clamp(drop.radius / 95, 0.04, 0.13));
      flowScore += Math.round(drop.radius * 1.4);
      Object.assign(drop, createDroplet(rand(0, width), rand(-110, -20), rand(3.5, 11)));
    }
  }

  if (frame % 2 === 0) {
    for (let i = 0; i < droplets.length; i += 1) {
      for (let j = i + 1; j < droplets.length; j += 1) {
        const a = droplets[i];
        const b = droplets[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < (a.radius + b.radius) * 0.66) {
          droplets[i] = mergeDroplets(a, b);
          droplets.splice(j, 1);
          j -= 1;
          if (droplets.length < 58) {
            droplets.push(createDroplet(rand(0, width), rand(-120, -20), rand(3.5, 8)));
          }
          break;
        }
      }
    }
  }
}

function updateTrails() {
  trails = trails
    .map((trail) => ({
      ...trail,
      life: trail.life - 0.0038,
      radius: trail.radius * 1.001
    }))
    .filter((trail) => trail.life > 0);

  ripples = ripples
    .map((ripple) => ({
      ...ripple,
      life: ripple.life - 0.024,
      radius: ripple.radius + 1.2
    }))
    .filter((ripple) => ripple.life > 0);
}

function drawBackgroundTexture() {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 18; x < width; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(frame * 0.01 + x) * 3, 0);
    ctx.lineTo(x + Math.cos(frame * 0.012 + x) * 2, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrails() {
  for (const trail of trails) {
    const gradient = ctx.createRadialGradient(trail.x, trail.y, 1, trail.x, trail.y, trail.radius);
    gradient.addColorStop(0, `rgba(230, 250, 255, ${0.26 * trail.life})`);
    gradient.addColorStop(0.46, `rgba(186, 233, 244, ${0.11 * trail.life})`);
    gradient.addColorStop(1, "rgba(230, 250, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.18 * trail.life;
    ctx.strokeStyle = "#e7fbff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trail.x - trail.flowX * trail.radius * 0.28, trail.y - trail.flowY * trail.radius * 0.28);
    ctx.lineTo(trail.x + trail.flowX * trail.radius * 0.38, trail.y + trail.flowY * trail.radius * 0.38);
    ctx.stroke();
    ctx.restore();
  }
}

function drawDroplet(drop) {
  const stretch = clamp(drop.vy * 0.42, 0, 8);
  const gradient = ctx.createRadialGradient(
    drop.x - drop.radius * 0.32,
    drop.y - drop.radius * 0.55,
    drop.radius * 0.2,
    drop.x,
    drop.y,
    drop.radius * 1.55 + stretch
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.72 * drop.shine})`);
  gradient.addColorStop(0.34, "rgba(191, 232, 241, 0.44)");
  gradient.addColorStop(0.78, "rgba(42, 75, 86, 0.22)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");

  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.vx * 0.5);
  ctx.scale(0.86 + Math.sin(drop.wobble) * 0.03, 1.2 + stretch / 12);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, drop.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(-drop.radius * 0.32, -drop.radius * 0.44, Math.max(1.1, drop.radius * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRipples() {
  for (const ripple of ripples) {
    ctx.save();
    ctx.globalAlpha = ripple.life * 0.62;
    ctx.strokeStyle = "rgba(226, 250, 255, 0.76)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawBackgroundTexture();
  drawTrails();

  droplets.sort((a, b) => a.radius - b.radius);
  for (const drop of droplets) {
    drawDroplet(drop);
  }

  drawRipples();
}

function updateUi() {
  flowMeter.textContent = String(flowScore % 100).padStart(2, "0");
  if (frame % 240 === 0) {
    caption.textContent = captions[Math.floor(rand(0, captions.length))];
  }
}

function tick() {
  frame += 1;
  if (frame % 32 === 0 && droplets.length < 68) {
    droplets.push(createDroplet(rand(0, width), rand(-80, -20), rand(3.5, 8.8)));
  }
  updateDroplets();
  updateTrails();
  draw();
  updateUi();
  requestAnimationFrame(tick);
}

function getPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  ensureAudio();
  const point = getPointer(event);
  pointer = {
    active: true,
    x: point.x,
    y: point.y,
    px: point.x,
    py: point.y
  };
  addTrail(point.x, point.y, 1.2);
  caption.textContent = "なぞった道に沿って、雨粒がしばらく流れます。";
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  event.preventDefault();
  if (!pointer.active) {
    return;
  }
  const point = getPointer(event);
  const distance = Math.hypot(point.x - pointer.px, point.y - pointer.py);
  pointer.x = point.x;
  pointer.y = point.y;
  if (distance > 7) {
    const steps = Math.ceil(distance / 18);
    const flowX = point.x - pointer.px;
    const flowY = point.y - pointer.py;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = pointer.px + flowX * t;
      const y = pointer.py + flowY * t;
      addFlowTrail(x, y, clamp(distance / 22, 0.9, 1.7), flowX, flowY);
    }
    flowScore += Math.round(distance * 0.04);
    if (frame % 7 === 0) {
      const note = Math.floor(clamp(point.y / height, 0, 0.999) * notes.length);
      playTone(note, 0.045);
    }
    pointer.px = point.x;
    pointer.py = point.y;
  }
});

canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  pointer.active = false;
});

canvas.addEventListener("pointercancel", (event) => {
  event.preventDefault();
  pointer.active = false;
});

document.addEventListener("touchend", (event) => {
  const now = Date.now();
  if (now - lastTapAt < 420) {
    event.preventDefault();
  }
  lastTapAt = now;
}, { passive: false });

document.addEventListener("gesturestart", (event) => {
  event.preventDefault();
});

rainBtn.addEventListener("click", () => {
  ensureAudio();
  addRain(24);
  playTone(Math.floor(rand(0, notes.length)), 0.09);
});

clearBtn.addEventListener("click", () => {
  trails = [];
  ripples = [];
  droplets = droplets.slice(0, 16);
  flowScore = 0;
  caption.textContent = "窓を拭きました。またなぞると音が戻ります。";
});

window.addEventListener("resize", resize);

resize();
tick();
