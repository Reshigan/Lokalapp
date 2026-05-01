import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api, { Invoice, Household } from '@/services/api';
import { Receipt, Home, ChevronRight } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, h] = await Promise.all([api.listInvoices(), api.myHouseholds()]);
      if (i.data) setInvoices(i.data);
      if (h.data) setHouseholds(h.data);
      setLoading(false);
    })();
  }, []);

  const totalDue = invoices
    .filter((i) => i.status !== 'PAID')
    .reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="My invoices" description="Postpaid electricity bills for your linked households." back="/user" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="warning" icon={Receipt} label="Total due"   value={fmt(totalDue)} />
        <StatCard tone="brand"   icon={Home}    label="Households"  value={households.length} />
      </div>

      {households.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-3">Connected households</h3>
            <div className="divide-y divide-surface-border">
              {households.map((h) => (
                <div key={h.id} className="flex justify-between items-center py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-ink-soft" />
                    {h.account_number} <span className="text-ink-muted">·</span> {[h.suburb, h.city].filter(Boolean).join(', ') || '—'}
                  </span>
                  <span className={Number(h.current_balance) > 0 ? 'text-amber-700 font-medium' : 'text-ink-muted'}>
                    {fmt(h.current_balance)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Your electricity bills will appear here." />
      ) : (
        <div className="grid gap-2">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => navigate(`/user/invoices/${inv.id}`)}
              className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
            >
              <Receipt className="w-5 h-5 text-ink-soft" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{inv.invoice_number}</p>
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  {Number(inv.kwh_consumed).toFixed(2)} kWh · due {new Date(inv.due_date).toLocaleDateString()}
                </p>
              </div>
              <p className="text-base font-semibold">{fmt(inv.total_amount)}</p>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
