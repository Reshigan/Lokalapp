import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Smartphone, Lock, ArrowRight, Loader2 } from 'lucide-react';

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
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as SA number
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
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Lokal</CardTitle>
          <CardDescription>
            {step === 'phone' && 'Enter your phone number to get started'}
            {step === 'otp' && 'Enter the OTP sent to your phone'}
            {step === 'pin' && 'Enter your PIN to login'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="081 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">South African mobile number</p>
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleRequestOTP}
                disabled={loading || phone.length < 9}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue with OTP
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setStep('pin')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Login with PIN
              </Button>
            </>
          )}
          
          {step === 'otp' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">OTP Code</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-lg text-center tracking-widest"
                  maxLength={6}
                />
                {debugOtp && (
                  <p className="text-xs text-green-600 text-center">
                    Demo OTP: {debugOtp}
                  </p>
                )}
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify OTP
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
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
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="081 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN</label>
                <Input
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-lg text-center tracking-widest"
                  maxLength={6}
                />
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handlePINLogin}
                disabled={loading || pin.length < 4 || phone.length < 9}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Login
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
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
  );
}
