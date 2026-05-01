import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api, { Tariff, TariffCreate } from '@/services/api';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';

const empty: TariffCreate = {
  name: '',
  description: '',
  type: 'FLAT',
  billing_period: 'MONTHLY',
  flat_rate_per_kwh: 2.2,
  service_fee: 0,
  blocks: [],
  time_bands: [],
};

export default function AdminTariffsPage() {
  const navigate = useNavigate();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TariffCreate>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await api.listTariffs();
    if (r.data) setTariffs(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload: TariffCreate = { ...form };
    if (payload.type !== 'FLAT') payload.flat_rate_per_kwh = null;
    if (payload.type !== 'UNITS_BLOCK') payload.blocks = [];
    if (payload.type !== 'TIME_OF_USE') payload.time_bands = [];
    const r = await api.createTariff(payload);
    setSaving(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setShowForm(false);
    setForm(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Deactivate this tariff?')) return;
    await api.deactivateTariff(id);
    load();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Tariffs</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button onClick={() => setShowForm(!showForm)} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> {showForm ? 'Cancel' : 'New tariff'}
        </Button>

        {showForm && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <form onSubmit={submit}>
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="border rounded-md p-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TariffCreate['type'] })}>
                    <option value="FLAT">Flat rate</option>
                    <option value="UNITS_BLOCK">Stepped blocks</option>
                    <option value="TIME_OF_USE">Time of use</option>
                  </select>
                  <select className="border rounded-md p-2 text-sm" value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value as TariffCreate['billing_period'] })}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Service fee per period"
                  value={form.service_fee ?? 0}
                  onChange={(e) => setForm({ ...form, service_fee: parseFloat(e.target.value) || 0 })}
                />

                {form.type === 'FLAT' && (
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="Rate per kWh"
                    value={form.flat_rate_per_kwh ?? ''}
                    onChange={(e) => setForm({ ...form, flat_rate_per_kwh: parseFloat(e.target.value) })}
                  />
                )}

                {form.type === 'UNITS_BLOCK' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Blocks</h4>
                    {(form.blocks || []).map((b, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 items-center">
                        <Input type="number" step="0.01" placeholder="From" value={b.from_kwh} onChange={(e) => {
                          const blocks = [...(form.blocks || [])];
                          blocks[i] = { ...blocks[i], from_kwh: parseFloat(e.target.value) || 0 };
                          setForm({ ...form, blocks });
                        }} />
                        <Input type="number" step="0.01" placeholder="To (blank=∞)" value={b.to_kwh ?? ''} onChange={(e) => {
                          const blocks = [...(form.blocks || [])];
                          blocks[i] = { ...blocks[i], to_kwh: e.target.value === '' ? null : parseFloat(e.target.value) };
                          setForm({ ...form, blocks });
                        }} />
                        <Input type="number" step="0.0001" placeholder="Rate" value={b.rate_per_kwh} onChange={(e) => {
                          const blocks = [...(form.blocks || [])];
                          blocks[i] = { ...blocks[i], rate_per_kwh: parseFloat(e.target.value) || 0 };
                          setForm({ ...form, blocks });
                        }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const blocks = [...(form.blocks || [])]; blocks.splice(i, 1); setForm({ ...form, blocks });
                        }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setForm({
                      ...form,
                      blocks: [...(form.blocks || []), { from_kwh: 0, to_kwh: null, rate_per_kwh: 0, sort_order: (form.blocks?.length || 0) + 1 }],
                    })}>+ Add block</Button>
                  </div>
                )}

                {form.type === 'TIME_OF_USE' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Time bands</h4>
                    {(form.time_bands || []).map((b, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 items-center">
                        <Input placeholder="Name" value={b.name} onChange={(e) => {
                          const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], name: e.target.value }; setForm({ ...form, time_bands: tb });
                        }} />
                        <Input type="number" placeholder="Start hour" value={b.start_hour} onChange={(e) => {
                          const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], start_hour: parseInt(e.target.value) || 0 }; setForm({ ...form, time_bands: tb });
                        }} />
                        <Input type="number" placeholder="End hour" value={b.end_hour} onChange={(e) => {
                          const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], end_hour: parseInt(e.target.value) || 0 }; setForm({ ...form, time_bands: tb });
                        }} />
                        <Input type="number" step="0.0001" placeholder="Rate" value={b.rate_per_kwh} onChange={(e) => {
                          const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], rate_per_kwh: parseFloat(e.target.value) || 0 }; setForm({ ...form, time_bands: tb });
                        }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const tb = [...(form.time_bands || [])]; tb.splice(i, 1); setForm({ ...form, time_bands: tb });
                        }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setForm({
                      ...form,
                      time_bands: [...(form.time_bands || []), { name: 'STANDARD', start_hour: 0, end_hour: 0, rate_per_kwh: 0, sort_order: (form.time_bands?.length || 0) + 1 }],
                    })}>+ Add band</Button>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save tariff
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
          tariffs.map((t) => (
            <Card key={t.id} className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{t.type}</Badge>
                      <Badge variant="outline">{t.billing_period.toLowerCase()}</Badge>
                    </div>
                    {t.type === 'FLAT' && (
                      <p className="text-sm mt-2">R{Number(t.flat_rate_per_kwh).toFixed(4)} / kWh</p>
                    )}
                    {t.type === 'UNITS_BLOCK' && (
                      <ul className="text-xs mt-2 text-gray-700 space-y-1">
                        {t.blocks.map((b, i) => (
                          <li key={i}>{b.from_kwh}–{b.to_kwh ?? '∞'} kWh @ R{Number(b.rate_per_kwh).toFixed(4)}</li>
                        ))}
                      </ul>
                    )}
                    {t.type === 'TIME_OF_USE' && (
                      <ul className="text-xs mt-2 text-gray-700 space-y-1">
                        {t.time_bands.map((b, i) => (
                          <li key={i}>{b.name} {b.start_hour}-{b.end_hour}h @ R{Number(b.rate_per_kwh).toFixed(4)}</li>
                        ))}
                      </ul>
                    )}
                    {t.service_fee > 0 && <p className="text-xs text-gray-500 mt-1">Service fee: R{Number(t.service_fee).toFixed(2)}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
