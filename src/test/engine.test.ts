import { describe, expect, it } from 'vitest';
import { planWeek } from '../lib/decision';
import { coloradoExampleRule, evaluateRules, inSeason } from '../lib/rules';
import { localParts } from '../lib/time';
import type { Rule } from '../lib/types';
import { denverMorning, profileWith, weather } from './fixtures';

const rule = (kind: Rule['kind'], source: Rule['source'] = 'user'): Rule => ({ id: 'r', name: 'Test rule', enabled: true, source, sourceNote: '', sourceUrl: '', kind });

describe('restriction rules', () => {
  it('seasonal shutdown boundary: Sep 30 allowed, Oct 1 blocked (inclusive), wraps the new year', () => {
    const co = coloradoExampleRule('co');
    expect(evaluateRules([co], '2026-09-30', null).blocked).toBe(false);
    expect(evaluateRules([co], '2026-10-01', null).blocked).toBe(true);
    expect(evaluateRules([co], '2027-01-15', null).blocked).toBe(true);
    expect(evaluateRules([co], '2027-04-30', null).blocked).toBe(true);
    expect(evaluateRules([co], '2027-05-01', null).blocked).toBe(false);
    expect(co.source).toBe('municipal_unverified');
  });
  it('uses the location’s local date at the boundary, not UTC', () => {
    const instant = new Date('2026-10-01T03:00:00Z'); // already Oct 1 in UTC, Sep 30 21:00 in Denver
    const local = localParts(instant, 'America/Denver').date;
    expect(local).toBe('2026-09-30');
    expect(evaluateRules([coloradoExampleRule('co')], local, null).blocked).toBe(false);
  });
  it('odd/even rules depend on address parity and the 31st', () => {
    const r = rule({ type: 'odd_even', allow31st: false });
    expect(evaluateRules([r], '2026-07-07', 'odd').blocked).toBe(false);
    expect(evaluateRules([r], '2026-07-07', 'even').blocked).toBe(true);
    expect(evaluateRules([r], '2026-07-31', 'odd').blocked).toBe(true);
    const unknown = evaluateRules([r], '2026-07-07', null);
    expect(unknown.blocked).toBe(false);
    expect(unknown.notes[0]).toMatch(/house number/);
  });
  it('day-of-week blackouts, date blackouts and allowed hours', () => {
    expect(evaluateRules([rule({ type: 'weekday_blackout', days: [1] })], '2026-07-06', null).blocked).toBe(true); // Monday
    expect(evaluateRules([rule({ type: 'date_blackout', from: '2026-07-01', to: '2026-07-10' })], '2026-07-10', null).blocked).toBe(true);
    const hours = evaluateRules([rule({ type: 'allowed_hours', start: '18:00', end: '10:00' })], '2026-07-06', null);
    expect(hours.allowedWindows).toEqual([[1080, 1440], [0, 600]]);
  });
  it('disabled rules never apply', () => {
    expect(evaluateRules([{ ...rule({ type: 'weekday_blackout', days: [1] }), enabled: false }], '2026-07-06', null).blocked).toBe(false);
  });
  it('season helper handles same-year ranges', () => {
    expect(inSeason('2026-06-15', '06-01', '08-31')).toBe(true);
    expect(inSeason('2026-09-01', '06-01', '08-31')).toBe(false);
  });
});

