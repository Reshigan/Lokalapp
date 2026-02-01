import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Wifi, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Share2,
  Copy
} from 'lucide-react';

interface Voucher {
  id: string;
  package_name: string;
  voucher_code: string;
  status: string;
  data_limit_mb: number;
  data_used_mb: number;
  data_remaining_mb: number;
  validity_hours: number;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function VouchersPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    const { data } = await api.getWiFiVouchers();
    if (data) {
      setVouchers(data.vouchers);
    }
    setLoading(false);
  };

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (voucher: Voucher) => {
    const shareData = {
      title: 'WiFi Voucher',
      text: `WiFi Voucher Code: ${voucher.voucher_code}\nPackage: ${voucher.package_name}\nData: ${voucher.data_limit_mb}MB`,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopy(voucher.voucher_code, voucher.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'EXPIRED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'USED':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'EXPIRED':
        return 'bg-red-100 text-red-700';
      case 'USED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
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
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 pb-8 rounded-b-[30px]">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">My Vouchers</h1>
        </div>
        <p className="text-teal-100 text-sm">View and manage your WiFi vouchers</p>
      </div>

      {/* Vouchers List */}
      <div className="px-4 -mt-4 space-y-3">
        {vouchers.length === 0 ? (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8 text-center">
              <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No vouchers yet</p>
              <Button 
                className="mt-4 bg-teal-500 hover:bg-teal-600 rounded-xl"
                onClick={() => navigate('/user/wifi')}
              >
                Buy WiFi
              </Button>
            </CardContent>
          </Card>
        ) : (
          vouchers.map((voucher) => (
            <Card key={voucher.id} className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{voucher.package_name}</h3>
                        <p className="text-sm text-gray-500">{voucher.data_limit_mb}MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(voucher.status)}
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(voucher.status)}`}>
                        {voucher.status}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Code */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Voucher Code</p>
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-bold text-teal-600">{voucher.voucher_code}</code>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-teal-600"
                          onClick={() => handleCopy(voucher.voucher_code, voucher.id)}
                        >
                          {copiedId === voucher.id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-teal-600"
                          onClick={() => handleShare(voucher)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Usage Progress */}
                  {voucher.status === 'ACTIVE' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Data Used</span>
                        <span className="text-gray-700">{voucher.data_used_mb}MB / {voucher.data_limit_mb}MB</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${(voucher.data_used_mb / voucher.data_limit_mb) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="text-gray-700">{formatDate(voucher.created_at)}</p>
                    </div>
                    {voucher.expires_at && (
                      <div>
                        <p className="text-gray-500">Expires</p>
                        <p className="text-gray-700">{formatDate(voucher.expires_at)}</p>
                      </div>
                    )}
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
