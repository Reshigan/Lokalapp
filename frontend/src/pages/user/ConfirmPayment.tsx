import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function ConfirmPaymentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await api.confirmCollection(id, code.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/user')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Confirm cash payment</h1>
        </div>
        <p className="text-green-100 text-sm mt-1">Enter the 6-digit code shown by your agent.</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {success ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
              <h3 className="font-bold text-lg">Payment confirmed</h3>
              <p className="text-sm text-gray-600">Your invoice has been marked paid.</p>
              <Button onClick={() => navigate('/user/invoices')} className="bg-green-600 hover:bg-green-700 rounded-xl">
                See invoices
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submit}>
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  className="text-2xl font-mono tracking-widest text-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={busy || code.length !== 6} className="w-full bg-green-600 hover:bg-green-700 rounded-xl">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm payment
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
