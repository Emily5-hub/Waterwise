import { RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo, Wordmark } from './components/Brand';
import { MobileNav, PageId, SideNav, pageMeta } from './components/Nav';
import { Notice } from './components/ui';
import { CalendarPage } from './pages/Calendar';
import { LawnHealthPage } from './pages/LawnHealth';
import { MunicipalPage } from './pages/Municipal';
import { Onboarding } from './pages/Onboarding';
import { SettingsPage } from './pages/Settings';
import { UsagePage } from './pages/Usage';
import { useApp } from './state';

export default function App() {
  const { profile, weather, refresh, storageError, online } = useApp();
  const [page, setPage] = useState<PageId>('calendar');
  const headerHidden = useHideOnScrollDown();
  if (!profile.onboarded || !profile.location) return <Onboarding />;

  const Page = { calendar: CalendarPage, usage: UsagePage, lawn: LawnHealthPage, municipal: MunicipalPage, settings: SettingsPage }[page];
  const select = (p: PageId) => { setPage(p); window.scrollTo?.({ top: 0 }); };
  return (
    <div className="flex min-h-screen">
      <div className="min-w-0 flex-1">
        <header className={`sticky top-0 z-30 border-b border-ink/15 bg-[#f8fbff] pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerHidden ? '-translate-y-full' : ''}`}>
          <div className="flex items-center justify-between gap-3 px-[var(--ww-gutter)] py-1">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size={28} />
              <p className="text-[1.375rem] leading-none"><Wordmark /></p>
              <p className="ml-1 min-w-0 truncate text-sm leading-none text-muted">{profile.location.label} · {pageMeta(page).label}</p>
            </div>
            <div className="flex items-center gap-1">
              {!online && <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-amber"><WifiOff size={14} aria-hidden /> Offline</span>}
              <button onClick={refresh} disabled={weather.loading} aria-label="Refresh weather"
                className="p-2 text-muted hover:text-ink disabled:opacity-40">
                <RefreshCw size={18} aria-hidden className={weather.loading ? 'animate-spin' : ''} />
              </button>
              <MobileNav page={page} onSelect={select} />
            </div>
          </div>
        </header>
        <main className="pb-[max(2rem,env(safe-area-inset-bottom))]">
          {storageError && <div className="px-[var(--ww-gutter)] pt-4"><Notice tone="amber" role="alert">{storageError}</Notice></div>}
          <Page onNavigate={select} />
        </main>
      </div>
      <SideNav page={page} onSelect={select} />
    </div>
  );
}

/** True while the user is scrolling down (past the top), false as soon as they scroll back up. */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 5) return; // ignore tiny jitters
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

export interface PageProps { onNavigate: (p: PageId) => void }
