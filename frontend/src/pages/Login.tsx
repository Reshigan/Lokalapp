import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Lock, ArrowRight, Loader2, UserPlus } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('27')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+27' + digits.slice(1);
    }
    return '+27' + digits;
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    setError('');
    const formattedPhone = formatPhone(phone);
    
    const { data, error: apiError } = await api.requestOTP(formattedPhone);
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data?.debug_otp) {
      setDebugOtp(data.debug_otp);
    }
    setPhone(formattedPhone);
    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');
    
    const { data, error: apiError } = await api.verifyOTP(phone, otp);
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data) {
      await login(data.access_token, data.refresh_token);
      navigate('/');
    }
  };

  const handlePINLogin = async () => {
    setLoading(true);
    setError('');
    const formattedPhone = formatPhone(phone);
    
    const { data, error: apiError } = await api.loginWithPIN(formattedPhone, pin);
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data) {
      await login(data.access_token, data.refresh_token);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] flex flex-col">
      {/* Header with decorative shapes */}
      <div className="relative pt-12 pb-16 px-6">
        <div className="absolute top-8 right-8 w-16 h-16 border-2 border-white/20 rotate-45" />
        <div className="absolute top-20 right-20 w-8 h-8 bg-white/10 rounded-full" />
        <div className="absolute top-32 left-8 w-6 h-6 border-2 border-white/20 rounded-full" />
        
        <div className="flex justify-center mb-6">
          <img src="/lokal-icon.png" alt="Lokal" className="w-20 h-20" />
        </div>
        <h1 className="text-3xl font-bold text-white text-center">Lokal</h1>
        <p className="text-white/70 text-center mt-2">Your digital wallet for local services</p>
      </div>

      {/* Card section */}
      <div className="flex-1 bg-gray-50 rounded-t-[2rem] px-4 py-8">
        <Card className="w-full max-w-md mx-auto bg-white shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-[#1e3a5f]">
              {step === 'phone' && 'Sign In'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'pin' && 'PIN Login'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' && 'Enter your phone number to get started'}
              {step === 'otp' && 'Enter the OTP sent to your phone'}
              {step === 'pin' && 'Enter your PIN to login'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {step === 'phone' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="081 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-lg h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                  />
                  <p className="text-xs text-gray-500">South African mobile number</p>
                </div>
                <Button 
                  className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium" 
                  onClick={handleRequestOTP}
                  disabled={loading || phone.length < 9}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continue with OTP
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                  onClick={() => setStep('pin')}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Login with PIN
                </Button>
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Want to become an agent?</p>
                  <Link to="/register/agent">
                    <Button variant="ghost" className="text-[#4da6e8] hover:text-[#3d96d8] hover:bg-[#4da6e8]/10">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register as Agent
                    </Button>
                  </Link>
                </div>
              </>
            )}
            
            {step === 'otp' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">OTP Code</label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-lg text-center tracking-widest h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                    maxLength={6}
                  />
                  {debugOtp && (
                    <p className="text-xs text-[#4da6e8] text-center">
                      Demo OTP: {debugOtp}
                    </p>
                  )}
                </div>
                <Button 
                  className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium" 
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify OTP
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setDebugOtp('');
                  }}
                >
                  Back to phone number
                </Button>
              </>
            )}
            
            {step === 'pin' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="081 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">PIN</label>
                  <Input
                    type="password"
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-lg text-center tracking-widest h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                    maxLength={6}
                  />
                </div>
                <Button 
                  className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium" 
                  onClick={handlePINLogin}
                  disabled={loading || pin.length < 4 || phone.length < 9}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setStep('phone');
                    setPin('');
                  }}
                >
                  Back to OTP login
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
