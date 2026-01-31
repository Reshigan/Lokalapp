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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 pb-28 rounded-b-3xl overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/10 rotate-45" />
        <div className="absolute top-16 right-16 w-10 h-10 bg-white/5 rounded-full" />
        <div className="absolute bottom-20 left-4 w-8 h-8 border-2 border-white/10 rounded-full" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[#4da6e8] text-sm">Welcome back,</p>
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
        <Card className="bg-white/10 backdrop-blur border-0 text-white shadow-2xl relative z-10">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[#4da6e8] text-sm">Total Balance</p>
                <p className="text-4xl font-bold tracking-tight">
                  {wallet ? formatCurrency(wallet.balance) : 'R0.00'}
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-white text-[#1e3a5f] hover:bg-gray-100 shadow-lg"
                onClick={() => navigate('/user/topup')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            </div>
            {loyalty && (
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/20">
                <Gift className="w-4 h-4 text-[#4da6e8]" />
                <span className="text-sm text-white/70">
                  {loyalty.points} points
                </span>
                <Badge className="bg-[#4da6e8]/30 text-[#4da6e8] border-0">
                  {loyalty.tier}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-14">
        <Card className="bg-white border-0 shadow-xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/wifi')}
              >
                <div className="w-12 h-12 bg-[#4da6e8] rounded-2xl flex items-center justify-center shadow-lg">
                  <Wifi className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">WiFi</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/electricity')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Power</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/history')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <History className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">History</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/profile')}
              >
                <div className="w-12 h-12 bg-[#1e3a5f] rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Profile</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-[#1e3a5f]">Recent Transactions</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[#4da6e8] hover:text-[#3d96d8]"
            onClick={() => navigate('/user/history')}
          >
            See All
          </Button>
        </div>
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className={`w-5 h-5 text-emerald-600`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 text-rose-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className={`font-semibold ${
                      tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-[#1e3a5f]">
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#1e3a5f]"
            onClick={() => navigate('/user/wifi')}
          >
            <Wifi className="w-6 h-6" />
            <span className="text-xs">WiFi</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#1e3a5f]"
            onClick={() => navigate('/user/electricity')}
          >
            <Zap className="w-6 h-6" />
            <span className="text-xs">Power</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#1e3a5f]"
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
