import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Wifi, Database, Clock, Loader2, Copy, Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
const fmtHours = (h: number) => h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`;
const normalizePhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('27')) return '+' + d;
  if (d.startsWith('0')) return '+27' + d.slice(1);
  return d ? '+27' + d : '';
};

export default function SellWiFiPage() {
  const [packages, setPackages] = useState<WiFiPackage[]>([]);
  const [phone, setPhone] = useState('');
  const [cash, setCash] = useState('');
  const [pkg, setPkg] = useState<WiFiPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ voucher_code: string; commission: number; reference: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getWiFiPackages().then((r) => {
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
      product_type: 'WIFI',
      package_id: pkg.id,
      cash_received: c,
    });
    setProcessing(false);
    if (r.error) return setError(r.error);
    if (r.data) setResult({
      voucher_code: r.data.voucher_code || '',
      commission: r.data.commission_earned,
      reference: r.data.reference,
    });
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <PageHeader title="Sale complete" back="/agent" />
        <Card className="border-success bg-success-soft">
          <CardContent className="p-6 text-center space-y-3">
            <Check className="w-8 h-8 mx-auto text-emerald-700" />
            <p className="text-sm text-emerald-900">WiFi voucher sold. Share with the customer.</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono bg-white px-3 py-2 rounded-lg border border-emerald-200">{result.voucher_code}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(result.voucher_code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-emerald-800">Reference {result.reference} · Commission {fmt(result.commission)}</p>
            <div className="flex justify-center gap-2 pt-2">
              {navigator.share && (
                <Button size="sm" variant="outline" onClick={() => navigator.share({ text: `Lokal voucher: ${result.voucher_code}` })}>
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              )}
              <Button size="sm" onClick={() => { setResult(null); setPhone(''); setCash(''); setPkg(null); }}>
                Sell another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sell WiFi" description="Sell a voucher to a customer for cash." back="/agent" />

      <Card>
        <form onSubmit={submit}>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="field-label">Customer phone</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 81 234 5678" />
            </div>

            <div>
              <label className="field-label">WiFi package</label>
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
                      <IconBadge icon={Wifi} tone={pkg?.id === p.id ? 'accent' : 'neutral'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-ink-muted flex items-center gap-3">
                          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {fmtMb(p.data_limit_mb)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtHours(p.validity_hours)}</span>
                        </p>
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
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {pkg ? `Sell for ${fmt(pkg.price)}` : 'Sell WiFi'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
