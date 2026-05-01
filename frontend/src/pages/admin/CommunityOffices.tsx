import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api, { CommunityOffice } from '@/services/api';
import { ArrowLeft, Loader2, Plus, Building } from 'lucide-react';

export default function AdminCommunityOfficesPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    load();
  }, []);

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
    if (r.error) {
      setError(r.error);
      return;
    }
    setShowForm(false);
    setForm({ name: '', code: '', address: '', contact_phone: '', manager_user_id: '' });
    load();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Community offices</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button onClick={() => setShowForm(!showForm)} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> {showForm ? 'Cancel' : 'New office'}
        </Button>

        {showForm && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <form onSubmit={submit}>
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Code (short)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                <Input placeholder="Manager user_id (UUID)" value={form.manager_user_id} onChange={(e) => setForm({ ...form, manager_user_id: e.target.value })} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save office
                </Button>
              </CardContent>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-700" />
          </div>
        ) : (
          offices.map((o) => (
            <Card key={o.id} className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4 flex items-start gap-3">
                <Building className="w-6 h-6 text-purple-600 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{o.name}</p>
                  <p className="text-xs text-gray-500">{o.code}</p>
                  {o.address && <p className="text-xs text-gray-600 mt-1">{o.address}</p>}
                  {o.contact_phone && <p className="text-xs text-gray-600">{o.contact_phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
