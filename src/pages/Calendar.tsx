import { Ban, CalendarClock, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, CloudRain, Droplets, Flower2, HelpCircle, Hourglass, MinusCircle, Snowflake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PageProps } from '../App';
import { DataStatus } from '../components/DataStatus';
import { Badge, Button, Card, IconChip, Notice, PageTitle } from '../components/ui';
import type { DayDecision } from '../lib/decision';
import { bestGardenTime } from '../lib/loss';
import { SOURCE_LABEL, evaluateRules } from '../lib/rules';
import { addDays, dayOfWeek, formatClock, formatDay, localParts } from '../lib/time';
import { mmToIn } from '../lib/units';
import { useApp } from '../state';

const VERDICT: Record<DayDecision['action'], { label: string; short: string; icon: LucideIcon; hero: string }> = {
  WATER: { label: 'Water today', short: 'WATER', icon: Droplets, hero: 'from-[#2e7d32] via-[#2f8a5c] to-[#1d64a3]' },
  DO_NOT_WATER: { label: 'Skip today', short: 'SKIP', icon: Ban, hero: 'from-[#46606a] to-[#2f4450]' },
  DELAY: { label: 'Delay', short: 'DELAY', icon: Hourglass, hero: 'from-[#a8590a] to-[#8a3a12]' },
};

type Kind = 'completed' | 'recommended' | 'tentative' | 'delay' | 'skipped' | 'restricted' | 'rain';
const KIND: Record<Kind, { label: string; icon: LucideIcon; cls: string }> = {
  completed: { label: 'Watered', icon: Check, cls: 'bg-leaf-soft text-leaf' },
  recommended: { label: 'Water', icon: Droplets, cls: 'bg-sky-soft text-sky' },
  tentative: { label: 'Maybe', icon: HelpCircle, cls: 'border border-dashed border-sky/60 text-sky' },
  delay: { label: 'Delay', icon: Clock, cls: 'bg-amber-soft text-amber' },
  skipped: { label: 'Skip', icon: MinusCircle, cls: 'bg-slate-soft text-slate' },
  restricted: { label: 'Restricted', icon: Ban, cls: 'bg-alert-soft text-alert' },
  rain: { label: 'Rain', icon: CloudRain, cls: 'bg-teal-soft text-teal' },
};

/** Minutes for the whole lawn: one number for one area, a range when older data has several areas. */
function runtimeText(day: DayDecision): string {
  const mins = day.zones.filter((z) => z.needsWater).map((z) => Math.round(z.minutes));
  if (!mins.length) return '';
  const lo = Math.min(...mins), hi = Math.max(...mins);
  return lo === hi ? `${lo} min` : `${lo}–${hi} min per area`;
}

