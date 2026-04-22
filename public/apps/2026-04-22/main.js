const asset = (p) => new URL(p, import.meta.url).toString();

const RECORD_SECONDS = 6;
const ANALYZE_INTERVAL_MS = 70;
const MIN_RMS = 0.018;
const MIN_FREQ = 80;
const MAX_FREQ = 900;
const STABLE_MIDI_DELTA = 0.45;
const MIN_NOTE_FRAMES = 2;
const MIN_GAP_FRAMES = 2;

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const meterBar = document.getElementById("meterBar");
const notesJaEl = document.getElementById("notesJa");
const notesEnEl = document.getElementById("notesEn");
const subTextEl = document.getElementById("subText");
const orbEl = document.getElementById("orb");

let audioContext = null;
let analyser = null;
let mediaStream = null;
let sourceNode = null;
let rafId = 0;
let recordTimerId = 0;
let countdownIntervalId = 0;

let isRecording = false;
let frames = [];
let startedAt = 0;

const NOTE_NAMES_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_JA = ["ド", "ド#", "レ", "レ#", "ミ", "ファ", "ファ#", "ソ", "ソ#", "ラ", "ラ#", "シ"];

function setStatus(text) {
  statusEl.textContent = text;
}

function setTimer(value) {
  timerEl.textContent = value;
}

function setMeter(level) {
  meterBar.style.width = `${Math.max(0, Math.min(100, level * 100))}%`;
}

function setResult(ja, en, sub) {
  notesJaEl.textContent = ja || "---";
  notesEnEl.textContent = en || "---";
  subTextEl.textContent = sub || "";
}

function hzToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteEn(midi) {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES_EN[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

function midiToNoteJa(midi) {
  const rounded = Math.round(midi);
  return NOTE_NAMES_JA[((rounded % 12) + 12) % 12];
}

function autoCorrelate(buffer, sampleRate) {
  const size = buffer.length;

  let rms = 0;
  for (let i = 0; i < size; i += 1) {
    const v = buffer[i];
    rms += v * v;
  }
  rms = Math.sqrt(rms / size);

  if (rms < MIN_RMS) {
    return { freq: -1, rms };
  }

  let r1 = 0;
  let r2 = size - 1;
  const threshold = 0.2;

  for (let i = 0; i < size / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i += 1) {
    if (Math.abs(buffer[size - i]) < threshold) {
      r2 = size - i;
      break;
    }
  }

  const sliced = buffer.slice(r1, r2);
  const newSize = sliced.length;
  const correlations = new Array(newSize).fill(0);

  for (let lag = 0; lag < newSize; lag += 1) {
    let sum = 0;
    for (let i = 0; i < newSize - lag; i += 1) {
      sum += sliced[i] * sliced[i + lag];
    }
    correlations[lag] = sum;
  }

  let d = 0;
  while (d < newSize - 1 && correlations[d] > correlations[d + 1]) {
    d += 1;
  }

  let maxValue = -1;
  let maxIndex = -1;
  for (let i = d; i < newSize; i += 1) {
    if (correlations[i] > maxValue) {
      maxValue = correlations[i];
      maxIndex = i;
    }
  }

  if (maxIndex <= 0) {
    return { freq: -1, rms };
  }

  let lag = maxIndex;
  if (maxIndex > 0 && maxIndex < correlations.length - 1) {
    const x1 = correlations[maxIndex - 1];
    const x2 = correlations[maxIndex];
    const x3 = correlations[maxIndex + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      lag = maxIndex - b / (2 * a);
    }
  }

  const freq = sampleRate / lag;

  if (freq < MIN_FREQ || freq > MAX_FREQ) {
    return { freq: -1, rms };
  }

  return { freq, rms };
}

function analyzeFrame() {
  if (!analyser || !audioContext || !isRecording) return;

  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);

  const { freq, rms } = autoCorrelate(buffer, audioContext.sampleRate);
  const normalizedMeter = Math.min(1, rms / 0.12);
  setMeter(normalizedMeter);

  orbEl.style.transform = `scale(${1 + normalizedMeter * 0.28})`;

  const elapsed = (performance.now() - startedAt) / 1000;
  frames.push({
    time: elapsed,
    freq,
    rms,
    midi: freq > 0 ? hzToMidi(freq) : null,
  });

  rafId = window.setTimeout(analyzeFrame, ANALYZE_INTERVAL_MS);
}

function cleanupAudio() {
  if (rafId) {
    clearTimeout(rafId);
    rafId = 0;
  }

  if (recordTimerId) {
    clearTimeout(recordTimerId);
    recordTimerId = 0;
  }

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = 0;
  }

  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch (_) {}
    sourceNode = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  analyser = null;
}

