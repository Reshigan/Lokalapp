import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Wifi, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WifiPkg { id: string; name: string; description: string | null; price: number; data_limit_mb: number; validity_hours: number; is_active: number; }
interface ElecPkg { id: string; name: string; description: string | null; price: number; kwh_amount: number; is_active: number; }

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
const fmtHours = (h: number) => h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`;

export default function AdminProductsPage() {
  const [tab, setTab] = useState<'wifi' | 'electricity'>('wifi');
  const [wifi, setWifi] = useState<WifiPkg[]>([]);
  const [elec, setElec] = useState<ElecPkg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAdminWiFiPackages(), api.getAdminElectricityPackages()]).then(([w, e]) => {
      if (w.data) setWifi(w.data as any);
      if (e.data) setElec(e.data as any);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage WiFi and prepaid electricity packages." back="/admin" />

      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl w-max">
        {(['wifi', 'electricity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium',
              tab === t ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t === 'wifi' ? `WiFi (${wifi.length})` : `Electricity (${elec.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : tab === 'wifi' ? (
        wifi.length === 0 ? (
          <EmptyState icon={Wifi} title="No WiFi packages" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {wifi.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-5 flex items-start gap-3">
                  <IconBadge icon={Wifi} tone="accent" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{p.name}</p>
                      {!p.is_active && <Badge variant="secondary">inactive</Badge>}
                    </div>
                    <p className="text-xs text-ink-muted">{p.description}</p>
                    <p className="text-xs text-ink-muted mt-2">{fmtMb(p.data_limit_mb)} · {fmtHours(p.validity_hours)}</p>
                    <p className="text-base font-semibold mt-2">{fmt(p.price)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : elec.length === 0 ? (
        <EmptyState icon={Zap} title="No electricity packages" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {elec.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5 flex items-start gap-3">
                <IconBadge icon={Zap} tone="warning" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {!p.is_active && <Badge variant="secondary">inactive</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">{p.description}</p>
                  <p className="text-xs text-ink-muted mt-2">{p.kwh_amount} kWh</p>
                  <p className="text-base font-semibold mt-2">{fmt(p.price)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
