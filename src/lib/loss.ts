/** Water lost while sprinkling: evaporation from spray and wet surfaces plus wind drift.
 *  This is a transparent APPROXIMATION, not a measurement. It reproduces the direction and
 *  rough size reported in sprinkler-loss studies (a few percent in cool, calm, humid,
 *  pre-dawn air; 15–30 %+ in hot, dry, sunny, windy afternoons), using hourly forecast values:
 *
 *    loss = clamp( 2 % + 4 %·VPD + 1.2 %·wind + 5 %·(solar ÷ 1000), 2 %, 45 % )
 *      VPD   = vapor-pressure deficit, kPa (from temperature and humidity, FAO-56 Eq. 11)
 *      wind  = 10 m wind speed, m/s
 *      solar = shortwave radiation, W/m²
 *
 *  Coefficients are editable assumptions. Losses from runoff and uneven coverage are separate
 *  (application efficiency) and don't depend on the time of day, so they're left out here. */
import type { HourlyPoint, Profile, WeatherData } from './types';
import type { WeekPlan } from './decision';
import { zoneParams } from './agronomy';
import { cToF, gallonsFromDepth, msToMph } from './units';
import { localParts } from './time';

export const LOSS_MODEL = { base: 0.02, perKpa: 0.04, perMs: 0.012, perKw: 0.05, min: 0.02, max: 0.45 };

export const vpdKpa = (tempC: number, rhPct: number) =>
  0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3)) * (1 - Math.min(Math.max(rhPct, 0), 100) / 100);

export interface LossEstimate { fraction: number; vpd: number; windMs: number; solarWm2: number }

/** Null when temperature, humidity or wind is missing: nothing is filled in. Missing solar counts as 0 only at night. */
export function sprinklerLoss(h: HourlyPoint): LossEstimate | null {
  if (h.tempC === null || h.rhPct === null || h.windMs === null) return null;
  const night = h.hour < 6 || h.hour >= 20;
  if (h.solarWm2 === null && !night) return null;
  const solar = h.solarWm2 ?? 0, vpd = vpdKpa(h.tempC, h.rhPct);
  const m = LOSS_MODEL;
  const raw = m.base + m.perKpa * vpd + m.perMs * h.windMs + m.perKw * (solar / 1000);
  return { fraction: Math.min(m.max, Math.max(m.min, raw)), vpd, windMs: h.windMs, solarWm2: solar };
}

const hourAt = (w: WeatherData, date: string, hour: number) => w.hourly.find((h) => h.date === date && h.hour === hour);

export interface TimeOption {
  date: string; hour: number; loss: LossEstimate;
  tempF: number | null; windMph: number | null; rhPct: number | null; solarWm2: number | null; rainProbPct: number | null;
}

const option = (h: HourlyPoint, loss: LossEstimate): TimeOption => ({
  date: h.date, hour: h.hour, loss, tempF: h.tempC === null ? null : cToF(h.tempC), windMph: h.windMs === null ? null : msToMph(h.windMs),
  rhPct: h.rhPct, solarWm2: h.solarWm2, rainProbPct: h.precipProbPct,
});

/** Best hour to hand-water or drip garden beds, IGNORING lawn restrictions. Candidates are
 *  4–10 AM (preferred) and 5–8 PM (evening: foliage stays wet longer, so it's penalised).
 *  Skips freezing, too-windy and likely-rain hours, and hours already past. */
export function bestGardenTime(w: WeatherData, date: string, th: Profile['thresholds'], now?: { date: string; hour: number }): TimeOption | null {
  let best: { opt: TimeOption; score: number } | null = null;
  for (const h of w.hourly.filter((x) => x.date === date)) {
    const morning = h.hour >= 4 && h.hour < 10, evening = h.hour >= 17 && h.hour < 20;
    if (!morning && !evening) continue;
    if (now && date === now.date && h.hour <= now.hour) continue;
    const loss = sprinklerLoss(h);
    if (!loss) continue;
    const opt = option(h, loss), { tempF, windMph } = opt;
    if ((tempF !== null && tempF < th.freezeF + 2) || (windMph !== null && windMph > th.windMph) || (h.precipProbPct ?? 0) >= th.rainProbPct) continue;
    const score = loss.fraction + (evening ? 0.03 : 0);
    if (!best || score < best.score - 1e-9) best = { opt, score };
  }
  return best?.opt ?? null;
}

