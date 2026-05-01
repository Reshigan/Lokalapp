import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api from '@/services/api';
import { Bell, AlertTriangle, Wallet, Loader2, Settings } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function AgentAlertsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getAgentAlerts();
    if (r.data) {
      setData(r.data);
      setThreshold(String(r.data.low_float_threshold || 100));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(threshold);
    if (isNaN(v) || v < 0) return;
    setSaving(true);
    await api.updateAgentAlertSettings(v);
    setSaving(false);
    setShowSettings(false);
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Alerts"
        description="Notifications about your float and account."
        back="/agent"
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" /> Settings
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="brand"   icon={Wallet} label="Float"        value={data ? fmt(data.current_float) : '—'} />
        <StatCard tone="warning"               label="Low threshold" value={data ? fmt(data.low_float_threshold) : '—'} />
      </div>

      {showSettings && (
        <Card>
          <form onSubmit={save}>
            <CardContent className="p-5 space-y-3">
              <h3 className="section-title">Low-float threshold</h3>
              <p className="text-xs text-ink-muted">You'll get an alert when your float drops below this.</p>
              <Input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save threshold
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      <section>
        <h3 className="section-title mb-3">Alerts</h3>
        {loading ? (
          <div className="text-center py-12 text-ink-muted">Loading…</div>
        ) : !data?.alerts?.length ? (
          <EmptyState icon={Bell} title="No active alerts" description="You're all caught up." />
        ) : (
          <div className="grid gap-2">
            {data.alerts.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.alert_type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-ink-soft mt-1">{a.message || `Threshold ${fmt(a.threshold || 0)}, current ${fmt(a.current_balance || 0)}`}</p>
                    <p className="text-xs text-ink-muted mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
