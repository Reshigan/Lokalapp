import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import api, { Settlement } from '@/services/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function AdminSettlementsPage() {
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

  useEffect(() => { load(); }, []);

  const submitConfirm = async (id: string) => {
    setError(null);
    const amt = parseFloat(confirmAmount);
    if (isNaN(amt)) return setError('Confirmed amount must be a number');
    setBusy(true);
    const r = await api.confirmSettlement(id, amt, confirmNotes || undefined);
    setBusy(false);
    if (r.error) return setError(r.error);
    setConfirming(null);
    setConfirmAmount('');
    setConfirmNotes('');
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Confirm cash counts submitted by agents at community offices."
        back="/admin"
      />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No settlements yet" description="Agent submissions will appear here." />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{s.reference_number}</p>
                    <p className="text-xs text-ink-muted">{s.community_office_name || '—'} · {new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={s.status === 'CONFIRMED' ? 'success' : s.status === 'DISPUTED' ? 'destructive' : 'warning'}>{s.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Cell label="Declared"  value={fmt(s.declared_amount)} />
                  <Cell label="Expected"  value={fmt(s.expected_amount)} />
                  <Cell label="Confirmed" value={s.confirmed_amount !== null ? fmt(s.confirmed_amount) : '—'} />
                </div>
                <p className="text-xs text-ink-muted">{s.num_collections} collection(s)</p>

                {s.status === 'SUBMITTED' && (
                  confirming === s.id ? (
                    <div className="space-y-2 pt-2 border-t border-surface-border">
                      <Input type="number" step="0.01" placeholder="Confirmed cash count" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} />
                      <Input placeholder="Notes (optional)" value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex gap-2">
                        <Button onClick={() => submitConfirm(s.id)} disabled={busy} className="flex-1" variant="success">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Confirm
                        </Button>
                        <Button variant="outline" onClick={() => setConfirming(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="success" onClick={() => { setConfirming(s.id); setConfirmAmount(String(s.declared_amount)); }}>
                      Confirm count
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-ink-muted text-xs">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
