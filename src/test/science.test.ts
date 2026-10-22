import { describe, expect, it } from 'vitest';
import { computeEt0, extraterrestrialRadiation, hargreaves, penmanMonteith, windTo2m } from '../lib/et0';
import { effectiveRain, runBalance, stepDepletion, countedRainIn } from '../lib/balance';
import { catchCanRate, runtimeFromGross, runtimeFromNet, splitCycles, grossFromNet } from '../lib/runtime';
import { cToF, fToC, gallonsFromDepth, inToMm, mmToIn, msToMph, mphToMs, wm2HourToMJ } from '../lib/units';
import { profileWith, weather } from './fixtures';

describe('unit conversions', () => {
  it('round-trips and matches known constants', () => {
    expect(mmToIn(25.4)).toBe(1);
    expect(inToMm(mmToIn(7.3))).toBeCloseTo(7.3);
    expect(cToF(0)).toBe(32);
    expect(fToC(cToF(21.7))).toBeCloseTo(21.7);
    expect(msToMph(mphToMs(15))).toBeCloseTo(15);
    expect(wm2HourToMJ(1000)).toBeCloseTo(3.6);
    expect(gallonsFromDepth(1000, 1)).toBeCloseTo(623.4, 0);
  });
});

describe('ET0 (FAO-56)', () => {
  it('reproduces FAO-56 Example 18 (Uccle, 6 July): ≈3.9 mm/day', () => {
    const et0 = penmanMonteith({ tMax: 21.5, tMin: 12.3, rhMax: 84, rhMin: 63, u2: 2.078, rs: 22.07, elevationM: 100, latDeg: 50.8, doy: 187 });
    expect(et0).toBeCloseTo(3.9, 1);
  });
  it('computes extraterrestrial radiation like FAO-56 Example 8 (20°S, 3 Sep ≈ 32.2 MJ/m²)', () => {
    expect(extraterrestrialRadiation(-20, 246)).toBeCloseTo(32.2, 0);
  });
  it('converts 10 m wind to 2 m (FAO-56 Example 14: 3.2 m/s at 10 m → 2.4 m/s)', () => {
    expect(windTo2m(3.2, 10)).toBeCloseTo(2.4, 1);
  });
  it('falls back to Hargreaves when humidity, wind or radiation is missing, and never fabricates them', () => {
    const r = computeEt0({ date: '2026-07-06', kind: 'recent', tMaxC: 30, tMinC: 15, overnightMinC: 15, rhMax: null, rhMin: null,
      windMeanMs: null, gustMaxMs: null, precipMm: 0, precipProbMaxPct: null, solarMJ: null, cloudMeanPct: null }, 39.7, 1650);
    expect(r.method).toBe('hargreaves');
    expect(r.missing).toEqual(expect.arrayContaining(['max humidity', 'wind', 'solar radiation']));
    expect(r.mm).toBeCloseTo(hargreaves(30, 15, 39.7, 187));
  });
  it('returns no estimate when temperature is missing', () => {
    const r = computeEt0({ date: '2026-07-06', kind: 'recent', tMaxC: null, tMinC: null, overnightMinC: null, rhMax: null, rhMin: null,
      windMeanMs: null, gustMaxMs: null, precipMm: 0, precipProbMaxPct: null, solarMJ: null, cloudMeanPct: null }, 39.7, 1650);
    expect(r).toMatchObject({ mm: null, method: 'none' });
  });
});

describe('effective rainfall and depletion', () => {
  const zone = { soil: 'loam' as const, slopeSensitive: false };
  it('ignores light rain, applies the soil factor above 0.1 in, and caps at the room left (no double counting)', () => {
    expect(effectiveRain(0.08, zone, 1)).toBe(0);
    expect(effectiveRain(0.5, zone, 1)).toBeCloseTo(0.3);           // 0.75 × 0.4
    expect(effectiveRain(2, zone, 0.25)).toBe(0.25);                 // cannot exceed the deficit
    expect(effectiveRain(0.5, { soil: 'clay', slopeSensitive: true }, 1)).toBeCloseTo(0.22); // (0.65−0.1) × 0.4
  });
  it('clamps depletion between 0 and TAW', () => {
    expect(stepDepletion(0.3, 0.2, 0, 0, 1)).toBeCloseTo(0.5);
    expect(stepDepletion(0.3, 0.2, 0.4, 0.5, 1)).toBe(0);
    expect(stepDepletion(0.9, 0.3, 0, 0, 1)).toBe(1);
  });
  it('counts forecast rain only at or above the probability threshold, never probability as amount', () => {
    const d = { date: '2026-07-07', kind: 'forecast' as const, tMaxC: 20, tMinC: 10, overnightMinC: 10, rhMax: 80, rhMin: 40, windMeanMs: 2,
      gustMaxMs: 4, precipMm: 12.7, precipProbMaxPct: 50, solarMJ: 20, cloudMeanPct: 50 };
    expect(countedRainIn(d, 60)).toBe(0);
    expect(countedRainIn({ ...d, precipProbMaxPct: 70 }, 60)).toBeCloseTo(0.5);
    expect(countedRainIn({ ...d, kind: 'recent', precipProbMaxPct: 10 }, 60)).toBeCloseTo(0.5); // reported rain is an amount
  });
  it('builds a daily balance where logged irrigation reduces the estimated deficit', () => {
    const today = '2026-07-08';
    const w = weather(today);
    const p = profileWith();
    const dry = runBalance(p.zones[0], w, p);
    const watered = runBalance(p.zones[0], w, { ...p, logs: [{ id: 'l1', zoneId: 'z1', date: '2026-07-07', time: '05:00', minutes: 40, note: '' }] });
    const di = dry.days.findIndex((d) => d.date === today);
    expect(watered.days[di].drStartIn).toBeLessThan(dry.days[di].drStartIn);
    expect(dry.days.every((d) => d.drEndIn >= 0 && d.drEndIn <= dry.tawIn)).toBe(true);
    expect(dry.days.every((d) => d.et0Method === 'penman_monteith')).toBe(true);
  });
});

describe('runtime formulas', () => {
  it('applies efficiency exactly once', () => {
    expect(runtimeFromNet(0.5, 0.7, 1.5)).toBeCloseTo(28.57, 1);   // 0.5 / (0.7 × 1.5) × 60
    const gross = grossFromNet(0.5, 0.7);
    expect(runtimeFromGross(gross, 1.5)).toBeCloseTo(runtimeFromNet(0.5, 0.7, 1.5)); // gross path does not re-apply E
  });
  it('rejects impossible inputs', () => {
    expect(() => runtimeFromNet(0.5, 0, 1.5)).toThrow();
    expect(() => runtimeFromNet(0.5, 0.7, 0)).toThrow();
    expect(() => runtimeFromGross(-1, 1)).toThrow();
  });
  it('splits runoff-prone runs into cycles', () => {
    expect(splitCycles(30, 1.5, 0.15)).toMatchObject({ cycles: 4, soak: 30 });
    expect(splitCycles(30, 0.5, 1.0)).toMatchObject({ cycles: 1 });
  });
  it('computes catch-can precipitation rate', () => {
    expect(catchCanRate([0.3, 0.4, 0.35, 0.35], 15)).toBeCloseTo(1.4);
    expect(() => catchCanRate([0.3, 0.4], 15)).toThrow();
  });
});
