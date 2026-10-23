/** The lawn helper's conversation. Runs entirely in the browser: it recognizes the problem from
 *  what the person types, asks a few follow-up questions to narrow it down, then walks them
 *  through the matching tutorial and answers follow-ups about it. Deterministic (no randomness),
 *  so the same conversation always gets the same answers. */
import { ExpertContext, TUTORIALS, Tutorial, tutorialById } from './tutorials';

export interface HelperMsg { role: 'helper'; text: string; chips?: string[]; tutorialId?: string }
export interface UserMsg { role: 'user'; text: string }
export type ChatMsg = HelperMsg | UserMsg;

export interface ExpertState {
  phase: 'idle' | 'asking' | 'tutorial';
  scores: Record<string, number>;
  asked: string[];          // question ids already asked in this diagnosis
  pending: string | null;   // question waiting for an answer
  current: string | null;   // tutorial being discussed
  shown: string[];          // tutorials already offered in this diagnosis
  step: number;             // last step walked through in chat (0 = none)
  turn: number;
}

export const initialState = (): ExpertState => ({ phase: 'idle', scores: {}, asked: [], pending: null, current: null, shown: [], step: 0, turn: 0 });

export const GREETING: HelperMsg = {
  role: 'helper',
  text: 'Hi! I’m the WaterWise lawn helper. Tell me what’s going on with your lawn, like what you see, where it is, and when it started, and I’ll help you figure out the cause and walk you through fixing it.',
  chips: ['Brown patches are spreading', 'My grass has mushrooms and feels spongy', 'Yellow spots where my dog goes', 'Weeds are taking over'],
};

const SYMPTOM_CHIPS = ['Brown or dead patches', 'Pale or yellow grass', 'Thin or bare spots', 'Weeds', 'Mushrooms or soggy ground', 'Tunnels, mounds or digging'];
const TUTORIAL_CHIPS = ['What do I need?', 'How long will it take?', 'When should I do it?', 'What else could it be?'];

/* ---------- Follow-up questions ---------- */

interface Option { label: string; match: string[]; boost: Record<string, number> }
interface Question { id: string; text: string; options: Option[] }

const NOT_SURE: Option = { label: 'Not sure', match: ['not sure', 'don’t know', "don't know", 'dont know', 'no idea', 'unsure', 'idk', 'haven’t checked', "haven't checked"], boost: {} };

