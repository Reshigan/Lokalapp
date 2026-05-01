import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (password.length < 6) return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    const r = isRegister
      ? await api.registerWithPassword(phone, password, firstName, lastName)
      : await api.loginWithPassword(phone, password);
    setLoading(false);
    if (r.error) return setError(r.error);
    if (r.data) {
      await login(r.data.access_token, r.data.refresh_token);
      const isAgent = 'is_agent' in r.data ? r.data.is_agent : false;
      navigate(isAgent ? '/agent' : '/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-bg">
      {/* Left brand panel (desktop) */}
      <div className="hidden md:flex flex-col justify-between md:w-[45%] lg:w-[50%] bg-brand-gradient text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-accent-400 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-brand-400 blur-3xl" />
        </div>
        <Logo size={48} showWordmark invert />
        <div className="relative">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Power, prepaid<br />and paid for, locally.
          </h1>
          <p className="text-white/80 mt-4 max-w-md">
            Wallet, WiFi, prepaid units, postpaid electricity billing and cash settlement —
            built for community agents and the households they serve.
          </p>
          <div className="mt-10 flex gap-6 text-sm text-white/80">
            <div>
              <p className="text-2xl font-semibold text-white">Postpaid</p>
              <p>tariff-based invoices</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-semibold text-white">2-party</p>
              <p>cash confirmations</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-semibold text-white">PWA</p>
              <p>installable + push</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-white/60">© Lokal Platform</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 md:py-16">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center justify-center mb-8">
            <Logo size={40} showWordmark />
          </div>

          <div className="card p-6 md:p-8 animate-slide-up">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isRegister ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {isRegister ? 'Set up your Lokal account in seconds.' : 'Welcome back.'}
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-danger-soft text-red-700 text-sm px-3.5 py-2.5">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">First name</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div>
                    <label className="field-label">Last name</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>
              )}

              <div>
                <label className="field-label">Phone number</label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="081 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="field-label">Confirm password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || phone.length < 9 || password.length < 6}
                className="w-full"
                size="lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isRegister ? 'Create account' : 'Sign in'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => { setIsRegister((v) => !v); setError(''); }}
                className="text-accent-600 hover:text-accent-700 font-medium"
              >
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex-1 h-px bg-surface-border" />
              <span>or</span>
              <span className="flex-1 h-px bg-surface-border" />
            </div>

            <Link to="/register/agent">
              <Button variant="outline" className="w-full" size="lg">Register as agent</Button>
            </Link>
          </div>

          <p className="text-center mt-6 text-xs text-ink-muted">
            By continuing you agree to the Lokal terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