describe('decision engine', () => {
  const today = '2026-07-08';
  const now = denverMorning(today, 2); // 2 AM local, before the window

  it('recommends watering on a hot, dry day with a transparent runtime and an early window', () => {
    const plan = planWeek(profileWith(), weather(today), now);
    const d = plan.days[0];
    expect(d.action).toBe('WATER');
    expect(d.window!.start >= '04:00' && d.window!.start < '08:00').toBe(true);
    const z = d.zones[0];
    expect(z.minutes).toBeCloseTo((z.netDepthIn / (z.efficiency * z.precipRate)) * 60, 5);
    expect(z.precipRateIsDefault).toBe(true);
    expect(z.netDepthIn).toBeLessThanOrEqual(z.rawIn + 1e-9); // one session refills at most RAW
    expect(plan.warnings.join(' ')).toMatch(/no watering is logged/);
  });

  it('counts watering already logged today', () => {
    const p = profileWith({ logs: [{ id: 't', zoneId: 'z1', date: today, time: '01:00', minutes: 150, note: '' }] });
    expect(planWeek(p, weather(today), now).days[0].zones[0].drStartIn).toBeLessThan(0.3);
  });

  it('restrictions take precedence over everything else', () => {
    const p = profileWith({ rules: [rule({ type: 'weekday_blackout', days: [3] }, 'municipal_confirmed')] }); // Wednesday
    const d = planWeek(p, weather(today, () => ({ windMs: 12 })), now).days[0];
    expect(d.action).toBe('DO_NOT_WATER');
    expect(d.checks[0]).toMatchObject({ step: 'Restrictions', status: 'block' });
    expect(d.reason).toMatch(/Wednesday/);
  });

  it('freezing overnight forecast triggers a freeze alert and DO NOT WATER', () => {
    const d = planWeek(profileWith(), weather(today, (h, off) => (off === 0 && h.hour < 8 ? { tempC: -2 } : {})), now).days[0];
    expect(d.freezeAlert).toBe(true);
    expect(d.action).toBe('DO_NOT_WATER');
  });

  it('wind above the threshold in every suitable hour triggers DO NOT WATER', () => {
    const d = planWeek(profileWith(), weather(today, (_h, off) => (off === 0 ? { windMs: 9 } : {})), now).days[0]; // ≈20 mph
    expect(d.windBlocked).toBe(true);
    expect(d.action).toBe('DO_NOT_WATER');
  });

  it('likely rain that covers the estimated need produces DELAY', () => {
    const w = weather(today, (h, off) => (off === 0 && h.hour >= 14 && h.hour < 18 ? { precipMm: 8, precipProbPct: 85 } : off === 0 ? { precipProbPct: 85 } : {}));
    const d = planWeek(profileWith(), w, now).days[0];
    expect(d.action).toBe('DELAY');
    expect(d.reason).toMatch(/Rain may cover/);
  });

  it('low-probability rain is not counted as water', () => {
    const w = weather(today, (h, off) => (off === 0 ? { precipMm: h.hour === 15 ? 20 : 0, precipProbPct: 30 } : {}));
    expect(planWeek(profileWith(), w, now).days[0].action).toBe('WATER');
  });

  it('skips when the estimated deficit is below threshold (recent watering)', () => {
    const p = profileWith({ logs: [{ id: 'l', zoneId: 'z1', date: '2026-07-07', time: '05:00', minutes: 150, note: '' }] });
    const d = planWeek(p, weather(today), now).days[0];
    expect(d.action).toBe('DO_NOT_WATER');
    expect(d.reason).toMatch(/threshold/);
  });

  it('refuses to decide from a forecast older than 48 hours', () => {
    const w = { ...weather(today), isSample: false, fetchedAt: new Date(now.getTime() - 50 * 3600000).toISOString() };
    const plan = planWeek(profileWith(), w, now);
    expect(plan.forecastUsable).toBe(false);
    expect(plan.days[0].action).toBe('DELAY');
    expect(plan.next).toBeNull();
  });

  it('marks days beyond the next two as tentative', () => {
    const plan = planWeek(profileWith(), weather(today), now);
    expect(plan.days[0].confidence).toBe('likely');
    expect(plan.days[4].confidence).toBe('tentative');
  });

  it('never exposes a soil-moisture value: only estimated depletion fields exist', () => {
    const plan = planWeek(profileWith(), weather(today), now);
    const json = JSON.stringify(plan);
    expect(json).not.toMatch(/moisture/i);
    expect(Object.keys(plan.days[0].zones[0])).toEqual(expect.arrayContaining(['drStartIn', 'drLowIn', 'drHighIn']));
  });
});

describe('watering window timing', () => {
  it('after today’s morning window passes, delays to the next morning instead of watering at night', () => {
    const today = '2026-07-08';
    const afternoon = new Date('2026-07-08T19:00:00Z'); // 1 PM MDT
    const plan = planWeek(profileWith(), weather(today), afternoon);
    expect(plan.days[0].action).toBe('DELAY');
    expect(plan.days[0].reason).toMatch(/morning window/);
    expect(plan.days[1].action).toBe('WATER');
    expect(plan.days[1].window!.start < '08:00').toBe(true);
  });
  it('uses an evening fallback only when rules block the morning, and never past midnight', () => {
    const today = '2026-07-08';
    const p = profileWith({ rules: [rule({ type: 'allowed_hours', start: '19:00', end: '23:59' })] });
    const d = planWeek(p, weather(today), denverMorning(today, 2)).days[0];
    expect(d.action).toBe('WATER');
    expect(d.window!.start >= '19:00').toBe(true);
    expect(d.window!.end > d.window!.start).toBe(true);
  });
});

describe('daylight saving time', () => {
  it('local dates stay correct across the November fall-back', () => {
    expect(localParts(new Date('2026-11-01T07:30:00Z'), 'America/Denver')).toMatchObject({ date: '2026-11-01', time: '01:30' }); // MDT
    expect(localParts(new Date('2026-11-01T08:30:00Z'), 'America/Denver')).toMatchObject({ date: '2026-11-01', time: '01:30' }); // MST repeat
    expect(localParts(new Date('2026-11-02T06:59:00Z'), 'America/Denver').date).toBe('2026-11-01');
  });
  it('the March spring-forward day still yields a full plan', () => {
    const today = '2026-03-08';
    const plan = planWeek(profileWith({ zones: [{ ...profileWith().zones[0], growthState: 'active' }] }), weather(today), new Date('2026-03-08T08:00:00Z'));
    expect(plan.days[0].date).toBe(today);
  });
});
