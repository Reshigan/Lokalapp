import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, IconBadge } from '@/components/Stat';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  User as UserIcon, Mail, Phone, Shield, Gift, Lock, LogOut, Loader2, Copy, Check, Edit,
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; next_tier_points: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setFirst(user.first_name || '');
      setLast(user.last_name || '');
      setEmail(user.email || '');
    }
    api.getLoyalty().then((r) => r.data && setLoyalty(r.data));
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    const r = await api.updateProfile({
      first_name: first,
      last_name: last,
      email: email || undefined,
    });
    setSaving(false);
    if (r.error) return alert(r.error);
    await refreshUser();
    setEditing(false);
  };

  const setPinSubmit = async () => {
    if (pin !== pin2) return alert('PINs do not match');
    if (!/^\d{4,6}$/.test(pin)) return alert('PIN must be 4–6 digits');
    setSaving(true);
    const r = await api.setPIN(pin, pin2);
    setSaving(false);
    if (r.error) return alert(r.error);
    await refreshUser();
    setShowPin(false);
    setPin(''); setPin2('');
  };

  const copyReferral = async () => {
    if (!user?.referral_code) return;
    await navigator.clipboard.writeText(user.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Profile" description="Manage your account details and security." back="/user" />

      {/* Identity card */}
      <Card>
        <CardContent className="p-5 flex items-start gap-4">
          <span className="w-14 h-14 rounded-2xl bg-brand-700 text-white grid place-items-center text-xl font-semibold shrink-0">
            {(user?.first_name?.[0] || user?.phone_number?.slice(-2) || 'U').toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">
              {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Add your name'}
            </p>
            <p className="text-sm text-ink-muted flex items-center gap-2 mt-1"><Phone className="w-3.5 h-3.5" /> {user?.phone_number}</p>
            {user?.email && (
              <p className="text-sm text-ink-muted flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {user.email}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant={user?.kyc_status === 'VERIFIED' ? 'success' : 'warning'}>
                <Shield className="w-3 h-3" /> KYC {user?.kyc_status?.toLowerCase()}
              </Badge>
              {user?.is_agent && <Badge variant="accent">Agent</Badge>}
              {user?.is_admin && <Badge>Admin</Badge>}
              {user?.is_support && <Badge>Support</Badge>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4" /> Edit
          </Button>
        </CardContent>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="section-title">Edit profile</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="field-label">First name</label>
                <Input value={first} onChange={(e) => setFirst(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Last name</label>
                <Input value={last} onChange={(e) => setLast(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loyalty */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard tone="brand"   icon={Gift}     label="Loyalty points" value={loyalty?.points ?? user?.loyalty_points ?? 0} hint={loyalty ? `${loyalty.next_tier_points} pts to next tier` : undefined} />
        <StatCard tone="accent"  icon={Shield}   label="Tier"           value={<Badge>{loyalty?.tier || 'BRONZE'}</Badge>} />
        <StatCard tone="neutral" icon={UserIcon} label="Referrals"      value={user?.referral_code ? '—' : '—'} />
      </div>

      {/* Referral */}
      {user?.referral_code && (
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-2">Your referral code</h3>
            <div className="flex items-center gap-3">
              <code className="text-lg font-mono bg-surface-subtle text-brand-700 px-3 py-2 rounded-lg">{user.referral_code}</code>
              <Button variant="outline" size="sm" onClick={copyReferral}>
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </Button>
            </div>
            <p className="text-xs text-ink-muted mt-2">Share with friends — they get 50 points, you get 100 when they sign up.</p>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="section-title">Security</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBadge icon={Lock} tone="brand" size="sm" />
              <div>
                <p className="text-sm font-medium">PIN</p>
                <p className="text-xs text-ink-muted">{user?.has_pin ? 'PIN is set' : 'No PIN configured'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPin(!showPin)}>
              {user?.has_pin ? 'Change PIN' : 'Set PIN'}
            </Button>
          </div>
          {showPin && (
            <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-surface-border">
              <div>
                <label className="field-label">New PIN (4–6 digits)</label>
                <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="field-label">Confirm PIN</label>
                <Input type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={setPinSubmit} disabled={saving || pin.length < 4}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save PIN'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full text-danger" onClick={async () => { await logout(); navigate('/login'); }}>
        <LogOut className="w-4 h-4" /> Sign out
      </Button>
    </div>
  );
}
