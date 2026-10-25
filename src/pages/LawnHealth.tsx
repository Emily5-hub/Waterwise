import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Droplets, Flower2, Leaf, Pause, Play, Scissors, Send, Snowflake, Sprout, Sun, Trash2, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../App';
import { Badge, Button, Card, Details, PageTitle } from '../components/ui';
import { WateringTips } from '../components/WateringTips';
import { GRASS } from '../lib/agronomy';
import { GUIDE, GuideEntry } from '../lib/assistant';
import { ChatMsg, ExpertState, GREETING, initialState, respond } from '../lib/lawnExpert/engine';
import { ExpertContext, tutorialById } from '../lib/lawnExpert/tutorials';
import { regionTipsFor } from '../lib/regions';
import { localParts } from '../lib/time';
import { cToF } from '../lib/units';
import { GUIDE_PHOTOS, LAWN_CARE_PHOTOS, Photo, SEASON_PHOTOS } from '../lib/photos';
import { useApp } from '../state';

const BASICS: { id: keyof typeof LAWN_CARE_PHOTOS; icon: LucideIcon; title: string; tips: string[] }[] = [
  { id: 'watering', icon: Droplets, title: 'Watering', tips: ['Water deeply and less often. Aim to wet the top 4–6 inches of soil.', 'Water early in the morning, when it’s cool and calm.', 'If water runs off, split the run into shorter rounds with a soak between.'] },
  { id: 'feeding', icon: Sprout, title: 'Feeding', tips: ['Test the soil before fertilizing; it tells you what’s actually missing.', 'Feed cool-season lawns mainly in fall, warm-season lawns in late spring and summer.', 'Too much nitrogen in hot weather invites disease.'] },
  { id: 'mowing', icon: Scissors, title: 'Mowing', tips: ['Keep cool-season grass at 2.5–3.5 in; warm-season grass a bit lower.', 'Never cut off more than a third of the blade at once.', 'Keep the blade sharp and leave the clippings.'] },
  { id: 'aerating', icon: Wind, title: 'Aerating', tips: ['Core-aerate compacted or clay soil about once a year.', 'Water the day before and flag sprinkler heads so the aerator misses them.', 'Leave the soil plugs on the lawn; they break down in a couple of weeks.'] },
  { id: 'seeding', icon: Leaf, title: 'Seeding', tips: ['Overseed thin cool-season lawns in early fall; warm-season lawns in late spring.', 'Rake to loosen the soil first so the seed touches soil.', 'Keep new seed lightly moist with short, frequent watering until it’s established.'] },
];

/** Each season's card: a short summary on the front, a fuller checklist on the back. Edit the wording here. */
const SEASONS: { icon: LucideIcon; name: string; months: string; jobs: string; tips: string[] }[] = [
  { icon: Flower2, name: 'Spring', months: 'Mar – May', jobs: 'Rake out dead grass, check sprinklers, start watering once it greens up, mow regularly.', tips: [
    'Rake out dead grass and leaves once the lawn has dried out.',
    'Run each sprinkler zone and fix broken heads and leaks before the season.',
    'Hold off watering until the grass greens up and the soil starts to dry.',
    'Start mowing when it grows; never cut more than a third of the blade.',
    'Put down crabgrass preventer when the soil warms to about 55°F (around when forsythia blooms).',
    'Feed warm-season lawns in late spring, once they’re fully green.',
  ] },
  { icon: Sun, name: 'Summer', months: 'Jun – Aug', jobs: 'Mow higher, water deeply in the morning, watch for stress and grubs, avoid heavy feeding.', tips: [
    'Water deeply once or twice a week, early in the morning.',
    'Raise the mower: taller grass shades the soil and holds moisture.',
    'Leave the clippings; they return water and nutrients.',
    'Check brown patches for grubs by pulling back a strip of turf.',
    'Skip fertilizer on cool-season lawns during heat waves.',
    'In a drought, let cool-season grass go dormant rather than watering a little every day.',
  ] },
  { icon: Leaf, name: 'Fall', months: 'Sep – Nov', jobs: 'Best time to aerate, overseed and feed cool-season grass. Water less as it cools. Blow out sprinklers before hard freezes.', tips: [
    'Core-aerate and overseed cool-season lawns in early fall.',
    'Feed cool-season grass in early fall and again late in the season.',
    'Keep leaves off the grass: rake them or mulch them with the mower.',
    'Water less as the days cool, and stop once the ground freezes.',
    'Blow out the sprinkler lines before the first hard freeze.',
  ] },
  { icon: Snowflake, name: 'Winter', months: 'Dec – Feb', jobs: 'Stay off frosty grass. In long, dry, mild spells, water at midday if it’s above 40°F and the ground isn’t frozen.', tips: [
    'Stay off frosty or frozen grass; footprints break the blades.',
    'In long, dry, mild spells, water at midday if it’s above 40°F and the ground isn’t frozen.',
    'Keep snow piles and de-icing salt off the lawn.',
    'Sharpen the mower blade and service the mower.',
    'Plan spring jobs: a soil test, seed, and sprinkler repairs.',
  ] },
];

