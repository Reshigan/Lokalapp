import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import api, { Tariff, CommunityOffice } from '@/services/api';
import { Loader2, Save } from 'lucide-react';

export default function HouseholdNewPage() {
  const navigate = useNavigate();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [offices, setOffices] = useState<CommunityOffice[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    primary_contact_name: '', primary_contact_phone: '', primary_contact_id_number: '',
    email: '', erf_number: '', street_address: '', suburb: '', city: '', province: '',
    postal_code: '', tariff_id: '', meter_number: '', community_office_id: '',
    user_phone: '', opening_balance: '0', notes: '',
  });

  useEffect(() => {
    (async () => {
      const [t, o] = await Promise.all([api.listTariffs(), api.listCommunityOffices()]);
      if (t.data) {
        setTariffs(t.data);
        if (t.data.length) setForm((f) => ({ ...f, tariff_id: t.data![0].id }));
      }
      if (o.data) {
        setOffices(o.data);
        if (o.data.length) setForm((f) => ({ ...f, community_office_id: o.data![0].id }));
      }
    })();
  }, []);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.primary_contact_name || !form.primary_contact_phone || !form.tariff_id) {
      return setError('Name, phone and tariff are required.');
    }
    setSaving(true);
    const r = await api.createHousehold({
      ...form,
      opening_balance: parseFloat(form.opening_balance) || 0,
    } as any);
    setSaving(false);
    if (r.error) return setError(r.error);
    navigate(`/agent/households/${r.data!.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New household"
        description="Account number is auto-generated. Phone, name, and tariff are required."
        back="/agent/households"
      />

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="section-title">Primary contact</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full name *</label>
                <Input value={form.primary_contact_name} onChange={upd('primary_contact_name')} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="field-label">Phone *</label>
                <Input type="tel" value={form.primary_contact_phone} onChange={upd('primary_contact_phone')} placeholder="+27 81 234 5678" />
              </div>
              <div>
                <label className="field-label">ID number</label>
                <Input value={form.primary_contact_id_number} onChange={upd('primary_contact_id_number')} placeholder="13-digit RSA ID" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <Input type="email" value={form.email} onChange={upd('email')} placeholder="optional" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="section-title">Address</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Erf number</label>
                <Input value={form.erf_number} onChange={upd('erf_number')} />
              </div>
              <div>
                <label className="field-label">Street address</label>
                <Input value={form.street_address} onChange={upd('street_address')} />
              </div>
              <div>
                <label className="field-label">Suburb</label>
                <Input value={form.suburb} onChange={upd('suburb')} />
              </div>
              <div>
                <label className="field-label">City</label>
                <Input value={form.city} onChange={upd('city')} />
              </div>
              <div>
                <label className="field-label">Province</label>
                <Input value={form.province} onChange={upd('province')} />
              </div>
              <div>
                <label className="field-label">Postal code</label>
                <Input value={form.postal_code} onChange={upd('postal_code')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="section-title">Billing</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Tariff *</label>
                <select className="field" value={form.tariff_id} onChange={(e) => setForm({ ...form, tariff_id: e.target.value })}>
                  {tariffs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type}, {t.billing_period.toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Community office</label>
                <select className="field" value={form.community_office_id} onChange={(e) => setForm({ ...form, community_office_id: e.target.value })}>
                  <option value="">— none —</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Meter number</label>
                <Input value={form.meter_number} onChange={upd('meter_number')} placeholder="optional" />
              </div>
              <div>
                <label className="field-label">Consumer phone (optional)</label>
                <Input type="tel" value={form.user_phone} onChange={upd('user_phone')} placeholder="link to a Lokal account" />
              </div>
              <div>
                <label className="field-label">Opening balance (R)</label>
                <Input type="number" step="0.01" value={form.opening_balance} onChange={upd('opening_balance')} />
              </div>
              <div>
                <label className="field-label">Notes</label>
                <Input value={form.notes} onChange={upd('notes')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/agent/households')}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save household
          </Button>
        </div>
      </form>
    </div>
  );
}
