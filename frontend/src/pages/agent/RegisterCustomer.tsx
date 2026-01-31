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
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
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
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number *</label>
              <Input
                type="tel"
                placeholder="081 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <Input
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <Input
                type="text"
                placeholder="Enter last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-600">
                <Gift className="w-5 h-5" />
                <span className="font-medium">Referral Bonus</span>
              </div>
              <p className="text-sm text-emerald-600/80 mt-1">
                Earn R10 for every new customer you register!
              </p>
            </div>

            <Button
              className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2d5a87]"
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
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              Customer Registered!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-500 mb-4">
              {firstName} {lastName} has been registered successfully.
            </p>
            {result && result.bonus > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <Gift className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-emerald-600 font-medium">
                  You earned {formatCurrency(result.bonus)} referral bonus!
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
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
              className="flex-1 bg-[#1e3a5f] hover:bg-[#2d5a87]"
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
