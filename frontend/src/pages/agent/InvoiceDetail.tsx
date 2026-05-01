import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { Invoice, CashCollection } from '@/services/api';
import { ArrowLeft, Loader2, Receipt, Coins, CheckCircle2 } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [collection, setCollection] = useState<CashCollection | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const r = await api.getInvoice(id);
    if (r.data) setInvoice(r.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const collectCash = async () => {
    if (!invoice) return;
    setError(null);
    setCreating(true);
    const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid || 0);
    const { data, error: err } = await api.createCollection({
      invoice_id: invoice.id,
      amount: outstanding,
    });
    setCreating(false);
    if (err) {
      setError(err);
      return;
    }
    setCollection(data!);
  };

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid || 0);
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Invoice</h1>
        </div>
        <p className="text-indigo-100 text-sm">{invoice.invoice_number}</p>
        <div className="bg-white/10 rounded-2xl p-4 mt-4">
          <p className="text-indigo-200 text-xs">Total</p>
          <p className="text-3xl font-bold">R{Number(invoice.total_amount).toFixed(2)}</p>
          <div className="flex items-center justify-between mt-2 text-xs">
            <Badge variant={isPaid ? 'default' : 'secondary'}>{invoice.status}</Badge>
            <span className="text-indigo-100">Due {new Date(invoice.due_date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Reading</h3>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-500 text-xs">Previous</p>
                <p>{Number(invoice.previous_reading_kwh).toFixed(2)} kWh</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Current</p>
                <p>{Number(invoice.current_reading_kwh).toFixed(2)} kWh</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Consumed</p>
                <p className="font-semibold">{Number(invoice.kwh_consumed).toFixed(2)} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Breakdown</h3>
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

        {!isPaid && !collection && (
          <Button onClick={collectCash} disabled={creating} className="w-full bg-green-600 hover:bg-green-700 rounded-xl">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
            Collect cash R{outstanding.toFixed(2)}
          </Button>
        )}
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {collection && (
          <Card className="bg-amber-50 border-amber-200 rounded-2xl">
            <CardContent className="p-4 space-y-3 text-center">
              <Receipt className="w-10 h-10 mx-auto text-amber-600" />
              <h3 className="font-bold text-amber-900">Awaiting household confirmation</h3>
              <p className="text-sm text-amber-800">
                Show this code to the household. They confirm in their app, or you can confirm with them in front of you.
              </p>
              <p className="text-4xl font-mono font-bold tracking-widest text-amber-900">{collection.household_confirm_code}</p>
              <p className="text-xs text-amber-700">Receipt {collection.receipt_number}</p>
              <Button
                variant="outline"
                className="rounded-xl border-amber-600 text-amber-900"
                onClick={async () => {
                  if (!collection.household_confirm_code) return;
                  const r = await api.confirmCollection(collection.id, collection.household_confirm_code);
                  if (r.data) {
                    setCollection(r.data);
                    await load();
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm with household now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
