import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/** The menu's own colored symbols, one per page, drawn after pictures the site owner picked. Each fills its
 *  icon box and keeps its own colors (the menu's tone color doesn't apply). Built to stand in for a Lucide icon. */
const symbol = (name: string, body: ReactNode): LucideIcon => {
  const Symbol = forwardRef<SVGSVGElement, LucideProps>(({ size: _size, strokeWidth: _sw, absoluteStrokeWidth: _abs, color: _color, className = '', ...rest }, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" aria-hidden className={`h-full w-full ${className}`} {...rest}>{body}</svg>
  ));
  Symbol.displayName = name;
  return Symbol;
};

/** Calendar: a blue calendar page with two rings and a grid of nine days. */
export const CalendarSymbol = symbol('CalendarSymbol', <g fill="#2e62e6">
  <rect x="2.2" y="3.73" width="19.64" height="5.45" rx="1.31" />
  <rect x="2.2" y="5.7" width="19.64" height="3.48" />
  <path d="M2.71 9.62V20.5Q2.71 21.76 3.97 21.76H20.06Q21.32 21.76 21.32 20.5V9.62" fill="none" stroke="#2e62e6" strokeWidth="1.02" />
  <rect x="5.54" y="1.55" width="1.6" height="5.09" rx="0.8" stroke="#fff" strokeWidth="0.6" />
  <rect x="16.74" y="1.55" width="1.6" height="5.09" rx="0.8" stroke="#fff" strokeWidth="0.6" />
  {[4.81, 10.05, 15.36].flatMap((x) => [11, 14.27, 17.69].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3.78" height="2.62" rx="0.73" />))}
</g>);

/** Usage: a water drop in three layers, dark blue outside to bright blue at the tip. */
export const UsageSymbol = symbol('UsageSymbol', <>
  <path fill="#1b5a92" d="M8.03 6.81C5.26 11.42 5.26 21.58 12.18 21.58C17.26 21.58 19.11 17.88 17.82 13.73C17.54 12.35 17.26 11.42 16.89 10.59C17.45 14.65 16.11 18.44 12.18 18.44C8.49 18.44 7.11 15.12 7.48 12.35C7.66 10.27 7.8 8.42 8.03 6.81Z" />
  <path fill="#2079c7" d="M10.43 4.13C7.8 7.96 7.11 11.88 8.4 14.56C9.32 16.5 10.8 17.05 12.46 17.05C15.23 17.05 16.89 15.12 16.43 12.25C16.25 10.78 15.78 9.67 15.23 8.84C15.97 11.52 14.86 14.56 12.46 14.56C9.88 14.56 8.86 12.44 9.23 10.13C9.51 7.82 9.88 5.88 10.43 4.13Z" />
  <path fill="#0ab3ef" d="M11.82 2.28C10.34 4.87 9.78 7.36 10.34 9.3C10.89 10.96 12.65 11.52 13.85 10.78C15.05 9.85 14.86 7.73 13.85 6.35C13.11 5.24 12.18 3.85 11.82 2.28Z" />
</>);

/** Lawn Health: a tuft of grass, five blades in two greens. */
export const LawnHealthSymbol = symbol('LawnHealthSymbol', <>
  <path fill="#4f8a37" d="M9.88 20.78Q9.14 7.69 13.58 3.25Q12.74 10.16 15.06 20.78Z" />
  <path fill="#62a83a" d="M13.73 20.78Q14.07 10.9 18.67 7.6Q15.7 12.39 17.04 20.78Z" />
  <path fill="#4f8a37" d="M15.06 20.78Q16.54 14.36 23.21 12.73Q18.67 15.1 18.27 20.78Z" />
  <path fill="#4f8a37" d="M5.58 20.78Q5.43 15.84 0.59 12.88Q7.65 14.36 8.25 20.78Z" />
  <path fill="#62a83a" d="M8.15 20.78Q7.41 14.11 1.58 10.16Q11.26 11.4 11.85 20.78Z" />
</>);

/** Rules: an open book in a blue outline, lines of text on both pages. */
export const RulesSymbol = symbol('RulesSymbol', <g fill="none" stroke="#1f569c" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
  <rect x="2.51" y="7.76" width="19" height="11.9" rx="1.57" />
  <path d="M4.89 4.19L11.91 7.76L18.81 4.19V16.53L11.91 19.35L4.89 16.53Z" fill="#fff" />
  <path d="M11.91 9.2V18M6.9 7.6L10.4 9.38M6.9 9.9L10.4 11.68M6.9 12.2L10.4 13.98M6.9 14.5L10.4 16.28M16.92 7.6L13.42 9.38M16.92 9.9L13.42 11.68M16.92 12.2L13.42 13.98M16.92 14.5L13.42 16.28" />
</g>);

/** Your Lawn: two leaves, light green inside a dark green edge, each with a white vein. */
export const YourLawnSymbol = symbol('YourLawnSymbol', <>
  <path fill="#2a6b4f" d="M2.97 4.32C6.95 5.96 12 9.87 10.23 16.06C6 15.43 1.26 12.4 2.97 4.32Z" />
  <path fill="#a8cf6a" d="M3.66 6.21C6.95 7.47 10.86 10.51 9.79 14.67C7.58 13.03 5.05 11.45 4.17 9.12C3.47 7.98 3.28 6.72 3.66 6.21Z" />
  <path fill="#2a6b4f" d="M20.97 5.96C23.68 11.14 22.11 19.35 11.87 20.99C10.74 15.56 14.53 9.24 20.97 5.96Z" />
  <path fill="#a8cf6a" d="M20.59 7.47C22.11 11.77 20.84 18.21 12.95 19.35C15.16 17.33 18.32 14.93 20.08 12.27C20.84 10.51 20.97 8.61 20.59 7.47Z" />
  <path fill="none" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" d="M4.04 9.24Q6 13.03 9.85 14.93M12.25 19.35Q17.05 17.33 19.96 12.15" />
</>);

/** Settings: a dark eight-tooth gear with a round hole. */
export const SettingsSymbol = symbol('SettingsSymbol',
  <path fill="#222" stroke="#222" strokeWidth="1.1" strokeLinejoin="round" fillRule="evenodd"
    d="M9.52 3.98L10.11 0.96L13.89 0.96L14.48 3.98L15.92 4.57L18.47 2.85L21.15 5.53L19.43 8.08L20.02 9.52L23.04 10.11L23.04 13.89L20.02 14.48L19.43 15.92L21.15 18.47L18.47 21.15L15.92 19.43L14.48 20.02L13.89 23.04L10.11 23.04L9.52 20.02L8.08 19.43L5.53 21.15L2.85 18.47L4.57 15.92L3.98 14.48L0.96 13.89L0.96 10.11L3.98 9.52L4.57 8.08L2.85 5.53L5.53 2.85L8.08 4.57ZM12 8.3A3.7 3.7 0 1 0 12 15.7A3.7 3.7 0 1 0 12 8.3Z" />);
