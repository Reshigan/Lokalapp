import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import { useAuth } from '@/context/AuthContext';
import api, { SupportTicket } from '@/services/api';
import { Plus, LifeBuoy, Loader2, Inbox, ChevronRight } from 'lucide-react';

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
    const r = await api.listTickets({ mine_only: tab === 'mine' });
    if (r.data) setTickets(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.subject || !form.description) return setError('Subject and description are required');
    setSubmitting(true);
    const r = await api.createTicket(form);
    setSubmitting(false);
    if (r.error) return setError(r.error);
    setShowForm(false);
    setForm({ ...form, subject: '', description: '' });
    setTab('mine');
    load();
  };

  const statusVariant = (s: string) =>
    s === 'RESOLVED' || s === 'CLOSED' ? 'success' : s === 'OPEN' ? 'warning' : 'secondary';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Raise an issue or check a ticket."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New ticket'}
          </Button>
        }
      />

      {isStaff && (
        <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl w-max">
          {(['queue', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? 'px-4 py-1.5 rounded-lg bg-white text-ink shadow-soft font-medium text-sm'
                  : 'px-4 py-1.5 rounded-lg text-ink-soft hover:text-ink text-sm'
              }
            >
              {t === 'queue' ? 'Queue' : 'My tickets'}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <form onSubmit={submit}>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select
                    className="field"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as typeof CATEGORIES[number] })}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Priority</label>
                  <select
                    className="field"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as typeof PRIORITIES[number] })}
                  >
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Subject</label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea
                  className="field min-h-[120px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Include account number, invoice number, what you've tried…"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LifeBuoy className="w-4 h-4" />}
                Submit ticket
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={Inbox} title="No tickets here" description="Raise one with the New ticket button." />
      ) : (
        <div className="grid gap-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/support/${t.id}`)}
              className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{t.subject}</p>
                  <Badge variant={statusVariant(t.status) as any}>{t.status}</Badge>
                  <Badge variant="secondary">{t.category}</Badge>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {t.reference_number} · {t.priority.toLowerCase()} · {t.opened_by?.name || '—'}
                  {t.assigned_to && ` · → ${t.assigned_to.name}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
