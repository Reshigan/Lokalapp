import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { StatCard, IconBadge } from '@/components/Stat';
import {
  Users, UserCheck, TrendingUp, Wallet, Settings, ShieldCheck,
  Building2, BarChart3, FileText, LifeBuoy, Zap,
} from 'lucide-react';

interface DashboardStats {
  users: { total: number; new_30_days: number; verified: number };
  agents: { active: number };
  revenue: { total: number; last_30_days: number };
  wallets: { total_balance: number };
  unsettled_cash?: number;
  open_support_tickets?: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getAdminDashboardStats().then((r) => r.data && setStats(r.data as DashboardStats));
  }, []);

  const tools = [
    { icon: Users,       label: 'Users',       desc: 'Search & manage',          to: '/admin/users' },
    { icon: ShieldCheck, label: 'Agents',      desc: 'Tiers, float, status',     to: '/admin/agents' },
    { icon: Zap,         label: 'Tariffs',     desc: 'Flat / block / TOU',       to: '/admin/tariffs' },
    { icon: Building2,   label: 'Offices',     desc: 'Community offices',        to: '/admin/community-offices' },
    { icon: FileText,    label: 'Settlements', desc: 'Confirm cash counts',      to: '/admin/settlements' },
    { icon: ShieldCheck, label: 'Roles',       desc: 'RBAC grant/revoke',        to: '/admin/roles' },
    { icon: BarChart3,   label: 'Reports',     desc: 'Revenue & agents',         to: '/admin/reports' },
    { icon: LifeBuoy,    label: 'Support',     desc: 'Ticket queue',             to: '/support' },
    { icon: Settings,    label: 'Settings',    desc: 'Gateways & devices',       to: '/admin/settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink-muted">Admin</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Welcome, {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.phone_number}
        </h1>
        <p className="text-sm text-ink-muted mt-1">Operational overview of the Lokal platform.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="brand"   icon={Users}      label="Users"           value={stats?.users.total ?? '—'} hint={`+${stats?.users.new_30_days ?? 0} this month`} onClick={() => navigate('/admin/users')} />
        <StatCard tone="success" icon={UserCheck}  label="Verified"        value={stats?.users.verified ?? '—'} hint="KYC complete" />
        <StatCard tone="accent"  icon={ShieldCheck} label="Active agents"  value={stats?.agents.active ?? '—'} onClick={() => navigate('/admin/agents')} />
        <StatCard tone="neutral" icon={Wallet}     label="Wallet total"    value={stats ? fmt(stats.wallets.total_balance) : '—'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   icon={TrendingUp} label="Revenue (30d)" value={stats ? fmt(stats.revenue.last_30_days) : '—'} hint={stats ? `lifetime ${fmt(stats.revenue.total)}` : ''} />
        <StatCard tone="warning" icon={FileText}   label="Unsettled cash" value={stats ? fmt(stats.unsettled_cash || 0) : '—'} onClick={() => navigate('/admin/settlements')} />
        <StatCard tone="accent"  icon={LifeBuoy}   label="Open tickets"   value={stats?.open_support_tickets ?? 0} onClick={() => navigate('/support')} />
      </div>

      <section>
        <h3 className="section-title mb-3">Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tools.map((t) => (
            <button
              key={t.to}
              onClick={() => navigate(t.to)}
              className="card text-left p-4 hover:shadow-pop hover:border-accent-200 transition-all"
            >
              <IconBadge icon={t.icon} tone="brand" />
              <p className="text-sm font-semibold mt-3">{t.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
