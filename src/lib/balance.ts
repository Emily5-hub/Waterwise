/** Daily root-zone water balance (FAO-56 Ch. 8 style). Every value here is an
 *  ESTIMATE of depletion: actual soil moisture is never observed.
 *    Dr,end = clamp(Dr,start + ETc − Peff − Inet, 0, TAW)       [inches]
 *    ETc = ET0 × Kc;  TAW = root depth × available water capacity;  RAW = p × TAW */
import { RAIN_THRESHOLD_IN, SOIL, kcFor, zoneParams } from './agronomy';
import { computeEt0, Et0Method } from './et0';
import type { DailyWeather, Profile, WaterLog, WeatherData, Zone } from './types';
import { mmToIn } from './units';

export interface BalanceDay {
  date: string;
  kind: DailyWeather['kind'];
  et0Mm: number | null;
  et0Method: Et0Method;
  kc: number;
  etcIn: number;
  rainIn: number | null;     // reported (recent) or expected (forecast) amount
  rainProbPct: number | null;
  rainCountedIn: number;     // amount used by the model before the effective-rain factor
  peffIn: number;
  netIrrigationIn: number;
  drStartIn: number;
  drEndIn: number;
}

export interface BalanceResult { zoneId: string; days: BalanceDay[]; tawIn: number; rawIn: number; notes: string[] }

/** Approximation: Peff = f(soil, slope) × (P − 0.1 in), never more than the room left in the root zone. */
export function effectiveRain(precipIn: number, zone: Pick<Zone, 'soil' | 'slopeSensitive'>, roomIn: number): number {
  if (!(precipIn > RAIN_THRESHOLD_IN)) return 0;
  const factor = Math.max(0.3, SOIL[zone.soil].peffFactor - (zone.slopeSensitive ? 0.1 : 0));
  return Math.min((precipIn - RAIN_THRESHOLD_IN) * factor, Math.max(roomIn, 0));
}

export const stepDepletion = (dr: number, etc: number, peff: number, inet: number, taw: number) =>
  Math.min(Math.max(dr + etc - peff - inet, 0), taw);

export function netIrrigationFromLogs(zone: Zone, logs: WaterLog[], date: string): number {
  const { precipRate, efficiency } = zoneParams(zone);
  const minutes = logs.filter((l) => l.zoneId === zone.id && l.date === date).reduce((s, l) => s + l.minutes, 0);
  return (precipRate * minutes) / 60 * efficiency; // gross × efficiency = net
}

/** Forecast rain is counted only when its probability meets the threshold; probability is never treated as an amount. */
export function countedRainIn(day: DailyWeather, rainProbPct: number): number {
  if (day.precipMm === null) return 0;
  const amount = mmToIn(day.precipMm);
  if (day.kind === 'recent') return amount;
  return day.precipProbMaxPct !== null && day.precipProbMaxPct >= rainProbPct ? amount : 0;
}

export interface BalanceOptions { etScale?: number; initialFraction?: number }

export function runBalance(zone: Zone, weather: WeatherData, profile: Pick<Profile, 'logs' | 'thresholds'>, opts: BalanceOptions = {}): BalanceResult {
  const { taw } = zoneParams(zone);
  const raw = profile.thresholds.mad * taw;
  const etScale = opts.etScale ?? 1;
  const notes: string[] = [];
  let dr = (opts.initialFraction ?? 0.5) * raw;
  const days: BalanceDay[] = [];
  for (const day of weather.daily) {
    const et0 = computeEt0(day, weather.latitude, weather.elevationM);
    if (et0.method === 'none') notes.push(`No ET estimate for ${day.date} (missing temperature); that day adds no water use.`);
    const kc = kcFor(zone, day.date);
    const etcIn = et0.mm === null ? 0 : mmToIn(et0.mm) * kc * etScale;
    const counted = countedRainIn(day, profile.thresholds.rainProbPct);
    const peff = effectiveRain(counted, zone, dr + etcIn);
    const inet = day.kind === 'forecast' ? 0 : netIrrigationFromLogs(zone, profile.logs, day.date);
    const end = stepDepletion(dr, etcIn, peff, inet, taw);
    days.push({ date: day.date, kind: day.kind, et0Mm: et0.mm, et0Method: et0.method, kc, etcIn,
      rainIn: day.precipMm === null ? null : mmToIn(day.precipMm), rainProbPct: day.precipProbMaxPct,
      rainCountedIn: counted, peffIn: peff, netIrrigationIn: inet, drStartIn: dr, drEndIn: end });
    dr = end;
  }
  return { zoneId: zone.id, days, tawIn: taw, rawIn: raw, notes };
}

/** Low / central / high estimates: ET ±20 % and the unknown starting depletion at 25–75 % of RAW. */
export function balanceRange(zone: Zone, weather: WeatherData, profile: Pick<Profile, 'logs' | 'thresholds'>) {
  return {
    central: runBalance(zone, weather, profile),
    low: runBalance(zone, weather, profile, { etScale: 0.8, initialFraction: 0.25 }),
    high: runBalance(zone, weather, profile, { etScale: 1.2, initialFraction: 0.75 }),
  };
}
