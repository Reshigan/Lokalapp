import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Sparkles,
  TrendingUp,
  Bell
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

  const quickActions = [
    { icon: Wifi, label: 'WiFi', path: '/user/wifi', gradient: 'from-lokal-cyan to-lokal-blue', glow: 'shadow-glow-cyan' },
    { icon: Zap, label: 'Power', path: '/user/electricity', gradient: 'from-amber-400 to-orange-500', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]' },
    { icon: History, label: 'History', path: '/user/history', gradient: 'from-emerald-400 to-green-500', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.35)]' },
    { icon: User, label: 'Profile', path: '/user/profile', gradient: 'from-lokal-purple to-lokal-pink', glow: 'shadow-glow-purple' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-lokal-navy flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-lokal-cyan/30 rounded-full blur-2xl animate-pulse-slow" />
            <Loader2 className="w-12 h-12 animate-spin text-lokal-cyan relative z-10" />
          </div>
          <p className="text-white/50 mt-4 text-sm">Loading your wallet...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lokal-navy pb-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -right-40 w-80 h-80 bg-lokal-purple/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute top-40 -left-40 w-80 h-80 bg-lokal-cyan/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-lokal-blue/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '5s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          className="p-6 pb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-lokal-cyan text-sm font-medium">Welcome back,</p>
              <h1 className="text-2xl font-bold text-white">
                {user?.first_name || 'User'}
              </h1>
            </div>
            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Bell className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="w-10 h-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Wallet Balance Card */}
        <motion.div 
          className="px-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-lokal-cyan via-lokal-blue to-lokal-purple rounded-3xl blur-lg opacity-40" />
            
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-lokal-cyan/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-lokal-purple/20 to-transparent rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-lokal-cyan" />
                      <p className="text-white/60 text-sm">Total Balance</p>
                    </div>
                    <motion.p 
                      className="text-4xl font-bold text-white tracking-tight"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                    >
                      {wallet ? formatCurrency(wallet.balance) : 'R0.00'}
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      className="bg-gradient-to-r from-lokal-cyan to-lokal-blue hover:opacity-90 text-white font-semibold rounded-xl shadow-glow-cyan border-0 h-11 px-5"
                      onClick={() => navigate('/user/topup')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Top Up
                    </Button>
                  </motion.div>
                </div>
                
                {/* Stats row */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  {loyalty && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-lokal-purple/20 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-lokal-purple" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Points</p>
                        <p className="text-sm font-semibold text-white">{loyalty.points}</p>
                      </div>
                    </div>
                  )}
                  {loyalty && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-lokal-cyan/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-lokal-cyan" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Tier</p>
                        <Badge className="bg-gradient-to-r from-lokal-cyan/20 to-lokal-blue/20 text-lokal-cyan border border-lokal-cyan/30 text-xs px-2">
                          {loyalty.tier}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Status</p>
                      <p className="text-sm font-semibold text-emerald-400">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="px-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-white/70 text-sm font-medium mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center ${action.glow} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div 
          className="px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-white/70 text-sm font-medium">Recent Transactions</h2>
            <button 
              onClick={() => navigate('/user/history')}
              className="text-lokal-cyan text-sm hover:text-lokal-accent transition-colors"
            >
              See All
            </button>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <History className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/40 text-sm">No transactions yet</p>
                <p className="text-white/30 text-xs mt-1">Your activity will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx, index) => (
                  <motion.div 
                    key={tx.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    className="p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.amount > 0 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className={`font-semibold text-sm ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-lokal-navy/80 backdrop-blur-xl border-t border-white/10" />
        <div className="relative px-6 py-4">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { icon: Wallet, label: 'Home', path: '/user', active: true },
              { icon: Wifi, label: 'WiFi', path: '/user/wifi', active: false },
              { icon: Zap, label: 'Power', path: '/user/electricity', active: false },
              { icon: User, label: 'Profile', path: '/user/profile', active: false },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  item.active 
                    ? 'text-lokal-cyan' 
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <div className={`relative ${item.active ? '' : ''}`}>
                  {item.active && (
                    <div className="absolute -inset-2 bg-lokal-cyan/20 rounded-full blur-lg" />
                  )}
                  <item.icon className={`w-6 h-6 relative z-10 ${item.active ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}`} />
                </div>
                <span className={`text-xs ${item.active ? 'font-semibold' : ''}`}>{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
