/** Local persistence (localStorage). Data is validated on load; corrupt data is
 *  backed up rather than silently discarded. */
import type { Profile, Rule, Thresholds, WaterLog, WeatherData, Zone } from './types';

export const PROFILE_KEY = 'waterwise.profile.v1';
export const WEATHER_KEY = 'waterwise.weather.v1';
/** Key used before the app was renamed; read once and moved to PROFILE_KEY. */
export const LEGACY_PROFILE_KEY = 'aquasprout.profile.v1';

export const DEFAULT_THRESHOLDS: Thresholds = { windMph: 15, freezeF: 32, rainProbPct: 60, preferredStart: '04:00', preferredEnd: '08:00', mad: 0.5 };

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function defaultZone(index = 1): Zone {
  return { id: newId(), name: `Zone ${index}`, areaSqFt: 1000, grass: 'kentucky_bluegrass', soil: 'loam', sprinkler: 'spray',
    precipRateInHr: null, precipRateSource: 'default', efficiency: null, slopeSensitive: false, growthState: 'auto', kcOverride: null, rootDepthIn: null };
}

/** Only http(s) links are ever rendered as clickable. */
export const safeUrl = (u: string): string | null => (/^https?:\/\/[^\s]+$/i.test(u.trim()) ? u.trim() : null);

export function defaultProfile(): Profile {
  return { version: 1, onboarded: false, location: null, zones: [], rules: [], thresholds: { ...DEFAULT_THRESHOLDS },
    addressParity: null, logs: [], baselineMinutesPerSession: 20, notificationsEnabled: false, useSampleData: false };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const inRange = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): v is T => typeof v === 'string' && (opts as readonly string[]).includes(v);
const hhmm = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function validZone(z: unknown): z is Zone {
  return isObj(z) && typeof z.id === 'string' && typeof z.name === 'string' && inRange(z.areaSqFt, 1, 1_000_000)
    && oneOf(z.grass, ['bermuda', 'st_augustine', 'kentucky_bluegrass', 'fescue'] as const) && oneOf(z.soil, ['sand', 'loam', 'clay'] as const)
    && oneOf(z.sprinkler, ['spray', 'rotor', 'drip'] as const) && (z.precipRateInHr === null || inRange(z.precipRateInHr, 0.05, 5))
    && (z.efficiency === null || inRange(z.efficiency, 0.3, 1)) && oneOf(z.growthState, ['auto', 'active', 'dormant'] as const)
    && (z.kcOverride === null || inRange(z.kcOverride, 0.1, 1.5)) && (z.rootDepthIn === null || inRange(z.rootDepthIn, 1, 36));
}

export function validLog(l: unknown): l is WaterLog {
  return isObj(l) && typeof l.id === 'string' && typeof l.zoneId === 'string' && typeof l.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.date)
    && hhmm(l.time) && inRange(l.minutes, 1, 600);
}

const validRule = (r: unknown): r is Rule => isObj(r) && typeof r.id === 'string' && typeof r.name === 'string' && isObj(r.kind)
  && oneOf(r.source, ['municipal_unverified', 'municipal_confirmed', 'user'] as const);

export function sanitizeProfile(raw: unknown): Profile {
  const base = defaultProfile();
  if (!isObj(raw) || raw.version !== 1) throw new Error('Unrecognized saved data');
  const t = isObj(raw.thresholds) ? raw.thresholds : {};
  const loc = isObj(raw.location) && inRange(raw.location.latitude, -90, 90) && inRange(raw.location.longitude, -180, 180)
    && typeof raw.location.timezone === 'string' ? (raw.location as unknown as Profile['location']) : null;
  return {
    ...base,
    onboarded: raw.onboarded === true && loc !== null,
    location: loc,
    zones: Array.isArray(raw.zones) ? raw.zones.filter(validZone) : [],
    rules: Array.isArray(raw.rules) ? raw.rules.filter(validRule) : [],
    logs: Array.isArray(raw.logs) ? raw.logs.filter(validLog) : [],
    thresholds: {
      windMph: inRange(t.windMph, 1, 60) ? (t.windMph as number) : base.thresholds.windMph,
      freezeF: inRange(t.freezeF, 20, 45) ? (t.freezeF as number) : base.thresholds.freezeF,
      rainProbPct: inRange(t.rainProbPct, 10, 100) ? (t.rainProbPct as number) : base.thresholds.rainProbPct,
      preferredStart: hhmm(t.preferredStart) ? (t.preferredStart as string) : base.thresholds.preferredStart,
      preferredEnd: hhmm(t.preferredEnd) ? (t.preferredEnd as string) : base.thresholds.preferredEnd,
      mad: inRange(t.mad, 0.2, 0.8) ? (t.mad as number) : base.thresholds.mad,
    },
    addressParity: raw.addressParity === 'odd' || raw.addressParity === 'even' ? raw.addressParity : null,
    baselineMinutesPerSession: inRange(raw.baselineMinutesPerSession, 1, 120) ? (raw.baselineMinutesPerSession as number) : 20,
    notificationsEnabled: raw.notificationsEnabled === true,
    useSampleData: raw.useSampleData === true,
  };
}

export function loadProfile(storage: Storage = localStorage): { profile: Profile; error: string | null } {
  let text: string | null = null;
  try {
    text = storage.getItem(PROFILE_KEY);
    if (!text && (text = storage.getItem(LEGACY_PROFILE_KEY))) { storage.setItem(PROFILE_KEY, text); storage.removeItem(LEGACY_PROFILE_KEY); }
  } catch { return { profile: defaultProfile(), error: 'Local storage is unavailable; changes won’t be saved.' }; }
  if (!text) return { profile: defaultProfile(), error: null };
  try {
    return { profile: sanitizeProfile(JSON.parse(text)), error: null };
  } catch {
    try { storage.setItem(`${PROFILE_KEY}.corrupt`, text); } catch { /* ignore */ }
    return { profile: defaultProfile(), error: 'Saved settings were unreadable and were reset. A backup copy was kept in this browser.' };
  }
}

export function saveProfile(p: Profile, storage: Storage = localStorage): string | null {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(p)); return null; } catch { return 'Couldn’t save to this browser (storage full or blocked).'; }
}

export function loadWeather(locKey: string, storage: Storage = localStorage): WeatherData | null {
  try {
    const raw = JSON.parse(storage.getItem(WEATHER_KEY) ?? 'null');
    if (raw?.key !== locKey || !raw?.data?.hourly) return null;
    return raw.data as WeatherData;
  } catch { return null; }
}

export function saveWeather(locKey: string, data: WeatherData, storage: Storage = localStorage) {
  try { storage.setItem(WEATHER_KEY, JSON.stringify({ key: locKey, data })); } catch { /* cache is optional */ }
}

export const locationKey = (l: { latitude: number; longitude: number; timezone: string }) => `${l.latitude.toFixed(3)},${l.longitude.toFixed(3)},${l.timezone}`;
