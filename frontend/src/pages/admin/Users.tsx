import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Search, User as UserIcon, Loader2 } from 'lucide-react';

interface UserRow {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  kyc_status: string;
  status: string;
  loyalty_points: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getAdminUsers(page, search || undefined);
    if (r.data) {
      setUsers(r.data.users);
      setTotal(r.data.total);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const setStatus = async (s: string) => {
    if (!selected) return;
    setBusy(true);
    await api.updateUserStatus(selected.id, s);
    setBusy(false);
    setSelected(null);
    load();
  };

  const setKyc = async (s: string) => {
    if (!selected) return;
    setBusy(true);
    await api.updateUserKYC(selected.id, s);
    setBusy(false);
    setSelected(null);
    load();
  };

  const kycVariant = (s: string) =>
    s === 'VERIFIED' ? 'success' : s === 'PENDING' ? 'warning' : 'destructive';

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description={`${total} total`} back="/admin" />

      <Card>
        <CardContent className="p-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <Input
              className="pl-9"
              placeholder="Search phone, name, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            />
          </div>
          <Button variant="outline" onClick={() => { setPage(1); load(); }}>Search</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserIcon} title="No users found" />
      ) : (
        <>
          <div className="grid gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
              >
                <IconBadge icon={UserIcon} tone="brand" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.phone_number}
                    </p>
                    <Badge variant={kycVariant(u.kyc_status) as any}>{u.kyc_status}</Badge>
                    {u.status !== 'ACTIVE' && <Badge variant="destructive">{u.status}</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">{u.phone_number} · {u.email || 'no email'}</p>
                </div>
                <p className="text-xs text-ink-muted">{u.loyalty_points} pts</p>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {total > users.length && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span className="text-sm text-ink-muted self-center">Page {page}</span>
              <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{[selected?.first_name, selected?.last_name].filter(Boolean).join(' ') || selected?.phone_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">{selected?.phone_number} · {selected?.email || '—'}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={kycVariant(selected?.kyc_status || '') as any}>KYC {selected?.kyc_status}</Badge>
              <Badge variant={selected?.status === 'ACTIVE' ? 'success' : 'destructive'}>{selected?.status}</Badge>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-border">
              <p className="section-title">KYC</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setKyc('VERIFIED')} disabled={busy}>Verify</Button>
                <Button size="sm" variant="outline" onClick={() => setKyc('PENDING')} disabled={busy}>Reset to pending</Button>
                <Button size="sm" variant="destructive" onClick={() => setKyc('REJECTED')} disabled={busy}>Reject</Button>
              </div>
              <p className="section-title pt-2">Account status</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setStatus('ACTIVE')} disabled={busy}>Activate</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus('SUSPENDED')} disabled={busy}>Suspend</Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus('DEACTIVATED')} disabled={busy}>Deactivate</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
