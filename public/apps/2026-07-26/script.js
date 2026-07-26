(() => {
  const $ = (id) => document.getElementById(id);
  const scenes = [...document.querySelectorAll(".scene")];
  const wave = $("wave");
  let ctx, analyser, stream, source, frame, timerId, endAt;
  let peaks = 0, energy = 0, samples = 0, sharpness = 0, soundOn = true;
  let recordedProfile = null;

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
    if (avg > 34 && (samples < 2 || avg > energy / samples * 1.6)) peaks++;
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
    recordedProfile = { avg, hi, peaks: silent ? 0 : peaks };
    resetAudio();
    $("detectedText").textContent = peaks ? `${toKanji(Math.min(peaks, 5))}つ、音がしました。` : "静けさの底に、音がありました。";
    show("writing");
    setTimeout(makeStory, 2400);
  }

  function toKanji(n) { return ["零","一","二","三","四","五"][n]; }

  const stories = {
    quiet: {
      title: "息をする部屋",
      lines: ["夜、部屋の音をすべて消してみた。","時計も、冷蔵庫も、私の呼吸も止めた。","それでも枕元から、ゆっくり息を吐く音がする。","私が息を吸うと、それも一緒に吸った。"]
    },
    water: {
      title: "水の間",
      lines: ["誰もいない台所から、水滴の音がした。","蛇口を固く締めると、音は背後へ移った。","ぽたり。今度は、私の肩から聞こえた。","振り向けないまま、床に水たまりが広がっている。"]
    },
    steps: {
      title: "ひとつ多い",
      lines: ["廊下を歩くと、足音がひとつ多い。","止まれば止まり、急げばぴたりとついてくる。","部屋に駆け込み、戸を閉めた。","安心した私の後ろで、最後の一歩が鳴った。"]
    },
    wall: {
      title: "壁の返事",
      lines: ["壁の向こうで、三度、何かが鳴った。","私は冗談で、同じ間隔を叩き返した。","しばらくして、壁ではなく押入れから返事がした。","今度は、私が叩いていない数で。"]
    }
  };

  function selectStory() {
    const p = recordedProfile || { avg: 3, hi: 1, peaks: 0 };
    if (p.peaks >= 3) return stories.steps;
    if (p.hi > 9) return stories.water;
    if (p.avg > 15 || p.peaks) return stories.wall;
    return stories.quiet;
  }

  function makeStory() {
    const story = selectStory();
    $("storyTitle").textContent = story.title;
    $("storyBody").innerHTML = story.lines.map((line) => `<p>${line}</p>`).join("");
    show("result");
  }

  function playHaunt() {
    if (!soundOn) return;
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    gain.connect(filter).connect(audio.destination);
    filter.type = "lowpass"; filter.frequency.value = 620;
    gain.gain.setValueAtTime(.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.17, audio.currentTime + .6);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + 4.8);
    [110, 147, 196].forEach((freq, i) => {
      const osc = audio.createOscillator();
      osc.type = i ? "sine" : "sawtooth";
      osc.frequency.setValueAtTime(freq, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * .62, audio.currentTime + 4.5);
      osc.connect(gain); osc.start(); osc.stop(audio.currentTime + 5);
    });
    setTimeout(() => audio.close(), 5200);
  }

  $("beginBtn").addEventListener("click", startListening);
  $("permissionRetry").addEventListener("click", startListening);
  $("silentBtn").addEventListener("click", () => finishListening(true));
  $("stopBtn").addEventListener("click", () => finishListening());
  $("retryBtn").addEventListener("click", () => show("intro"));
  $("replayBtn").addEventListener("click", playHaunt);
  $("soundToggle").addEventListener("click", () => {
    soundOn = !soundOn;
    $("soundToggle").textContent = `音　${soundOn ? "入" : "切"}`;
  });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
})();
