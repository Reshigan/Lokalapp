import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import {
  AlertTriangle, Home, Phone, Zap, MessageCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  account_number: string;
  primary_contact_name: string;
  primary_contact_phone: string;
  suburb: string | null;
  city: string | null;
  meter_number: string;
  unlimited_expires_at: string;
  days_remaining: number;
}

const TOPUP_PRICE = 200;
const TOPUP_DAYS = 30;

export default function ExpiringHouseholdsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-row UI state for the inline top-up button
  const [topup, setTopup] = useState<Record<string, 'idle' | 'busy' | 'done' | 'error'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const r = await api.listExpiringHouseholds(days);
    if (r.data) setRows(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const sendReminder = (row: Row) => {
    const message = `Hi ${row.primary_contact_name.split(' ')[0]}, your Lokal electricity (${row.meter_number}) expires in ${row.days_remaining.toFixed(0)} days. Top up R${TOPUP_PRICE} for another month.`;
    if (navigator.share) {
      navigator.share({ title: 'Lokal — top-up reminder', text: message }).catch(() => {});
    } else {
      window.open(`sms:${row.primary_contact_phone}?body=${encodeURIComponent(message)}`);
    }
  };

  const quickTopup = async (row: Row) => {
    if (!confirm(`Take R${TOPUP_PRICE} from ${row.primary_contact_name} for ${TOPUP_DAYS} more days?`)) return;
    setTopup((p) => ({ ...p, [row.id]: 'busy' }));
    setErrors((p) => { const { [row.id]: _, ...rest } = p; return rest; });

    // Find the only active electricity package — should be the R200 monthly.
    const pkgRes = await api.getElectricityPackages();
    const pkg = pkgRes.data?.packages?.[0];
    if (!pkg) {
      setTopup((p) => ({ ...p, [row.id]: 'error' }));
      setErrors((p) => ({ ...p, [row.id]: 'No active electricity package configured.' }));
      return;
    }
    // We need the meter ID — fetch the household for it.
    const hh = await api.getHousehold(row.id);
    if (!hh.data?.meter_id) {
      setTopup((p) => ({ ...p, [row.id]: 'error' }));
      setErrors((p) => ({ ...p, [row.id]: 'No meter linked.' }));
      return;
    }
    const r = await api.processAgentTransaction({
      customer_phone: row.primary_contact_phone,
      product_type: 'ELECTRICITY',
      package_id: pkg.id,
      meter_id: hh.data.meter_id,
      cash_received: pkg.price,
    });
    if (r.error) {
      setTopup((p) => ({ ...p, [row.id]: 'error' }));
      setErrors((p) => ({ ...p, [row.id]: r.error! }));
      return;
    }
    setTopup((p) => ({ ...p, [row.id]: 'done' }));
    // Refresh the list after a short pause so the row drops off
    setTimeout(load, 1500);
  };

  const toneFor = (d: number): 'destructive' | 'warning' | 'secondary' =>
    d <= 1 ? 'destructive' : d <= 3 ? 'warning' : 'secondary';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiring electricity"
        description="Households whose monthly power is running out — take a top-up in one tap."
        back="/agent"
        actions={
          <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl">
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium',
                  days === d ? 'bg-white text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Nothing expiring"
          description={`No households expiring in the next ${days} days.`}
        />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => {
            const state = topup[r.id] || 'idle';
            const err = errors[r.id];
            return (
              <Card key={r.id} className={state === 'done' ? 'border-success bg-success-soft' : ''}>
                <CardContent className="p-4 flex items-start gap-3">
                  <IconBadge icon={Home} tone={r.days_remaining <= 1 ? 'warning' : 'brand'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{r.primary_contact_name}</p>
                      <Badge variant={toneFor(r.days_remaining) as any}>
                        <AlertTriangle className="w-3 h-3" />
                        {r.days_remaining < 1 ? 'today' : `${r.days_remaining.toFixed(0)} day${r.days_remaining < 2 ? '' : 's'}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {r.account_number} · meter {r.meter_number} · expires {new Date(r.unlimited_expires_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {[r.suburb, r.city].filter(Boolean).join(', ') || ''} · <Phone className="inline w-3 h-3" /> {r.primary_contact_phone}
                    </p>
                    {err && <p className="text-xs text-red-600 mt-1">⚠ {err}</p>}
                    {state === 'done' && (
                      <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Topped up R{TOPUP_PRICE} for {TOPUP_DAYS} days
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 items-stretch">
                    <Button
                      size="sm"
                      onClick={() => quickTopup(r)}
                      disabled={state === 'busy' || state === 'done'}
                      variant={state === 'done' ? 'outline' : 'default'}
                    >
                      {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       state === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                       <Zap className="w-4 h-4" />}
                      {state === 'busy' ? 'Taking R200…' :
                       state === 'done' ? 'Done' :
                       `Top up R${TOPUP_PRICE}`}
                    </Button>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => sendReminder(r)}>
                        <MessageCircle className="w-4 h-4" /> Remind
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/agent/households/${r.id}`)}>
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
