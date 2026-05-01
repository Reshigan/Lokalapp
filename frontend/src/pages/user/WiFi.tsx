import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Wifi, Database, Clock, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
}

interface WiFiVoucher {
  id: string;
  package_name: string | null;
  voucher_code: string;
  status: string;
  data_limit_mb: number;
  data_used_mb: number;
  data_remaining_mb: number;
  validity_hours: number;
  activated_at: string | null;
  expires_at: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
const fmtHours = (h: number) => h >= 24 ? `${Math.round(h / 24)} day${h >= 48 ? 's' : ''}` : `${h} h`;

export default function WiFiPage() {
  const [tab, setTab] = useState<'buy' | 'mine'>('buy');
  const [packages, setPackages] = useState<WiFiPackage[]>([]);
  const [vouchers, setVouchers] = useState<WiFiVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, v] = await Promise.all([api.getWiFiPackages(), api.getWiFiVouchers()]);
    if (p.data?.packages) setPackages(p.data.packages);
    if (v.data?.vouchers) setVouchers(v.data.vouchers);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buy = async (pkg: WiFiPackage) => {
    setPurchasing(pkg.id);
    const r = await api.purchaseWiFi(pkg.id);
    setPurchasing(null);
    if (r.error) return alert(r.error);
    if (r.data?.voucher_code) {
      setCode(r.data.voucher_code);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="WiFi" description="Buy data vouchers and manage active passes." back="/user" />

      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl w-max">
        {(['buy', 'mine'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium',
              tab === t ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t === 'buy' ? 'Buy data' : `My vouchers ${vouchers.length ? `(${vouchers.length})` : ''}`}
          </button>
        ))}
      </div>

      {code && (
        <Card className="border-success bg-success-soft">
          <CardContent className="p-5 text-center space-y-2">
            <Check className="w-6 h-6 mx-auto text-emerald-700" />
            <p className="text-sm text-emerald-900">Voucher purchased — share or activate it.</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono bg-white px-3 py-1.5 rounded-lg border border-emerald-200">{code}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : tab === 'buy' ? (
        packages.length === 0 ? (
          <EmptyState icon={Wifi} title="No WiFi packages available" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {packages.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-5 flex items-start gap-3">
                  <IconBadge icon={Wifi} tone="accent" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-ink-muted">{p.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ink-soft">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {fmtMb(p.data_limit_mb)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtHours(p.validity_hours)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-lg font-semibold">{fmt(p.price)}</p>
                      <Button size="sm" disabled={purchasing === p.id} onClick={() => buy(p)}>
                        {purchasing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : vouchers.length === 0 ? (
        <EmptyState icon={Wifi} title="No vouchers yet" description="Buy your first data pass on the “Buy” tab." />
      ) : (
        <div className="grid gap-2">
          {vouchers.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <IconBadge icon={Wifi} tone={v.status === 'ACTIVE' ? 'accent' : 'neutral'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{v.package_name || 'Voucher'}</p>
                    <Badge variant={v.status === 'ACTIVE' ? 'accent' : v.status === 'UNUSED' ? 'secondary' : 'destructive'}>{v.status}</Badge>
                  </div>
                  <code className="text-xs font-mono text-ink-muted">{v.voucher_code}</code>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {fmtMb(v.data_remaining_mb || v.data_limit_mb)} remaining
                    {v.expires_at && ` · expires ${new Date(v.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                {v.status === 'UNUSED' && (
                  <Button size="sm" variant="outline" onClick={async () => { await api.activateVoucher(v.id); load(); }}>
                    Activate
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
