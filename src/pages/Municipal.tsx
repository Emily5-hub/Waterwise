import { ExternalLink, MapPin } from 'lucide-react';
import type { PageProps } from '../App';
import { RulesEditor } from '../components/RulesEditor';
import { Badge, Card, PageTitle } from '../components/ui';
import { useApp } from '../state';

export function MunicipalPage(_: PageProps) {
  const { profile } = useApp();
  const loc = profile.location!;
  const area = [loc.city, loc.county, loc.state].filter(Boolean).join(', ');
  const searchPlace = [loc.city, loc.state].filter(Boolean).join(' ');
  const searchUrl = searchPlace ? `https://www.google.com/search?q=${encodeURIComponent(`${searchPlace} lawn watering restrictions water provider`)}` : null;

  return (
    <div className="ww-page ww-page-short ww-page-municipal">
      <PageTitle title="Rules" phrase="Know your local rules" />

      <Card icon={MapPin} tone="sky" title="Your area" className="ww-area">
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

    </div>
  );
}
