/** Optional local browser notifications. Only shown while the app (or its installed
 *  PWA) is open; there is no push server. Never reports delivery it can't confirm. */
export type NotifyStatus = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationStatus(): NotifyStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyStatus;
}

export async function requestNotifications(): Promise<NotifyStatus> {
  if (notificationStatus() === 'unsupported') return 'unsupported';
  try { return (await Notification.requestPermission()) as NotifyStatus; } catch { return notificationStatus(); }
}

export function showNotification(title: string, body: string): 'shown' | 'not_permitted' | 'unsupported' | 'failed' {
  const status = notificationStatus();
  if (status === 'unsupported') return 'unsupported';
  if (status !== 'granted') return 'not_permitted';
  try { new Notification(title, { body, icon: '/icon.svg' }); return 'shown'; } catch { return 'failed'; }
}
