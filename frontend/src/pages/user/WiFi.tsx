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
  Database,
  Share2
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

  const shareVoucher = async (voucherCode: string, packageName: string) => {
    const shareData = {
      title: 'Lokal WiFi Voucher',
      text: `Here's your WiFi voucher code: ${voucherCode}\n\nPackage: ${packageName}\n\nConnect to Lokal WiFi and enter this code to get online!`,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(voucherCode);
        }
      }
    } else {
      copyToClipboard(voucherCode);
    }
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
        <Loader2 className="w-8 h-8 animate-spin text-[#4da6e8]" />
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
            className={activeTab === 'buy' ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/20'}
          >
            Buy Data
          </Button>
          <Button
            variant={activeTab === 'vouchers' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('vouchers')}
            className={activeTab === 'vouchers' ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/20'}
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
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-0 shadow-md"
                onClick={() => setSelectedPackage(pkg)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-[#4da6e8] rounded-2xl flex items-center justify-center shadow-lg">
                        <Wifi className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
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
                      <p className="text-lg font-bold text-[#1e3a5f]">
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
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <Wifi className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No vouchers yet</p>
                  <Button 
                    className="mt-4 bg-[#1e3a5f] hover:bg-[#2d5a87]"
                    onClick={() => setActiveTab('buy')}
                  >
                    Buy Your First Voucher
                  </Button>
                </CardContent>
              </Card>
            ) : (
              vouchers.map((voucher) => (
                <Card key={voucher.id} className="bg-white border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{voucher.package_name}</h3>
                        <Badge variant={getStatusColor(voucher.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {voucher.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 text-gray-600 hover:bg-gray-50"
                          onClick={() => copyToClipboard(voucher.voucher_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#4da6e8] text-[#4da6e8] hover:bg-[#4da6e8]/10"
                          onClick={() => shareVoucher(voucher.voucher_code, voucher.package_name)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-[#1e3a5f] rounded-lg p-3 font-mono text-center text-lg text-white">
                      {voucher.voucher_code}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Data</p>
                        <p className="font-medium text-gray-900">
                          {formatData(voucher.data_remaining_mb)} / {formatData(voucher.data_limit_mb)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Validity</p>
                        <p className="font-medium text-gray-900">{formatValidity(voucher.validity_hours)}</p>
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
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Confirm Purchase</DialogTitle>
            <DialogDescription className="text-gray-500">
              You are about to purchase a WiFi voucher
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="py-4">
              <div className="bg-[#4da6e8]/10 rounded-xl p-4 text-center border border-[#4da6e8]/30">
                <Wifi className="w-12 h-12 mx-auto text-[#4da6e8] mb-2" />
                <h3 className="font-bold text-lg text-gray-900">{selectedPackage.name}</h3>
                <p className="text-gray-500">{selectedPackage.description}</p>
                <div className="flex justify-center gap-4 mt-3 text-sm text-gray-600">
                  <span>{formatData(selectedPackage.data_limit_mb)}</span>
                  <span>{formatValidity(selectedPackage.validity_hours)}</span>
                </div>
                <p className="text-2xl font-bold text-[#1e3a5f] mt-3">
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPackage(null)} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
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
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>
          {purchaseResult && (
            <div className="py-4">
              <p className="text-center text-gray-500 mb-4">
                Your WiFi voucher code is:
              </p>
              <div className="bg-[#1e3a5f] rounded-lg p-4 font-mono text-center text-xl text-white">
                {purchaseResult.voucher_code}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                  onClick={() => copyToClipboard(purchaseResult.voucher_code)}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  className="flex-1 bg-[#4da6e8] hover:bg-[#3d96d8]"
                  onClick={() => shareVoucher(purchaseResult.voucher_code, selectedPackage?.name || 'WiFi')}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]"
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
