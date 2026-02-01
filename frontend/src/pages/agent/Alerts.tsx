import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Loader2,
  Bell,
  AlertTriangle,
  Settings,
  Wallet,
  CheckCircle
} from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  threshold: number | null;
  current_balance: number | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

interface AlertsData {
  alerts: Alert[];
  current_float: number;
  low_float_threshold: number;
  is_low: boolean;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const { data: alertsData } = await api.getAgentAlerts();
    if (alertsData) {
      setData(alertsData);
      setThreshold(alertsData.low_float_threshold.toString());
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const { error } = await api.updateAgentAlertSettings(parseFloat(threshold));
    if (!error) {
      await loadAlerts();
      setSettingsOpen(false);
    }
    setSaving(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'low_float':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'float_topped_up':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-500" />;
    }
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
            <h1 className="text-xl font-bold">Float Alerts</h1>
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Alert Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Low Float Threshold
                  </label>
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="Enter amount"
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You'll be alerted when your float drops below this amount
                  </p>
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Float Status Card */}
        <Card className={`border-0 ${data?.is_low ? 'bg-amber-500/20' : 'bg-white/20'} backdrop-blur text-white`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${data?.is_low ? 'bg-amber-500/30' : 'bg-white/20'} rounded-xl flex items-center justify-center`}>
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Current Float</p>
                  <p className="text-2xl font-bold">{formatCurrency(data?.current_float || 0)}</p>
                </div>
              </div>
              {data?.is_low && (
                <div className="flex items-center gap-2 bg-amber-500 px-3 py-1 rounded-full">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Low</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-indigo-100">
                Alert threshold: {formatCurrency(data?.low_float_threshold || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <div className="px-4 -mt-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-900">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!data?.alerts || data.alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No alerts yet</p>
                <p className="text-sm text-gray-400">You'll see alerts here when your float is low</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-xl p-4 ${alert.is_read ? 'border-gray-100 bg-white' : 'border-indigo-200 bg-indigo-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        alert.alert_type === 'low_float' ? 'bg-amber-100' : 'bg-green-100'
                      }`}>
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 capitalize">
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(alert.created_at)}
                          </span>
                        </div>
                        {alert.message && (
                          <p className="text-sm text-gray-600">{alert.message}</p>
                        )}
                        {alert.current_balance !== null && (
                          <p className="text-sm text-gray-500 mt-1">
                            Balance: {formatCurrency(alert.current_balance)}
                          </p>
                        )}
                      </div>
                      {!alert.is_read && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Button 
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12"
          onClick={() => navigate('/agent/float')}
        >
          <Wallet className="w-4 h-4 mr-2" />
          Top Up Float
        </Button>
      </div>
    </div>
  );
}
