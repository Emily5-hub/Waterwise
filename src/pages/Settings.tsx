import { Bell, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../App';
import { LocationForm } from '../components/LocationForm';
import { Badge, Button, Card, PageTitle } from '../components/ui';
import { notificationStatus, requestNotifications, showNotification } from '../lib/notify';
import { useApp } from '../state';

/** Location and notifications. The lawn itself is set up on the Your Lawn page. */
export function SettingsPage(_: PageProps) {
  const { profile, update } = useApp();
  const [changing, setChanging] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const status = notificationStatus();

  const enableNotifications = async () => {
    const s = await requestNotifications();
    if (s === 'granted') {
      update((p) => ({ ...p, notificationsEnabled: true }));
      const r = showNotification('WaterWise notifications on', 'You’ll get a note on watering days while WaterWise is open.');
      setNotifyMsg(r === 'shown' ? 'On. A test notification was sent.' : 'Allowed, but this browser couldn’t show a test notification.');
    } else setNotifyMsg(s === 'denied' ? 'Blocked. Allow notifications in your browser’s site settings.' : s === 'unsupported' ? 'This browser doesn’t support notifications.' : 'No permission given.');
  };

  return (
    <div className="ww-page ww-page-short ww-page-settings">
      <PageTitle title="Settings" phrase="Location and alerts" />
      <Card icon={MapPin} tone="sky" title="Location">
        <div className="text-center">
          <p className="text-lg font-semibold">{profile.location?.label}</p>
          {!changing && <Button className="mt-3" onClick={() => setChanging(true)}>Change</Button>}
        </div>
        {changing && <div className="mx-auto mt-6 w-full max-w-xl"><LocationForm centered initial={profile.location} submitLabel="Look up" onResolved={(l) => { update((p) => ({ ...p, location: l })); setChanging(false); }} /></div>}
      </Card>

      <Card icon={Bell} tone="violet" title="Notifications" className="ww-compact">
        <div className="text-center">
          <p className="mb-4 text-[0.9375rem] font-semibold uppercase tracking-[0.14em] md:text-base [&>span]:text-[0.9375rem] md:[&>span]:text-base">Status: <Badge tone={status === 'granted' && profile.notificationsEnabled ? 'leaf' : 'neutral'}>{status === 'unsupported' ? 'Not supported' : status === 'denied' ? 'Blocked by browser' : profile.notificationsEnabled && status === 'granted' ? 'On' : 'Off'}</Badge></p>
          {profile.notificationsEnabled ? <Button className="!text-[0.9375rem] md:!text-base" onClick={() => update((p) => ({ ...p, notificationsEnabled: false }))}>Turn off</Button> : <Button variant="primary" className="!text-[0.9375rem] md:!text-base" onClick={enableNotifications} disabled={status === 'unsupported'}>Enable notifications</Button>}
          {notifyMsg && <p role="status" className="mt-3 text-sm text-muted md:text-[0.9375rem]">{notifyMsg}</p>}
        </div>
      </Card>
    </div>
  );
}
