import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { Household, Invoice } from '@/services/api';
import { ArrowLeft, Loader2, Zap, Receipt, Coins } from 'lucide-react';

export default function HouseholdDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const h = await api.getHousehold(id);
      if (h.data) setHousehold(h.data);
      const inv = await api.listInvoices({ household_id: id });
      if (inv.data) setInvoices(inv.data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!household) {
    return <div className="p-6">Not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/agent/households')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{household.primary_contact_name}</h1>
        </div>
        <p className="text-indigo-100 text-sm">Account {household.account_number}</p>
        <div className="bg-white/10 rounded-2xl p-4 mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-indigo-200 text-xs">Outstanding</p>
            <p className="text-2xl font-bold">R{Number(household.current_balance).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs">Last reading</p>
            <p className="text-2xl font-bold">{Number(household.last_reading_kwh).toFixed(0)} kWh</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl" onClick={() => navigate(`/agent/households/${id}/reading`)}>
            <Zap className="w-4 h-4 mr-2" /> Capture reading
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/agent/households/${id}/edit`)}>
            Edit details
          </Button>
        </div>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Master data</h3>
            <dl className="text-sm space-y-1 text-gray-700">
              <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{household.primary_contact_phone}</dd></div>
              {household.primary_contact_id_number && (
                <div className="flex justify-between"><dt className="text-gray-500">ID</dt><dd>{household.primary_contact_id_number}</dd></div>
              )}
              {household.email && (
                <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{household.email}</dd></div>
              )}
              {household.erf_number && (
                <div className="flex justify-between"><dt className="text-gray-500">Erf</dt><dd>{household.erf_number}</dd></div>
              )}
              {household.street_address && (
                <div className="flex justify-between gap-2"><dt className="text-gray-500">Address</dt><dd className="text-right truncate">{household.street_address}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-gray-500">Tariff</dt><dd>{household.tariff_name || '—'}</dd></div>
              {household.meter_number && (
                <div className="flex justify-between"><dt className="text-gray-500">Meter</dt><dd>{household.meter_number}</dd></div>
              )}
            </dl>
          </CardContent>
        </Card>

        <h3 className="text-sm font-semibold text-gray-700 mt-4 ml-1">Invoices</h3>
        {invoices.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 text-center text-sm text-gray-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No invoices yet
            </CardContent>
          </Card>
        ) : (
          invoices.map((inv) => (
            <Card key={inv.id} className="bg-white border-0 shadow-lg rounded-2xl cursor-pointer" onClick={() => navigate(`/agent/invoices/${inv.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{inv.invoice_number}</p>
                    <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Number(inv.kwh_consumed).toFixed(2)} kWh · {new Date(inv.issue_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">R{Number(inv.total_amount).toFixed(2)}</p>
                  {inv.status !== 'PAID' && (
                    <span className="text-xs text-orange-600 inline-flex items-center gap-1"><Coins className="w-3 h-3" /> due</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
