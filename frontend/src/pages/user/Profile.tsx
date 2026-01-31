import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  ArrowLeft, 
  User,
  Phone,
  Mail,
  Shield,
  Gift,
  Lock,
  LogOut,
  Loader2,
  Copy,
  Check,
  Edit
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; next_tier_points: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await api.getLoyalty();
    if (data) setLoyalty(data);
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    const { error } = await api.updateProfile({
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
    });
    setSaving(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    await refreshUser();
    setShowEditProfile(false);
  };

  const handleSetPin = async () => {
    if (pin !== confirmPin) {
      alert('PINs do not match');
      return;
    }
    if (pin.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }
    
    setSaving(true);
    const { error } = await api.setPIN(pin, confirmPin);
    setSaving(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    await refreshUser();
    setShowSetPin(false);
    setPin('');
    setConfirmPin('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'bg-yellow-100 text-yellow-800';
      case 'SILVER': return 'bg-gray-100 text-gray-800';
      case 'PLATINUM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">My Profile</h1>
        </div>
        
        {/* Profile Card */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {user?.first_name || user?.last_name 
                ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                : 'Set your name'}
            </h2>
            <p className="text-green-100">{user?.phone_number}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowEditProfile(true)}
          >
            <Edit className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-4 -mt-6">
        {/* Loyalty Card */}
        {loyalty && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Loyalty Points</p>
                    <p className="text-2xl font-bold">{loyalty.points}</p>
                  </div>
                </div>
                <Badge className={getTierColor(loyalty.tier)}>
                  {loyalty.tier}
                </Badge>
              </div>
              {loyalty.next_tier_points > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress to next tier</span>
                    <span>{loyalty.next_tier_points} points needed</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${Math.min(100, (loyalty.points / (loyalty.points + loyalty.next_tier_points)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Details */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium">{user?.phone_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user?.email || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">KYC Status</p>
                <Badge variant={getKycStatusColor(user?.kyc_status || 'NONE') as "default" | "secondary" | "destructive" | "outline"}>
                  {user?.kyc_status || 'Not Verified'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Code */}
        {user?.referral_code && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg p-3 font-mono text-center">
                  {user.referral_code}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyReferralCode}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this code and earn R10 for each friend who joins!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Security */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowSetPin(true)}
            >
              <Lock className="w-5 h-5 mr-3" />
              {user?.has_pin ? 'Change PIN' : 'Set PIN'}
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PIN Dialog */}
      <Dialog open={showSetPin} onOpenChange={setShowSetPin}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{user?.has_pin ? 'Change PIN' : 'Set PIN'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">New PIN</label>
              <Input
                type="password"
                placeholder="Enter 4-6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center tracking-widest"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm PIN</label>
              <Input
                type="password"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center tracking-widest"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setShowSetPin(false);
              setPin('');
              setConfirmPin('');
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSetPin}
              disabled={saving || pin.length < 4 || pin !== confirmPin}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Set PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
