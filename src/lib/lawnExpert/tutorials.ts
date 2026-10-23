/** The lawn helper's tutorial library: common lawn problems, how to recognize them, and a
 *  step-by-step fix for each. Written as general homeowner guidance (not for any one region);
 *  timing tips adapt to the user's grass, month and forecast. */

export interface ExpertContext {
  grass: string;              // e.g. "Kentucky Bluegrass"
  season: 'cool' | 'warm';    // cool- or warm-season grass
  month: number;              // 1–12, local
  state: string | null;       // e.g. "Colorado"
  hotF: number | null;        // highest forecast high over the next few days, °F
  rainDay: string | null;     // e.g. "Thursday" if rain looks likely soon
}

export interface Tutorial {
  id: string;
  title: string;
  /** Multi-word clues (strong) and single-word clues (weak) used to recognize the problem. */
  phrases: string[];
  words: string[];
  what: string;               // what's happening, in plain words
  why: string[];              // likely causes
  need: string[];
  time: string;
  difficulty: 'Easy' | 'Moderate' | 'Involved';
  steps: string[];
  prevent: string[];
  pro: string;                // when to call a professional
  safety?: string;
  photo?: string;             // key into GUIDE_PHOTOS
  timing?: (c: ExpertContext) => string | null;
}

const inMonths = (m: number, months: number[]) => months.includes(m);
const hotWarning = (c: ExpertContext, over = 88) => (c.hotF !== null && c.hotF >= over ? ` Highs near ${Math.round(c.hotF)}°F are coming up, so wait for a cooler stretch.` : '');

/** Best time to seed, by grass type and month. */
export function seedTiming(c: ExpertContext): string {
  if (c.season === 'cool') {
    if (inMonths(c.month, [8, 9])) return `Now is the best time to seed ${c.grass}: warm soil and cooling air.${hotWarning(c, 88)}`;
    if (inMonths(c.month, [4, 5])) return `Spring works for ${c.grass}, but seed sown in late summer to early fall does better. If you seed now, keep it watered through summer.`;
    return `The best window for ${c.grass} is mid-August through September. Until then, keep the area raked and weed-free.`;
  }
  if (inMonths(c.month, [5, 6, 7])) return `Now is a good time: ${c.grass} seeds and sod root best once the soil is warm in late spring and early summer.`;
  return `Wait for late spring to early summer, when the soil is warm. ${c.grass} won’t establish well before then.`;
}

function aerateTiming(c: ExpertContext): string {
  if (c.season === 'cool') return inMonths(c.month, [3, 4, 5, 8, 9, 10])
    ? `This is a good time to aerate ${c.grass}. Early fall is best because you can seed right after.${hotWarning(c, 90)}`
    : `Aerate ${c.grass} in early fall (best) or spring, while it’s growing.`;
  return inMonths(c.month, [5, 6, 7]) ? `Now is a good time to aerate ${c.grass}, while it’s growing fast.` : `Aerate ${c.grass} in late spring or early summer, when it’s actively growing.`;
}

function feedTiming(c: ExpertContext): string {
  const hot = c.hotF !== null && c.hotF >= 90 ? ` Skip it this week: highs near ${Math.round(c.hotF)}°F.` : '';
  return c.season === 'cool'
    ? `Feed ${c.grass} mainly in fall (September and again in late October or November), with a light feeding in late spring if needed.${hot}`
    : `Feed ${c.grass} from late spring through summer, while it’s green and growing.${hot}`;
}