function compressFramesToNotes(inputFrames) {
  const voiced = inputFrames.map((frame) => {
    if (frame.midi == null || frame.rms < MIN_RMS) {
      return null;
    }
    return {
      ...frame,
      midiRounded: Math.round(frame.midi),
    };
  });

  const smoothed = [];
  let current = null;
  let currentCount = 0;

  for (let i = 0; i < voiced.length; i += 1) {
    const frame = voiced[i];

    if (!frame) {
      smoothed.push(null);
      current = null;
      currentCount = 0;
      continue;
    }

    if (!current) {
      current = frame.midi;
      currentCount = 1;
      smoothed.push(frame);
      continue;
    }

    if (Math.abs(frame.midi - current) <= STABLE_MIDI_DELTA) {
      current = (current * currentCount + frame.midi) / (currentCount + 1);
      currentCount += 1;
      smoothed.push({
        ...frame,
        midi: current,
        midiRounded: Math.round(current),
      });
    } else {
      current = frame.midi;
      currentCount = 1;
      smoothed.push(frame);
    }
  }

  const groups = [];
  let active = null;
  let gap = 0;

  for (let i = 0; i < smoothed.length; i += 1) {
    const frame = smoothed[i];

    if (!frame) {
      gap += 1;
      if (active && gap >= MIN_GAP_FRAMES) {
        groups.push(active);
        active = null;
      }
      continue;
    }

    gap = 0;

    if (!active) {
      active = {
        midis: [frame.midi],
        frames: 1,
      };
      continue;
    }

    const avgMidi = active.midis.reduce((a, b) => a + b, 0) / active.midis.length;
    if (Math.abs(frame.midi - avgMidi) <= 0.75) {
      active.midis.push(frame.midi);
      active.frames += 1;
    } else {
      groups.push(active);
      active = {
        midis: [frame.midi],
        frames: 1,
      };
    }
  }

  if (active) {
    groups.push(active);
  }

  const notes = groups
    .filter((group) => group.frames >= MIN_NOTE_FRAMES)
    .map((group) => {
      const avgMidi = group.midis.reduce((a, b) => a + b, 0) / group.midis.length;
      return Math.round(avgMidi);
    });

  const deduped = [];
  for (const midi of notes) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== midi) {
      deduped.push(midi);
    }
  }

  return deduped;
}

function detectLikelyKeyRoot(midiList) {
  if (!midiList.length) return null;

  const pitchClassCounts = new Array(12).fill(0);
  midiList.forEach((midi) => {
    pitchClassCounts[((midi % 12) + 12) % 12] += 1;
  });

  let bestRoot = 0;
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root += 1) {
    const majorScale = [0, 2, 4, 5, 7, 9, 11];
    let score = 0;
    for (let i = 0; i < 12; i += 1) {
      if (majorScale.includes((i - root + 12) % 12)) {
        score += pitchClassCounts[i];
      } else {
        score -= pitchClassCounts[i] * 0.35;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRoot = root;
    }
  }

  return bestRoot;
}

function convertToJaRelativeNames(midiList) {
  const root = detectLikelyKeyRoot(midiList);
  if (root == null) {
    return midiList.map((midi) => midiToNoteJa(midi));
  }

  const map = {
    0: "ド",
    1: "ド#",
    2: "レ",
    3: "レ#",
    4: "ミ",
    5: "ファ",
    6: "ファ#",
    7: "ソ",
    8: "ソ#",
    9: "ラ",
    10: "ラ#",
    11: "シ",
  };

  return midiList.map((midi) => {
    const relative = (((midi % 12) + 12) % 12 - root + 12) % 12;
    return map[relative];
  });
}

function summarizePitchRange(midiList) {
  if (!midiList.length) return "音がうまく取れませんでした";
  const minMidi = Math.min(...midiList);
  const maxMidi = Math.max(...midiList);
  const span = maxMidi - minMidi;

  if (span <= 2) return "ほぼ同じ高さで歌っています";
  if (span <= 5) return "ゆるやかに上下するメロディです";
  if (span <= 9) return "けっこう動きのあるメロディです";
  return "かなり音域の広いメロディです";
}

function stopRecordingAndAnalyze() {
  if (!isRecording) return;
  isRecording = false;

  orbEl.classList.remove("recording");
  startBtn.disabled = false;
  retryBtn.disabled = false;
  setMeter(0);
  orbEl.style.transform = "scale(1)";

  const midiList = compressFramesToNotes(frames);

  if (!midiList.length) {
    setStatus("音がうまく取れませんでした");
    setTimer("00.0");
    setResult(
      "---",
      "---",
      "声を少し大きめにして、1音ずつはっきりめにハミングすると取りやすいです"
    );
    cleanupAudio();
    return;
  }

  const jaNotes = convertToJaRelativeNames(midiList).join(" ");
  const enNotes = midiList.map((midi) => midiToNoteEn(midi)).join(" ");

  setStatus("ドレミ化しました");
  setTimer("DONE");
  setResult(jaNotes, enNotes, summarizePitchRange(midiList));

  cleanupAudio();
}

async function startRecording() {
  if (isRecording) return;

  try {
    frames = [];
    setResult("---", "---", "解析結果を待っています");
    setStatus("マイクを準備しています");
    setTimer(`${RECORD_SECONDS.toFixed(1)}`);
    setMeter(0);

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    audioContext = new AudioContext();
    await audioContext.resume();

    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.18;

    sourceNode.connect(analyser);

    isRecording = true;
    startedAt = performance.now();
    startBtn.disabled = true;
    retryBtn.disabled = true;
    orbEl.classList.add("recording");
    setStatus("ハミング中…");

    const countdownStartedAt = performance.now();
    countdownIntervalId = window.setInterval(() => {
      const elapsed = (performance.now() - countdownStartedAt) / 1000;
      const remaining = Math.max(0, RECORD_SECONDS - elapsed);
      setTimer(remaining.toFixed(1).padStart(4, "0"));
    }, 50);

    analyzeFrame();

    recordTimerId = window.setTimeout(() => {
      stopRecordingAndAnalyze();
    }, RECORD_SECONDS * 1000);
  } catch (error) {
    console.error(error);
    setStatus("マイクが使えません");
    setTimer("00.0");
    setResult(
      "---",
      "---",
      "マイクの許可と、httpsまたはlocalhostでの起動を確認してください"
    );
    cleanupAudio();
  }
}

startBtn.addEventListener("click", startRecording);
retryBtn.addEventListener("click", () => {
  setResult("---", "---", "録音するとここに結果が出ます");
  setStatus("STARTを押して6秒間ハミングしてください");
  setTimer("00.0");
  setMeter(0);
});

window.addEventListener("pagehide", cleanupAudio);
window.addEventListener("beforeunload", cleanupAudio);