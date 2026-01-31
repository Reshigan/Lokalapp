import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  Wallet, 
  Wifi, 
  Zap, 
  History, 
  Gift, 
  User, 
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2
} from 'lucide-react';

interface WalletData {
  balance: number;
  currency: string;
  status: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
  status: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [walletRes, txRes, loyaltyRes] = await Promise.all([
      api.getWallet(),
      api.getTransactions(1, 5),
      api.getLoyalty(),
    ]);

    if (walletRes.data) setWallet(walletRes.data);
    if (txRes.data) setTransactions(txRes.data.transactions);
    if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white p-6 pb-28 rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-violet-200 text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold">
              {user?.first_name || 'User'}
            </h1>
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
        
        {/* Wallet Balance Card */}
        <Card className="bg-white/10 backdrop-blur border-0 text-white shadow-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-violet-200 text-sm">Total Balance</p>
                <p className="text-4xl font-bold tracking-tight">
                  {wallet ? formatCurrency(wallet.balance) : 'R0.00'}
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-white text-violet-700 hover:bg-violet-50 shadow-lg"
                onClick={() => navigate('/user/topup')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            </div>
            {loyalty && (
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/20">
                <Gift className="w-4 h-4 text-amber-300" />
                <span className="text-sm text-violet-200">
                  {loyalty.points} points
                </span>
                <Badge className="bg-amber-500/30 text-amber-200 border-0">
                  {loyalty.tier}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-14">
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
                onClick={() => navigate('/user/wifi')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Wifi className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-300">WiFi</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
                onClick={() => navigate('/user/electricity')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-300">Power</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
                onClick={() => navigate('/user/history')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <History className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-300">History</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
                onClick={() => navigate('/user/profile')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-300">Profile</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-white">Recent Transactions</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-violet-400 hover:text-violet-300"
            onClick={() => navigate('/user/history')}
          >
            See All
          </Button>
        </div>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <History className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className={`w-5 h-5 text-emerald-400`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 text-rose-400`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className={`font-semibold ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-6 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-violet-400">
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/user/wifi')}
          >
            <Wifi className="w-6 h-6" />
            <span className="text-xs">WiFi</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/user/electricity')}
          >
            <Zap className="w-6 h-6" />
            <span className="text-xs">Power</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300"
            onClick={() => navigate('/user/profile')}
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
