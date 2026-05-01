import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api, { Household } from '@/services/api';
import { ArrowLeft, Search, Loader2, Plus, Home, MapPin, Phone } from 'lucide-react';

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/agent')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Households</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
            <Input
              placeholder="Search account, name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-indigo-200"
            />
          </div>
          <Button onClick={load} disabled={loading} className="bg-white text-indigo-600 hover:bg-gray-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <Button className="w-full mb-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl" onClick={() => navigate('/agent/households/new')}>
          <Plus className="w-4 h-4 mr-2" /> Capture new household
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : households.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">
              <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No households yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {households.map((h) => (
              <Card
                key={h.id}
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-0 shadow-lg rounded-2xl"
                onClick={() => navigate(`/agent/households/${h.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Home className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{h.primary_contact_name}</h3>
                        <Badge variant={h.status === 'ACTIVE' ? 'default' : 'secondary'}>{h.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Account {h.account_number}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{h.primary_contact_phone}</span>
                        {h.suburb && (
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{h.suburb}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Tariff: {h.tariff_name || '—'}</span>
                        <span className={`text-sm font-semibold ${Number(h.current_balance) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                          R{Number(h.current_balance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
