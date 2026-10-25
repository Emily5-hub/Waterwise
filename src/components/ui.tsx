import type { LucideIcon } from 'lucide-react';
import { Image as ImageIcon, X } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export type Tone = 'leaf' | 'lime' | 'sky' | 'teal' | 'violet' | 'sun' | 'coral' | 'clay' | 'slate' | 'amber' | 'alert' | 'neutral';
/** Just the strong color of each tone, for text set straight onto a band (no box behind it). */
export const toneText: Record<Tone, string> = {
  leaf: 'text-leaf', lime: 'text-lime', sky: 'text-sky', teal: 'text-teal', violet: 'text-violet', sun: 'text-sun', coral: 'text-coral',
  clay: 'text-clay', slate: 'text-slate', amber: 'text-amber', alert: 'text-alert', neutral: 'text-muted',
};
/** A small colored icon; purely decorative. */
export function IconChip({ icon: Icon, tone = 'leaf', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' }[size];
  return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center ${box} ${toneText[tone]}`}><Icon size={size === 'sm' ? 18 : size === 'md' ? 22 : 28} strokeWidth={1.75} /></span>;
}

export function Card({ title, action, children, className = '', icon, tone = 'leaf' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; icon?: LucideIcon; tone?: Tone }) {
  return (
    <section className={`ww-card relative ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconChip icon={icon} tone={tone} />}
            {title && <h2 className="min-w-0 text-2xl uppercase">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
/** An empty spot that holds the place of a photo still to come. */
export function PhotoSpace({ label }: { label?: string }) {
  return (
    <div aria-hidden className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 border border-dashed border-forest/40 text-forest/50">
      <ImageIcon size={32} />
      {label && <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span title={title} className={`inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${toneText[tone]}`}>{children}</span>;
}

/** The three data categories, used everywhere a number appears. */
export const Observed = () => <Badge tone="sky" title="From the weather service (recent model analysis or forecast)">Weather data</Badge>;
export const Estimated = () => <Badge tone="leaf" title="Calculated by WaterWise from weather and your settings">Estimate</Badge>;
export const Assumed = () => <Badge tone="amber" title="A starter value you can edit; not measured for your yard">Default</Badge>;

export function Button({ children, onClick, variant = 'secondary', type = 'button', disabled, className = '', ariaLabel }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; className?: string; ariaLabel?: string;
}) {
  // Text links with an underline, like the template's "ENTER", rather than filled boxes.
  const v = {
    primary: 'text-forest border-b-2 border-current hover:opacity-70',
    secondary: 'text-ink border-b border-current/50 hover:border-current',
    ghost: 'text-sky hover:underline underline-offset-4',
    danger: 'text-alert border-b border-current/50 hover:border-current',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 px-1 py-1.5 text-sm font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40 ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs font-bold text-alert">{error}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, badge, icon, tone = 'leaf' }: { label: string; value: ReactNode; sub?: ReactNode; badge?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="border-t border-ink/25 pt-3">
      <div className="flex items-center justify-between gap-2"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{icon && <IconChip icon={icon} tone={tone} size="sm" />}{label}</p>{badge}</div>
      <p className="mt-2 font-display text-4xl text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Notice({ tone = 'sky', children, role }: { tone?: Tone; children: ReactNode; role?: 'alert' | 'status' }) {
  // Text straight on the band, marked by a thin line in the notice's color.
  return <div role={role} className="border-l-2 py-1 pl-4 text-sm text-ink" style={{ borderLeftColor: `var(--color-${tone === 'neutral' ? 'line' : tone})` }}>{children}</div>;
}

/** Page title as a full-width hero band, centered: the title with a short phrase under it. */
export function PageTitle({ title, phrase }: { title: string; phrase?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  // While scrolling, the banner holds still and the next section rises over it. The title stays put
  // until that section's top edge reaches it, then rides up on the edge as if pushed.
  useEffect(() => {
    const el = ref.current, t = inner.current;
    if (!el || !t || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const h = el.offsetHeight, y = Math.min(Math.max(window.scrollY, 0), h);
        const push = Math.max(0, y - (h - (t.offsetTop + t.offsetHeight))); // edge has reached the title
        el.style.transform = y > 0 ? `translate3d(0, ${y}px, 0)` : '';
        t.style.transform = push > 0 ? `translate3d(0, ${-push}px, 0)` : '';
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); el.style.transform = ''; t.style.transform = ''; };
  }, []);
  return (
    <div ref={ref} className="ww-hero flex flex-col items-center justify-center text-center text-white">
      <div ref={inner} className="flex flex-col items-center">
        <h1 className="max-w-full break-words text-[clamp(3rem,11vw,9rem)] uppercase leading-[0.9] !text-white">{title}</h1>
        {phrase && <p className="mt-4 text-sm uppercase tracking-[0.25em] text-white/90 md:text-lg">{phrase}</p>}
      </div>
    </div>
  );
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group border-b border-ink/20 py-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.12em] text-ink">{summary}</summary>
      <div className="mt-2 space-y-2 text-muted">{children}</div>
    </details>
  );
}

/** Centered popup. Escape or the backdrop closes it; focus stays inside while open. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('input, select, textarea, button, a[href]')];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); before?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[#0e1a27]/40" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[#f8fbff] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={id} className="text-2xl uppercase">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:opacity-60"><X size={18} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
