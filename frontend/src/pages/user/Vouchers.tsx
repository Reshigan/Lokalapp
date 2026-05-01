import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Wifi, Copy, Check, Share2 } from 'lucide-react';

interface Voucher {
  id: string;
  package_name: string | null;
  voucher_code: string;
  status: string;
  data_limit_mb: number;
  data_remaining_mb: number;
  expires_at: string | null;
}

const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

export default function VouchersPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.getWiFiVouchers().then((r) => {
      if (r.data?.vouchers) setVouchers(r.data.vouchers as any);
      setLoading(false);
    });
  }, []);

  const copy = async (v: Voucher) => {
    await navigator.clipboard.writeText(v.voucher_code);
    setCopiedId(v.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const share = async (v: Voucher) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Lokal WiFi voucher', text: `Voucher: ${v.voucher_code}` }); } catch { /* cancelled */ }
    } else { copy(v); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My vouchers" description="Active and unused WiFi passes." back="/user" />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Wifi}
          title="No vouchers yet"
          description="Buy a WiFi pack to get started."
          action={<Button onClick={() => navigate('/user/wifi')}>Buy WiFi</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {vouchers.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-5 flex items-start gap-3">
                <IconBadge icon={Wifi} tone={v.status === 'ACTIVE' ? 'accent' : 'neutral'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{v.package_name || 'Voucher'}</p>
                    <Badge variant={v.status === 'ACTIVE' ? 'accent' : v.status === 'UNUSED' ? 'secondary' : 'destructive'}>{v.status}</Badge>
                  </div>
                  <code className="text-base font-mono bg-surface-subtle px-2 py-1 rounded-md inline-block mt-2">{v.voucher_code}</code>
                  <p className="text-xs text-ink-muted mt-2">
                    {fmtMb(v.data_remaining_mb || v.data_limit_mb)} remaining
                    {v.expires_at && ` · expires ${new Date(v.expires_at).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => copy(v)}>
                      {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === v.id ? 'Copied' : 'Copy'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => share(v)}>
                      <Share2 className="w-4 h-4" /> Share
                    </Button>
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
