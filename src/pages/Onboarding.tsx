import { Clock, MapPin, Sprout } from 'lucide-react';
import { useState } from 'react';
import { LocationForm } from '../components/LocationForm';
import { Logo, Wordmark } from '../components/Brand';
import { Button, Card, Details, Field, Notice } from '../components/ui';
import { GRASS, SOIL, SPRINKLER } from '../lib/agronomy';
import { defaultZone } from '../lib/storage';
import type { GrassType, Location, SoilTexture, SprinklerType } from '../lib/types';
import { useApp } from '../state';

export function Onboarding() {
  const { update } = useApp();
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState<Location | null>(null);
  const [grass, setGrass] = useState<GrassType>('kentucky_bluegrass');
  const [soil, setSoil] = useState<SoilTexture>('loam');
  const [sprinkler, setSprinkler] = useState<SprinklerType>('spray');
  const [area, setArea] = useState('2000');
  const [rate, setRate] = useState('');
  const [start, setStart] = useState('04:00');
  const [end, setEnd] = useState('08:00');
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    const a = Number(area), pr = rate.trim() ? Number(rate) : null;
    if (!(a >= 50 && a <= 500000)) return setError('Enter a lawn area between 50 and 500,000 sq ft.');
    if (pr !== null && !(pr >= 0.05 && pr <= 5)) return setError('Precipitation rate should be between 0.05 and 5 in/hr, or blank if unknown.');
    if (start >= end) return setError('The preferred window must end after it starts.');
    const zones = [{ ...defaultZone(1), name: 'Lawn', areaSqFt: Math.round(a), grass, soil, sprinkler,
      precipRateInHr: pr, precipRateSource: pr === null ? ('default' as const) : ('manual' as const) }];
    update((p) => ({ ...p, onboarded: true, location, zones, thresholds: { ...p.thresholds, preferredStart: start, preferredEnd: end } }));
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={60} />
        <div><h1 className="text-3xl font-extrabold">Welcome to <Wordmark /></h1><p className="text-sm font-semibold text-muted">Step {step} of 3 · about a minute</p></div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => <span key={n} className={`h-2.5 rounded-full ${n <= step ? 'bg-gradient-to-r from-leaf to-sky' : 'bg-line'}`} />)}
      </div>
      {step === 1 && (
        <Card icon={MapPin} tone="sky" title="Where is your lawn?">
          {location
            ? <Notice tone="leaf"><p className="font-medium">{location.label}</p><p className="text-xs">{location.timezone}</p>
                <div className="mt-2 flex gap-2"><Button variant="primary" onClick={() => setStep(2)}>Continue</Button><Button variant="ghost" onClick={() => setLocation(null)}>Change</Button></div></Notice>
            : <LocationForm onResolved={(l) => { setLocation(l); setStep(2); }} />}
        </Card>
      )}
      {step === 2 && (
        <Card icon={Sprout} tone="leaf" title="Your lawn">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grass type" hint="Sets how fast the lawn uses water.">{(id) => <select id={id} value={grass} onChange={(e) => setGrass(e.target.value as GrassType)}>{Object.entries(GRASS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>}</Field>
            <Field label="Soil texture" hint="How much water the soil holds and how fast it soaks in.">{(id) => <select id={id} value={soil} onChange={(e) => setSoil(e.target.value as SoilTexture)}>{Object.entries(SOIL).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>}</Field>
            <Field label="Lawn area (sq ft)" hint="Used for gallon estimates.">{(id) => <input id={id} inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
            <Field label="Sprinkler type" hint={SPRINKLER[sprinkler].note || 'Sets default output and efficiency.'}>{(id) => <select id={id} value={sprinkler} onChange={(e) => setSprinkler(e.target.value as SprinklerType)}>{Object.entries(SPRINKLER).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>}</Field>
            <Field label="Precipitation rate (in/hr)" hint={`Blank if unknown (we’ll use ${SPRINKLER[sprinkler].precipRateInHr} in/hr).`}>{(id) => <input id={id} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Unknown" />}</Field>
          </div>
          <div className="mt-4"><Details summary="Where do these defaults come from?">
            <p><strong>Kentucky bluegrass</strong> is the most common lawn in Colorado and the northern US; in the hot South, Bermuda or St. Augustine is likelier.</p>
            <p><strong>Loam</strong> is the middle option. Clay holds a bit less usable water and soaks it up slowly; sand holds much less.</p>
            <p><strong>2,000 sq ft</strong> is a typical suburban lawn. It only changes gallon estimates, not when to water.</p>
            <p><strong>Spray heads</strong> are the most common home sprinkler (about 1.5 in/hr) until you enter your own rate.</p>
            <p>The values come from the FAO-56 irrigation guide and university extension services. They’re starting assumptions, not measurements of your yard.</p>
          </Details></div>
          <div className="mt-5 flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button variant="primary" onClick={() => setStep(3)}>Continue</Button></div>
        </Card>
      )}
      {step === 3 && (
        <Card icon={Clock} tone="violet" title="When can you water?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred start">{(id) => <input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
            <Field label="Preferred end">{(id) => <input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
          </div>
          <div className="mt-4"><Notice tone="amber">WaterWise doesn’t know your water provider’s rules. Add them under Rules.</Notice></div>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-alert">{error}</p>}
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" onClick={finish}>Finish</Button>
          </div>
        </Card>
      )}
    </main>
  );
}
