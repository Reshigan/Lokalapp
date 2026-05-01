import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, EmptyState } from '@/components/Stat';
import api from '@/services/api';
import { TrendingUp, Wallet, Loader2, Check, ArrowDown } from 'lucide-react';

interface Commission {
  balance: number;
  pending: number;
  total_earned: number;
  transactions: Array<{ id: string; commission: number; description: string; created_at: string }>;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function CommissionsPage() {
  const [data, setData] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showW, setShowW] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getAgentCommissions();
    if (r.data) setData(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = parseFloat(amount);
    if (isNaN(v) || v <= 0) return setError('Enter an amount.');
    setBusy(true);
    const r = await api.withdrawCommission(v, 'WALLET');
    setBusy(false);
    if (r.error) return setError(r.error);
    setSuccess(true);
    setShowW(false);
    setAmount('');
    load();
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Earn on every sale. Withdraw to your wallet anytime." back="/agent" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   icon={Wallet}     label="Available"     value={fmt(data?.balance || 0)} />
        <StatCard tone="warning"                    label="Pending"       value={fmt(data?.pending || 0)} />
        <StatCard tone="success" icon={TrendingUp} label="Total earned"   value={fmt(data?.total_earned || 0)} />
      </div>

      <Button onClick={() => setShowW(!showW)} disabled={!data || data.balance <= 0}>
        <ArrowDown className="w-4 h-4" /> {showW ? 'Cancel' : 'Withdraw to wallet'}
      </Button>

      {success && (
        <Card className="border-success bg-success-soft">
          <CardContent className="p-4 flex items-center gap-2 text-emerald-900 text-sm">
            <Check className="w-4 h-4" /> Commission withdrawn to your wallet.
          </CardContent>
        </Card>
      )}

      {showW && (
        <Card>
          <form onSubmit={withdraw}>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="field-label">Amount (max {fmt(data?.balance || 0)})</label>
                <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy || !amount}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      <section>
        <h3 className="section-title mb-3">History</h3>
        {loading ? (
          <div className="text-center py-12 text-ink-muted">Loading…</div>
        ) : !data || data.transactions.length === 0 ? (
          <EmptyState title="No commissions yet" description="They appear after each customer transaction." />
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-surface-border">
              {data.transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-ink-muted">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <p className={t.commission >= 0 ? 'text-emerald-600 text-sm font-semibold' : 'text-ink text-sm font-semibold'}>
                    {t.commission >= 0 ? '+' : ''}{fmt(t.commission)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
