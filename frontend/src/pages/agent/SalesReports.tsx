import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api from '@/services/api';
import { TrendingUp, ShoppingCart, Coins } from 'lucide-react';

interface SalesReport {
  today: { sales: number; count: number; commission: number };
  week:  { sales: number; count: number };
  month: { sales: number; count: number; commission: number };
  daily_breakdown: Array<{ date: string; sales: number; count: number }>;
  total_sales: number;
  commission_balance: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function SalesReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAgentSalesReport().then((r) => {
      if (r.data) setReport(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-16 text-ink-muted">Loading…</div>;
  if (!report) return <div className="text-center py-16 text-ink-muted">No data</div>;

  const max = Math.max(1, ...report.daily_breakdown.map((d) => d.sales));

  return (
    <div className="space-y-6">
      <PageHeader title="Sales reports" description="Your sales performance over time." back="/agent" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="brand"   icon={ShoppingCart} label="Today"     value={fmt(report.today.sales)} hint={`${report.today.count} sale(s)`} />
        <StatCard tone="accent"  icon={ShoppingCart} label="This week" value={fmt(report.week.sales)}  hint={`${report.week.count} sale(s)`} />
        <StatCard tone="success" icon={TrendingUp}   label="This month" value={fmt(report.month.sales)} hint={`${report.month.count} sale(s)`} />
        <StatCard tone="warning" icon={Coins}        label="Commission"  value={fmt(report.commission_balance)} hint="Available" />
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-4">Daily breakdown (last 30 days)</h3>
          {report.daily_breakdown.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No sales yet.</p>
          ) : (
            <div className="space-y-2">
              {report.daily_breakdown.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted w-20">{new Date(d.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                    <span className="block h-full bg-brand-700" style={{ width: `${(d.sales / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">{fmt(d.sales)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
