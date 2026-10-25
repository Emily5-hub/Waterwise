import { Ban, CalendarClock, Check, ChevronLeft, ChevronRight, Clock, CloudRain, Droplets, Flower2, HelpCircle, MinusCircle, Snowflake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../App';
import { DataStatus } from '../components/DataStatus';
import { Badge, Button, Notice, PageTitle } from '../components/ui';
import type { DayDecision } from '../lib/decision';
import { bestGardenTime } from '../lib/loss';
import { evaluateRules } from '../lib/rules';
import { addDays, dayOfWeek, formatClock, formatDay, localParts } from '../lib/time';
import { mmToIn } from '../lib/units';
import { useApp } from '../state';

const VERDICT: Record<DayDecision['action'], { label: string }> = {
  WATER: { label: 'Water today' }, DO_NOT_WATER: { label: 'Skip today' }, DELAY: { label: 'Delay' },
};

type Kind = 'completed' | 'recommended' | 'tentative' | 'delay' | 'skipped' | 'restricted' | 'rain';
const KIND: Record<Kind, { label: string; icon: LucideIcon; cls: string }> = {
  completed: { label: 'Watered', icon: Check, cls: 'text-leaf' },
  recommended: { label: 'Water', icon: Droplets, cls: 'text-sky' },
  tentative: { label: 'Maybe', icon: HelpCircle, cls: 'text-sky italic' },
  delay: { label: 'Delay', icon: Clock, cls: 'text-amber' },
  skipped: { label: 'Skip', icon: MinusCircle, cls: 'text-slate' },
  restricted: { label: 'Restricted', icon: Ban, cls: 'text-alert' },
  rain: { label: 'Rain', icon: CloudRain, cls: 'text-teal' },
};

/** How far you can flick, before and after the current week or month. */
const WEEKS_BACK = 8, WEEKS_AHEAD = 8, MONTHS_BACK = 3, MONTHS_AHEAD = 3;
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayInfo = { decision?: DayDecision; logs: { id: string; minutes: number; time: string }[]; rules: ReturnType<typeof evaluateRules>; kinds: Kind[]; rainIn: number | null };

/** Minutes for the whole lawn. */
function runtimeText(day: DayDecision): string {
  const lawn = day.zones.find((z) => z.needsWater);
  return lawn ? `${Math.round(lawn.minutes)} min` : '';
}

export function CalendarPage(_: PageProps) {
  const { plan, profile, weather, now } = useApp();
  const w = weather.data;
  const tz = w?.timezone ?? profile.location!.timezone;
  const today = localParts(now, tz).date;
  const [view, setView] = useState<'week' | 'month'>('week');
  const [selected, setSelected] = useState(today);
  const todayPlan = plan?.days[0];
  const tomorrow = plan?.days[1];

  const info = (date: string): DayInfo => {
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
    return { decision, logs, rules, kinds, rainIn };
  };
  const sel = info(selected);

  return (
    <div className="ww-page ww-page-calendar">
      <PageTitle title="Calendar" phrase="Water when it counts" />
      <DataStatus />
      {/* A freeze gets its own full-width band (see .ww-freeze), not just a line under the banner. */}
      {todayPlan?.freezeAlert && (
        <section role="alert" aria-label="Freeze alert" className="ww-freeze">
          <Snowflake aria-hidden className="ww-freeze-icon" strokeWidth={1.5} />
          <p className="font-display text-xl uppercase leading-none md:text-2xl">Freeze alert</p>
          <p className="text-sm md:text-base">Below {profile.thresholds.freezeF}°F overnight. Don’t water; ice can damage turf and pipes.</p>
        </section>
      )}

      <div className="ww-band ww-schedule">
        <header><h2 className="ww-band-title ww-schedule-title">Schedule</h2></header>
        <div className="mx-auto w-full max-w-6xl">
          {/* The day's verdict, centered in a dark blue rounded box sized to its words, every word white (see .ww-verdict). */}
          <div className="ww-verdict mx-auto w-fit max-w-full space-y-6 rounded-[1.5rem] bg-forest px-8 py-10 text-center md:px-14 md:py-12">
            {!todayPlan && w && <div className="text-left"><Notice tone="amber">No forecast for today yet. Refresh the weather.</Notice></div>}
            <DaySummary date={selected} today={today} info={sel} tomorrow={tomorrow} stale={!!plan && !plan.forecastUsable} />
          </div>
          <FlickCalendar view={view} setView={setView} today={today} selected={selected} onSelect={setSelected} info={info} />
        </div>
      </div>

      <GardenColumn />
      {/* A full-width picture to close the page (a blue wash until it's added). */}
      <div aria-hidden className="ww-wide-photo" />
    </div>
  );
}

/** First day shown on each page: Sundays for weeks, the 1st for months. */
function pageStarts(view: 'week' | 'month', today: string): string[] {
  if (view === 'week') {
    const sunday = addDays(today, -dayOfWeek(today));
    return Array.from({ length: WEEKS_BACK + WEEKS_AHEAD + 1 }, (_, i) => addDays(sunday, (i - WEEKS_BACK) * 7));
  }
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: MONTHS_BACK + MONTHS_AHEAD + 1 }, (_, i) => new Date(Date.UTC(y, m - 1 + i - MONTHS_BACK, 1)).toISOString().slice(0, 10));
}
function pageDates(view: 'week' | 'month', start: string): string[] {
  if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const first = addDays(start, -dayOfWeek(start));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** One week (or month) at a time; the arrow buttons slide to the previous or next one. */
function FlickCalendar({ view, setView, today, selected, onSelect, info }: {
  view: 'week' | 'month'; setView: (v: 'week' | 'month') => void; today: string; selected: string; onSelect: (d: string) => void; info: (d: string) => DayInfo;
}) {
  const track = useRef<HTMLDivElement>(null);
  const starts = useMemo(() => pageStarts(view, today), [view, today]);
  const home = view === 'week' ? WEEKS_BACK : MONTHS_BACK;
  const [page, setPage] = useState(home);

  const goTo = (i: number, smooth = true) => {
    const el = track.current, n = Math.max(0, Math.min(starts.length - 1, i));
    if (el) el.scrollTo?.({ left: n * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    setPage(n);
  };
  useEffect(() => { goTo(home, false); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  // A day picked outside the calendar (the day cards) brings its week or month into view.
  useEffect(() => {
    if (pageDates(view, starts[page] ?? starts[home]).includes(selected)) return;
    const i = starts.findIndex((s) => (view === 'week' ? s <= selected && selected < addDays(s, 7) : s.slice(0, 7) === selected.slice(0, 7)));
    if (i >= 0) goTo(i);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the visible page lined up if the window is resized.
  useEffect(() => {
    const onResize = () => { const el = track.current; if (el) el.scrollLeft = page * el.clientWidth; };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [page]);
  const unit = view === 'week' ? 'week' : 'month';

  const start = starts[page] ?? starts[home];
  const title = view === 'week' ? `Week of ${formatDay(start)}` : new Date(`${start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <section className="ww-cal mt-8 rounded-2xl bg-[#f8fbff] px-4 py-8 sm:px-6 md:px-10" aria-label="Calendar">
      <div className="flex w-full items-center justify-between gap-3 text-center">
        <Button onClick={() => goTo(page - 1)} disabled={page === 0} ariaLabel={`Previous ${unit}`} className="h-11 w-11 !border-0 !p-0"><ChevronLeft size={28} strokeWidth={1.5} aria-hidden /></Button>
        <h2 className="ww-subhead uppercase">{title}</h2>
        <Button onClick={() => goTo(page + 1)} disabled={page === starts.length - 1} ariaLabel={`Next ${unit}`} className="h-11 w-11 !border-0 !p-0"><ChevronRight size={28} strokeWidth={1.5} aria-hidden /></Button>
      </div>
      <div role="tablist" aria-label="Calendar view" className="mb-4 mt-5 flex justify-center gap-6">
        {(['week', 'month'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`border-b-2 px-1 py-1 text-sm font-semibold uppercase tracking-[0.14em] ${view === v ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-ink'}`}>{v}</button>
        ))}
      </div>
      {/* Like a wall calendar: the weekday names on a dark blue strip, then a box for every day. */}
      <div className="grid grid-cols-7 gap-1.5 px-0.5 text-center text-sm font-semibold uppercase tracking-[0.14em] text-white" aria-hidden>{WEEKDAY_NAMES.map((d) => <div key={d} className="rounded-md bg-forest py-2">{d}</div>)}</div>
      <div ref={track} role="group" aria-label={view === 'week' ? 'Calendar weeks' : 'Calendar months'} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') goTo(page + 1); if (e.key === 'ArrowLeft') goTo(page - 1); }}
        className="mt-1.5 flex overflow-hidden">
        {starts.map((s) => (
          <div key={s} className="grid w-full shrink-0 grid-cols-7 gap-1.5 px-0.5">
            {pageDates(view, s).map((date) => {
              const i = info(date), out = view === 'month' && date.slice(0, 7) !== s.slice(0, 7), isSel = selected === date;
              return (
                <button key={date} onClick={() => onSelect(date)} aria-pressed={isSel}
                  aria-label={`${formatDay(date)}: ${i.kinds.map((k) => KIND[k].label).join(', ') || 'no events'}`}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-1 pb-3 pt-3 text-center transition ${view === 'week' ? 'min-h-44' : 'min-h-24'} ${isSel ? 'border-forest bg-white shadow-md' : 'border-[#9fc9f3] bg-[#e6f2ff] hover:border-forest/60'} ${out ? 'opacity-40' : ''}`}>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full font-display text-2xl ${isSel ? 'bg-forest text-white' : date === today ? 'text-forest ring-1 ring-forest' : 'text-ink'}`}>{Number(date.slice(8))}</span>
                  {i.kinds.map((k) => { const K = KIND[k]; return (
                    <span key={k} className={`flex w-full items-center justify-center gap-1 truncate text-xs font-semibold uppercase tracking-[0.08em] ${K.cls}`}><K.icon size={14} aria-hidden className="hidden shrink-0 sm:block" /><span className="truncate">{K.label}</span></span>
                  ); })}
                  {view === 'week' && i.decision?.action === 'WATER' && i.decision.window && !i.rules.blocked && date >= today && (
                    <span className="text-sm leading-tight text-muted">{formatClock(i.decision.window.start)}<br />{runtimeText(i.decision)}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

const VERB: Record<DayDecision['action'], string> = { WATER: 'Water', DO_NOT_WATER: 'Skip', DELAY: 'Delay' };

/** The selected day (today unless another day is clicked) in one place: what to do in big letters,
 *  why, and anything else about that day. Today also gets the start time or a look ahead to tomorrow. */
function DaySummary({ date, today, info, tomorrow, stale }: { date: string; today: string; info: DayInfo; tomorrow?: DayDecision; stale: boolean }) {
  const d = info.decision && date >= today ? info.decision : undefined;
  const isToday = date === today;
  const big = d ? (isToday ? VERDICT[d.action].label : `${VERB[d.action]} ${formatDay(date, today)}`) : formatDay(date, today);
  return (
    <section aria-live="polite" aria-label={isToday ? 'Should I water today?' : `Watering on ${formatDay(date)}`} className="text-center">
      <p className="ww-subhead uppercase">{big}</p>
      {d && <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base">{d.reason}</p>}
      {isToday && d?.action === 'WATER' && d.window && (
        <p className="mt-4 inline-flex items-center gap-2 border-b-2 border-current pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-forest"><Clock size={16} aria-hidden /> Start around {formatClock(d.window.start)} · run {runtimeText(d)}</p>
      )}
      {!isToday && d?.action === 'WATER' && d.window && <p className="mt-2 text-sm text-muted">Around {formatClock(d.window.start)} · {runtimeText(d)}</p>}
      <div className="mx-auto mt-3 max-w-2xl space-y-1.5 text-sm">
        {info.rainIn !== null && info.rainIn >= 0.1 && <p><Badge tone="teal">Rain</Badge> About {info.rainIn.toFixed(2)} in {date < today ? 'fell (model estimate)' : 'forecast'}.</p>}
        {!d && date >= today && !info.rules.blocked && <p className="text-muted">No forecast yet for this day.</p>}
        {date < today && !info.logs.length && <p className="text-muted">No watering logged.</p>}
      </div>
      {isToday && d && d.action !== 'WATER' && tomorrow?.action === 'WATER' && (
        <div className="mx-auto mt-5 max-w-md border-t border-current pt-3">
          <p className="inline-flex items-center gap-2 font-display text-xl uppercase text-forest"><CalendarClock size={20} aria-hidden /> Water tomorrow</p>
          <p className="text-sm text-muted">{tomorrow.window ? `Around ${formatClock(tomorrow.window.start)}` : 'Morning'} · about {runtimeText(tomorrow)}</p>
        </div>
      )}
      {isToday && stale && <div className="mx-auto mt-5 max-w-md text-left"><Notice tone="amber">This forecast is too old to use. Refresh when you’re online.</Notice></div>}
    </section>
  );
}

/** Best time for garden beds and flowers, one circle per day. Deliberately ignores lawn restrictions. */
function GardenColumn() {
  const { weather, profile, now } = useApp();
  const w = weather.data;
  if (!w) return null;
  const local = localParts(now, w.timezone);
  const days = [...new Set(w.hourly.map((h) => h.date))].filter((d) => d >= local.date).slice(0, 4);
  return (
    <aside aria-label="Garden beds and flowers" className="ww-band ww-garden text-center">
      <header><h2 className="ww-band-title"><span className="inline-flex items-center justify-center gap-3"><Flower2 aria-hidden className="h-[0.8em] w-[0.8em] text-coral" />Gardens & flowers</span></h2></header>
      <div className="@container mx-auto w-full max-w-6xl">
      <ul className="grid grid-cols-2 gap-6 @3xl:grid-cols-4 @3xl:gap-8">
        {days.map((d) => {
          const best = bestGardenTime(w, d, profile.thresholds, { date: local.date, hour: local.hour });
          // The time is sized to its circle (cqi units) so it always fits on one line.
          const [clock, ampm] = best ? formatClock(`${String(best.hour).padStart(2, '0')}:00`).split(' ') : [];
          return (
            <li key={d} className="@container mx-auto flex aspect-square w-full max-w-60 flex-col items-center justify-center rounded-full bg-[#b9dcff] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{formatDay(d, local.date)}</p>
              {best
                ? <><p className="mt-2 whitespace-nowrap font-display text-[length:22cqi] leading-none text-ink">{clock} <span className="text-[length:10cqi]">{ampm}</span></p><p className="mt-2 text-sm text-muted">≈{Math.round(best.loss.fraction * 100)}% lost to air</p></>
                : <p className="mt-2 px-2 text-sm leading-snug text-muted">{d === local.date ? 'No good hour left today' : 'No good hour (freeze, wind or rain)'}</p>}
            </li>
          );
        })}
      </ul>
      </div>
    </aside>
  );
}
