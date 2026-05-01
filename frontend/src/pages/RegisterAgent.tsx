import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Loader2, ArrowRight, Check, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPES = [
  { id: 'SPAZA',     label: 'Spaza shop' },
  { id: 'TRADER',    label: 'Trader' },
  { id: 'COMMUNITY', label: 'Community' },
  { id: 'OTHER',     label: 'Other' },
];

const normalizePhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('27')) return '+' + d;
  if (d.startsWith('0')) return '+27' + d.slice(1);
  return d ? '+27' + d : '';
};

export default function RegisterAgent() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'details' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('SPAZA');
  const [address, setAddress] = useState('');
  const [initialFloat, setInitialFloat] = useState('500');
  const [agentCode, setAgentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async () => {
    setError(''); setLoading(true);
    const p = normalizePhone(phone);
    const r = await api.requestOTP(p);
    setLoading(false);
    if (r.error) return setError(r.error);
    if (r.data?.debug_otp) setDebugOtp(r.data.debug_otp);
    setPhone(p);
    setStep('otp');
  };

  const verifyOtp = async () => {
    setError(''); setLoading(true);
    const r = await api.verifyOTP(phone, otp);
    setLoading(false);
    if (r.error) return setError(r.error);
    if (r.data) {
      await login(r.data.access_token, r.data.refresh_token);
      setStep('details');
    }
  };

  const submit = async () => {
    setError(''); setLoading(true);
    const r = await api.registerAgent({
      business_name: businessName,
      business_type: businessType,
      address: address || undefined,
      initial_float: parseFloat(initialFloat) || 0,
    });
    setLoading(false);
    if (r.error) return setError(r.error);
    if (r.data) {
      setAgentCode(r.data.agent_code);
      setStep('done');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-surface-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Logo size={36} showWordmark />
        </div>

        <Card>
          <CardContent className="p-6 md:p-7 space-y-5">
            <div className="flex justify-between text-xs">
              {(['phone', 'otp', 'details', 'done'] as const).map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    'flex-1 h-1 rounded-full mx-0.5',
                    ['phone', 'otp', 'details', 'done'].indexOf(step) >= i ? 'bg-brand-700' : 'bg-surface-border',
                  )}
                />
              ))}
            </div>

            {step === 'phone' && (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Become an agent</h2>
                  <p className="text-sm text-ink-muted mt-1">Earn commission selling Lokal services in your community.</p>
                </div>
                <div>
                  <label className="field-label">Phone number</label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 81 234 5678" />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" disabled={loading || phone.length < 9} onClick={requestOtp}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Enter code</h2>
                  <p className="text-sm text-ink-muted mt-1">We sent a 6-digit code to {phone}.</p>
                </div>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.4em] h-14"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                {debugOtp && <p className="text-xs text-ink-muted text-center">Dev OTP: <code>{debugOtp}</code></p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" disabled={loading || otp.length !== 6} onClick={verifyOtp}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>Use a different number</Button>
              </>
            )}

            {step === 'details' && (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Business details</h2>
                  <p className="text-sm text-ink-muted mt-1">Tell us about your operation.</p>
                </div>
                <div>
                  <label className="field-label">Business name</label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <select className="field" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                    {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Address</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="optional" />
                </div>
                <div>
                  <label className="field-label">Initial float (R)</label>
                  <Input type="number" value={initialFloat} onChange={(e) => setInitialFloat(e.target.value)} />
                  <p className="text-xs text-ink-muted mt-1">Working capital for customer transactions.</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" disabled={loading || !businessName} onClick={submit}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                  Register agent
                </Button>
              </>
            )}

            {step === 'done' && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-success-soft text-emerald-700 grid place-items-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">You're registered</h2>
                  <p className="text-sm text-ink-muted mt-1">Agent code <code className="font-mono">{agentCode}</code></p>
                </div>
                <Button onClick={() => navigate('/agent')} className="w-full">
                  Open agent dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/login')} className="text-xs text-ink-muted hover:text-ink">
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
