/** Unit conversions. Every conversion the app uses lives here. */
export const MM_PER_IN = 25.4;
/** 1 ft² × 1 in of water = 1/12 ft³ × 7.48052 gal/ft³ ≈ 0.6234 gal. */
export const GALLONS_PER_SQFT_INCH = 7.48052 / 12;

export const mmToIn = (mm: number) => mm / MM_PER_IN;
export const inToMm = (inch: number) => inch * MM_PER_IN;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const msToMph = (ms: number) => ms * 2.236936;
export const mphToMs = (mph: number) => mph / 2.236936;
/** Hourly mean irradiance (W/m²) over one hour → energy (MJ/m²). */
export const wm2HourToMJ = (wm2: number) => (wm2 * 3600) / 1e6;
export const gallonsFromDepth = (areaSqFt: number, depthIn: number) => areaSqFt * depthIn * GALLONS_PER_SQFT_INCH;

export const fmt = (v: number | null | undefined, digits = 0, suffix = '') =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}${suffix}`;
