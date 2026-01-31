import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  UserPlus,
  Loader2,
  Check,
  Gift
} from 'lucide-react';

export default function RegisterCustomerPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ bonus: number } | null>(null);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('27')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+27' + digits.slice(1);
    }
    return '+27' + digits;
  };

  const handleRegister = async () => {
    if (!phone || !firstName) {
      alert('Phone number and first name are required');
      return;
    }
    
    setLoading(true);
    const { data, error } = await api.registerCustomer(
      formatPhone(phone),
      firstName,
      lastName || undefined
    );
    setLoading(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setResult({ bonus: data.referral_bonus_earned });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent/customers')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Register New Customer</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Phone Number *</label>
              <Input
                type="tel"
                placeholder="081 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">First Name *</label>
              <Input
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">Last Name</label>
              <Input
                type="text"
                placeholder="Enter last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            
            <div className="bg-emerald-500/20 rounded-xl p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400">
                <Gift className="w-5 h-5" />
                <span className="font-medium">Referral Bonus</span>
              </div>
              <p className="text-sm text-emerald-300/80 mt-1">
                Earn R10 for every new customer you register!
              </p>
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              onClick={handleRegister}
              disabled={loading || !phone || !firstName}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Register Customer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="max-w-sm mx-4 bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              Customer Registered!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-slate-400 mb-4">
              {firstName} {lastName} has been registered successfully.
            </p>
            {result && result.bonus > 0 && (
              <div className="bg-emerald-500/20 rounded-xl p-4 border border-emerald-500/30">
                <Gift className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-emerald-400 font-medium">
                  You earned {formatCurrency(result.bonus)} referral bonus!
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                setResult(null);
                setPhone('');
                setFirstName('');
                setLastName('');
              }}
            >
              Register Another
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              onClick={() => navigate('/agent')}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
