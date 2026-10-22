/** ZIP → coordinates and time zone, no API keys. Results are validated before use.
 *  1. Open-Meteo geocoding, accepted only when a US result lists the exact postcode.
 *  2. Fallback when Open-Meteo has no match (its postcode index is incomplete):
 *     Zippopotam.us for the ZIP's coordinates and place name, then the time zone from a
 *     nearby Open-Meteo place with the same name and state, or Open-Meteo's own
 *     `timezone=auto` lookup for those coordinates. */
import { FetchLike, ServiceError, getJson } from './http';
import { isValidTimeZone } from './time';
import type { Location } from './types';
import { validateCoordinates } from './zip';

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const ZIPPOPOTAM_URL = 'https://api.zippopotam.us/us/';
const TIMEZONE_URL = 'https://api.open-meteo.com/v1/forecast';
/** A same-name place farther than this from the ZIP isn't trusted for its time zone. */
const MAX_PLACE_KM = 60;

interface GeoHit { name?: unknown; latitude?: unknown; longitude?: unknown; timezone?: unknown; country_code?: unknown; postcodes?: unknown; admin1?: unknown; admin2?: unknown }

const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined);
const notFound = (zip5: string) => new ServiceError('not_found', `We couldn’t find US ZIP code ${zip5}. Check it, retry, or enter coordinates manually.`);
const incomplete = () => new ServiceError('invalid_response', 'The location service returned incomplete data for that ZIP. Enter coordinates manually.');

function makeLocation(zip5: string, lat: number, lon: number, tz: string, city?: string, county?: string, state?: string): Location {
  if (validateCoordinates(lat, lon) || !isValidTimeZone(tz)) throw incomplete();
  const place = [city, state].filter(Boolean).join(', ');
  return { zip: zip5, latitude: lat, longitude: lon, timezone: tz, label: place ? `${place} ${zip5}` : zip5, source: 'zip', city, county, state };
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180, a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

async function searchOpenMeteo(name: string, fetchImpl: FetchLike): Promise<GeoHit[]> {
  const data = (await getJson(`${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=20&language=en&format=json&countryCode=US`, fetchImpl)) as { results?: unknown };
  return Array.isArray(data?.results) ? (data.results as GeoHit[]) : [];
}

async function viaOpenMeteo(zip5: string, fetchImpl: FetchLike): Promise<Location> {
  const match = (await searchOpenMeteo(zip5, fetchImpl))
    .find((r) => r.country_code === 'US' && Array.isArray(r.postcodes) && (r.postcodes as unknown[]).includes(zip5));
  if (!match) throw notFound(zip5);
  return makeLocation(zip5, Number(match.latitude), Number(match.longitude), String(match.timezone ?? ''), text(match.name), text(match.admin2), text(match.admin1));
}

async function viaZippopotam(zip5: string, fetchImpl: FetchLike): Promise<Location> {
  let data: { country?: unknown; places?: unknown };
  try {
    data = (await getJson(`${ZIPPOPOTAM_URL}${zip5}`, fetchImpl)) as typeof data;
  } catch (e) {
    if (e instanceof ServiceError && e.code === 'http' && /HTTP 404/.test(e.message)) throw notFound(zip5); // 404 = unknown ZIP
    throw e;
  }
  const places = Array.isArray(data?.places) ? (data.places as Record<string, unknown>[]) : [];
  const p = places[0];
  if (!p || data.country !== 'United States') throw notFound(zip5);
  const lat = Number(p.latitude), lon = Number(p.longitude), city = text(p['place name']), state = text(p.state);
  if (validateCoordinates(lat, lon)) throw incomplete();

  // Time zone (and county) from the nearest same-name place in the same state.
  let tz: string | undefined, county: string | undefined;
  if (city) {
    try {
      const near = (await searchOpenMeteo(city, fetchImpl))
        .filter((r) => r.country_code === 'US' && (!state || r.admin1 === state) && isValidTimeZone(String(r.timezone ?? '')))
        .map((r) => ({ r, km: distanceKm(lat, lon, Number(r.latitude), Number(r.longitude)) }))
        .filter((x) => Number.isFinite(x.km) && x.km <= MAX_PLACE_KM)
        .sort((a, b) => a.km - b.km)[0];
      if (near) { tz = String(near.r.timezone); county = text(near.r.admin2); }
    } catch { /* try the coordinate lookup below */ }
  }
  if (!tz) {
    const res = (await getJson(`${TIMEZONE_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&timezone=auto&forecast_days=1&daily=temperature_2m_max`, fetchImpl)) as { timezone?: unknown };
    tz = String(res?.timezone ?? '');
  }
  return makeLocation(zip5, lat, lon, tz, city, county, state);
}

export async function geocodeZip(zip5: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<Location> {
  let first: unknown;
  try { return await viaOpenMeteo(zip5, fetchImpl); } catch (e) { first = e; }
  try { return await viaZippopotam(zip5, fetchImpl); } catch (second) {
    // The fallback's answer wins when it says "not found" or the first service already did;
    // otherwise (both unreachable, rate limited…) report the first service's failure.
    const code = (e: unknown) => (e instanceof ServiceError ? e.code : null);
    if (code(second) === 'not_found' || code(first) === 'not_found' || !(first instanceof ServiceError)) throw second;
    throw first;
  }
}

export function manualLocation(lat: number, lon: number, tz: string): Location {
  const err = validateCoordinates(lat, lon);
  if (err) throw new Error(err);
  if (!isValidTimeZone(tz)) throw new Error('Choose a valid time zone.');
  return { zip: null, latitude: lat, longitude: lon, timezone: tz, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, source: 'manual' };
}
