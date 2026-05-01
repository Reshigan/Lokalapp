import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import api, { SupportTicket, SupportMessage } from '@/services/api';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const;

export default function SupportTicketPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/support')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold truncate">{ticket.subject}</h1>
        </div>
        <p className="text-sky-100 text-sm">{ticket.reference_number}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge>{ticket.status}</Badge>
          <Badge variant="secondary">{ticket.category}</Badge>
          <Badge variant="outline" className="text-white border-white/40">{ticket.priority}</Badge>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-gray-400 mt-2">
              Opened by {ticket.opened_by?.name} · {new Date(ticket.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {isStaff && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === ticket.status ? 'default' : 'outline'}
                    className="rounded-xl"
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <h3 className="text-sm font-semibold ml-1 mt-4">Conversation</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No replies yet</p>
        ) : (
          messages.map((m) => (
            <Card key={m.id} className={`border-0 shadow-md rounded-2xl ${m.is_internal ? 'bg-amber-50' : 'bg-white'}`}>
              <CardContent className="p-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{m.author?.name || 'Unknown'}</span>
                  <span>{new Date(m.created_at).toLocaleString()}{m.is_internal && ' · internal'}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </CardContent>
            </Card>
          ))
        )}

        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <form onSubmit={post}>
            <CardContent className="p-4 space-y-2">
              <textarea
                className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                placeholder={isStaff ? 'Reply to the user…' : 'Add more information…'}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              {isStaff && (
                <label className="text-xs text-gray-600 flex items-center gap-2">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal note (not visible to user)
                </label>
              )}
              <Button type="submit" disabled={posting || !reply.trim()} className="w-full bg-blue-700 hover:bg-blue-800 rounded-xl">
                {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
