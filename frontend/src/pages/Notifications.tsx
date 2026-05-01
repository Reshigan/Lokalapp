import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import api, { NotificationItem } from '@/services/api';
import { isPushSupported, getPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api.listNotifications();
      if (r.data) setItems(r.data);
      setLoading(false);
      if (isPushSupported()) {
        const perm = await getPushPermission();
        if (perm === 'granted') {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setPushEnabled(!!sub);
        }
      }
    })();
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(null);
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
    } else {
      const r = await subscribeToPush();
      if (!r.ok) setPushError(r.reason || 'Failed to enable');
      else setPushEnabled(true);
    }
    setPushBusy(false);
  };

  const sendTest = async () => {
    await api.sendTestNotification();
    const r = await api.listNotifications();
    if (r.data) setItems(r.data);
  };

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Notifications" description="Push alerts and an inbox of every event." back={-1 as any} />

      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {pushEnabled ? <Bell className="w-4 h-4 text-accent-600" /> : <BellOff className="w-4 h-4 text-ink-muted" />}
              Push notifications
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {isPushSupported()
                ? pushEnabled ? 'Enabled on this device' : 'Disabled — turn on to receive push'
                : 'Not supported in this browser'}
            </p>
            {pushError && <p className="text-xs text-red-600 mt-1">{pushError}</p>}
          </div>
          <div className="flex gap-2">
            {pushEnabled && (
              <Button variant="outline" size="sm" onClick={sendTest}>Test</Button>
            )}
            <Button onClick={togglePush} disabled={pushBusy || !isPushSupported()} size="sm" variant={pushEnabled ? 'outline' : 'default'}>
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : pushEnabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="You'll see invoice issues, payment confirmations, and settlement updates here." />
      ) : (
        <div className="grid gap-2">
          {items.map((n) => (
            <Card key={n.id} className={n.is_read ? '' : 'border-accent-200 bg-accent-50/40'}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.is_read && <Badge variant="accent">new</Badge>}
                  </div>
                  <p className="text-sm text-ink-soft mt-1">{n.body}</p>
                  <p className="text-xs text-ink-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="icon-sm" onClick={() => markRead(n.id)}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
