import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  DollarSign,
  Loader2,
  TrendingUp,
  Wallet,
  Check
} from 'lucide-react';

interface CommissionData {
  balance: number;
  pending: number;
  total_earned: number;
  transactions: Array<{
    id: string;
    amount: number;
    commission: number;
    description: string;
    created_at: string;
  }>;
}

export default function CommissionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: commData } = await api.getAgentCommissions();
    if (commData) setData(commData);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (data && amount > data.balance) {
      alert('Insufficient commission balance');
      return;
    }
    
    setWithdrawing(true);
    const { error } = await api.withdrawCommission(amount, 'WALLET');
    setWithdrawing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    setWithdrawSuccess(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 pb-28 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">My Earnings</h1>
        </div>
        
        {/* Balance Card */}
        <Card className="bg-white/10 backdrop-blur border-0 text-white shadow-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[#4da6e8] text-sm">Available to Withdraw</p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatCurrency(data?.balance || 0)}
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-white text-[#1e3a5f] hover:bg-gray-50 shadow-lg"
                onClick={() => {
                  setWithdrawAmount(data?.balance.toString() || '');
                  setShowWithdraw(true);
                }}
                disabled={!data || data.balance <= 0}
              >
                <Wallet className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-14">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Total Earned</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(data?.total_earned || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-500">
                {formatCurrency(data?.pending || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Commissions */}
        <Card className="bg-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#1e3a5f]">Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.transactions.length ? (
              <div className="p-6 text-center text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No commissions yet</p>
                <p className="text-sm mt-1">Start selling to earn commissions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        +{formatCurrency(tx.commission)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Sale: {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw && !withdrawSuccess} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Withdraw Commission</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-2">
              Available: {formatCurrency(data?.balance || 0)}
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">R</span>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="text-xl font-bold pl-8 border-gray-200"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Funds will be transferred to your wallet
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowWithdraw(false)} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            >
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={withdrawSuccess} onOpenChange={() => {
        setWithdrawSuccess(false);
        setShowWithdraw(false);
      }}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              Withdrawal Successful!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-500">
              {formatCurrency(parseFloat(withdrawAmount))} has been transferred to your wallet.
            </p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => {
                setWithdrawSuccess(false);
                setShowWithdraw(false);
                setWithdrawAmount('');
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
