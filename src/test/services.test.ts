import { describe, expect, it } from 'vitest';
import { normalizeZip, validateCoordinates } from '../lib/zip';
import { geocodeZip, manualLocation } from '../lib/geocode';
import { fetchWeather, parseForecast } from '../lib/weather';
import { ServiceError } from '../lib/http';
import { defaultProfile, loadProfile, PROFILE_KEY, saveProfile } from '../lib/storage';
import { summarizeUsage } from '../lib/usage';
import { DENVER, profileWith } from './fixtures';

const ok = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body });

describe('ZIP validation', () => {
  it('accepts 5-digit and ZIP+4, normalizing to 5 digits', () => {
    expect(normalizeZip('80012')).toEqual({ ok: true, zip5: '80012' });
    expect(normalizeZip(' 80012-1234 ')).toEqual({ ok: true, zip5: '80012' });
  });
  it.each(['', '8001', 'ABCDE', '800123', '00000', 'SW1A 1AA'])('rejects %s with a message', (z) => {
    const r = normalizeZip(z);
    expect(r.ok).toBe(false);
  });
  it('rejects coordinates outside the US', () => {
    expect(validateCoordinates(51.5, -0.12)).toMatch(/outside/);
    expect(validateCoordinates(39.7, -104.8)).toBeNull();
    expect(validateCoordinates(NaN, 1)).not.toBeNull();
  });
});

describe('geocoding', () => {
  it('resolves a ZIP whose postcode matches', async () => {
    const loc = await geocodeZip('80012', ok({ results: [{ name: 'Aurora', admin1: 'Colorado', latitude: 39.7, longitude: -104.84, timezone: 'America/Denver', country_code: 'US', postcodes: ['80012'] }] }));
    expect(loc).toMatchObject({ zip: '80012', timezone: 'America/Denver', source: 'zip' });
  });
  it('reports a well-formed but nonexistent ZIP as not found', async () => {
    await expect(geocodeZip('99999', ok({}))).rejects.toMatchObject({ code: 'not_found' });
  });
  it('rejects non-US or mismatched results', async () => {
    await expect(geocodeZip('80012', ok({ results: [{ latitude: 51, longitude: 0, timezone: 'Europe/London', country_code: 'GB', postcodes: ['80012'] }] }))).rejects.toBeInstanceOf(ServiceError);
  });
  it('handles network failures and rate limits', async () => {
    await expect(geocodeZip('80012', async () => { throw new Error('offline'); })).rejects.toMatchObject({ code: 'network' });
    await expect(geocodeZip('80012', async () => ({ ok: false, status: 429, json: async () => ({}) }))).rejects.toMatchObject({ code: 'rate_limited' });
  });
  // Routes each request by host so the fallback chain can be tested end to end.
  const route = (handlers: Record<string, (url: string) => { status?: number; body?: unknown } | 'offline'>) => async (url: string) => {
    const key = Object.keys(handlers).find((k) => url.includes(k));
    const r = key ? handlers[key](url) : { status: 404, body: {} };
    if (r === 'offline') throw new Error('offline');
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.body ?? {} };
  };
  const zippo = { country: 'United States', places: [{ 'place name': 'Aurora', state: 'Colorado', latitude: '39.6987', longitude: '-104.8377' }] };
  const auroras = { results: [
    { name: 'Aurora', admin1: 'Illinois', admin2: 'Kane', latitude: 41.76, longitude: -88.32, timezone: 'America/Chicago', country_code: 'US' },
    { name: 'Aurora', admin1: 'Colorado', admin2: 'Adams', latitude: 39.729, longitude: -104.832, timezone: 'America/Denver', country_code: 'US' },
  ] };

  it('falls back to Zippopotam when Open-Meteo has no postcode match, taking the time zone from the nearby same-state place', async () => {
    const loc = await geocodeZip('80012', route({
      'geocoding-api.open-meteo.com/v1/search?name=80012': () => ({ body: {} }),
      'zippopotam.us/us/80012': () => ({ body: zippo }),
      'geocoding-api.open-meteo.com/v1/search?name=Aurora': () => ({ body: auroras }),
    }));
    expect(loc).toMatchObject({ zip: '80012', latitude: 39.6987, longitude: -104.8377, timezone: 'America/Denver', city: 'Aurora', state: 'Colorado', county: 'Adams' });
  });
  it('uses Open-Meteo’s coordinate time-zone lookup when no nearby place matches', async () => {
    const loc = await geocodeZip('80012', route({
      'search?name=80012': () => ({ body: {} }),
      'zippopotam.us': () => ({ body: zippo }),
      'search?name=Aurora': () => ({ body: { results: [auroras.results[0]] } }), // only the Illinois one: too far
      'api.open-meteo.com/v1/forecast': (u) => ({ body: { timezone: u.includes('timezone=auto') ? 'America/Denver' : 'bad' } }),
    }));
    expect(loc.timezone).toBe('America/Denver');
    expect(loc.county).toBeUndefined();
  });
  it('reports not found when both services say so, and a network error when the fallback is unreachable', async () => {
    await expect(geocodeZip('99999', route({ 'open-meteo': () => ({ body: {} }), 'zippopotam': () => ({ status: 404, body: {} }) }))).rejects.toMatchObject({ code: 'not_found' });
    await expect(geocodeZip('80012', route({ 'open-meteo': () => ({ body: {} }), 'zippopotam': () => 'offline' }))).rejects.toMatchObject({ code: 'network' });
    await expect(geocodeZip('80012', route({ 'open-meteo': () => ({ body: {} }), 'zippopotam': () => ({ status: 500 }) }))).rejects.toMatchObject({ code: 'http' });
  });
  it('rejects a fallback result with an unusable time zone instead of guessing one', async () => {
    await expect(geocodeZip('80012', route({
      'search?name=80012': () => ({ body: {} }), 'zippopotam.us': () => ({ body: zippo }),
      'search?name=Aurora': () => ({ body: {} }), 'v1/forecast': () => ({ body: { timezone: 'Not/AZone' } }),
    }))).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('validates manual coordinates and time zone', () => {
    expect(manualLocation(39.7, -104.8, 'America/Denver').source).toBe('manual');
    expect(() => manualLocation(39.7, -104.8, 'Mars/Olympus')).toThrow();
    expect(() => manualLocation(48.8, 2.3, 'America/Denver')).toThrow(/outside/);
  });
});

describe('weather parsing', () => {
  const hours = Array.from({ length: 48 }, (_, i) => `2026-07-0${7 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`);
  it('keeps a missing variable missing instead of inventing it', () => {
    const w = parseForecast({ elevation: 1650, hourly: { time: hours, temperature_2m: hours.map(() => 20) } }, DENVER, new Date('2026-07-08T12:00:00Z'));
    expect(w.hourly[0].solarWm2).toBeNull();
    expect(w.daily[0].solarMJ).toBeNull();
    expect(w.daily[0].tMaxC).toBe(20);
  });
  it('treats a variable array of the wrong length as missing (partial response)', () => {
    const w = parseForecast({ hourly: { time: hours, temperature_2m: [1, 2, 3] } }, DENVER, new Date());
    expect(w.daily[0].tMaxC).toBeNull();
  });
  it('rejects responses with no hourly data', () => {
    expect(() => parseForecast({ hourly: {} }, DENVER, new Date())).toThrow(ServiceError);
  });
  it('never sends invalid coordinates', async () => {
    let called = false;
    await expect(fetchWeather({ ...DENVER, latitude: 999 }, async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; })).rejects.toBeInstanceOf(ServiceError);
    expect(called).toBe(false);
  });
});

