import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Wifi,
  Zap,
  Loader2
} from 'lucide-react';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
  is_active: boolean;
  sort_order: number;
}

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kwh_amount: number;
  is_active: boolean;
  sort_order: number;
}

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [wifiPackages, setWifiPackages] = useState<WiFiPackage[]>([]);
  const [electricityPackages, setElectricityPackages] = useState<ElectricityPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wifi');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [wifiRes, elecRes] = await Promise.all([
      api.getAdminWiFiPackages(),
      api.getAdminElectricityPackages(),
    ]);
    if (wifiRes.data) setWifiPackages(wifiRes.data);
    if (elecRes.data) setElectricityPackages(elecRes.data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatData = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  const formatValidity = (hours: number) => {
    if (hours >= 720) {
      return `${Math.floor(hours / 720)} month${hours >= 1440 ? 's' : ''}`;
    }
    if (hours >= 24) {
      return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''}`;
    }
    return `${hours} hours`;
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
          <h1 className="text-xl font-bold">Product Management</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'wifi' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('wifi')}
            className={activeTab === 'wifi' ? 'bg-white text-[#1e3a5f] shadow-lg' : 'text-white hover:bg-white/20'}
          >
            <Wifi className="w-4 h-4 mr-1" />
            WiFi ({wifiPackages.length})
          </Button>
          <Button
            variant={activeTab === 'electricity' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('electricity')}
            className={activeTab === 'electricity' ? 'bg-white text-[#1e3a5f] shadow-lg' : 'text-white hover:bg-white/20'}
          >
            <Zap className="w-4 h-4 mr-1" />
            Electricity ({electricityPackages.length})
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {activeTab === 'wifi' ? (
          <div className="space-y-3">
            {wifiPackages.map((pkg) => (
              <Card key={pkg.id} className="bg-white border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.is_active ? 'bg-[#4da6e8]/20' : 'bg-gray-100'}`}>
                        <Wifi className={`w-6 h-6 ${pkg.is_active ? 'text-[#4da6e8]' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          {!pkg.is_active && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>{formatData(pkg.data_limit_mb)}</span>
                          <span>{formatValidity(pkg.validity_hours)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#4da6e8]">
                        {formatCurrency(pkg.price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {electricityPackages.map((pkg) => (
              <Card key={pkg.id} className="bg-white border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.is_active ? 'bg-amber-100' : 'bg-gray-100'}`}>
                        <Zap className={`w-6 h-6 ${pkg.is_active ? 'text-amber-500' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          {!pkg.is_active && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{pkg.kwh_amount} kWh</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-500">
                        {formatCurrency(pkg.price)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(pkg.price / pkg.kwh_amount)}/kWh
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
