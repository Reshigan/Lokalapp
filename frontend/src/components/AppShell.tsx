import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Logo } from '@/components/Logo';
import { InstallPrompt } from '@/components/InstallPrompt';
import { cn } from '@/lib/utils';
import {
  Bell, ChevronDown, LogOut, User as UserIcon, LifeBuoy, Menu, X, Home,
} from 'lucide-react';

interface NavLink {
  label: string;
  to: string;
  match?: (path: string) => boolean;
}

function buildNav(user: ReturnType<typeof useAuth>['user']): NavLink[] {
  if (!user) return [];
  if (user.is_admin) {
    return [
      { label: 'Dashboard',     to: '/admin' },
      { label: 'Users',         to: '/admin/users' },
      { label: 'Agents',        to: '/admin/agents' },
      { label: 'Tariffs',       to: '/admin/tariffs' },
      { label: 'Offices',       to: '/admin/community-offices' },
      { label: 'Settlements',   to: '/admin/settlements' },
      { label: 'Roles',         to: '/admin/roles' },
      { label: 'Reports',       to: '/admin/reports' },
    ];
  }
  if (user.is_agent) {
    return [
      { label: 'Dashboard',  to: '/agent' },
      { label: 'Households', to: '/agent/households', match: (p) => p.startsWith('/agent/households') },
      { label: 'Customers',  to: '/agent/customers' },
      { label: 'Settlement', to: '/agent/settlements' },
      { label: 'Float',      to: '/agent/float' },
      { label: 'Commissions',to: '/agent/commissions' },
    ];
  }
  return [
    { label: 'Home',      to: '/user' },
    { label: 'Wallet',    to: '/user/topup' },
    { label: 'Invoices',  to: '/user/invoices', match: (p) => p.startsWith('/user/invoices') },
    { label: 'WiFi',      to: '/user/wifi' },
    { label: 'History',   to: '/user/history' },
  ];
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.listNotifications(true).then((r) => {
      if (r.data) setUnread(r.data.length);
    });
  }, [user, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const nav = buildNav(user);
  const isActive = (link: NavLink) =>
    link.match ? link.match(location.pathname) : location.pathname === link.to;

  const initials = (user?.first_name?.[0] || user?.phone_number?.slice(-2) || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-surface-border">
        <div className="container-wide flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="flex items-center gap-2 text-brand-700">
            <Logo size={28} />
            <span className="text-lg font-bold tracking-tight">Lokal</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(l)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-soft hover:bg-surface-subtle hover:text-ink',
                )}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-500 ring-2 ring-white" />
              )}
            </button>

            <button
              onClick={() => navigate('/support')}
              className="p-2 rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-ink"
              aria-label="Support"
            >
              <LifeBuoy className="w-5 h-5" />
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-surface-subtle"
              >
                <span className="w-8 h-8 rounded-lg bg-brand-700 text-white grid place-items-center text-sm font-semibold">
                  {initials}
                </span>
                <ChevronDown className="hidden md:inline w-4 h-4 text-ink-muted" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-56 card p-1 animate-scale-in origin-top-right z-40">
                  <div className="px-3 py-2 border-b border-surface-border">
                    <p className="text-sm font-medium text-ink truncate">
                      {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.phone_number}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{user?.phone_number}</p>
                  </div>
                  <button
                    onClick={() => navigate('/user/profile')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-subtle text-ink-soft"
                  >
                    <UserIcon className="w-4 h-4" /> Profile
                  </button>
                  <button
                    onClick={async () => { await logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-danger-soft text-danger"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-subtle text-ink-soft"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-border bg-white animate-slide-up">
            <nav className="container-wide py-2 flex flex-col">
              {nav.map((l) => (
                <button
                  key={l.to}
                  onClick={() => navigate(l.to)}
                  className={cn(
                    'flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium',
                    isActive(l)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-subtle',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="container-wide py-6 md:py-8 animate-fade-in">{children}</main>

      {/* Mobile bottom nav (visible on small screens, replaces page-specific bottom navs) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-surface-border safe-bottom z-30">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5 py-2 text-brand-700">
            <Home className="w-5 h-5" /><span className="text-[10px] font-medium">Home</span>
          </button>
          <button onClick={() => navigate('/notifications')} className="flex flex-col items-center gap-0.5 py-2 text-ink-soft">
            <Bell className="w-5 h-5" /><span className="text-[10px] font-medium">Alerts</span>
          </button>
          <button onClick={() => navigate('/support')} className="flex flex-col items-center gap-0.5 py-2 text-ink-soft">
            <LifeBuoy className="w-5 h-5" /><span className="text-[10px] font-medium">Support</span>
          </button>
          <button onClick={() => navigate('/user/profile')} className="flex flex-col items-center gap-0.5 py-2 text-ink-soft">
            <UserIcon className="w-5 h-5" /><span className="text-[10px] font-medium">Account</span>
          </button>
        </div>
      </nav>
      <div className="md:hidden h-14" /> {/* spacer for bottom nav */}
      <InstallPrompt />
    </div>
  );
}
