import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { CreditCard, Smartphone, Building, Loader2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESETS = [50, 100, 200, 500, 1000];

const METHODS = [
  { id: 'CARD',  label: 'Card',          desc: 'Visa / Mastercard',         icon: CreditCard },
  { id: 'EFT',   label: 'EFT / SnapScan', desc: 'Bank transfer',             icon: Building },
  { id: 'AGENT', label: 'Agent cash',    desc: 'Pay an agent in person',    icon: Smartphone },
] as const;

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function TopupPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CARD' | 'EFT' | 'AGENT'>('CARD');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = parseFloat(amount);
    if (isNaN(v) || v < 10) return setError('Minimum top-up is R10.');
    setLoading(true);
    const r = await api.initiateTopup(v, method);
    setLoading(false);
    if (r.error) return setError(r.error);
    if ((r.data as any)?.payment_url) {
      window.location.href = (r.data as any).payment_url;
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-success-soft text-emerald-700 grid place-items-center">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">Top-up initiated</h3>
            <p className="text-sm text-ink-muted">Your wallet will be credited once the payment clears.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/user')}>Back to home</Button>
              <Button onClick={() => navigate('/user/history')}>See history</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Top up wallet" description="Add funds to spend on WiFi, electricity, and transfers." back="/user" />

      <Card>
        <form onSubmit={submit}>
          <CardContent className="p-5 space-y-5">
            <div>
              <label className="field-label">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm">R</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={cn(
                      'pill-neutral hover:bg-brand-50 hover:text-brand-700',
                      amount === String(p) && 'bg-brand-50 text-brand-700',
                    )}
                  >
                    {fmt(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Payment method</label>
              <div className="grid gap-2">
                {METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      method === m.id
                        ? 'border-accent-400 bg-accent-50/40'
                        : 'border-surface-border hover:bg-surface-subtle',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={method === m.id}
                      onChange={() => setMethod(m.id)}
                    />
                    <IconBadge icon={m.icon} tone={method === m.id ? 'accent' : 'neutral'} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-ink-muted">{m.desc}</p>
                    </div>
                    {method === m.id && <Check className="w-4 h-4 text-accent-600" />}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading || !amount} size="lg" className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {amount ? `Top up ${fmt(parseFloat(amount) || 0)}` : 'Top up'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
