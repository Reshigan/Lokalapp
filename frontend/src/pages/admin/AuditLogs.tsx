import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Plus, Edit, Trash, Eye, RefreshCw, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  user_phone: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

const actionIcon = (a: string) => {
  const x = a.toLowerCase();
  if (x.includes('create')) return Plus;
  if (x.includes('update') || x.includes('edit')) return Edit;
  if (x.includes('delete')) return Trash;
  if (x.includes('view')) return Eye;
  return Shield;
};

const actionTone = (a: string): 'success' | 'accent' | 'destructive' | 'neutral' => {
  const x = a.toLowerCase();
  if (x.includes('create')) return 'success';
  if (x.includes('delete')) return 'destructive';
  if (x.includes('update')) return 'accent';
  return 'neutral';
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await api.getAdminAuditLogs();
    if (r.data) setLogs(r.data.audit_logs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Every state-changing action across the platform."
        back="/admin"
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading…</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Shield} title="No audit logs yet" />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-surface-border">
            {logs.map((log) => {
              const Icon = actionIcon(log.action);
              return (
                <div key={log.id} className="flex items-start gap-3 p-4">
                  <IconBadge icon={Icon} tone={actionTone(log.action) as any} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{log.action}</p>
                      <Badge variant="secondary">{log.entity_type}</Badge>
                      {log.entity_id && <code className="text-xs text-ink-muted">{log.entity_id.slice(0, 8)}…</code>}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {log.user_name || log.user_phone || 'system'} · {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
