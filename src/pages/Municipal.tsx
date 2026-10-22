import { ExternalLink, Flower2, Landmark, MapPin, Mountain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageProps } from '../App';
import { RulesEditor } from '../components/RulesEditor';
import { Badge, Card, IconChip, Notice, PageTitle, Tone } from '../components/ui';
import { useApp } from '../state';

const CO_LAWN = [
  'The air is dry and the high-altitude sun is strong, so water evaporates fast. Early morning is the best time to run sprinklers.',
  'Water deeply and less often rather than a little every day. Deep watering grows deeper roots that handle heat better.',
  'Clay soil is common along the Front Range and soaks water up slowly. If water runs onto the sidewalk, run sprinklers in short rounds with a 30–60 minute pause between them.',
  'Kentucky bluegrass is common here and is one of the thirstiest lawns. Fescue and native grasses like buffalograss and blue grama need much less.',
  'Spring: wait until the grass greens up before turning sprinklers on. Fall: cut back as nights cool, and blow out the lines before hard freezes.',
  'Winter: during long dry, mild spells, lawns and trees can use a drink. Water at midday when it’s above 40°F and the ground isn’t frozen, so it soaks in before night.',
];
const CO_GARDEN = [
  'Spread 2–3 inches of mulch on beds. It keeps soil cooler and cuts evaporation a lot.',
  'Drip lines and soaker hoses put water right at the roots and lose far less than sprinklers.',
  'Water the soil, not the leaves, and do it in the morning. Wet leaves overnight invite disease.',
  'Keep vegetable beds evenly moist. Big swings between dry and soaked stress tomatoes, peppers and squash.',
  'Pots and hanging baskets dry out fast in sun and wind; in midsummer they may need water every day.',
  'Before watering, push a finger 2–3 inches into the soil. If it’s still damp, wait.',
  'Native and drought-tolerant plants settle in after a year or two and then need little extra water.',
];

export function MunicipalPage(_: PageProps) {
  const { profile } = useApp();
  const loc = profile.location!;
  const isColorado = loc.state === 'Colorado' || /colorado/i.test(loc.label);
  const area = [loc.city, loc.county, loc.state].filter(Boolean).join(', ');
  const searchPlace = [loc.city, loc.state].filter(Boolean).join(' ');
  const searchUrl = searchPlace ? `https://www.google.com/search?q=${encodeURIComponent(`${searchPlace} lawn watering restrictions water provider`)}` : null;

  return (
    <div className="space-y-5">
      <PageTitle title="Municipal watering rules" icon={Landmark} />
      <Notice tone="amber">WaterWise can’t verify local laws. Rules you add stay “unverified” until you confirm them with your water provider.</Notice>

      <Card icon={MapPin} tone="sky" title="Your area">
        {area ? <p className="text-sm"><span className="font-bold">{area}</span> <Badge tone="sky">From ZIP lookup</Badge></p>
          : <p className="text-sm text-muted">No city or county is known for a location entered by coordinates.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {searchUrl && <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-4 py-2 text-sm font-bold text-sky hover:bg-sky-soft">
            <ExternalLink size={15} aria-hidden /> Search for local rules<span className="sr-only"> (opens a web search in a new tab)</span></a>}
          <a href="https://www.epa.gov/watersense" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-4 py-2 text-sm font-bold text-sky hover:bg-sky-soft">
            <ExternalLink size={15} aria-hidden /> EPA WaterSense tips<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </Card>

      <RulesEditor />

      {isColorado && (
        <Card icon={Mountain} tone="teal" title="Watering in Colorado">
          <div className="grid gap-4 md:grid-cols-2">
            <TipList icon={Sprout} tone="leaf" title="Lawns" items={CO_LAWN} />
            <TipList icon={Flower2} tone="coral" title="Gardens & flowers" items={CO_GARDEN} />
          </div>
          <p className="mt-4 text-xs text-muted">Colorado has no statewide lawn-watering schedule; each water provider sets its own.</p>
        </Card>
      )}

    </div>
  );
}

function TipList({ icon, tone, title, items }: { icon: LucideIcon; tone: Tone; title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-canvas/60 p-4">
      <div className="mb-2 flex items-center gap-2"><IconChip icon={icon} tone={tone} size="sm" /><h3 className="font-display text-base font-semibold">{title}</h3></div>
      <ul className="space-y-2 text-sm text-ink">
        {items.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-leaf/60" />{t}</li>)}
      </ul>
    </div>
  );
}
