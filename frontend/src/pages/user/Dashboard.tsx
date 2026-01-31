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
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 pb-24 rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-green-100 text-sm">Welcome back,</p>
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
        <Card className="bg-white/10 backdrop-blur border-0 text-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-100 text-sm">Wallet Balance</p>
                <p className="text-3xl font-bold">
                  {wallet ? formatCurrency(wallet.balance) : 'R0.00'}
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-white text-green-700 hover:bg-green-50"
                onClick={() => navigate('/user/topup')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            </div>
            {loyalty && (
              <div className="mt-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-300" />
                <span className="text-sm text-green-100">
                  {loyalty.points} points
                </span>
                <Badge className="bg-yellow-500/20 text-yellow-200 border-0">
                  {loyalty.tier}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-12">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/wifi')}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium">WiFi</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/electricity')}
              >
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-xs font-medium">Electricity</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/history')}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium">History</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/user/profile')}
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-medium">Profile</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-green-600"
            onClick={() => navigate('/user/history')}
          >
            See All
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className={`w-5 h-5 text-green-600`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 text-red-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className={`font-semibold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-gray-900'
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-green-600">
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400"
            onClick={() => navigate('/user/wifi')}
          >
            <Wifi className="w-6 h-6" />
            <span className="text-xs">WiFi</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400"
            onClick={() => navigate('/user/electricity')}
          >
            <Zap className="w-6 h-6" />
            <span className="text-xs">Power</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1 text-gray-400"
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
