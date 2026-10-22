import { AlertTriangle, Bot, CheckCircle2, Droplets, Flower2, ImagePlus, Leaf, Loader2, Scissors, Send, Snowflake, Sprout, Sun, Trash2, Wind, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '../App';
import { Badge, Button, Card, Details, IconChip, PageTitle, Tone } from '../components/ui';
import { GRASS, SOIL, SPRINKLER, growthStateFor, zoneParams } from '../lib/agronomy';
import { ChatImage, ChatTurn, GUIDE, LawnContext, askClaude, getAssistantKey, matchGuide, readImage } from '../lib/assistant';
import { describeRule } from '../lib/rules';
import { formatClock, formatDay, localParts } from '../lib/time';
import { cToF, mmToIn } from '../lib/units';
import { GUIDE_PHOTOS, HEALTHY_LAWN, Photo } from '../lib/photos';
import { useApp } from '../state';

const BASICS: { icon: LucideIcon; tone: Tone; title: string; tips: string[] }[] = [
  { icon: Droplets, tone: 'sky', title: 'Watering', tips: ['Water deeply and less often. Aim to wet the top 4–6 inches of soil.', 'Water early in the morning, when it’s cool and calm.', 'If water runs off, split the run into shorter rounds with a soak between.'] },
  { icon: Scissors, tone: 'violet', title: 'Mowing', tips: ['Keep cool-season grass at 2.5–3.5 in; warm-season grass a bit lower.', 'Never cut off more than a third of the blade at once.', 'Keep the blade sharp and leave the clippings.'] },
  { icon: Sprout, tone: 'leaf', title: 'Feeding', tips: ['Test the soil before fertilizing; it tells you what’s actually missing.', 'Feed cool-season lawns mainly in fall, warm-season lawns in late spring and summer.', 'Too much nitrogen in hot weather invites disease.'] },
  { icon: Wind, tone: 'teal', title: 'Aerating & seeding', tips: ['Core-aerate compacted or clay soil about once a year.', 'Overseed thin cool-season lawns in early fall.', 'Keep new seed lightly moist with short, frequent watering until it’s established.'] },
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
    <div className="space-y-5">
      <PageTitle title="Lawn Health" icon={Sprout} />
      <ChatCard />

      <Card icon={Leaf} tone="leaf" title="Lawn care 101">
        <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-white sm:max-w-md"><PhotoFigure photo={HEALTHY_LAWN} caption="Goal: thick, even, green" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BASICS.map((b) => (
            <div key={b.title} className="rounded-2xl border-2 border-line p-4">
              <div className="mb-2 flex items-center gap-2"><IconChip icon={b.icon} tone={b.tone} size="sm" /><h3 className="font-display text-base font-semibold">{b.title}</h3></div>
              <ul className="space-y-1.5 text-sm">{b.tips.map((t) => <li key={t} className="flex gap-2"><CheckCircle2 size={15} aria-hidden className="mt-0.5 shrink-0 text-leaf" />{t}</li>)}</ul>
            </div>
          ))}
        </div>
      </Card>

      <Card icon={AlertTriangle} tone="sun" title="Spot the stress signs">
        <ul className="grid gap-4 sm:grid-cols-2">
          {GUIDE.filter((g) => GUIDE_PHOTOS[g.id]).map((g) => (
            <li key={g.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <PhotoFigure photo={GUIDE_PHOTOS[g.id]} />
              <div className="space-y-1.5 p-4 text-sm">
                <h3 className="font-display text-base font-bold text-forest">{g.title}</h3>
                <p>{g.signs}</p>
                <p className="font-semibold">Fix: <span className="font-normal">{g.fixes[0]}</span></p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          {GUIDE.filter((g) => !GUIDE_PHOTOS[g.id]).map((g) => (
            <Details key={g.id} summary={g.title}>
              <p className="text-ink">{g.signs}</p>
              <ol className="list-decimal space-y-1 pl-5 text-ink">{g.fixes.map((f) => <li key={f}>{f}</li>)}</ol>
            </Details>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Scissors} tone="coral" title="Common mistakes & fixes">
          <ul className="space-y-3">
            {MISTAKES.map((m) => (
              <li key={m.mistake} className="text-sm"><p className="font-bold text-coral">✗ {m.mistake}</p><p className="text-ink">✓ {m.fix}</p></li>
            ))}
          </ul>
        </Card>
        <Card icon={Sun} tone="sun" title="Through the seasons">
          <ul className="space-y-3">
            {SEASONS.map((s) => (
              <li key={s.name} className="flex gap-3 text-sm"><IconChip icon={s.icon} tone={s.tone} size="sm" /><p><strong className="font-display text-base">{s.name}</strong><br />{s.jobs}</p></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Builds the context the AI sees from the app's settings and estimates. */
function useLawnContext(): LawnContext | null {
  const { profile, weather, plan, now } = useApp();
  const z = profile.zones[0], w = weather.data;
  if (!z || !profile.location) return null;
  const today = localParts(now, profile.location.timezone).date;
  const p = zoneParams(z), d0 = plan?.days[0], zp = d0?.zones.find((x) => x.zoneId === z.id);
  const days = w?.daily.filter((d) => d.date >= today).slice(0, 4) ?? [];
  const recent = w?.daily.filter((d) => d.date < today).slice(-3) ?? [];
  const day = (d: typeof days[number]) => `${formatDay(d.date, today)}: high ${d.tMaxC !== null ? Math.round(cToF(d.tMaxC)) : '?'}°F, low ${d.tMinC !== null ? Math.round(cToF(d.tMinC)) : '?'}°F, rain ${d.precipMm !== null ? mmToIn(d.precipMm).toFixed(2) : '?'} in${d.kind !== 'recent' && d.precipProbMaxPct !== null ? ` (${Math.round(d.precipProbMaxPct)}% chance)` : ''}`;
  return {
    location: profile.location.label, today, grass: GRASS[z.grass].label, soil: SOIL[z.soil].label, sprinkler: SPRINKLER[z.sprinkler].label,
    areaSqFt: profile.zones.reduce((s, x) => s + x.areaSqFt, 0), growth: growthStateFor(z, today) === 'active' ? 'growing season' : 'dormant season',
    deficitIn: zp?.drStartIn ?? null, thresholdIn: zp ? zp.rawIn : profile.thresholds.mad * p.taw,
    recommendation: d0 ? `${d0.action === 'WATER' ? `water${d0.window ? ` around ${formatClock(d0.window.start)}` : ''}` : d0.action === 'DELAY' ? 'delay' : 'skip'} (${d0.reason})` : 'not available',
    recentWeather: w ? [...recent, ...days].map(day).join('; ') : 'not available',
    rules: profile.rules.filter((r) => r.enabled).map((r) => `${r.name}: ${describeRule(r)}`),
  };
}

const STARTERS = ['Brown patches are spreading in my front yard', 'My grass has mushrooms and feels spongy', 'Yellow spots where my dog goes', 'How high should I mow in summer?'];

function ChatCard() {
  const ctx = useLawnContext();
  const [key] = useState(getAssistantKey);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<ChatImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ai = !!key;
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [turns]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (msg = text) => {
    const body = msg.trim();
    if ((!body && !image) || busy) return;
    setError(null);
    const userTurn: ChatTurn = { role: 'user', text: body, image: image ?? undefined };
    const history = [...turns, userTurn];
    setTurns(history); setText(''); setImage(null);
    if (!ai) { setTurns([...history, { role: 'assistant', text: offlineReply(body, !!userTurn.image) }]); return; }
    if (!ctx) { setError('Set up your lawn first.'); return; }
    setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setTurns([...history, { role: 'assistant', text: '' }]);
    try {
      await askClaude(key, history, ctx, (soFar) => setTurns([...history, { role: 'assistant', text: soFar }]), ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError((e as Error).message);
      setTurns(history); // drop the empty reply; the question stays so it can be retried
    } finally { setBusy(false); }
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    if (!ai) { setError('Photo help needs the AI helper. Add your key in Settings.'); return; }
    try { setImage(await readImage(f)); setError(null); } catch (e) { setError((e as Error).message); }
  };

  return (
    <section aria-label="Lawn helper chat" className="ww-card relative overflow-hidden rounded-[22px] border border-[#cfe2c6] p-5">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><IconChip icon={Bot} tone="leaf" size="lg" />
          <h2 className="text-xl font-semibold">Ask the lawn helper</h2></div>
        <Badge tone={ai ? 'leaf' : 'amber'}>{ai ? 'AI assistant on' : 'Offline guide (not AI)'}</Badge>
      </div>

      <div className="relative mt-4 max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl bg-white/80 p-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="py-4 text-center">
            <p className="mt-1 text-sm text-muted">Try one of these:</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border-2 border-line bg-white px-3 py-1 text-sm font-semibold hover:border-leaf hover:bg-leaf-soft">{s}</button>)}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm ${t.role === 'user' ? 'rounded-br-md bg-leaf text-white' : 'rounded-bl-md border-2 border-line bg-white text-ink'}`}>
              {t.image && <img src={t.image.previewUrl} alt="Your lawn photo" className="mb-2 max-h-48 rounded-2xl" />}
              {t.role === 'assistant' && !t.text && busy ? <span className="inline-flex items-center gap-2 text-muted"><Loader2 size={15} className="animate-spin" aria-hidden /> Thinking about your lawn…</span>
                : <RichText text={t.text} />}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" className="relative mt-2 text-sm font-bold text-alert">{error}</p>}
      {image && (
        <div className="relative mt-3 inline-flex items-center gap-2 rounded-2xl bg-white p-1.5 pr-3">
          <img src={image.previewUrl} alt="Photo to send" className="h-12 w-12 rounded-xl object-cover" /><span className="text-sm font-semibold">Photo attached</span>
          <button onClick={() => setImage(null)} aria-label="Remove photo" className="rounded-full p-1 hover:bg-canvas"><X size={16} aria-hidden /></button>
        </div>
      )}
      <form className="relative mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => (ai ? fileRef.current?.click() : setError('Photo help needs the AI helper. Add your key in Settings.'))} aria-label="Add a photo of your lawn"
          className="rounded-full border-2 border-line bg-white p-2.5 text-leaf hover:bg-leaf-soft"><ImagePlus size={20} aria-hidden /></button>
        <label className="sr-only" htmlFor="lawn-question">Describe your lawn problem</label>
        <textarea id="lawn-question" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Brown circles appeared after a hot week…" className="min-h-[44px] flex-1 resize-y"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button type="submit" variant="primary" disabled={busy || (!text.trim() && !image)} ariaLabel="Send"><Send size={16} aria-hidden /></Button>
      </form>
      {turns.length > 0 && <button onClick={() => { abortRef.current?.abort(); setTurns([]); setError(null); setBusy(false); }} className="relative mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"><Trash2 size={13} aria-hidden /> Clear chat</button>}

    </section>
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

function offlineReply(question: string, hadPhoto: boolean): string {
  const hits = matchGuide(question);
  const photo = hadPhoto ? 'I can’t look at photos in offline mode. ' : '';
  if (!hits.length) return `${photo}I couldn’t match that to a common lawn problem. Try words like brown, patches, mushrooms, grubs, dog, mowing or weeds, or add an AI key in Settings for a tailored answer.`;
  return [photo + 'From the built-in guide (not AI), this sounds most like:',
    ...hits.flatMap((g) => [`**${g.title}**`, `Looks like: ${g.signs}`, ...g.fixes.map((f) => `- ${f}`)]),
    'For advice tailored to your lawn and photos, add an AI key in Settings.'].join('\n');
}

/** A real photo with its required credit line (author and license). */
function PhotoFigure({ photo, caption }: { photo: Photo; caption?: string }) {
  return (
    <figure>
      <img src={photo.src} alt={photo.alt} loading="lazy" className="aspect-[4/3] w-full bg-leaf-soft object-cover" />
      <figcaption className="px-3 py-1.5 text-[11px] text-muted">
        {caption && <span className="mr-1 font-semibold text-forest">{caption} ·</span>}
        Photo: <a href={photo.page} target="_blank" rel="noopener noreferrer" className="underline">{photo.author}</a>,{' '}
        {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a> : photo.license}, via Wikimedia Commons
      </figcaption>
    </figure>
  );
}
