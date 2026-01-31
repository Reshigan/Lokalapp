import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  DollarSign,
  LogOut,
  Loader2,
  AlertTriangle,
  Plus,
  Search,
  Wifi,
  Zap
} from 'lucide-react';

interface AgentProfile {
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
}

interface FloatInfo {
  float_balance: number;
  low_float_threshold: number;
  is_low: boolean;
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [floatInfo, setFloatInfo] = useState<FloatInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [profileRes, floatRes] = await Promise.all([
      api.getAgentProfile(),
      api.getAgentFloat(),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (floatRes.data) setFloatInfo(floatRes.data);
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
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'bg-yellow-500';
      case 'SILVER': return 'bg-gray-400';
      case 'PLATINUM': return 'bg-purple-500';
      default: return 'bg-orange-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl font-bold mb-2 text-white">Not an Agent Yet</h2>
            <p className="text-slate-400 mb-6">
              Register as an agent to start earning commissions
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              onClick={() => navigate('/agent/register')}
            >
              Register as Agent
            </Button>
            <Button 
              variant="ghost" 
              className="w-full mt-2 text-slate-400 hover:text-white"
              onClick={() => navigate('/user')}
            >
              Back to User App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white p-6 pb-28 rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-indigo-200 text-sm">Agent Portal</p>
            <h1 className="text-xl font-bold">{profile.business_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${getTierColor(profile.tier)} text-white border-0`}>
                {profile.tier}
              </Badge>
              <span className="text-indigo-200 text-sm">{profile.agent_code}</span>
            </div>
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
        
        {/* Float Balance Card */}
        <Card className={`bg-white/10 backdrop-blur border-0 text-white shadow-2xl ${floatInfo?.is_low ? 'ring-2 ring-amber-400' : ''}`}>
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-indigo-200 text-sm">Float Balance</p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatCurrency(floatInfo?.float_balance || 0)}
                </p>
                {floatInfo?.is_low && (
                  <div className="flex items-center gap-1 mt-1 text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Low float - top up soon
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg"
                onClick={() => navigate('/agent/float')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-14">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Today's Sales</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(profile.monthly_sales)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Commission</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(profile.commission_balance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="h-20 flex-col gap-2 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                onClick={() => navigate('/agent/sell/wifi')}
              >
                <Wifi className="w-6 h-6" />
                Sell WiFi
              </Button>
              <Button 
                className="h-20 flex-col gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => navigate('/agent/sell/electricity')}
              >
                <Zap className="w-6 h-6" />
                Sell Electricity
              </Button>
              <Button 
                variant="outline"
                className="h-20 flex-col gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/agent/customers')}
              >
                <Search className="w-6 h-6" />
                Find Customer
              </Button>
              <Button 
                variant="outline"
                className="h-20 flex-col gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/agent/customers/new')}
              >
                <Plus className="w-6 h-6" />
                New Customer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Sales</span>
                <span className="font-semibold text-white">{formatCurrency(profile.total_sales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">This Month</span>
                <span className="font-semibold text-white">{formatCurrency(profile.monthly_sales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Commission Rate</span>
                <span className="font-semibold text-emerald-400">
                  {profile.tier === 'BRONZE' ? '5%' : 
                   profile.tier === 'SILVER' ? '7%' : 
                   profile.tier === 'GOLD' ? '10%' : '12%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-6 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-indigo-400">
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/agent/customers')}
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Customers</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/agent/commissions')}
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-xs">Earnings</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/agent/float')}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs">Float</span>
          </button>
        </div>
      </div>
    </div>
  );
}