const QUESTIONS: Question[] = [
  { id: 'tug', text: 'Grab a handful of grass at the edge of a damaged area and give it a firm tug. What happens?', options: [
    { label: 'It peels up like carpet', match: ['peel', 'carpet', 'comes up', 'lifts', 'pulls up', 'roll'], boost: { grubs: 6 } },
    { label: 'It’s firmly rooted', match: ['firm', 'rooted', 'stays', 'won’t come', "won't come", 'doesn’t come', "doesn't come"], boost: { grubs: -4, drought: 1, fungus: 1, chinch: 2, coverage: 1 } },
    NOT_SURE] },
  { id: 'shape', text: 'What do the damaged areas look like?', options: [
    { label: 'Circles or rings', match: ['circle', 'ring', 'round', 'circular'], boost: { fungus: 3, dog: 2, snow_mold: 2, dollar_spot: 1 } },
    { label: 'Small coin-sized spots', match: ['small', 'coin', 'tiny', 'little', 'speck'], boost: { dollar_spot: 5, dog: 1 } },
    { label: 'Irregular patches', match: ['irregular', 'random', 'uneven', 'blotch'], boost: { drought: 2, grubs: 2, chinch: 2, coverage: 1 } },
    { label: 'Stripes or along edges', match: ['stripe', 'edge', 'line', 'strip', 'along'], boost: { coverage: 4, salt: 3, scalp: 2 } },
    { label: 'The whole lawn', match: ['whole', 'everywhere', 'all over', 'entire', 'evenly'], boost: { nutrient: 3, drought: 2, overwater: 1 } },
    NOT_SURE] },
  { id: 'where', text: 'Where is it worst?', options: [
    { label: 'Sunny, hot spots', match: ['sun', 'hot', 'south', 'slope', 'hill'], boost: { drought: 3, chinch: 2 } },
    { label: 'Shady spots', match: ['shade', 'shady', 'tree', 'north'], boost: { shade: 4, moss: 2, fungus: 1 } },
    { label: 'Low or wet spots', match: ['low', 'wet', 'soggy', 'puddle', 'bottom'], boost: { overwater: 4, moss: 2, fungus: 1 } },
    { label: 'Next to pavement', match: ['pavement', 'driveway', 'sidewalk', 'street', 'road', 'curb'], boost: { salt: 3, drought: 2, chinch: 2 } },
    { label: 'Where the dog goes', match: ['dog', 'pet'], boost: { dog: 6 } },
    { label: 'Between sprinkler heads', match: ['sprinkler', 'between', 'heads', 'corner'], boost: { coverage: 5 } },
    NOT_SURE] },
  { id: 'footprint', text: 'Walk across it. Do your footprints stay pressed into the grass for a few minutes?', options: [
    { label: 'Yes, they stay', match: ['yes', 'yeah', 'stay', 'they do'], boost: { drought: 4, chinch: 1 } },
    { label: 'No, it springs back', match: ['no', 'spring', 'bounce'], boost: { drought: -2 } },
    { label: 'It feels soggy', match: ['soggy', 'squish', 'wet', 'spongy', 'mushy'], boost: { overwater: 5, thatch: 1 } },
    NOT_SURE] },
  { id: 'weather', text: 'What has the weather been like lately?', options: [
    { label: 'Hot and humid', match: ['humid', 'muggy', 'sticky'], boost: { fungus: 4, dollar_spot: 2 } },
    { label: 'Hot and dry', match: ['dry', 'drought', 'no rain'], boost: { drought: 4, chinch: 2 } },
    { label: 'Lots of rain', match: ['rain', 'wet', 'storm'], boost: { overwater: 3, fungus: 2, moss: 1 } },
    { label: 'Snow just melted', match: ['snow', 'melt', 'thaw', 'winter'], boost: { snow_mold: 4, vole: 3, salt: 2 } },
    { label: 'Mild', match: ['mild', 'normal', 'nice', 'cool'], boost: {} },
    NOT_SURE] },
  { id: 'started', text: 'When did you first notice it?', options: [
    { label: 'Right after mowing', match: ['mow', 'cut'], boost: { scalp: 6 } },
    { label: 'After a hot spell', match: ['hot', 'heat', 'heatwave'], boost: { drought: 3, fungus: 2, chinch: 2 } },
    { label: 'When the snow melted', match: ['snow', 'melt', 'spring', 'winter', 'thaw'], boost: { snow_mold: 4, vole: 3, salt: 3 } },
    { label: 'It’s been slowly getting worse', match: ['slow', 'gradual', 'weeks', 'months', 'years', 'worse'], boost: { shade: 2, compaction: 2, thatch: 2, nutrient: 2, moss: 1 } },
    NOT_SURE] },
  { id: 'ring', text: 'Is there a darker green ring around the edge of the spots?', options: [
    { label: 'Yes', match: ['yes', 'yeah', 'yep', 'there is', 'dark'], boost: { dog: 4, fungus: 1 } },
    { label: 'No', match: ['no', 'nope', 'not really'], boost: { dog: -3 } },
    NOT_SURE] },
  { id: 'weedtype', text: 'What do the weeds look like?', options: [
    { label: 'Broad leaves or flowers (dandelions, clover)', match: ['broad', 'dandelion', 'clover', 'flower', 'leaf', 'leaves'], boost: { weeds: 5 } },
    { label: 'Coarse grass spreading in clumps', match: ['coarse', 'clump', 'grass', 'crab', 'flat', 'wide'], boost: { crabgrass: 5 } },
    { label: 'Soft green moss', match: ['moss', 'fuzzy', 'soft'], boost: { moss: 6 } },
    NOT_SURE] },
  { id: 'animals', text: 'What do you see in the damaged area?', options: [
    { label: 'Raised ridges or dirt mounds', match: ['ridge', 'mound', 'raised', 'dirt', 'volcano', 'hill'], boost: { mole: 6 } },
    { label: 'Paths worn through the grass', match: ['path', 'trail', 'runway', 'track'], boost: { vole: 6 } },
    { label: 'Holes dug by animals', match: ['hole', 'dug', 'digging', 'torn', 'skunk', 'raccoon', 'bird'], boost: { grubs: 5 } },
    NOT_SURE] },
  { id: 'soil', text: 'Push a screwdriver into the soil there. How does it go?', options: [
    { label: 'Hard to push in', match: ['hard', 'tough', 'can’t', "can't", 'won’t', "won't", 'concrete'], boost: { compaction: 4, drought: 2 } },
    { label: 'Goes in easily', match: ['easy', 'easily', 'smooth', 'soft'], boost: { compaction: -2, drought: -2 } },
    { label: 'Spongy layer on top', match: ['spongy', 'layer', 'bouncy', 'thatch'], boost: { thatch: 5 } },
    NOT_SURE] },
];

