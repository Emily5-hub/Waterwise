/** Scheduling decision engine. Checks run in a fixed, explainable order:
 *  1 restrictions → 2 freeze → 3 wind → 4 rain → 5 estimated deficit → 6 window → 7 runtime. */
import { zoneParams } from './agronomy';
import { BalanceResult, balanceRange, countedRainIn, effectiveRain, stepDepletion } from './balance';
import { RuleEval, SOURCE_LABEL, evaluateRules, spanAllowed } from './rules';
import { MAX_ZONE_MINUTES, grossFromNet, runtimeFromNet, splitCycles } from './runtime';
import { formatClock, fromMinutes, localParts, toMinutes } from './time';
import type { HourlyPoint, Profile, Thresholds, WeatherData } from './types';
import { cToF, msToMph } from './units';
import { UNUSABLE_HOURS, ageHours } from './weather';

export type Action = 'WATER' | 'DO_NOT_WATER' | 'DELAY';
export type Confidence = 'likely' | 'tentative' | 'low';
export interface Check { step: string; status: 'pass' | 'block' | 'delay' | 'info'; detail: string }

export interface ZonePlan {
  zoneId: string; name: string; needsWater: boolean;
  drStartIn: number; drLowIn: number; drHighIn: number; rawIn: number; tawIn: number; etcIn: number;
  netDepthIn: number; grossDepthIn: number; minutes: number; cycles: number; perCycle: number; soak: number; clockMinutes: number;
  precipRate: number; precipRateIsDefault: boolean; efficiency: number; efficiencyIsDefault: boolean; capped: boolean;
}

export interface WindowChoice { start: string; end: string; reason: string; avgWindMph: number | null; avgTempF: number | null }

export interface DayDecision {
  date: string; action: Action; reason: string; checks: Check[]; freezeAlert: boolean; windBlocked: boolean;
  restriction: RuleEval; window: WindowChoice | null; zones: ZonePlan[]; confidence: Confidence;
  rain: { amountIn: number | null; probPct: number | null; counted: boolean };
}

export interface WeekPlan {
  days: DayDecision[]; next: { date: string; confidence: Confidence } | null; nextAfterToday: { date: string; confidence: Confidence } | null; forecastUsable: boolean;
  warnings: string[]; balances: Record<string, { central: BalanceResult; low: BalanceResult; high: BalanceResult }>;
}

type WindowResult = WindowChoice | { blocked: 'wind' | 'rules' | 'time' };

export function chooseWindow(date: string, hourly: HourlyPoint[], th: Thresholds, allowed: [number, number][] | null,
  spanMin: number, now?: { date: string; time: string }): WindowResult {
  const byHour = new Map(hourly.filter((h) => h.date === date).map((h) => [h.hour, h]));
  const prefS = toMinutes(th.preferredStart), prefE = toMinutes(th.preferredEnd);
  if (byHour.size === 0) {
    if (!spanAllowed(prefS, spanMin, allowed)) return { blocked: 'rules' };
    return { start: th.preferredStart, end: fromMinutes(prefS + spanMin), avgWindMph: null, avgTempF: null,
      reason: 'No hourly forecast for this day yet, so your preferred start is shown.' };
  }
  const failures = { wind: 0, rules: 0, time: 0 };
  let best: { score: number; s: number; wind: number | null; temp: number | null; fallback: boolean } | null = null;
  const consider = (s: number, fallback: boolean) => {
    if (now && now.date === date && s <= toMinutes(now.time)) { failures.time++; return; }
    if (!spanAllowed(s, spanMin, allowed)) { failures.rules++; return; }
    const hours: HourlyPoint[] = [];
    for (let h = Math.floor(s / 60); h <= Math.min(23, Math.floor((s + Math.max(spanMin, 1) - 1) / 60)); h++) { const p = byHour.get(h); if (p) hours.push(p); }
    const winds = hours.map((h) => h.windMs).filter((w): w is number => w !== null).map(msToMph);
    if (winds.some((w) => w > th.windMph)) { failures.wind++; return; }
    const temps = hours.map((h) => h.tempC).filter((t): t is number => t !== null).map(cToF);
    const wind = winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : null;
    const temp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const score = (wind ?? 5) + 0.15 * (temp ?? 60) + (fallback ? 4 : 0) + (s + spanMin > prefE && !fallback ? 1.5 : 0);
    if (!best || score < best.score - 1e-9) best = { score, s, wind, temp, fallback };
  };
  for (let s = prefS; s < prefE; s += 30) consider(s, false);
  const preferredOnlyPassed = !best && failures.time > 0 && failures.wind === 0 && failures.rules === 0;
  if (preferredOnlyPassed) return { blocked: 'time' }; // don't push today's watering into the night; tomorrow morning is better
  if (!best) for (const s of [...range(0, 600, 30), ...range(1080, 1410, 30)]) if ((s < prefS || s >= prefE) && (s < 1080 || s + spanMin <= 1440)) consider(s, true);
  if (!best) return { blocked: failures.wind > 0 && failures.wind >= failures.rules ? 'wind' : failures.rules > 0 ? 'rules' : 'time' };
  const b = best as { score: number; s: number; wind: number | null; temp: number | null; fallback: boolean };
  const parts = [];
  if (b.fallback) parts.push('Your preferred window is unavailable, so this is the best early or late alternative.');
  else parts.push('Inside your preferred low-evaporation window.');
  if (b.wind !== null) parts.push(`Forecast wind about ${b.wind.toFixed(0)} mph`);
  if (b.temp !== null) parts.push(`temperature about ${b.temp.toFixed(0)}°F`);
  return { start: fromMinutes(b.s), end: fromMinutes(b.s + spanMin), avgWindMph: b.wind, avgTempF: b.temp, reason: parts.join(' · ') };
}

