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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 pb-24 rounded-b-3xl">
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
        <Card className={`bg-white/10 backdrop-blur border-0 text-white ${floatInfo?.is_low ? 'ring-2 ring-yellow-400' : ''}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-indigo-200 text-sm">Current Float Balance</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(floatInfo?.float_balance || 0)}
                </p>
                {floatInfo?.is_low && (
                  <div className="flex items-center gap-1 mt-1 text-yellow-300 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Below minimum threshold
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                className="bg-white text-indigo-700 hover:bg-indigo-50"
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
      <div className="px-4 -mt-12 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Float Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Current Balance</span>
              <span className="font-semibold">{formatCurrency(floatInfo?.float_balance || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Low Float Threshold</span>
              <span className="font-semibold">{formatCurrency(floatInfo?.low_float_threshold || 500)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold ${floatInfo?.is_low ? 'text-yellow-600' : 'text-green-600'}`}>
                {floatInfo?.is_low ? 'Low' : 'Healthy'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">About Float</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Float is the balance you use to process customer transactions. 
              When you sell WiFi or electricity, the amount is deducted from your float.
              Keep your float topped up to ensure uninterrupted service.
            </p>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Minimum Float</span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">
                Maintain at least R500 to avoid service interruptions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Dialog */}
      <Dialog open={showTopup && !success} onOpenChange={setShowTopup}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Top Up Float</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">R</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="text-xl font-bold pl-8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: R100</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <div className="space-y-2">
                <button
                  className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    paymentMethod === 'CARD' 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'CARD' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Card Payment</span>
                </button>
                <button
                  className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    paymentMethod === 'EFT' 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('EFT')}
                >
                  <Building className={`w-5 h-5 ${paymentMethod === 'EFT' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Bank Transfer</span>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTopup(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
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
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              Top Up Initiated!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-600">
              Your float top-up of {formatCurrency(parseFloat(topupAmount))} has been initiated.
              In production, you would be redirected to complete payment.
            </p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
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
