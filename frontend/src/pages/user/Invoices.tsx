import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { Invoice, Household } from '@/services/api';
import { ArrowLeft, Loader2, Receipt, Home } from 'lucide-react';

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

  const totalDue = invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/user')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">My invoices</h1>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 mt-4">
          <p className="text-green-100 text-xs">Total outstanding</p>
          <p className="text-3xl font-bold">R{totalDue.toFixed(2)}</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {households.length > 0 && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Connected households</h3>
              {households.map((h) => (
                <div key={h.id} className="flex justify-between items-center py-1 text-sm">
                  <span className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-600" />
                    {h.account_number} · {h.suburb || h.city || '—'}
                  </span>
                  <span className="text-gray-500">R{Number(h.current_balance).toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : invoices.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No invoices yet</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((inv) => (
            <Card
              key={inv.id}
              className="bg-white border-0 shadow-lg rounded-2xl cursor-pointer"
              onClick={() => navigate(`/user/invoices/${inv.id}`)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{inv.invoice_number}</p>
                    <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Number(inv.kwh_consumed).toFixed(2)} kWh · due {new Date(inv.due_date).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-base font-bold">R{Number(inv.total_amount).toFixed(2)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
