/** Brand art. All decorative: hidden from assistive tech. */

/** A single water droplet with a soft highlight. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <path d="M32 4C26 14 12 28 12 42a20 20 0 0 0 40 0C52 28 38 14 32 4z" fill="#26436c" />
      <path d="M21 42a11 11 0 0 0 9 11" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display tracking-tight text-forest ${className}`}>WaterWise</span>;
}
