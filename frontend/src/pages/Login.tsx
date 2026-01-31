import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ArrowRight, Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';

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

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    const { data, error: apiError } = await api.loginWithPassword(phone, password);
    setLoading(false);
    
    if (apiError) {
      setError(apiError);
      return;
    }
    
    if (data) {
      await login(data.access_token, data.refresh_token);
      if (data.is_agent) {
        navigate('/agent');
      } else {
        navigate('/');
      }
    }
  };

  const handleRegister = async () => {
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
              {isRegister ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {isRegister ? 'Enter your details to create an account' : 'Enter your phone number and password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                  />
                </div>
              </div>
            )}
            
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-lg h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8] pr-10"
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
            
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-lg h-12 border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
                />
              </div>
            )}
            
            <Button 
              className="w-full h-12 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium" 
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={loading || phone.length < 9 || password.length < 6}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isRegister ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-sm text-[#4da6e8] hover:text-[#3d96d8]"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
            
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">Want to become an agent?</p>
              <Link to="/register/agent">
                <Button variant="ghost" className="text-[#4da6e8] hover:text-[#3d96d8] hover:bg-[#4da6e8]/10">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register as Agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
