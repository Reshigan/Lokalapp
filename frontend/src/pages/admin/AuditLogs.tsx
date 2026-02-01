import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Loader2,
  Shield,
  User,
  Settings,
  Edit,
  Trash,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_phone: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await api.getAdminAuditLogs();
    if (data) {
      setLogs(data.audit_logs);
    }
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <Trash className="w-4 h-4 text-red-500" />;
      case 'view':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'update':
        return 'bg-blue-100 text-blue-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white p-6 pb-8 rounded-b-[30px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">Audit Logs</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={loadLogs}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-rose-200" />
          <p className="text-rose-100 text-sm">Track all admin actions for compliance</p>
        </div>
      </div>

      {/* Logs List */}
      <div className="px-4 -mt-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No audit logs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {log.entity_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <User className="w-3 h-3" />
                          <span>{log.user_name || log.user_phone || 'System'}</span>
                        </div>
                        {log.entity_id && (
                          <p className="text-xs text-gray-400 truncate">
                            Entity ID: {log.entity_id}
                          </p>
                        )}
                        {(log.old_value || log.new_value) && (
                          <div className="mt-2 text-xs">
                            {log.old_value && (
                              <p className="text-red-500 truncate">- {log.old_value}</p>
                            )}
                            {log.new_value && (
                              <p className="text-green-500 truncate">+ {log.new_value}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 text-right flex-shrink-0">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
