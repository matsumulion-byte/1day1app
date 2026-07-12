const API_BASES = [
  "https://de1.api.radio-browser.info/json",
  "https://fi1.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json"
];

const FALLBACK_STATIONS = [
  { stationuuid: "fallback-fr-rmc", name: "RMC", url_resolved: "https://audio.bfmtv.com/rmcradio_128.mp3", homepage: "https://rmc.bfmtv.com/", tags: "talk,sport,news", country: "France", countrycode: "FR", state: "Paris", codec: "MP3", hls: 0 },
  { stationuuid: "fallback-us-soma", name: "SomaFM Groove Salad", url_resolved: "https://ice1.somafm.com/groovesalad-128-mp3", homepage: "https://somafm.com/groovesalad/", tags: "ambient,electronic", country: "United States", countrycode: "US", state: "San Francisco", codec: "MP3", hls: 0 },
  { stationuuid: "fallback-de-dlf", name: "Deutschlandfunk", url_resolved: "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3", homepage: "https://www.deutschlandfunk.de/", tags: "news,culture,talk", country: "Germany", countrycode: "DE", state: "Köln", codec: "MP3", hls: 0 },
  { stationuuid: "fallback-nl-npo", name: "NPO Radio 1", url_resolved: "https://icecast.omroep.nl/radio1-bb-mp3", homepage: "https://www.nporadio1.nl/", tags: "news,talk", country: "The Netherlands", countrycode: "NL", state: "Hilversum", codec: "MP3", hls: 0 }
];

const COUNTRIES = [
  { code: "JP", name: "日本", flag: "🇯🇵" },
  { code: "BR", name: "ブラジル", flag: "🇧🇷" },
  { code: "FR", name: "フランス", flag: "🇫🇷" },
  { code: "DE", name: "ドイツ", flag: "🇩🇪" },
  { code: "IN", name: "インド", flag: "🇮🇳" },
  { code: "ZA", name: "南アフリカ", flag: "🇿🇦" },
  { code: "AU", name: "オーストラリア", flag: "🇦🇺" },
  { code: "CA", name: "カナダ", flag: "🇨🇦" },
  { code: "MX", name: "メキシコ", flag: "🇲🇽" },
  { code: "AR", name: "アルゼンチン", flag: "🇦🇷" },
  { code: "NO", name: "ノルウェー", flag: "🇳🇴" },
  { code: "GR", name: "ギリシャ", flag: "🇬🇷" },
  { code: "ID", name: "インドネシア", flag: "🇮🇩" },
  { code: "KR", name: "韓国", flag: "🇰🇷" },
  { code: "NZ", name: "ニュージーランド", flag: "🇳🇿" },
  { code: "ES", name: "スペイン", flag: "🇪🇸" },
  { code: "US", name: "アメリカ", flag: "🇺🇸" },
  { code: "NL", name: "オランダ", flag: "🇳🇱" }
];

const els = Object.fromEntries([
  "soundButton", "liveLamp", "statusText", "roundText", "frequency", "bandLabel", "meterFill",
  "visualizer", "message", "subMessage", "tuneButton", "skipButton", "guessPanel", "countryGrid",
  "timer", "revealButton", "resultPanel", "resultKicker", "flag", "countryName", "stationLocation",
  "stationName", "stationTags", "resultMessage", "stationLink", "nextButton", "collection", "radio"
].map(id => [id, document.getElementById(id)]));

let currentStation = null;
let currentCountry = null;
let candidateCountries = [];
let round = 0;
let timerId = null;
let seconds = 30;
let muted = false;
let stationPool = [];
let failedIds = new Set();
let received = new Set(JSON.parse(localStorage.getItem("earthReceiverCountries") || "[]"));

for (let i = 0; i < 31; i += 1) {
  const bar = document.createElement("i");
  bar.style.setProperty("--i", i);
  bar.style.setProperty("--h", 4 + Math.floor(Math.random() * 27));
  els.visualizer.appendChild(bar);
}

function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function countryByCode(code) { return COUNTRIES.find(country => country.code === code); }

function updateCollection() {
  els.collection.textContent = `受信国 ${received.size}`;
}

function setState(state) {
  document.body.classList.toggle("scanning", state === "scanning");
  document.body.classList.toggle("playing", state === "playing");
  els.liveLamp.classList.toggle("on", state === "playing");
  els.statusText.textContent = state === "scanning" ? "SCANNING..." : state === "playing" ? "LIVE SIGNAL" : "READY TO TUNE";
}

function fakeFrequency() {
  els.frequency.textContent = (76 + Math.random() * 32).toFixed(1);
}

async function fetchStations(code) {
  let data = null;
  for (const base of shuffle(API_BASES)) {
    try {
      const url = `${base}/stations/bycountrycodeexact/${code}?hidebroken=true&order=clickcount&reverse=true&limit=40`;
      const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
      if (!response.ok) continue;
      data = await response.json();
      break;
    } catch { /* try the next public mirror */ }
  }
  if (!data) return FALLBACK_STATIONS.filter(station => station.countrycode === code);
  return data.filter(station =>
    station.url_resolved &&
    station.url_resolved.startsWith("https://") &&
    Number(station.hls) === 0 &&
    !failedIds.has(station.stationuuid) &&
    ["mp3", "aac", "ogg"].includes((station.codec || "").toLowerCase())
  );
}

