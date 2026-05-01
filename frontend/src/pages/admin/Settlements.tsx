import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api, { Settlement } from '@/services/api';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminSettlementsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await api.listSettlements({ mine_only: false });
    if (r.data) setItems(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submitConfirm = async (id: string) => {
    setError(null);
    const amt = parseFloat(confirmAmount);
    if (isNaN(amt)) {
      setError('Confirmed amount must be a number');
      return;
    }
    setBusy(true);
    const r = await api.confirmSettlement(id, amt, confirmNotes || undefined);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setConfirming(null);
    setConfirmAmount('');
    setConfirmNotes('');
    load();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settlements</h1>
        </div>
        <p className="text-purple-200 text-sm mt-1">Confirm cash counts submitted by agents.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-700" />
          </div>
        ) : items.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">No settlements yet</CardContent>
          </Card>
        ) : (
          items.map((s) => (
            <Card key={s.id} className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-sm">{s.reference_number}</p>
                  <Badge variant={s.status === 'CONFIRMED' ? 'default' : s.status === 'DISPUTED' ? 'destructive' : 'secondary'}>
                    {s.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{s.community_office_name || '—'} · {new Date(s.created_at).toLocaleString()}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-gray-500">Declared</p><p className="font-semibold">R{Number(s.declared_amount).toFixed(2)}</p></div>
                  <div><p className="text-gray-500">Expected</p><p className="font-semibold">R{Number(s.expected_amount).toFixed(2)}</p></div>
                  <div><p className="text-gray-500">Confirmed</p><p className="font-semibold">{s.confirmed_amount !== null ? `R${Number(s.confirmed_amount).toFixed(2)}` : '—'}</p></div>
                </div>
                <p className="text-xs text-gray-500">{s.num_collections} collection(s)</p>

                {s.status === 'SUBMITTED' && (
                  confirming === s.id ? (
                    <div className="space-y-2 border-t pt-2">
                      <Input
                        type="number" step="0.01"
                        placeholder="Confirmed cash count"
                        value={confirmAmount}
                        onChange={(e) => setConfirmAmount(e.target.value)}
                      />
                      <Input
                        placeholder="Notes (optional)"
                        value={confirmNotes}
                        onChange={(e) => setConfirmNotes(e.target.value)}
                      />
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex gap-2">
                        <Button onClick={() => submitConfirm(s.id)} disabled={busy} className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Confirm
                        </Button>
                        <Button variant="outline" onClick={() => setConfirming(null)} className="rounded-xl">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => { setConfirming(s.id); setConfirmAmount(String(s.declared_amount)); }} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                      Confirm count
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
