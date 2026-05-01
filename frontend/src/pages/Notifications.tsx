import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { NotificationItem } from '@/services/api';
import { isPushSupported, getPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push';
import { ArrowLeft, Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();
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
    await api.sendTestNotification('Test', 'Hello from Lokal');
    const r = await api.listNotifications();
    if (r.data) setItems(r.data);
  };

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <p className="text-slate-300 text-sm">Invoices, payments and settlements.</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {pushEnabled ? <Bell className="w-4 h-4 text-green-600" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                Push notifications
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isPushSupported() ? (pushEnabled ? 'On for this device' : 'Off') : 'Not supported on this browser'}
              </p>
              {pushError && <p className="text-xs text-red-600 mt-1">{pushError}</p>}
            </div>
            <Button onClick={togglePush} disabled={pushBusy || !isPushSupported()} variant="outline" className="rounded-xl">
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : pushEnabled ? 'Turn off' : 'Turn on'}
            </Button>
          </CardContent>
        </Card>

        {pushEnabled && (
          <Button variant="outline" onClick={sendTest} className="rounded-xl w-full">
            Send test notification
          </Button>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
          </div>
        ) : items.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className={`border-0 shadow-lg rounded-2xl ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{n.title}</p>
                      {!n.is_read && <Badge variant="default">new</Badge>}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