describe('persistence', () => {
  it('saves and reloads a profile', () => {
    const p = profileWith({ logs: [{ id: 'a', zoneId: 'z1', date: '2026-07-07', time: '05:00', minutes: 20, note: '' }] });
    expect(saveProfile(p)).toBeNull();
    const back = loadProfile();
    expect(back.error).toBeNull();
    expect(back.profile.logs).toHaveLength(1);
    expect(back.profile.zones[0].id).toBe('z1');
  });
  it('merges older multi-area data into one lawn', () => {
    const base = profileWith().zones[0];
    const p = profileWith({
      zones: [{ ...base, id: 'z1', areaSqFt: 1500 }, { ...base, id: 'z2', name: 'Back', areaSqFt: 500 }],
      logs: [{ id: 'a', zoneId: 'z2', date: '2026-07-07', time: '05:00', minutes: 20, note: '' }],
    });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    const back = loadProfile().profile;
    expect(back.zones).toHaveLength(1);
    expect(back.zones[0]).toMatchObject({ id: 'z1', name: 'Lawn', areaSqFt: 2000 });
    expect(back.logs[0].zoneId).toBe('z1');
  });
  it('drops invalid records and resets corrupt data with a backup', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...defaultProfile(), logs: [{ id: 'x', minutes: -5 }] }));
    expect(loadProfile().profile.logs).toHaveLength(0);
    localStorage.setItem(PROFILE_KEY, '{not json');
    const r = loadProfile();
    expect(r.error).toMatch(/reset/);
    expect(localStorage.getItem(`${PROFILE_KEY}.corrupt`)).toBe('{not json');
  });
});

describe('usage estimates', () => {
  it('estimates gallons from area and rate and compares to a Mon/Wed/Fri baseline', () => {
    const p = profileWith({ logs: [{ id: 'a', zoneId: 'z1', date: '2026-07-07', time: '05:00', minutes: 30, note: '' }] });
    const s = summarizeUsage(p, '2026-07-06', '2026-07-12'); // Mon–Sun
    expect(s.gallons).toBeCloseTo(1000 * (0.5 * 30 / 60) * 0.6234, 0); // rotor default 0.5 in/hr
    expect(s.gallonsUseDefaults).toBe(true);
    expect(s.baselineSessions).toBe(3);
    expect(s.avoidedGallons).toBeCloseTo(s.baselineGallons - s.gallons);
  });
  it('counts a one-zone log as that zone’s share of the lawn, and an all-zones log as the whole lawn', () => {
    const base = profileWith();
    const p = profileWith({ zones: [{ ...base.zones[0], sprinklerZones: 4 }], logs: [
      { id: 'a', zoneId: 'z1', date: '2026-07-07', time: '05:00', minutes: 20, note: '', zoneNo: 2 },
      { id: 'b', zoneId: 'z1', date: '2026-07-08', time: '05:00', minutes: 20, note: '' }] });
    const one = 1000 / 4 * (0.5 * 20 / 60) * 0.6234, all = 1000 * (0.5 * 20 / 60) * 0.6234;
    expect(summarizeUsage(p, '2026-07-07', '2026-07-07').gallons).toBeCloseTo(one, 1);
    expect(summarizeUsage(p, '2026-07-08', '2026-07-08').gallons).toBeCloseTo(all, 1);
  });
});
