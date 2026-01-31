import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  Wifi, 
  ArrowLeft, 
  Check, 
  Copy, 
  Loader2,
  Clock,
  Database,
  Share2,
  Sparkles,
  Signal
} from 'lucide-react';

interface WiFiPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  data_limit_mb: number;
  validity_hours: number;
}

interface WiFiVoucher {
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

export default function WiFiPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<WiFiPackage[]>([]);
  const [vouchers, setVouchers] = useState<WiFiVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<WiFiPackage | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ voucher_code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'vouchers'>('buy');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [packagesRes, vouchersRes] = await Promise.all([
      api.getWiFiPackages(),
      api.getWiFiVouchers(),
    ]);
    if (packagesRes.data?.packages) setPackages(packagesRes.data.packages);
    if (vouchersRes.data?.vouchers) setVouchers(vouchersRes.data.vouchers);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    const { data, error } = await api.purchaseWiFi(selectedPackage.id);
    setPurchasing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setPurchaseResult({ voucher_code: data.voucher_code });
      loadData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVoucher = async (voucherCode: string, packageName: string) => {
    const shareData = {
      title: 'Lokal WiFi Voucher',
      text: `Here's your WiFi voucher code: ${voucherCode}\n\nPackage: ${packageName}\n\nConnect to Lokal WiFi and enter this code to get online!`,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(voucherCode);
        }
      }
    } else {
      copyToClipboard(voucherCode);
    }
  };

  const formatData = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  const formatValidity = (hours: number) => {
    if (hours >= 720) {
      return `${Math.floor(hours / 720)} month${hours >= 1440 ? 's' : ''}`;
    }
    if (hours >= 24) {
      return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''}`;
    }
    return `${hours} hours`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-[#00B894] mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Loading WiFi packages...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-r from-[#00B894] to-[#00CEC9] px-5 pt-6 pb-8 rounded-b-[30px]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/user')}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-white">WiFi Vouchers</h1>
            <p className="text-white/80 text-sm">Buy data and stay connected</p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 -mt-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm mb-4">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'buy' 
                ? 'bg-[#00B894] text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Signal className="w-4 h-4 inline mr-2" />
            Buy Data
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'vouchers' 
                ? 'bg-[#00B894] text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            My Vouchers ({vouchers.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'buy' ? (
            <motion.div 
              key="buy"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPackage(pkg)}
                  className="cursor-pointer bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border-l-4 border-[#00B894]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00B894] to-[#00CEC9] rounded-xl flex items-center justify-center">
                        <Wifi className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {formatData(pkg.data_limit_mb)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatValidity(pkg.validity_hours)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#00B894]">
                        {formatCurrency(pkg.price)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="vouchers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {vouchers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Wifi className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 mb-4">No vouchers yet</p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="bg-[#00B894] hover:bg-[#00A085] text-white font-semibold rounded-xl"
                      onClick={() => setActiveTab('buy')}
                    >
                      Buy Your First Voucher
                    </Button>
                  </motion.div>
                </div>
              ) : (
                vouchers.map((voucher, index) => (
                  <motion.div 
                    key={voucher.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{voucher.package_name}</h3>
                        <Badge className={`mt-1 ${
                          voucher.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                          voucher.status === 'UNUSED' ? 'bg-teal-100 text-teal-600 border-teal-200' :
                          voucher.status === 'EXPIRED' ? 'bg-red-100 text-red-600 border-red-200' :
                          'bg-amber-100 text-amber-600 border-amber-200'
                        }`}>
                          {voucher.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyToClipboard(voucher.voucher_code)}
                          className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => shareVoucher(voucher.voucher_code, voucher.package_name)}
                          className="w-9 h-9 bg-[#00B894]/10 rounded-lg flex items-center justify-center text-[#00B894] hover:bg-[#00B894]/20 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-[#00B894] to-[#00CEC9] rounded-xl p-3 font-mono text-center text-lg text-white">
                      {voucher.voucher_code}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400 text-xs">Data</p>
                        <p className="font-medium text-gray-900">
                          {formatData(voucher.data_remaining_mb)} / {formatData(voucher.data_limit_mb)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400 text-xs">Validity</p>
                        <p className="font-medium text-gray-900">{formatValidity(voucher.validity_hours)}</p>
                      </div>
                    </div>
                    {voucher.status === 'ACTIVE' && voucher.expires_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Expires: {new Date(voucher.expires_at).toLocaleString()}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!selectedPackage && !purchaseResult} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-center">Confirm Purchase</DialogTitle>
            <DialogDescription className="text-gray-500 text-center">
              You are about to purchase a WiFi voucher
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="py-4">
              <div className="bg-gradient-to-br from-[#00B894]/10 to-[#00CEC9]/10 rounded-2xl p-5 text-center border border-[#00B894]/20">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00B894] to-[#00CEC9] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Wifi className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">{selectedPackage.name}</h3>
                <p className="text-gray-500 text-sm">{selectedPackage.description}</p>
                <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Database className="w-3 h-3" />{formatData(selectedPackage.data_limit_mb)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatValidity(selectedPackage.validity_hours)}</span>
                </div>
                <p className="text-3xl font-bold text-[#00B894] mt-4">
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedPackage(null)} 
              className="flex-1 bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 rounded-xl"
            >
              Cancel
            </Button>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                className="w-full bg-[#00B894] hover:bg-[#00A085] text-white font-semibold rounded-xl border-0"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Purchase
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Success Dialog */}
      <Dialog open={!!purchaseResult} onOpenChange={() => setPurchaseResult(null)}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-[#00B894] to-[#00CEC9] rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>
          {purchaseResult && (
            <div className="py-4">
              <p className="text-center text-gray-500 mb-4">
                Your WiFi voucher code is:
              </p>
              <div className="bg-gradient-to-r from-[#00B894] to-[#00CEC9] rounded-xl p-4 font-mono text-center text-xl text-white">
                {purchaseResult.voucher_code}
              </div>
              <div className="flex gap-2 mt-4">
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 rounded-xl"
                    onClick={() => copyToClipboard(purchaseResult.voucher_code)}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2 text-[#00B894]" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-[#00B894] hover:bg-[#00A085] text-white font-semibold rounded-xl border-0"
                    onClick={() => shareVoucher(purchaseResult.voucher_code, selectedPackage?.name || 'WiFi')}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </motion.div>
              </div>
            </div>
          )}
          <DialogFooter>
            <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD6] text-white font-semibold rounded-xl border-0"
                onClick={() => {
                  setPurchaseResult(null);
                  setSelectedPackage(null);
                  setActiveTab('vouchers');
                }}
              >
                View My Vouchers
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
