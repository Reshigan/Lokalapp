import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  Wallet, 
  Wifi, 
  Zap, 
  History, 
  Bell,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  BarChart3,
  Home
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
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites' | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [walletRes, txRes] = await Promise.all([
      api.getWallet(),
      api.getTransactions(1, 5),
    ]);

    if (walletRes.data) setWallet(walletRes.data);
    if (txRes.data) setTransactions(txRes.data.transactions);
    setLoading(false);
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
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

  const serviceCards = [
    { 
      icon: Wifi, 
      title: 'WiFi', 
      description: 'Buy data vouchers and stay connected',
      path: '/user/wifi', 
      gradient: 'from-[#00B894] to-[#00997A]',
      iconBg: 'bg-white/20'
    },
    { 
      icon: Zap, 
      title: 'Electricity', 
      description: 'Purchase prepaid electricity units',
      path: '/user/electricity', 
      gradient: 'from-[#FDCB6E] to-[#F39C12]',
      iconBg: 'bg-white/20'
    },
    { 
      icon: Wallet, 
      title: 'Savings', 
      description: 'View your savings and earn rewards',
      path: '/user/profile', 
      gradient: 'from-[#00B894] to-[#00CEC9]',
      iconBg: 'bg-white/20'
    },
    { 
      icon: History, 
      title: 'History', 
      description: 'View all your past transactions',
      path: '/user/history', 
      gradient: 'from-[#E84393] to-[#FD79A8]',
      iconBg: 'bg-white/20'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-[#00B894] mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Loading your wallet...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <motion.div 
        className="bg-white px-5 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Home</h1>
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5" />
            </motion.button>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] rounded-full flex items-center justify-center text-white font-semibold cursor-pointer"
              onClick={() => navigate('/user/profile')}
            >
              {user?.first_name?.charAt(0) || 'U'}
            </motion.div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="mb-4">
          <p className="text-gray-500 text-sm mb-1">Total Balance Debit</p>
          <div className="flex items-baseline gap-2">
            <motion.span 
              className="text-4xl font-bold text-gray-900"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              {wallet ? formatCurrency(wallet.balance).replace('R', 'R ') : 'R 0.00'}
            </motion.span>
          </div>
          <p className="text-[#00B894] text-sm mt-1">
            {wallet ? formatCurrency(wallet.balance) : 'R 0.00'}
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'favorites'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Favorites
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Objects
          </button>
        </div>
      </motion.div>

      {/* Service Cards */}
      <div className="px-4 py-4 space-y-3">
        {serviceCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(card.path)}
            className={`bg-gradient-to-r ${card.gradient} rounded-2xl p-4 cursor-pointer shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{card.title}</h3>
                  <p className="text-white/80 text-sm">{card.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <motion.div 
        className="px-4 mt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-gray-900 font-semibold">Recent Transactions</h2>
          <button 
            onClick={() => navigate('/user/history')}
            className="text-[#00B894] text-sm font-medium hover:underline"
          >
            See All
          </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No transactions yet</p>
              <p className="text-gray-400 text-xs mt-1">Your activity will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx, index) => (
                <motion.div 
                  key={tx.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.amount > 0 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-500'
                  }`}>
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className={`font-semibold text-sm ${
                    tx.amount > 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="px-6 py-3">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { icon: Home, label: 'Dashboard', path: '/user', active: true },
              { icon: History, label: 'History', path: '/user/history', active: false },
              { icon: Wallet, label: 'Payments', path: '/user/topup', active: false },
              { icon: BarChart3, label: 'Analytics', path: '/user/analytics', active: false },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-1 transition-all ${
                  item.active 
                    ? 'text-[#00B894]' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className={`text-xs ${item.active ? 'font-semibold' : ''}`}>{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
