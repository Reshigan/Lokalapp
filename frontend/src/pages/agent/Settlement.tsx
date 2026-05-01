import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api, { CashCollection, CommunityOffice, Settlement } from '@/services/api';
import { ArrowLeft, Loader2, Coins, CheckCircle2 } from 'lucide-react';

export default function SettlementPage() {
  const navigate = useNavigate();
  const [offices, setOffices] = useState<CommunityOffice[]>([]);
  const [unsettled, setUnsettled] = useState<CashCollection[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [cashOnHand, setCashOnHand] = useState({ amount: 0, num_collections: 0 });
  const [officeId, setOfficeId] = useState('');
  const [declared, setDeclared] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [o, c, coh, h] = await Promise.all([
      api.listCommunityOffices(),
      api.myCollections(true),
      api.cashOnHand(),
      api.listSettlements({ mine_only: true }),
    ]);
    if (o.data) {
      setOffices(o.data);
      if (o.data.length > 0 && !officeId) setOfficeId(o.data[0].id);
    }
    if (c.data) setUnsettled(c.data);
    if (coh.data) {
      setCashOnHand(coh.data);
      setDeclared(coh.data.amount.toFixed(2));
    }
    if (h.data) setHistory(h.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setError(null);
    if (!officeId) {
      setError('Pick an office');
      return;
    }
    const amt = parseFloat(declared);
    if (isNaN(amt) || amt <= 0) {
      setError('Declared amount must be > 0');
      return;
    }
    setSubmitting(true);
    const { error: err } = await api.submitSettlement({
      community_office_id: officeId,
      declared_amount: amt,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    await load();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/agent')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settlement</h1>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 mt-4">
          <p className="text-emerald-100 text-xs">Cash on hand</p>
          <p className="text-3xl font-bold">R{cashOnHand.amount.toFixed(2)}</p>
          <p className="text-xs text-emerald-100 mt-1">{cashOnHand.num_collections} confirmed collection(s)</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Submit at community office</h3>
            <label className="text-xs text-gray-500">Office</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
            >
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
              ))}
            </select>
            <label className="text-xs text-gray-500">Declared cash amount (R)</label>
            <Input
              type="number"
              step="0.01"
              value={declared}
              onChange={(e) => setDeclared(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={submit} disabled={submitting || cashOnHand.num_collections === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
              Submit settlement
            </Button>
            <p className="text-xs text-gray-500 text-center">
              The office must confirm the count to finalise.
            </p>
          </CardContent>
        </Card>

        {unsettled.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 ml-1">Pending collections ({unsettled.length})</h3>
            {unsettled.map((c) => (
              <Card key={c.id} className="bg-white border-0 shadow-lg rounded-2xl">
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{c.receipt_number}</p>
                    <p className="text-xs text-gray-500">Inv {c.invoice_number || '—'}</p>
                  </div>
                  <p className="text-sm font-bold">R{Number(c.amount).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {history.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 ml-1 mt-4">History</h3>
            {history.map((s) => (
              <Card
                key={s.id}
                className="bg-white border-0 shadow-lg rounded-2xl cursor-pointer"
                onClick={() => navigate(`/agent/settlements/${s.id}`)}
              >
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{s.reference_number}</p>
                      <Badge variant={s.status === 'CONFIRMED' ? 'default' : s.status === 'DISPUTED' ? 'destructive' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{s.community_office_name || '—'} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R{Number(s.declared_amount).toFixed(2)}</p>
                    {s.status === 'CONFIRMED' && (
                      <span className="text-xs text-green-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> confirmed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
