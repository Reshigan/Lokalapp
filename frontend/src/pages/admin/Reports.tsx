import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Loader2,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AgentPerformance {
  agent_code: string;
  business_name: string;
  tier: string;
  total_sales: number;
  monthly_sales: number;
  commission_balance: number;
}

interface RevenueData {
  period_days: number;
  daily_revenue: Array<{ date: string; amount: number }>;
  by_product: { wifi: number; electricity: number; other: number };
  total: number;
}

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [topAgents, setTopAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    const [revenueRes, agentsRes] = await Promise.all([
      api.getRevenueReport(period),
      api.getAgentPerformanceReport(period),
    ]);
    if (revenueRes.data) setRevenue(revenueRes.data);
    if (agentsRes.data) setTopAgents(agentsRes.data.top_agents);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'text-yellow-600';
      case 'SILVER': return 'text-gray-500';
      case 'PLATINUM': return 'text-purple-600';
      default: return 'text-orange-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={period === days ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(days)}
              className={period === days ? 'bg-white text-[#1e3a5f] shadow-lg' : 'text-white hover:bg-white/20'}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Revenue Summary */}
        <Card className="bg-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1e3a5f]">
              <TrendingUp className="w-5 h-5" />
              Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">Total Revenue ({period} days)</p>
              <p className="text-3xl font-bold text-[#1e3a5f]">
                {formatCurrency(revenue?.total || 0)}
              </p>
            </div>
            
            {revenue && revenue.daily_revenue.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue.daily_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-ZA', { day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-ZA')}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      labelStyle={{ color: '#1e3a5f' }}
                    />
                    <Bar dataKey="amount" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="text-center p-2 bg-[#4da6e8]/20 rounded-xl">
                <p className="text-xs text-gray-500">WiFi</p>
                <p className="font-semibold text-[#4da6e8]">
                  {formatCurrency(revenue?.by_product.wifi || 0)}
                </p>
              </div>
              <div className="text-center p-2 bg-amber-100 rounded-xl">
                <p className="text-xs text-gray-500">Electricity</p>
                <p className="font-semibold text-amber-500">
                  {formatCurrency(revenue?.by_product.electricity || 0)}
                </p>
              </div>
              <div className="text-center p-2 bg-gray-100 rounded-xl">
                <p className="text-xs text-gray-500">Other</p>
                <p className="font-semibold text-gray-600">
                  {formatCurrency(revenue?.by_product.other || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card className="bg-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1e3a5f]">
              <Award className="w-5 h-5" />
              Top Performing Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No agent data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topAgents.slice(0, 10).map((agent, index) => (
                  <div key={agent.agent_code} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-600' :
                      index === 1 ? 'bg-gray-200 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-900">{agent.business_name}</p>
                      <p className="text-xs text-gray-500">
                        <span className={getTierColor(agent.tier)}>{agent.tier}</span>
                        {' '}&middot;{' '}{agent.agent_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(agent.total_sales)}</p>
                      <p className="text-xs text-gray-500">
                        This month: {formatCurrency(agent.monthly_sales)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
