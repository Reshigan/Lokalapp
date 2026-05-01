import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api, { Household, Invoice } from '@/services/api';
import { Loader2, Zap, Receipt, ChevronRight } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function HouseholdDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [h, setH] = useState<Household | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const a = await api.getHousehold(id);
      if (a.data) setH(a.data);
      const b = await api.listInvoices({ household_id: id });
      if (b.data) setInvoices(b.data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-center py-16"><Loader2 className="w-6 h-6 mx-auto animate-spin text-accent-500" /></div>;
  if (!h) return <p className="text-center py-16 text-ink-muted">Household not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={h.primary_contact_name}
        description={`Account ${h.account_number} · ${h.tariff_name || 'no tariff'}`}
        back="/agent/households"
        actions={
          <Button onClick={() => navigate(`/agent/households/${id}/reading`)}>
            <Zap className="w-4 h-4" /> Capture reading
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="warning" icon={Receipt} label="Outstanding"     value={fmt(h.current_balance)} hint={h.last_reading_at ? `Last read ${new Date(h.last_reading_at).toLocaleDateString()}` : 'Never read'} />
        <StatCard tone="brand"   icon={Zap}     label="Last reading"    value={`${Number(h.last_reading_kwh).toFixed(0)} kWh`} />
        <StatCard tone="accent"  icon={Receipt} label="Invoices"        value={invoices.length} />
      </div>

      <Card>
        <CardContent className="p-5 space-y-1.5 text-sm">
          <h3 className="section-title">Master data</h3>
          <Row label="Phone" value={h.primary_contact_phone} />
          {h.primary_contact_id_number && <Row label="ID" value={h.primary_contact_id_number} />}
          {h.email && <Row label="Email" value={h.email} />}
          {h.erf_number && <Row label="Erf" value={h.erf_number} />}
          {h.street_address && <Row label="Address" value={h.street_address} />}
          <Row label="Suburb / city" value={[h.suburb, h.city].filter(Boolean).join(', ') || '—'} />
          <Row label="Tariff" value={h.tariff_name || '—'} />
          {h.meter_number && <Row label="Meter" value={h.meter_number} />}
          <Row label="Status" value={<Badge variant={h.status === 'ACTIVE' ? 'default' : 'secondary'}>{h.status}</Badge>} />
        </CardContent>
      </Card>

      <section>
        <h3 className="section-title mb-3">Invoices</h3>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" description="Capture a meter reading to issue the first invoice." />
        ) : (
          <div className="grid gap-2">
            {invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => navigate(`/agent/invoices/${inv.id}`)}
                className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
              >
                <Receipt className="w-5 h-5 text-ink-soft" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{inv.invoice_number}</p>
                    <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {Number(inv.kwh_consumed).toFixed(2)} kWh · {new Date(inv.issue_date).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-base font-semibold">{fmt(inv.total_amount)}</p>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-surface-border last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink font-medium text-right">{value}</span>
    </div>
  );
}
