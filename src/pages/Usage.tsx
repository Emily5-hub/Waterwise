import type { LucideIcon } from 'lucide-react';
import { BarChart3, ChevronLeft, ChevronRight, Droplet, Pencil, PiggyBank, Scale, Timer, Trash2, Waves } from 'lucide-react';
import { ReactNode, useState } from 'react';
import type { PageProps } from '../App';
import { Badge, Button, Card, Estimated, Field, PageTitle } from '../components/ui';
import { compareNowToRecommended } from '../lib/loss';
import { newId } from '../lib/storage';
import { addDays, formatClock, formatDay, localParts } from '../lib/time';
import type { WaterLog } from '../lib/types';
import { logGallons, summarizeUsage } from '../lib/usage';
import { useApp } from '../state';

const gal = (n: number) => `${Math.round(n).toLocaleString()} gal`;

const PERIODS = [1, 7, 30] as const;
type Period = (typeof PERIODS)[number];
/** Sessions shown per page of the Recent watering table. */
const PER_PAGE = 7;

/** The water saved by waiting, then the period's totals on a water-colored band, then "I watered today"
 *  with the recent sessions as a table under it. */
export function UsagePage(_: PageProps) {
  const { profile, update, now } = useApp();
  const tz = profile.location!.timezone;
  const local = localParts(now, tz);
  const [period, setPeriod] = useState<Period>(30);
  const [editing, setEditing] = useState<WaterLog | null>(null);
  const [page, setPage] = useState(0);
  const start = addDays(local.date, -(period - 1));
  const s = summarizeUsage(profile, start, local.date);
  const maxWeek = Math.max(1, ...s.byWeek.map((w) => w.gallons));
  const logs = [...profile.logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const pages = Math.max(1, Math.ceil(logs.length / PER_PAGE));
  const shown = Math.min(page, pages - 1);
  const zoneCount = profile.zones[0]?.sprinklerZones ?? 1;

  const save = (log: WaterLog) => {
    update((p) => ({ ...p, logs: p.logs.some((l) => l.id === log.id) ? p.logs.map((l) => (l.id === log.id ? log : l)) : [...p.logs, log] }));
    setEditing(null);
    setPage(0);
  };

  return (
    <div className="ww-page ww-page-short">
      <PageTitle title="Usage" phrase="Every drop counts" />
      <SavingsCompare />

      <div className="ww-band ww-roomy ww-ripple">
      <div role="tablist" aria-label="Period" className="mx-auto flex w-fit gap-3"
        onKeyDown={(e) => { // arrow keys move between tabs, as tabs should
          const i = PERIODS.indexOf(period), next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
          if (next === null) return;
          const p = PERIODS[(next + PERIODS.length) % PERIODS.length];
          setPeriod(p); e.currentTarget.querySelector<HTMLButtonElement>(`#period-tab-${p}`)?.focus();
        }}>
        {PERIODS.map((p) => (
          <button key={p} id={`period-tab-${p}`} role="tab" aria-selected={period === p} aria-controls="period-panel" tabIndex={period === p ? 0 : -1}
            onClick={() => setPeriod(p)}
            className={`rounded-full border-2 px-5 py-2 text-lg font-semibold uppercase tracking-[0.14em] transition-colors hover:border-forest hover:bg-forest hover:text-white ${period === p ? 'border-forest text-forest' : 'border-transparent text-muted'}`}>
            {p} day{p === 1 ? '' : 's'}
          </button>
        ))}
      </div>
      {/* Three totals stacked on the left, the weekly trend beside them as tall as all three (see .ww-tiles). */}
      <div className="@container mx-auto mt-10 w-full max-w-6xl">
      <div id="period-panel" role="tabpanel" aria-labelledby={`period-tab-${period}`} className="ww-tiles">
        <Tile icon={Timer} label="Recorded runtime" value={`${s.minutes} min`} sub={`${s.sessions} logged session${s.sessions === 1 ? '' : 's'}`} />
        <Tile icon={Waves} label="Water applied" value={`≈${gal(s.gallons)}`} badge={<Estimated />} />
        <Tile icon={PiggyBank} label="Saved vs. typical watering" badge={<Estimated />}
          title="Compared with watering 20 minutes every Monday, Wednesday and Friday"
          value={s.sessions === 0 ? '—' : `${s.avoidedGallons >= 0 ? '≈' : '≈ −'}${gal(Math.abs(s.avoidedGallons))}`}
          sub={s.sessions === 0 ? 'Log your watering to compare.' : s.avoidedGallons < 0 ? 'More than typical watering' : undefined} />
        <div className="ww-photo-card flex flex-col p-6 md:p-8">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/85"><BarChart3 aria-hidden className="h-4 w-4" />Weekly trend</h3>
          {s.byWeek.length === 0 ? <p className="my-auto py-6 text-center text-xl text-white/85 md:text-2xl">Nothing logged in this period.</p> : (
            <ul className="mt-8 space-y-3">
              {s.byWeek.map((w) => (
                <li key={w.weekStart} className="grid grid-cols-[6.5rem_1fr_6.5rem] items-center gap-3 text-sm">
                  <span className="text-white/80">{formatDay(w.weekStart)}</span>
                  <span className="h-3 bg-white/20" aria-hidden><span className="block h-3 bg-white" style={{ width: `${(w.gallons / maxWeek) * 100}%` }} /></span>
                  <span className="text-right font-bold">≈{gal(w.gallons)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* "I watered today", with the sessions logged so far as a table under it, seven to a page. */}
      <section className="ww-card ww-roomy">
        <LogForm key={editing?.id ?? 'new'} initial={editing} onSave={save} onCancel={editing ? () => setEditing(null) : undefined} today={local.date} nowTime={local.time} />
        <div className="mx-auto mt-20 w-full max-w-4xl">
          <h3 className="text-center font-display text-3xl uppercase md:text-4xl">Recent watering</h3>
          {logs.length === 0 ? <p className="mt-8 text-center text-xl text-muted md:text-2xl">Nothing logged yet. Log each session above.</p> : (
            <div className="ww-leaf mt-8 bg-[#f8fbff] px-4 py-5 shadow-[0_0.75rem_2rem_-1rem_rgb(14_26_39/0.35)] sm:px-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-forest text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      <th scope="col" className="py-3 pr-4 font-semibold">Date</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Start</th>
                      {zoneCount > 1 && <th scope="col" className="py-3 pr-4 font-semibold">Zone</th>}
                      <th scope="col" className="py-3 pr-4 font-semibold">Ran</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Water</th>
                      <th scope="col" className="py-3 text-right font-semibold"><span className="sr-only">Edit or delete</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(shown * PER_PAGE, (shown + 1) * PER_PAGE).map((l) => {
                      const g = logGallons(l, profile);
                      return (
                        <tr key={l.id} className="border-b border-ink/15 last:border-0">
                          <td className="py-3 pr-4 font-semibold">{formatDay(l.date, local.date)}{l.note && <span className="block text-xs font-normal text-muted">{l.note}</span>}</td>
                          <td className="py-3 pr-4">{formatClock(l.time)}</td>
                          {zoneCount > 1 && <td className="py-3 pr-4">{l.zoneNo ? `Zone ${l.zoneNo}` : 'All zones'}</td>}
                          <td className="py-3 pr-4">{l.minutes} min</td>
                          <td className="py-3 pr-4">{g ? `≈${gal(g.gallons)}` : '—'}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex gap-1">
                              <Button variant="ghost" onClick={() => setEditing(l)} ariaLabel={`Edit log from ${l.date}`}><Pencil size={15} aria-hidden /></Button>
                              <Button variant="ghost" className="!text-alert" onClick={() => { if (confirm('Delete this watering log?')) update((p) => ({ ...p, logs: p.logs.filter((x) => x.id !== l.id) })); }} ariaLabel={`Delete log from ${l.date}`}><Trash2 size={15} aria-hidden /></Button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <nav aria-label="Recent watering pages" className="mt-4 flex items-center justify-between gap-4 text-sm">
                  <Button onClick={() => setPage(shown - 1)} disabled={shown === 0}><ChevronLeft size={16} aria-hidden /> Newer</Button>
                  <span className="text-muted">Page {shown + 1} of {pages}</span>
                  <Button onClick={() => setPage(shown + 1)} disabled={shown === pages - 1}>Older <ChevronRight size={16} aria-hidden /></Button>
                </nav>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** One of the period's totals on a dark tile: an icon and label, the number, and any note under it. */
function Tile({ icon: Icon, label, value, sub, badge, title }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; badge?: ReactNode; title?: string }) {
  return (
    <div title={title} className="ww-photo-card flex flex-col justify-end p-6 md:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/85"><Icon aria-hidden className="h-4 w-4" />{label}</p>
      <p className="mt-2 font-display text-5xl">{value}</p>
      {sub && <p className="mt-2 text-sm text-white/85">{sub}</p>}
      {badge && <span className="mt-4 inline-flex w-fit rounded-full bg-white/90 px-3 py-1">{badge}</span>}
    </div>
  );
}

/** Water drops falling down both sides of the opening band (see .ww-drop). Each has its own spot, size,
 *  speed and head start, so they never fall in step. Wider screens only, so they never cross the text. */
const DROPS: [left: string, size: string, seconds: number, delay: number][] = [
  ['5%', '2.5rem', 6.5, -1], ['11%', '1.75rem', 8, -4.5], ['17%', '2rem', 7, -2.5],
  ['83%', '2rem', 7.5, -5], ['89%', '1.75rem', 6, -0.5], ['95%', '2.5rem', 8.5, -3.5],
];
function FallingDrops() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
      {DROPS.map(([left, size, seconds, delay]) => (
        <span key={left} className="ww-drop" style={{ left, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}>
          <Droplet fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
        </span>
      ))}
    </div>
  );
}

/** "Water used": how much water a run at the app's recommended time saves compared with running it now
 *  (the water that wouldn't evaporate, drift, run off or sink past the roots). */
function SavingsCompare() {
  const { profile, weather, plan, now } = useApp();
  const suggested = plan?.days.find((d) => d.action === 'WATER')?.zones.find((z) => z.needsWater)?.minutes;
  const [minutes, setMinutes] = useState(String(Math.round(suggested ?? 20)));
  if (!weather.data) return null;
  const c = compareNowToRecommended(profile, weather.data, plan, Number(minutes), now);
  // Always a number: small amounts get one decimal so they don't round to zero. A negative saving means
  // now is the better time, so it's told as the water saved by watering now.
  const amount = (n: number) => (n < 10 ? `${n.toFixed(1)} gal` : gal(n));

  return (
    <Card icon={Scale} tone="sky" title="Water used" className="ww-water">
      <div className="text-center">
        <FallingDrops />
        <label className="inline-flex flex-wrap items-center justify-center gap-3 text-lg md:text-xl">For a
          <input aria-label="Runtime in minutes" inputMode="numeric" className="w-20 rounded-full border-0 bg-white/80 px-3 py-1 text-center" value={minutes} onChange={(e) => setMinutes(e.target.value)} /> minute run{(profile.zones[0]?.sprinklerZones ?? 1) > 1 ? ' per zone' : ''}</label>
        {typeof c === 'string' ? <p className="mt-6 text-sm text-muted">{c}</p> : (
          <>
            <p className="mt-8 font-display text-5xl text-forest md:text-6xl">≈{amount(Math.abs(c.savedGal))} saved</p>
            <p className="mt-3 text-base text-muted">{c.savedGal >= 0 ? 'by watering at the recommended time instead of now' : 'by watering now instead of waiting'}</p>
          </>
        )}
      </div>
    </Card>
  );
}

/** "I watered today": a centered title over the form. The recent sessions sit under it. */
function LogForm({ initial, onSave, onCancel, today, nowTime }: { initial: WaterLog | null; onSave: (l: WaterLog) => void; onCancel?: () => void; today: string; nowTime: string }) {
  const { profile } = useApp();
  const zoneId = profile.zones[0]?.id ?? '';
  const zoneCount = profile.zones[0]?.sprinklerZones ?? 1;
  const [zoneNo, setZoneNo] = useState(initial?.zoneNo ? String(initial.zoneNo) : '');
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [time, setTime] = useState(initial?.time ?? nowTime);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const m = Number(minutes);
    if (!zoneId) return setError('Set up your lawn first.');
    if (!(m >= 1 && m <= 600)) return setError('Enter minutes between 1 and 600.');
    if (!date || date > today) return setError('Pick today or an earlier date.');
    // There's no note box any more; editing an older log keeps the note it already had.
    onSave({ id: initial?.id ?? newId(), zoneId, minutes: Math.round(m), date, time, note: initial?.note ?? '', ...(zoneNo ? { zoneNo: Number(zoneNo) } : {}) });
    setMinutes(''); setError(null);
  };
  return (
    <div className="@container flex flex-col items-center text-center">
      <h2 className="ww-band-title">{initial ? 'Edit watering log' : 'I watered today'}</h2>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className={`mt-10 grid w-full max-w-3xl gap-6 text-left @lg:gap-8 ${zoneCount > 1 ? '@lg:grid-cols-4' : '@lg:grid-cols-3'}`}>
        {zoneCount > 1 && <Field label="Zone">{(id) => <select id={id} value={zoneNo} onChange={(e) => setZoneNo(e.target.value)}><option value="">All zones</option>{Array.from({ length: zoneCount }, (_, i) => <option key={i} value={i + 1}>Zone {i + 1}</option>)}</select>}</Field>}
        <Field label="For (minutes)" hint={zoneCount > 1 ? 'Per zone' : undefined}>{(id) => <input id={id} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="20" />}</Field>
        <Field label="Date">{(id) => <input id={id} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Start time">{(id) => <input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        <div className={`flex items-center justify-center gap-6 @lg:mt-2 ${zoneCount > 1 ? '@lg:col-span-4' : '@lg:col-span-3'}`}>
          <Button type="submit" className="!rounded-full !border-0 !bg-forest !px-8 !py-3 !text-white hover:!opacity-90">{initial ? 'Save' : 'Log it'}</Button>
          {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        </div>
      </form>
      {error && <p role="alert" className="mt-4 text-sm font-bold text-alert">{error}</p>}
      {initial && <p className="mt-2"><Badge>Editing an existing log</Badge></p>}
    </div>
  );
}
