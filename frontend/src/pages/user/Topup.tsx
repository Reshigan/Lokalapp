import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { 
  ArrowLeft, 
  CreditCard,
  Smartphone,
  Building,
  Loader2,
  Check
} from 'lucide-react';

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export default function TopupPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleTopup = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      alert('Minimum top-up amount is R10');
      return;
    }
    
    setLoading(true);
    const { data, error } = await api.initiateTopup(numAmount, paymentMethod);
    setLoading(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      // In a real app, this would redirect to payment gateway
      // For demo, we'll simulate success
      setSuccess(true);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900">Top-up Initiated!</h2>
            <p className="text-gray-500 mb-6">
              Your top-up of {formatCurrency(parseFloat(amount))} has been initiated.
              In a production environment, you would be redirected to complete payment.
            </p>
            <Button 
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => navigate('/user')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Top Up Wallet</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Amount Input */}
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-500">Enter Amount</label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">R</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-3xl font-bold pl-10 h-16 text-center border-gray-200 text-gray-900 placeholder:text-gray-300"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Minimum: R10</p>
          </CardContent>
        </Card>

        {/* Quick Amounts */}
        <div className="grid grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <Button
              key={preset}
              variant={amount === preset.toString() ? 'default' : 'outline'}
              className={amount === preset.toString() ? 'bg-[#1e3a5f]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}
              onClick={() => setAmount(preset.toString())}
            >
              R{preset}
            </Button>
          ))}
        </div>

        {/* Payment Method */}
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-500 mb-3 block">Payment Method</label>
            <div className="space-y-2">
              <button
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  paymentMethod === 'CARD' 
                    ? 'border-[#4da6e8] bg-[#4da6e8]/10' 
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'CARD' ? 'text-[#4da6e8]' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Card Payment</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard</p>
                </div>
              </button>
              
              <button
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  paymentMethod === 'EFT' 
                    ? 'border-[#4da6e8] bg-[#4da6e8]/10' 
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('EFT')}
              >
                <Building className={`w-6 h-6 ${paymentMethod === 'EFT' ? 'text-[#4da6e8]' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Bank Transfer (EFT)</p>
                  <p className="text-sm text-gray-500">Instant EFT</p>
                </div>
              </button>
              
              <button
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  paymentMethod === 'MOBILE' 
                    ? 'border-[#4da6e8] bg-[#4da6e8]/10' 
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('MOBILE')}
              >
                <Smartphone className={`w-6 h-6 ${paymentMethod === 'MOBILE' ? 'text-[#4da6e8]' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Mobile Money</p>
                  <p className="text-sm text-gray-500">SnapScan, Zapper</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Top Up Button */}
        <Button
          className="w-full h-14 text-lg bg-[#1e3a5f] hover:bg-[#2d5a87]"
          onClick={handleTopup}
          disabled={loading || !amount || parseFloat(amount) < 10}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Top Up {amount ? formatCurrency(parseFloat(amount)) : ''}
        </Button>
      </div>
    </div>
  );
}
