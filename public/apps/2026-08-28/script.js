"use strict";

const TOKYO = { latitude: 35.6812, longitude: 139.7671 };
const weatherInfo = {
  clear: { label: "晴れ", icon: "☀️" }, cloudy: { label: "曇り", icon: "☁️" },
  rain: { label: "雨", icon: "🌧️" }, snow: { label: "雪", icon: "❄️" }, thunder: { label: "雷", icon: "⛈️" }
};
const comments = {
  legend: ["空の声が聞こえています。見事な予報でした！", "気象衛星もびっくりの精度です！", "次の台風中継はあなたにお任せします！"],
  caster: ["お茶の間に安心を届けるナイス予報！", "その読み、朝の番組で披露できます。", "前線の気持ちがかなり分かっています！"],
  watcher: ["雲を眺めた時間は裏切りません。", "いい線です。もう少し空と仲良くなれそう！", "窓の外を見る習慣が実を結びました。"],
  geta: ["今日は下駄に聞いたほうがよかったかも。", "空は気まぐれ。次の予報でリベンジ！", "予報は外れても、挑戦心は快晴です！"]
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let state = { current: null, target: null, selectedWeather: null, score: 0, rank: "" };
let revealTimer;

function showScreen(id) {
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function classifyWeather(code) {
  if (code === 0 || code === 1) return "clear";
  if ([2, 3, 45, 48].includes(code)) return "cloudy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunder";
  return "cloudy";
}

function updateClock() {
  $("#headerClock").textContent = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function requestLocation() {
  $("#startError").hidden = true;
  if (!navigator.geolocation) return showLocationError("このブラウザは位置情報に対応していません。");
  showScreen("loadingScreen");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather(coords.latitude, coords.longitude, "現在地"),
    (error) => {
      const message = error.code === 1 ? "位置情報の利用が許可されていません。設定をご確認ください。" : "位置情報を確認できませんでした。電波状況をご確認ください。";
      showLocationError(message);
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
  );
}

function showLocationError(message) {
  showScreen("startScreen");
  $("#startErrorMessage").textContent = message;
  $("#startError").hidden = false;
}

async function loadWeather(latitude, longitude, label) {
  showScreen("loadingScreen");
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    timezone: "auto", forecast_days: "2"
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.current || !data.hourly || !Array.isArray(data.hourly.time)) throw new Error("Invalid weather data");
    const currentMs = new Date(data.current.time).getTime();
    const targetMs = currentMs + 3 * 60 * 60 * 1000;
    let targetIndex = 0;
    let smallestDiff = Infinity;
    data.hourly.time.forEach((time, index) => {
      const diff = Math.abs(new Date(time).getTime() - targetMs);
      if (diff < smallestDiff) { smallestDiff = diff; targetIndex = index; }
    });
    state.current = data.current;
    state.target = {
      time: data.hourly.time[targetIndex], temperature: Number(data.hourly.temperature_2m[targetIndex]),
      precipitation: Number(data.hourly.precipitation_probability[targetIndex] ?? 0), weatherCode: Number(data.hourly.weather_code[targetIndex])
    };
    state.selectedWeather = null;
    renderForecast(label);
  } catch (error) {
    console.warn("Weather request failed:", error.message);
    showLocationError("天気データを取得できませんでした。通信環境を確認して、もう一度お試しください。");
  }
}

function localDateLabel(value) {
  const d = new Date(value);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function renderForecast(label) {
  const kind = classifyWeather(Number(state.current.weather_code));
  document.body.className = `weather-${kind}`;
  $("#locationName").textContent = label;
  $("#currentTime").textContent = localDateLabel(state.current.time);
  $("#currentWeatherIcon").textContent = weatherInfo[kind].icon;
  $("#currentWeather").textContent = weatherInfo[kind].label;
  $("#currentTemp").textContent = Number(state.current.temperature_2m).toFixed(1);
  $("#currentHumidity").textContent = `${state.current.relative_humidity_2m}%`;
  $("#currentWind").textContent = `${Number(state.current.wind_speed_10m).toFixed(1)} km/h`;
  $("#targetTimeLabel").textContent = `${localDateLabel(state.target.time)} の予報`;
  const currentTemp = Number(state.current.temperature_2m);
  const slider = $("#tempSlider");
  slider.min = (Math.floor((currentTemp - 10) * 2) / 2).toFixed(1);
  slider.max = (Math.ceil((currentTemp + 10) * 2) / 2).toFixed(1);
  slider.value = (Math.round(currentTemp * 2) / 2).toFixed(1);
  $("#tempMin").textContent = `${slider.min}℃`;
  $("#tempMax").textContent = `${slider.max}℃`;
  $("#tempOutput").textContent = `${Number(slider.value).toFixed(1)}℃`;
  $("#rainSlider").value = "50";
  $("#rainOutput").textContent = "50%";
  $$(".weather-options button").forEach((button) => { button.classList.remove("selected"); button.setAttribute("aria-checked", "false"); });
  $("#submitButton").disabled = true;
  showScreen("forecastScreen");
}

function selectWeather(button) {
  state.selectedWeather = button.dataset.weather;
  $$(".weather-options button").forEach((item) => {
    const active = item === button;
    item.classList.toggle("selected", active);
    item.setAttribute("aria-checked", String(active));
  });
  $("#submitButton").disabled = false;
}

function calculateResult() {
  const userTemp = Number($("#tempSlider").value);
  const userRain = Number($("#rainSlider").value);
  const apiKind = classifyWeather(state.target.weatherCode);
  const weatherPoints = state.selectedWeather === apiKind ? 50 : 0;
  const tempPoints = Math.max(0, 25 - Math.abs(userTemp - state.target.temperature) / 0.5 * 2.5);
  const rainPoints = Math.max(0, 25 - Math.abs(userRain - state.target.precipitation) / 10 * 2.5);
  const score = Math.round(weatherPoints + tempPoints + rainPoints);
  state.score = score;
  const rank = score >= 90 ? { key: "legend", title: "伝説の気象予報士", icon: "🏆" } : score >= 70 ? { key: "caster", title: "お天気キャスター", icon: "🎤" } : score >= 40 ? { key: "watcher", title: "空を見がちな人", icon: "👀" } : { key: "geta", title: "下駄を投げる人", icon: "🩴" };
  state.rank = rank.title;
  $("#rankTitle").textContent = rank.title;
  $("#rankIcon").textContent = rank.icon;
  const choices = comments[rank.key];
  $("#rankComment").textContent = choices[Math.floor(Math.random() * choices.length)];
  $("#userWeather").textContent = `${weatherInfo[state.selectedWeather].icon} ${weatherInfo[state.selectedWeather].label}`;
  $("#apiWeather").textContent = `${weatherInfo[apiKind].icon} ${weatherInfo[apiKind].label}`;
  $("#weatherPoints").textContent = `${Math.round(weatherPoints)}点`;
  $("#userTemp").textContent = `${userTemp.toFixed(1)}℃`;
  $("#apiTemp").textContent = `${state.target.temperature.toFixed(1)}℃`;
  $("#tempPoints").textContent = `${Math.round(tempPoints)}点`;
  $("#userRain").textContent = `${userRain}%`;
  $("#apiRain").textContent = `${state.target.precipitation}%`;
  $("#rainPoints").textContent = `${Math.round(rainPoints)}点`;
  showScreen("revealScreen");
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => showResult(score), 2200);
}

function showResult(score) {
  showScreen("resultScreen");
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const value = Math.round(score * (1 - Math.pow(1 - progress, 3)));
    $("#scoreValue").textContent = value;
    $(".score-ring").style.background = `radial-gradient(circle,#087ed0 53%,transparent 55%),conic-gradient(var(--yellow) ${value * 3.6}deg,#e5f2f7 0)`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) score >= 90 ? confetti() : score < 40 && dropGeta();
}