const range = (a: number, b: number, step: number) => { const out: number[] = []; for (let x = a; x < b; x += step) out.push(x); return out; };

export function planWeek(profile: Profile, weather: WeatherData, now = new Date()): WeekPlan {
  const th = profile.thresholds;
  const warnings: string[] = [];
  const local = localParts(now, weather.timezone);
  const forecastUsable = weather.isSample || ageHours(weather, now) < UNUSABLE_HOURS;
  if (!forecastUsable) warnings.push('The saved forecast is more than 48 hours old. Refresh before relying on a recommendation.');
  const balances: WeekPlan['balances'] = {};
  profile.zones.forEach((z) => { balances[z.id] = balanceRange(z, weather, profile); });
  Object.values(balances).forEach((b) => b.central.notes.forEach((n) => warnings.includes(n) || warnings.push(n)));

  const weekAgo = weather.daily[0]?.date ?? local.date;
  profile.zones.forEach((z) => {
    const b = balances[z.id].central, t = b.days.find((d) => d.date === local.date);
    const logged = profile.logs.some((l) => l.zoneId === z.id && l.date >= weekAgo);
    if (t && !logged && t.drStartIn >= 0.95 * b.tawIn) warnings.push(`${z.name}: no watering is logged for the past week, so the estimate assumes none happened. Log recent watering for a better estimate.`);
  });

  const planDates = weather.daily.filter((d) => d.date >= local.date).slice(0, 7);
  const state = new Map(profile.zones.map((z) => {
    const b = balances[z.id];
    const idx = b.central.days.findIndex((d) => d.date === local.date);
    // Start of today, minus any watering already logged today.
    const pick = (r: BalanceResult) => (idx >= 0 ? Math.max(0, r.days[idx].drStartIn - r.days[idx].netIrrigationIn) : r.days[r.days.length - 1]?.drEndIn ?? 0);
    return [z.id, { dr: pick(b.central), lo: pick(b.low), hi: pick(b.high) }];
  }));

  const days: DayDecision[] = planDates.map((dw, i) => {
    const checks: Check[] = [];
    const restriction = evaluateRules(profile.rules, dw.date, profile.addressParity);
    const hasHourly = weather.hourly.some((h) => h.date === dw.date);
    const confidence: Confidence = !forecastUsable || !hasHourly ? 'low' : i <= 1 ? 'likely' : 'tentative';
    const bDay = (zid: string) => balances[zid].central.days.find((d) => d.date === dw.date);
    const nextDay = weather.daily.find((d) => d.date > dw.date);

    const zones: ZonePlan[] = profile.zones.map((z) => {
      const p = zoneParams(z), st = state.get(z.id)!, bd = bDay(z.id);
      const raw = th.mad * p.taw, etc = bd?.etcIn ?? 0;
      const needs = st.dr + etc >= raw && st.dr > 0.05;
      // One session refills at most the readily available water (RAW); deeper estimated deficits
      // are refilled over successive sessions, which limits runoff and overwatering when the estimate is uncertain.
      const net = needs ? Math.min(st.dr, raw) : 0;
      let minutes = net > 0 ? runtimeFromNet(net, p.efficiency, p.precipRate) : 0;
      const capped = minutes > MAX_ZONE_MINUTES;
      if (capped) minutes = MAX_ZONE_MINUTES;
      const split = splitCycles(minutes, p.precipRate, p.soil.infiltrationInHr);
      return { zoneId: z.id, name: z.name, needsWater: needs, drStartIn: st.dr, drLowIn: st.lo, drHighIn: st.hi, rawIn: raw, tawIn: p.taw,
        etcIn: etc, netDepthIn: net, grossDepthIn: capped ? (minutes / 60) * p.precipRate : grossFromNet(net, p.efficiency),
        minutes, cycles: split.cycles, perCycle: split.perCycle, soak: split.soak,
        clockMinutes: split.cycles ? minutes + (split.cycles - 1) * split.soak : 0,
        precipRate: p.precipRate, precipRateIsDefault: p.precipRateIsDefault, efficiency: p.efficiency, efficiencyIsDefault: p.efficiencyIsDefault, capped };
    });

    let action: Action | null = null, reason = '';
    const decide = (a: Action, r: string) => { if (!action) { action = a; reason = r; } };
    if (!forecastUsable) decide('DELAY', 'Forecast is out of date. Refresh weather first.');

    // 1. Restrictions
    if (restriction.blocked) {
      const first = restriction.blocking[0];
      const msg = first ? `${first.message} (${SOURCE_LABEL[first.rule.source]}).` : 'Your allowed-hours rules leave no time today.';
      checks.push({ step: 'Restrictions', status: 'block', detail: msg });
      decide('DO_NOT_WATER', first ? first.message : 'No allowed watering hours.');
    } else checks.push({ step: 'Restrictions', status: 'pass', detail: restriction.notes[0] ?? (profile.rules.some((r) => r.enabled) ? 'No enabled rule blocks this day.' : 'No restrictions entered. Confirm your water provider’s rules.') });

    // 2. Freeze
    const overnightF = dw.overnightMinC === null ? null : cToF(dw.overnightMinC);
    const freezeAlert = overnightF !== null && overnightF < th.freezeF;
    if (freezeAlert) { checks.push({ step: 'Freeze', status: 'block', detail: `FREEZE ALERT: overnight low about ${overnightF!.toFixed(0)}°F (below ${th.freezeF}°F).` }); decide('DO_NOT_WATER', 'Freeze alert: overnight temperatures below freezing.'); }
    else checks.push({ step: 'Freeze', status: overnightF === null ? 'info' : 'pass', detail: overnightF === null ? 'Overnight temperature unavailable.' : `Overnight low about ${overnightF.toFixed(0)}°F.` });

    // 3. Wind (every candidate early/late hour too windy)
    // Controllers run other zones during a zone's soak, so the session lasts the longer of
    // (all run time) and (the longest single zone including its soaks).
    const watering = zones.filter((z) => z.needsWater);
    const span = Math.ceil(Math.max(watering.reduce((s, z) => s + z.minutes, 0), ...watering.map((z) => z.clockMinutes), 0)) || 30;
    const windTest = chooseWindow(dw.date, weather.hourly, th, null, span, local);
    const windBlocked = 'blocked' in windTest && windTest.blocked === 'wind';
    if (windBlocked) { checks.push({ step: 'Wind', status: 'block', detail: `Wind above ${th.windMph} mph in every suitable hour (drift and uneven coverage).` }); decide('DO_NOT_WATER', `Too windy: above ${th.windMph} mph during watering hours.`); }
    else checks.push({ step: 'Wind', status: 'pass', detail: `No suitable hour is above ${th.windMph} mph${hasHourly ? '' : ' (no hourly data)'}.` });

    // 4. Rain (forecast rain counted only at ≥ threshold probability; recent rain is already in the balance)
    const todayRain = countedRainIn(dw, th.rainProbPct);
    const counted = todayRain + (nextDay ? countedRainIn(nextDay, th.rainProbPct) : 0);
    const needing = zones.filter((z) => z.needsWater);
    const rainCovers = needing.length > 0 && counted > 0 && needing.every((z) => {
      const zone = profile.zones.find((x) => x.id === z.zoneId)!;
      return z.drStartIn + z.etcIn - effectiveRain(counted, zone, z.drStartIn + z.etcIn) < z.rawIn;
    });
    if (rainCovers) { checks.push({ step: 'Rain', status: 'delay', detail: `About ${counted.toFixed(2)} in expected today or tomorrow at ≥${th.rainProbPct}% chance; it may cover the estimated need.` }); decide('DELAY', 'Rain may cover today’s estimated need.'); }
    else checks.push({ step: 'Rain', status: 'info', detail: counted > 0 ? `About ${counted.toFixed(2)} in expected, not enough to cover the estimated need.` : `No rain counted (forecast chance below ${th.rainProbPct}% or none expected).` });

    // 5. Estimated deficit vs threshold
    if (!needing.length) { checks.push({ step: 'Estimated deficit', status: 'block', detail: 'Every zone’s estimated root-zone water deficit stays below its watering threshold today.' }); decide('DO_NOT_WATER', 'Estimated need is below the watering threshold.'); }
    else checks.push({ step: 'Estimated deficit', status: 'pass', detail: `${needing.map((z) => z.name).join(', ')} reach the watering threshold today (estimate).` });

    // 6–7. Window and runtime
    let window: WindowChoice | null = null;
    if (!action) {
      const w = chooseWindow(dw.date, weather.hourly, th, restriction.allowedWindows, span, local);
      if ('blocked' in w) {
        if (w.blocked === 'time') {
          checks.push({ step: 'Window', status: 'delay', detail: 'Today’s low-evaporation window has passed; the next early-morning window is better than watering later today.' });
          decide('DELAY', 'Today’s early-morning window has passed. Water in the next morning window.');
        } else {
          const why = w.blocked === 'rules' ? 'No allowed hour fits the runtime.' : 'Too windy in allowed hours.';
          checks.push({ step: 'Window', status: 'block', detail: why });
          decide('DO_NOT_WATER', why);
        }
      } else {
        window = w;
        checks.push({ step: 'Window', status: 'pass', detail: `${formatClock(w.start)}–${formatClock(w.end)}. ${w.reason}` });
        checks.push({ step: 'Runtime', status: 'info', detail: needing.map((z) => `${z.name}: ${z.minutes.toFixed(0)} min`).join(' · ') });
        decide('WATER', `${needing.length === zones.length ? 'Estimated need reached' : `${needing.length} of ${zones.length} zones need water`}; conditions allow watering.`);
      }
    }

    // Advance the projected balance with whatever this day's plan does.
    profile.zones.forEach((z) => {
      const st = state.get(z.id)!, bd = bDay(z.id), plan = zones.find((p) => p.zoneId === z.id)!;
      const etc = bd?.etcIn ?? 0, rain = bd?.rainCountedIn ?? 0;
      const inet = action === 'WATER' && plan.needsWater ? plan.grossDepthIn * plan.efficiency : 0;
      const taw = zoneParams(z).taw;
      st.dr = stepDepletion(st.dr, etc, effectiveRain(rain, z, st.dr + etc), inet, taw);
      st.lo = stepDepletion(st.lo, etc * 0.8, effectiveRain(rain, z, st.lo + etc * 0.8), inet, taw);
      st.hi = stepDepletion(st.hi, etc * 1.2, effectiveRain(rain, z, st.hi + etc * 1.2), inet, taw);
    });

    return { date: dw.date, action: action ?? 'DO_NOT_WATER', reason, checks, freezeAlert, windBlocked, restriction, window, zones, confidence,
      rain: { amountIn: dw.precipMm === null ? null : dw.precipMm / 25.4, probPct: dw.precipProbMaxPct, counted: todayRain > 0 } };
  });

  const pick = (d?: DayDecision) => (d ? { date: d.date, confidence: d.confidence } : null);
  const usable = days.filter((d) => d.action === 'WATER' && d.confidence !== 'low');
  return { days, next: pick(usable[0]), nextAfterToday: pick(usable.find((d) => d.date > local.date)), forecastUsable, warnings, balances };
}
