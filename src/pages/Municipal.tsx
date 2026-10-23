import { ExternalLink, Flower2, MapPin, Mountain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageProps } from '../App';
import { RulesEditor } from '../components/RulesEditor';
import { Badge, Card, IconChip, PageTitle, Tone } from '../components/ui';
import { regionTipsFor } from '../lib/regions';
import { useApp } from '../state';

export function MunicipalPage(_: PageProps) {
  const { profile } = useApp();
  const loc = profile.location!;
  const region = regionTipsFor(loc);
  const area = [loc.city, loc.county, loc.state].filter(Boolean).join(', ');
  const searchPlace = [loc.city, loc.state].filter(Boolean).join(' ');
  const searchUrl = searchPlace ? `https://www.google.com/search?q=${encodeURIComponent(`${searchPlace} lawn watering restrictions water provider`)}` : null;

  return (
    <div className="ww-page ww-page-short ww-page-municipal">
      <PageTitle title="Municipal watering rules" phrase="Know your local rules" />

      <Card icon={MapPin} tone="sky" title="Your area">
        {area ? <p className="text-center text-sm"><span className="font-bold">{area}</span> <Badge tone="sky">From ZIP lookup</Badge></p>
          : <p className="text-center text-sm text-muted">No city or county is known for a location entered by coordinates.</p>}
        <div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {searchUrl && <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border-b border-current/50 pb-0.5 text-sm font-semibold uppercase tracking-[0.12em] text-sky hover:border-current">
            <ExternalLink size={15} aria-hidden /> Search for local rules<span className="sr-only"> (opens a web search in a new tab)</span></a>}
          <a href="https://www.epa.gov/watersense" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border-b border-current/50 pb-0.5 text-sm font-semibold uppercase tracking-[0.12em] text-sky hover:border-current">
            <ExternalLink size={15} aria-hidden /> EPA WaterSense tips<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </Card>

      <RulesEditor />

      <Card icon={Mountain} tone="teal" title={region.state ? `Watering in ${region.state}` : 'Watering tips'}>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <TipList icon={Sprout} tone="leaf" title="Lawns" items={region.tips.lawn} />
          <TipList icon={Flower2} tone="coral" title="Gardens & flowers" items={region.tips.garden} />
        </div>
        <p className="mt-10 text-xs text-muted">{region.tips.note}</p>
      </Card>

    </div>
  );
}

function TipList({ icon, tone, title, items }: { icon: LucideIcon; tone: Tone; title: string; items: string[] }) {
  return (
    <div className="border-t border-ink/25 pt-6">
      <div className="mb-4 flex items-center gap-2"><IconChip icon={icon} tone={tone} size="sm" /><h3 className="font-display text-2xl uppercase">{title}</h3></div>
      <ul className="space-y-4 text-sm text-ink">
        {items.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-leaf/60" />{t}</li>)}
      </ul>
    </div>
  );
}