export const TUTORIALS: Tutorial[] = [
  {
    id: 'drought', title: 'Drought stress', photo: 'drought',
    phrases: ['footprints stay', 'turning brown', 'dried out', 'not enough water', 'blue gray', 'blue-gray', 'brown and crunchy', 'straw colored', 'straw-colored'],
    words: ['dry', 'drought', 'crispy', 'crunchy', 'straw', 'thirsty', 'wilting', 'wilt', 'curled', 'curling', 'heat', 'hot', 'brown', 'dormant', 'tan', 'dying', 'dead'],
    what: 'The grass isn’t getting enough water at the roots, so it’s shutting down to survive. Grass often turns blue-gray and holds footprints first, then goes tan.',
    why: ['Not enough water reaching the roots', 'Sprinklers missing some areas', 'Hard or clay soil shedding water', 'Shallow roots from frequent light watering'],
    need: ['A screwdriver (to check soil moisture)', 'A few empty tuna cans or rain gauges', 'Your sprinkler controller'],
    time: '30 minutes to check, then a few weeks to recover', difficulty: 'Easy',
    steps: [
      'Push a screwdriver into the soil in a brown area and a green area. If it’s hard to push in the brown area, the soil there is dry.',
      'Water deeply once: run long enough to wet the top 4–6 inches. If water runs off, split it into 2–3 shorter rounds with a 30–60 minute soak in between.',
      'Set out 4–6 cans across the lawn and run the sprinklers for 15 minutes. If some cans get much less, those spots are being missed; clean or adjust those heads.',
      'From now on, water deeply and less often: wait until the lawn needs it (WaterWise’s Calendar tells you), rather than a little every day.',
      'Raise your mower a notch. Taller grass shades its roots and loses less water.',
      'Give it 2–3 weeks. Dormant grass usually greens back up; areas that stay brown and pull up easily may need reseeding.',
    ],
    prevent: ['Water deeply and infrequently so roots grow deep.', 'Aerate compacted soil once a year.', 'Mow high in summer.'],
    pro: 'Call a sprinkler technician if heads, valves or the controller seem broken, or if large areas stay dry after deep watering.',
    timing: (c) => c.rainDay ? `Rain looks likely on ${c.rainDay}, so you may be able to skip a watering. Check the Calendar first.` : null,
  },
  {
    id: 'overwater', title: 'Overwatering', photo: 'overwater',
    phrases: ['feels spongy', 'stays wet', 'water running', 'runs off', 'standing water', 'always wet', 'squishy'],
    words: ['soggy', 'mushroom', 'mushrooms', 'puddle', 'puddles', 'spongy', 'wet', 'overwater', 'overwatering', 'runoff', 'algae', 'swampy', 'mud', 'muddy'],
    what: 'The soil is staying wet for too long. Roots need air as well as water; when soil stays soggy they rot, grass yellows, and mushrooms or algae move in.',
    why: ['Watering too often', 'Long runs that the soil can’t soak up', 'Poor drainage or heavy clay', 'A leaking valve or a head that won’t shut off'],
    need: ['A screwdriver', 'Your sprinkler controller', 'A core aerator (rent one, or hire it out) if the soil is compacted'],
    time: '1 hour, then a few weeks to dry out and recover', difficulty: 'Easy',
    steps: [
      'Turn off automatic watering for a few days and let the lawn dry out. Rain counts as watering.',
      'Walk the system with it running. Look for heads that stay on, leak, or puddle, and for wet spots when it’s off (a leaking valve).',
      'Cut back how often you water. Wait until the lawn needs it rather than running on a fixed daily timer.',
      'If water runs off, split each run into shorter rounds with a 30–60 minute soak in between.',
      'Rake or pick off mushrooms; they’re harmless but show the soil is too wet.',
      'If the soil stays soggy, core-aerate to help water drain.',
    ],
    prevent: ['Water only when the lawn needs it.', 'Use a rain sensor or check the forecast.', 'Aerate heavy soils yearly.'],
    pro: 'Call an irrigation pro for a leaking valve or broken pipe, or a landscaper if water collects because of grading or drainage.',
  },
  {
    id: 'fungus', title: 'Brown patch (fungus)', photo: 'fungus',
    phrases: ['brown circles', 'brown rings', 'circular patches', 'smoke ring', 'dark ring', 'cobweb', 'spreading patches', 'brown patches spreading'],
    words: ['ring', 'rings', 'circle', 'circles', 'circular', 'fungus', 'fungal', 'lesion', 'lesions', 'humid', 'spreading', 'patch', 'patches', 'dying'],
    what: 'A fungus is killing the grass in roughly circular patches, often with a darker “smoke ring” edge in the morning. It thrives when grass stays wet on warm, humid nights.',
    why: ['Grass staying wet overnight', 'Watering in the evening', 'Too much nitrogen in hot weather', 'Thick thatch and poor airflow'],
    need: ['Your sprinkler controller', 'A bagging mower or rake'],
    time: '30 minutes, then 2–4 weeks to grow out', difficulty: 'Easy',
    steps: [
      'Move watering to the early morning (before about 8 AM) so blades dry during the day. Never water in the evening while it’s active.',
      'Water only when the lawn needs it; extra water feeds the fungus.',
      'Hold off on fertilizer until the weather cools.',
      'Bag clippings when you mow the affected areas, and rinse the mower afterwards so you don’t spread it.',
      'Watch the edges for a week. If the patches stop growing, the grass will usually fill back in as it cools.',
      'If it keeps spreading, take a sample to your local extension office or garden center to confirm it before using a fungicide.',
    ],
    prevent: ['Water in the early morning only.', 'Avoid heavy nitrogen in summer.', 'Dethatch and aerate to improve airflow.'],
    pro: 'Call a lawn-care pro or your extension office if it keeps spreading after two weeks of morning-only watering.',
    safety: 'If you use a fungicide, follow the label exactly and keep kids and pets off until it’s dry.',
    timing: (c) => c.hotF !== null && c.hotF >= 85 ? `It’s set to be hot (highs near ${Math.round(c.hotF)}°F), which is when brown patch spreads fastest, so be strict about morning-only watering this week.` : null,
  },
  {
    id: 'dollar_spot', title: 'Dollar spot (fungus)', photo: 'fungus',
    phrases: ['small spots', 'coin sized', 'coin-sized', 'silver dollar', 'size of a coin', 'little spots', 'tiny spots'],
    words: ['dollar', 'coin', 'speckled', 'spots', 'specks', 'bleached', 'hourglass'],
    what: 'Dollar spot is a common fungus that makes small, bleached, coin-sized spots that can merge into bigger patches. Blades often have tan bands with reddish-brown edges. It’s usually a sign the lawn is hungry or dry.',
    why: ['Low nitrogen', 'Dry soil with dew sitting on the blades', 'Warm days and cool, damp nights'],
    need: ['A lawn fertilizer suited to your grass (light feeding)', 'Your sprinkler controller'],
    time: '30 minutes, then 2–3 weeks', difficulty: 'Easy',
    steps: [
      'Water deeply in the early morning so the soil isn’t dry but the blades dry quickly.',
      'Give the lawn a light feeding of nitrogen if it hasn’t been fed in a while (follow the label rate).',
      'Mow regularly at the right height and bag clippings from spotted areas for a couple of weeks.',
      'Knock dew off in the morning if you can (drag a hose across the lawn).',
      'Watch for 2 weeks. Spots usually stop spreading once the lawn is fed and watered properly.',
    ],
    prevent: ['Feed at the right times of year.', 'Water deeply in the morning, not lightly at night.'],
    pro: 'Ask your extension office or a lawn-care pro if it keeps spreading after feeding and correcting watering.',
    safety: 'Follow fertilizer label rates and sweep any granules off pavement so they don’t wash into drains.',
    timing: feedTiming,
  },
  {
    id: 'grubs', title: 'Grubs eating the roots', photo: 'grubs',
    phrases: ['peels back', 'peels up', 'pulls up like carpet', 'like a carpet', 'rolls up', 'lifts up', 'birds pecking', 'animals digging', 'skunks digging', 'white worms'],
    words: ['grub', 'grubs', 'peel', 'peels', 'carpet', 'skunk', 'skunks', 'raccoon', 'raccoons', 'digging', 'larvae', 'beetle', 'beetles', 'worms', 'dying', 'dead'],
    what: 'Grubs (beetle larvae) are eating the roots, so the grass dies in patches and peels back like carpet. Birds, skunks and raccoons dig the lawn up to eat them.',
    why: ['Beetle larvae feeding on roots, mostly in late summer and fall'],
    need: ['A flat shovel or spade', 'A tape measure', 'Grass seed for repairs'],
    time: '20 minutes to check; treatment depends on what you find', difficulty: 'Moderate',
    steps: [
      'Do the tug test: at the edge of a dead area, cut three sides of a 1-foot square about 2 inches deep and fold the sod back.',
      'Count the C-shaped white grubs. Fewer than about 5–10 per square foot usually doesn’t need treatment.',
      'If there are more, ask a garden center or your extension office which product and timing fits your area. Late summer, while grubs are small, is usually best.',
      'Press the test square back down and water it.',
      'Keep the rest of the lawn well watered so the remaining roots can recover.',
      'Rake out dead patches and reseed them once the grubs are under control.',
    ],
    prevent: ['Keep the lawn healthy and thick; it can tolerate a few grubs.', 'Check a test square every late summer.'],
    pro: 'Call a lawn-care pro if large areas are dead or animals are tearing up the lawn.',
    safety: 'Grub products can harm pollinators and pets. Follow the label, water it in as directed, and don’t apply to blooming weeds.',
    timing: (c) => inMonths(c.month, [7, 8, 9]) ? 'Now (late summer) is when grubs are small and feeding near the surface, so it’s the best time to check and treat.' : 'Grubs feed most in late summer and fall; that’s the best time to check and treat.',
  },
  {
    id: 'chinch', title: 'Chinch bugs',
    phrases: ['yellow then brown', 'near the sidewalk', 'near the driveway', 'tiny black bugs', 'small black bugs', 'black and white bugs'],
    words: ['chinch', 'bugs', 'insects', 'sunny', 'augustine'],
    what: 'Chinch bugs are tiny insects that suck sap from the grass. Damage shows up as yellowing, then brown, irregular patches in hot, sunny spots, often near pavement. Unlike grubs, the grass stays rooted.',
    why: ['Hot, dry weather', 'Thick thatch where they hide', 'Lawns under drought stress'],
    need: ['A coffee can or large tin with both ends cut off', 'A bucket of water', 'A flashlight or magnifying glass'],
    time: '20 minutes to check', difficulty: 'Moderate',
    steps: [
      'At the edge of a yellowing patch, part the grass and look at the soil line for tiny black bugs with white wings, or red young ones.',
      'Or push a can with both ends removed 2–3 inches into the soil there and fill it with water. Chinch bugs float up within 10 minutes.',
      'If you find more than about 15–20 per square foot, ask a garden center or extension office for a suitable product.',
      'Water the lawn deeply; well-watered grass resists them better.',
      'Reseed or patch dead areas once they’re under control.',
    ],
    prevent: ['Water deeply during heat.', 'Dethatch if thatch is over ½ inch.', 'Avoid heavy summer fertilizing.'],
    pro: 'Call a lawn-care pro if damage spreads quickly in hot weather.',
    safety: 'Follow insecticide labels exactly and keep kids and pets off treated areas until dry.',
    timing: (c) => c.season === 'warm' ? `${c.grass} lawns are a favorite target, especially in hot, dry spells.` : null,
  },
  {
    id: 'dog', title: 'Dog spots',
    phrases: ['where my dog', 'dog pees', 'dog urine', 'where the dog goes', 'green ring', 'dark green ring'],
    words: ['dog', 'dogs', 'pet', 'pets', 'urine', 'pee', 'peeing', 'puppy'],
    what: 'Concentrated nitrogen and salts in dog urine burn the grass, leaving a dead center often ringed with extra-green grass where the urine was diluted.',
    why: ['Concentrated urine in one spot'],
    need: ['A hose', 'A rake', 'Grass seed or a lawn patch mix', 'A little topsoil or compost'],
    time: '30 minutes, then 2–4 weeks to fill in', difficulty: 'Easy',
    steps: [
      'Soak each spot with plenty of water to flush the salts out of the soil.',
      'Rake out the dead grass, loosen the top inch of soil, and mix in a little compost.',
      'Spread seed or a patch mix, press it in, and cover lightly.',
      'Keep it lightly moist (short, daily watering) until the new grass is about 2 inches tall.',
      'Going forward, rinse fresh spots with water soon after your dog uses them.',
    ],
    prevent: ['Train your dog to use one area, such as mulch or gravel.', 'Rinse fresh spots right away.', 'Keep your dog well hydrated.'],
    pro: 'Not usually needed. Ask a vet before trying supplements that claim to stop spots.',
    timing: seedTiming,
  },
  {
    id: 'scalp', title: 'Mowing too short (scalping)',
    phrases: ['after mowing', 'after i mowed', 'after i mow', 'cut too short', 'mowed too short', 'brown after mowing', 'white tips', 'ragged tips', 'torn tips'],
    words: ['mow', 'mowed', 'mowing', 'mower', 'scalp', 'scalped', 'short', 'blade', 'ragged', 'shredded', 'stripes'],
    what: 'Cutting too short, or with a dull blade, stresses the grass. Scalped areas turn brown, and torn tips look ragged and white or brown.',
    why: ['Mower set too low', 'Cutting more than a third of the blade at once', 'A dull mower blade tearing the grass', 'Bumps where the mower dips'],
    need: ['Your mower and its height settings', 'A blade sharpener or a shop to sharpen it'],
    time: '30 minutes, then 2–3 weeks to recover', difficulty: 'Easy',
    steps: [
      'Raise the mower. Most cool-season lawns do best at 2.5–3.5 inches; warm-season grass a bit lower.',
      'Follow the one-third rule: never cut more than a third of the blade height at once. Mow more often in spring.',
      'Check the blade. If grass tips look torn, sharpen or replace it (at least once a season).',
      'Water the scalped areas normally and let them grow back; don’t fertilize them heavily.',
      'Level bumps with topsoil so the mower stops scalping them.',
    ],
    prevent: ['Mow high and often.', 'Sharpen the blade every season.', 'Leave clippings to feed the lawn.'],
    pro: 'Not usually needed; a mower shop can sharpen blades cheaply.',
    timing: (c) => `For ${c.grass}, keep the mower at ${c.season === 'cool' ? '2.5–3.5 inches (the higher end in summer)' : '1–2 inches for Bermuda, or 2.5–4 inches for St. Augustine'}.`,
  },
  {
    id: 'weeds', title: 'Broadleaf weeds (dandelions, clover)', photo: 'weeds',
    phrases: ['full of weeds', 'taking over', 'yellow flowers'],
    words: ['weed', 'weeds', 'dandelion', 'dandelions', 'clover', 'plantain', 'thistle', 'creeping', 'charlie', 'broadleaf'],
    what: 'Broadleaf weeds move in where the grass is thin. The long-term fix is a thicker lawn; spot-treating clears what’s there now.',
    why: ['Thin grass leaving room for weeds', 'Mowing too short', 'Compacted soil', 'Low fertility'],
    need: ['A weeding tool (for dandelions, one that gets the taproot)', 'A spot-spray weed killer for broadleaf weeds (optional)', 'Grass seed'],
    time: '1–2 hours, plus follow-up', difficulty: 'Moderate',
    steps: [
      'Pull weeds by hand when the soil is moist, getting as much root as possible.',
      'For larger infestations, spot-treat with a broadleaf weed killer that’s labeled safe for your grass type.',
      'Raise the mower so taller grass shades out new weed seedlings.',
      'Overseed thin areas so grass fills the gaps.',
      'Feed the lawn at the right time of year so it stays thick.',
    ],
    prevent: ['Keep the lawn thick and mow high.', 'Overseed thin areas every year or two.'],
    pro: 'Call a lawn-care service if weeds cover most of the lawn; renovating may be faster.',
    safety: 'Follow weed-killer labels exactly, don’t spray on windy or hot days, and keep kids and pets off until dry.',
    timing: (c) => c.season === 'cool' ? 'Fall is the best time to treat perennial weeds like dandelions; they pull the weed killer down to their roots.' : 'Treat while weeds are young and actively growing, and avoid spraying in the heat of summer.',
  },
  {
    id: 'crabgrass', title: 'Crabgrass',
    phrases: ['coarse grass', 'grassy weed', 'spreads flat', 'grows flat', 'light green clumps', 'wide blades'],
    words: ['crabgrass', 'crab', 'clumps', 'clumpy', 'coarse', 'weed', 'weeds'],
    what: 'Crabgrass is a summer annual grass with wide, light-green blades that spreads flat in clumps. It sprouts in spring from last year’s seed and dies with the first frost.',
    why: ['Thin turf and bare soil', 'Mowing too short', 'Light, frequent watering'],
    need: ['A weeding tool', 'A pre-emergent crabgrass preventer (for next spring)', 'Grass seed for fall'],
    time: '1 hour now, plus a spring application', difficulty: 'Moderate',
    steps: [
      'Pull young clumps by hand before they set seed.',
      'Mow high; tall grass shades the soil and stops seed from sprouting.',
      'Water deeply and less often; crabgrass loves light, daily watering.',
      'In early spring (when soil reaches about 55°F, around when forsythia blooms), apply a pre-emergent preventer.',
      'Overseed bare spots in fall so there’s no room for it next year. Don’t seed and use a pre-emergent at the same time.',
    ],
    prevent: ['Keep the lawn thick.', 'Mow high.', 'Use a pre-emergent each spring if it’s a recurring problem.'],
    pro: 'A lawn-care service can time the spring preventer for you.',
    safety: 'Follow the label; most pre-emergents also stop grass seed from sprouting.',
    timing: (c) => inMonths(c.month, [2, 3, 4]) ? 'Now is the time for a pre-emergent, before the soil warms past 55°F.' : inMonths(c.month, [6, 7, 8]) ? 'It’s already up, so pull it now and plan a pre-emergent for early next spring.' : 'Plan a pre-emergent for early spring.',
  },
  {
    id: 'bare', title: 'Thin or bare spots',
    phrases: ['bare spots', 'bare patches', 'thin spots', 'thin areas', 'dirt showing', 'won’t grow', "won't grow", 'not growing'],
    words: ['bare', 'thin', 'thinning', 'sparse', 'patchy', 'reseed', 'overseed', 'seed', 'dirt'],
    what: 'Thin or bare areas need new grass. The trick is good seed-to-soil contact and keeping the seed moist until it’s established.',
    why: ['Old damage (drought, grubs, dogs, foot traffic)', 'Compacted soil', 'Too much shade', 'Wrong grass for the site'],
    need: ['A rake', 'Grass seed that matches your lawn', 'Compost or topsoil', 'A spreader (for larger areas)'],
    time: '1–2 hours, then 3–6 weeks of watering', difficulty: 'Moderate',
    steps: [
      'Rake out dead grass and loosen the top ½–1 inch of soil. For big areas, core-aerate first.',
      'Spread a thin layer (about ¼ inch) of compost or topsoil.',
      'Spread seed at the rate on the bag, half in one direction and half crosswise.',
      'Rake lightly so seed is barely covered, then press it down by walking on it.',
      'Keep the top inch moist: water lightly 1–3 times a day until it sprouts, then gradually water less often and more deeply.',
      'Mow for the first time when the new grass is about a third taller than your usual mowing height.',
    ],
    prevent: ['Fix the cause first (shade, traffic, compaction).', 'Overseed thin areas every year or two.'],
    pro: 'For large areas, a landscaper can slit-seed or lay sod.',
    timing: seedTiming,
  },
  {
    id: 'shade', title: 'Thin grass in shade',
    phrases: ['under the tree', 'under trees', 'under my tree', 'north side', 'in the shade', 'shady area'],
    words: ['shade', 'shady', 'tree', 'trees', 'dark', 'canopy'],
    what: 'Most lawn grasses need 4–6 hours of direct sun. In heavy shade they grow thin, and tree roots compete for water.',
    why: ['Too little sun for your grass type', 'Tree roots taking water and nutrients', 'Mowing too short in shade'],
    need: ['Shade-tolerant grass seed (such as fine fescue for cool climates)', 'A rake', 'Pruning tools or an arborist'],
    time: '1–2 hours', difficulty: 'Moderate',
    steps: [
      'Check how many hours of direct sun the area gets. Under about 4 hours, most grasses will struggle.',
      'Raise the mowing height in shade by about ½ inch.',
      'Overseed with a shade-tolerant grass suited to your region.',
      'Water a little more deeply there to make up for tree roots, but don’t keep it soggy.',
      'Consider having lower tree branches thinned to let in more light.',
      'Where grass just won’t grow, switch to mulch or shade-loving ground cover.',
    ],
    prevent: ['Use the right grass for the light.', 'Keep traffic off shady areas.'],
    pro: 'Hire a certified arborist to thin tree canopies safely.',
    timing: seedTiming,
  },
  {
    id: 'nutrient', title: 'Pale or yellow-green lawn',
    phrases: ['pale green', 'light green', 'yellow green', 'yellow-green', 'whole lawn is yellow', 'lost its color', 'not green'],
    words: ['pale', 'yellowish', 'yellow', 'faded', 'fertilizer', 'fertilize', 'feed', 'nitrogen', 'iron', 'chlorosis'],
    what: 'An evenly pale or yellow-green lawn that grows slowly is usually hungry: low on nitrogen, or (in alkaline Western soils) unable to take up iron.',
    why: ['Low nitrogen', 'Iron deficiency in high-pH soils', 'Overwatering washing nutrients away', 'Compacted soil limiting roots'],
    need: ['A soil test kit (or your extension office’s test)', 'A fertilizer suited to your grass', 'A spreader'],
    time: '1 hour, then 1–2 weeks to green up', difficulty: 'Easy',
    steps: [
      'Get a soil test. It tells you what’s actually missing and your soil’s pH.',
      'If nitrogen is low, apply a lawn fertilizer at the label rate with a spreader.',
      'If the test shows high pH and the grass has yellow blades with green veins, use an iron supplement.',
      'Water it in lightly after feeding (unless the label says otherwise).',
      'Make sure you’re not overwatering, which washes nutrients past the roots.',
    ],
    prevent: ['Feed at the right times of year.', 'Leave clippings on the lawn; they return nitrogen.'],
    pro: 'Your local extension office can test soil cheaply and explain the results.',
    safety: 'Follow label rates, sweep granules off pavement, and don’t fertilize before heavy rain.',
    timing: feedTiming,
  },
  {
    id: 'compaction', title: 'Compacted soil',
    phrases: ['hard soil', 'hard ground', 'ground is hard', 'like concrete', 'water runs off', 'won’t soak in', "won't soak in", 'high traffic', 'kids play'],
    words: ['compacted', 'compaction', 'hard', 'clay', 'aerate', 'aeration', 'path', 'traffic'],
    what: 'Compacted soil is packed so tight that water, air and roots can’t get in. Water runs off, grass thins, and weeds like it.',
    why: ['Foot traffic, play areas, or parked vehicles', 'Heavy clay soil', 'Construction'],
    need: ['A screwdriver', 'A core aerator (rent one or hire a service)', 'Compost (optional)', 'Grass seed'],
    time: 'Half a day', difficulty: 'Involved',
    steps: [
      'Test it: push a screwdriver into moist soil. If you can’t get it 4–6 inches deep, the soil is compacted.',
      'Mark sprinkler heads and buried lines with flags so the aerator misses them.',
      'Water the lawn deeply a day before so the soil is moist but not muddy.',
      'Run a core aerator over the lawn, making two passes in different directions in the worst areas.',
      'Leave the soil cores on the lawn; they break down within a couple of weeks.',
      'Top-dress with a thin layer of compost and overseed thin spots right after.',
    ],
    prevent: ['Aerate once a year on heavy or high-traffic soils.', 'Use stepping stones on regular paths.'],
    pro: 'Many lawn services aerate for a modest fee, which saves renting and hauling the machine.',
    timing: aerateTiming,
  },
  {
    id: 'thatch', title: 'Too much thatch',
    phrases: ['spongy layer', 'thick layer', 'brown layer', 'dead layer', 'bouncy'],
    words: ['thatch', 'thatchy', 'dethatch', 'dethatching', 'spongy', 'bouncy', 'matted'],
    what: 'Thatch is a layer of dead stems and roots between the grass and the soil. A little is fine, but over ½ inch blocks water and breeds pests and disease.',
    why: ['Fast-growing grass', 'Too much nitrogen', 'Frequent light watering', 'Compacted soil slowing breakdown'],
    need: ['A trowel or knife', 'A ruler', 'A dethatching rake or power rake (rental)'],
    time: 'Half a day', difficulty: 'Involved',
    steps: [
      'Cut a small wedge of turf and measure the spongy brown layer above the soil.',
      'Under ½ inch: no action needed. Over ½ inch: plan to dethatch or core-aerate.',
      'Mow a little lower than usual right before dethatching.',
      'Rake hard with a dethatching rake, or use a power rake for larger lawns. Go in one direction, then crosswise if needed.',
      'Rake up and compost the loosened thatch.',
      'Water and overseed any thin spots afterwards.',
    ],
    prevent: ['Water deeply and less often.', 'Don’t over-fertilize.', 'Core-aerate yearly.'],
    pro: 'A lawn service can power-rake or aerate for you.',
    timing: aerateTiming,
  },
  {
    id: 'moss', title: 'Moss in the lawn',
    phrases: ['green fuzz', 'soft green', 'velvety'],
    words: ['moss', 'mossy', 'fuzzy', 'velvet', 'weeds'],
    what: 'Moss grows where grass struggles: shade, damp soil, compaction, or low fertility. Killing moss alone won’t help unless you fix why grass is weak there.',
    why: ['Shade', 'Poor drainage or overwatering', 'Compacted or acidic soil', 'Low fertility'],
    need: ['A rake', 'A soil test kit', 'Grass seed'],
    time: '1–2 hours', difficulty: 'Moderate',
    steps: [
      'Rake the moss out firmly; it lifts easily.',
      'Test the soil pH. If it’s acidic (below about 6), add lime as the test recommends.',
      'Fix the cause: water less, improve drainage, aerate, or let in more light.',
      'Overseed with grass suited to the light.',
      'If the area stays very shady and damp, consider letting moss be a ground cover.',
    ],
    prevent: ['Avoid overwatering.', 'Aerate.', 'Keep the lawn fed and thick.'],
    pro: 'A landscaper can help with drainage problems.',
    timing: seedTiming,
  },
  {
    id: 'mole', title: 'Moles (raised tunnels)',
    phrases: ['raised ridges', 'raised tunnels', 'dirt mounds', 'mounds of dirt', 'volcano', 'tunnels under'],
    words: ['mole', 'moles', 'tunnel', 'tunnels', 'mound', 'mounds', 'ridges', 'molehill'],
    what: 'Moles tunnel just under the surface hunting earthworms and grubs, leaving raised ridges and volcano-shaped mounds of dirt. They don’t eat grass but the tunnels dry out roots.',
    why: ['Plenty of earthworms or grubs in the soil', 'Moist, loose soil'],
    need: ['Your feet or a lawn roller', 'Mole traps (optional)'],
    time: '30 minutes, plus ongoing', difficulty: 'Moderate',
    steps: [
      'Press raised ridges back down with your feet or a roller, and water them so the roots reconnect.',
      'Rake mounds flat and reseed bare soil.',
      'Find active tunnels: step down a few ridges, and the ones raised again in a day or two are active.',
      'Traps set in active tunnels are the most reliable control. Check local rules, since some states restrict trapping.',
      'Repellents and grub control alone rarely solve mole problems.',
    ],
    prevent: ['There’s no foolproof prevention; consistent trapping in spring and fall works best.'],
    pro: 'A wildlife control pro can trap moles if you don’t want to.',
    timing: (c) => c.state ? `Check ${c.state}’s wildlife rules before trapping.` : null,
  },
  {
    id: 'vole', title: 'Voles (surface runways)',
    phrases: ['paths in the grass', 'trails in the grass', 'runways', 'after the snow melted', 'snow melted', 'chewed grass'],
    words: ['vole', 'voles', 'runway', 'runways', 'trails', 'mice', 'mouse', 'chewed'],
    what: 'Voles are small rodents that make winding surface runways, about 2 inches wide, through the grass, usually found when snow melts. The grass usually recovers.',
    why: ['Snow cover protecting them over winter', 'Tall grass or dense ground cover nearby'],
    need: ['A rake', 'Grass seed (if needed)'],
    time: '30 minutes', difficulty: 'Easy',
    steps: [
      'Rake out the runways to loosen matted, dead grass.',
      'Water and feed lightly as the lawn starts growing; most runways fill in on their own.',
      'Reseed any that stay bare after a few weeks.',
      'Mow the last cut of fall a little shorter and keep grass and mulch trimmed back from beds to remove cover.',
    ],
    prevent: ['Keep grass short going into winter.', 'Clear tall grass and dense cover near the lawn.'],
    pro: 'Call wildlife control if voles are damaging trees or shrubs.',
    timing: seedTiming,
  },
  {
    id: 'salt', title: 'Salt damage near pavement',
    phrases: ['along the driveway', 'along the sidewalk', 'next to the road', 'along the street', 'next to the street', 'de-icer', 'deicer', 'road salt'],
    words: ['salt', 'salted', 'deicing', 'curb', 'roadside', 'driveway', 'sidewalk'],
    what: 'De-icing salt pulls water out of the roots, killing grass in strips along driveways, sidewalks and streets, showing up in spring.',
    why: ['Salt from de-icers or snowplows'],
    need: ['A hose', 'Gypsum (optional)', 'A salt-tolerant grass seed', 'Compost or topsoil'],
    time: '1 hour', difficulty: 'Easy',
    steps: [
      'As soon as the ground thaws, soak the strips deeply a few times to flush salt below the roots.',
      'Rake out dead grass.',
      'Optionally spread gypsum on the strips; it can help on clay soils.',
      'Top-dress with a little compost and reseed with a salt-tolerant grass.',
      'Keep the seed moist until established.',
    ],
    prevent: ['Use less de-icer or a gentler one.', 'Shovel snow onto the lawn rather than salty snow from the street.'],
    pro: 'Rarely needed.',
    timing: seedTiming,
  },
  {
    id: 'coverage', title: 'Uneven sprinkler coverage',
    phrases: ['some spots green', 'stripes of brown', 'brown stripes', 'between the sprinklers', 'between sprinkler heads', 'edge of the lawn', 'corners are brown', 'sprinkler misses'],
    words: ['sprinkler', 'sprinklers', 'heads', 'coverage', 'misses', 'missing', 'uneven', 'stripes', 'corners'],
    what: 'Brown areas in a pattern (between heads, at corners or edges) usually mean the sprinklers aren’t covering evenly, not that the whole lawn needs more water.',
    why: ['Clogged, tilted or sunken heads', 'Heads blocked by grass or plants', 'Wrong nozzles or low water pressure', 'Broken heads'],
    need: ['6–8 empty tuna cans or rain gauges', 'A ruler', 'A small flat screwdriver', 'Replacement nozzles (if needed)'],
    time: '1 hour', difficulty: 'Moderate',
    steps: [
      'Spread cans across the zone: near heads, between heads, and in the brown areas.',
      'Run that zone for 15 minutes and measure the water in each can.',
      'Look for big differences. Cans in brown areas with much less water show where coverage is weak.',
      'Clean clogged nozzles, straighten tilted heads, raise sunken ones, and trim grass around heads.',
      'Adjust spray arcs and distance so each head reaches the next one (“head-to-head” coverage).',
      'Run the test again to check, and avoid just running the whole system longer, which overwaters the rest.',
    ],
    prevent: ['Do a can test each spring.', 'Walk the system monthly while it runs.'],
    pro: 'An irrigation technician can fix pressure problems or redesign zones.',
  },
  {
    id: 'snow_mold', title: 'Snow mold',
    phrases: ['after the snow', 'snow melted', 'matted grass', 'pink patches', 'gray patches', 'grey patches', 'crusty patches'],
    words: ['snow', 'mold', 'matted', 'pink', 'crusty', 'thaw', 'melted'],
    what: 'Snow mold is a fungus that grows under long-lasting snow. When it melts you see matted, straw-colored circles with gray or pinkish fuzz. It’s rarely fatal.',
    why: ['Long snow cover on unfrozen ground', 'Tall grass or leaves left going into winter', 'Late-fall heavy nitrogen'],
    need: ['A leaf rake'],
    time: '30 minutes', difficulty: 'Easy',
    steps: [
      'Once the area dries, gently rake the matted grass to fluff it up and let air in.',
      'Let the lawn start growing; most areas recover on their own within a few weeks.',
      'Reseed any spots that stay dead after the lawn greens up.',
      'Don’t use fungicides now. They don’t help in spring.',
    ],
    prevent: ['Keep mowing until the grass stops growing in fall.', 'Rake leaves before snow.', 'Avoid piling snow on the lawn.'],
    pro: 'Rarely needed.',
    timing: (c) => inMonths(c.month, [3, 4, 5]) ? 'This is the right time to rake it out, once the ground has dried a little.' : null,
  },
];

export const tutorialById = (id: string) => TUTORIALS.find((t) => t.id === id);