function confetti() {
  const colors = ["#ffd447", "#ff4052", "#18c7b3", "#fff", "#0878ca"];
  for (let i = 0; i < 55; i += 1) {
    const piece = document.createElement("i"); piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`; piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * .9}s`; $("#effects").appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function dropGeta() {
  for (let i = 0; i < 7; i += 1) {
    const geta = document.createElement("span"); geta.className = "geta"; geta.textContent = "🩴";
    geta.style.left = `${5 + Math.random() * 85}vw`; geta.style.animationDelay = `${Math.random() * .7}s`; $("#effects").appendChild(geta);
    geta.addEventListener("animationend", () => geta.remove());
  }
}

async function shareResult() {
  const text = `気象予報士チャレンジで${state.score}点！称号は「${state.rank}」でした。\n#気象予報士チャレンジ`;
  try {
    if (navigator.share) await navigator.share({ title: "気象予報士チャレンジ", text, url: location.href });
    else window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${location.href}`)}`, "_blank", "noopener,noreferrer");
  } catch (error) { if (error.name !== "AbortError") console.warn("Share failed:", error.message); }
}

$("#startButton").addEventListener("click", requestLocation);
$("#retryButton").addEventListener("click", requestLocation);
$("#tokyoButton").addEventListener("click", () => loadWeather(TOKYO.latitude, TOKYO.longitude, "東京都心"));
$$(".weather-options button").forEach((button) => button.addEventListener("click", () => selectWeather(button)));
$("#tempSlider").addEventListener("input", (event) => { $("#tempOutput").textContent = `${Number(event.target.value).toFixed(1)}℃`; });
$("#rainSlider").addEventListener("input", (event) => { $("#rainOutput").textContent = `${event.target.value}%`; });
$("#submitButton").addEventListener("click", calculateResult);
$("#againButton").addEventListener("click", () => renderForecast($("#locationName").textContent));
$("#shareButton").addEventListener("click", shareResult);
updateClock(); setInterval(updateClock, 30000);
