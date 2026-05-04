import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { IconBadge, EmptyState } from '@/components/Stat';
import api, { Household } from '@/services/api';
import { Zap, Loader2, Check, Home as HomeIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  package_type: string;
  validity_days: number | null;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function SellElectricityPage() {
  const [, setPackages] = useState<ElectricityPackage[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [search, setSearch] = useState('');
  const [pkg, setPkg] = useState<ElectricityPackage | null>(null);
  const [hh, setHh] = useState<Household | null>(null);
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ days: number; reference: string } | null>(null);

  useEffect(() => {
    Promise.all([api.getElectricityPackages(), api.listHouseholds(undefined, true)]).then(([p, h]) => {
      if (p.data?.packages) {
        setPackages(p.data.packages as any);
        if (p.data.packages.length === 1) setPkg(p.data.packages[0] as any);  // auto-select if only one
      }
      if (h.data) setHouseholds(h.data);
      setLoading(false);
    });
  }, []);

  const filtered = households.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.account_number.toLowerCase().includes(q) ||
      (h.primary_contact_name || '').toLowerCase().includes(q) ||
      (h.primary_contact_phone || '').includes(q)
    );
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pkg) return setError('Pick a package');
    if (!hh) return setError('Pick a household');
    if (!hh.meter_id) return setError('This household has no meter linked. Edit the household first.');
    const c = parseFloat(cash);
    if (isNaN(c) || c < pkg.price) return setError(`Cash received must be ≥ ${fmt(pkg.price)}.`);

    setProcessing(true);
    const r = await api.processAgentTransaction({
      customer_phone: hh.primary_contact_phone,
      product_type: 'ELECTRICITY',
      package_id: pkg.id,
      meter_id: hh.meter_id,
      cash_received: c,
    });
    setProcessing(false);
    if (r.error) return setError(r.error);
    if (r.data) setResult({ days: pkg.validity_days || 30, reference: r.data.reference });
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <PageHeader title="Sale complete" back="/agent" />
        <Card className="border-success bg-success-soft">
          <CardContent className="p-6 text-center space-y-3">
            <Check className="w-8 h-8 mx-auto text-emerald-700" />
            <p className="text-emerald-900 font-semibold">{result.days} days of unlimited power added</p>
            <p className="text-xs text-emerald-800">Meter {hh?.meter_number} for {hh?.primary_contact_name}</p>
            <p className="text-xs text-emerald-800">Reference {result.reference}</p>
            <Button size="sm" onClick={() => { setResult(null); setHh(null); setCash(''); }}>
              Sell another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sell electricity" description={`Top up a household's meter for cash.`} back="/agent" />

      {pkg && (
        <Card>
          <CardContent className="p-5 flex items-start gap-3">
            <IconBadge icon={Zap} tone="warning" />
            <div className="flex-1">
              <p className="font-semibold">{pkg.name}</p>
              <p className="text-xs text-ink-muted">{pkg.description}</p>
              {pkg.validity_days && <p className="text-xs text-ink-muted mt-1">{pkg.validity_days} days unlimited</p>}
            </div>
            <p className="text-xl font-semibold">{fmt(pkg.price)}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <form onSubmit={submit}>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="field-label">Household</label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <Input
                  className="pl-9"
                  placeholder="Search account, name or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {loading ? (
                <p className="text-sm text-ink-muted text-center py-3">Loading…</p>
              ) : filtered.length === 0 ? (
                <EmptyState icon={HomeIcon} title="No households" description="Capture a household first." />
              ) : (
                <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                  {filtered.map((h) => (
                    <label
                      key={h.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        hh?.id === h.id ? 'border-accent-400 bg-accent-50/40' : 'border-surface-border hover:bg-surface-subtle',
                      )}
                    >
                      <input type="radio" className="sr-only" checked={hh?.id === h.id} onChange={() => setHh(h)} />
                      <HomeIcon className="w-5 h-5 text-ink-soft shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{h.primary_contact_name}</p>
                        <p className="text-xs text-ink-muted">{h.account_number} · {h.primary_contact_phone}</p>
                        {h.meter_number ? (
                          <p className="text-xs text-ink-muted">Meter {h.meter_number}</p>
                        ) : (
                          <Badge variant="warning">No meter</Badge>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Cash received</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={pkg ? String(pkg.price) : '0.00'}
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={processing || !pkg || !hh}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {pkg ? `Sell for ${fmt(pkg.price)}` : 'Sell electricity'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
