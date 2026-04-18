const fileInput = document.getElementById("audioFile");
const filenameEl = document.getElementById("filename");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const resetBtn = document.getElementById("resetBtn");

let audioContext = null;

fileInput.addEventListener("change", handleFileSelect);
resetBtn.addEventListener("click", resetView);

function setStatus(text) {
  statusEl.textContent = text || "";
}

function setPlaceholder() {
  resultEl.innerHTML = `
    <div class="placeholder">
      音源をアップすると<br />
      BPMを推定します
    </div>
  `;
}

function setResult({ bpm, tempoName, feel }) {
  resultEl.innerHTML = `
    <div>
      <p class="bpm">${bpm}</p>
      <p class="tempo">${tempoName}</p>
      <p class="feel">${feel}</p>
    </div>
  `;
}

function resetView() {
  fileInput.value = "";
  filenameEl.textContent = "";
  setStatus("");
  setPlaceholder();
  resetBtn.disabled = true;
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  filenameEl.textContent = file.name;
  setStatus("解析中…");
  resetBtn.disabled = true;
  setPlaceholder();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await decodeAudio(arrayBuffer);

    const analysis = analyzeAudioBuffer(audioBuffer);

    setResult(analysis);
    setStatus("");
    resetBtn.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus("解析に失敗しました");
    resultEl.innerHTML = `
      <div class="placeholder">
        この音源は解析できませんでした
      </div>
    `;
    resetBtn.disabled = false;
  }
}

async function decodeAudio(arrayBuffer) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const bufferCopy = arrayBuffer.slice(0);
  return await audioContext.decodeAudioData(bufferCopy);
}

function analyzeAudioBuffer(audioBuffer) {
  const mono = getMonoChannelData(audioBuffer);
  const filtered = bandPassLike(mono, audioBuffer.sampleRate);

  const envelope = buildEnvelope(filtered, audioBuffer.sampleRate);
  const peaks = detectPeaks(envelope, audioBuffer.sampleRate);

  if (peaks.length < 8) {
    throw new Error("Not enough peaks detected");
  }

  const bpm = estimateBpmFromPeaks(peaks, audioBuffer.sampleRate);
  const tempoName = getTempoName(bpm);
  const feel = detectSwingFeel(peaks, audioBuffer.sampleRate, bpm);

  return {
    bpm,
    tempoName,
    feel
  };
}

function getMonoChannelData(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < channels; ch += 1) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i] / channels;
    }
  }

  return mono;
}

/**
 * 軽いバンドパス風処理
 * 低域のうねりと高域の細かすぎる成分を少し落とす
 */
function bandPassLike(input, sampleRate) {
  const hp = highPass(input, sampleRate, 120);
  const lp = lowPass(hp, sampleRate, 4000);
  return lp;
}

function highPass(input, sampleRate, cutoffHz) {
  const out = new Float32Array(input.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);

  out[0] = input[0];
  for (let i = 1; i < input.length; i += 1) {
    out[i] = alpha * (out[i - 1] + input[i] - input[i - 1]);
  }
  return out;
}

function lowPass(input, sampleRate, cutoffHz) {
  const out = new Float32Array(input.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);

  out[0] = input[0];
  for (let i = 1; i < input.length; i += 1) {
    out[i] = out[i - 1] + alpha * (input[i] - out[i - 1]);
  }
  return out;
}

/**
 * 絶対値を取りつつダウンサンプルして包絡線を作る
 */
function buildEnvelope(samples, sampleRate) {
  const frameSize = 1024;
  const hopSize = 512;
  const length = Math.floor((samples.length - frameSize) / hopSize);
  const envelope = new Float32Array(Math.max(length, 1));

  for (let frame = 0; frame < length; frame += 1) {
    const start = frame * hopSize;
    let sum = 0;

    for (let i = 0; i < frameSize; i += 1) {
      sum += Math.abs(samples[start + i]);
    }

    envelope[frame] = sum / frameSize;
  }

  // 平滑化
  const smooth = new Float32Array(envelope.length);
  const radius = 4;
  for (let i = 0; i < envelope.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = -radius; j <= radius; j += 1) {
      const idx = i + j;
      if (idx >= 0 && idx < envelope.length) {
        sum += envelope[idx];
        count += 1;
      }
    }
    smooth[i] = sum / count;
  }

  smooth.hopSize = hopSize;
  smooth.originalSampleRate = sampleRate;
  return smooth;
}

