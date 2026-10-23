/** Regional watering tips, picked from the state found by the ZIP lookup.
 *  General guidance only: local water providers set the actual rules. */
import type { Location, Profile, Rule, RuleKind } from './types';

/** rules: restrictions typical for the area, added automatically as "typical, unverified".
 *  Kept to patterns that are widespread there; the user's provider may differ. */
export interface RegionTips { lawn: string[]; garden: string[]; note: string; rules?: { name: string; kind: RuleKind }[] }

const DAYTIME = (start: string, end: string, label: string) => ({ name: `No daytime watering (${label})`, kind: { type: 'allowed_hours', start, end } as RuleKind });
const SHUTDOWN = (start: string, end: string) => ({ name: 'Fall/winter lawn shutdown', kind: { type: 'seasonal_shutdown', start, end } as RuleKind });

const COLORADO: RegionTips = {
  lawn: [
    'Early morning is the best time to run sprinklers.',
    'Deep watering grows deeper roots that handle heat better.',
    'If water runs onto the sidewalk, run sprinklers in short rounds with a 30–60 minute pause between them.',
    'Kentucky bluegrass is common. Native grasses like buffalograss and blue grama need much less water.',
    'Spring: wait until the grass greens up before turning sprinklers on. Fall: cut back as nights cool, and blow out the lines before hard freezes.',
    'Winter: during long dry, mild spells, lawns and trees can use a drink. Water at midday when it’s above 40°F and the ground isn’t frozen, so it soaks in before night.',
  ],
  garden: [
    'Spread 2–3 inches of mulch on beds.',
    'Drip lines and soaker hoses put water right at the roots and lose far less than sprinklers.',
    'Water the soil, not the leaves, and do it in the morning.',
    'Keep vegetable beds evenly moist.',
    'Pots and hanging baskets dry out fast in sun and wind.',
    'Before watering, push a finger 2–3 inches into the soil. If it’s still damp, wait.',
    'Native and drought-tolerant plants settle in after a year or two.',
  ],
  note: 'Colorado has no statewide lawn-watering schedule; each water provider sets its own.',
  rules: [SHUTDOWN('10-01', '04-30'), DAYTIME('18:00', '10:00', '10 AM–6 PM')],
};

const MOUNTAIN: RegionTips = {
  lawn: [
    'Dry air and strong high-altitude sun mean fast evaporation. Water in the early morning.',
    'Water deeply and less often so roots grow down instead of staying near the surface.',
    'On clay or rocky soil, run sprinklers in short rounds with a pause between them so water soaks in.',
    'Fescue and native grasses need far less water than Kentucky bluegrass.',
    'Blow out sprinkler lines in fall before the first hard freeze.',
  ],
  garden: [
    'Mulch beds 2–3 inches deep to hold moisture.',
    'Use drip lines or soaker hoses for beds and shrubs.',
    'Water in the morning; afternoon wind carries spray away.',
    'Pots dry out fast in sun and wind; check them daily in summer.',
    'Native and drought-tolerant plants need little extra water once settled.',
  ],
  note: 'Most watering rules here come from your city or local water district.',
  rules: [SHUTDOWN('10-15', '04-15'), DAYTIME('18:00', '10:00', '10 AM–6 PM')],
};

const DESERT: RegionTips = {
  lawn: [
    'Water before sunrise. Midday summer heat can evaporate much of what you put down.',
    'Adjust your schedule every month or so; summer lawns need several times more water than winter ones.',
    'Bermuda grass goes dormant and brown in winter and needs very little water then.',
    'If you overseed with winter rye, it needs light, frequent watering until it’s established.',
    'Replacing unused lawn with desert landscaping saves the most water.',
  ],
  garden: [
    'Use drip irrigation for trees, shrubs and beds; water deeply and less often.',
    'Water trees out at the edge of the canopy, where the feeder roots are, not at the trunk.',
    'Mulch keeps roots cooler and slows evaporation.',
    'Shade cloth helps vegetables through the hottest weeks.',
    'Desert-adapted plants need little extra water once established.',
  ],
  note: 'Many desert cities limit daytime or summer watering. Check your water provider’s current schedule.',
  rules: [DAYTIME('18:00', '10:00', '10 AM–6 PM')],
};

const CALIFORNIA: RegionTips = {
  lawn: [
    'Most rain falls in winter. Turn sprinklers down or off during the rainy season.',
    'Water early in the morning, when it’s cool and calm.',
    'Avoid watering during rain and for about two days after a good soaking.',
    'Don’t let water run onto sidewalks or streets; use shorter rounds instead.',
    'Native and drought-tolerant plants can replace thirsty lawn areas.',
  ],
  garden: [
    'Use drip irrigation and a smart controller for beds.',
    'Mulch 2–3 inches deep to hold moisture through dry summers.',
    'California native plants need little or no summer water once established.',
    'Group plants by how much water they need.',
  ],
  note: 'Rules change with drought conditions, and many cities set watering days. Check your water provider.',
  rules: [DAYTIME('17:00', '09:00', '9 AM–5 PM')],
};

