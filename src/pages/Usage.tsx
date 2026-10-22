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
  const manyZones = profile.zones.length > 1;

  const save = (log: WaterLog) => {
    update((p) => ({ ...p, logs: p.logs.some((l) => l.id === log.id) ? p.logs.map((l) => (l.id === log.id ? log : l)) : [...p.logs, log] }));
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Usage" icon={Droplets} />
      <SavingsCompare />
      <LogForm key={editing?.id ?? 'new'} initial={editing} onSave={save} onCancel={editing ? () => setEditing(null) : undefined} today={local.date} nowTime={local.time} />

      <div className="flex items-center gap-2" role="group" aria-label="Period">
        {([7, 30, 90] as const).map((p) => <Button key={p} variant={period === p ? 'primary' : 'secondary'} onClick={() => setPeriod(p)}>{p} days</Button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Timer} tone="violet" label="Recorded runtime" value={`${s.minutes} min`} sub={`${s.sessions} logged session${s.sessions === 1 ? '' : 's'}`} />
        <Stat icon={Waves} tone="sky" label="Water applied" value={`≈${gal(s.gallons)}`} badge={<Estimated />} />
        <Stat icon={PiggyBank} tone="leaf" label="Avoided vs. baseline" badge={<Estimated />}
          value={s.sessions === 0 ? '—' : `${s.avoidedGallons >= 0 ? '≈' : '≈ −'}${gal(Math.abs(s.avoidedGallons))}`}
          sub={s.sessions === 0 ? 'Log your watering to compare.' : s.avoidedGallons >= 0 ? `vs. ${s.baselineSessions} fixed Mon/Wed/Fri sessions` : 'More than the fixed schedule'} />
      </div>

      <Card icon={BarChart3} tone="sky" title="Weekly trend">
        {s.byWeek.length === 0 ? <p className="text-sm text-muted">No logged watering in this period yet.</p> : (
          <ul className="space-y-2">
            {s.byWeek.map((w) => (
              <li key={w.weekStart} className="grid grid-cols-[88px_1fr_96px] items-center gap-3 text-sm">
                <span className="text-muted">{formatDay(w.weekStart)}</span>
                <span className="h-4 rounded-full bg-sky-soft" aria-hidden><span className="block h-4 rounded-full bg-gradient-to-r from-teal to-sky" style={{ width: `${(w.gallons / maxWeek) * 100}%` }} /></span>
                <span className="text-right font-bold">≈{gal(w.gallons)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={History} tone="violet" title="Recent watering">
        {logs.length === 0 ? <p className="text-sm text-muted">Nothing logged yet. Use “I watered today” above after each session.</p> : (
          <ul className="divide-y-2 divide-line">
            {logs.slice(0, 30).map((l) => {
              const g = logGallons(l, profile), zone = profile.zones.find((z) => z.id === l.zoneId);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div><p className="font-bold">{manyZones ? `${zone?.name ?? 'Removed area'} · ` : 'Watered · '}{l.minutes} min</p><p className="text-xs text-muted">{formatDay(l.date, local.date)} at {formatClock(l.time)}{g ? ` · ≈${gal(g.gallons)}` : ''}{l.note ? ` · ${l.note}` : ''}</p></div>
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
    <Card icon={Scale} tone="sky" title="Water now, or wait?"
      action={<label className="flex items-center gap-2 text-sm font-semibold">Run
        <input aria-label="Runtime in minutes" inputMode="numeric" className="w-16" value={minutes} onChange={(e) => setMinutes(e.target.value)} /> min</label>}>
      {typeof c === 'string' ? <p className="text-sm text-muted">{c}</p> : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Wasted label={`Now · ${hourLabel(c.now.hour)}`} o={c.now} tone="text-coral" />
            <Wasted label={`Recommended · ${when(c.recommended.date, c.recommended.hour)}`} o={c.recommended} tone="text-forest" />
          </div>
          <p className="font-display text-xl font-bold text-forest">
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
    <div className="rounded-2xl bg-white/80 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone}`}>≈{gal(wasted)} wasted</p>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={`About ${Math.round((wasted / o.appliedGal) * 100)}% of the water wasted`}>
        <span className="bg-forest" style={{ width: `${(o.rootGal / o.appliedGal) * 100}%` }} />
        <span className="bg-[#f08a6c]" style={{ width: `${(wasted / o.appliedGal) * 100}%` }} />
      </div>
    </div>
  );
}

function LogForm({ initial, onSave, onCancel, today, nowTime }: { initial: WaterLog | null; onSave: (l: WaterLog) => void; onCancel?: () => void; today: string; nowTime: string }) {
  const { profile } = useApp();
  const [zoneId, setZoneId] = useState(initial?.zoneId ?? profile.zones[0]?.id ?? '');
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [time, setTime] = useState(initial?.time ?? nowTime);
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const many = profile.zones.length > 1;
  const submit = () => {
    const m = Number(minutes);
    if (!zoneId) return setError('Set up your lawn in Settings first.');
    if (!(m >= 1 && m <= 600)) return setError('Enter minutes between 1 and 600.');
    if (!date || date > today) return setError('Pick today or an earlier date.');
    onSave({ id: initial?.id ?? newId(), zoneId, minutes: Math.round(m), date, time, note: note.trim() });
    setMinutes(''); setNote(''); setError(null);
  };
  return (
    <Card icon={Droplets} tone="teal" title={initial ? 'Edit watering log' : 'I watered today'}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className={`grid gap-3 sm:items-end ${many ? 'sm:grid-cols-[1fr_120px_150px_120px_auto]' : 'sm:grid-cols-[120px_150px_120px_auto]'}`}>
        {many && <Field label="Area">{(id) => <select id={id} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>{profile.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>}</Field>}
        <Field label="For (minutes)">{(id) => <input id={id} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="20" />}</Field>
        <Field label="Date">{(id) => <input id={id} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Start time">{(id) => <input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        <div className="flex gap-2"><Button type="submit" variant="primary">{initial ? 'Save' : 'Log it'}</Button>{onCancel && <Button onClick={onCancel}>Cancel</Button>}</div>
      </form>
      <div className="mt-3"><Field label="Note (optional)">{(id) => <input id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />}</Field></div>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-alert">{error}</p>}
      {initial && <p className="mt-2"><Badge>Editing an existing log</Badge></p>}
    </Card>
  );
}
