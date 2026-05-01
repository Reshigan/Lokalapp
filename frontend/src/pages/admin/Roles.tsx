import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import api, { RoleGrant } from '@/services/api';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';

const ROLES = ['AGENT', 'OFFICE_MANAGER', 'SUPPORT', 'ADMIN'] as const;

export default function AdminRolesPage() {
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

  useEffect(() => { load(); }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.user_id) return setError('user_id required');
    setBusy(true);
    const r = await api.grantRole(form.user_id, form.role);
    setBusy(false);
    if (r.error) return setError(r.error);
    setForm({ ...form, user_id: '' });
    load();
  };

  const revoke = async (g: RoleGrant) => {
    if (!confirm(`Revoke ${g.role} from ${g.phone_number}?`)) return;
    await api.revokeRole(g.user_id, g.role);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role management"
        description="Grant and revoke RBAC roles for users."
        back="/admin"
      />

      <Card>
        <form onSubmit={grant}>
          <CardContent className="p-5 space-y-3">
            <h3 className="section-title">Grant a role</h3>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="field-label">User ID (UUID)</label>
                <Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof ROLES[number] })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full md:w-auto">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Grant
            </Button>
          </CardContent>
        </form>
      </Card>

      <section>
        <h3 className="section-title mb-3">Active grants</h3>
        {loading ? (
          <div className="text-center py-12 text-ink-muted">Loading…</div>
        ) : grants.length === 0 ? (
          <EmptyState title="No active grants" description="Add one above." />
        ) : (
          <div className="grid gap-2">
            {grants.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {[g.first_name, g.last_name].filter(Boolean).join(' ') || g.phone_number}
                      </p>
                      <Badge>{g.role}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {g.phone_number} · granted {new Date(g.granted_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-ink-faint font-mono truncate">{g.user_id}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => revoke(g)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
