/** Brand art. All decorative: hidden from assistive tech. */

/** A single leaf: one blade with a midrib and a few veins. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="ww-leaf" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1e5631" />
          <stop offset="1" stopColor="#5fae5a" />
        </linearGradient>
      </defs>
      <path d="M10 56C8 30 24 10 56 6c2 30-16 50-46 50z" fill="url(#ww-leaf)" />
      <path d="M12 54C24 40 36 26 52 10" fill="none" stroke="#e8f5e1" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 42l-1-9M30 34l-1-10M38 26l-1-9M26 40l9 1M34 32l9 1M42 23l7 0" fill="none" stroke="#e8f5e1" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display font-semibold tracking-tight text-forest ${className}`}>WaterWise</span>;
}
