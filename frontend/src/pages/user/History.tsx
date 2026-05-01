import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/Stat';
import api from '@/services/api';
import { ArrowDown, ArrowUp, History as HistoryIcon, Loader2 } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  balance_after: number;
  reference: string;
  status: string;
  description: string | null;
  created_at: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function HistoryPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (p = 1) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    const r = await api.getTransactions(p, 20);
    if (r.data) {
      setTxs((prev) => (p === 1 ? r.data!.transactions : [...prev, ...r.data!.transactions]));
      setHasMore(r.data.has_more);
      setPage(p);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Transaction history" description="Top-ups, transfers, purchases, and refunds." back="/user" />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : txs.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No transactions yet" description="Your activity will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-surface-border">
            {txs.map((tx) => {
              const credit = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-4">
                  <span className={
                    credit
                      ? 'w-9 h-9 rounded-xl bg-success-soft text-emerald-700 grid place-items-center'
                      : 'w-9 h-9 rounded-xl bg-surface-subtle text-ink-soft grid place-items-center'
                  }>
                    {credit ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-ink-muted">{tx.reference} · {fmtDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={credit ? 'text-emerald-600 font-semibold text-sm' : 'text-ink font-semibold text-sm'}>
                      {credit ? '+' : ''}{fmt(tx.amount)}
                    </p>
                    {tx.status !== 'COMPLETED' && (
                      <Badge variant={tx.status === 'PENDING' ? 'warning' : 'destructive'} className="mt-1">{tx.status}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {hasMore && (
        <Button variant="outline" className="w-full" disabled={loadingMore} onClick={() => load(page + 1)}>
          {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
        </Button>
      )}
    </div>
  );
}
