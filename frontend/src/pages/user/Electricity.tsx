import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Zap, Plus, Loader2, Check, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kwh_amount: number | null;
}

interface Meter {
  id: string;
  meter_number: string;
  address: string | null;
  kwh_balance: number;
  status: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function ElectricityPage() {
  const [tab, setTab] = useState<'buy' | 'meters'>('buy');
  const [packages, setPackages] = useState<ElectricityPackage[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ kwh: number; balance: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNum, setNewNum] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, m] = await Promise.all([api.getElectricityPackages(), api.getMeters()]);
    if (p.data?.packages) setPackages(p.data.packages);
    if (m.data?.meters) {
      setMeters(m.data.meters);
      if (m.data.meters.length && !selectedMeter) setSelectedMeter(m.data.meters[0]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const buy = async (pkg: ElectricityPackage) => {
    if (!selectedMeter) return alert('Pick a meter first.');
    setPurchasing(pkg.id);
    const r = await api.purchaseElectricity(pkg.id, selectedMeter.id);
    setPurchasing(null);
    if (r.error) return alert(r.error);
    if (r.data) {
      setSuccess({ kwh: r.data.kwh_purchased, balance: r.data.new_kwh_balance });
      load();
    }
  };

  const addMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const r = await api.registerMeter(newNum, newAddr || undefined);
    setAdding(false);
    if (r.error) return alert(r.error);
    setShowAdd(false);
    setNewNum(''); setNewAddr('');
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Electricity" description="Buy prepaid units or manage your meters." back="/user" />

      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl w-max">
        {(['buy', 'meters'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium',
              tab === t ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t === 'buy' ? 'Buy units' : 'My meters'}
          </button>
        ))}
      </div>

      {success && (
        <Card className="border-success bg-success-soft">
          <CardContent className="p-5 text-center">
            <Check className="w-6 h-6 mx-auto text-emerald-700 mb-2" />
            <p className="text-sm text-emerald-900">
              Purchased <strong>{success.kwh.toFixed(0)} kWh</strong>. Meter balance: <strong>{success.balance.toFixed(2)} kWh</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === 'buy' ? (
        <>
          {/* Meter picker */}
          {meters.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No meters registered"
              description="Add a meter on the “My meters” tab to buy electricity."
              action={<Button onClick={() => setTab('meters')}>Manage meters</Button>}
            />
          ) : (
            <Card>
              <CardContent className="p-5 space-y-2">
                <h3 className="section-title">Sending to</h3>
                <div className="grid gap-2">
                  {meters.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        selectedMeter?.id === m.id ? 'border-accent-400 bg-accent-50/40' : 'border-surface-border hover:bg-surface-subtle',
                      )}
                    >
                      <input type="radio" className="sr-only" checked={selectedMeter?.id === m.id} onChange={() => setSelectedMeter(m)} />
                      <Gauge className="w-5 h-5 text-ink-soft" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.meter_number}</p>
                        <p className="text-xs text-ink-muted">{m.address || 'No address'} · {Number(m.kwh_balance).toFixed(2)} kWh</p>
                      </div>
                      <Badge variant={m.status === 'ON' ? 'success' : 'destructive'}>{m.status}</Badge>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-12 text-ink-muted">Loading…</div>
          ) : packages.length === 0 ? (
            <EmptyState icon={Zap} title="No electricity packages available" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {packages.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-5 flex items-start gap-3">
                    <IconBadge icon={Zap} tone="warning" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-muted">{p.description}</p>
                      {p.kwh_amount && (
                        <p className="text-sm text-ink-soft mt-2">{p.kwh_amount} kWh</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-semibold">{fmt(p.price)}</p>
                        <Button size="sm" disabled={!selectedMeter || purchasing === p.id} onClick={() => buy(p)}>
                          {purchasing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4" /> {showAdd ? 'Cancel' : 'Add meter'}
          </Button>

          {showAdd && (
            <Card>
              <form onSubmit={addMeter}>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <label className="field-label">Meter number</label>
                    <Input value={newNum} onChange={(e) => setNewNum(e.target.value)} placeholder="MTR-12345" />
                  </div>
                  <div>
                    <label className="field-label">Address (optional)</label>
                    <Input value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={adding || !newNum}>
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save meter
                  </Button>
                </CardContent>
              </form>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-12 text-ink-muted">Loading…</div>
          ) : meters.length === 0 ? (
            <EmptyState icon={Gauge} title="No meters yet" description="Add your first meter to start buying electricity." />
          ) : (
            <div className="grid gap-2">
              {meters.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <IconBadge icon={Gauge} tone="brand" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{m.meter_number}</p>
                      <p className="text-xs text-ink-muted">{m.address || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{Number(m.kwh_balance).toFixed(2)} kWh</p>
                      <Badge variant={m.status === 'ON' ? 'success' : 'destructive'}>{m.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
