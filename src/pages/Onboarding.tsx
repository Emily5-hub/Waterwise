import { useState } from 'react';
import { LocationForm } from '../components/LocationForm';
import { Logo, Wordmark } from '../components/Brand';
import { Button, Card, Field, Notice } from '../components/ui';
import { GRASS, SOIL, SPRINKLER } from '../lib/agronomy';
import { defaultZone } from '../lib/storage';
import type { GrassType, Location, SoilTexture, SprinklerType } from '../lib/types';
import { useApp } from '../state';

export function Onboarding() {
  const { update } = useApp();
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState<Location | null>(null);
  // Nothing is pre-filled: the lawn details start blank and must be chosen before continuing.
  const [grass, setGrass] = useState<GrassType | ''>('');
  const [soil, setSoil] = useState<SoilTexture | ''>('');
  const [sprinkler, setSprinkler] = useState<SprinklerType | ''>('');
  const [area, setArea] = useState('');
  const [rate, setRate] = useState('');
  const [start, setStart] = useState('04:00');
  const [end, setEnd] = useState('08:00');
  const [error, setError] = useState<string | null>(null);

  const lawnDone = () => {
    if (!grass || !soil || !sprinkler) return setError('Choose your grass type, soil texture and sprinkler type.');
    const a = Number(area);
    if (!area.trim() || !(a >= 50 && a <= 500000)) return setError('Enter a lawn area between 50 and 500,000 sq ft.');
    setError(null); setStep(3);
  };

  const finish = () => {
    if (!grass || !soil || !sprinkler) return setStep(2);
    const a = Number(area), pr = rate.trim() ? Number(rate) : null;
    if (!(a >= 50 && a <= 500000)) return setError('Enter a lawn area between 50 and 500,000 sq ft.');
    if (pr !== null && !(pr >= 0.05 && pr <= 5)) return setError('Precipitation rate should be between 0.05 and 5 in/hr, or blank if unknown.');
    if (start >= end) return setError('The preferred window must end after it starts.');
    const zones = [{ ...defaultZone(1), name: 'Lawn', areaSqFt: Math.round(a), grass, soil, sprinkler,
      precipRateInHr: pr, precipRateSource: pr === null ? ('default' as const) : ('manual' as const) }];
    update((p) => ({ ...p, onboarded: true, location, zones, thresholds: { ...p.thresholds, preferredStart: start, preferredEnd: end } }));
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-10 flex items-center gap-4">
        <Logo size={60} />
        <div><h1 className="text-3xl font-extrabold">Welcome to <Wordmark /></h1><p className="text-sm font-semibold text-muted">Step {step} of 3</p></div>
      </div>
      <div className="mb-12 grid grid-cols-3 gap-3" aria-hidden>
        {[1, 2, 3].map((n) => <span key={n} className={`h-2.5 rounded-full ${n <= step ? 'bg-gradient-to-r from-leaf to-sky' : 'bg-line'}`} />)}
      </div>
      {step === 1 && (
        <Card title="Where is your lawn?">
          {location
            ? <Notice tone="leaf"><p className="font-medium">{location.label}</p><p className="text-xs">{location.timezone}</p>
                <div className="mt-6 flex gap-8"><Button variant="primary" onClick={() => setStep(2)}>Continue</Button><Button variant="ghost" onClick={() => setLocation(null)}>Change</Button></div></Notice>
            : <LocationForm onResolved={(l) => { setLocation(l); setStep(2); }} />}
        </Card>
      )}
      {step === 2 && (
        <Card title="Your lawn">
          <div className="mt-4 grid gap-x-16 gap-y-12 sm:grid-cols-2">
            <Field label="Grass type" hint="Sets how fast the lawn uses water.">{(id) => <select id={id} value={grass} onChange={(e) => setGrass(e.target.value as GrassType)}><option value="" disabled>Choose…</option>{Object.entries(GRASS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>}</Field>
            <Field label="Soil texture" hint="How much water the soil holds and how fast it soaks in.">{(id) => <select id={id} value={soil} onChange={(e) => setSoil(e.target.value as SoilTexture)}><option value="" disabled>Choose…</option>{Object.entries(SOIL).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>}</Field>
            <Field label="Lawn area (sq ft)" hint="Used for gallon estimates.">{(id) => <input id={id} inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
            <Field label="Sprinkler type" hint={sprinkler ? SPRINKLER[sprinkler].note || undefined : undefined}>{(id) => <select id={id} value={sprinkler} onChange={(e) => setSprinkler(e.target.value as SprinklerType)}><option value="" disabled>Choose…</option>{Object.entries(SPRINKLER).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>}</Field>
            <Field label="Precipitation rate (in/hr)" hint="Leave blank if you don’t know.">{(id) => <input id={id} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Unknown" />}</Field>
          </div>
          {error && <p role="alert" className="mt-8 text-sm font-medium text-alert">{error}</p>}
          <div className="mt-14 flex justify-between"><Button variant="ghost" onClick={() => { setError(null); setStep(1); }}>Back</Button><Button variant="primary" onClick={lawnDone}>Continue</Button></div>
        </Card>
      )}
      {step === 3 && (
        <Card title="When can you water?">
          <div className="mt-4 grid gap-x-16 gap-y-12 sm:grid-cols-2">
            <Field label="Preferred start">{(id) => <input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
            <Field label="Preferred end">{(id) => <input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
          </div>
          {error && <p role="alert" className="mt-8 text-sm font-medium text-alert">{error}</p>}
          <div className="mt-14 flex flex-wrap justify-between gap-4">
            <Button variant="ghost" onClick={() => { setError(null); setStep(2); }}>Back</Button>
            <Button variant="primary" onClick={finish}>Finish</Button>
          </div>
        </Card>
      )}
    </main>
  );
}