export function CalendarPage(_: PageProps) {
  const { plan, profile, weather, now } = useApp();
  const w = weather.data;
  const tz = w?.timezone ?? profile.location!.timezone;
  const nowLocal = localParts(now, tz);
  const today = nowLocal.date;
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const todayPlan = plan?.days[0];
  const tomorrow = plan?.days[1];

  const dates = useMemo(() => {
    if (view === 'week') { const start = addDays(anchor, -dayOfWeek(anchor)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
    const first = `${anchor.slice(0, 7)}-01`, start = addDays(first, -dayOfWeek(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const info = (date: string) => {
    const decision = plan?.days.find((d) => d.date === date);
    const logs = profile.logs.filter((l) => l.date === date);
    const daily = w?.daily.find((d) => d.date === date);
    const rules = evaluateRules(profile.rules, date, profile.addressParity);
    const kinds: Kind[] = [];
    if (logs.length) kinds.push('completed');
    if (rules.blocked) kinds.push('restricted');
    else if (decision && date >= today) kinds.push(decision.action === 'WATER' ? (decision.confidence === 'likely' ? 'recommended' : 'tentative') : decision.action === 'DELAY' ? 'delay' : 'skipped');
    const rainIn = daily?.precipMm != null ? mmToIn(daily.precipMm) : null;
    if (rainIn !== null && rainIn >= 0.1 && (date < today || (daily?.precipProbMaxPct ?? 0) >= profile.thresholds.rainProbPct)) kinds.push('rain');
    return { decision, logs, rules, kinds, rainIn, daily };
  };

  const shift = (dir: number) => setAnchor(view === 'week' ? addDays(anchor, 7 * dir) : (() => { const [y, m] = anchor.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10); })());
  const title = view === 'week' ? `Week of ${formatDay(dates[0])}` : new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const sel = info(selected);

  return (
    <div className="space-y-5">
      <PageTitle title="Calendar" icon={CalendarDays} />
      <DataStatus />
      {todayPlan?.freezeAlert && <Notice tone="alert" role="alert"><span className="inline-flex items-center gap-2 font-bold"><Snowflake size={16} aria-hidden /> Freeze alert</span> Overnight lows below {profile.thresholds.freezeF}°F. Don’t water; ice can damage turf and pipes.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0 space-y-5">
          {todayPlan && (
            <section aria-live="polite" aria-label="Should I water today?" className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br p-6 text-white shadow-[0_6px_18px_rgba(20,40,30,0.12)] ${VERDICT[todayPlan.action].hero}`}>
              <div className="relative flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 font-display text-lg font-semibold tracking-wide ring-2 ring-white/40">
                  <VerdictIcon action={todayPlan.action} />{VERDICT[todayPlan.action].short}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-3xl font-semibold leading-tight">{VERDICT[todayPlan.action].label}</p>
                  <p className="text-sm text-white/90">{todayPlan.reason}</p>
                </div>
              </div>
              {todayPlan.action === 'WATER' && todayPlan.window && (
                <p className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold"><Clock size={16} aria-hidden /> Start around {formatClock(todayPlan.window.start)} · run {runtimeText(todayPlan)}</p>
              )}
              {todayPlan.action !== 'WATER' && tomorrow?.action === 'WATER' && (
                <div className="relative mt-4 rounded-2xl bg-white/95 px-4 py-3 text-ink">
                  <p className="inline-flex items-center gap-2 font-display text-xl font-semibold text-leaf"><CalendarClock size={20} aria-hidden /> Water tomorrow</p>
                  <p className="text-sm text-muted">{tomorrow.window ? `Around ${formatClock(tomorrow.window.start)}` : 'Morning'} · about {runtimeText(tomorrow)}{tomorrow.confidence === 'likely' ? '' : ' · tentative'}</p>
                </div>
              )}
              {plan && !plan.forecastUsable && <div className="relative mt-4 text-ink"><Notice tone="amber">The saved forecast is too old to decide from. Refresh when you’re online.</Notice></div>}
            </section>
          )}
          {!todayPlan && w && <Notice tone="amber">The forecast doesn’t cover today yet. Refresh the weather to get a recommendation.</Notice>}


          <Card icon={CalendarDays} tone="violet" title={title}
            action={<div role="tablist" aria-label="Calendar view" className="inline-flex rounded-full border-2 border-line p-0.5">
              {(['week', 'month'] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${view === v ? 'bg-forest text-white' : 'text-muted'}`}>{v}</button>
              ))}
            </div>}>
            <div className="mb-3 flex items-center gap-1">
              <Button variant="ghost" onClick={() => shift(-1)} ariaLabel="Previous"><ChevronLeft size={18} aria-hidden /></Button>
              <Button variant="ghost" onClick={() => { setAnchor(today); setSelected(today); }}>Today</Button>
              <Button variant="ghost" onClick={() => shift(1)} ariaLabel="Next"><ChevronRight size={18} aria-hidden /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-extrabold text-muted" aria-hidden>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}</div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {dates.map((date) => {
                const i = info(date), out = view === 'month' && date.slice(0, 7) !== anchor.slice(0, 7);
                return (
                  <button key={date} onClick={() => setSelected(date)} aria-pressed={selected === date}
                    aria-label={`${formatDay(date)}: ${i.kinds.map((k) => KIND[k].label).join(', ') || 'no events'}`}
                    className={`flex flex-col items-stretch gap-1 rounded-2xl border-2 p-1.5 text-left transition ${view === 'week' ? 'min-h-28' : 'min-h-20'} ${selected === date ? 'border-leaf bg-leaf-soft/50' : 'border-line hover:border-leaf/50'} ${out ? 'opacity-40' : ''} ${date === today && selected !== date ? 'bg-leaf-soft/60' : 'bg-white'}`}>
                    <span className={`font-display text-sm font-semibold ${date === today ? 'text-leaf' : 'text-ink'}`}>{Number(date.slice(8))}</span>
                    {i.kinds.map((k) => { const K = KIND[k]; return (
                      <span key={k} className={`flex items-center gap-1 truncate rounded-lg px-1 py-0.5 text-[11px] font-bold ${K.cls}`}><K.icon size={11} aria-hidden /><span className="truncate">{K.label}</span></span>
                    ); })}
                    {view === 'week' && i.decision?.action === 'WATER' && i.decision.window && !i.rules.blocked && (
                      <span className="text-[11px] leading-tight text-muted">{formatClock(i.decision.window.start)}<br />{runtimeText(i.decision)}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(KIND) as Kind[]).map((k) => { const K = KIND[k]; return <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${K.cls}`}><K.icon size={12} aria-hidden />{K.label}</span>; })}</div>
          </Card>

          <Card icon={CalendarClock} tone="sky" title={formatDay(selected, today)}>
            <DayDetails date={selected} today={today} decision={sel.decision} info={sel} />
          </Card>
        </div>

        <GardenColumn />
      </div>
      <p className="text-xs text-faint">Soil moisture isn’t measured. WaterWise estimates how much water your lawn has used from weather and your lawn settings. Future days are estimates.</p>
    </div>
  );
}

function VerdictIcon({ action }: { action: DayDecision['action'] }) {
  const I = VERDICT[action].icon;
  return <I size={22} aria-hidden />;
}

function DayDetails({ date, today, decision, info }: { date: string; today: string; decision?: DayDecision; info: { logs: { id: string; minutes: number; time: string }[]; rules: ReturnType<typeof evaluateRules>; rainIn: number | null } }) {
  return (
    <div className="space-y-2 text-sm">
      {info.rules.blocking.map((b) => <p key={b.rule.id}><Badge tone="alert">Restricted</Badge> {b.message}. <span className="text-muted">{SOURCE_LABEL[b.rule.source]}.</span></p>)}
      {info.logs.length > 0 && <p><Badge tone="leaf">Watered</Badge> {info.logs.map((l) => `${l.minutes} min at ${formatClock(l.time)}`).join(' · ')}</p>}
      {info.rainIn !== null && info.rainIn >= 0.1 && <p><Badge tone="teal">Rain</Badge> About {info.rainIn.toFixed(2)} in {date < today ? 'fell (model estimate)' : 'forecast'}.</p>}
      {decision && date >= today && (
        <p><strong>{decision.action === 'WATER' ? `Water${decision.window ? ` around ${formatClock(decision.window.start)}` : ''}, ${runtimeText(decision)}` : decision.action === 'DELAY' ? 'Delay' : 'Skip'}:</strong> {decision.reason}{decision.confidence !== 'likely' && <> <Badge tone="amber">{decision.confidence === 'low' ? 'Low confidence' : 'Tentative'}</Badge></>}</p>
      )}
      {!decision && date >= today && !info.rules.blocked && <p className="text-muted">No forecast yet for this day.</p>}
      {date < today && !info.logs.length && <p className="text-muted">No watering logged.</p>}
    </div>
  );
}

/** Best time for garden beds and flowers. Deliberately ignores lawn restrictions. */
function GardenColumn() {
  const { weather, profile, now } = useApp();
  const w = weather.data;
  if (!w) return null;
  const local = localParts(now, w.timezone);
  const days = [...new Set(w.hourly.map((h) => h.date))].filter((d) => d >= local.date).slice(0, 4);
  return (
    <aside aria-label="Garden beds and flowers" className="relative h-fit overflow-hidden rounded-[22px] border-2 border-line bg-white p-4 lg:sticky lg:top-28">
      <div className="relative flex items-center gap-2"><IconChip icon={Flower2} tone="coral" size="sm" /><h2 className="font-display text-base font-semibold">Gardens & flowers</h2></div>
      <p className="relative mt-1 text-xs text-muted">Best time to hand-water or drip beds, from the forecast only. Lawn rules aren’t applied here.</p>
      <ul className="relative mt-3 space-y-2">
        {days.map((d) => {
          const best = bestGardenTime(w, d, profile.thresholds, { date: local.date, hour: local.hour });
          return (
            <li key={d} className="rounded-2xl bg-coral-soft/40 px-3 py-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{formatDay(d, local.date)}</p>
              {best
                ? <p className="font-display text-lg font-semibold text-ink">{formatClock(`${String(best.hour).padStart(2, '0')}:00`)} <span className="font-sans text-xs font-semibold text-muted">≈{Math.round(best.loss.fraction * 100)}% lost to air</span></p>
                : <p className="text-sm text-muted">{d === local.date ? 'No good hour left today' : 'No good hour (freeze, wind or rain)'}</p>}
            </li>
          );
        })}
      </ul>
      <p className="relative mt-3 text-[11px] leading-snug text-faint">Some providers also limit garden watering. Hand watering and drip are often exempt, but check yours.</p>
    </aside>
  );
}
