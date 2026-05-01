import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api from '@/services/api';
import { Wallet, AlertTriangle, Loader2, Plus, Check } from 'lucide-react';

interface FloatInfo {
  float_balance: number;
  low_float_threshold: number;
  is_low: boolean;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const PRESETS = [200, 500, 1000, 2000, 5000];

export default function FloatPage() {
  const [info, setInfo] = useState<FloatInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CARD' | 'EFT'>('CARD');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getAgentFloat();
    if (r.data) setInfo(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = parseFloat(amount);
    if (isNaN(v) || v < 100) return setError('Minimum top-up is R100.');
    setProcessing(true);
    const r = await api.topupFloat(v, method);
    setProcessing(false);
    if (r.error) return setError(r.error);
    setSuccess(true);
    setAmount('');
    load();
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Float" description="Pre-funded balance you draw on when serving customers." back="/agent" />

      {info?.is_low && (
        <Card className="border-amber-200 bg-warning-soft">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Float is low</p>
              <p className="text-xs text-amber-800">Top up before your next customer transactions.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="brand"   icon={Wallet} label="Float balance" value={loading ? '—' : fmt(info?.float_balance || 0)} />
        <StatCard tone="warning"               label="Low threshold" value={fmt(info?.low_float_threshold || 0)} />
      </div>

      {success && (
        <Card className="border-success bg-success-soft">
          <CardContent className="p-4 flex items-center gap-2 text-emerald-900 text-sm">
            <Check className="w-4 h-4" /> Float topped up.
          </CardContent>
        </Card>
      )}

      <Card>
        <form onSubmit={submit}>
          <CardContent className="p-5 space-y-4">
            <h3 className="section-title">Top up float</h3>
            <div>
              <label className="field-label">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm">R</span>
                <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setAmount(String(p))} className={amount === String(p) ? 'pill-brand' : 'pill-neutral hover:bg-brand-50 hover:text-brand-700'}>
                    {fmt(p)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['CARD', 'EFT'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={`p-3 rounded-xl border text-sm font-medium ${method === m ? 'border-accent-400 bg-accent-50/40 text-accent-700' : 'border-surface-border text-ink-soft'}`}>
                  {m === 'CARD' ? 'Card' : 'EFT'}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={processing || !amount} className="w-full">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Top up
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
