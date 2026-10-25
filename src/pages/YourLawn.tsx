import { Leaf, Sprout } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../App';
import { Assumed, Card, Field, PageTitle } from '../components/ui';
import { GRASS_PHOTOS } from '../lib/photos';
import { GRASS, SOIL, SPRINKLER } from '../lib/agronomy';
import type { GrassType, SoilTexture, SprinklerType } from '../lib/types';
import { useApp } from '../state';

export function YourLawnPage(_: PageProps) {
  return (
    <div className="ww-page ww-page-short ww-page-yard">
      <PageTitle title="Your Lawn" phrase="Make it your lawn" />
      <LawnDetails />
      <GrassGuide />
    </div>
  );
}

/** How deep the soil lets roots grow. Blank uses the grass's typical root depth. */
const SOIL_DEPTHS = [{ v: '4', label: 'Shallow (about 4 in)' }, { v: '6', label: 'Medium (about 6 in)' }, { v: '8', label: 'Deep (about 8 in)' }, { v: '12', label: 'Very deep (12 in or more)' }];

/** Lawn details that drive the estimates, as one compact set of dropdowns and boxes, then the watering
 *  window in one long bar that ends in the Save button. Applies to the whole lawn. */
function LawnDetails() {
  const { profile, update } = useApp();
  const z = profile.zones[0];
  const [grass, setGrass] = useState<GrassType>(z?.grass ?? 'kentucky_bluegrass');
  const [soil, setSoil] = useState<SoilTexture>(z?.soil ?? 'loam');
  const [sprinkler, setSprinkler] = useState<SprinklerType>(z?.sprinkler ?? 'spray');
  const [depth, setDepth] = useState(z?.rootDepthIn == null ? '' : String(z.rootDepthIn));
  const [area, setArea] = useState(String(z?.areaSqFt || 2000));
  const [zoneCount, setZoneCount] = useState(String(z?.sprinklerZones ?? 1));
  const [rate, setRate] = useState(z?.precipRateInHr == null ? '' : String(z.precipRateInHr));
  const [start, setStart] = useState(profile.thresholds.preferredStart);
  const [end, setEnd] = useState(profile.thresholds.preferredEnd);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () => {
    const a = Number(area), pr = rate.trim() ? Number(rate) : null, n = Number(zoneCount);
    if (!(a >= 50 && a <= 500000)) return setMsg({ ok: false, text: 'Enter a lawn area between 50 and 500,000 sq ft.' });
    if (!(Number.isInteger(n) && n >= 1 && n <= 24)) return setMsg({ ok: false, text: 'Enter 1 to 24 sprinkler zones.' });
    if (pr !== null && !(pr >= 0.05 && pr <= 5)) return setMsg({ ok: false, text: 'Sprinkler rate should be 0.05–5 in/hr, or blank if unknown.' });
    if (start >= end) return setMsg({ ok: false, text: 'The watering window must end after it starts.' });
    update((p) => {
      const zones = [z].map((x) => ({ ...x, grass, soil, sprinkler, rootDepthIn: depth ? Number(depth) : null, areaSqFt: Math.round(a), sprinklerZones: n,
        precipRateInHr: pr, precipRateSource: pr === null ? ('default' as const) : ('manual' as const) }));
      return { ...p, zones, thresholds: { ...p.thresholds, preferredStart: start, preferredEnd: end } };
    });
    setMsg({ ok: true, text: 'Saved. Recommendations updated.' });
  };
  if (!z) return null;
  return (
    <Card icon={Sprout} tone="leaf" title="Your lawn" className="ww-roomy">
      <div className="mx-auto grid w-full max-w-5xl gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grass type">{(id) => <select id={id} value={grass} onChange={(e) => setGrass(e.target.value as GrassType)}>{Object.entries(GRASS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>}</Field>
        <Field label="Soil texture">{(id) => <select id={id} value={soil} onChange={(e) => setSoil(e.target.value as SoilTexture)}>{Object.entries(SOIL).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select>}</Field>
        <Field label="Sprinkler type" hint={SPRINKLER[sprinkler].note || undefined}>{(id) => <select id={id} value={sprinkler} onChange={(e) => setSprinkler(e.target.value as SprinklerType)}>{Object.entries(SPRINKLER).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select>}</Field>
        <Field label="Soil depth" hint="How deep roots can grow">{(id) => <select id={id} value={depth} onChange={(e) => setDepth(e.target.value)}><option value="">Typical for my grass ({GRASS[grass].rootDepthIn} in)</option>{SOIL_DEPTHS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}</select>}</Field>
        <Field label="Lawn area (sq ft)">{(id) => <input id={id} inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
        <Field label="Sprinkler zones" hint="Valves that run one after another">{(id) => <input id={id} inputMode="numeric" value={zoneCount} onChange={(e) => setZoneCount(e.target.value)} />}</Field>
        <Field label="Sprinkler rate (in/hr)" hint={<span className="inline-flex items-center gap-1">Blank = {SPRINKLER[sprinkler].precipRateInHr} in/hr <Assumed /></span>}>{(id) => <input id={id} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Unknown" />}</Field>
      </div>

      <div className="mx-auto mt-20 flex w-full max-w-3xl flex-col items-center text-center">
        <h3 className="font-display text-2xl uppercase md:text-3xl">Watering window</h3>
        <div className="mt-8 flex w-full flex-col overflow-hidden rounded-2xl border-2 border-ink/30 bg-white text-left sm:flex-row sm:rounded-full">
          <div className="flex-1 px-6 py-3 sm:pl-8"><Field label="Water from">{(id) => <input id={id} type="time" className="!border-0 !py-1" value={start} onChange={(e) => setStart(e.target.value)} />}</Field></div>
          <div className="flex-1 border-t-2 border-ink/15 px-6 py-3 sm:border-l-2 sm:border-t-0"><Field label="Until">{(id) => <input id={id} type="time" className="!border-0 !py-1" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field></div>
          <button type="button" onClick={save} className="bg-forest px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:opacity-90">Save lawn</button>
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-4 text-sm font-bold ${msg.ok ? 'text-leaf' : 'text-alert'}`}>{msg.text}</p>}
      </div>
    </Card>
  );
}

/** A few lines about each grass, shown beside its photo. Edit the wording here. */
const GRASS_ABOUT: Record<GrassType, string> = {
  bermuda: 'Fine, narrow blades that make a dense, tough lawn in full sun. It spreads fast by runners above and below ground, so it recovers quickly from wear. It handles heat and drought but thins in shade, and goes tan and dormant when it turns cool.',
  st_augustine: 'Broad, flat blades with rounded tips make a thick, carpet-like lawn. The most shade-tolerant warm-season grass, it grows best in warm, humid places like Florida and the Gulf Coast. Usually planted as sod or plugs; needs regular water in summer heat.',
  kentucky_bluegrass: 'A soft, dense, blue-green lawn for cooler climates. It spreads underground, so it fills thin spots on its own, and grows most in spring and fall. Its roots are shallow: in hot, dry summers it needs regular water or it browns and goes dormant until it cools.',
  fescue: 'Most fescue lawns are tall fescue: coarser, darker blades that grow in clumps. Deep roots make it the most heat- and drought-tolerant cool-season grass, and it handles some shade. It barely spreads, so fill thin spots by reseeding in fall.',
};
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Each grass WaterWise knows: a photo on one side and a description on the other, alternating sides
 *  down the band. */
function GrassGuide() {
  const { profile } = useApp();
  const mine = profile.zones[0]?.grass;
  return (
    <Card icon={Leaf} tone="leaf" title="Grass types" className="ww-roomy">
      <ul className="@container mx-auto w-full pt-8 max-w-6xl space-y-16 md:space-y-24">
        {(Object.keys(GRASS) as GrassType[]).map((k, i) => {
          const g = GRASS[k], grows = `${MONTH[g.activeMonths[0] - 1]} – ${MONTH[g.activeMonths[g.activeMonths.length - 1] - 1]}`;
          return (
            <li key={k} className="grid items-center gap-8 @3xl:grid-cols-2 @3xl:gap-20">
              <div className={`ww-photo-card aspect-[3/2] ${i % 2 ? '@3xl:order-2' : ''}`}><img src={GRASS_PHOTOS[k].src} alt={GRASS_PHOTOS[k].alt} loading="lazy" className="h-full w-full object-cover" /></div>
              <div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {g.season === 'warm' ? 'Warm-season' : 'Cool-season'} · Grows {grows}
                  {mine === k && <span className="rounded-md bg-forest px-3 py-1 text-white">Your lawn</span>}
                </p>
                <h3 className="mt-3 font-display text-4xl uppercase leading-none md:text-5xl">{g.label}</h3>
                <p className="mt-5 text-base leading-relaxed md:text-lg">{GRASS_ABOUT[k]}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
