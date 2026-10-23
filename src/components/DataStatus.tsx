import { ageHours, STALE_HOURS } from '../lib/weather';
import { useApp } from '../state';
import { Notice } from './ui';

/** Speaks up only when something is wrong with the weather data; otherwise shows nothing. */
export function DataStatus() {
  const { weather, now } = useApp();
  const w = weather.data;
  if (!w && weather.loading) return null;
  if (!w) return <Notice tone="alert" role="alert">{weather.error ?? 'No weather data yet.'} Saved settings and history are still available. Refresh the weather to try again.</Notice>;
  if (weather.error) return <Notice tone="amber" role="alert">Couldn’t update the forecast: {weather.error} Showing the last saved copy.</Notice>;
  if (!w.isSample && ageHours(w, now) > STALE_HOURS) return <Notice tone="amber" role="status">This forecast is out of date. Refresh the weather when you’re online.</Notice>;
  return null;
}
