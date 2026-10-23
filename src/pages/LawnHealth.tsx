import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Droplets, Flower2, Leaf, Pause, Play, Scissors, Send, Snowflake, Sprout, Sun, Trash2, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../App';
import { Badge, Button, Card, Details, IconChip, PageTitle, PhotoSpace, Tone } from '../components/ui';
import { GRASS } from '../lib/agronomy';
import { GUIDE, GuideEntry } from '../lib/assistant';
import { ChatMsg, ExpertState, GREETING, initialState, respond } from '../lib/lawnExpert/engine';
import { ExpertContext, tutorialById } from '../lib/lawnExpert/tutorials';
import { regionTipsFor } from '../lib/regions';
import { localParts } from '../lib/time';
import { cToF } from '../lib/units';
import { GUIDE_PHOTOS, LAWN_CARE_PHOTOS, Photo, photoSource } from '../lib/photos';
import { useApp } from '../state';

const BASICS: { id: keyof typeof LAWN_CARE_PHOTOS; icon: LucideIcon; title: string; tips: string[] }[] = [
  { id: 'watering', icon: Droplets, title: 'Watering', tips: ['Water deeply and less often. Aim to wet the top 4–6 inches of soil.', 'Water early in the morning, when it’s cool and calm.', 'If water runs off, split the run into shorter rounds with a soak between.'] },
  { id: 'feeding', icon: Sprout, title: 'Feeding', tips: ['Test the soil before fertilizing; it tells you what’s actually missing.', 'Feed cool-season lawns mainly in fall, warm-season lawns in late spring and summer.', 'Too much nitrogen in hot weather invites disease.'] },
  { id: 'mowing', icon: Scissors, title: 'Mowing', tips: ['Keep cool-season grass at 2.5–3.5 in; warm-season grass a bit lower.', 'Never cut off more than a third of the blade at once.', 'Keep the blade sharp and leave the clippings.'] },
  { id: 'aerating', icon: Wind, title: 'Aerating', tips: ['Core-aerate compacted or clay soil about once a year.', 'Water the day before and flag sprinkler heads so the aerator misses them.', 'Leave the soil plugs on the lawn; they break down in a couple of weeks.'] },
  { id: 'seeding', icon: Leaf, title: 'Seeding', tips: ['Overseed thin cool-season lawns in early fall; warm-season lawns in late spring.', 'Rake to loosen the soil first so the seed touches soil.', 'Keep new seed lightly moist with short, frequent watering until it’s established.'] },
];

const MISTAKES: { mistake: string; fix: string }[] = [
  { mistake: 'Watering a little every day', fix: 'Water deeply 1–3 times a week, only when the lawn needs it. Roots grow deeper.' },
  { mistake: 'Watering in the evening', fix: 'Switch to early morning. Grass that stays wet overnight gets more disease.' },
  { mistake: 'Scalping the lawn short', fix: 'Raise the mower. Taller grass shades its roots and crowds out weeds.' },
  { mistake: 'Running sprinklers in rain or wind', fix: 'Skip when rain is coming or it’s windy; check the Calendar before you water.' },
  { mistake: 'Fertilizing in summer heat', fix: 'Feed at the right season for your grass and keep it light.' },
  { mistake: 'Ignoring sprinkler coverage', fix: 'Do a can test once a season and fix heads that miss or overlap.' },
];

const SEASONS: { icon: LucideIcon; tone: Tone; name: string; jobs: string }[] = [
  { icon: Flower2, tone: 'coral', name: 'Spring', jobs: 'Rake out dead grass, check sprinklers, start watering once the grass greens up, mow regularly.' },
  { icon: Sun, tone: 'sun', name: 'Summer', jobs: 'Mow higher, water deeply in the morning, watch for stress and grubs, avoid heavy feeding.' },
  { icon: Leaf, tone: 'clay', name: 'Fall', jobs: 'Best time to aerate, overseed and feed cool-season grass. Water less as it cools. Blow out sprinklers before hard freezes.' },
  { icon: Snowflake, tone: 'sky', name: 'Winter', jobs: 'Stay off frosty grass. In long dry, mild spells, water at midday when it’s above 40°F and the ground isn’t frozen.' },
];

export function LawnHealthPage(_: PageProps) {
  return (
    <div className="ww-page">
      <PageTitle title="Lawn Health" phrase="Roots before blades" />
      <ChatCard />

      <Card icon={Leaf} tone="leaf" title="Lawn care 101">
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

      <Card icon={Scissors} tone="coral" title="Common mistakes & fixes">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <ul className="space-y-12">
            {MISTAKES.map((m) => (
              <li key={m.mistake} className="border-t border-ink/20 pt-5 text-base"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">✗ {m.mistake}</p><p className="mt-2 text-ink">✓ {m.fix}</p></li>
            ))}
          </ul>
          <div className="grid gap-4"><PhotoSpace /><PhotoSpace /></div>
        </div>
      </Card>

      <Card icon={Sun} tone="sun" title="Through the seasons">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <ul className="space-y-12">
            {SEASONS.map((s) => (
              <li key={s.name} className="flex gap-3 text-base"><IconChip icon={s.icon} tone={s.tone} size="sm" /><p><strong className="font-display text-2xl font-normal uppercase">{s.name}</strong><br />{s.jobs}</p></li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-4">{SEASONS.map((s) => <PhotoSpace key={s.name} label={s.name} />)}</div>
        </div>
      </Card>
    </div>
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
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Keep it from coming back</p><ul className="mt-1 list-disc space-y-0.5 pl-5">{t.prevent.map((n) => <li key={n}>{n}</li>)}</ul></div>
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
        <p className="mt-4 text-center text-xs text-muted">
          Photos:{' '}
          {photos.map((p, k) => (
            <span key={p.src}>{k > 0 && ' · '}<a href={p.page} target="_blank" rel="noopener noreferrer" className="underline">{p.author}</a> ({p.licenseUrl ? <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.license}</a> : p.license}, {photoSource(p)})</span>
          ))}
        </p>
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

/** An empty spot saved for a photo that hasn't been chosen yet. */
/** A real photo with its required credit line (author and license). */
function PhotoFigure({ photo, caption }: { photo: Photo; caption?: string }) {
  return (
    <figure>
      <img src={photo.src} alt={photo.alt} loading="lazy" className="aspect-[4/3] w-full bg-leaf-soft object-cover" />
      <figcaption className="px-3 py-1.5 text-[0.6875rem] text-muted">
        {caption && <span className="mr-1 font-semibold text-forest">{caption} ·</span>}
        Photo: <a href={photo.page} target="_blank" rel="noopener noreferrer" className="underline">{photo.author}</a>,{' '}
        {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a> : photo.license}, via Wikimedia Commons
      </figcaption>
    </figure>
  );
}