function detectPeaks(envelope, sampleRate) {
  const hopSize = envelope.hopSize || 512;
  const envRate = sampleRate / hopSize;

  let mean = 0;
  for (let i = 0; i < envelope.length; i += 1) mean += envelope[i];
  mean /= envelope.length;

  let variance = 0;
  for (let i = 0; i < envelope.length; i += 1) {
    const d = envelope[i] - mean;
    variance += d * d;
  }
  variance /= envelope.length;
  const std = Math.sqrt(variance);

  const threshold = mean + std * 1.2;
  const minPeakDistanceSec = 0.18;
  const minPeakDistanceFrames = Math.max(1, Math.floor(minPeakDistanceSec * envRate));

  const peaks = [];
  let lastPeak = -minPeakDistanceFrames;

  for (let i = 1; i < envelope.length - 1; i += 1) {
    const v = envelope[i];
    const isPeak = v > threshold && v > envelope[i - 1] && v >= envelope[i + 1];

    if (!isPeak) continue;
    if (i - lastPeak < minPeakDistanceFrames) continue;

    peaks.push(i * hopSize);
    lastPeak = i;
  }

  return peaks;
}

function estimateBpmFromPeaks(peaks, sampleRate) {
  const intervals = [];

  for (let i = 1; i < peaks.length; i += 1) {
    const sec = (peaks[i] - peaks[i - 1]) / sampleRate;
    if (sec >= 0.18 && sec <= 2.0) {
      intervals.push(sec);
    }
  }

  if (intervals.length < 4) {
    throw new Error("Not enough intervals");
  }

  const bpms = intervals
    .map((sec) => 60 / sec)
    .map(normalizeBpmRange)
    .filter((bpm) => bpm >= 60 && bpm <= 200);

  if (!bpms.length) {
    throw new Error("No BPM candidates");
  }

  // 1 BPM刻みでヒストグラム
  const histogram = new Map();
  for (const bpm of bpms) {
    const rounded = Math.round(bpm);
    histogram.set(rounded, (histogram.get(rounded) || 0) + 1);
  }

  // 上位候補を抽出
  const ranked = [...histogram.entries()].sort((a, b) => b[1] - a[1]);
  const topCandidates = ranked.slice(0, 8).map(([bpm]) => bpm);

  // 近傍含めて重みづけ再計算
  let bestBpm = topCandidates[0];
  let bestScore = -Infinity;

  for (const candidate of topCandidates) {
    let score = 0;
    for (const bpm of bpms) {
      const diff = Math.abs(bpm - candidate);
      if (diff <= 6) {
        score += Math.max(0, 6 - diff);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestBpm = candidate;
    }
  }

  return Math.round(bestBpm);
}

function normalizeBpmRange(bpm) {
  let value = bpm;

  while (value < 70) value *= 2;
  while (value > 160) value /= 2;

  return value;
}

function getTempoName(bpm) {
  if (bpm <= 59) return "Largo";
  if (bpm <= 65) return "Larghetto";
  if (bpm <= 75) return "Adagio";
  if (bpm <= 85) return "Andante";
  if (bpm <= 95) return "Moderato";
  if (bpm <= 110) return "Allegretto";
  if (bpm <= 130) return "Allegro";
  if (bpm <= 150) return "Vivace";
  if (bpm <= 170) return "Presto";
  return "Prestissimo";
}

/**
 * Swing / Straight の簡易判定
 * 連続するピーク間隔のペア比率から判断
 */
function detectSwingFeel(peaks, sampleRate, bpm) {
  const beatSec = 60 / bpm;
  const eighthSec = beatSec / 2;

  const intervals = [];
  for (let i = 1; i < peaks.length; i += 1) {
    intervals.push((peaks[i] - peaks[i - 1]) / sampleRate);
  }

  // BPM近辺の8分っぽい細かさだけ拾う
  const filtered = intervals.filter((sec) => sec >= eighthSec * 0.45 && sec <= eighthSec * 1.8);

  if (filtered.length < 6) {
    return "Straight";
  }

  const ratios = [];
  for (let i = 0; i < filtered.length - 1; i += 2) {
    const a = filtered[i];
    const b = filtered[i + 1];
    const long = Math.max(a, b);
    const short = Math.min(a, b);

    if (short <= 0) continue;

    const ratio = long / short;
    if (ratio >= 1 && ratio <= 3.5) {
      ratios.push(ratio);
    }
  }

  if (ratios.length < 3) {
    return "Straight";
  }

  const medianRatio = median(ratios);

  // 1.0に近いならストレート、1.35以上でスウィング寄り
  return medianRatio >= 1.35 ? "Swing" : "Straight";
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

resetView();