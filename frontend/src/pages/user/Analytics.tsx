import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api from '@/services/api';
import { TrendingUp, Wifi, Zap, Wallet, Award, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  total_spent: number;
  total_topups: number;
  wifi_spent: number;
  electricity_spent: number;
  current_balance: number;
  loyalty_points: number;
  transaction_count: number;
  monthly_breakdown: Array<{ month: string; wifi: number; electricity: number; topups: number }>;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then((r) => {
      if (r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-16 text-ink-muted">Loading…</div>;
  if (!data) return <EmptyState icon={BarChart3} title="No data yet" description="Spend more to see your analytics." />;

  const max = Math.max(1, ...data.monthly_breakdown.flatMap((m) => [m.wifi, m.electricity, m.topups]));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="See where your spend goes." back="/user" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="brand"   icon={Wallet}     label="Balance"    value={fmt(data.current_balance)} />
        <StatCard tone="accent"  icon={TrendingUp} label="Spent"      value={fmt(data.total_spent)}    hint={`${data.transaction_count} transactions`} />
        <StatCard tone="success" icon={Award}      label="Points"     value={data.loyalty_points} />
        <StatCard tone="neutral" icon={TrendingUp} label="Top-ups"    value={fmt(data.total_topups)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="accent"  icon={Wifi} label="WiFi spend"      value={fmt(data.wifi_spent)} />
        <StatCard tone="warning" icon={Zap}  label="Electricity spend" value={fmt(data.electricity_spent)} />
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-4">Monthly breakdown</h3>
          {data.monthly_breakdown.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No history yet.</p>
          ) : (
            <div className="space-y-3">
              {data.monthly_breakdown.map((m) => (
                <div key={m.month}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{m.month}</span>
                    <span className="text-ink-muted">{fmt(m.topups + m.wifi + m.electricity)}</span>
                  </div>
                  <div className="flex h-2 gap-0.5 rounded-full overflow-hidden bg-surface-subtle">
                    <span className="bg-brand-700"  style={{ width: `${(m.topups / max) * 100}%` }} />
                    <span className="bg-accent-500" style={{ width: `${(m.wifi / max) * 100}%` }} />
                    <span className="bg-amber-500"  style={{ width: `${(m.electricity / max) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex gap-4 text-xs pt-2">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-700" /> Top-ups</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-500" /> WiFi</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Electricity</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
