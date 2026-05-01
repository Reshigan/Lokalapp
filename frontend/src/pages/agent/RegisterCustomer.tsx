import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import api from '@/services/api';
import { Loader2, UserPlus, Check } from 'lucide-react';

const normalizePhone = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (digits.startsWith('27')) return '+' + digits;
  if (digits.startsWith('0')) return '+27' + digits.slice(1);
  return digits ? '+27' + digits : '';
};

export default function RegisterCustomerPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ bonus: number; id: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || !first) return setError('Phone and first name are required.');
    setLoading(true);
    const r = await api.registerCustomer(normalizePhone(phone), first, last || undefined);
    setLoading(false);
    if (r.error) return setError(r.error);
    if (r.data) setSuccess({ bonus: r.data.referral_bonus_earned, id: r.data.customer_id });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader title="Register customer" description="Add a new customer to your book." back="/agent/customers" />

      {success ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-success-soft text-emerald-700 grid place-items-center">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">Customer registered</h3>
            {success.bonus > 0 && (
              <p className="text-sm text-ink-muted">You earned R{success.bonus.toFixed(2)} referral bonus.</p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/agent/customers')}>Back to customers</Button>
              <Button onClick={() => navigate(`/agent/customers/${success.id}`)}>Open customer</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit}>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="field-label">Phone *</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 81 234 5678" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First name *</label>
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Last name</label>
                  <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="optional" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Register
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
