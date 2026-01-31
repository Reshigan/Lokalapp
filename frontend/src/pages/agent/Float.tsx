import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Wallet,
  Loader2,
  AlertTriangle,
  CreditCard,
  Building,
  Check
} from 'lucide-react';

interface FloatInfo {
  float_balance: number;
  low_float_threshold: number;
  is_low: boolean;
}

export default function FloatPage() {
  const navigate = useNavigate();
  const [floatInfo, setFloatInfo] = useState<FloatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await api.getAgentFloat();
    if (data) setFloatInfo(data);
    setLoading(false);
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount < 100) {
      alert('Minimum top-up amount is R100');
      return;
    }
    
    setProcessing(true);
    const { error } = await api.topupFloat(amount, paymentMethod);
    setProcessing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    setSuccess(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
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
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 pb-28 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Float Management</h1>
        </div>
        
        {/* Balance Card */}
        <Card className={`bg-white/20 backdrop-blur border-0 text-white shadow-xl ${floatInfo?.is_low ? 'ring-2 ring-amber-400' : ''}`}>
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-indigo-200 text-sm">Current Float Balance</p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatCurrency(floatInfo?.float_balance || 0)}
                </p>
                {floatInfo?.is_low && (
                  <div className="flex items-center gap-1 mt-1 text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Below minimum threshold
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                className="bg-white text-indigo-600 hover:bg-gray-50 shadow-lg"
                onClick={() => setShowTopup(true)}
              >
                <Wallet className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="px-4 -mt-14 space-y-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-900">Float Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Current Balance</span>
              <span className="font-semibold text-gray-900">{formatCurrency(floatInfo?.float_balance || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Low Float Threshold</span>
              <span className="font-semibold text-gray-900">{formatCurrency(floatInfo?.low_float_threshold || 500)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold ${floatInfo?.is_low ? 'text-amber-500' : 'text-emerald-600'}`}>
                {floatInfo?.is_low ? 'Low' : 'Healthy'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-900">About Float</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Float is the balance you use to process customer transactions. 
              When you sell WiFi or electricity, the amount is deducted from your float.
              Keep your float topped up to ensure uninterrupted service.
            </p>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Minimum Float</span>
              </div>
              <p className="text-sm text-amber-600/80 mt-1">
                Maintain at least R500 to avoid service interruptions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Dialog */}
      <Dialog open={showTopup && !success} onOpenChange={setShowTopup}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Top Up Float</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">R</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="text-xl font-bold pl-8 border-gray-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: R100</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
              <div className="space-y-2">
                <button
                  className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    paymentMethod === 'CARD' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'CARD' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900">Card Payment</span>
                </button>
                <button
                  className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    paymentMethod === 'EFT' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('EFT')}
                >
                  <Building className={`w-5 h-5 ${paymentMethod === 'EFT' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900">Bank Transfer</span>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTopup(false)} className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl">
              Cancel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              onClick={handleTopup}
              disabled={processing || !topupAmount || parseFloat(topupAmount) < 100}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={success} onOpenChange={() => {
        setSuccess(false);
        setShowTopup(false);
      }}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              Top Up Initiated!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-500">
              Your float top-up of {formatCurrency(parseFloat(topupAmount))} has been initiated.
              In production, you would be redirected to complete payment.
            </p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              onClick={() => {
                setSuccess(false);
                setShowTopup(false);
                setTopupAmount('');
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
