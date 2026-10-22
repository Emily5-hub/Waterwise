import { useState } from 'react';
import { geocodeZip, manualLocation } from '../lib/geocode';
import { US_TIMEZONES } from '../lib/time';
import type { Location } from '../lib/types';
import { normalizeZip } from '../lib/zip';
import { Button, Field, Notice } from './ui';

export function LocationForm({ initial, onResolved, submitLabel = 'Find my location' }: { initial?: Location | null; onResolved: (l: Location) => void; submitLabel?: string }) {
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [zipError, setZipError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(initial?.source === 'manual');
  const [lat, setLat] = useState(initial ? String(initial.latitude) : '');
  const [lon, setLon] = useState(initial ? String(initial.longitude) : '');
  const [tz, setTz] = useState(initial?.timezone ?? 'America/Denver');
  const [manualError, setManualError] = useState<string | null>(null);
  const [found, setFound] = useState<Location | null>(null);

  const lookUp = async () => {
    setServiceError(null); setFound(null);
    const check = normalizeZip(zip);
    if (!check.ok) { setZipError(check.error); return; }
    setZipError(null); setBusy(true);
    try { const loc = await geocodeZip(check.zip5); setFound(loc); setZip(check.zip5); }
    catch (e) { setServiceError((e as Error).message); }
    finally { setBusy(false); }
  };

  const useManual = () => {
    try { onResolved(manualLocation(Number(lat), Number(lon), tz)); setManualError(null); }
    catch (e) { setManualError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      {!manual && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); lookUp(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="US ZIP code" hint="Used to look up your coordinates and time zone for local weather." error={zipError}>
                {(id) => <input id={id} inputMode="numeric" autoComplete="postal-code" value={zip} maxLength={10} onChange={(e) => setZip(e.target.value)} placeholder="80012" aria-invalid={!!zipError} />}
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Looking up…' : submitLabel}</Button>
          </form>
          {serviceError && (
            <Notice tone="amber" role="alert">
              <p>{serviceError}</p>
              <div className="mt-2 flex flex-wrap gap-2"><Button onClick={lookUp}>Retry</Button><Button variant="ghost" onClick={() => setManual(true)}>Enter coordinates instead</Button></div>
            </Notice>
          )}
          {found && (
            <Notice tone="leaf">
              <p className="font-medium">{found.label}</p>
              <p className="text-xs">{found.latitude.toFixed(3)}, {found.longitude.toFixed(3)} · {found.timezone}</p>
              <div className="mt-2"><Button variant="primary" onClick={() => onResolved(found)}>Use this location</Button></div>
            </Notice>
          )}
        </>
      )}
      {manual && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Latitude">{(id) => <input id={id} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="39.70" />}</Field>
            <Field label="Longitude">{(id) => <input id={id} inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-104.84" />}</Field>
            <Field label="Time zone">{(id) => <select id={id} value={tz} onChange={(e) => setTz(e.target.value)}>{US_TIMEZONES.map((z) => <option key={z}>{z}</option>)}</select>}</Field>
          </div>
          {manualError && <p role="alert" className="text-sm font-medium text-alert">{manualError}</p>}
          <div className="flex gap-2"><Button variant="primary" onClick={useManual}>Use these coordinates</Button><Button variant="ghost" onClick={() => setManual(false)}>Use a ZIP code</Button></div>
        </div>
      )}
    </div>
  );
}
