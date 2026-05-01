import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/Stat';
import api, { Household, Tariff } from '@/services/api';
import { Loader2, Zap, Gauge } from 'lucide-react';

export default function MeterReadingPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [reading, setReading] = useState('');
  const [peak, setPeak] = useState('');
  const [standard, setStandard] = useState('');
  const [offPeak, setOffPeak] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const h = await api.getHousehold(id);
      if (h.data) {
        setHousehold(h.data);
        const t = await api.getTariff(h.data.tariff_id);
        if (t.data) setTariff(t.data);
      }
    })();
  }, [id]);

  if (!household || !tariff) {
    return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent-500" /></div>;
  }

  const consumed = Math.max(0, parseFloat(reading || '0') - Number(household.last_reading_kwh));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = parseFloat(reading);
    if (isNaN(r) || r < Number(household.last_reading_kwh)) {
      return setError(`Reading must be ≥ ${Number(household.last_reading_kwh).toFixed(2)} (last reading)`);
    }
    setSubmitting(true);
    const res = await api.captureReading({
      household_id: id,
      current_reading_kwh: r,
      issue_invoice: true,
      notes: notes || undefined,
      peak_kwh: peak ? parseFloat(peak) : undefined,
      standard_kwh: standard ? parseFloat(standard) : undefined,
      off_peak_kwh: offPeak ? parseFloat(offPeak) : undefined,
    });
    setSubmitting(false);
    if (res.error) return setError(res.error);
    navigate(`/agent/invoices/${res.data!.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Capture reading"
        description={`${household.primary_contact_name} · Account ${household.account_number}`}
        back={`/agent/households/${id}`}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="brand"  icon={Gauge} label="Last reading" value={`${Number(household.last_reading_kwh).toFixed(2)} kWh`} />
        <StatCard tone="accent" icon={Zap}   label="Tariff"       value={tariff.name} hint={`${tariff.type} · ${tariff.billing_period.toLowerCase()}`} />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <label className="field-label">Current meter reading (kWh)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 12345.67"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                inputMode="decimal"
              />
            </div>
            {reading && (
              <p className="text-sm text-ink-muted">
                Will bill <span className="font-semibold text-ink">{consumed.toFixed(2)}</span> kWh
              </p>
            )}
          </CardContent>
        </Card>

        {tariff.type === 'TIME_OF_USE' && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="section-title">Time-of-use split (optional)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Peak</label>
                  <Input type="number" step="0.01" value={peak} onChange={(e) => setPeak(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Standard</label>
                  <Input type="number" step="0.01" value={standard} onChange={(e) => setStandard(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Off-peak</label>
                  <Input type="number" step="0.01" value={offPeak} onChange={(e) => setOffPeak(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-ink-muted">If left blank, total will be split evenly across bands.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <label className="field-label">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
