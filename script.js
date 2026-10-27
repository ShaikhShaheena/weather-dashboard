// ===== 1. WEATHER CODES → icon, text, background =====
function describe(code, isDay = 1) {
  if (code === 0) return isDay ? ['☀️', 'Clear sky', 'clear'] : ['🌙', 'Clear night', 'night'];
  if (code <= 2) return isDay ? ['⛅', 'Partly cloudy', 'cloudy'] : ['☁️', 'Partly cloudy', 'night'];
  if (code === 3) return ['☁️', 'Cloudy', 'cloudy'];
  if (code <= 48) return ['🌫️', 'Foggy', 'cloudy'];
  if (code <= 67 || (code >= 80 && code <= 82)) return ['🌧️', 'Rain', 'rain'];
  if (code <= 77 || code === 85 || code === 86) return ['❄️', 'Snow', 'snow'];
  return ['⛈️', 'Thunderstorm', 'storm'];
}

// ===== 2. HELPERS =====
const $ = id => document.getElementById(id);
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

let recent = load('recent', []);

// ===== 3. CITY NAME → coordinates =====
async function searchCity(name) {
  showLoader();
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
    const data = await res.json();
    if (!data.results) return showError(`City "${name}" not found 😕`);
    const place = data.results[0];
    addRecent(place.name);
    getWeather(place.latitude, place.longitude, `${place.name}, ${place.country}`);
  } catch {
    showError('Could not connect. Check your internet 🌐');
  }
}

// ===== 4. GET WEATHER =====
async function getWeather(lat, lon, placeName) {
  showLoader();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=6`;
    const data = await (await fetch(url)).json();
    showCurrent(data.current, placeName);
    showForecast(data.daily);
  } catch {
    showError('Could not load the weather 😕');
  }
}

// ===== 5. SHOW CURRENT WEATHER =====
function showCurrent(c, placeName) {
  const [icon, text, theme] = describe(c.weather_code, c.is_day);
  document.body.className = theme;
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  $('current').innerHTML = `
    <p class="place">📍 ${placeName}</p>
    <p class="date">${date}</p>
    <div class="main">
      <div class="big-icon">${icon}</div>
      <div>
        <p class="temp">${Math.round(c.temperature_2m)}°C</p>
        <p class="desc">${text}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><span>Feels like</span><b>${Math.round(c.apparent_temperature)}°C</b></div>
      <div class="stat"><span>Humidity</span><b>${c.relative_humidity_2m}%</b></div>
      <div class="stat"><span>Wind</span><b>${Math.round(c.wind_speed_10m)} km/h</b></div>
    </div>`;
  // restart the fade-in animation
  $('current').style.animation = 'none'; void $('current').offsetWidth; $('current').style.animation = '';
}

// ===== 6. SHOW 5-DAY FORECAST (skip today) =====
function showForecast(d) {
  $('forecast').innerHTML = d.time.slice(1).map((day, i) => {
    const [icon, text] = describe(d.weather_code[i + 1]);
    const name = new Date(day).toLocaleDateString('en-GB', { weekday: 'short' });
    return `
      <div class="day glass" style="animation-delay:${i * 0.1}s" title="${text}">
        <b>${name}</b>
        <div class="icon">${icon}</div>
        <b>${Math.round(d.temperature_2m_max[i + 1])}°</b>
        <small> / ${Math.round(d.temperature_2m_min[i + 1])}°</small>
      </div>`;
  }).join('');
}

// ===== 7. LOADER + ERROR =====
function showLoader() {
  $('current').innerHTML = '<div class="loader"></div>';
}
function showError(message) {
  $('current').innerHTML = `<p class="error">${message}</p>`;
  $('forecast').innerHTML = '';
}

// ===== 8. RECENT SEARCHES (saved, max 5) =====
function addRecent(name) {
  recent = [name, ...recent.filter(r => r !== name)].slice(0, 5);
  save('recent', recent);
  showRecent();
}
function showRecent() {
  $('recent').innerHTML = recent.map(r => `<button>${r}</button>`).join('');
}
$('recent').addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') searchCity(e.target.textContent);
});

// ===== 9. SEARCH FORM =====
$('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const city = $('city').value.trim();
  if (city) searchCity(city);
  $('city').value = '';
});

// ===== 10. MY LOCATION =====
$('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) return showError('Location is not supported 😕');
  showLoader();
  navigator.geolocation.getCurrentPosition(
    pos => getWeather(pos.coords.latitude, pos.coords.longitude, 'Your location'),
    () => showError('Location permission denied 🔒')
  );
});

// ===== START =====
showRecent();
searchCity(recent[0] || 'Abu Dhabi');