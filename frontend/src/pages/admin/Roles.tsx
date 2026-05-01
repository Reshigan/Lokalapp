import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api, { RoleGrant } from '@/services/api';
import { ArrowLeft, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

const ROLES = ['AGENT', 'OFFICE_MANAGER', 'SUPPORT', 'ADMIN'] as const;

export default function AdminRolesPage() {
  const navigate = useNavigate();
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', role: 'SUPPORT' as typeof ROLES[number] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await api.listRoleGrants();
    if (r.data) setGrants(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.user_id) {
      setError('user_id required');
      return;
    }
    setBusy(true);
    const r = await api.grantRole(form.user_id, form.role);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setForm({ ...form, user_id: '' });
    load();
  };

  const revoke = async (g: RoleGrant) => {
    if (!confirm(`Revoke ${g.role} from ${g.phone_number}?`)) return;
    await api.revokeRole(g.user_id, g.role);
    load();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Role management</h1>
        </div>
        <p className="text-purple-200 text-sm">RBAC — grant or revoke roles for users.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <form onSubmit={grant}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Grant a role</h3>
              <Input
                placeholder="User ID (UUID)"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              />
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as typeof ROLES[number] })}
              >
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Grant
              </Button>
            </CardContent>
          </form>
        </Card>

        <h3 className="text-sm font-semibold ml-1">Active grants</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-700" />
          </div>
        ) : grants.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">No active grants</CardContent>
          </Card>
        ) : (
          grants.map((g) => (
            <Card key={g.id} className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{[g.first_name, g.last_name].filter(Boolean).join(' ') || g.phone_number}</p>
                    <Badge>{g.role}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{g.phone_number} · granted {new Date(g.granted_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400 font-mono">{g.user_id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => revoke(g)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
