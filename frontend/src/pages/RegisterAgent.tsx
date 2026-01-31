import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  ArrowRight, 
  Loader2, 
  Building2, 
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function RegisterAgent() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'register' | 'details' | 'success'>('register');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agentCode, setAgentCode] = useState('');

  const handleRegisterUser = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { data, error: apiError } = await api.registerWithPassword(phone, password, firstName, lastName);
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data) {
      await login(data.access_token, data.refresh_token);
      setStep('details');
    }
  };

  const handleRegisterAgent = async () => {
    setLoading(true);
    setError('');
    
    const { data, error: apiError } = await api.registerAgent({
      business_name: businessName,
      business_type: businessType,
      address: address || undefined,
      initial_float: 0,
    });
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data) {
      setAgentCode(data.agent_code);
      setStep('success');
    }
  };

  const businessTypes = [
    'Spaza Shop',
    'Internet Cafe',
    'General Store',
    'Mobile Shop',
    'Other'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#1e3a5f] to-[#4da6e8] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1e3a5f]">
            Become an Agent
          </CardTitle>
          <CardDescription>
            {step === 'register' && 'Create your account to get started'}
            {step === 'details' && 'Tell us about your business'}
            {step === 'success' && 'Registration successful!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {step === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button 
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]" 
                onClick={handleRegisterUser}
                disabled={loading || phone.length < 9 || password.length < 6}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </>
          )}
          
          {step === 'details' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input
                  type="text"
                  placeholder="My Shop"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {businessTypes.map((type) => (
                    <Button
                      key={type}
                      variant={businessType === type ? 'default' : 'outline'}
                      size="sm"
                      className={businessType === type ? 'bg-[#1e3a5f]' : ''}
                      onClick={() => setBusinessType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Address (Optional)</label>
                <Input
                  type="text"
                  placeholder="123 Main Street, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <Button 
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]" 
                onClick={handleRegisterAgent}
                disabled={loading || !businessName || !businessType}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Register as Agent
              </Button>
            </>
          )}
          
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Welcome, Agent!</p>
                <p className="text-sm text-gray-500 mt-1">Your agent code is:</p>
                <p className="text-2xl font-bold text-[#1e3a5f] mt-2">{agentCode}</p>
              </div>
              <p className="text-sm text-gray-500">
                You can now start selling WiFi and electricity to customers.
              </p>
              <Button 
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]" 
                onClick={() => navigate('/agent')}
              >
                Go to Agent Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
