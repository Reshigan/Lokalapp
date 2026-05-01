import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { ShieldCheck, Loader2, Award } from 'lucide-react';

interface AgentRow {
  id: string;
  agent_code: string;
  business_name: string;
  business_type: string;
  tier: string;
  float_balance: number;
  commission_balance: number;
  total_sales: number;
  monthly_sales: number;
  status: string;
  user_phone: string;
  user_name: string;
}

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const;
const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AgentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getAdminAgents(page);
    if (r.data) {
      setAgents(r.data.agents);
      setTotal(r.data.total);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const setTier = async (t: string) => {
    if (!selected) return;
    setBusy(true);
    await api.updateAgentTier(selected.id, t);
    setBusy(false);
    setSelected(null);
    load();
  };

  const tierVariant = (t: string): 'default' | 'accent' | 'success' | 'warning' | 'secondary' =>
    t === 'PLATINUM' ? 'accent' : t === 'GOLD' ? 'warning' : t === 'SILVER' ? 'secondary' : 'default';

  return (
    <div className="space-y-6">
      <PageHeader title="Agents" description={`${total} total`} back="/admin" />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : agents.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No agents yet" />
      ) : (
        <>
          <div className="grid gap-2">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
              >
                <IconBadge icon={ShieldCheck} tone="brand" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{a.business_name}</p>
                    <Badge variant={tierVariant(a.tier)}>{a.tier}</Badge>
                    <Badge variant={a.status === 'ACTIVE' ? 'success' : a.status === 'PENDING' ? 'warning' : 'destructive'}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted">{a.agent_code} · {a.user_phone}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">{fmt(a.float_balance)}</p>
                  <p className="text-ink-muted">{fmt(a.monthly_sales)} this month</p>
                </div>
              </button>
            ))}
          </div>

          {total > agents.length && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span className="text-sm text-ink-muted self-center">Page {page}</span>
              <Button variant="outline" size="sm" disabled={agents.length < 20} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">{selected?.agent_code} · {selected?.user_phone}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-muted">Float</p>
                <p className="font-semibold">{fmt(selected?.float_balance || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Commission</p>
                <p className="font-semibold">{fmt(selected?.commission_balance || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">This month</p>
                <p className="font-semibold">{fmt(selected?.monthly_sales || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Total sales</p>
                <p className="font-semibold">{fmt(selected?.total_sales || 0)}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-surface-border">
              <p className="section-title flex items-center gap-2"><Award className="w-4 h-4" /> Tier</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {TIERS.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={selected?.tier === t ? 'default' : 'outline'}
                    onClick={() => setTier(t)}
                    disabled={busy}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
