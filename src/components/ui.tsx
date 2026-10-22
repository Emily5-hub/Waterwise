import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export type Tone = 'leaf' | 'lime' | 'sky' | 'teal' | 'violet' | 'sun' | 'coral' | 'clay' | 'slate' | 'amber' | 'alert' | 'neutral';
export const toneCls: Record<Tone, string> = {
  leaf: 'bg-leaf-soft text-leaf', lime: 'bg-lime-soft text-lime', sky: 'bg-sky-soft text-sky', teal: 'bg-teal-soft text-teal',
  violet: 'bg-violet-soft text-violet', sun: 'bg-sun-soft text-sun', coral: 'bg-coral-soft text-coral', clay: 'bg-clay-soft text-clay',
  slate: 'bg-slate-soft text-slate', amber: 'bg-amber-soft text-amber', alert: 'bg-alert-soft text-alert', neutral: 'bg-canvas text-muted border border-line',
};
/** Small rounded blob holding an icon; purely decorative. */
export function IconChip({ icon: Icon, tone = 'leaf', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'h-7 w-7 rounded-[10px]', md: 'h-10 w-10 rounded-[14px]', lg: 'h-12 w-12 rounded-[18px]' }[size];
  return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center ${box} ${toneCls[tone]}`}><Icon size={size === 'sm' ? 15 : size === 'md' ? 19 : 24} strokeWidth={2.2} /></span>;
}

export function Card({ title, action, children, className = '', icon, tone = 'leaf' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; icon?: LucideIcon; tone?: Tone }) {
  return (
    <section className={`ww-card relative rounded-[22px] border border-[#cfe2c6] p-5 shadow-[0_1px_2px_rgba(30,86,49,0.05)] ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <IconChip icon={icon} tone={tone} />}
            {title && <h2 className="min-w-0 text-lg font-semibold">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneCls[tone]}`}>{children}</span>;
}

/** The three data categories, used everywhere a number appears. */
export const Observed = () => <Badge tone="sky" title="From the weather service (recent model analysis or forecast)">Weather data</Badge>;
export const Estimated = () => <Badge tone="leaf" title="Calculated by WaterWise from weather and your settings">Estimate</Badge>;
export const Assumed = () => <Badge tone="amber" title="A starter value you can edit; not measured for your yard">Default</Badge>;

export function Button({ children, onClick, variant = 'secondary', type = 'button', disabled, className = '', ariaLabel }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; className?: string; ariaLabel?: string;
}) {
  const v = {
    primary: 'bg-forest text-white shadow-[0_2px_0_#123a20] hover:bg-[#184a29] active:translate-y-[1px] active:shadow-none',
    secondary: 'bg-white text-ink border-2 border-line hover:bg-leaf-soft/50',
    ghost: 'text-sky hover:bg-sky-soft',
    danger: 'bg-white text-alert border-2 border-line hover:bg-alert-soft',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-ink">{label}</label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs font-bold text-alert">{error}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, badge, icon, tone = 'leaf' }: { label: string; value: ReactNode; sub?: ReactNode; badge?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="rounded-[20px] border-2 border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2"><p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted">{icon && <IconChip icon={icon} tone={tone} size="sm" />}{label}</p>{badge}</div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Notice({ tone = 'sky', children, role }: { tone?: Tone; children: ReactNode; role?: 'alert' | 'status' }) {
  return <div role={role} className={`rounded-2xl border-2 border-current/15 ${toneCls[tone]} px-4 py-3 text-sm`}>{children}</div>;
}

/** Page title as a dark green banner. */
export function PageTitle({ title, icon }: { title: string; icon?: LucideIcon }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-[26px] bg-gradient-to-r from-[#1e5631] via-[#2b6f45] to-[#4c9a66] px-6 py-5 text-white shadow-[0_6px_18px_rgba(30,86,49,0.18)]">
      {icon && <span aria-hidden className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">{(() => { const I = icon; return <I size={24} />; })()}</span>}
      <h1 className="text-3xl font-bold tracking-tight !text-white">{title}</h1>
    </div>
  );
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border-2 border-line bg-leaf-soft/30 px-4 py-2.5 text-sm">
      <summary className="cursor-pointer select-none font-bold text-leaf">{summary}</summary>
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
      <div className="absolute inset-0 bg-[#10301b]/40" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-[#fdfcf6] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={id} className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-leaf-soft"><X size={18} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
