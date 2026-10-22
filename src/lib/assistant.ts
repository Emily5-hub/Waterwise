/** Lawn-care assistant.
 *  - AI mode: Claude, called straight from the browser with the user's own Anthropic API key
 *    (there's no WaterWise server). The key is stored only in this browser's localStorage and is
 *    sent only to api.anthropic.com.
 *  - Offline mode: a keyword guide over the built-in Lawn Care 101 content. It's labeled as a
 *    guide, not AI, and can't look at photos. */
import type { BetaContentBlockParam, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

export const ASSISTANT_MODEL = 'claude-opus-5-5';
const KEY_STORAGE = 'waterwise.assistantKey';

export function getAssistantKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function saveAssistantKey(key: string): boolean {
  try { localStorage.setItem(KEY_STORAGE, key.trim()); return true; } catch { return false; }
}
export function clearAssistantKey() {
  try { localStorage.removeItem(KEY_STORAGE); } catch { /* nothing stored */ }
}
/** Shape check only; the API decides whether the key is valid. */
export const looksLikeKey = (k: string) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim());

export interface ChatImage { mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string; previewUrl: string }
export interface ChatTurn { role: 'user' | 'assistant'; text: string; image?: ChatImage }

/** Everything the app knows about this lawn, phrased so estimates stay estimates. */
export interface LawnContext {
  location: string; today: string; grass: string; soil: string; sprinkler: string; areaSqFt: number;
  growth: string; deficitIn: number | null; thresholdIn: number | null; recommendation: string;
  recentWeather: string; rules: string[];
}

export function systemPrompt(c: LawnContext): string {
  return [
    'You are the lawn and garden helper inside WaterWise, a watering-schedule app for US homeowners.',
    'Give practical, specific, step-by-step advice a homeowner can follow this week. Keep answers short: a quick diagnosis, the likely causes ranked, then what to do. Use plain words and simple bullet lists.',
    'When the cause is uncertain, say what to check to tell the causes apart (for example the screwdriver or tug test, looking for grubs, checking sprinkler coverage with cans). Suggest the local cooperative extension office or a certified professional for anything you can’t judge from the description or photo.',
    'For photos: describe what you can actually see, and say clearly what a photo can’t show (roots, soil moisture, insects below the surface).',
    'Prefer cultural fixes (watering, mowing height, aeration, overseeding) before chemicals. If you mention a fertilizer or pesticide, tell them to follow the label and local rules, and don’t name brands.',
    'Nobody has measured this lawn’s soil moisture. The app’s deficit number is an estimate from weather, so never present it as a measurement.',
    'If the question isn’t about lawns, gardens, trees, watering or yard care, say briefly that you can only help with those.',
    '',
    'What WaterWise knows about this user’s lawn (settings and estimates, not measurements):',
    `- Location: ${c.location}. Today: ${c.today}.`,
    `- Grass: ${c.grass} (${c.growth}). Soil: ${c.soil}. Sprinklers: ${c.sprinkler}. Lawn area: about ${c.areaSqFt.toLocaleString()} sq ft.`,
    c.deficitIn !== null && c.thresholdIn !== null ? `- Estimated root-zone water deficit: about ${c.deficitIn.toFixed(2)} in (the app recommends watering at ${c.thresholdIn.toFixed(2)} in).` : '- Estimated root-zone water deficit: not available.',
    `- Today’s watering recommendation: ${c.recommendation}`,
    `- Recent and forecast weather: ${c.recentWeather}`,
    `- Watering rules the user entered: ${c.rules.length ? c.rules.join('; ') : 'none entered'}.`,
  ].join('\n');
}

function toMessages(turns: ChatTurn[]): BetaMessageParam[] {
  return turns.map((t) => {
    if (t.role === 'assistant') return { role: 'assistant', content: t.text };
    const content: BetaContentBlockParam[] = [];
    if (t.image) content.push({ type: 'image', source: { type: 'base64', media_type: t.image.mediaType, data: t.image.data } });
    content.push({ type: 'text', text: t.text || 'What do you see, and what should I do?' });
    return { role: 'user', content };
  });
}

