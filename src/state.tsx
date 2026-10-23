import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { planWeek, WeekPlan } from './lib/decision';
import { showNotification } from './lib/notify';
import { withAreaRules } from './lib/regions';
import { loadProfile, loadWeather, locationKey, saveProfile, saveWeather } from './lib/storage';
import type { Profile, WeatherData } from './lib/types';
import { fetchWeather, refreshKinds } from './lib/weather';
import { formatClock } from './lib/time';

interface WeatherState { data: WeatherData | null; loading: boolean; error: string | null; fromCache: boolean }

interface AppState {
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  weather: WeatherState;
  refresh: () => void;
  plan: WeekPlan | null;
  storageError: string | null;
  online: boolean;
  now: Date;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => { const c = useContext(Ctx); if (!c) throw new Error('useApp outside provider'); return c; };

export function AppProvider({ children, initialProfile, initialWeather }: { children: ReactNode; initialProfile?: Profile; initialWeather?: WeatherData }) {
  const [{ profile, storageError }, setState] = useState(() => {
    const loaded = initialProfile ? { profile: initialProfile, error: null } : loadProfile();
    // Existing users get their area's typical rules once (saved on their next change).
    const profile = loaded.profile.areaRulesFor === null ? withAreaRules(loaded.profile) : loaded.profile;
    return { profile, storageError: loaded.error };
  });
  const [weather, setWeather] = useState<WeatherState>({ data: initialWeather ?? null, loading: false, error: null, fromCache: false });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [now, setNow] = useState(() => new Date());

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setState((s) => {
      let next = fn(s.profile);
      // A new or changed location brings that area's typical rules (see withAreaRules).
      if (next.location !== s.profile.location || next.areaRulesFor === null) next = withAreaRules(next);
      return { profile: next, storageError: saveProfile(next) ?? (s.storageError?.startsWith('Couldn’t save') ? null : s.storageError) };
    });
  }, []);

  const loc = profile.location;
  const refresh = useCallback(async () => {
    if (!loc || initialWeather) return;
    const key = locationKey(loc);
    const cached = loadWeather(key);
    setWeather((w) => ({ data: w.data && !w.data.isSample ? w.data : cached, loading: true, error: null, fromCache: !!cached }));
    try {
      const data = await fetchWeather(loc);
      saveWeather(key, data);
      setWeather({ data, loading: false, error: null, fromCache: false });
    } catch (e) {
      setWeather((w) => ({ data: w.data ?? cached, loading: false, error: (e as Error).message, fromCache: !!(w.data ?? cached) }));
    }
    setNow(new Date());
  }, [loc?.latitude, loc?.longitude, loc?.timezone, initialWeather]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = () => { setOnline(true); refresh(); }, off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const tick = setInterval(() => setNow(new Date()), 60000);
    const refetch = setInterval(() => refresh(), 60 * 60000); // recalculates when forecasts change
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(tick); clearInterval(refetch); };
  }, [refresh]);

  const plan = useMemo(() => {
    if (!weather.data || !profile.zones.length) return null;
    try { return planWeek(profile, refreshKinds(weather.data, now), now); } catch { return null; }
  }, [profile, weather.data, now]);

  // Optional local notification, at most once per day, only when permission is granted.
  useEffect(() => {
    const today = plan?.days[0];
    if (!profile.notificationsEnabled || !today || today.action !== 'WATER' || !today.window) return;
    const key = 'waterwise.notified';
    if (localStorage.getItem(key) === today.date) return;
    if (showNotification('WaterWise: water today', `Best time ${formatClock(today.window.start)}. ${today.reason}`) === 'shown') localStorage.setItem(key, today.date);
  }, [plan, profile.notificationsEnabled]);

  const value = useMemo(() => ({ profile, update, weather, refresh, plan, storageError, online, now }), [profile, update, weather, refresh, plan, storageError, online, now]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
