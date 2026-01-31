import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { 
  ArrowLeft, 
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  History as HistoryIcon
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  status: string;
  description: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async (pageNum = 1) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    const { data } = await api.getTransactions(pageNum, 20);
    
    if (data) {
      if (pageNum === 1) {
        setTransactions(data.transactions);
      } else {
        setTransactions(prev => [...prev, ...data.transactions]);
      }
      setHasMore(data.has_more);
      setPage(pageNum);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Transaction History</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        {transactions.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center text-slate-400">
              <HistoryIcon className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Your transaction history will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.amount > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">
                            {tx.description || tx.type}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.amount > 0 ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </p>
                          {tx.fee > 0 && (
                            <p className="text-xs text-slate-500">
                              Fee: {formatCurrency(tx.fee)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusColor(tx.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {tx.status}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Ref: {tx.reference.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Balance: {formatCurrency(tx.balance_before)} → {formatCurrency(tx.balance_after)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {hasMore && (
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => loadTransactions(page + 1)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Load More
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
