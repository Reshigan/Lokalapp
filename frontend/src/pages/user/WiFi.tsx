import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  Wifi, 
  ArrowLeft, 
  Check, 
  Copy, 
  Loader2,
  Clock,
  Database
} from 'lucide-react';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
}

interface WiFiVoucher {
  id: string;
  package_name: string;
  voucher_code: string;
  status: string;
  data_limit_mb: number;
  data_used_mb: number;
  data_remaining_mb: number;
  validity_hours: number;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function WiFiPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<WiFiPackage[]>([]);
  const [vouchers, setVouchers] = useState<WiFiVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<WiFiPackage | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ voucher_code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'vouchers'>('buy');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [packagesRes, vouchersRes] = await Promise.all([
      api.getWiFiPackages(),
      api.getWiFiVouchers(),
    ]);
    if (packagesRes.data) setPackages(packagesRes.data);
    if (vouchersRes.data) setVouchers(vouchersRes.data);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    const { data, error } = await api.purchaseWiFi(selectedPackage.id);
    setPurchasing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setPurchaseResult({ voucher_code: data.voucher_code });
      loadData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNUSED': return 'secondary';
      case 'ACTIVE': return 'success';
      case 'EXPIRED': return 'destructive';
      case 'DEPLETED': return 'warning';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">WiFi Vouchers</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'buy' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('buy')}
            className={activeTab === 'buy' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'}
          >
            Buy Data
          </Button>
          <Button
            variant={activeTab === 'vouchers' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('vouchers')}
            className={activeTab === 'vouchers' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/20'}
          >
            My Vouchers ({vouchers.length})
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {activeTab === 'buy' ? (
          <div className="space-y-3">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPackage(pkg)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Wifi className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{pkg.name}</h3>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {formatData(pkg.data_limit_mb)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatValidity(pkg.validity_hours)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
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
            {vouchers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <Wifi className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No vouchers yet</p>
                  <Button 
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setActiveTab('buy')}
                  >
                    Buy Your First Voucher
                  </Button>
                </CardContent>
              </Card>
            ) : (
              vouchers.map((voucher) => (
                <Card key={voucher.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{voucher.package_name}</h3>
                        <Badge variant={getStatusColor(voucher.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {voucher.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(voucher.voucher_code)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Code
                      </Button>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 font-mono text-center text-lg">
                      {voucher.voucher_code}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Data</p>
                        <p className="font-medium">
                          {formatData(voucher.data_remaining_mb)} / {formatData(voucher.data_limit_mb)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Validity</p>
                        <p className="font-medium">{formatValidity(voucher.validity_hours)}</p>
                      </div>
                    </div>
                    {voucher.status === 'ACTIVE' && voucher.expires_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Expires: {new Date(voucher.expires_at).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!selectedPackage && !purchaseResult} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase a WiFi voucher
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="py-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Wifi className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                <h3 className="font-bold text-lg">{selectedPackage.name}</h3>
                <p className="text-gray-600">{selectedPackage.description}</p>
                <div className="flex justify-center gap-4 mt-3 text-sm">
                  <span>{formatData(selectedPackage.data_limit_mb)}</span>
                  <span>{formatValidity(selectedPackage.validity_hours)}</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-3">
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPackage(null)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Success Dialog */}
      <Dialog open={!!purchaseResult} onOpenChange={() => setPurchaseResult(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>
          {purchaseResult && (
            <div className="py-4">
              <p className="text-center text-gray-600 mb-4">
                Your WiFi voucher code is:
              </p>
              <div className="bg-gray-100 rounded-lg p-4 font-mono text-center text-xl">
                {purchaseResult.voucher_code}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => copyToClipboard(purchaseResult.voucher_code)}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setPurchaseResult(null);
                setSelectedPackage(null);
                setActiveTab('vouchers');
              }}
            >
              View My Vouchers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
