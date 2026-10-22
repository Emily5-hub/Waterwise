/** Deterministic SAMPLE weather for demos and offline exploration.
 *  Always labeled "Sample data" in the UI; never presented as live weather. */
import { aggregateDaily, FORECAST_DAYS, PAST_DAYS } from './weather';
import { addDays, localParts } from './time';
import type { HourlyPoint, Location, WeatherData } from './types';

export const SAMPLE_SOURCE = 'Sample data (not live weather)';

export function makeSampleWeather(loc: Location, now = new Date()): WeatherData {
  const today = localParts(now, loc.timezone).date;
  const hourly: HourlyPoint[] = [];
  for (let d = -PAST_DAYS; d < FORECAST_DAYS; d++) {
    const date = addDays(today, d);
    const rainy = d === -3 || d === 3;       // a past shower and a forecast shower
    const windyMorning = d === 1;            // tomorrow morning is breezy
    for (let h = 0; h < 24; h++) {
      const diurnal = Math.sin(((h - 9) / 24) * 2 * Math.PI);
      const tempC = 14 + 9 * diurnal - (rainy ? 4 : 0);
      hourly.push({
        time: `${date}T${String(h).padStart(2, '0')}:00`, date, hour: h,
        tempC: Math.round(tempC * 10) / 10,
        rhPct: Math.round(55 - 25 * diurnal + (rainy ? 25 : 0)),
        precipProbPct: rainy ? (h >= 12 && h <= 20 ? 80 : 40) : 5,
        precipMm: rainy && h >= 14 && h <= 17 ? 2.5 : 0,
        cloudPct: rainy ? 90 : Math.round(20 + 10 * Math.max(0, diurnal)),
        solarWm2: h >= 7 && h <= 18 ? Math.round(Math.max(0, 650 * Math.sin(((h - 6) / 13) * Math.PI)) * (rainy ? 0.35 : 1)) : 0,
        windMs: windyMorning && h >= 3 && h <= 11 ? 8.5 : Math.round((1.8 + 2.2 * Math.max(0, diurnal)) * 10) / 10,
        gustMs: windyMorning && h >= 3 && h <= 11 ? 12 : Math.round((3 + 3 * Math.max(0, diurnal)) * 10) / 10,
      });
    }
  }
  return { source: SAMPLE_SOURCE, isSample: true, fetchedAt: now.toISOString(), timezone: loc.timezone, latitude: loc.latitude,
    longitude: loc.longitude, elevationM: 1650, today, hourly, daily: aggregateDaily(hourly, today) };
}
