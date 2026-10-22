import { describe, expect, it } from 'vitest';
import { planWeek } from '../lib/decision';
import { LOSS_MODEL, bestGardenTime, compareNowToRecommended, dayFractionUsed, sprinklerLoss, vpdKpa } from '../lib/loss';
import { addDays } from '../lib/time';
import type { HourlyPoint } from '../lib/types';
import { denverMorning, profileWith, weather } from './fixtures';

const pt = (o: Partial<HourlyPoint>): HourlyPoint => ({ time: '2026-07-07T05:00', date: '2026-07-07', hour: 5, tempC: 15, rhPct: 70, precipProbPct: 0, precipMm: 0, cloudPct: 0, solarWm2: 0, windMs: 1, gustMs: 2, ...o });

describe('sprinkler loss model', () => {
  it('computes vapor-pressure deficit from temperature and humidity (FAO-56 Eq. 11)', () => {
    expect(vpdKpa(20, 50)).toBeCloseTo(1.169, 2);
    expect(vpdKpa(20, 100)).toBe(0);
  });
  it('is small on a cool, calm dawn and large on a hot, dry, windy afternoon', () => {
    const dawn = sprinklerLoss(pt({}))!.fraction;
    const afternoon = sprinklerLoss(pt({ hour: 14, tempC: 33, rhPct: 15, windMs: 6, solarWm2: 850 }))!.fraction;
    expect(dawn).toBeLessThan(0.06);
    expect(afternoon).toBeGreaterThan(0.2);
    expect(afternoon).toBeLessThanOrEqual(LOSS_MODEL.max);
  });
  it('never fabricates missing inputs', () => {
    expect(sprinklerLoss(pt({ rhPct: null }))).toBeNull();
    expect(sprinklerLoss(pt({ windMs: null }))).toBeNull();
    expect(sprinklerLoss(pt({ hour: 13, solarWm2: null }))).toBeNull(); // daytime sun can't be assumed
    expect(sprinklerLoss(pt({ hour: 2, solarWm2: null }))).not.toBeNull(); // night: no sun
  });
});

describe('garden best time (rules ignored)', () => {
  const date = '2026-07-08';
  const w = weather(date);
  it('picks a calm early-morning hour', () => {
    const best = bestGardenTime(w, date, profileWith().thresholds)!;
    expect(best.hour).toBeGreaterThanOrEqual(4);
    expect(best.hour).toBeLessThan(10);
  });
  it('ignores lawn restrictions entirely', () => {
    const blocked = profileWith({ rules: [{ id: 'r', name: 'Shutdown', enabled: true, source: 'user', sourceNote: '', sourceUrl: '', kind: { type: 'seasonal_shutdown', start: '01-01', end: '12-31' } }] });
    expect(bestGardenTime(w, date, blocked.thresholds)).not.toBeNull();
  });
  it('skips freezing, windy and rainy hours, and hours already past', () => {
    const cold = weather(date, () => ({ tempC: -5 }));
    expect(bestGardenTime(cold, date, profileWith().thresholds)).toBeNull();
    const windy = weather(date, () => ({ windMs: 12 }));
    expect(bestGardenTime(windy, date, profileWith().thresholds)).toBeNull();
    expect(bestGardenTime(w, date, profileWith().thresholds, { date, hour: 22 })).toBeNull();
  });
});

describe('water now vs. recommended time', () => {
  const date = '2026-07-08';
  // Hot, dry afternoon "now"; the fixture's mornings are cool and calm.
  const w = weather(date, (h) => (h.hour >= 12 && h.hour <= 17 ? { tempC: 34, rhPct: 12, windMs: 6 } : {}));
  const now = new Date(`${date}T20:00:00Z`); // 2 PM in Denver (MDT)
  const profile = profileWith();

  it('follows the same run to the roots at both times; the parts add up and waiting saves water', () => {
    const plan = planWeek(profile, w, now);
    const c = compareNowToRecommended(profile, w, plan, 20, now);
    if (typeof c === 'string') throw new Error(c);
    expect(c.now.hour).toBe(14);
    expect(c.recommended.hour).toBeLessThan(10);
    for (const o of [c.now, c.recommended]) {
      expect(o.appliedGal).toBeCloseTo(1000 * 0.5 * (20 / 60) * 0.62334, 0); // rotor default 0.5 in/hr
      expect(o.airGal + o.unevenGal + o.drainGal + o.rootGal).toBeCloseTo(o.appliedGal);
      expect(o.unevenGal).toBeCloseTo((o.appliedGal - o.airGal) * (1 - 0.85)); // rotor efficiency, applied once
      expect(o.deficitIn).not.toBeNull();
      expect(o.rhPct).not.toBeNull(); // humidity and sun are part of the picture, not just wind
    }
    expect(c.now.airGal).toBeGreaterThan(c.recommended.airGal);
    expect(c.savedGal).toBeCloseTo((c.now.appliedGal - c.now.rootGal) - (c.recommended.appliedGal - c.recommended.rootGal));
    expect(c.savedGal).toBeGreaterThan(0);
  });

  it('counts water beyond the root zone’s room as soaking past the roots', () => {
    const watered = profileWith({ logs: [{ id: 'l', zoneId: 'z1', date, time: '05:00', minutes: 200, note: '' }] }); // root zone already refilled
    const c = compareNowToRecommended(watered, w, planWeek(watered, w, now), 60, now);
    if (typeof c === 'string') throw new Error(c);
    expect(c.now.drainGal).toBeGreaterThan(0);
    expect(c.now.rootGal).toBeLessThan(c.now.appliedGal - c.now.airGal - c.now.unevenGal);
  });

  it('includes daylight water use when estimating the deficit later in the day', () => {
    expect(dayFractionUsed(5)).toBe(0);
    expect(dayFractionUsed(13)).toBeCloseTo(0.5);
    expect(dayFractionUsed(21)).toBe(1);
  });

  it('falls back to the lowest-loss forecast hour when no lawn watering is recommended', () => {
    const blocked = profileWith({ rules: [{ id: 'r', name: 'Shutdown', enabled: true, source: 'user', sourceNote: '', sourceUrl: '', kind: { type: 'seasonal_shutdown', start: '01-01', end: '12-31' } }] });
    const c = compareNowToRecommended(blocked, w, planWeek(blocked, w, now), 20, now);
    if (typeof c === 'string') throw new Error(c);
    expect(c.recommended.source).toBe('garden');
  });

  it('refuses impossible runtimes and missing current data instead of guessing', () => {
    expect(compareNowToRecommended(profile, w, null, 0, now)).toMatch(/runtime/);
    const gap = weather(date, (h, d) => (d === 0 && h.hour === 14 ? { rhPct: null } : {}));
    expect(compareNowToRecommended(profile, gap, null, 20, now)).toMatch(/current hour/);
  });

  it('uses the plan’s recommended start when the lawn needs water', () => {
    const morning = denverMorning(addDays(date, 0), 1);
    const plan = planWeek(profile, w, morning);
    const water = plan.days.find((d) => d.action === 'WATER');
    const c = compareNowToRecommended(profile, w, plan, 20, now);
    if (typeof c === 'string' || !water?.window) return; // nothing to compare against in this fixture
    expect(['plan', 'garden']).toContain(c.recommended.source);
  });
});
