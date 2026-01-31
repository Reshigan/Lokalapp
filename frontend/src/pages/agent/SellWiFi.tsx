import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Search
} from 'lucide-react';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
}

export default function SellWiFiPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<WiFiPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<WiFiPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ voucher_code: string; commission: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await api.getWiFiPackages();
    if (data) setPackages(data);
    setLoading(false);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('27')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+27' + digits.slice(1);
    }
    return '+27' + digits;
  };

  const handleSell = async () => {
    if (!selectedPackage || !customerPhone) return;
    
    const cash = parseFloat(cashReceived);
    if (isNaN(cash) || cash < selectedPackage.price) {
      alert(`Cash received must be at least ${formatCurrency(selectedPackage.price)}`);
      return;
    }
    
    setProcessing(true);
    const { data, error } = await api.processAgentTransaction({
      customer_phone: formatPhone(customerPhone),
      product_type: 'WIFI',
      package_id: selectedPackage.id,
      cash_received: cash,
    });
    setProcessing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setResult({
        voucher_code: data.voucher_code || '',
        commission: data.commission_earned,
      });
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

  const change = selectedPackage && cashReceived 
    ? parseFloat(cashReceived) - selectedPackage.price 
    : 0;

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
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Sell WiFi Voucher</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Customer Phone */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-500">Customer Phone Number</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                placeholder="081 234 5678"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Package Selection */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Select Package</h2>
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`cursor-pointer transition-all ${
                selectedPackage?.id === pkg.id 
                  ? 'ring-2 ring-blue-600 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => {
                setSelectedPackage(pkg);
                setCashReceived(pkg.price.toString());
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedPackage?.id === pkg.id ? 'bg-blue-600' : 'bg-blue-100'
                    }`}>
                      <Wifi className={`w-6 h-6 ${
                        selectedPackage?.id === pkg.id ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
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
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(pkg.price)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cash Received */}
        {selectedPackage && (
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-medium text-gray-500">Cash Received</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">R</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="text-xl font-bold pl-8"
                />
              </div>
              {change > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500">Change to give</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(change)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sell Button */}
        <Button
          className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
          onClick={handleSell}
          disabled={processing || !selectedPackage || !customerPhone || parseFloat(cashReceived) < (selectedPackage?.price || 0)}
        >
          {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Complete Sale
        </Button>
      </div>

      {/* Success Dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              Sale Complete!
            </DialogTitle>
            <DialogDescription className="text-center">
              Commission earned: <span className="font-bold text-green-600">{formatCurrency(result?.commission || 0)}</span>
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="py-4">
              <p className="text-center text-gray-600 mb-2">
                WiFi Voucher Code:
              </p>
              <div className="bg-gray-100 rounded-lg p-4 font-mono text-center text-xl">
                {result.voucher_code}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => copyToClipboard(result.voucher_code)}
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
                setResult(null);
                setSelectedPackage(null);
                setCustomerPhone('');
                setCashReceived('');
              }}
            >
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