export function LawnHealthPage({ onNavigate }: PageProps) {
  return (
    <div className="ww-page ww-page-lawn">
      <PageTitle title="Lawn Health" phrase="Care for your space" />
      <ChatCard />

      <Card icon={Leaf} tone="leaf" title="Lawn care 101" className="ww-arch">
        <LawnCareOrbit />
      </Card>

      <Card icon={AlertTriangle} tone="sun" title="Spot the stress signs">
        <SignsCarousel items={GUIDE.filter((g) => GUIDE_PHOTOS[g.id])} />
        <div className="mx-auto mt-10 w-full max-w-5xl border-t border-ink/20">
          {GUIDE.filter((g) => !GUIDE_PHOTOS[g.id]).map((g) => (
            <Details key={g.id} summary={g.title}>
              <p className="text-ink">{g.signs}</p>
              <ol className="list-decimal space-y-1 pl-5 text-ink">{g.fixes.map((f) => <li key={f}>{f}</li>)}</ol>
            </Details>
          ))}
        </div>
      </Card>

      <WateringTips />

      <Card icon={Sun} tone="sun" title="Through the seasons">
        <SeasonCards onPlan={() => onNavigate('calendar')} />
      </Card>
    </div>
  );
}


function RoundArrow({ next, label, disabled, onClick }: { next?: boolean; label: string; disabled: boolean; onClick: () => void }) {
  const Icon = next ? ChevronRight : ChevronLeft;
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/60 text-ink transition hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30">
      <Icon size={20} aria-hidden />
    </button>
  );
}

/** A sliding row of photo cards (see .ww-cards): a line about them above, a button below on the left,
 *  and arrows on the right that slide it one card at a time (hidden when every card already fits). */
