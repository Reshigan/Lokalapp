import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api from '@/services/api';
import { TrendingUp, Wifi, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueData {
  period_days: number;
  daily_revenue: Array<{ date: string; amount: number }>;
  by_product: { wifi: number; electricity: number; other: number };
  total: number;
}

interface AgentRow {
  agent_code: string;
  business_name: string;
  tier: string;
  total_sales: number;
  monthly_sales: number;
  commission_balance: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

export default function AdminReportsPage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [topAgents, setTopAgents] = useState<AgentRow[]>([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getRevenueReport(period), api.getAgentPerformanceReport(period)]).then(([r, a]) => {
      if (r.data) setRevenue(r.data);
      if (a.data) setTopAgents(a.data.top_agents);
      setLoading(false);
    });
  }, [period]);

  const max = Math.max(1, ...(revenue?.daily_revenue.map((d) => d.amount) || [0]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Last ${period} days`}
        back="/admin"
        actions={
          <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium',
                  period === d ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   icon={TrendingUp} label="Total revenue" value={revenue ? fmt(revenue.total) : '—'} />
        <StatCard tone="accent"  icon={Wifi}       label="WiFi"          value={revenue ? fmt(revenue.by_product.wifi) : '—'} />
        <StatCard tone="warning" icon={Zap}        label="Electricity"   value={revenue ? fmt(revenue.by_product.electricity) : '—'} />
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-4">Daily revenue</h3>
          {loading ? (
            <p className="text-sm text-ink-muted text-center py-6">Loading…</p>
          ) : (revenue?.daily_revenue.length || 0) === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No revenue in this period.</p>
          ) : (
            <div className="space-y-2">
              {revenue!.daily_revenue.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted w-20">{new Date(d.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                    <span className="block h-full bg-brand-700" style={{ width: `${(d.amount / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-3">Top agents</h3>
          {topAgents.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No agents yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {topAgents.map((a) => (
                <div key={a.agent_code} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{a.business_name}</p>
                      <Badge>{a.tier}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted">{a.agent_code}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{fmt(a.total_sales)}</p>
                    <p className="text-xs text-ink-muted">{fmt(a.monthly_sales)} this month</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
