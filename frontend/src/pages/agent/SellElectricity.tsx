import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Zap, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kwh_amount: number | null;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const normalizePhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('27')) return '+' + d;
  if (d.startsWith('0')) return '+27' + d.slice(1);
  return d ? '+27' + d : '';
};

export default function SellElectricityPage() {
  const [packages, setPackages] = useState<ElectricityPackage[]>([]);
  const [phone, setPhone] = useState('');
  const [meterId, setMeterId] = useState('');
  const [cash, setCash] = useState('');
  const [pkg, setPkg] = useState<ElectricityPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ commission: number; reference: string; kwh: number } | null>(null);

  useEffect(() => {
    api.getElectricityPackages().then((r) => {
      if (r.data?.packages) setPackages(r.data.packages);
      setLoading(false);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pkg || !phone) return setError('Pick a package and enter a phone.');
    const c = parseFloat(cash);
    if (isNaN(c) || c < pkg.price) return setError(`Cash received must be ≥ ${fmt(pkg.price)}.`);
    setProcessing(true);
    const r = await api.processAgentTransaction({
      customer_phone: normalizePhone(phone),
      product_type: 'ELECTRICITY',
      package_id: pkg.id,
      meter_id: meterId || undefined,
      cash_received: c,
    });
    setProcessing(false);
    if (r.error) return setError(r.error);
    if (r.data) setResult({
      commission: r.data.commission_earned,
      reference: r.data.reference,
      kwh: pkg.kwh_amount || 0,
    });
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <PageHeader title="Sale complete" back="/agent" />
        <Card className="border-success bg-success-soft">
          <CardContent className="p-6 text-center space-y-3">
            <Check className="w-8 h-8 mx-auto text-emerald-700" />
            <p className="text-emerald-900 font-semibold">{result.kwh} kWh credited</p>
            <p className="text-xs text-emerald-800">Reference {result.reference} · Commission {fmt(result.commission)}</p>
            <Button size="sm" onClick={() => { setResult(null); setPhone(''); setCash(''); setPkg(null); setMeterId(''); }}>
              Sell another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sell electricity" description="Top up a customer's prepaid meter for cash." back="/agent" />

      <Card>
        <form onSubmit={submit}>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="field-label">Customer phone</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 81 234 5678" />
            </div>
            <div>
              <label className="field-label">Meter ID</label>
              <Input value={meterId} onChange={(e) => setMeterId(e.target.value)} placeholder="UUID of customer meter" />
              <p className="text-xs text-ink-muted mt-1">Find the meter from the customer's account.</p>
            </div>

            <div>
              <label className="field-label">Package</label>
              {loading ? (
                <p className="text-sm text-ink-muted">Loading…</p>
              ) : (
                <div className="grid gap-2">
                  {packages.map((p) => (
                    <label
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        pkg?.id === p.id ? 'border-accent-400 bg-accent-50/40' : 'border-surface-border hover:bg-surface-subtle',
                      )}
                    >
                      <input type="radio" className="sr-only" checked={pkg?.id === p.id} onChange={() => { setPkg(p); setCash(String(p.price)); }} />
                      <IconBadge icon={Zap} tone={pkg?.id === p.id ? 'accent' : 'neutral'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-ink-muted">{p.kwh_amount} kWh</p>
                      </div>
                      <p className="text-sm font-semibold">{fmt(p.price)}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Cash received</label>
              <Input type="number" inputMode="decimal" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={processing || !pkg || !phone}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {pkg ? `Sell ${pkg.kwh_amount} kWh for ${fmt(pkg.price)}` : 'Sell electricity'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