/** Streams Claude's reply; `onText` gets the reply so far. Resolves to the final text. Throws Error with a readable message. */
export async function askClaude(apiKey: string, turns: ChatTurn[], ctx: LawnContext, onText: (soFar: string) => void, signal?: AbortSignal): Promise<string> {
  // Loaded on first use so the rest of the app stays small.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let text = '';
  try {
    const stream = client.beta.messages.stream({
      model: ASSISTANT_MODEL,
      max_tokens: 64000,
      output_config: { effort: 'medium' },
      // If a safety classifier declines, the API retries on its recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: systemPrompt(ctx),
      messages: toMessages(turns),
    }, { signal });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') { text += event.delta.text; onText(text); }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new Error('The assistant declined to answer that. Try rephrasing your question about your lawn.');
    if (!text.trim()) throw new Error('The assistant returned an empty reply. Please try again.');
    return text;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('That API key was rejected. Check it and save it again.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('This API key doesn’t have access to the model. Check your Anthropic account.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Too many requests right now. Wait a minute and try again.');
    if (e instanceof Anthropic.BadRequestError) throw new Error(`The request was rejected: ${e.message}`);
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Couldn’t reach the assistant. Check your connection.');
    if (e instanceof Anthropic.APIError) throw new Error(`The assistant had a problem (${e.status ?? 'error'}). Try again shortly.`);
    throw e instanceof Error ? e : new Error('Something went wrong.');
  }
}

/** Shrinks a photo in the browser (longest side ≤ 1568 px, JPEG) before sending it. */
export function readImage(file: File): Promise<ChatImage> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return reject(new Error('Use a JPEG, PNG, WebP or GIF photo.'));
    if (file.size > 25 * 1024 * 1024) return reject(new Error('That photo is too large (over 25 MB).'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1568 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('This browser can’t process the photo.')); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      resolve({ mediaType: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that image.')); };
    img.src = url;
  });
}

/* ---------- Offline guide (no AI) ---------- */

export interface GuideEntry { id: string; title: string; keywords: string[]; signs: string; causes: string[]; fixes: string[] }

export const GUIDE: GuideEntry[] = [
  { id: 'drought', title: 'Drought stress', keywords: ['dry', 'drought', 'footprint', 'blue', 'gray', 'grey', 'wilt', 'curl', 'brown', 'crispy', 'straw', 'thirsty'],
    signs: 'Blue-gray tint, folded or curled blades, footprints that stay visible for minutes, then tan or straw-colored patches.',
    causes: ['Not enough water reaching the roots', 'Sprinkler gaps or clogged heads', 'Compacted or clay soil shedding water', 'Shallow roots from frequent light watering'],
    fixes: ['Water deeply (until the top 4–6 inches are moist), then wait until the lawn needs it again.', 'Run a can test: set out a few cans and see if some spots get much less water.', 'Clean or adjust heads that miss spots.', 'Aerate compacted lawns in spring or fall.'] },
  { id: 'overwater', title: 'Overwatering', keywords: ['soggy', 'mushroom', 'puddle', 'squish', 'moss', 'algae', 'spongy', 'wet', 'overwater', 'runoff', 'yellow'],
    signs: 'Soggy or squishy turf, mushrooms, moss or algae, yellowing grass, water running onto pavement.',
    causes: ['Watering too often', 'Runtime longer than the soil can absorb', 'Poor drainage or heavy clay', 'A leaking valve or broken head'],
    fixes: ['Water less often, and only when the deficit says so.', 'Split long runs into shorter rounds with a 30–60 minute soak in between.', 'Check for leaks or heads that stay on.', 'Aerate to help water soak in.'] },
  { id: 'fungus', title: 'Fungal disease (brown patch, dollar spot)', keywords: ['ring', 'circle', 'spot', 'patch', 'fungus', 'fungal', 'lesion', 'web', 'cobweb', 'dollar'],
    signs: 'Circular brown patches or rings, small straw-colored spots the size of a coin, tan lesions on blades, cobweb-like threads in the morning.',
    causes: ['Grass staying wet overnight', 'Watering in the evening', 'Too much nitrogen in hot weather', 'Thick thatch and poor airflow'],
    fixes: ['Water only in the early morning so blades dry during the day.', 'Hold off on fertilizer during hot, humid spells.', 'Bag clippings from affected areas.', 'If it keeps spreading, ask your local extension office to identify it before using a fungicide.'] },
  { id: 'grubs', title: 'Grubs (insect damage)', keywords: ['grub', 'peel', 'carpet', 'lift', 'roll', 'birds', 'skunk', 'raccoon', 'digging', 'insect', 'bug'],
    signs: 'Dead patches that peel back like carpet because the roots are gone; birds, skunks or raccoons digging.',
    causes: ['Beetle larvae feeding on roots in late summer'],
    fixes: ['Tug test: cut a 1-ft square and peel it back. More than about 5–10 grubs per square foot usually means treatment helps.', 'Water the area to help surviving grass recover.', 'Ask a garden center or extension office about the right product and timing for your area.', 'Reseed bare spots in early fall.'] },
  { id: 'dog', title: 'Dog spots', keywords: ['dog', 'pet', 'urine', 'pee'],
    signs: 'Round dead spots with a dark green ring around the edge.',
    causes: ['Concentrated nitrogen and salts in urine'],
    fixes: ['Flush the spot with water soon after.', 'Rake out dead grass and reseed or patch.', 'Train pets to use one spot, ideally mulch or gravel.'] },
  { id: 'scalp', title: 'Mowing too short (scalping)', keywords: ['mow', 'mowing', 'short', 'scalp', 'cut', 'blade', 'height', 'torn', 'shredded'],
    signs: 'Brown, bare-looking stripes or high spots after mowing; ragged, white or brown blade tips.',
    causes: ['Cutting more than a third of the blade at once', 'Mower set too low', 'A dull mower blade tearing grass'],
    fixes: ['Raise the mower: most cool-season lawns do best at 2.5–3.5 inches.', 'Never cut more than one third of the height at a time.', 'Sharpen the blade at least once a season.', 'Leave clippings on the lawn; they return nutrients.'] },
  { id: 'weeds', title: 'Weeds taking over', keywords: ['weed', 'dandelion', 'crabgrass', 'clover', 'thin', 'bare', 'patchy', 'sparse'],
    signs: 'Thin turf with weeds filling the gaps.',
    causes: ['Thin grass leaves room for weeds', 'Mowing too short', 'Compacted soil', 'Wrong grass for sun or shade'],
    fixes: ['Thicken the lawn: overseed in early fall (cool-season grass) or late spring (warm-season grass).', 'Mow higher; taller grass shades out weed seeds.', 'Hand-pull or spot-treat; follow label directions.', 'Aerate compacted areas.'] },
  { id: 'shade', title: 'Thin grass in shade', keywords: ['shade', 'tree', 'shady', 'dark', 'under'],
    signs: 'Thin, spindly grass under trees or on the north side of buildings.',
    causes: ['Too little sun for the grass type', 'Tree roots competing for water'],
    fixes: ['Overseed with a shade-tolerant grass such as fine fescue.', 'Raise the mowing height in shade.', 'Consider mulch or shade plants where grass won’t grow.'] },
  { id: 'nutrient', title: 'Pale or yellow-green grass', keywords: ['pale', 'light green', 'yellowish', 'fertilizer', 'feed', 'nitrogen', 'iron'],
    signs: 'Evenly pale or yellow-green lawn that grows slowly.',
    causes: ['Low nitrogen', 'Iron deficiency in high-pH soils (common in the West)', 'Overwatering washing nutrients away'],
    fixes: ['Get a soil test before fertilizing.', 'Feed lightly at the right season for your grass type.', 'Water only as needed.'] },
];

/** Best-matching guide entries for a description, by keyword hits. */
export function matchGuide(text: string, limit = 2): GuideEntry[] {
  const t = text.toLowerCase();
  return GUIDE.map((g) => ({ g, hits: g.keywords.filter((k) => t.includes(k)).length }))
    .filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, limit).map((x) => x.g);
}
