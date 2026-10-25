import {
  ArrowDownToLine, CalendarRange, Carrot, CloudRain, Droplets, Fence, Flower2, Gauge, Hand, Layers, LayoutGrid, Leaf,
  Moon, Mountain, Recycle, Repeat, Scale, Shovel, Snowflake, Sprout, Sun, Sunrise, Timer, TreeDeciduous, Umbrella, Wheat, Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { regionTipsFor } from '../lib/regions';
import type { Tip, TipIcon } from '../lib/regions';
import { useApp } from '../state';
import { Card } from './ui';

/** "Watering in <state>": watering tips for the user's area (from the ZIP lookup), around a round photo.
 *  Places with no known state get the general tips. */
export function WateringTips() {
  const { profile } = useApp();
  if (!profile.location) return null;
  const region = regionTipsFor(profile.location);
  return (
    <Card icon={Mountain} tone="teal" title={region.state ? `Watering in ${region.state}` : 'Watering tips'}>
      <TipsRing lawn={region.tips.lawn} garden={region.tips.garden} />
      <p className="mt-10 text-center text-xs text-muted">{region.tips.note}</p>
    </Card>
  );
}

const TIP_ICONS: Record<TipIcon, LucideIcon> = {
  sunrise: Sunrise, deep: ArrowDownToLine, rounds: Repeat, grass: Wheat, season: CalendarRange, snow: Snowflake, mulch: Layers,
  drip: Droplets, soil: Shovel, veg: Carrot, pot: Flower2, hand: Hand, native: Leaf, wind: Wind, timer: Timer, dormant: Moon,
  seed: Sprout, swap: Recycle, tree: TreeDeciduous, shade: Umbrella, rain: CloudRain, gauge: Gauge, group: LayoutGrid, sun: Sun,
  fence: Fence, law: Scale,
};
type Side = 'left' | 'right';

/** The area's tips around a round photo, like an infographic: every lawn tip on the left edge of the circle,
 *  every garden tip on the right. On narrow screens they stack under the photo (see .ww-tips in index.css). */
function TipsRing({ lawn, garden }: { lawn: Tip[]; garden: Tip[] }) {
  const onRing = (side: Side, tips: Tip[]) => tips.map((t, i, all) => {
    // Height on the circle (-1 top, 1 bottom) and how far out its edge is at that height.
    const n = all.length, s = n === 1 ? 0 : ((i / (n - 1)) * 2 - 1) * (n === 2 ? 0.35 : n === 3 ? 0.7 : 0.9);
    // --p pushes the tips near the top and bottom a little further out, clear of the curve.
    return <TipItem key={t.title} tip={t} side={side} style={{ '--s': s.toFixed(3), '--c': Math.sqrt(1 - s * s).toFixed(3), '--p': (s * s).toFixed(3) } as CSSProperties} />;
  });
  return (
    <div className="ww-tips mx-auto w-full max-w-7xl">
      <div className="ww-tips-ring">
        <div className="ww-tips-photo" aria-hidden />
        <TipSide side="left" title="Lawns">{onRing('left', lawn)}</TipSide>
        <TipSide side="right" title="Gardens & flowers">{onRing('right', garden)}</TipSide>
      </div>
    </div>
  );
}

function TipSide({ side, title, children }: { side: Side; title: string; children: ReactNode }) {
  return (
    <div className="ww-tips-side" data-side={side}>
      {title && <h3 className="ww-tips-head text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</h3>}
      <ul className="ww-tips-list">{children}</ul>
    </div>
  );
}

function TipItem({ tip, side, style }: { tip: Tip; side: Side; style?: CSSProperties }) {
  const Icon = TIP_ICONS[tip.icon];
  return (
    <li className="ww-tip" data-side={side} style={style}>
      <span className="ww-tip-badge" aria-hidden><Icon /></span>
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-forest">{tip.title}</p>
        <p className="mt-1 text-sm text-muted">{tip.text}</p>
      </div>
    </li>
  );
}
