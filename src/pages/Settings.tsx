import { Bell, MapPin, Sprout } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../App';
import { LocationForm } from '../components/LocationForm';
import { Assumed, Badge, Button, Card, Field, PageTitle } from '../components/ui';
import { GRASS, SOIL, SPRINKLER } from '../lib/agronomy';
import { notificationStatus, requestNotifications, showNotification } from '../lib/notify';
import type { GrassType, SoilTexture, SprinklerType } from '../lib/types';
import { useApp } from '../state';

export function SettingsPage(_: PageProps) {
  const { profile, update } = useApp();
  const [changing, setChanging] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const status = notificationStatus();

  const enableNotifications = async () => {
    const s = await requestNotifications();
    if (s === 'granted') {
      update((p) => ({ ...p, notificationsEnabled: true }));
      const r = showNotification('WaterWise notifications on', 'You’ll see a note on days watering is recommended while WaterWise is open.');
      setNotifyMsg(r === 'shown' ? 'Enabled. A test notification was sent to this browser.' : 'Permission granted, but this browser couldn’t display a test notification.');
    } else setNotifyMsg(s === 'denied' ? 'Permission was denied. You can allow notifications in your browser’s site settings.' : s === 'unsupported' ? 'This browser doesn’t support notifications.' : 'No permission given.');
  };

  return (
    <div className="ww-page ww-page-short">
      <PageTitle title="Settings" phrase="Make it your lawn" />
      <Card icon={MapPin} tone="sky" title="Location" action={!changing && <Button onClick={() => setChanging(true)}>Change</Button>}>
        <p className="text-center text-sm font-semibold">{profile.location?.label}</p>
        {changing && <LocationForm initial={profile.location} submitLabel="Look up" onResolved={(l) => { update((p) => ({ ...p, location: l })); setChanging(false); }} />}
      </Card>

      <LawnCard />

      <Card icon={Bell} tone="violet" title="Notifications">
        <p className="mb-3 text-sm">Status: <Badge tone={status === 'granted' && profile.notificationsEnabled ? 'leaf' : 'neutral'}>{status === 'unsupported' ? 'Not supported' : status === 'denied' ? 'Blocked by browser' : profile.notificationsEnabled && status === 'granted' ? 'On' : 'Off'}</Badge></p>
        {profile.notificationsEnabled ? <Button onClick={() => update((p) => ({ ...p, notificationsEnabled: false }))}>Turn off</Button> : <Button variant="primary" onClick={enableNotifications} disabled={status === 'unsupported'}>Enable notifications</Button>}
        {notifyMsg && <p role="status" className="mt-2 text-sm text-muted">{notifyMsg}</p>}
      </Card>
    </div>
  );
}

/** Lawn details that drive the estimates. Applies to the whole lawn. */
function LawnCard() {
  const { profile, update } = useApp();
  const z = profile.zones[0];
  const [grass, setGrass] = useState<GrassType>(z?.grass ?? 'kentucky_bluegrass');
  const [soil, setSoil] = useState<SoilTexture>(z?.soil ?? 'loam');
  const [sprinkler, setSprinkler] = useState<SprinklerType>(z?.sprinkler ?? 'spray');
  const [area, setArea] = useState(String(z?.areaSqFt || 2000));
  const [rate, setRate] = useState(z?.precipRateInHr == null ? '' : String(z.precipRateInHr));
  const [start, setStart] = useState(profile.thresholds.preferredStart);
  const [end, setEnd] = useState(profile.thresholds.preferredEnd);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () => {
    const a = Number(area), pr = rate.trim() ? Number(rate) : null;
    if (!(a >= 50 && a <= 500000)) return setMsg({ ok: false, text: 'Enter a lawn area between 50 and 500,000 sq ft.' });
    if (pr !== null && !(pr >= 0.05 && pr <= 5)) return setMsg({ ok: false, text: 'Sprinkler rate should be 0.05–5 in/hr, or blank if unknown.' });
    if (start >= end) return setMsg({ ok: false, text: 'The watering window must end after it starts.' });
    update((p) => {
      const zones = [z].map((x) => ({ ...x, grass, soil, sprinkler, areaSqFt: Math.round(a),
        precipRateInHr: pr, precipRateSource: pr === null ? ('default' as const) : ('manual' as const) }));
      return { ...p, zones, thresholds: { ...p.thresholds, preferredStart: start, preferredEnd: end } };
    });
    setMsg({ ok: true, text: 'Saved. Recommendations updated.' });
  };
  if (!z) return null;
  return (
    <Card icon={Sprout} tone="leaf" title="Your lawn">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Grass type">{(id) => <select id={id} value={grass} onChange={(e) => setGrass(e.target.value as GrassType)}>{Object.entries(GRASS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>}</Field>
        <Field label="Soil texture">{(id) => <select id={id} value={soil} onChange={(e) => setSoil(e.target.value as SoilTexture)}>{Object.entries(SOIL).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select>}</Field>
        <Field label="Sprinkler type" hint={SPRINKLER[sprinkler].note || undefined}>{(id) => <select id={id} value={sprinkler} onChange={(e) => setSprinkler(e.target.value as SprinklerType)}>{Object.entries(SPRINKLER).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select>}</Field>
        <Field label="Lawn area (sq ft)">{(id) => <input id={id} inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
        <Field label="Sprinkler rate (in/hr)" hint={<span className="inline-flex items-center gap-1">Blank = {SPRINKLER[sprinkler].precipRateInHr} in/hr <Assumed /></span>}>{(id) => <input id={id} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Unknown" />}</Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Water from">{(id) => <input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
          <Field label="Until">{(id) => <input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3"><Button variant="primary" onClick={save}>Save lawn</Button>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-bold ${msg.ok ? 'text-leaf' : 'text-alert'}`}>{msg.text}</p>}</div>
    </Card>
  );
}