const NORTHWEST: RegionTips = {
  lawn: [
    'Summers are dry even though winters are wet. Lawns need about 1 inch of water a week in July and August.',
    'It’s fine to let a healthy lawn go brown and dormant in summer; it greens up again when fall rains return.',
    'Water in the early morning.',
    'Turn sprinklers off once fall rains start.',
  ],
  garden: [
    'Mulch beds in late spring to hold winter moisture into summer.',
    'Use soaker hoses or drip for vegetable beds.',
    'Water deeply once or twice a week rather than a little every day.',
    'Many native plants need no summer water once established.',
  ],
  note: 'Watering rules are set by your city or water utility and usually tighten only in drought years.',
};

const PLAINS: RegionTips = {
  lawn: [
    'Wind carries spray away. Water in the calm of early morning.',
    'Water deeply and less often; aim for about 1 inch a week including rain.',
    'Buffalograss and other native grasses handle heat and drought with little water.',
    'On heavy clay, water in short rounds so it soaks in instead of running off.',
  ],
  garden: [
    'Mulch beds to protect soil from hot, drying wind.',
    'Drip lines and soaker hoses waste far less water than sprinklers.',
    'Windbreaks and fences help gardens stay moist.',
    'Check soil moisture with a finger before watering.',
  ],
  note: 'Watering rules are set locally and are most common during summer drought.',
};

const TEXAS: RegionTips = {
  lawn: [
    'St. Augustine, Bermuda and zoysia are warm-season grasses that slow down and need much less water in winter.',
    'Water before 10 a.m. or after 6 p.m. to cut evaporation; many cities require it.',
    'Water deeply once or twice a week rather than daily.',
    'Use a rain sensor or turn sprinklers off after a good rain.',
  ],
  garden: [
    'Mulch beds 2–3 inches deep to keep roots cool.',
    'Use drip irrigation for beds and shrubs.',
    'Native and adapted plants handle Texas heat with far less water.',
    'Water vegetables in the morning to limit disease.',
  ],
  note: 'Many Texas cities set watering days by address. Check your water provider’s current stage.',
  rules: [DAYTIME('18:00', '10:00', '10 AM–6 PM')],
};

const MIDWEST: RegionTips = {
  lawn: [
    'Rain often covers what lawns need in spring and fall. Aim for about 1 inch a week, including rain.',
    'Use a rain gauge or rain sensor so you only water when rain falls short.',
    'Cool-season lawns may go dormant in summer drought and recover in fall.',
    'Water in the early morning to limit evaporation and disease.',
  ],
  garden: [
    'Mulch beds to even out moisture between rains.',
    'Soaker hoses work well for vegetable rows.',
    'Water new trees and shrubs weekly in their first year if rain is short.',
    'Check soil moisture before watering.',
  ],
  note: 'Most towns only restrict watering during droughts or water emergencies.',
};

const NORTHEAST: RegionTips = {
  lawn: [
    'Regular rain covers most of the season. Aim for about 1 inch a week, including rain.',
    'Use a rain gauge or rain sensor and skip watering after a soaking.',
    'Water in the early morning; evening watering keeps grass wet overnight and invites disease.',
    'In summer heat waves, a dormant brown lawn is normal and usually recovers.',
  ],
  garden: [
    'Mulch beds to hold moisture through dry spells.',
    'Water vegetables at the soil, not the leaves.',
    'Water new plantings weekly in their first season if rain is short.',
    'Check soil moisture before watering.',
  ],
  note: 'Some towns set odd/even watering days during dry summers. Check your town or water utility.',
};

const SOUTHEAST: RegionTips = {
  lawn: [
    'Humid weather and summer storms often cover what lawns need. Skip watering after a good rain.',
    'Water only in the early morning. Evening watering in humid weather encourages fungus.',
    'Warm-season grasses like Bermuda, zoysia and centipede need little water when dormant in winter.',
    'Water deeply and less often; aim for about 1 inch a week, including rain.',
  ],
  garden: [
    'Mulch beds to keep soil moist and cool.',
    'Water at the soil, not the leaves, to limit disease.',
    'Drip lines and soaker hoses suit vegetable beds.',
    'Check soil moisture before watering.',
  ],
  note: 'Watering rules are set locally and usually tighten only during drought.',
};

const FLORIDA: RegionTips = {
  lawn: [
    'Florida law requires automatic sprinkler systems to have a working rain sensor or soil moisture sensor.',
    'Sandy soil drains fast. Apply about ½–¾ inch at a time rather than more.',
    'In the summer rainy season, rain often covers lawn needs. Turn sprinklers off.',
    'Water in the early morning.',
  ],
  garden: [
    'Mulch beds to hold moisture in sandy soil.',
    'Use micro-irrigation or drip for beds and shrubs.',
    'Florida-friendly plants need far less water once established.',
    'Water at the soil, not the leaves.',
  ],
  note: 'Water management districts and counties set watering days, often by address. Check yours.',
  rules: [DAYTIME('16:00', '10:00', '10 AM–4 PM')],
};