function CardRow({ intro, label, unit, action, children }: { intro?: string; label: string; unit: string; action: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const measure = () => {
    const el = track.current;
    if (el) setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, []);
  const slide = (dir: number) => {
    const el = track.current, card = el?.firstElementChild as HTMLElement | null;
    if (el && card) el.scrollBy?.({ left: dir * (card.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0)), behavior: 'smooth' });
  };
  return (
    <div className="ww-cards-wrap mx-auto w-full max-w-7xl">
      {intro && <p className="mx-auto mb-8 max-w-2xl text-center text-base text-muted">{intro}</p>}
      <ul ref={track} onScroll={measure} aria-label={label} className="ww-cards">{children}</ul>
      <div className="mt-6 flex items-center justify-between gap-4">
        {action}
        {!(edge.start && edge.end) && (
          <div className="flex gap-3">
            <RoundArrow label={`Previous ${unit}`} disabled={edge.start} onClick={() => slide(-1)} />
            <RoundArrow next label={`Next ${unit}`} disabled={edge.end} onClick={() => slide(1)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The seasons as a row of photo cards, the current one marked. */
function SeasonCards({ onPlan }: { onPlan: () => void }) {
  const { now, profile } = useApp();
  const month = Number(localParts(now, profile.location?.timezone ?? 'UTC').date.slice(5, 7));
  const current = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'][month - 1];
  return (
    <CardRow label="Seasons" unit="season"
      action={<button onClick={onPlan} className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90">See this week’s plan</button>}>
      {/* Hover (or tab to) a card and it flips over to show the season's checklist (see .ww-flip). */}
      {SEASONS.map((s) => (
        <li key={s.name} tabIndex={0} className="ww-flip">
          <div className="ww-flip-inner">
            <div className="ww-flip-face ww-photo-card">
              <img src={SEASON_PHOTOS[s.name as keyof typeof SEASON_PHOTOS].src} alt={SEASON_PHOTOS[s.name as keyof typeof SEASON_PHOTOS].alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="ww-photo-shade" aria-hidden />
              <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink">{s.months}</span>
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/85"><s.icon aria-hidden className="h-4 w-4" />{s.name === current ? 'This season' : null}</p>
                <h3 className="mt-1 text-xl font-bold leading-snug">{s.name}</h3>
                <p className="mt-2 text-sm">{s.jobs}</p>
              </div>
            </div>
            <div className="ww-flip-face ww-flip-back ww-photo-card p-5 md:p-6">
              <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/85"><s.icon aria-hidden className="h-4 w-4" />{s.name} checklist</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-snug">{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </li>
      ))}
    </CardRow>
  );
}

/** What the helper knows about this lawn, for timing advice. */
function useExpertContext(): ExpertContext {
  const { profile, weather, now } = useApp();
  const z = profile.zones[0], w = weather.data, tz = profile.location?.timezone ?? 'UTC';
  const today = localParts(now, tz).date;
  const ahead = w?.daily.filter((d) => d.date >= today).slice(0, 5) ?? [];
  const highs = ahead.map((d) => d.tMaxC).filter((x): x is number => x !== null);
  const rain = ahead.find((d) => d.date > today && (d.precipProbMaxPct ?? 0) >= 60);
  return {
    grass: z ? GRASS[z.grass].label : 'your grass', season: z ? GRASS[z.grass].season : 'cool', month: Number(today.slice(5, 7)),
    state: profile.location ? regionTipsFor(profile.location).state : null,
    hotF: highs.length ? cToF(Math.max(...highs)) : null,
    rainDay: rain ? new Date(`${rain.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) : null,
  };
}

function ChatCard() {
  const ctx = useExpertContext();
  const [msgs, setMsgs] = useState<ChatMsg[]>([GREETING]);
  const [expert, setExpert] = useState<ExpertState>(initialState);
  const [text, setText] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs]);

  const send = (msg = text) => {
    const body = msg.trim();
    if (!body) return;
    const { state, replies } = respond(body, expert, ctx);
    setExpert(state);
    setMsgs((m) => [...m, { role: 'user', text: body }, ...replies]);
    setText('');
  };
  const last = msgs[msgs.length - 1];
  const chips = last.role === 'helper' ? last.chips ?? [] : [];

  return (
    <section aria-label="Lawn helper chat" className="ww-card ww-chat relative overflow-hidden">
      <header className="relative flex flex-col items-center gap-3 text-center">
        <h2 className="ww-band-title">Ask the lawn helper</h2>
      </header>

      <div ref={logRef} className="relative mx-auto mt-4 min-h-[16rem] w-full max-w-6xl flex-1 basis-0 space-y-6 overflow-y-auto rounded-2xl bg-white px-6 py-6 md:px-8" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'helper' && m.tutorialId
              ? <div className="w-full max-w-[95%] space-y-4"><Bubble role="helper"><RichText text={m.text} /></Bubble><TutorialCard id={m.tutorialId} /></div>
              : <Bubble role={m.role}><RichText text={m.text} /></Bubble>}
          </div>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="relative mx-auto mt-4 flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2">
          {chips.map((c) => <button key={c} onClick={() => send(c)} className="border-b border-current/40 py-0.5 text-sm font-medium text-forest hover:border-current">{c}</button>)}
        </div>
      )}
      <form className="relative mx-auto mt-4 flex w-full max-w-6xl items-end gap-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label className="sr-only" htmlFor="lawn-question">Describe your lawn problem</label>
        <textarea id="lawn-question" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Brown circles appeared after a hot week…" className="min-h-[44px] flex-1 resize-y"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button type="submit" variant="primary" disabled={!text.trim()} ariaLabel="Send"><Send size={16} aria-hidden /></Button>
        {msgs.length > 1 && <Button variant="ghost" onClick={() => { setMsgs([GREETING]); setExpert(initialState()); }}><Trash2 size={15} aria-hidden /> Start over</Button>}
      </form>
    </section>
  );
}

function Bubble({ role, children }: { role: 'user' | 'helper'; children: ReactNode }) {
  return (
    <div className={`flex max-w-[80%] flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
      <p aria-hidden className="mb-1 px-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">{role === 'user' ? 'You' : 'Lawn helper'}</p>
      <div className={`rounded-2xl px-4 py-3 text-base ${role === 'user' ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md bg-sky-soft text-ink'}`}>{children}</div>
    </div>
  );
}

const readDone = (id: string): number[] => { try { return JSON.parse(localStorage.getItem(`waterwise.tutorial.${id}`) ?? '[]'); } catch { return []; } };

/** A step-by-step fix. Ticked steps are remembered in this browser. */
function TutorialCard({ id }: { id: string }) {
  const t = tutorialById(id)!;
  const [done, setDone] = useState<number[]>(() => readDone(id));
  const toggle = (i: number) => setDone((d) => {
    const next = d.includes(i) ? d.filter((x) => x !== i) : [...d, i];
    try { localStorage.setItem(`waterwise.tutorial.${id}`, JSON.stringify(next)); } catch { /* progress just won't be remembered */ }
    return next;
  });
  const photo = t.photo ? GUIDE_PHOTOS[t.photo] : undefined;
  return (
    <article aria-label={`How to fix: ${t.title}`} className="ww-card border-t border-ink/20 pt-4 text-sm">
      <div className={photo ? 'grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem]' : ''}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="font-display text-2xl uppercase">How to fix: {t.title}</h3>
            <Badge tone="violet">{t.difficulty}</Badge><Badge tone="sky">{t.time}</Badge>
          </div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">You’ll need</p><ul className="mt-1 list-disc space-y-0.5 pl-5">{t.need.map((n) => <li key={n}>{n}</li>)}</ul></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Steps <span className="normal-case tracking-normal">({done.length} of {t.steps.length} done)</span></p>
            <ol className="mt-1 space-y-1.5">
              {t.steps.map((step, i) => (
                <li key={i}>
                  <label className={`flex cursor-pointer gap-2 ${done.includes(i) ? 'text-muted line-through' : ''}`}>
                    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={done.includes(i)} onChange={() => toggle(i)} />
                    <span><strong>{i + 1}.</strong> {step}</span>
                  </label>
                </li>
              ))}
            </ol>
          </div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Prevent it</p><ul className="mt-1 list-disc space-y-0.5 pl-5">{t.prevent.map((n) => <li key={n}>{n}</li>)}</ul></div>
          <p><span className="font-bold">When to call a pro:</span> {t.pro}</p>
          {t.safety && <p className="border-l-2 border-amber py-1 pl-3 text-ink"><span className="font-bold">Safety:</span> {t.safety}</p>}
        </div>
        {photo && <div><PhotoFigure photo={photo} caption="What it can look like" /></div>}
      </div>
    </article>
  );
}

/** Minimal formatting for replies: paragraphs, "-"/"*" bullets, numbered lines and **bold**. */
function RichText({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
  return (
    <div className="space-y-1.5">
      {text.split('\n').filter((l) => l.trim()).map((line, i) => {
        const l = line.trim();
        if (/^#{1,6}\s/.test(l)) return <p key={i} className="font-bold">{bold(l.replace(/^#+\s/, ''))}</p>;
        if (/^[-*•]\s/.test(l)) return <p key={i} className="flex gap-2"><span aria-hidden>•</span><span>{bold(l.slice(2))}</span></p>;
        return <p key={i}>{bold(l)}</p>;
      })}
    </div>
  );
}

/** Lawn care basics: one topic at a time, its name in the middle of a circle of photos that slowly
 *  spin around it. Tabs and arrows switch topics. The spin pauses on hover and is off for people
 *  who prefer reduced motion. */
function LawnCareOrbit() {
  const [i, setI] = useState(0);
  const n = BASICS.length, b = BASICS[i];
  const go = (k: number) => setI(((k % n) + n) % n);
  const photos = LAWN_CARE_PHOTOS[b.id];
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div role="tablist" aria-label="Lawn care topics" className="flex flex-wrap justify-center gap-2"
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); }}>
        {BASICS.map((t, k) => (
          <button key={t.id} role="tab" aria-selected={k === i} aria-controls="lawn-care-panel" tabIndex={k === i ? 0 : -1} onClick={() => go(k)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold transition ${k === i ? 'bg-forest text-white shadow' : 'bg-white text-muted ring-1 ring-line hover:text-ink'}`}>
            <t.icon size={18} aria-hidden />{t.title}
          </button>
        ))}
      </div>

      <div id="lawn-care-panel" role="tabpanel" aria-label={b.title}>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => go(i - 1)} aria-label="Previous topic" className="shrink-0 rounded-full bg-white p-2 shadow ring-1 ring-line hover:bg-leaf-soft"><ChevronLeft size={24} aria-hidden /></button>
          <div className="ww-orbit-box relative aspect-square w-[min(34rem,100%)]">
            <div key={b.id} className="ww-orbit absolute inset-0">
              {photos.map((p, k) => {
                const a = (k / photos.length) * 2 * Math.PI - Math.PI / 2;
                return (
                  <div key={p.src} className="absolute w-[30%] -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%` }}>
                    <img src={p.src} alt={p.alt} loading="lazy" className="ww-orbit-photo aspect-square w-full rounded-full bg-leaf-soft object-cover shadow-lg ring-4 ring-white" />
                  </div>
                );
              })}
            </div>
            <div className="absolute left-1/2 top-1/2 flex aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white text-center shadow-xl ring-4 ring-forest/15">
              <b.icon aria-hidden className="h-[18%] w-[18%] text-forest" />
              <h3 className="mt-1 font-display text-2xl uppercase leading-tight text-forest md:text-3xl">{b.title}</h3>
            </div>
          </div>
          <button onClick={() => go(i + 1)} aria-label="Next topic" className="shrink-0 rounded-full bg-white p-2 shadow ring-1 ring-line hover:bg-leaf-soft"><ChevronRight size={24} aria-hidden /></button>
        </div>

        <ul className="mx-auto mt-6 max-w-2xl space-y-2 text-base">
          {b.tips.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 size={18} aria-hidden className="mt-1 shrink-0 text-leaf" />{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** Rotating photos of stress signs: the current one is large in the middle with its name and fix
 *  centered underneath; the neighbours peek in at the sides. Rotates on its own unless paused,
 *  hovered, focused, or the visitor prefers reduced motion. */
function SignsCarousel({ items }: { items: GuideEntry[] }) {
  const n = items.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false); // pointer over it or keyboard focus inside
  const reduce = useMemo(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const auto = !paused && !holding && !reduce && n > 1;
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 4500);
    return () => clearInterval(t);
  }, [auto, n]);
  const go = (k: number) => setI(((k % n) + n) % n);
  const g = items[i];

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Stress signs" className="mx-auto w-full max-w-5xl"
      onMouseEnter={() => setHolding(true)} onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHolding(false); }}>
      <div className="relative overflow-hidden">
        {/* Spacer the size of the center slide; the slides sit on top of it. */}
        <div aria-hidden className="invisible mx-auto w-[min(32rem,62%)]"><div className="aspect-[4/3]" /><div className="h-8" /></div>
        {items.map((s, k) => {
          let d = (k - i + n) % n;
          if (d > n / 2) d -= n;
          const side = Math.abs(d) === 1, hidden = Math.abs(d) > 1;
          return (
            <div key={s.id} aria-hidden={d !== 0}
              onClick={side ? () => go(k) : undefined}
              className={`absolute left-1/2 top-0 w-[min(32rem,62%)] overflow-hidden rounded-2xl border border-line bg-white shadow-lg transition-[transform,opacity] duration-700 ease-out ${side ? 'cursor-pointer' : ''} ${hidden ? 'pointer-events-none' : ''}`}
              style={{
                transform: `translateX(calc(-50% + ${d === 0 ? 0 : Math.sign(d) * (hidden ? 150 : 72)}%)) scale(${d === 0 ? 1 : hidden ? 0.5 : 0.72})`,
                opacity: d === 0 ? 1 : hidden ? 0 : 0.55, zIndex: d === 0 ? 3 : side ? 2 : 1,
              }}>
              <PhotoFigure photo={GUIDE_PHOTOS[s.id]} />
            </div>
          );
        })}
        <button onClick={() => go(i - 1)} aria-label="Previous sign" className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-line hover:bg-white"><ChevronLeft size={24} aria-hidden /></button>
        <button onClick={() => go(i + 1)} aria-label="Next sign" className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-line hover:bg-white"><ChevronRight size={24} aria-hidden /></button>
      </div>

      <div className="mx-auto mt-4 max-w-2xl text-center" aria-live={auto ? 'off' : 'polite'}>
        <h3 className="font-display text-3xl uppercase text-forest">{g.title}</h3>
        <p className="mt-2 text-base">{g.signs}</p>
        <p className="mt-2 text-base font-semibold">Fix: <span className="font-normal">{g.fixes[0]}</span></p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="flex gap-2">
          {items.map((s, k) => (
            <button key={s.id} onClick={() => go(k)} aria-label={`Show ${s.title}`} aria-current={k === i ? 'true' : undefined}
              className={`h-3 rounded-full transition-all ${k === i ? 'w-8 bg-forest' : 'w-3 bg-forest/30 hover:bg-forest/60'}`} />
          ))}
        </div>
        {!reduce && n > 1 && (
          <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} className="rounded-full p-1.5 text-muted ring-1 ring-line hover:bg-white hover:text-ink">
            {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

/** A real photo, with an optional short caption. */
function PhotoFigure({ photo, caption }: { photo: Photo; caption?: string }) {
  return (
    <figure>
      <img src={photo.src} alt={photo.alt} loading="lazy" className="aspect-[4/3] w-full bg-leaf-soft object-cover" />
      {caption && <figcaption className="px-3 py-1.5 text-[0.6875rem] font-semibold text-forest">{caption}</figcaption>}
    </figure>
  );
}
