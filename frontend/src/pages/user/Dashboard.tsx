import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard, IconBadge, EmptyState } from '@/components/Stat';
import {
  Wifi, Zap, Wallet, History, Bell, ChevronRight, ArrowDown, ArrowUp,
  Receipt, LifeBuoy, BarChart3, Plus,
} from 'lucide-react';

interface WalletData { balance: number; currency: string; status: string }
interface Transaction { id: string; type: string; amount: number; description: string | null; created_at: string; status: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, t, inv] = await Promise.all([
        api.getWallet(),
        api.getTransactions(1, 5),
        api.listInvoices({ status: 'ISSUED' }),
      ]);
      if (w.data) setWallet(w.data);
      if (t.data) setTxs(t.data.transactions);
      if (inv.data) {
        const total = inv.data.reduce(
          (s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.amount_paid || 0)),
          0,
        );
        setOutstandingTotal(total);
      }
      setLoading(false);
    })();
  }, []);

  const services = [
    { icon: Zap,      label: 'Electricity', desc: 'Buy units',         to: '/user/electricity' },
    { icon: Wifi,     label: 'WiFi',        desc: 'Data vouchers',     to: '/user/wifi' },
    { icon: Receipt,  label: 'Invoices',    desc: 'Postpaid bills',    to: '/user/invoices' },
    { icon: History,  label: 'History',     desc: 'All transactions',  to: '/user/history' },
    { icon: BarChart3, label: 'Analytics',  desc: 'Spend insights',    to: '/user/analytics' },
    { icon: LifeBuoy, label: 'Support',     desc: 'Get help',          to: '/support' },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.phone_number}
          </h1>
        </div>
        <Button variant="outline" size="icon" onClick={() => navigate('/notifications')} aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Button>
      </div>

      {/* Wallet card — the brand-gradient hero */}
      <Card className="overflow-hidden border-0 shadow-pop bg-brand-gradient text-white relative">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <CardContent className="p-6 md:p-7 relative">
          <div className="flex items-center justify-between">
            <span className="pill bg-white/15 text-white">Available balance</span>
            <span className="text-xs text-white/70">{wallet?.currency || 'ZAR'}</span>
          </div>
          <p className="text-4xl md:text-5xl font-bold mt-3 tracking-tight">
            {loading ? '—' : fmt(wallet?.balance || 0)}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="accent" size="sm" onClick={() => navigate('/user/topup')}>
              <Plus className="w-4 h-4" /> Top up
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              onClick={() => navigate('/user/history')}
            >
              <History className="w-4 h-4" /> History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-up KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          tone="warning"
          icon={Receipt}
          label="Outstanding"
          value={fmt(outstandingTotal)}
          hint="Unpaid invoices"
          onClick={() => navigate('/user/invoices')}
        />
        <StatCard
          tone="accent"
          icon={Wallet}
          label="Loyalty points"
          value={user?.loyalty_points ?? 0}
          hint="Earn 1 pt per R10"
          onClick={() => navigate('/user/profile')}
        />
      </div>

      {/* Services */}
      <section>
        <h3 className="section-title mb-3">Services</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {services.map((s) => (
            <button
              key={s.to}
              onClick={() => navigate(s.to)}
              className="card text-left p-4 hover:shadow-pop hover:border-accent-200 transition-all group"
            >
              <IconBadge icon={s.icon} tone="brand" />
              <p className="text-sm font-semibold mt-3">{s.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title">Recent activity</h3>
          <button onClick={() => navigate('/user/history')} className="text-xs font-medium text-accent-600 hover:text-accent-700">
            See all
          </button>
        </div>
        {loading ? (
          <Card><CardContent className="p-8 text-center text-ink-muted">Loading…</CardContent></Card>
        ) : txs.length === 0 ? (
          <EmptyState icon={History} title="No transactions yet" description="Your activity will appear here." />
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-surface-border">
              {txs.map((tx) => {
                const credit = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-4">
                    <span
                      className={
                        credit
                          ? 'w-9 h-9 rounded-xl bg-success-soft text-emerald-700 grid place-items-center'
                          : 'w-9 h-9 rounded-xl bg-surface-subtle text-ink-soft grid place-items-center'
                      }
                    >
                      {credit ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-ink-muted">{fmtDate(tx.created_at)}</p>
                    </div>
                    <p className={credit ? 'text-emerald-600 font-semibold text-sm' : 'text-ink font-semibold text-sm'}>
                      {credit ? '+' : ''}{fmt(tx.amount)}
                    </p>
                    <ChevronRight className="w-4 h-4 text-ink-faint" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
