import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  Users, 
  UserCheck, 
  DollarSign,
  Wallet,
  LogOut,
  Loader2,
  TrendingUp,
  Wifi,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  users: { total: number; new_30_days: number; verified: number };
  agents: { active: number };
  revenue: { total: number; last_30_days: number };
  wallets: { total_balance: number };
}

interface RevenueData {
  daily_revenue: Array<{ date: string; amount: number }>;
  by_product: { wifi: number; electricity: number; other: number };
  total: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [statsRes, revenueRes] = await Promise.all([
      api.getAdminDashboardStats(),
      api.getRevenueReport(30),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    if (revenueRes.data) setRevenue(revenueRes.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 via-pink-600 to-purple-700 text-white p-6 pb-24 rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-rose-200 text-sm">Admin Dashboard</p>
            <h1 className="text-xl font-bold">Lokal Platform</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Revenue Card */}
        <Card className="bg-white/10 backdrop-blur border-0 text-white shadow-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-rose-200 text-sm">Total Revenue (30 days)</p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatCurrency(stats?.revenue.last_30_days || 0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-rose-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-12">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats?.users.total || 0}</p>
              <p className="text-xs text-emerald-400">+{stats?.users.new_30_days || 0} this month</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-xs">Active Agents</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats?.agents.active || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs">Wallet Balance</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(stats?.wallets.total_balance || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">All-time Revenue</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(stats?.revenue.total || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        {revenue && revenue.daily_revenue.length > 0 && (
          <Card className="mb-4 bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue.daily_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-ZA')}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Product */}
        {revenue && (
          <Card className="mb-4 bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Revenue by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-slate-300">WiFi</span>
                  </div>
                  <span className="font-semibold text-white">{formatCurrency(revenue.by_product.wifi)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-slate-300">Electricity</span>
                  </div>
                  <span className="font-semibold text-white">{formatCurrency(revenue.by_product.electricity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-600/50 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-slate-300">Other</span>
                  </div>
                  <span className="font-semibold text-white">{formatCurrency(revenue.by_product.other)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Management</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="h-16 flex-col gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Users</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 flex-col gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/admin/agents')}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-xs">Agents</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 flex-col gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/admin/products')}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs">Products</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 flex-col gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/admin/reports')}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs">Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-6 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-rose-400">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/admin/users')}
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Users</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/admin/agents')}
          >
            <UserCheck className="w-6 h-6" />
            <span className="text-xs">Agents</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/admin/products')}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">Products</span>
          </button>
        </div>
      </div>
    </div>
  );
}
