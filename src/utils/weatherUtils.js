// ============================================================
//  TripVault – Weather Utilities
//  Uses Open-Meteo APIs – 100% free, no API key required.
// ============================================================

/**
 * Geocode a city name → { latitude, longitude, name, country }
 * Uses Open-Meteo Geocoding API.
 */
export const geocodeCity = async (cityName) => {
  const query = encodeURIComponent(cityName.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${cityName}" not found`);
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
};

/**
 * Fetch 7-day weather forecast starting from today.
 * Returns an array of daily objects.
 */
export const fetchForecastWeather = async (latitude, longitude) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('daily', [
    'weathercode',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'windspeed_10m_max',
  ].join(','));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '8');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Forecast fetch failed');
  const data = await res.json();
  return parseDailyData(data.daily);
};

/**
 * Fetch past 7 days of historical weather (yesterday back 7 days).
 * Open-Meteo archive only goes up to yesterday.
 */
export const fetchHistoricalWeather = async (latitude, longitude) => {
  const today = new Date();

  // end = yesterday (archive doesn't include today)
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1);

  // start = 7 days before yesterday
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const fmt = (d) => d.toISOString().split('T')[0];

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('start_date', fmt(startDate));
  url.searchParams.set('end_date', fmt(endDate));
  url.searchParams.set('daily', [
    'weathercode',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'windspeed_10m_max',
  ].join(','));
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Historical fetch failed');
  const data = await res.json();

  // Historical API doesn't return precipitation_probability_max, so we pad it
  const days = parseDailyData(data.daily);
  return days.map((d) => ({ ...d, precipitationProbability: null }));
};

// -----------------------------------------------------------
//  Internal helpers
// -----------------------------------------------------------

const parseDailyData = (daily) => {
  if (!daily || !daily.time) return [];
  return daily.time.map((date, i) => ({
    date,
    weatherCode: daily.weathercode?.[i] ?? 0,
    tempMax: daily.temperature_2m_max?.[i] ?? null,
    tempMin: daily.temperature_2m_min?.[i] ?? null,
    precipitation: daily.precipitation_sum?.[i] ?? 0,
    precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
    windspeed: daily.windspeed_10m_max?.[i] ?? null,
  }));
};

// -----------------------------------------------------------
//  WMO Weather Interpretation Codes → emoji + label
//  Reference: https://open-meteo.com/en/docs#weathervariables
// -----------------------------------------------------------
export const getWeatherInfo = (code) => {
  if (code === 0)              return { emoji: '☀️',  label: 'Clear Sky' };
  if (code === 1)              return { emoji: '🌤️', label: 'Mainly Clear' };
  if (code === 2)              return { emoji: '⛅',  label: 'Partly Cloudy' };
  if (code === 3)              return { emoji: '🌥️', label: 'Overcast' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Foggy' };
  if (code >= 51 && code <= 55) return { emoji: '🌦️', label: 'Drizzle' };
  if (code === 56 || code === 57) return { emoji: '🌨️', label: 'Freezing Drizzle' };
  if (code >= 61 && code <= 65) return { emoji: '🌧️', label: 'Rain' };
  if (code === 66 || code === 67) return { emoji: '🌨️', label: 'Freezing Rain' };
  if (code >= 71 && code <= 77) return { emoji: '❄️',  label: 'Snow' };
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'Rain Showers' };
  if (code === 85 || code === 86) return { emoji: '🌨️', label: 'Snow Showers' };
  if (code === 95)              return { emoji: '⛈️',  label: 'Thunderstorm' };
  if (code >= 96 && code <= 99) return { emoji: '⛈️',  label: 'Thunderstorm w/ Hail' };
  return { emoji: '🌡️', label: 'Unknown' };
};

/**
 * Format a YYYY-MM-DD date string to a short day label.
 * Returns "Today" if the date matches local today.
 */
export const formatDayLabel = (dateStr) => {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Format a YYYY-MM-DD date string to "Jul 7" style.
 */
export const formatShortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
