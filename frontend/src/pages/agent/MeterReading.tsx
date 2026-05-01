import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api, { Household, Tariff } from '@/services/api';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const consumed = Math.max(0, parseFloat(reading || '0') - Number(household.last_reading_kwh));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = parseFloat(reading);
    if (isNaN(r) || r < Number(household.last_reading_kwh)) {
      setError(`Reading must be ≥ ${Number(household.last_reading_kwh).toFixed(2)} (last reading)`);
      return;
    }
    setSubmitting(true);
    const payload = {
      household_id: id,
      current_reading_kwh: r,
      issue_invoice: true,
      notes: notes || undefined,
      peak_kwh: peak ? parseFloat(peak) : undefined,
      standard_kwh: standard ? parseFloat(standard) : undefined,
      off_peak_kwh: offPeak ? parseFloat(offPeak) : undefined,
    };
    const { data, error: err } = await api.captureReading(payload);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(`/agent/invoices/${data!.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(`/agent/households/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Capture reading</h1>
        </div>
        <p className="text-indigo-100 text-sm mt-2">{household.primary_contact_name} · {household.account_number}</p>
        <div className="bg-white/10 rounded-2xl p-4 mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-indigo-200 text-xs">Last reading</p>
            <p className="text-2xl font-bold">{Number(household.last_reading_kwh).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs">Tariff</p>
            <p className="text-base font-bold">{tariff.name}</p>
            <p className="text-xs text-indigo-200">{tariff.type} · {tariff.billing_period.toLowerCase()}</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="px-4 mt-4 space-y-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <label className="text-xs text-gray-500">Current meter reading (kWh)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 12345.67"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
            />
            {reading && (
              <p className="text-sm text-gray-600">
                Will bill <span className="font-bold">{consumed.toFixed(2)}</span> kWh
              </p>
            )}
          </CardContent>
        </Card>

        {tariff.type === 'TIME_OF_USE' && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Time-of-use split</h3>
              <p className="text-xs text-gray-500">Optional — if blank, total is split evenly across bands.</p>
              <Input type="number" step="0.01" placeholder="Peak kWh" value={peak} onChange={(e) => setPeak(e.target.value)} />
              <Input type="number" step="0.01" placeholder="Standard kWh" value={standard} onChange={(e) => setStandard(e.target.value)} />
              <Input type="number" step="0.01" placeholder="Off-peak kWh" value={offPeak} onChange={(e) => setOffPeak(e.target.value)} />
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
          Generate invoice
        </Button>
      </form>
    </div>
  );
}
