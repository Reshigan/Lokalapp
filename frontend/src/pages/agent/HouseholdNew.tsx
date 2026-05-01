import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api, { Tariff, CommunityOffice } from '@/services/api';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function HouseholdNewPage() {
  const navigate = useNavigate();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [offices, setOffices] = useState<CommunityOffice[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_id_number: '',
    email: '',
    erf_number: '',
    street_address: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    tariff_id: '',
    meter_number: '',
    community_office_id: '',
    user_phone: '',
    opening_balance: '0',
    notes: '',
  });

  useEffect(() => {
    (async () => {
      const [t, o] = await Promise.all([api.listTariffs(), api.listCommunityOffices()]);
      if (t.data) setTariffs(t.data);
      if (o.data) setOffices(o.data);
      if (t.data && t.data.length > 0) setForm((f) => ({ ...f, tariff_id: t.data![0].id }));
      if (o.data && o.data.length > 0) setForm((f) => ({ ...f, community_office_id: o.data![0].id }));
    })();
  }, []);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.primary_contact_name || !form.primary_contact_phone || !form.tariff_id) {
      setError('Name, phone, and tariff are required');
      return;
    }
    setSaving(true);
    const { data, error: err } = await api.createHousehold({
      primary_contact_name: form.primary_contact_name,
      primary_contact_phone: form.primary_contact_phone,
      primary_contact_id_number: form.primary_contact_id_number || undefined,
      email: form.email || undefined,
      erf_number: form.erf_number || undefined,
      street_address: form.street_address || undefined,
      suburb: form.suburb || undefined,
      city: form.city || undefined,
      province: form.province || undefined,
      postal_code: form.postal_code || undefined,
      tariff_id: form.tariff_id,
      meter_number: form.meter_number || undefined,
      community_office_id: form.community_office_id || undefined,
      user_phone: form.user_phone || undefined,
      opening_balance: parseFloat(form.opening_balance) || 0,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(`/agent/households/${data!.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/agent/households')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">New household</h1>
        </div>
        <p className="text-indigo-100 text-sm mt-2">Capture masterdata. Account number is auto-generated.</p>
      </div>

      <form onSubmit={submit} className="px-4 mt-4 space-y-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Primary contact</h3>
            <Input placeholder="Full name *" value={form.primary_contact_name} onChange={update('primary_contact_name')} />
            <Input type="tel" placeholder="Phone number *" value={form.primary_contact_phone} onChange={update('primary_contact_phone')} />
            <Input placeholder="ID number" value={form.primary_contact_id_number} onChange={update('primary_contact_id_number')} />
            <Input type="email" placeholder="Email (optional)" value={form.email} onChange={update('email')} />
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Address</h3>
            <Input placeholder="Erf number" value={form.erf_number} onChange={update('erf_number')} />
            <Input placeholder="Street address" value={form.street_address} onChange={update('street_address')} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Suburb" value={form.suburb} onChange={update('suburb')} />
              <Input placeholder="City" value={form.city} onChange={update('city')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Province" value={form.province} onChange={update('province')} />
              <Input placeholder="Postal code" value={form.postal_code} onChange={update('postal_code')} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Billing</h3>
            <label className="text-xs text-gray-500">Tariff *</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={form.tariff_id}
              onChange={(e) => setForm({ ...form, tariff_id: e.target.value })}
            >
              {tariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type}, {t.billing_period.toLowerCase()})
                </option>
              ))}
            </select>
            <label className="text-xs text-gray-500">Community office</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={form.community_office_id}
              onChange={(e) => setForm({ ...form, community_office_id: e.target.value })}
            >
              <option value="">— none —</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
            <Input placeholder="Meter number (optional)" value={form.meter_number} onChange={update('meter_number')} />
            <Input placeholder="User phone — link consumer app login (optional)" value={form.user_phone} onChange={update('user_phone')} />
            <Input
              type="number"
              step="0.01"
              placeholder="Opening balance (R)"
              value={form.opening_balance}
              onChange={update('opening_balance')}
            />
            <Input placeholder="Notes" value={form.notes} onChange={update('notes')} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save household
        </Button>
      </form>
    </div>
  );
}
