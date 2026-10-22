import { ageHours, STALE_HOURS } from '../lib/weather';
import { useApp } from '../state';
import { Badge, Notice } from './ui';

export function DataStatus() {
  const { weather, profile, now } = useApp();
  const w = weather.data;
  if (!w && weather.loading) return <div role="status" className="h-10 animate-pulse rounded-xl bg-white" aria-label="Loading weather" />;
  if (!w) return <Notice tone="alert" role="alert">{weather.error ?? 'No weather data yet.'} Saved settings and history are still available. Try refresh, or turn on sample data in Settings to explore.</Notice>;
  const age = ageHours(w, now);
  const ageText = age < 1 ? `${Math.max(1, Math.round(age * 60))} min ago` : `${age.toFixed(age < 10 ? 1 : 0)} h ago`;
  return (
    <div className="space-y-2">
      {w.isSample && <Notice tone="amber" role="status"><strong>Sample data.</strong> This is generated demo weather, not live conditions for {profile.location?.label}. Turn it off in Settings.</Notice>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="sky">{w.source}</Badge>
        {!w.isSample && <span>Updated {ageText}{weather.fromCache ? ' (saved copy)' : ''}</span>}
        {!w.isSample && age > STALE_HOURS && <Badge tone="amber">Stale</Badge>}
        <span>Times in {w.timezone}</span>
      </div>
      {weather.error && <Notice tone="amber" role="alert">Couldn’t update the forecast: {weather.error} Showing the last saved copy.</Notice>}
    </div>
  );
}
