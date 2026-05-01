import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api, { Invoice } from '@/services/api';
import { Loader2, FileText } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function InvoiceDetailUserPage() {
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    api.getInvoice(id).then((r) => r.data && setInvoice(r.data));
  }, [id]);

  if (!invoice) {
    return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent-500" /></div>;
  }

  const openReceipt = () => {
    const base = (import.meta.env.VITE_API_URL as string) || '';
    const tok = localStorage.getItem('access_token');
    fetch(`${base}/billing/invoices/${invoice.id}/receipt`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    })
      .then((r) => r.text())
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description={`Period ${new Date(invoice.period_start).toLocaleDateString()} – ${new Date(invoice.period_end).toLocaleDateString()}`}
        back="/user/invoices"
        actions={
          <Button variant="outline" onClick={openReceipt}>
            <FileText className="w-4 h-4" /> Receipt
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   label="Total"   value={fmt(invoice.total_amount)} />
        <StatCard tone="success" label="Paid"    value={fmt(invoice.amount_paid || 0)} />
        <StatCard tone="warning" label="Status"  value={<Badge variant={invoice.status === 'PAID' ? 'success' : 'warning'}>{invoice.status}</Badge>} hint={`Due ${new Date(invoice.due_date).toLocaleDateString()}`} />
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-3">Reading</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Cell label="Previous" value={`${Number(invoice.previous_reading_kwh).toFixed(2)} kWh`} />
            <Cell label="Current"  value={`${Number(invoice.current_reading_kwh).toFixed(2)} kWh`} />
            <Cell label="Consumed" value={<span className="font-semibold text-ink">{Number(invoice.kwh_consumed).toFixed(2)} kWh</span>} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-3">Charges</h3>
          <ul className="text-sm divide-y divide-surface-border">
            {invoice.line_items.map((li, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-ink-soft truncate pr-3">{li.label}</span>
                <span className="font-medium">{fmt(li.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between py-3 font-semibold border-t-2 border-ink">
              <span>Total</span>
              <span>{fmt(invoice.total_amount)}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-ink-muted text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
