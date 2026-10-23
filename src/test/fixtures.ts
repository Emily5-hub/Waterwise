import { defaultProfile, defaultZone } from '../lib/storage';
import type { DailyWeather, HourlyPoint, Location, Profile, WeatherData } from '../lib/types';
import { aggregateDaily } from '../lib/weather';
import { addDays } from '../lib/time';

export const DENVER: Location = { zip: '80012', latitude: 39.7, longitude: -104.84, timezone: 'America/Denver', label: 'Aurora, Colorado 80012', source: 'zip' };

export function profileWith(overrides: Partial<Profile> = {}): Profile {
  const p = defaultProfile();
  // areaRulesFor is set so tests start without the automatic area rules unless they ask for them.
  return { ...p, onboarded: true, location: DENVER, zones: [{ ...defaultZone(1), id: 'z1', soil: 'loam', sprinkler: 'rotor' }], areaRulesFor: 'Colorado', ...overrides };
}

/** Synthetic weather: hot/dry by default. `mod` adjusts each hour. */
export function weather(today: string, mod: (h: HourlyPoint, dayOffset: number) => Partial<HourlyPoint> = () => ({})): WeatherData {
  const hourly: HourlyPoint[] = [];
  for (let d = -7; d < 7; d++) {
    const date = addDays(today, d);
    for (let h = 0; h < 24; h++) {
      const diurnal = Math.sin(((h - 9) / 24) * 2 * Math.PI);
      const base: HourlyPoint = { time: `${date}T${String(h).padStart(2, '0')}:00`, date, hour: h, tempC: 24 + 8 * diurnal, rhPct: 35 - 15 * diurnal,
        precipProbPct: 5, precipMm: 0, cloudPct: 10, solarWm2: h >= 6 && h <= 19 ? 750 * Math.sin(((h - 6) / 13) * Math.PI) : 0, windMs: 2, gustMs: 4 };
      hourly.push({ ...base, ...mod(base, d) });
    }
  }
  return { source: 'test', isSample: true, fetchedAt: new Date().toISOString(), timezone: 'America/Denver', latitude: 39.7, longitude: -104.84,
    elevationM: 1650, today, hourly, daily: aggregateDaily(hourly, today) };
}

export const dayOf = (w: WeatherData, date: string): DailyWeather => w.daily.find((d) => d.date === date)!;
/** 4:00 AM Denver on a given date, as an instant. */
export const denverMorning = (date: string, hour = 3) => new Date(`${date}T${String(hour + 6).padStart(2, '0')}:00:00Z`); // MDT (UTC-6)