const HAWAII: RegionTips = {
  lawn: [
    'Rainfall varies hugely between windward and leeward sides. Water based on your spot, not the island.',
    'Water in the early morning.',
    'Tropical grasses grow year-round; adjust watering with the seasons rather than turning it off.',
  ],
  garden: [
    'Mulch beds to slow evaporation in sun and trade winds.',
    'Use drip irrigation for beds and fruit trees.',
    'Native and drought-tolerant plants need little extra water on the dry side.',
  ],
  note: 'Each county water board sets its own rules. Check yours.',
};

const ALASKA: RegionTips = {
  lawn: [
    'The growing season is short, and rain often covers what established lawns need.',
    'Water new lawns and seed lightly and often until established.',
    'Water deeply during dry stretches in midsummer.',
  ],
  garden: [
    'Long summer days dry out pots and raised beds quickly; check them often.',
    'Mulch beds to hold moisture and warm the soil.',
    'Water at the soil, not the leaves.',
  ],
  note: 'Watering rules, where they exist, are set by your local utility.',
};

const GENERAL: RegionTips = {
  lawn: [
    'Water in the early morning, when it’s cool and calm.',
    'Water deeply and less often; aim for about 1 inch a week, including rain.',
    'Skip watering after a good rain.',
    'If water runs off, water in short rounds with a pause between them.',
  ],
  garden: [
    'Mulch beds 2–3 inches deep.',
    'Use drip lines or soaker hoses for beds.',
    'Water at the soil, not the leaves.',
    'Check soil moisture with a finger before watering.',
  ],
  note: 'Watering rules are set by your local water provider.',
};

const BY_STATE: Record<string, RegionTips> = {
  Colorado: COLORADO,
  Utah: MOUNTAIN, Wyoming: MOUNTAIN, Montana: MOUNTAIN, Idaho: MOUNTAIN,
  Arizona: DESERT, 'New Mexico': DESERT,
  Nevada: { ...DESERT, rules: [...DESERT.rules!, { name: 'No watering on Sundays', kind: { type: 'weekday_blackout', days: [0] } }] },
  California: CALIFORNIA,
  Washington: NORTHWEST, Oregon: NORTHWEST,
  'North Dakota': PLAINS, 'South Dakota': PLAINS, Nebraska: PLAINS, Kansas: PLAINS, Oklahoma: PLAINS,
  Texas: TEXAS,
  Minnesota: MIDWEST, Wisconsin: MIDWEST, Michigan: MIDWEST, Iowa: MIDWEST, Illinois: MIDWEST, Indiana: MIDWEST, Ohio: MIDWEST, Missouri: MIDWEST,
  Maine: NORTHEAST, 'New Hampshire': NORTHEAST, Vermont: NORTHEAST, Massachusetts: NORTHEAST, 'Rhode Island': NORTHEAST, Connecticut: NORTHEAST,
  'New York': NORTHEAST, 'New Jersey': NORTHEAST, Pennsylvania: NORTHEAST, Delaware: NORTHEAST, Maryland: NORTHEAST, 'District of Columbia': NORTHEAST,
  Virginia: SOUTHEAST, 'West Virginia': SOUTHEAST, 'North Carolina': SOUTHEAST, 'South Carolina': SOUTHEAST, Georgia: SOUTHEAST, Tennessee: SOUTHEAST,
  Kentucky: SOUTHEAST, Alabama: SOUTHEAST, Mississippi: SOUTHEAST, Arkansas: SOUTHEAST, Louisiana: SOUTHEAST,
  Florida: FLORIDA, Hawaii: HAWAII, Alaska: ALASKA,
};

/** The user's state (from the ZIP lookup, or read from the place label) and the tips for it.
 *  Unknown places get general tips. */
export function regionTipsFor(loc: Pick<Location, 'state' | 'label'>): { state: string | null; tips: RegionTips } {
  const state = loc.state ?? /,\s*([^,]+?)\s+\d{5}$/.exec(loc.label)?.[1] ?? null; // labels look like "City, State 12345"
  return { state, tips: (state && BY_STATE[state]) || GENERAL };
}

const AREA_NOTE = (state: string) => `Typical for ${state}, added automatically from your ZIP code. Your water provider’s days, times and dates may differ. Check them, edit the rule to match, then mark it confirmed.`;

/** The typical restrictions for a state, as unverified rules. */
export function areaRules(state: string): Rule[] {
  return (BY_STATE[state]?.rules ?? []).map((r, i) => ({
    id: `area-${i}-${Math.random().toString(36).slice(2, 8)}`, enabled: true, source: 'area_typical' as const,
    name: r.name, sourceNote: AREA_NOTE(state), sourceUrl: '', kind: r.kind,
  }));
}

/** Keeps the automatic area rules in step with the user's location: when the state changes (or they
 *  were never added), the old automatic rules are swapped for the new area's. Rules the user added or
 *  confirmed are never touched, and deleting an automatic rule sticks until the location changes. */
export function withAreaRules(p: Profile): Profile {
  if (!p.location) return p;
  const state = regionTipsFor(p.location).state ?? '';
  if (p.areaRulesFor === state) return p;
  return { ...p, rules: [...p.rules.filter((r) => r.source !== 'area_typical'), ...(state ? areaRules(state) : [])], areaRulesFor: state };
}