async function playWithTimeout(station) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      els.radio.onplaying = null;
      els.radio.onerror = null;
      ok ? resolve() : reject(new Error("stream failed"));
    };
    const timeout = setTimeout(() => done(true), 4200);
    els.radio.onplaying = () => done(true);
    els.radio.onerror = () => done(station.stationuuid.startsWith("fallback-"));
    els.radio.src = station.url_resolved;
    els.radio.volume = muted ? 0 : .82;
    const playback = els.radio.play();
    if (playback) playback.then(() => done(true)).catch(() => done(false));
  });
}

async function tune() {
  clearInterval(timerId);
  els.radio.pause();
  els.guessPanel.hidden = true;
  els.resultPanel.hidden = true;
  els.tuneButton.disabled = true;
  els.skipButton.disabled = true;
  els.tuneButton.classList.add("turning");
  setState("scanning");
  els.message.textContent = "電波を探しています…";
  els.subMessage.textContent = "遠い街の生放送へ接続中";
  els.bandLabel.textContent = "SEARCHING WORLD WIDE BAND";
  const scanTicker = setInterval(fakeFrequency, 110);

  try {
    let countryAttempts = 0;
    while (countryAttempts < 5) {
      countryAttempts += 1;
      currentCountry = randomItem(COUNTRIES.filter(c => c.code !== currentCountry?.code));
      stationPool = await fetchStations(currentCountry.code);
      if (!stationPool.length) continue;

      const playableCandidates = shuffle(stationPool.slice(0, 24)).slice(0, 4);
      for (const candidate of playableCandidates) {
        currentStation = candidate;
        try {
          await playWithTimeout(currentStation);
          break;
        } catch {
          failedIds.add(currentStation.stationuuid);
          currentStation = null;
        }
      }
      if (currentStation) break;
    }
    if (!currentStation) {
      currentStation = randomItem(FALLBACK_STATIONS.filter(station => !failedIds.has(station.stationuuid)));
      if (currentStation) {
        currentCountry = countryByCode(currentStation.countrycode);
        playWithTimeout(currentStation).catch(() => {});
      }
    }
    if (!currentStation) throw new Error("no playable stream");

    clearInterval(scanTicker);
    round += 1;
    els.roundText.textContent = String(round).padStart(2, "0");
    els.frequency.textContent = (76 + Math.random() * 32).toFixed(1);
    els.bandLabel.textContent = "LOCATION ENCRYPTED";
    els.meterFill.style.width = `${58 + Math.random() * 38}%`;
    els.message.textContent = "受信しました。耳を澄ませて。";
    els.subMessage.textContent = "言葉、音楽、CM、時報がヒントです。";
    setState("playing");
    els.skipButton.disabled = false;
    showGuessOptions();
  } catch (error) {
    clearInterval(scanTicker);
    setState("idle");
    els.frequency.textContent = "NO SIG";
    els.message.textContent = "電波をつかめませんでした。";
    els.subMessage.textContent = "配信状況は刻々と変わります。もう一度どうぞ。";
  } finally {
    els.tuneButton.disabled = false;
    setTimeout(() => els.tuneButton.classList.remove("turning"), 350);
  }
}

function showGuessOptions() {
  const wrong = shuffle(COUNTRIES.filter(c => c.code !== currentCountry.code)).slice(0, 5);
  candidateCountries = shuffle([currentCountry, ...wrong]);
  els.countryGrid.innerHTML = "";
  candidateCountries.forEach(country => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "country-option";
    button.innerHTML = `<span>${country.flag}</span>${country.name}`;
    button.addEventListener("click", () => reveal(country.code));
    els.countryGrid.appendChild(button);
  });
  seconds = 30;
  els.timer.textContent = seconds;
  els.guessPanel.hidden = false;
  timerId = setInterval(() => {
    seconds -= 1;
    els.timer.textContent = seconds;
    if (seconds <= 0) reveal(null);
  }, 1000);
}

function reveal(guessCode) {
  if (!currentStation || els.guessPanel.hidden) return;
  clearInterval(timerId);
  const correct = guessCode === currentCountry.code;
  els.guessPanel.hidden = true;
  els.resultPanel.hidden = false;
  els.resultKicker.textContent = correct ? "DIRECT HIT — 正解" : "SIGNAL FOUND — 答え";
  els.flag.textContent = currentCountry.flag;
  els.countryName.textContent = currentCountry.name;
  els.stationLocation.textContent = [currentStation.state, currentStation.country].filter(Boolean).join(" / ") || "LOCATION UNKNOWN";
  els.stationName.textContent = currentStation.name || "NAME UNKNOWN";
  els.stationTags.textContent = (currentStation.tags || currentStation.codec || "LIVE RADIO").split(",").slice(0, 3).join(" · ").toUpperCase();
  els.resultMessage.textContent = correct
    ? `音だけで当てました。残り${seconds}秒、見事な受信です。`
    : `${currentCountry.name}から届いている、現在進行形の音です。しばらく聴いてみましょう。`;
  els.stationLink.href = currentStation.homepage || currentStation.url_resolved;
  received.add(currentCountry.code);
  localStorage.setItem("earthReceiverCountries", JSON.stringify([...received]));
  updateCollection();
  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

els.tuneButton.addEventListener("click", tune);
els.skipButton.addEventListener("click", tune);
els.nextButton.addEventListener("click", tune);
els.revealButton.addEventListener("click", () => reveal(null));
els.soundButton.addEventListener("click", () => {
  muted = !muted;
  els.radio.volume = muted ? 0 : .82;
  els.soundButton.textContent = muted ? "MUTE" : "VOL";
});

document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", event => {
  if (event.target.closest("button")) event.preventDefault();
});

updateCollection();
fakeFrequency();
