import { CalendarDays, Droplets, Landmark, Menu, PanelRightClose, PanelRightOpen, Settings, Sprout, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChip, Tone } from './ui';

export type PageId = 'calendar' | 'usage' | 'lawn' | 'municipal' | 'settings';
export interface PageMeta { id: PageId; label: string; icon: LucideIcon; tone: Tone; group: NavGroup }
type NavGroup = 'Plan' | 'Track' | 'Learn' | 'Setup';

/** One source for every page's label, icon and color so menus and titles stay consistent. */
export const PAGES: PageMeta[] = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, tone: 'violet', group: 'Plan' },
  { id: 'usage', label: 'Usage', icon: Droplets, tone: 'sky', group: 'Track' },
  { id: 'lawn', label: 'Lawn Health', icon: Sprout, tone: 'leaf', group: 'Learn' },
  { id: 'municipal', label: 'Municipal Rules', icon: Landmark, tone: 'clay', group: 'Learn' },
  { id: 'settings', label: 'Settings', icon: Settings, tone: 'slate', group: 'Setup' },
];
export const pageMeta = (id: PageId) => PAGES.find((p) => p.id === id)!;
const GROUPS: NavGroup[] = ['Plan', 'Track', 'Learn', 'Setup'];

function NavList({ page, onSelect, collapsed }: { page: PageId; onSelect: (p: PageId) => void; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((g, gi) => (
        <div key={g}>
          {collapsed
            ? gi > 0 && <hr className="mx-2 mb-3 border-line" aria-hidden />
            : <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">{g}</p>}
          <ul className="flex flex-col gap-1">
            {PAGES.filter((p) => p.group === g).map(({ id, label, icon, tone }) => {
              const active = id === page;
              return (
                <li key={id}>
                  <button onClick={() => onSelect(id)} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}
                    className={`flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left text-sm font-bold transition ${active ? 'bg-leaf-soft text-forest ring-2 ring-leaf/30' : 'text-muted hover:bg-leaf-soft/50 hover:text-ink'} ${collapsed ? 'justify-center' : ''}`}>
                    <IconChip icon={icon} tone={tone} size="sm" />
                    <span className={collapsed ? 'sr-only' : 'min-w-0'}>{label}</span>
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
    <nav aria-label="Main" className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-l-2 border-line bg-white/95 p-3 backdrop-blur transition-[width] duration-200 md:flex ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1`}>
        {!collapsed && <span className="text-sm font-semibold text-muted">Menu</span>}
        <button onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink">
          {collapsed ? <PanelRightOpen size={18} aria-hidden /> : <PanelRightClose size={18} aria-hidden />}
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
          <div ref={panel} className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-xl">
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
