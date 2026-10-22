import { RefreshCw, WifiOff } from 'lucide-react';
import { useState } from 'react';
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
  if (!profile.onboarded || !profile.location) return <Onboarding />;

  const Page = { calendar: CalendarPage, usage: UsagePage, lawn: LawnHealthPage, municipal: MunicipalPage, settings: SettingsPage }[page];
  const select = (p: PageId) => { setPage(p); window.scrollTo?.({ top: 0 }); };
  return (
    <div className="flex min-h-screen">
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b-2 border-leaf/40 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Logo size={48} />
              <div className="min-w-0">
                <p className="text-[28px] leading-none"><Wordmark /></p>
                <p className="mt-1 truncate text-xs font-semibold leading-tight text-muted">{profile.location.label} · {pageMeta(page).label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!online && <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-amber"><WifiOff size={14} aria-hidden /> Offline</span>}
              <button onClick={refresh} disabled={weather.loading || profile.useSampleData} aria-label="Refresh weather"
                className="rounded-full p-2 text-muted hover:bg-leaf-soft hover:text-ink disabled:opacity-40">
                <RefreshCw size={18} aria-hidden className={weather.loading ? 'animate-spin' : ''} />
              </button>
              <MobileNav page={page} onSelect={select} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-8">
          {storageError && <div className="mb-4"><Notice tone="amber" role="alert">{storageError}</Notice></div>}
          <Page onNavigate={select} />
        </main>
      </div>
      <SideNav page={page} onSelect={select} />
    </div>
  );
}

export interface PageProps { onNavigate: (p: PageId) => void }
