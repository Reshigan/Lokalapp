import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { Invoice } from '@/services/api';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';

export default function InvoiceDetailUserPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api.getInvoice(id);
      if (r.data) setInvoice(r.data);
    })();
  }, [id]);

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/user/invoices')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{invoice.invoice_number}</h1>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 mt-4">
          <p className="text-green-100 text-xs">Total</p>
          <p className="text-3xl font-bold">R{Number(invoice.total_amount).toFixed(2)}</p>
          <div className="flex items-center justify-between mt-2 text-xs">
            <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'}>{invoice.status}</Badge>
            <span className="text-green-100">Due {new Date(invoice.due_date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Period</h3>
            <p className="text-sm text-gray-700">
              {new Date(invoice.period_start).toLocaleDateString()} – {new Date(invoice.period_end).toLocaleDateString()}
            </p>
            <div className="flex justify-between text-sm mt-3">
              <div>
                <p className="text-gray-500 text-xs">Previous</p>
                <p>{Number(invoice.previous_reading_kwh).toFixed(2)} kWh</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Current</p>
                <p>{Number(invoice.current_reading_kwh).toFixed(2)} kWh</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Used</p>
                <p className="font-semibold">{Number(invoice.kwh_consumed).toFixed(2)} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            const base = (import.meta.env.VITE_API_URL as string) || '';
            const token = localStorage.getItem('access_token');
            // Open receipt in a new tab. We pass the bearer token via a fetch
            // and convert to blob URL because <a target=_blank> can't carry headers.
            fetch(`${base}/billing/invoices/${invoice.id}/receipt`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
              .then((r) => r.text())
              .then((html) => {
                const blob = new Blob([html], { type: 'text/html' });
                window.open(URL.createObjectURL(blob), '_blank');
              });
          }}
        >
          <FileText className="w-4 h-4 mr-2" /> Open printable receipt
        </Button>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Charges</h3>
            <ul className="text-sm space-y-1">
              {invoice.line_items.map((li, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-gray-600 truncate">{li.label}</span>
                  <span className="text-gray-900">R{Number(li.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>R{Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            {Number(invoice.amount_paid || 0) > 0 && (
              <div className="flex justify-between text-xs text-green-700 mt-1">
                <span>Paid</span>
                <span>R{Number(invoice.amount_paid).toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
