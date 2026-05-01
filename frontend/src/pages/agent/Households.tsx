import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api, { Household } from '@/services/api';
import { Search, Loader2, Plus, Home, MapPin } from 'lucide-react';

export default function HouseholdsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.listHouseholds(q || undefined, true);
    if (data) setHouseholds(data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        description="Capture masterdata, take meter readings, and bill households on your route."
        actions={
          <Button onClick={() => navigate('/agent/households/new')}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />

      <Card>
        <CardContent className="p-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              className="pl-9"
              placeholder="Search account, name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-ink-muted">Loading…</div>
      ) : households.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No households captured yet"
          description="Tap “New” to capture a household and link them to a meter."
          action={<Button onClick={() => navigate('/agent/households/new')}><Plus className="w-4 h-4" /> Capture household</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {households.map((h) => (
            <Card
              key={h.id}
              className="cursor-pointer hover:shadow-pop hover:border-accent-200 transition-all"
              onClick={() => navigate(`/agent/households/${h.id}`)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <IconBadge icon={Home} tone="brand" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{h.primary_contact_name}</p>
                    <Badge variant={h.status === 'ACTIVE' ? 'default' : 'secondary'}>{h.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Account {h.account_number} · {h.primary_contact_phone}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-ink-muted truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[h.suburb, h.city].filter(Boolean).join(', ') || '—'} · {h.tariff_name || 'no tariff'}
                    </span>
                    <span className={Number(h.current_balance) > 0 ? 'text-amber-700 font-semibold' : 'text-ink-muted'}>
                      R{Number(h.current_balance).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
