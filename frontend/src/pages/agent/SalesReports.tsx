import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Loader2,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  ShoppingCart,
  Coins
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesReport {
  today: { sales: number; count: number; commission: number };
  week: { sales: number; count: number };
  month: { sales: number; count: number; commission: number };
  daily_breakdown: Array<{ date: string; sales: number; count: number }>;
  total_sales: number;
  commission_balance: number;
}

export default function SalesReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    const { data } = await api.getAgentSalesReport();
    if (data) {
      setReport(data);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportAgentSales();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 pb-8 rounded-b-[30px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/agent')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">Sales Reports</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </div>
        
        {/* Total Sales Card */}
        <Card className="bg-white/20 backdrop-blur border-0 text-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-indigo-100 text-sm">Total Sales</p>
                <p className="text-3xl font-bold">{formatCurrency(report?.total_sales || 0)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report?.today.sales || 0)}</p>
              <p className="text-xs text-gray-400">{report?.today.count || 0} sales</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">This Week</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report?.week.sales || 0)}</p>
              <p className="text-xs text-gray-400">{report?.week.count || 0} sales</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report?.month.sales || 0)}</p>
              <p className="text-xs text-gray-400">{report?.month.count || 0} sales</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Card */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commission Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.commission_balance || 0)}</p>
                </div>
              </div>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                onClick={() => navigate('/agent/commissions')}
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown Chart */}
        {report?.daily_breakdown && report.daily_breakdown.length > 0 && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-gray-900">Daily Sales (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.daily_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-ZA')}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="sales" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Commission */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Commission</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(report?.today.commission || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Monthly Commission</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(report?.month.commission || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
