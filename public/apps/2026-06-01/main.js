const ASSET_BASE = "/apps/2026-06-01";
const asset = (p) => `${ASSET_BASE}/${p.replace(/^\.\//, "")}`;

const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const personImg = document.getElementById("personImg");
const character = document.getElementById("character");
const coverSkirt = document.getElementById("coverSkirt");
const wind = document.getElementById("wind");

personImg.src = asset("./assets/marilyn.png");

let audioContext;
let analyser;
let dataArray;
let running = false;
let currentPower = 0;

startBtn.addEventListener("click", async () => {
  if (running) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    dataArray = new Uint8Array(analyser.fftSize);
    source.connect(analyser);

    running = true;
    startBtn.textContent = "吹いてください";
    startBtn.disabled = true;
    statusText.textContent = "息を吹くほどスカートがひらひらします";

    animate();
  } catch (error) {
    statusText.textContent = "マイクの使用が許可されませんでした";
    console.error(error);
  }
});

function getVolume() {
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const value = (dataArray[i] - 128) / 128;
    sum += value * value;
  }

  return Math.sqrt(sum / dataArray.length);
}

function animate() {
  if (!running) return;

  const volume = getVolume();

  const rawPower = Math.min(Math.max((volume - 0.012) * 16, 0), 1);
  currentPower += (rawPower - currentPower) * 0.2;

  const t = performance.now() * 0.006;

  const flutterA = Math.sin(t * 3.2) * currentPower;
  const flutterB = Math.sin(t * 7.1) * currentPower;

  const lift = currentPower * 62 + flutterB * 9;
  const sway = flutterA * 7;
  const spreadX = 1 + currentPower * 0.18;
  const spreadY = 1 - currentPower * 0.08;

  coverSkirt.style.setProperty("--lift", `${lift}deg`);
  coverSkirt.style.setProperty("--sway", `${sway}deg`);
  coverSkirt.style.setProperty("--spread-x", spreadX);
  coverSkirt.style.setProperty("--spread-y", spreadY);

  character.style.setProperty("--shake-x", `${flutterA * 4}px`);
  character.style.setProperty("--body-rot", `${flutterA * 1.2}deg`);
  wind.style.setProperty("--wind-opacity", currentPower);

  requestAnimationFrame(animate);
}