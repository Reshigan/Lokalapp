import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  Zap, 
  ArrowLeft, 
  Check, 
  Loader2,
  Battery,
  Search
} from 'lucide-react';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kwh_amount: number;
}

export default function SellElectricityPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<ElectricityPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<ElectricityPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ reference: string; kwh: number; commission: number } | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await api.getElectricityPackages();
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
    if (!selectedPackage || !customerPhone || !meterNumber) return;
    
    const cash = parseFloat(cashReceived);
    if (isNaN(cash) || cash < selectedPackage.price) {
      alert(`Cash received must be at least ${formatCurrency(selectedPackage.price)}`);
      return;
    }
    
    setProcessing(true);
    const { data, error } = await api.processAgentTransaction({
      customer_phone: formatPhone(customerPhone),
      product_type: 'ELECTRICITY',
      package_id: selectedPackage.id,
      meter_id: meterNumber,
      cash_received: cash,
    });
    setProcessing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setResult({
        reference: data.reference,
        kwh: selectedPackage.kwh_amount,
        commission: data.commission_earned,
      });
    }
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
        <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Sell Electricity</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Customer Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
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
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Meter Number</label>
              <div className="relative mt-2">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter meter number"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                  ? 'ring-2 ring-yellow-500 bg-yellow-50' 
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
                      selectedPackage?.id === pkg.id ? 'bg-yellow-500' : 'bg-yellow-100'
                    }`}>
                      <Zap className={`w-6 h-6 ${
                        selectedPackage?.id === pkg.id ? 'text-white' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Battery className="w-4 h-4" />
                        {pkg.kwh_amount} kWh
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">
                      {formatCurrency(pkg.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(pkg.price / pkg.kwh_amount)}/kWh
                    </p>
                  </div>
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
          className="w-full h-14 text-lg bg-yellow-600 hover:bg-yellow-700"
          onClick={handleSell}
          disabled={processing || !selectedPackage || !customerPhone || !meterNumber || parseFloat(cashReceived) < (selectedPackage?.price || 0)}
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
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <Zap className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
                <p className="text-2xl font-bold">{result.kwh} kWh</p>
                <p className="text-gray-600">added to meter</p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">Reference</p>
                <p className="font-mono">{result.reference}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              onClick={() => {
                setResult(null);
                setSelectedPackage(null);
                setCustomerPhone('');
                setMeterNumber('');
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
