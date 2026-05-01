import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import api, { SupportTicket, SupportMessage } from '@/services/api';
import { Loader2, Send } from 'lucide-react';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const;

export default function SupportTicketPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const isStaff = !!(user?.is_support || user?.is_admin);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getTicket(id);
    if (r.data) {
      setTicket(r.data.ticket);
      setMessages(r.data.messages);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setPosting(true);
    await api.replyTicket(id, reply.trim(), isStaff && internal);
    setReply('');
    setPosting(false);
    load();
  };

  const setStatus = async (s: string) => {
    await api.setTicketStatus(id, s);
    load();
  };

  if (loading || !ticket) {
    return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent-500" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title={ticket.subject} description={ticket.reference_number} back="/support" />

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{ticket.status}</Badge>
            <Badge variant="secondary">{ticket.category}</Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap text-ink">{ticket.description}</p>
          <p className="text-xs text-ink-muted">
            Opened by {ticket.opened_by?.name} · {new Date(ticket.created_at).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {isStaff && (
        <Card>
          <CardContent className="p-5">
            <h3 className="section-title mb-3">Status</h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === ticket.status ? 'default' : 'outline'}
                  onClick={() => setStatus(s)}
                >
                  {s.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h3 className="section-title mb-3">Conversation</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">No replies yet.</p>
        ) : (
          <div className="grid gap-2">
            {messages.map((m) => (
              <Card key={m.id} className={m.is_internal ? 'bg-warning-soft border-amber-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between text-xs text-ink-muted mb-1.5">
                    <span className="font-medium text-ink">{m.author?.name || 'Unknown'}</span>
                    <span>
                      {new Date(m.created_at).toLocaleString()}
                      {m.is_internal && ' · internal'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <form onSubmit={post}>
          <CardContent className="p-5 space-y-3">
            <textarea
              className="field min-h-[90px]"
              placeholder={isStaff ? 'Reply to the user…' : 'Add more information…'}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            {isStaff && (
              <label className="text-xs text-ink-soft flex items-center gap-2">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note (not visible to user)
              </label>
            )}
            <Button type="submit" disabled={posting || !reply.trim()} className="w-full">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
