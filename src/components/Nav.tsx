import { CalendarDays, Droplets, Landmark, Leaf, Menu, PanelLeftClose, PanelLeftOpen, Settings, Sprout, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChip, Tone } from './ui';

export type PageId = 'calendar' | 'usage' | 'lawn' | 'municipal' | 'yard' | 'settings';
export interface PageMeta { id: PageId; label: string; icon: LucideIcon; tone: Tone; group: NavGroup }
type NavGroup = 'Plan' | 'Track' | 'Learn' | 'Setup';

/** One source for every page's label, icon and color so menus and titles stay consistent. */
export const PAGES: PageMeta[] = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, tone: 'violet', group: 'Plan' },
  { id: 'usage', label: 'Usage', icon: Droplets, tone: 'sky', group: 'Track' },
  { id: 'lawn', label: 'Lawn Health', icon: Sprout, tone: 'leaf', group: 'Learn' },
  { id: 'municipal', label: 'Rules', icon: Landmark, tone: 'clay', group: 'Learn' },
  { id: 'yard', label: 'Your Lawn', icon: Leaf, tone: 'leaf', group: 'Setup' },
  { id: 'settings', label: 'Settings', icon: Settings, tone: 'slate', group: 'Setup' },
];
export const pageMeta = (id: PageId) => PAGES.find((p) => p.id === id)!;
const GROUPS: NavGroup[] = ['Plan', 'Track', 'Learn', 'Setup'];

function NavList({ page, onSelect, collapsed }: { page: PageId; onSelect: (p: PageId) => void; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map((g, gi) => (
        <div key={g}>
          {collapsed
            ? gi > 0 && <hr className="mx-2 mb-8 border-line" aria-hidden />
            : <p className="mb-3 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-faint">{g}</p>}
          <ul className="flex flex-col gap-2.5">
            {PAGES.filter((p) => p.group === g).map(({ id, label, icon, tone }) => {
              const active = id === page;
              return (
                <li key={id}>
                  <button onClick={() => onSelect(id)} aria-current={active ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 border-l-2 px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] transition ${active ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-ink'} ${collapsed ? 'justify-center' : ''}`}>
                    <IconChip icon={icon} tone={tone} size="sm" />
                    <span className={collapsed ? 'sr-only' : 'min-w-0'}>{label}</span>
                    {collapsed && (
                      <span aria-hidden className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-forest px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-forest before:content-[''] group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

const readCollapsed = () => { try { return localStorage.getItem('waterwise.navCollapsed') === '1'; } catch { return false; } };

export function SideNav({ page, onSelect }: { page: PageId; onSelect: (p: PageId) => void }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  useEffect(() => { try { localStorage.setItem('waterwise.navCollapsed', collapsed ? '1' : '0'); } catch { /* preference only */ } }, [collapsed]);
  return (
    <nav aria-label="Main" className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-line bg-[#f8fbff] p-3 transition-[width] duration-200 md:flex ${collapsed ? 'w-[4.5rem] overflow-visible' : 'w-64 overflow-y-auto'}`}>
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1`}>
        {!collapsed && <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Menu</span>}
        <button onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="p-2 text-muted hover:text-ink">
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
      </div>
      <NavList page={page} onSelect={onSelect} collapsed={collapsed} />
    </nav>
  );
}

export function MobileNav({ page, onSelect }: { page: PageId; onSelect: (p: PageId) => void }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panel.current) { // keep focus inside the drawer
        const items = [...panel.current.querySelectorAll<HTMLButtonElement>('button')];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const btn = opener.current;
    return () => { document.removeEventListener('keydown', onKey); btn?.focus(); };
  }, [open]);
  return (
    <div className="md:hidden">
      <button ref={opener} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded-lg p-2 text-ink hover:bg-canvas"><Menu size={22} aria-hidden /></button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-hidden />
          <div ref={panel} className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#f8fbff] p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-canvas"><X size={20} aria-hidden /></button>
            </div>
            <NavList page={page} onSelect={(p) => { onSelect(p); setOpen(false); }} collapsed={false} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
