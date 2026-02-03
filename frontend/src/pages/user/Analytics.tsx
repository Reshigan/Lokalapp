import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  Wifi,
  Zap,
  Wallet,
  Award,
  Home,
  History,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

interface AnalyticsData {
  total_spent: number;
  total_topups: number;
  wifi_spent: number;
  electricity_spent: number;
  current_balance: number;
  loyalty_points: number;
  transaction_count: number;
  monthly_breakdown: Array<{
    month: string;
    wifi: number;
    electricity: number;
    topups: number;
  }>;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

    const loadAnalytics = async () => {
      try {
        const response = await api.getAnalytics();
        if (response.data) {
          setAnalytics(response.data);
        }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set default data if API fails
      setAnalytics({
        total_spent: 0,
        total_topups: 0,
        wifi_spent: 0,
        electricity_spent: 0,
        current_balance: 0,
        loyalty_points: 0,
        transaction_count: 0,
        monthly_breakdown: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const statCards = analytics ? [
    {
      icon: Wallet,
      label: 'Current Balance',
      value: formatCurrency(analytics.current_balance),
      color: 'from-teal-400 to-cyan-500',
      bgColor: 'bg-teal-50',
    },
    {
      icon: TrendingUp,
      label: 'Total Spent',
      value: formatCurrency(analytics.total_spent),
      color: 'from-rose-400 to-pink-500',
      bgColor: 'bg-rose-50',
    },
    {
      icon: Wifi,
      label: 'WiFi Purchases',
      value: formatCurrency(analytics.wifi_spent),
      color: 'from-cyan-400 to-blue-500',
      bgColor: 'bg-cyan-50',
    },
    {
      icon: Zap,
      label: 'Electricity Purchases',
      value: formatCurrency(analytics.electricity_spent),
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-amber-50',
    },
    {
      icon: Award,
      label: 'Loyalty Points',
      value: analytics.loyalty_points.toLocaleString(),
      color: 'from-purple-400 to-indigo-500',
      bgColor: 'bg-purple-50',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00B894] to-[#00CEC9] px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/user')}
            className="p-2 rounded-full bg-white/20 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <p className="text-white/80">Track your spending and usage patterns</p>
      </div>

      {/* Content */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B894]"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {statCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${card.bgColor} rounded-2xl p-4 ${index === 0 ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-xl bg-gradient-to-r ${card.color}`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">{card.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${index === 0 ? 'text-3xl' : ''} text-gray-800`}>
                    {card.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Transaction Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 shadow-sm mb-6"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Transaction Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold text-gray-800">{analytics?.transaction_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Top-ups</span>
                  <span className="font-semibold text-green-600">{formatCurrency(analytics?.total_topups || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(analytics?.total_spent || 0)}</span>
                </div>
              </div>
            </motion.div>

            {/* Monthly Breakdown */}
            {analytics?.monthly_breakdown && analytics.monthly_breakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Breakdown</h2>
                <div className="space-y-4">
                  {analytics.monthly_breakdown.map((month, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{month.month}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Wifi className="w-4 h-4 text-cyan-500" />
                          <span className="text-gray-600">{formatCurrency(month.wifi)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-gray-600">{formatCurrency(month.electricity)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600">{formatCurrency(month.topups)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="px-6 py-3">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { icon: Home, label: 'Dashboard', path: '/user', active: false },
              { icon: History, label: 'History', path: '/user/history', active: false },
              { icon: Wallet, label: 'Payments', path: '/user/topup', active: false },
              { icon: BarChart3, label: 'Analytics', path: '/user/analytics', active: true },
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
