import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api, { CommunityOffice } from '@/services/api';
import { Loader2, Plus, Building } from 'lucide-react';

export default function AdminCommunityOfficesPage() {
  const [offices, setOffices] = useState<CommunityOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', contact_phone: '', manager_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await api.listCommunityOffices();
    if (r.data) setOffices(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const r = await api.createCommunityOffice({
      name: form.name,
      code: form.code,
      address: form.address || undefined,
      contact_phone: form.contact_phone || undefined,
      manager_user_id: form.manager_user_id || undefined,
    });
    setSaving(false);
    if (r.error) return setError(r.error);
    setShowForm(false);
    setForm({ name: '', code: '', address: '', contact_phone: '', manager_user_id: '' });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community offices"
        description="Where agents settle the cash they've collected."
        back="/admin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New office'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={submit}>
            <CardContent className="p-5 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Short code</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Address</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Contact phone</label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label">Manager user ID (UUID, optional)</label>
                <Input value={form.manager_user_id} onChange={(e) => setForm({ ...form, manager_user_id: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save office
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : offices.length === 0 ? (
        <EmptyState icon={Building} title="No offices yet" description="Add one above to enable agent settlements." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {offices.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5 flex items-start gap-3">
                <IconBadge icon={Building} tone="brand" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-xs text-ink-muted">{o.code}</p>
                  {o.address && <p className="text-sm text-ink-soft mt-2">{o.address}</p>}
                  {o.contact_phone && <p className="text-xs text-ink-muted mt-0.5">{o.contact_phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
