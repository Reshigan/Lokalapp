import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import api, { SupportTicket } from '@/services/api';
import { ArrowLeft, Plus, LifeBuoy, Loader2, Inbox } from 'lucide-react';

const CATEGORIES = ['BILLING', 'METER', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER'] as const;
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = !!(user?.is_support || user?.is_admin);

  const [tab, setTab] = useState<'mine' | 'queue'>(isStaff ? 'queue' : 'mine');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    category: 'BILLING' as typeof CATEGORIES[number],
    priority: 'NORMAL' as typeof PRIORITIES[number],
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const params = tab === 'mine'
      ? { mine_only: true }
      : { mine_only: false };
    const r = await api.listTickets(params);
    if (r.data) setTickets(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.subject || !form.description) {
      setError('Subject and description are required');
      return;
    }
    setSubmitting(true);
    const r = await api.createTicket(form);
    setSubmitting(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setShowForm(false);
    setForm({ ...form, subject: '', description: '' });
    setTab('mine');
    load();
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'RESOLVED' || s === 'CLOSED') return 'default';
    if (s === 'OPEN') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Support</h1>
        </div>
        <p className="text-sky-100 text-sm">Get help, raise an issue or check the status of a ticket.</p>

        {isStaff && (
          <div className="mt-4 flex gap-2 bg-white/10 p-1 rounded-xl w-max">
            <button
              className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'queue' ? 'bg-white text-blue-700' : 'text-white'}`}
              onClick={() => setTab('queue')}
            >
              Queue
            </button>
            <button
              className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'mine' ? 'bg-white text-blue-700' : 'text-white'}`}
              onClick={() => setTab('mine')}
            >
              My tickets
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button onClick={() => setShowForm(!showForm)} className="w-full bg-blue-700 hover:bg-blue-800 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> {showForm ? 'Cancel' : 'New ticket'}
        </Button>

        {showForm && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <form onSubmit={submit}>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="border rounded-md p-2 text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as typeof CATEGORIES[number] })}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select
                    className="border rounded-md p-2 text-sm"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as typeof PRIORITIES[number] })}
                  >
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <Input
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[120px]"
                  placeholder="What's the issue? Include account number, invoice number etc. if relevant."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800 rounded-xl">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LifeBuoy className="w-4 h-4 mr-2" />}
                  Submit ticket
                </Button>
              </CardContent>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center text-gray-400">
              <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No tickets here</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((t) => (
            <Card
              key={t.id}
              className="bg-white border-0 shadow-lg rounded-2xl cursor-pointer"
              onClick={() => navigate(`/support/${t.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{t.subject}</p>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.reference_number} · {t.category} · {t.priority.toLowerCase()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Opened by {t.opened_by?.name || '—'}
                      {t.assigned_to && ` · assigned to ${t.assigned_to.name}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
