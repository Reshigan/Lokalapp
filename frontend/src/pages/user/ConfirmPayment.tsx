import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import api from '@/services/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

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
    const r = await api.confirmCollection(id, code.trim());
    setBusy(false);
    if (r.error) return setError(r.error);
    setSuccess(true);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <PageHeader title="Confirm cash payment" description="Enter the 6-digit code your agent shared." back="/user" />

      {success ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-success-soft text-emerald-700 grid place-items-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">Payment confirmed</h3>
            <p className="text-sm text-ink-muted">Your invoice has been marked paid.</p>
            <Button onClick={() => navigate('/user/invoices')}>See invoices</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit}>
            <CardContent className="p-6 space-y-4">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-3xl font-mono tracking-[0.4em] h-16"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={busy || code.length !== 6} className="w-full" size="lg">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm payment
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
