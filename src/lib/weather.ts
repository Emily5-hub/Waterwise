/** Open-Meteo forecast retrieval (no key), validation and daily aggregation.
 *  Past days from this API are model analysis, not rain-gauge measurements,
 *  and are labeled that way in the UI. */
import { FetchLike, ServiceError, getJson } from './http';
import { localParts } from './time';
import type { DailyWeather, HourlyPoint, Location, WeatherData } from './types';
import { wm2HourToMJ } from './units';
import { validateCoordinates } from './zip';

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HOURLY = ['temperature_2m', 'relative_humidity_2m', 'precipitation_probability', 'precipitation',
  'cloud_cover', 'shortwave_radiation', 'wind_speed_10m', 'wind_gusts_10m'] as const;
export const PAST_DAYS = 7;
export const FORECAST_DAYS = 7;
export const STALE_HOURS = 3;
export const UNUSABLE_HOURS = 48;

export function forecastUrl(loc: Location): string {
  const p = new URLSearchParams({
    latitude: loc.latitude.toFixed(4), longitude: loc.longitude.toFixed(4), hourly: HOURLY.join(','),
    wind_speed_unit: 'ms', precipitation_unit: 'mm', temperature_unit: 'celsius',
    timezone: loc.timezone, past_days: String(PAST_DAYS), forecast_days: String(FORECAST_DAYS),
  });
  return `${FORECAST_URL}?${p}`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseForecast(raw: unknown, loc: Location, fetchedAt: Date): WeatherData {
  const data = raw as { hourly?: Record<string, unknown>; elevation?: unknown };
  const times = data?.hourly?.time;
  if (!Array.isArray(times) || times.length < 24) throw new ServiceError('invalid_response', 'The forecast was missing hourly data.');
  const col = (key: string): (number | null)[] => {
    const arr = data.hourly?.[key];
    return Array.isArray(arr) && arr.length === times.length ? arr.map(num) : times.map(() => null); // missing variable stays missing
  };
  const [t, rh, pp, pr, cc, sw, ws, wg] = HOURLY.map(col);
  const hourly: HourlyPoint[] = times.map((time, i) => {
    const s = String(time);
    return { time: s, date: s.slice(0, 10), hour: Number(s.slice(11, 13)), tempC: t[i], rhPct: rh[i], precipProbPct: pp[i],
      precipMm: pr[i], cloudPct: cc[i], solarWm2: sw[i], windMs: ws[i], gustMs: wg[i] };
  });
  const today = localParts(fetchedAt, loc.timezone).date;
  return { source: 'Open-Meteo forecast API', isSample: false, fetchedAt: fetchedAt.toISOString(), timezone: loc.timezone,
    latitude: loc.latitude, longitude: loc.longitude, elevationM: num(data.elevation), today, hourly, daily: aggregateDaily(hourly, today) };
}

/** Daily values from hourly data. A variable is reported only when (nearly) every hour has it. */
export function aggregateDaily(hourly: HourlyPoint[], today: string): DailyWeather[] {
  const byDate = new Map<string, HourlyPoint[]>();
  hourly.forEach((h) => byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]));
  const out: DailyWeather[] = [];
  for (const [date, hours] of byDate) {
    if (hours.length < 20) continue; // partial day (API edge)
    const vals = (k: keyof HourlyPoint, subset = hours) => {
      const v = subset.map((h) => h[k] as number | null);
      return v.filter((x) => x !== null).length >= subset.length - 1 ? (v.filter((x) => x !== null) as number[]) : null;
    };
    const sum = (a: number[] | null) => (a ? a.reduce((s, x) => s + x, 0) : null);
    const mean = (a: number[] | null) => (a && a.length ? sum(a)! / a.length : null);
    const temps = vals('tempC'), rh = vals('rhPct');
    const night = vals('tempC', hours.filter((h) => h.hour < 8));
    const solar = vals('solarWm2');
    out.push({
      date, kind: date < today ? 'recent' : date === today ? 'today' : 'forecast',
      tMaxC: temps ? Math.max(...temps) : null, tMinC: temps ? Math.min(...temps) : null,
      overnightMinC: night && night.length ? Math.min(...night) : null,
      rhMax: rh ? Math.max(...rh) : null, rhMin: rh ? Math.min(...rh) : null,
      windMeanMs: mean(vals('windMs')), gustMaxMs: vals('gustMs') ? Math.max(...vals('gustMs')!) : null,
      precipMm: sum(vals('precipMm')), precipProbMaxPct: vals('precipProbPct') ? Math.max(...vals('precipProbPct')!) : null,
      solarMJ: solar ? solar.reduce((s, x) => s + wm2HourToMJ(x), 0) : null, cloudMeanPct: mean(vals('cloudPct')),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchWeather(loc: Location, fetchImpl: FetchLike = fetch as unknown as FetchLike, now = new Date()): Promise<WeatherData> {
  const err = validateCoordinates(loc.latitude, loc.longitude);
  if (err) throw new ServiceError('invalid_response', err); // never send invalid coordinates
  return parseForecast(await getJson(forecastUrl(loc), fetchImpl), loc, now);
}

export function ageHours(w: WeatherData, now = new Date()): number {
  return (now.getTime() - new Date(w.fetchedAt).getTime()) / 3600000;
}

/** Re-label recent/today/forecast for the current local date (cached data ages). */
export function refreshKinds(w: WeatherData, now = new Date()): WeatherData {
  const today = localParts(now, w.timezone).date;
  if (today === w.today) return w;
  return { ...w, today, daily: w.daily.map((d) => ({ ...d, kind: d.date < today ? 'recent' : d.date === today ? 'today' : 'forecast' })) };
}
