import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import api, { Tariff, TariffCreate } from '@/services/api';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const empty: TariffCreate = {
  name: '', description: '', type: 'FLAT', billing_period: 'MONTHLY',
  flat_rate_per_kwh: 2.2, service_fee: 0, blocks: [], time_bands: [],
};

export default function AdminTariffsPage() {
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

  useEffect(() => { load(); }, []);

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
    if (r.error) return setError(r.error);
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
    <div className="space-y-6">
      <PageHeader
        title="Tariffs"
        description="Flat / stepped / time-of-use, monthly or weekly."
        back="/admin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New tariff'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={submit}>
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TariffCreate['type'] })}>
                    <option value="FLAT">Flat rate</option>
                    <option value="UNITS_BLOCK">Stepped blocks</option>
                    <option value="TIME_OF_USE">Time of use</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Billing period</label>
                  <select className="field" value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value as TariffCreate['billing_period'] })}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Service fee per period (R)</label>
                  <Input type="number" step="0.01" value={form.service_fee ?? 0} onChange={(e) => setForm({ ...form, service_fee: parseFloat(e.target.value) || 0 })} />
                </div>
                {form.type === 'FLAT' && (
                  <div>
                    <label className="field-label">Rate per kWh (R)</label>
                    <Input type="number" step="0.0001" value={form.flat_rate_per_kwh ?? ''} onChange={(e) => setForm({ ...form, flat_rate_per_kwh: parseFloat(e.target.value) })} />
                  </div>
                )}
              </div>

              {form.type === 'UNITS_BLOCK' && (
                <div className="space-y-2">
                  <h4 className="section-title">Stepped blocks</h4>
                  {(form.blocks || []).map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-3" type="number" step="0.01" placeholder="From" value={b.from_kwh}
                        onChange={(e) => { const blocks = [...(form.blocks || [])]; blocks[i] = { ...blocks[i], from_kwh: parseFloat(e.target.value) || 0 }; setForm({ ...form, blocks }); }} />
                      <Input className="col-span-3" type="number" step="0.01" placeholder="To (blank=∞)" value={b.to_kwh ?? ''}
                        onChange={(e) => { const blocks = [...(form.blocks || [])]; blocks[i] = { ...blocks[i], to_kwh: e.target.value === '' ? null : parseFloat(e.target.value) }; setForm({ ...form, blocks }); }} />
                      <Input className="col-span-4" type="number" step="0.0001" placeholder="Rate / kWh" value={b.rate_per_kwh}
                        onChange={(e) => { const blocks = [...(form.blocks || [])]; blocks[i] = { ...blocks[i], rate_per_kwh: parseFloat(e.target.value) || 0 }; setForm({ ...form, blocks }); }} />
                      <Button type="button" variant="ghost" size="icon" className="col-span-2" onClick={() => { const blocks = [...(form.blocks || [])]; blocks.splice(i, 1); setForm({ ...form, blocks }); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => setForm({ ...form, blocks: [...(form.blocks || []), { from_kwh: 0, to_kwh: null, rate_per_kwh: 0, sort_order: (form.blocks?.length || 0) + 1 }] })}>
                    + Add block
                  </Button>
                </div>
              )}

              {form.type === 'TIME_OF_USE' && (
                <div className="space-y-2">
                  <h4 className="section-title">Time bands</h4>
                  {(form.time_bands || []).map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-3" placeholder="Name" value={b.name}
                        onChange={(e) => { const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], name: e.target.value }; setForm({ ...form, time_bands: tb }); }} />
                      <Input className="col-span-2" type="number" placeholder="Start hr" value={b.start_hour}
                        onChange={(e) => { const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], start_hour: parseInt(e.target.value) || 0 }; setForm({ ...form, time_bands: tb }); }} />
                      <Input className="col-span-2" type="number" placeholder="End hr" value={b.end_hour}
                        onChange={(e) => { const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], end_hour: parseInt(e.target.value) || 0 }; setForm({ ...form, time_bands: tb }); }} />
                      <Input className="col-span-3" type="number" step="0.0001" placeholder="Rate / kWh" value={b.rate_per_kwh}
                        onChange={(e) => { const tb = [...(form.time_bands || [])]; tb[i] = { ...tb[i], rate_per_kwh: parseFloat(e.target.value) || 0 }; setForm({ ...form, time_bands: tb }); }} />
                      <Button type="button" variant="ghost" size="icon" className="col-span-2" onClick={() => { const tb = [...(form.time_bands || [])]; tb.splice(i, 1); setForm({ ...form, time_bands: tb }); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => setForm({ ...form, time_bands: [...(form.time_bands || []), { name: 'STANDARD', start_hour: 0, end_hour: 0, rate_per_kwh: 0, sort_order: (form.time_bands?.length || 0) + 1 }] })}>
                    + Add band
                  </Button>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save tariff
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : tariffs.length === 0 ? (
        <EmptyState title="No tariffs yet" description="Create one above." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {tariffs.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-ink-muted truncate">{t.description}</p>
                    <div className="flex gap-1.5 mt-2">
                      <Badge variant="secondary">{t.type}</Badge>
                      <Badge variant="outline">{t.billing_period.toLowerCase()}</Badge>
                    </div>
                    {t.type === 'FLAT' && (
                      <p className="text-sm mt-3">R{Number(t.flat_rate_per_kwh).toFixed(4)} / kWh</p>
                    )}
                    {t.type === 'UNITS_BLOCK' && (
                      <ul className="text-xs mt-3 text-ink-soft space-y-0.5">
                        {t.blocks.map((b, i) => (
                          <li key={i}>{b.from_kwh}–{b.to_kwh ?? '∞'} kWh @ R{Number(b.rate_per_kwh).toFixed(4)}</li>
                        ))}
                      </ul>
                    )}
                    {t.type === 'TIME_OF_USE' && (
                      <ul className="text-xs mt-3 text-ink-soft space-y-0.5">
                        {t.time_bands.map((b, i) => (
                          <li key={i}>{b.name} {b.start_hour}-{b.end_hour}h @ R{Number(b.rate_per_kwh).toFixed(4)}</li>
                        ))}
                      </ul>
                    )}
                    {t.service_fee > 0 && (
                      <p className="text-xs text-ink-muted mt-2">Service fee: R{Number(t.service_fee).toFixed(2)}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
