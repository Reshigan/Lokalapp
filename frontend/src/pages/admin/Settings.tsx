import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { CreditCard, Building2, Cpu, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'gateways' | 'banks' | 'devices';

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('gateways');
  const [gateways, setGateways] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  // forms
  const [gw, setGw] = useState({ name: '', provider: 'PAYFAST', merchant_id: '', merchant_key: '', is_sandbox: 1 });
  const [bk, setBk] = useState({ bank_name: '', account_holder: '', account_number: '', branch_code: '' });
  const [dv, setDv] = useState({ device_id: '', device_type: 'METER', location: '' });

  const load = async () => {
    setLoading(true);
    const [g, b, d] = await Promise.all([
      api.getPaymentGateways(),
      api.getBankAccounts(),
      api.getIoTDevices(),
    ]);
    if (g.data) setGateways(g.data as any);
    if (b.data) setBanks(b.data as any);
    if (d.data) setDevices(d.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (tab === 'gateways') await api.createPaymentGateway(gw as any);
    if (tab === 'banks')    await api.createBankAccount(bk as any);
    if (tab === 'devices')  await api.createIoTDevice(dv as any);
    setBusy(false);
    setShowForm(false);
    setGw({ name: '', provider: 'PAYFAST', merchant_id: '', merchant_key: '', is_sandbox: 1 });
    setBk({ bank_name: '', account_holder: '', account_number: '', branch_code: '' });
    setDv({ device_id: '', device_type: 'METER', location: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    if (tab === 'gateways') await api.deletePaymentGateway(id);
    if (tab === 'banks')    await api.deleteBankAccount(id);
    if (tab === 'devices')  await api.deleteIoTDevice(id);
    load();
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'gateways', label: 'Payment gateways', count: gateways.length },
    { id: 'banks',    label: 'Bank accounts',    count: banks.length },
    { id: 'devices',  label: 'IoT devices',      count: devices.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Payment gateways, bank accounts, and IoT devices."
        back="/admin"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New'}
          </Button>
        }
      />

      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl w-max">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium',
              tab === t.id ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={create}>
            <CardContent className="p-5 space-y-3">
              {tab === 'gateways' && (
                <>
                  <Input placeholder="Name" value={gw.name} onChange={(e) => setGw({ ...gw, name: e.target.value })} />
                  <Input placeholder="Provider (PAYFAST, STRIPE…)" value={gw.provider} onChange={(e) => setGw({ ...gw, provider: e.target.value })} />
                  <Input placeholder="Merchant ID" value={gw.merchant_id} onChange={(e) => setGw({ ...gw, merchant_id: e.target.value })} />
                  <Input placeholder="Merchant key" value={gw.merchant_key} onChange={(e) => setGw({ ...gw, merchant_key: e.target.value })} />
                  <label className="text-xs text-ink-soft flex items-center gap-2">
                    <input type="checkbox" checked={gw.is_sandbox === 1} onChange={(e) => setGw({ ...gw, is_sandbox: e.target.checked ? 1 : 0 })} />
                    Sandbox mode
                  </label>
                </>
              )}
              {tab === 'banks' && (
                <>
                  <Input placeholder="Bank name" value={bk.bank_name} onChange={(e) => setBk({ ...bk, bank_name: e.target.value })} />
                  <Input placeholder="Account holder" value={bk.account_holder} onChange={(e) => setBk({ ...bk, account_holder: e.target.value })} />
                  <Input placeholder="Account number" value={bk.account_number} onChange={(e) => setBk({ ...bk, account_number: e.target.value })} />
                  <Input placeholder="Branch code" value={bk.branch_code} onChange={(e) => setBk({ ...bk, branch_code: e.target.value })} />
                </>
              )}
              {tab === 'devices' && (
                <>
                  <Input placeholder="Device ID" value={dv.device_id} onChange={(e) => setDv({ ...dv, device_id: e.target.value })} />
                  <Input placeholder="Device type" value={dv.device_type} onChange={(e) => setDv({ ...dv, device_type: e.target.value })} />
                  <Input placeholder="Location" value={dv.location} onChange={(e) => setDv({ ...dv, location: e.target.value })} />
                </>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : tab === 'gateways' ? (
        gateways.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payment gateways" description="Add one to enable customer payments." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {gateways.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <IconBadge icon={CreditCard} tone="brand" size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{g.name}</p>
                      {g.is_sandbox ? <Badge variant="warning">sandbox</Badge> : <Badge variant="success">live</Badge>}
                      {!g.is_active && <Badge variant="secondary">inactive</Badge>}
                    </div>
                    <p className="text-xs text-ink-muted">{g.provider} · {g.merchant_id}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(g.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'banks' ? (
        banks.length === 0 ? (
          <EmptyState icon={Building2} title="No bank accounts" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {banks.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <IconBadge icon={Building2} tone="brand" size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{b.bank_name}</p>
                    <p className="text-xs text-ink-muted">{b.account_holder} · {b.account_number}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(b.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : devices.length === 0 ? (
        <EmptyState icon={Cpu} title="No IoT devices" />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {devices.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <IconBadge icon={Cpu} tone="accent" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{d.device_id}</p>
                    <Badge variant={d.status === 'ONLINE' ? 'success' : 'secondary'}>{d.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted">{d.device_type} · {d.location || '—'}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(d.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
