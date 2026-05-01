import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api, { Invoice, CashCollection } from '@/services/api';
import { Loader2, Coins, CheckCircle2, FileText, Copy } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [collection, setCollection] = useState<CashCollection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const r = await api.getInvoice(id);
    if (r.data) setInvoice(r.data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!invoice) {
    return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent-500" /></div>;
  }

  const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid || 0);

  const collect = async () => {
    setBusy(true);
    setError(null);
    const r = await api.createCollection({ invoice_id: invoice.id, amount: outstanding });
    setBusy(false);
    if (r.error) return setError(r.error);
    setCollection(r.data!);
  };

  const confirmNow = async () => {
    if (!collection?.household_confirm_code) return;
    const r = await api.confirmCollection(collection.id, collection.household_confirm_code);
    if (r.data) { setCollection(r.data); await load(); }
  };

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
        description={`${invoice.household_contact_name || ''} · ${invoice.household_account_number || ''}`}
        back={-1 as any}
        actions={
          <Button variant="outline" onClick={openReceipt}>
            <FileText className="w-4 h-4" /> Receipt
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   label="Total" value={fmt(invoice.total_amount)} />
        <StatCard tone="success" label="Paid"  value={fmt(invoice.amount_paid || 0)} />
        <StatCard tone="warning" label="Due"   value={fmt(outstanding)} hint={`Due ${new Date(invoice.due_date).toLocaleDateString()}`} />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Reading</h3>
            <Badge variant={invoice.status === 'PAID' ? 'success' : 'warning'}>{invoice.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-ink-muted text-xs">Previous</p>
              <p className="font-medium">{Number(invoice.previous_reading_kwh).toFixed(2)} kWh</p>
            </div>
            <div>
              <p className="text-ink-muted text-xs">Current</p>
              <p className="font-medium">{Number(invoice.current_reading_kwh).toFixed(2)} kWh</p>
            </div>
            <div>
              <p className="text-ink-muted text-xs">Consumed</p>
              <p className="font-semibold">{Number(invoice.kwh_consumed).toFixed(2)} kWh</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="section-title mb-3">Breakdown</h3>
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

      {invoice.status !== 'PAID' && !collection && (
        <Button variant="accent" size="lg" className="w-full" onClick={collect} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          Collect cash {fmt(outstanding)}
        </Button>
      )}

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {collection && (
        <Card className="border-amber-200 bg-warning-soft">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-amber-900">
              Show this code to the household to confirm cash receipt.
              They can enter it in their Lokal app, or you can confirm with them now.
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-5xl font-mono font-bold tracking-widest text-amber-900">
                {collection.household_confirm_code}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(collection.household_confirm_code || '')}
                className="text-amber-900 hover:bg-amber-100 p-2 rounded-lg"
                aria-label="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-amber-800">Receipt {collection.receipt_number}</p>
            <Button variant="outline" onClick={confirmNow}>
              <CheckCircle2 className="w-4 h-4" /> Confirm with household
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
