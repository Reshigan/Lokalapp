import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatCard, IconBadge, EmptyState } from '@/components/Stat';
import {
  Wallet, Coins, Bell, Plus, Search,
  Zap, Home as HomeIcon, LifeBuoy, ArrowDown, Receipt, AlertTriangle, Loader2, CheckCircle2,
} from 'lucide-react';

interface Summary {
  balance: number;
  cash_on_hand: number;
  total_sales: { amount: number; count: number };
  total_deposits: { amount: number; count: number };
  total_topups: { amount: number; count: number };
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositOk, setDepositOk] = useState(false);

  const load = async () => {
    const [s, e] = await Promise.all([
      api.getWalletSummary(),
      api.listExpiringHouseholds(7),
    ]);
    if (s.data) setSummary(s.data);
    if (e.data) setExpiringCount(e.data.length);
  };

  useEffect(() => { load(); }, []);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    const v = parseFloat(depositAmount);
    if (isNaN(v) || v <= 0) return setDepositError('Enter an amount');
    setPosting(true);
    const r = await api.depositToNxt(v, depositNote || undefined);
    setPosting(false);
    if (r.error) return setDepositError(r.error);
    setDepositOk(true);
    setDepositAmount('');
    setDepositNote('');
    load();
    setTimeout(() => { setDepositOk(false); setShowDeposit(false); }, 2000);
  };

  const isOffice = !!user?.is_office_manager;
  const role = user?.is_admin ? 'Admin' : isOffice ? 'Community Office' : 'Agent';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">{role}</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.phone_number}
          </h1>
        </div>
        <Button variant="outline" size="icon" onClick={() => navigate('/notifications')}>
          <Bell className="w-4 h-4" />
        </Button>
      </div>

      {/* Hero: cash on hand */}
      <Card className="overflow-hidden border-0 shadow-pop bg-brand-gradient text-white relative">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <CardContent className="p-6 md:p-7 relative">
          <div className="flex items-center justify-between">
            <span className="pill bg-white/15 text-white">Cash on hand</span>
            <span className="text-xs text-white/70">ZAR</span>
          </div>
          <p className="text-4xl md:text-5xl font-bold mt-3 tracking-tight">
            {summary ? fmt(summary.cash_on_hand) : '—'}
          </p>
          <p className="text-xs text-white/80 mt-1">
            {summary ? `Sales: ${fmt(summary.total_sales.amount)} · Deposits: ${fmt(summary.total_deposits.amount)}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="accent" size="sm" onClick={() => setShowDeposit((v) => !v)}>
              <ArrowDown className="w-4 h-4" /> Deposit to NXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              onClick={() => navigate('/user/history')}
            >
              <Receipt className="w-4 h-4" /> History
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDeposit && (
        <Card>
          <form onSubmit={submitDeposit}>
            <CardContent className="p-5 space-y-3">
              <h3 className="section-title">Deposit cash to NXT</h3>
              <p className="text-xs text-ink-muted">Records the cash you've handed over to the platform. Wallet will decrease by this amount.</p>
              <div>
                <label className="field-label">Amount (R)</label>
                <Input type="number" step="0.01" inputMode="decimal" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="field-label">Reference / note (optional)</label>
                <Input value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder="Bank slip ref, receipt #, …" />
              </div>
              {depositError && <p className="text-sm text-red-600">{depositError}</p>}
              {depositOk && (
                <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Deposit recorded.
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowDeposit(false)}>Cancel</Button>
                <Button type="submit" disabled={posting || !depositAmount}>
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
                  Confirm deposit
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="success" icon={Coins}    label="Total sales"  value={summary ? fmt(summary.total_sales.amount) : '—'}    hint={summary ? `${summary.total_sales.count} transaction(s)` : ''} />
        <StatCard tone="brand"   icon={ArrowDown} label="Deposited"   value={summary ? fmt(summary.total_deposits.amount) : '—'} hint={summary ? `${summary.total_deposits.count} deposit(s)` : ''} />
        <StatCard tone="accent"  icon={Wallet}   label="Top-ups"      value={summary ? fmt(summary.total_topups.amount) : '—'} />
        <StatCard
          tone="warning"
          icon={AlertTriangle}
          label="Expiring (7d)"
          value={expiringCount}
          hint="Households needing top-up"
          onClick={() => navigate('/agent/expiring')}
        />
      </div>

      {/* Quick actions */}
      <section>
        <h3 className="section-title mb-3">Quick actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: Plus,     label: 'New household',  desc: 'Capture masterdata',   to: '/agent/households/new', tone: 'brand' as const },
            { icon: HomeIcon, label: 'Households',     desc: 'Search + bill',        to: '/agent/households',     tone: 'brand' as const },
            { icon: AlertTriangle, label: 'Expiring',  desc: 'Top-up reminders',     to: '/agent/expiring',       tone: 'warning' as const },
            { icon: Zap,      label: 'Sell electricity', desc: 'R200 monthly',       to: '/agent/sell/electricity', tone: 'accent' as const },
            { icon: Coins,    label: 'Settle / submit', desc: 'Hand over cash',     to: '/agent/settlements',     tone: 'accent' as const },
            { icon: Search,   label: 'Customers',      desc: 'Search & history',     to: '/agent/customers',      tone: 'neutral' as const },
            { icon: LifeBuoy, label: 'Support',        desc: 'Get help',             to: '/support',              tone: 'neutral' as const },
          ].filter((a) => a.to !== '/agent/sell/wifi') /* WiFi sales suspended */
           .map((a) => (
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

      {!summary && <EmptyState title="Loading…" />}
    </div>
  );
}
