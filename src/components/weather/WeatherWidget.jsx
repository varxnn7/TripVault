import { useState, useEffect, useCallback } from 'react';
import {
  geocodeCity,
  fetchForecastWeather,
  fetchHistoricalWeather,
  getWeatherInfo,
  formatDayLabel,
  formatShortDate,
} from '../../utils/weatherUtils';
import './WeatherWidget.css';

// ─── Skeleton card for loading state ───────────────────────────────────────
const SkeletonCard = () => (
  <div className="ww-card ww-skeleton" aria-hidden="true">
    <div className="ww-sk-bar ww-sk-day" />
    <div className="ww-sk-bar ww-sk-emoji" />
    <div className="ww-sk-bar ww-sk-temp" />
    <div className="ww-sk-bar ww-sk-label" />
  </div>
);

// ─── Single weather day card ────────────────────────────────────────────────
const WeatherCard = ({ day, isToday }) => {
  const { emoji, label } = getWeatherInfo(day.weatherCode);
  const hasProb = day.precipitationProbability !== null && day.precipitationProbability !== undefined;

  return (
    <div className={`ww-card ${isToday ? 'ww-card-today' : ''}`}>
      {isToday && <span className="ww-today-badge">Today</span>}
      <span className="ww-day-label">{formatDayLabel(day.date)}</span>
      <span className="ww-short-date">{formatShortDate(day.date)}</span>
      <span className="ww-emoji" title={label}>{emoji}</span>
      <span className="ww-label">{label}</span>
      <div className="ww-temps">
        {day.tempMax !== null && (
          <span className="ww-temp ww-temp-high" title="High">{Math.round(day.tempMax)}°</span>
        )}
        {day.tempMin !== null && (
          <span className="ww-temp ww-temp-low" title="Low">{Math.round(day.tempMin)}°</span>
        )}
      </div>
      {hasProb && (
        <div className="ww-precip" title={`${day.precipitationProbability}% chance of rain`}>
          <div className="ww-precip-bar">
            <div
              className="ww-precip-fill"
              style={{ width: `${day.precipitationProbability}%` }}
            />
          </div>
          <span className="ww-precip-label">💧 {day.precipitationProbability}%</span>
        </div>
      )}
      {!hasProb && day.precipitation > 0 && (
        <div className="ww-precip">
          <span className="ww-precip-label">💧 {day.precipitation.toFixed(1)} mm</span>
        </div>
      )}
    </div>
  );
};

// ─── Scrollable strip of cards with section title ──────────────────────────
const WeatherStrip = ({ title, days, todayStr }) => (
  <div className="ww-section">
    <p className="ww-section-title">{title}</p>
    <div className="ww-strip">
      {days.map((day) => (
        <WeatherCard key={day.date} day={day} isToday={day.date === todayStr} />
      ))}
    </div>
  </div>
);

// ─── Main WeatherWidget component ──────────────────────────────────────────
const WeatherWidget = ({ destination }) => {
  const [state, setState] = useState({
    loading: true,
    error: null,
    locationLabel: '',
    forecast: [],
    historical: [],
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    if (!destination) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Geocode the city
      const geo = await geocodeCity(destination);

      // 2. Fetch both in parallel
      const [forecast, historical] = await Promise.all([
        fetchForecastWeather(geo.latitude, geo.longitude),
        fetchHistoricalWeather(geo.latitude, geo.longitude),
      ]);

      setState({
        loading: false,
        error: null,
        locationLabel: `${geo.name}${geo.country ? `, ${geo.country}` : ''}`,
        forecast,
        historical,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Could not load weather data.',
      }));
    }
  }, [destination]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Render states ──────────────────────────────────────────────────────
  if (!destination) return null;

  return (
    <div className="ww-widget glass animate-fade-in-up stagger-3">
      {/* Header */}
      <div className="ww-header">
        <div className="ww-header-left">
          <span className="ww-icon-big">🌤️</span>
          <div>
            <h3 className="ww-title">Weather</h3>
            {state.locationLabel && (
              <p className="ww-location">{state.locationLabel}</p>
            )}
          </div>
        </div>
        <div className="ww-header-right">
          <button className="ww-refresh-btn" onClick={load} title="Refresh weather" disabled={state.loading}>
            <span className={state.loading ? 'ww-spin' : ''}>⟳</span>
          </button>
        </div>
      </div>

      {/* Loading skeletons */}
      {state.loading && (
        <div className="ww-section">
          <p className="ww-section-title">Loading weather data…</p>
          <div className="ww-strip">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {!state.loading && state.error && (
        <div className="ww-error">
          <span className="ww-error-emoji">🌍</span>
          <p className="ww-error-text">{state.error}</p>
          <button className="ww-retry-btn" onClick={load}>Try Again</button>
        </div>
      )}

      {/* Data loaded */}
      {!state.loading && !state.error && (
        <>
          {state.historical.length > 0 && (
            <WeatherStrip
              title="📅 Past 7 Days"
              days={state.historical}
              todayStr={todayStr}
            />
          )}
          {state.forecast.length > 0 && (
            <WeatherStrip
              title="🔮 7-Day Forecast"
              days={state.forecast}
              todayStr={todayStr}
            />
          )}
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
