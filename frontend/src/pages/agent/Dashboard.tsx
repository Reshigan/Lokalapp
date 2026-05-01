import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard, IconBadge, EmptyState } from '@/components/Stat';
import {
  Wallet, Users, TrendingUp, Coins, Bell, AlertTriangle, Plus, Search,
  Wifi, Zap, Home as HomeIcon, LifeBuoy,
} from 'lucide-react';

interface AgentProfile {
  id: string;
  agent_code: string;
  business_name: string;
  tier: string;
  float_balance: number;
  commission_balance: number;
  total_sales: number;
  monthly_sales: number;
  status: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [cashOnHand, setCashOnHand] = useState({ amount: 0, num_collections: 0 });
  const [loading, setLoading] = useState(true);
  const [floatLow, setFloatLow] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, c, alerts] = await Promise.all([
        api.getAgentProfile(),
        api.cashOnHand(),
        api.getAgentAlerts(),
      ]);
      if (p.data) setProfile(p.data);
      if (c.data) setCashOnHand(c.data);
      if (alerts.data) setFloatLow(alerts.data.is_low);
      setLoading(false);
    })();
  }, []);

  const tierTone = (t: string) =>
    t === 'PLATINUM' ? 'accent' : t === 'GOLD' ? 'warning' : t === 'SILVER' ? 'secondary' : 'default';

  if (!profile) {
    return loading ? (
      <div className="text-center py-16 text-ink-muted">Loading…</div>
    ) : (
      <EmptyState
        icon={Users}
        title="Not registered as an agent yet"
        description="Apply to become a Lokal community agent."
        action={<Button onClick={() => navigate('/agent/onboarding')}>Get started</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">Agent</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">{profile.business_name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={tierTone(profile.tier) as any}>{profile.tier}</Badge>
            <span className="text-xs text-ink-muted">Code {profile.agent_code}</span>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => navigate('/notifications')}>
          <Bell className="w-4 h-4" />
        </Button>
      </div>

      {floatLow && (
        <Card className="border-amber-200 bg-warning-soft">
          <CardContent className="p-4 flex items-center gap-3">
            <IconBadge icon={AlertTriangle} tone="warning" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Float is running low</p>
              <p className="text-xs text-amber-800">Top up before your next customer transactions.</p>
            </div>
            <Button size="sm" onClick={() => navigate('/agent/float')}>Top up</Button>
          </CardContent>
        </Card>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="brand"   icon={Wallet}     label="Float"        value={fmt(profile.float_balance)} />
        <StatCard tone="accent"  icon={Coins}      label="Cash on hand" value={fmt(cashOnHand.amount)} hint={`${cashOnHand.num_collections} collection(s)`} onClick={() => navigate('/agent/settlements')} />
        <StatCard tone="success" icon={TrendingUp} label="This month"   value={fmt(profile.monthly_sales)} />
        <StatCard tone="neutral" icon={TrendingUp} label="Commission"   value={fmt(profile.commission_balance)} onClick={() => navigate('/agent/commissions')} />
      </div>

      {/* Quick actions */}
      <section>
        <h3 className="section-title mb-3">Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: Plus,     label: 'New household',  desc: 'Capture masterdata',     to: '/agent/households/new', tone: 'brand' as const },
            { icon: HomeIcon, label: 'Households',     desc: 'Search + bill',          to: '/agent/households',     tone: 'brand' as const },
            { icon: Coins,    label: 'Settle cash',    desc: 'Hand over at office',    to: '/agent/settlements',    tone: 'accent' as const },
            { icon: Wifi,     label: 'Sell WiFi',      desc: 'Voucher to customer',    to: '/agent/sell/wifi',      tone: 'accent' as const },
            { icon: Zap,      label: 'Sell electricity', desc: 'Prepaid units',        to: '/agent/sell/electricity', tone: 'accent' as const },
            { icon: Search,   label: 'Customers',      desc: 'Search & history',       to: '/agent/customers',      tone: 'neutral' as const },
            { icon: LifeBuoy, label: 'Support',        desc: 'Get help',               to: '/support',              tone: 'neutral' as const },
          ].map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="card text-left p-4 hover:shadow-pop hover:border-accent-200 transition-all"
            >
              <IconBadge icon={a.icon} tone={a.tone} />
              <p className="text-sm font-semibold mt-3">{a.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
