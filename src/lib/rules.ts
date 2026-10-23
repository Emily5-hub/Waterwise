/** Deterministic restriction rules. Rules are only what the user enters or confirms;
 *  WaterWise ships no municipal ordinances. */
import { dayOfWeek, toMinutes } from './time';
import type { Rule, RuleSource } from './types';

export const SOURCE_LABEL: Record<RuleSource, string> = {
  area_typical: 'Typical for your area (unverified)',
  municipal_unverified: 'Water provider rule (unverified)',
  municipal_confirmed: 'Water provider rule (you confirmed)',
  user: 'Your rule',
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface RuleHit { rule: Rule; message: string }
export interface RuleEval { blocked: boolean; blocking: RuleHit[]; allowedWindows: [number, number][] | null; limitingRules: Rule[]; notes: string[] }

const mmdd = (date: string) => date.slice(5);

export function inSeason(date: string, start: string, end: string): boolean {
  const d = mmdd(date);
  return start <= end ? d >= start && d <= end : d >= start || d <= end; // inclusive; wraps the new year
}

function windowsFor(start: string, end: string): [number, number][] {
  const s = toMinutes(start), e = toMinutes(end);
  return s < e ? [[s, e]] : [[s, 1440], [0, e]]; // wraps midnight
}

function intersect(a: [number, number][], b: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [s1, e1] of a) for (const [s2, e2] of b) {
    const s = Math.max(s1, s2), e = Math.min(e1, e2);
    if (s < e) out.push([s, e]);
  }
  return out;
}

export function validateRule(rule: Rule): string | null {
  const k = rule.kind;
  const md = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, hm = /^([01]\d|2[0-3]):[0-5]\d$/, ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (!rule.name.trim()) return 'Give the rule a name.';
  if (k.type === 'seasonal_shutdown' && (!md.test(k.start) || !md.test(k.end))) return 'Use MM-DD dates, like 10-01.';
  if (k.type === 'weekday_blackout' && (!k.days.length || k.days.some((d) => d < 0 || d > 6))) return 'Pick at least one day.';
  if (k.type === 'allowed_hours' && (!hm.test(k.start) || !hm.test(k.end) || k.start === k.end)) return 'Use two different HH:MM times.';
  if (k.type === 'date_blackout' && (!ymd.test(k.from) || !ymd.test(k.to) || k.from > k.to)) return 'Use a valid date range.';
  return null;
}

export function describeRule(rule: Rule): string {
  const k = rule.kind;
  switch (k.type) {
    case 'seasonal_shutdown': return `No watering from ${k.start} through ${k.end} (inclusive)`;
    case 'weekday_blackout': return `No watering on ${k.days.map((d) => WEEKDAYS[d]).join(', ')}`;
    case 'allowed_hours': return `Watering only between ${k.start} and ${k.end}`;
    case 'odd_even': return `Odd addresses on odd dates, even on even dates${k.allow31st ? '' : '; none on the 31st'}`;
    case 'date_blackout': return `No watering ${k.from} to ${k.to}`;
  }
}

export function evaluateRules(rules: Rule[], date: string, parity: 'odd' | 'even' | null): RuleEval {
  const res: RuleEval = { blocked: false, blocking: [], allowedWindows: null, limitingRules: [], notes: [] };
  for (const rule of rules.filter((r) => r.enabled)) {
    const k = rule.kind;
    const hit = (message: string) => res.blocking.push({ rule, message });
    if (k.type === 'seasonal_shutdown' && inSeason(date, k.start, k.end)) hit(`Seasonal shutdown (${k.start} to ${k.end})`);
    if (k.type === 'weekday_blackout' && k.days.includes(dayOfWeek(date))) hit(`${WEEKDAYS[dayOfWeek(date)]} is a no-watering day`);
    if (k.type === 'date_blackout' && date >= k.from && date <= k.to) hit(`No watering ${k.from} to ${k.to}`);
    if (k.type === 'odd_even') {
      const dom = Number(date.slice(8, 10));
      if (!parity) res.notes.push(`“${rule.name}” needs your house number (odd/even) under Municipal Rules.`);
      else if (dom === 31 && !k.allow31st) hit('No watering on the 31st');
      else if ((dom % 2 === 1) !== (parity === 'odd')) hit(`The ${dom}${dom === 1 ? 'st' : 'th'} isn’t a watering date for ${parity} addresses`);
    }
    if (k.type === 'allowed_hours') {
      const w = windowsFor(k.start, k.end);
      res.allowedWindows = res.allowedWindows ? intersect(res.allowedWindows, w) : w;
      res.limitingRules.push(rule);
    }
  }
  res.blocked = res.blocking.length > 0 || (res.allowedWindows !== null && res.allowedWindows.length === 0);
  return res;
}

export function spanAllowed(startMin: number, spanMin: number, windows: [number, number][] | null): boolean {
  if (!windows) return true;
  for (let m = startMin; m < startMin + Math.max(spanMin, 1); m += 5) {
    const t = m % 1440;
    if (!windows.some(([s, e]) => t >= s && t < e)) return false;
  }
  return true;
}

/** Template only. Not a statewide law; providers set their own dates and exceptions. */
export function coloradoExampleRule(id: string): Rule {
  return {
    id, enabled: true, source: 'municipal_unverified', name: 'Colorado example: fall/winter lawn shutdown',
    sourceNote: 'Example only. Many Colorado providers set seasonal rules, but dates and exceptions differ. Confirm with your water provider, then mark it confirmed.',
    sourceUrl: '', kind: { type: 'seasonal_shutdown', start: '10-01', end: '04-30' },
  };
}

const TEMPLATE_NOTE = 'Template of a common rule pattern, not a verified local law. Replace the days, times and dates with your provider’s published rules, then mark it confirmed.';

export interface RuleTemplate { id: string; label: string; description: string; make: (id: string) => Rule }

/** Starting points for patterns many US water providers use. Every template is created
 *  as unverified; none of them describes any particular jurisdiction's actual rules. */
export const RULE_TEMPLATES: RuleTemplate[] = [
  { id: 'daytime', label: 'No daytime watering', description: 'Blocks the hot middle of the day (example: 10 AM–6 PM).',
    make: (id) => ({ id, enabled: true, source: 'municipal_unverified', name: 'No daytime watering (template)', sourceNote: TEMPLATE_NOTE, sourceUrl: '', kind: { type: 'allowed_hours', start: '18:00', end: '10:00' } }) },
  { id: 'assigned_days', label: 'Assigned watering days', description: 'Only some weekdays allowed (example: 3 days a week).',
    make: (id) => ({ id, enabled: true, source: 'municipal_unverified', name: 'Assigned watering days (template)', sourceNote: TEMPLATE_NOTE, sourceUrl: '', kind: { type: 'weekday_blackout', days: [0, 2, 4, 6] } }) },
  { id: 'odd_even', label: 'Odd/even address days', description: 'Odd house numbers on odd dates, even on even dates.',
    make: (id) => ({ id, enabled: true, source: 'municipal_unverified', name: 'Odd/even schedule (template)', sourceNote: TEMPLATE_NOTE, sourceUrl: '', kind: { type: 'odd_even', allow31st: false } }) },
  { id: 'colorado', label: 'Colorado example: fall/winter shutdown', description: 'No lawn watering from Oct 1 (example dates).',
    make: (id) => coloradoExampleRule(id) },
];