/** Where the water from one session ends up, in gallons. The parts add up to `appliedGal`. */
export interface Outcome extends TimeOption {
  appliedGal: number;
  airGal: number;      // evaporates or drifts before reaching the ground (weather-dependent)
  unevenGal: number;   // lands unevenly or runs off: (1 − application efficiency), the same at any hour
  drainGal: number;    // more than the root zone has room for, so it soaks below the roots
  rootGal: number;     // stays in the root zone where grass can use it
  /** Estimated root-zone deficit at that time, inches (null when no plan is available). */
  deficitIn: number | null;
}

export interface Comparison {
  minutes: number;
  now: Outcome; recommended: Outcome & { source: 'plan' | 'garden' };
  /** Wasted now − wasted at the recommended time. Positive = waiting saves water. */
  savedGal: number;
  /** Extra water the root zone gets by waiting (can be negative). */
  moreRootGal: number;
}

/** Share of the day's water use (ETc) that has happened by a given hour: none before 6 AM,
 *  all by 8 PM, linear in between. A simple daylight approximation. */
export const dayFractionUsed = (hour: number) => Math.min(1, Math.max(0, (hour - 6) / 14));

/** Root-zone deficit for one zone at a date and hour, from the plan's daily balance. */
function deficitAt(plan: WeekPlan | null, zoneId: string, date: string, hour: number): number | null {
  const z = plan?.days.find((d) => d.date === date)?.zones.find((x) => x.zoneId === zoneId);
  return z ? Math.min(z.tawIn, z.drStartIn + z.etcIn * dayFractionUsed(hour)) : null;
}

/** Follows one session's water from the sprinkler to the roots for every zone and sums it. */
function outcome(profile: Profile, plan: WeekPlan | null, opt: TimeOption, minutes: number): Outcome {
  let applied = 0, air = 0, uneven = 0, drain = 0, root = 0, deficitSum = 0, deficitN = 0;
  for (const z of profile.zones) {
    const p = zoneParams(z);
    const grossIn = (p.precipRate * minutes) / 60;
    const landsIn = grossIn * (1 - opt.loss.fraction);
    const usefulIn = landsIn * p.efficiency;
    const dr = deficitAt(plan, z.id, opt.date, opt.hour);
    const keptIn = dr === null ? usefulIn : Math.min(usefulIn, dr);
    const g = (inch: number) => gallonsFromDepth(z.areaSqFt, inch);
    applied += g(grossIn); air += g(grossIn - landsIn); uneven += g(landsIn - usefulIn); drain += g(usefulIn - keptIn); root += g(keptIn);
    if (dr !== null) { deficitSum += dr; deficitN++; }
  }
  return { ...opt, appliedGal: applied, airGal: air, unevenGal: uneven, drainGal: drain, rootGal: root, deficitIn: deficitN ? deficitSum / deficitN : null };
}

/** Same runtime, two start times: where the water goes at each, and what waiting saves.
 *  Returns a reason string when the comparison can't be made honestly. */
export function compareNowToRecommended(profile: Profile, w: WeatherData, plan: WeekPlan | null, minutes: number, nowInstant = new Date()): Comparison | string {
  if (!profile.zones.length) return 'Set up your lawn first.';
  if (!(minutes > 0 && minutes <= 240)) return 'Enter a runtime between 1 and 240 minutes.';
  const local = localParts(nowInstant, w.timezone);
  const nowPoint = hourAt(w, local.date, local.hour);
  const nowLoss = nowPoint && sprinklerLoss(nowPoint);
  if (!nowPoint || !nowLoss) return 'The forecast has no complete data for the current hour.';

  let rec: (TimeOption & { source: 'plan' | 'garden' }) | null = null;
  const nextWater = plan?.days.find((d) => d.action === 'WATER' && d.window && (d.date > local.date || Number(d.window.start.slice(0, 2)) > local.hour));
  if (nextWater?.window) {
    const p = hourAt(w, nextWater.date, Number(nextWater.window.start.slice(0, 2))), l = p && sprinklerLoss(p);
    if (p && l) rec = { ...option(p, l), source: 'plan' };
  }
  if (!rec) {
    for (const d of [...new Set(w.hourly.map((h) => h.date))].filter((d) => d >= local.date).slice(0, 3)) {
      const g = bestGardenTime(w, d, profile.thresholds, local);
      if (g) { rec = { ...g, source: 'garden' }; break; }
    }
  }
  if (!rec) return 'No suitable low-loss hour appears in the forecast to compare against.';

  const now = outcome(profile, plan, option(nowPoint, nowLoss), minutes);
  const later = { ...outcome(profile, plan, rec, minutes), source: rec.source };
  return { minutes, now, recommended: later, savedGal: (now.appliedGal - now.rootGal) - (later.appliedGal - later.rootGal), moreRootGal: later.rootGal - now.rootGal };
}
