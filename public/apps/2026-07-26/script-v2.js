(() => {
  const $ = (id) => document.getElementById(id);
  const scenes = [...document.querySelectorAll(".scene")];
  const wave = $("wave");
  let ctx, analyser, stream, source, frame, timerId, endAt, startedAt, recorder;
  let peaks = 0, energy = 0, samples = 0, sharpness = 0, soundOn = true;
  let recordedProfile = null, audioUrl = "", audioChunks = [], powerSamples = [], moments = [], lastPeakAt = -1;

  for (let i = 0; i < 52; i++) wave.appendChild(document.createElement("i"));
  const bars = [...wave.children];

  function show(id) {
    scenes.forEach((scene) => scene.classList.toggle("active", scene.id === id));
  }

  async function startListening() {
    resetAudio();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("microphone unavailable");
      const request = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream = await Promise.race([
        request,
        new Promise((_, reject) => setTimeout(() => reject(new Error("permission timeout")), 3000))
      ]);
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      peaks = 0; energy = 0; samples = 0; sharpness = 0;
      audioChunks = []; powerSamples = []; moments = []; lastPeakAt = -1;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = "";
      if (window.MediaRecorder) {
        recorder = new MediaRecorder(stream);
        recorder.addEventListener("dataavailable", (event) => { if (event.data.size) audioChunks.push(event.data); });
        recorder.start();
      }
      startedAt = Date.now();
      endAt = Date.now() + 20000;
      show("listen");
      timerId = setInterval(updateTimer, 200);
      analyse();
    } catch {
      show("permission");
    }
  }

  function analyse() {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0, high = 0;
    data.forEach((v, i) => { sum += v; if (i > data.length * .55) high += v; });
    const avg = sum / data.length;
    const hi = high / (data.length * .45);
    energy += avg; sharpness += hi; samples++;
    powerSamples.push(avg);
    const elapsed = (Date.now() - startedAt) / 1000;
    const baseline = samples > 8 ? energy / samples : 12;
    if (elapsed - lastPeakAt > .7 && avg > 25 && avg > baseline * 1.55) {
      peaks++;
      lastPeakAt = elapsed;
      moments.push({ time: elapsed, power: avg, type: hi > avg * .32 ? "高い音" : avg > 48 ? "強い物音" : "小さな物音" });
    }
    const power = Math.min(1, avg / 65);
    $("pulse").style.transform = `scale(${.58 + power * .7})`;
    bars.forEach((bar, i) => {
      const bin = data[Math.floor(i / bars.length * data.length)];
      bar.style.height = `${3 + Math.min(38, bin * .16)}px`;
    });
    const labels = ["遠くの音まで拾っています…","壁の向こうで、何かが鳴りました","いまの音を記録しました","まだ、聴いています…"];
    $("listenStatus").textContent = peaks ? labels[Math.min(3, peaks)] : labels[0];
    frame = requestAnimationFrame(analyse);
  }

  function updateTimer() {
    const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    $("timer").textContent = String(remain).padStart(2, "0");
    if (!remain) finishListening();
  }

  function resetAudio() {
    clearInterval(timerId);
    cancelAnimationFrame(frame);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (ctx && ctx.state !== "closed") ctx.close();
    stream = ctx = analyser = source = null;
  }

  function finishListening(silent = false) {
    const avg = samples ? energy / samples : 4;
    const hi = samples ? sharpness / samples : 1;
    const seconds = silent || !endAt ? 0 : Math.max(1, Math.min(20, Math.round(20 - (endAt - Date.now()) / 1000)));
    recordedProfile = { avg, hi, peaks: silent ? 0 : peaks, seconds, moments: silent ? [] : moments };
    if (recorder?.state === "recording") {
      recorder.addEventListener("stop", prepareRecording, { once: true });
      recorder.stop();
    } else {
      prepareRecording();
    }
    resetAudio();
    $("detectedText").textContent = peaks ? `${toKanji(Math.min(peaks, 5))}つ、音がしました。` : "静けさの底に、音がありました。";
    show("writing");
    setTimeout(makeStory, 2400);
  }

  function toKanji(n) { return ["零","一","二","三","四","五"][n]; }

  function prepareRecording() {
    if (!audioChunks.length) return;
    audioUrl = URL.createObjectURL(new Blob(audioChunks, { type: recorder?.mimeType || "audio/webm" }));
    $("recordedAudio").src = audioUrl;
  }

  const stories = {
    quiet: (p) => ({
      title: "無音ではない",
      lines: [
        `${p.seconds || "二十"}秒間、部屋から音はひとつも見つからなかった。`,
        "波形は平らなのに、聴き返すと最後に小さな声がある。",
        "「もう息をしていいよ」",
        "それは録音ではなく、いま耳元で聞こえた。"
      ]
    }),
    water: (p) => ({
      title: "濡れた音",
      lines: [
        `${keyMoment(p).time.toFixed(1)}秒に、高く短い音が残っている。`,
        "水滴に似ている。けれど再生するたび、落ちる場所が近くなる。",
        "三度目には、音はイヤホンの左右ではなく、真下からした。",
        "端末の裏側を確かめるのは、物語を読み終えてからにしてください。"
      ]
    }),
    steps: (p) => ({
      title: "数えなおし",
      lines: [
        `波形には、${p.peaks}つの物音が並んでいる。`,
        `いちばん大きいのは${keyMoment(p).time.toFixed(1)}秒。そこだけ、足音のように二度鳴る。`,
        `けれどマーカーは${p.peaks}つしかない。`,
        "数えなおさないで。印のない一歩は、録音の外にいる。"
      ]
    }),
    wall: (p) => ({
      title: "内側から",
      lines: [
        `${keyMoment(p).time.toFixed(1)}秒に、壁を叩くような音が残っている。`,
        "その前後を繰り返すと、三文字ずつ、同じ言葉に聞こえてくる。",
        "「あけて」「あけて」「あけて」",
        "最後の一回だけは録音ではない。端末の内側から続きが聞こえる。"
      ]
    })
  };

  function keyMoment(p) {
    return p.moments?.reduce((best, item) => item.power > best.power ? item : best, p.moments[0]) || { time: Math.max(1, p.seconds * .72), power: 0 };
  }

  function selectStory() {
    const p = recordedProfile || { avg: 3, hi: 1, peaks: 0, seconds: 20 };
    if (p.peaks >= 3) return stories.steps(p);
    if (p.hi > 9) return stories.water(p);
    if (p.avg > 15 || p.peaks) return stories.wall(p);
    return stories.quiet(p);
  }

  function makeStory() {
    const story = selectStory();
    $("storyTitle").textContent = story.title;
    $("storyBody").innerHTML = story.lines.map((line) => `<p>${line}</p>`).join("");
    renderTrace();
    show("result");
  }

  function renderTrace() {
    const waveEl = $("recordingWave");
    const count = 48;
    const group = Math.max(1, Math.ceil(powerSamples.length / count));
    const values = Array.from({ length: count }, (_, i) => {
      const slice = powerSamples.slice(i * group, (i + 1) * group);
      return slice.length ? Math.max(...slice) : 0;
    });
    waveEl.innerHTML = values.map((value) => `<i style="height:${Math.max(4, Math.min(48, value * .65))}px"></i>`).join("");
    const duration = recordedProfile?.seconds || 20;
    moments.slice(0, 5).forEach((moment) => {
      const marker = document.createElement("b");
      marker.style.left = `${Math.min(99, moment.time / duration * 100)}%`;
      waveEl.appendChild(marker);
    });
    const list = $("momentList");
    list.innerHTML = "";
    moments.slice(0, 5).forEach((moment) => {
      const button = document.createElement("button");
      button.className = "moment";
      button.innerHTML = `<strong>${moment.time.toFixed(1)}秒</strong>${moment.type}`;
      button.addEventListener("click", () => playMoment(moment.time, button));
      list.appendChild(button);
    });
    if (!moments.length) list.innerHTML = `<span class="moment"><strong>検出なし</strong>目立つ物音はありません</span>`;
    const playable = Boolean(audioUrl || audioChunks.length);
    $("playRecordingBtn").disabled = !playable;
    $("traceNote").textContent = playable ? "マーカーを押すと、その音の前後を再生します。" : "マイク録音なしで生成しました。";
  }

  function playMoment(time, button) {
    const audio = $("recordedAudio");
    if (!audioUrl || !soundOn) return;
    document.querySelectorAll(".moment").forEach((item) => item.classList.remove("is-playing"));
    if (button) button.classList.add("is-playing");
    audio.currentTime = Math.max(0, time - 1);
    audio.play();
    setTimeout(() => { audio.pause(); button?.classList.remove("is-playing"); }, 3000);
  }

  function toggleRecording() {
    const audio = $("recordedAudio");
    if (!audioUrl || !soundOn) return;
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play();
      $("playRecordingBtn").textContent = "■ 停止する";
    } else {
      audio.pause();
      $("playRecordingBtn").textContent = "▶ 全体を聴く";
    }
  }

  $("beginBtn").addEventListener("click", startListening);
  $("permissionRetry").addEventListener("click", startListening);
  $("silentBtn").addEventListener("click", () => finishListening(true));
  $("stopBtn").addEventListener("click", () => finishListening());
  $("retryBtn").addEventListener("click", () => show("intro"));
  $("playRecordingBtn").addEventListener("click", toggleRecording);
  $("recordedAudio").addEventListener("ended", () => { $("playRecordingBtn").textContent = "▶ 全体を聴く"; });
  $("soundToggle").addEventListener("click", () => {
    soundOn = !soundOn;
    $("soundToggle").textContent = `音　${soundOn ? "入" : "切"}`;
  });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
})();
