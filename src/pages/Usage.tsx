import { BarChart3, Droplets, History, Pencil, PiggyBank, Scale, Timer, Trash2, Waves } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../App';
import { Badge, Button, Card, Estimated, Field, PageTitle, Stat } from '../components/ui';
import { Outcome, compareNowToRecommended } from '../lib/loss';
import { newId } from '../lib/storage';
import { addDays, formatClock, formatDay, localParts } from '../lib/time';
import type { WaterLog } from '../lib/types';
import { logGallons, summarizeUsage } from '../lib/usage';
import { useApp } from '../state';

const hourLabel = (h: number) => formatClock(`${String(h).padStart(2, '0')}:00`);
const gal = (n: number) => `${Math.round(n).toLocaleString()} gal`;

const PERIODS = [7, 30, 90] as const;

export function UsagePage(_: PageProps) {
  const { profile, update, now } = useApp();
  const tz = profile.location!.timezone;
  const local = localParts(now, tz);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [editing, setEditing] = useState<WaterLog | null>(null);
  const start = addDays(local.date, -(period - 1));
  const s = summarizeUsage(profile, start, local.date);
  const maxWeek = Math.max(1, ...s.byWeek.map((w) => w.gallons));
  const logs = [...profile.logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const save = (log: WaterLog) => {
    update((p) => ({ ...p, logs: p.logs.some((l) => l.id === log.id) ? p.logs.map((l) => (l.id === log.id ? log : l)) : [...p.logs, log] }));
    setEditing(null);
  };

  return (
    <div className="ww-page ww-page-short">
      <PageTitle title="Usage" phrase="Every drop accounted for" />
      <SavingsCompare />
      <LogForm key={editing?.id ?? 'new'} initial={editing} onSave={save} onCancel={editing ? () => setEditing(null) : undefined} today={local.date} nowTime={local.time} />

      <div className="ww-band space-y-4">
      <div role="tablist" aria-label="Period" className="mx-auto mt-4 flex w-fit gap-8"
        onKeyDown={(e) => { // arrow keys move between tabs, as tabs should
          const i = PERIODS.indexOf(period), next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
          if (next === null) return;
          const p = PERIODS[(next + PERIODS.length) % PERIODS.length];
          setPeriod(p); e.currentTarget.querySelector<HTMLButtonElement>(`#period-tab-${p}`)?.focus();
        }}>
        {PERIODS.map((p) => (
          <button key={p} id={`period-tab-${p}`} role="tab" aria-selected={period === p} aria-controls="period-panel" tabIndex={period === p ? 0 : -1}
            onClick={() => setPeriod(p)}
            className={`border-b-2 px-1 py-2 text-lg font-semibold uppercase tracking-[0.14em] transition ${period === p ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-ink'}`}>
            {p} days
          </button>
        ))}
      </div>
      <div id="period-panel" role="tabpanel" aria-labelledby={`period-tab-${period}`} className="my-auto grid gap-8 sm:grid-cols-3">
        <Stat icon={Timer} tone="violet" label="Recorded runtime" value={`${s.minutes} min`} sub={`${s.sessions} logged session${s.sessions === 1 ? '' : 's'}`} />
        <Stat icon={Waves} tone="sky" label="Water applied" value={`≈${gal(s.gallons)}`} badge={<Estimated />} />
        <Stat icon={PiggyBank} tone="leaf" label="Avoided vs. baseline" badge={<Estimated />}
          value={s.sessions === 0 ? '—' : `${s.avoidedGallons >= 0 ? '≈' : '≈ −'}${gal(Math.abs(s.avoidedGallons))}`}
          sub={s.sessions === 0 ? 'Log your watering to compare.' : s.avoidedGallons >= 0 ? `vs. ${s.baselineSessions} fixed Mon/Wed/Fri sessions` : 'More than the fixed schedule'} />
      </div>
      </div>

      <Card icon={BarChart3} tone="sky" title="Weekly trend">
        {s.byWeek.length === 0 ? <p className="text-center text-xl text-muted md:text-2xl">No logged watering in this period yet.</p> : (
          <ul className="space-y-2">
            {s.byWeek.map((w) => (
              <li key={w.weekStart} className="grid grid-cols-[88px_1fr_96px] items-center gap-3 text-sm">
                <span className="text-muted">{formatDay(w.weekStart)}</span>
                <span className="h-3 bg-ink/10" aria-hidden><span className="block h-3 bg-forest" style={{ width: `${(w.gallons / maxWeek) * 100}%` }} /></span>
                <span className="text-right font-bold">≈{gal(w.gallons)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={History} tone="violet" title="Recent watering">
        {logs.length === 0 ? <p className="text-center text-xl text-muted md:text-2xl">Nothing logged yet. Use “I watered today” above after each session.</p> : (
          <ul className="divide-y divide-ink/20 border-y border-ink/20">
            {logs.slice(0, 30).map((l) => {
              const g = logGallons(l, profile);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div><p className="font-display text-xl uppercase">Watered · {l.minutes} min</p><p className="text-xs text-muted">{formatDay(l.date, local.date)} at {formatClock(l.time)}{g ? ` · ≈${gal(g.gallons)}` : ''}{l.note ? ` · ${l.note}` : ''}</p></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setEditing(l)} ariaLabel={`Edit log from ${l.date}`}><Pencil size={15} aria-hidden /></Button>
                    <Button variant="ghost" onClick={() => { if (confirm('Delete this watering log?')) update((p) => ({ ...p, logs: p.logs.filter((x) => x.id !== l.id) })); }} ariaLabel={`Delete log from ${l.date}`}><Trash2 size={15} aria-hidden /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

    </div>
  );
}

/** "Water now" vs. "water at the recommended time": gallons wasted at each, with a small bar. */
function SavingsCompare() {
  const { profile, weather, plan, now } = useApp();
  const suggested = plan?.days.find((d) => d.action === 'WATER')?.zones.find((z) => z.needsWater)?.minutes;
  const [minutes, setMinutes] = useState(String(Math.round(suggested ?? 20)));
  if (!weather.data) return null;
  const c = compareNowToRecommended(profile, weather.data, plan, Number(minutes), now);
  const today = localParts(now, weather.data.timezone).date;
  const when = (d: string, h: number) => { const l = formatDay(d, today); return `${l} ${hourLabel(h)}`; };

  return (
    <Card icon={Scale} tone="sky" title="Water used"
      action={<label className="flex items-center gap-2 text-sm font-semibold">Run
        <input aria-label="Runtime in minutes" inputMode="numeric" className="w-16" value={minutes} onChange={(e) => setMinutes(e.target.value)} /> min</label>}>
      {typeof c === 'string' ? <p className="text-sm text-muted">{c}</p> : (
        <div className="space-y-3">
          <div className="grid gap-8 sm:grid-cols-2">
            <Wasted label={`Now · ${hourLabel(c.now.hour)}`} o={c.now} tone="text-coral" />
            <Wasted label={`Recommended · ${when(c.recommended.date, c.recommended.hour)}`} o={c.recommended} tone="text-forest" />
          </div>
          <p className="pt-2 text-center text-3xl font-semibold uppercase tracking-[0.12em] text-forest">
            {c.savedGal > 0.5 ? `Waiting saves ≈${gal(c.savedGal)}` : 'Now is about as good as waiting.'}
          </p>
        </div>
      )}
    </Card>
  );
}

function Wasted({ label, o, tone }: { label: string; o: Outcome; tone: string }) {
  const wasted = o.appliedGal - o.rootGal;
  return (
    <div className="border-t border-ink/25 pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 font-display text-4xl ${tone}`}>≈{gal(wasted)} wasted</p>
      <div className="mt-3 flex h-2 overflow-hidden bg-ink/10" role="img" aria-label={`About ${Math.round((wasted / o.appliedGal) * 100)}% of the water wasted`}>
        <span className="bg-forest" style={{ width: `${(o.rootGal / o.appliedGal) * 100}%` }} />
        <span className="bg-[#780000]" style={{ width: `${(wasted / o.appliedGal) * 100}%` }} />
      </div>
    </div>
  );
}

function LogForm({ initial, onSave, onCancel, today, nowTime }: { initial: WaterLog | null; onSave: (l: WaterLog) => void; onCancel?: () => void; today: string; nowTime: string }) {
  const { profile } = useApp();
  const zoneId = profile.zones[0]?.id ?? '';
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [time, setTime] = useState(initial?.time ?? nowTime);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const m = Number(minutes);
    if (!zoneId) return setError('Set up your lawn in Settings first.');
    if (!(m >= 1 && m <= 600)) return setError('Enter minutes between 1 and 600.');
    if (!date || date > today) return setError('Pick today or an earlier date.');
    // There's no note box any more; editing an older log keeps the note it already had.
    onSave({ id: initial?.id ?? newId(), zoneId, minutes: Math.round(m), date, time, note: initial?.note ?? '' });
    setMinutes(''); setError(null);
  };
  return (
    <Card icon={Droplets} tone="teal" title={initial ? 'Edit watering log' : 'I watered today'}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mx-auto grid w-full max-w-4xl gap-6 sm:grid-cols-4 sm:items-end sm:gap-10">
        <Field label="For (minutes)">{(id) => <input id={id} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="20" />}</Field>
        <Field label="Date">{(id) => <input id={id} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Start time">{(id) => <input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        <div className="flex justify-center gap-4 sm:pb-1"><Button type="submit" variant="primary">{initial ? 'Save' : 'Log it'}</Button>{onCancel && <Button onClick={onCancel}>Cancel</Button>}</div>
      </form>
      {error && <p role="alert" className="mt-4 text-center text-sm font-bold text-alert">{error}</p>}
      {initial && <p className="mt-2 text-center"><Badge>Editing an existing log</Badge></p>}
    </Card>
  );
}
