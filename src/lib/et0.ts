/** Reference evapotranspiration (ET0), FAO Irrigation & Drainage Paper 56.
 *  Penman–Monteith (Eq. 6) when Tmax, Tmin, RHmax, RHmin, wind and solar radiation
 *  are all available; Hargreaves (Eq. 52) when only temperature is. Nothing missing
 *  is ever filled in. Inputs: °C, %, m/s, MJ/m²/day, m, degrees latitude. Output: mm/day. */
import type { DailyWeather } from './types';
import { dayOfYear } from './time';

export type Et0Method = 'penman_monteith' | 'hargreaves' | 'none';
export interface Et0Result { mm: number | null; method: Et0Method; missing: string[] }

const svp = (t: number) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3)); // kPa, Eq. 11

export function extraterrestrialRadiation(latDeg: number, doy: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const dec = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
  return ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws));
}

/** Eq. 47: wind speed at height z (m) → 2 m. */
export const windTo2m = (uz: number, z = 10) => (uz * 4.87) / Math.log(67.8 * z - 5.42);

export interface PmInputs { tMax: number; tMin: number; rhMax: number; rhMin: number; u2: number; rs: number; elevationM: number; latDeg: number; doy: number }

export function penmanMonteith(i: PmInputs): number {
  const tMean = (i.tMax + i.tMin) / 2;
  const pressure = 101.3 * Math.pow((293 - 0.0065 * i.elevationM) / 293, 5.26);
  const gamma = 0.000665 * pressure;
  const delta = (4098 * svp(tMean)) / Math.pow(tMean + 237.3, 2);
  const es = (svp(i.tMax) + svp(i.tMin)) / 2;
  const ea = (svp(i.tMin) * (i.rhMax / 100) + svp(i.tMax) * (i.rhMin / 100)) / 2;
  const ra = extraterrestrialRadiation(i.latDeg, i.doy);
  const rso = (0.75 + 2e-5 * i.elevationM) * ra;
  const rns = 0.77 * i.rs;
  const ratio = Math.min(i.rs / rso, 1);
  const rnl = 4.903e-9 * ((Math.pow(i.tMax + 273.16, 4) + Math.pow(i.tMin + 273.16, 4)) / 2)
    * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * ratio - 0.35);
  const rn = rns - rnl;
  const et0 = (0.408 * delta * rn + gamma * (900 / (tMean + 273)) * i.u2 * (es - ea)) / (delta + gamma * (1 + 0.34 * i.u2));
  return Math.max(0, et0);
}

export function hargreaves(tMax: number, tMin: number, latDeg: number, doy: number): number {
  const ra = extraterrestrialRadiation(latDeg, doy);
  return Math.max(0, 0.0023 * ((tMax + tMin) / 2 + 17.8) * Math.sqrt(Math.max(tMax - tMin, 0)) * 0.408 * ra);
}

export function computeEt0(day: DailyWeather, latDeg: number, elevationM: number | null): Et0Result {
  const doy = dayOfYear(day.date);
  const need: [string, unknown][] = [['max temperature', day.tMaxC], ['min temperature', day.tMinC], ['max humidity', day.rhMax],
    ['min humidity', day.rhMin], ['wind', day.windMeanMs], ['solar radiation', day.solarMJ], ['elevation', elevationM]];
  const missing = need.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
  if (missing.length === 0) {
    return { mm: penmanMonteith({ tMax: day.tMaxC!, tMin: day.tMinC!, rhMax: day.rhMax!, rhMin: day.rhMin!,
      u2: windTo2m(day.windMeanMs!), rs: day.solarMJ!, elevationM: elevationM!, latDeg, doy }), method: 'penman_monteith', missing };
  }
  if (day.tMaxC !== null && day.tMinC !== null) {
    return { mm: hargreaves(day.tMaxC, day.tMinC, latDeg, doy), method: 'hargreaves', missing };
  }
  return { mm: null, method: 'none', missing };
}
