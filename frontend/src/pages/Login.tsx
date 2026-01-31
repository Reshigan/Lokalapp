import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ArrowRight, Loader2, UserPlus, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-lokal-navy relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lokal-navy via-lokal-deep to-lokal-navy" />
      
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-lokal-purple rounded-full mix-blend-multiply filter blur-3xl animate-float" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-lokal-cyan rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-lokal-blue rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div 
          className="pt-12 pb-8 px-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo with glow effect */}
          <motion.div 
            className="relative inline-block mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 bg-lokal-cyan/30 rounded-3xl blur-2xl animate-pulse-slow" />
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-lokal-cyan via-lokal-blue to-lokal-purple rounded-3xl flex items-center justify-center shadow-glow-cyan">
              <img src="/lokal-icon.png" alt="Lokal" className="w-16 h-16" />
            </div>
          </motion.div>
          
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-white via-lokal-cyan to-lokal-blue bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Lokal
          </motion.h1>
          <motion.p 
            className="text-white/50 mt-2 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Your digital wallet for local services
          </motion.p>

          {/* Feature badges */}
          <motion.div 
            className="flex justify-center gap-3 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { icon: Shield, label: 'Secure' },
              { icon: Zap, label: 'Fast' },
              { icon: Sparkles, label: 'Easy' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <item.icon className="w-3.5 h-3.5 text-lokal-cyan" />
                <span className="text-xs text-white/70">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Card section */}
        <motion.div 
          className="flex-1 px-4 pb-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Glassmorphism card */}
          <div className="w-full max-w-md mx-auto">
            <div className="relative">
              {/* Card glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-lokal-cyan via-lokal-blue to-lokal-purple rounded-3xl blur-lg opacity-30" />
              
              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                {/* Card header */}
                <div className="text-center mb-6">
                  <motion.h2 
                    className="text-2xl font-bold text-white"
                    key={isRegister ? 'register' : 'login'}
                    initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                  </motion.h2>
                  <p className="text-white/50 text-sm mt-1">
                    {isRegister ? 'Enter your details to get started' : 'Sign in to continue'}
                  </p>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                    >
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {isRegister && (
                      <motion.div 
                        className="grid grid-cols-2 gap-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/70">First Name</label>
                          <Input
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-lokal-cyan focus:ring-lokal-cyan/20 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/70">Last Name</label>
                          <Input
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-lokal-cyan focus:ring-lokal-cyan/20 rounded-xl"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="081 234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-lokal-cyan focus:ring-lokal-cyan/20 rounded-xl"
                    />
                    <p className="text-xs text-white/40">South African mobile number</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-lokal-cyan focus:ring-lokal-cyan/20 rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {isRegister && (
                      <motion.div 
                        className="space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <label className="text-sm font-medium text-white/70">Confirm Password</label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-lokal-cyan focus:ring-lokal-cyan/20 rounded-xl"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Submit button with gradient and glow */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-lokal-cyan via-lokal-blue to-lokal-purple hover:opacity-90 text-white font-semibold text-lg rounded-xl shadow-glow transition-all duration-300 border-0" 
                      onClick={isRegister ? handleRegister : handleLogin}
                      disabled={loading || phone.length < 9 || password.length < 6}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {isRegister ? 'Create Account' : 'Sign In'}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                  
                  {/* Toggle login/register */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setError('');
                      }}
                      className="text-sm text-lokal-cyan hover:text-white underline underline-offset-2 transition-colors font-medium"
                    >
                      {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-transparent text-white/40">or</span>
                  </div>
                </div>

                {/* Agent registration link */}
                <div className="text-center">
                  <p className="text-sm text-white/40 mb-3">Want to become an agent?</p>
                  <Link to="/register/agent">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-lokal-cyan/50 rounded-xl transition-all duration-300"
                      >
                        <UserPlus className="w-4 h-4 mr-2 text-lokal-cyan" />
                        Register as Agent
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="py-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-white/30 text-xs">
            Powered by Lokal Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}
