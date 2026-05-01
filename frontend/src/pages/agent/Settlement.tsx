import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api, { CashCollection, CommunityOffice, Settlement } from '@/services/api';
import { Loader2, Coins, CheckCircle2 } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

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
      if (o.data.length && !officeId) setOfficeId(o.data[0].id);
    }
    if (c.data) setUnsettled(c.data);
    if (coh.data) {
      setCashOnHand(coh.data);
      setDeclared(coh.data.amount.toFixed(2));
    }
    if (h.data) setHistory(h.data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    setError(null);
    if (!officeId) return setError('Pick an office');
    const amt = parseFloat(declared);
    if (isNaN(amt) || amt <= 0) return setError('Declared amount must be greater than 0');
    setSubmitting(true);
    const r = await api.submitSettlement({ community_office_id: officeId, declared_amount: amt });
    setSubmitting(false);
    if (r.error) return setError(r.error);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlement"
        description="Hand over collected cash at the community office. Both parties confirm to finalise."
        back="/agent"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="accent"  icon={Coins} label="Cash on hand" value={fmt(cashOnHand.amount)} hint={`${cashOnHand.num_collections} collection(s)`} />
        <StatCard tone="brand"   label="Pending count" value={unsettled.length} />
        <StatCard tone="success" label="Settlements done" value={history.filter((s) => s.status === 'CONFIRMED').length} />
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="section-title">Submit settlement</h3>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="field-label">Community office</label>
              <select className="field" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Declared cash (R)</label>
              <Input type="number" step="0.01" value={declared} onChange={(e) => setDeclared(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            variant="accent"
            className="w-full"
            disabled={submitting || cashOnHand.num_collections === 0}
            onClick={submit}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            Submit
          </Button>
          <p className="text-xs text-ink-muted text-center">The office must confirm the count before it's finalised.</p>
        </CardContent>
      </Card>

      {unsettled.length > 0 && (
        <section>
          <h3 className="section-title mb-3">Pending collections</h3>
          <div className="grid gap-2">
            {unsettled.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{c.receipt_number}</p>
                    <p className="text-xs text-ink-muted">Inv {c.invoice_number || '—'}</p>
                  </div>
                  <p className="text-sm font-semibold">{fmt(c.amount)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="section-title mb-3">History</h3>
        {history.length === 0 ? (
          <EmptyState title="No settlements yet" description="Once you submit a settlement, it'll appear here." />
        ) : (
          <div className="grid gap-2">
            {history.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:shadow-pop transition-shadow" onClick={() => navigate(`/agent/settlements/${s.id}`)}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{s.reference_number}</p>
                      <Badge variant={s.status === 'CONFIRMED' ? 'success' : s.status === 'DISPUTED' ? 'destructive' : 'warning'}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted">{s.community_office_name || '—'} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(s.declared_amount)}</p>
                    {s.status === 'CONFIRMED' && (
                      <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> confirmed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
