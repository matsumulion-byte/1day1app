const $ = (id) => document.getElementById(id);

const els = {
  recordButton: $("recordButton"),
  recordLabel: $("recordLabel"),
  replayButton: $("replayButton"),
  clearButton: $("clearButton"),
  statusText: $("statusText"),
  speedControl: $("speedControl"),
  echoControl: $("echoControl"),
  repeatControl: $("repeatControl"),
  matsumuraImage: $("matsumuraImage"),
  parrotFallback: $("parrotFallback"),
};

const state = {
  audioContext: null,
  stream: null,
  recorder: null,
  chunks: [],
  lastBuffer: null,
  activeSources: new Set(),
  recording: false,
  pointerStarted: false,
  ignoreNextClick: false,
  maxTimer: null,
};

const messages = {
  idle: "マイクを押して、松村に話しかけてください。",
  ready: "松村、聞く準備できました。",
  recording: "松村、聞いてます。",
  processing: "松村、覚えました。返します。",
  playing: "松村がオウムがえし中。",
  empty: "今のは短すぎたみたいです。もう一回どうぞ。",
  denied: "マイクが使えません。ブラウザのマイク許可を確認してください。",
  unsupported: "このブラウザは録音に対応していないようです。Chrome系ブラウザがおすすめです。",
};

function setStatus(text) {
  els.statusText.textContent = text;
}

function setMode(mode) {
  document.body.classList.toggle("recording", mode === "recording");
  document.body.classList.toggle("playing", mode === "playing");
  els.recordButton.classList.toggle("is-active", mode === "recording");
}

function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("unsupported");
    }

    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    return state.audioContext.resume();
  }

  return Promise.resolve();
}

async function ensureMic() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error("unsupported");
  }

  if (!state.stream) {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
  }

  return state.stream;
}

function stopPlayback() {
  for (const source of state.activeSources) {
    try {
      source.stop();
    } catch {
      // The source may already have ended.
    }
  }

  state.activeSources.clear();
  setMode("idle");
}

async function startRecording() {
  if (state.recording) return;
  stopPlayback();

  try {
    await ensureAudioContext();
    const stream = await ensureMic();
    state.chunks = [];
    state.recorder = new MediaRecorder(stream);
  } catch (error) {
    const key = error.message === "unsupported" ? "unsupported" : "denied";
    setStatus(messages[key]);
    return;
  }

  state.recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      state.chunks.push(event.data);
    }
  });

  state.recorder.addEventListener("stop", handleRecordingStop, { once: true });
  state.recorder.start();
  state.recording = true;
  setMode("recording");
  setStatus(messages.recording);
  els.recordLabel.textContent = "はなすと返す";

  clearTimeout(state.maxTimer);
  state.maxTimer = setTimeout(() => {
    if (state.recording) {
      stopRecording();
    }
  }, 8000);
}

function stopRecording() {
  if (!state.recording || !state.recorder) return;
  state.recording = false;
  clearTimeout(state.maxTimer);
  setMode("idle");
  setStatus(messages.processing);
  els.recordLabel.textContent = "おして話す";
  state.recorder.stop();
}

async function handleRecordingStop() {
  const blob = new Blob(state.chunks, { type: state.recorder?.mimeType || "audio/webm" });

  if (blob.size < 900) {
    setStatus(messages.empty);
    return;
  }

  try {
    await ensureAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    state.lastBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
    els.replayButton.disabled = false;
    els.clearButton.disabled = false;
    playMatsumura();
  } catch {
    setStatus("録音はできましたが、再生加工に失敗しました。もう一回試してください。");
  }
}

function createVoiceChain() {
  const ctx = state.audioContext;
  const input = ctx.createGain();
  const dry = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const delay = ctx.createDelay(0.28);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  const output = ctx.createGain();

  dry.gain.value = 0.88;
  filter.type = "highpass";
  filter.frequency.value = 420;
  delay.delayTime.value = 0.105;
  feedback.gain.value = Number(els.echoControl.value);
  wet.gain.value = Number(els.echoControl.value) * 0.62;
  output.gain.value = 0.95;

  input.connect(dry);
  dry.connect(output);
  input.connect(filter);
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  output.connect(ctx.destination);

  return input;
}

function scheduleSource(buffer, startAt, playbackRate, gainValue = 1) {
  const ctx = state.audioContext;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const chain = createVoiceChain();

  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = gainValue;
  source.connect(gain);
  gain.connect(chain);
  source.addEventListener("ended", () => {
    state.activeSources.delete(source);
    if (state.activeSources.size === 0 && !state.recording) {
      setMode("idle");
      setStatus(messages.ready);
    }
  });
  state.activeSources.add(source);
  source.start(startAt);
}

async function playMatsumura() {
  if (!state.lastBuffer) return;
  stopPlayback();
  await ensureAudioContext();

  const speed = Number(els.speedControl.value);
  const ctx = state.audioContext;
  const now = ctx.currentTime + 0.04;
  const duration = state.lastBuffer.duration / speed;
  const shouldRepeat = els.repeatControl.checked && state.lastBuffer.duration < 4.8;

  setMode("playing");
  setStatus(messages.playing);
  scheduleSource(state.lastBuffer, now, speed, 1);

  if (shouldRepeat) {
    scheduleSource(state.lastBuffer, now + duration + 0.08, speed * 1.08, 0.78);
  }
}

function clearMemory() {
  stopPlayback();
  state.lastBuffer = null;
  els.replayButton.disabled = true;
  els.clearButton.disabled = true;
  setStatus(messages.idle);
}

els.matsumuraImage.addEventListener("error", () => {
  els.matsumuraImage.classList.add("is-missing");
  document.body.classList.remove("has-matsumura");
  els.parrotFallback.hidden = false;
});

els.matsumuraImage.addEventListener("load", () => {
  document.body.classList.add("has-matsumura");
  els.parrotFallback.hidden = true;
});

els.recordButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  state.pointerStarted = true;
  state.ignoreNextClick = true;
  startRecording();
});

window.addEventListener("pointerup", () => {
  if (state.pointerStarted) {
    state.pointerStarted = false;
    stopRecording();
  }
});

window.addEventListener("pointercancel", () => {
  if (state.pointerStarted) {
    state.pointerStarted = false;
    stopRecording();
  }
});

els.recordButton.addEventListener("click", () => {
  if (state.ignoreNextClick) {
    state.ignoreNextClick = false;
    return;
  }

  if (state.recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

els.replayButton.addEventListener("click", playMatsumura);
els.clearButton.addEventListener("click", clearMemory);

els.speedControl.addEventListener("input", () => {
  if (state.lastBuffer && document.body.classList.contains("playing")) {
    playMatsumura();
  }
});

els.echoControl.addEventListener("input", () => {
  if (state.lastBuffer && document.body.classList.contains("playing")) {
    playMatsumura();
  }
});

setStatus(messages.idle);