/* ---------- Understanding text ---------- */

const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const words = (s: string) => new Set(norm(s).split(/[^a-z0-9']+/).filter(Boolean));

/** How strongly a description points at each problem: multi-word clues count 3, single words 1. */
export function scoreText(text: string): Record<string, number> {
  const t = norm(text), w = words(text), out: Record<string, number> = {};
  for (const tut of TUTORIALS) {
    let s = 0;
    for (const p of tut.phrases) if (t.includes(norm(p))) s += 3;
    for (const k of tut.words) if (w.has(k)) s += 1;
    if (s) out[tut.id] = s;
  }
  return out;
}

const addScores = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
};
const ranked = (scores: Record<string, number>) => Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

function matchOption(text: string, q: Question): Option | null {
  const t = norm(text);
  const exact = q.options.find((o) => norm(o.label) === t);
  if (exact) return exact;
  const w = words(text);
  let best: Option | null = null, bestHits = 0;
  for (const o of q.options) {
    const hits = o.match.filter((m) => (m.includes(' ') ? t.includes(norm(m)) : w.has(m) || [...w].some((x) => x.startsWith(m) && m.length >= 4))).length;
    if (hits > bestHits) { best = o; bestHits = hits; }
  }
  return best;
}

/* ---------- Choosing what to say ---------- */

const ACKS = ['Got it.', 'Thanks, that helps.', 'Okay.', 'That narrows it down.'];
const ack = (s: ExpertState) => ACKS[s.turn % ACKS.length];

/** The question that best separates the leading candidates, if any is still worth asking. */
function nextQuestion(s: ExpertState): Question | null {
  const top = ranked(s.scores).slice(0, 4).map(([id]) => id);
  if (!top.length || s.asked.length >= 3) return null;
  // With one weak candidate, a question that can confirm (or rule out) it is still worth asking.
  let best: Question | null = null, bestUse = top.length < 2 ? 0 : 1;
  for (const q of QUESTIONS) {
    if (s.asked.includes(q.id)) continue;
    const touched = new Set(q.options.flatMap((o) => Object.entries(o.boost).filter(([, v]) => Math.abs(v) >= 2).map(([k]) => k)));
    const use = top.filter((id) => touched.has(id)).length;
    if (use > bestUse) { best = q; bestUse = use; }
  }
  return best;
}

function ask(q: Question, s: ExpertState, lead: string): { state: ExpertState; replies: HelperMsg[] } {
  return {
    state: { ...s, phase: 'asking', pending: q.id, asked: [...s.asked, q.id] },
    replies: [{ role: 'helper', text: `${lead}${lead ? ' ' : ''}${q.text}`, chips: q.options.map((o) => o.label) }],
  };
}

function present(t: Tutorial, s: ExpertState, c: ExpertContext, lead: string): { state: ExpertState; replies: HelperMsg[] } {
  const r = ranked(s.scores).filter(([id]) => id !== t.id && !s.shown.includes(id));
  const top = s.scores[t.id] ?? 0, runner = r[0];
  const sure = top >= 6 && (!runner || top - runner[1] >= 4);
  const also = runner && !sure ? ` If that doesn’t sound right, it could also be **${tutorialById(runner[0])!.title.toLowerCase()}**, so just ask “what else could it be?”` : '';
  const timing = t.timing?.(c);
  return {
    state: { ...s, phase: 'tutorial', pending: null, current: t.id, shown: [...s.shown, t.id], step: 0 },
    replies: [
      { role: 'helper', text: `${lead}${lead ? ' ' : ''}${sure ? 'I’m fairly confident' : 'My best guess is that'} this is **${t.title.toLowerCase()}**. ${t.what}${also}` },
      { role: 'helper', text: `Here’s how to fix it, step by step. Tick off each step as you go.${timing ? `\n**Timing:** ${timing}` : ''}`, tutorialId: t.id, chips: TUTORIAL_CHIPS },
    ],
  };
}

/** Decide whether to ask another question or show the best tutorial. */
function diagnose(s: ExpertState, c: ExpertContext, lead: string): { state: ExpertState; replies: HelperMsg[] } {
  const r = ranked(s.scores);
  if (!r.length) {
    return {
      state: { ...s, phase: 'idle', pending: null },
      replies: [{ role: 'helper', text: `${lead}${lead ? ' ' : ''}I’m not sure yet what that points to. Can you tell me more? For example, what color is the grass, what shape are the damaged areas, and where are they? Or pick the closest one:`, chips: SYMPTOM_CHIPS }],
    };
  }
  const [topId, top] = r[0], second = r[1]?.[1] ?? 0;
  const clear = top >= 5 && top - second >= 4; // several strong clues, well ahead of anything else
  const q = clear ? null : nextQuestion(s);
  if (q) return ask(q, s, lead);
  return present(tutorialById(topId)!, s, c, lead);
}

/* ---------- Answering ---------- */

const say = (s: ExpertState, text: string, chips?: string[]) => ({ state: s, replies: [{ role: 'helper' as const, text, chips }] });
const list = (items: string[]) => items.map((i) => `- ${i}`).join('\n');
const has = (t: string, re: RegExp) => re.test(t);

function followUp(text: string, s: ExpertState, c: ExpertContext): { state: ExpertState; replies: HelperMsg[] } | null {
  const t = norm(text), tut = s.current ? tutorialById(s.current) : undefined;
  if (!tut) return null;
  if (has(t, /what else|something else|not (it|that|right|this)|doesn'?t (fit|match|sound|seem)|other (option|possib|idea)|wrong|isn'?t it/)) {
    const next = ranked(s.scores).find(([id]) => !s.shown.includes(id));
    if (next) return present(tutorialById(next[0])!, s, c, 'Okay, let’s look at the next most likely cause.');
    return { state: { ...initialState(), turn: s.turn }, replies: [{ role: 'helper', text: 'I’ve run out of good matches for what you described. Tell me a bit more, like the color, the shape of the damage, and where it is, and I’ll take another look.', chips: SYMPTOM_CHIPS }] };
  }
  const stepNo = /step\s*(\d+)/.exec(t);
  if (stepNo) {
    const n = Number(stepNo[1]);
    return n >= 1 && n <= tut.steps.length ? say({ ...s, step: n }, `**Step ${n}:** ${tut.steps[n - 1]}`, n < tut.steps.length ? ['Next step'] : TUTORIAL_CHIPS)
      : say(s, `This fix has ${tut.steps.length} steps.`, ['Step 1']);
  }
  if (has(t, /^(next|done|ok(ay)?,? (next|done)|what'?s next|then what|after that|next step|how do i start|where do i start|start|first step|what do i do( first)?)\b/)) {
    const n = Math.min(s.step + 1, tut.steps.length);
    if (s.step >= tut.steps.length) return say(s, 'That was the last step. Give it time to recover, and come back if it doesn’t improve. You can also ask how to keep it from coming back.', ['How do I prevent it?']);
    return say({ ...s, step: n }, `**Step ${n} of ${tut.steps.length}:** ${tut.steps[n - 1]}`, n < tut.steps.length ? ['Next step'] : ['How do I prevent it?']);
  }
  if (has(t, /\b(need|tools?|supplies|buy|materials|equipment|get from the store|shopping)\b/)) return say(s, `For ${tut.title.toLowerCase()}, you’ll need:\n${list(tut.need)}`, ['How long will it take?', 'Where do I start?']);
  if (has(t, /how long|how much time|take long|time does it|time will it/)) return say(s, `Plan on **${tut.time.toLowerCase()}**. Difficulty: ${tut.difficulty.toLowerCase()}.`, ['Where do I start?']);
  if (has(t, /\b(when|best time|season|right now|this week|today)\b/)) return say(s, tut.timing?.(c) ?? 'You can start any time; the sooner the better.', ['Where do I start?']);
  if (has(t, /\b(why|cause|caused|causes|reason|how did)\b/)) return say(s, `The usual causes are:\n${list(tut.why)}`, ['How do I prevent it?']);
  if (has(t, /prevent|keep it from|stop it|coming back|happen again|avoid/)) return say(s, `To keep it from coming back:\n${list(tut.prevent)}`, ['Should I call a pro?']);
  if (has(t, /\b(pro|professional|expert|hire|company|service|someone)\b/)) return say(s, tut.pro);
  if (has(t, /\b(safe|safety|pets?|dogs?|kids|children|chemicals?|toxic|poison)\b/)) return say(s, tut.safety ?? 'This fix doesn’t need any chemicals, so it’s safe for kids and pets.');
  return null;
}

/** One turn of conversation. */
export function respond(input: string, prev: ExpertState, c: ExpertContext): { state: ExpertState; replies: HelperMsg[] } {
  const s: ExpertState = { ...prev, turn: prev.turn + 1 };
  const t = norm(input);
  if (!t) return { state: prev, replies: [] };

  if (has(t, /^(start over|reset|new problem|different problem|another problem|something different)\b/)) {
    return { state: { ...initialState(), turn: s.turn }, replies: [{ role: 'helper', text: 'Sure, let’s start fresh. What’s going on with your lawn?', chips: GREETING.chips }] };
  }
  if (has(t, /^(thanks|thank you|thx|ty|great|perfect|awesome|cool|that helps|helpful|got it)\b/) && Object.keys(scoreText(t)).length === 0) {
    return say(s, 'You’re welcome! Come back anytime if it doesn’t improve, or tell me about another problem.', s.current ? ['How do I prevent it?'] : undefined);
  }
  if (has(t, /^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b/) && Object.keys(scoreText(t)).length === 0) {
    return say(s, 'Hi! What’s going on with your lawn?', GREETING.chips);
  }

  // Answering one of my questions?
  if (s.phase === 'asking' && s.pending) {
    const q = QUESTIONS.find((x) => x.id === s.pending)!;
    const opt = matchOption(t, q), extra = scoreText(t);
    const scores = addScores(addScores(s.scores, opt?.boost ?? {}), opt ? {} : extra);
    const lead = opt === NOT_SURE || (!opt && !Object.keys(extra).length) ? 'No problem.' : ack(s);
    return diagnose({ ...s, scores, pending: null }, c, lead);
  }

  // Talking about the current tutorial?
  if (s.phase === 'tutorial') {
    const f = followUp(t, s, c);
    if (f) return f;
    if (has(t, /^(yes|yeah|yep|that'?s it|sounds right|that sounds right|makes sense|ok(ay)?)\b/)) {
      return say(s, 'Great. Work through the steps above and tick them off as you go. I can walk you through them one at a time too.', ['Where do I start?', 'What do I need?']);
    }
    const fresh = scoreText(t);
    if (ranked(fresh).length) return diagnose({ ...initialState(), turn: s.turn, scores: fresh }, c, 'Let’s look at that.');
    return say(s, `I can tell you what you’ll need, how long it takes, the best time to do it, why it happens, or how to prevent it. Or describe a different problem.`, TUTORIAL_CHIPS);
  }

  // A new description (or more detail on one).
  const scores = addScores(s.scores, scoreText(t));
  if (!ranked(scores).length && has(t, /\b(capital|weather|stock|recipe|movie|song|joke|president|math)\b/)) {
    return say(s, 'I can only help with lawns, grass and yard problems. What’s going on with your lawn?', GREETING.chips);
  }
  return diagnose({ ...s, scores }, c, ranked(scores).length && s.phase === 'idle' && Object.keys(prev.scores).length === 0 ? 'Thanks for the details.' : '');
}
