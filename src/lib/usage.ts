/** Usage estimates. Gallons are estimates from zone area and the (possibly default)
 *  precipitation rate. "Avoided" compares to a defined static baseline schedule. */
import { zoneParams } from './agronomy';
import { evaluateRules } from './rules';
import { addDays, dayOfWeek } from './time';
import type { Profile, WaterLog } from './types';
import { gallonsFromDepth } from './units';

export const BASELINE_DAYS = [1, 3, 5]; // Monday, Wednesday, Friday

export function logGallons(log: WaterLog, profile: Profile): { gallons: number; usesDefaultRate: boolean } | null {
  const zone = profile.zones.find((z) => z.id === log.zoneId);
  if (!zone || !(zone.areaSqFt > 0)) return null;
  const p = zoneParams(zone);
  return { gallons: gallonsFromDepth(zone.areaSqFt, (p.precipRate * log.minutes) / 60), usesDefaultRate: p.precipRateIsDefault };
}

export interface UsageSummary {
  start: string; end: string; minutes: number; sessions: number; gallons: number; gallonsUseDefaults: boolean;
  baselineSessions: number; baselineGallons: number; avoidedGallons: number; byWeek: { weekStart: string; gallons: number; minutes: number }[];
}

export function summarizeUsage(profile: Profile, start: string, end: string): UsageSummary {
  const logs = profile.logs.filter((l) => l.date >= start && l.date <= end);
  let gallons = 0, defaults = false;
  const weeks = new Map<string, { gallons: number; minutes: number }>();
  for (const l of logs) {
    const g = logGallons(l, profile);
    if (g) { gallons += g.gallons; defaults ||= g.usesDefaultRate; }
    const ws = addDays(l.date, -((dayOfWeek(l.date) + 6) % 7));
    const w = weeks.get(ws) ?? { gallons: 0, minutes: 0 };
    w.gallons += g?.gallons ?? 0; w.minutes += l.minutes; weeks.set(ws, w);
  }
  // Baseline: every zone runs `baselineMinutesPerSession` on Mon/Wed/Fri, skipping days your rules block.
  let baselineSessions = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (BASELINE_DAYS.includes(dayOfWeek(d)) && !evaluateRules(profile.rules, d, profile.addressParity).blocked) baselineSessions++;
  }
  const perSession = profile.zones.reduce((s, z) => {
    const p = zoneParams(z);
    return s + (z.areaSqFt > 0 ? gallonsFromDepth(z.areaSqFt, (p.precipRate * profile.baselineMinutesPerSession) / 60) : 0);
  }, 0);
  const baselineGallons = baselineSessions * perSession;
  return { start, end, minutes: logs.reduce((s, l) => s + l.minutes, 0), sessions: logs.length, gallons, gallonsUseDefaults: defaults,
    baselineSessions, baselineGallons, avoidedGallons: baselineGallons - gallons,
    byWeek: [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, v]) => ({ weekStart, ...v })) };
}
