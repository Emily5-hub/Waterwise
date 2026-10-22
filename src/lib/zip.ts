/** US ZIP validation. Syntax only: a well-formed ZIP may still not exist,
 *  so geocoding must confirm it before any weather request. */
export type ZipCheck = { ok: true; zip5: string } | { ok: false; error: string };

export function normalizeZip(input: string): ZipCheck {
  const value = (input ?? '').trim();
  if (!value) return { ok: false, error: 'Enter a 5-digit US ZIP code.' };
  const m = /^(\d{5})(?:[-\s]?(\d{4}))?$/.exec(value);
  if (!m) return { ok: false, error: 'That doesn’t look like a US ZIP code. Use 5 digits, like 80012, or ZIP+4 like 80012-1234.' };
  if (m[1] === '00000') return { ok: false, error: '00000 isn’t a valid ZIP code.' };
  return { ok: true, zip5: m[1] };
}

export function validateCoordinates(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Latitude and longitude must be numbers.';
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.';
  if (lon < -180 || lon > 180) return 'Longitude must be between -180 and 180.';
  // US states and territories, including Alaska, Hawaii and Puerto Rico.
  const inUS = lat >= 17.5 && lat <= 71.6 && (lon <= -64 || lon >= 172);
  if (!inUS) return 'These coordinates are outside the United States. WaterWise currently supports US locations.';
  return null;
}
