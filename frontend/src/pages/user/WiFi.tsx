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
  Signal,
  Zap
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
      <div className="min-h-screen bg-lokal-navy flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-lokal-cyan/30 rounded-full blur-2xl animate-pulse-slow" />
            <Loader2 className="w-12 h-12 animate-spin text-lokal-cyan relative z-10" />
          </div>
          <p className="text-white/50 mt-4 text-sm">Loading WiFi packages...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lokal-navy pb-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-lokal-cyan/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-40 -left-40 w-80 h-80 bg-lokal-blue/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          className="p-6 pb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/user')}
              className="w-10 h-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="text-xl font-bold text-white">WiFi Vouchers</h1>
              <p className="text-white/50 text-sm">Buy data and stay connected</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'buy' 
                  ? 'bg-gradient-to-r from-lokal-cyan to-lokal-blue text-white shadow-glow-cyan' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Signal className="w-4 h-4 inline mr-2" />
              Buy Data
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vouchers' 
                  ? 'bg-gradient-to-r from-lokal-cyan to-lokal-blue text-white shadow-glow-cyan' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              My Vouchers ({vouchers.length})
            </button>
          </div>
        </motion.div>

        <div className="px-4">
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
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPackage(pkg)}
                    className="cursor-pointer bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-lokal-cyan/30 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-lokal-cyan to-lokal-blue rounded-xl flex items-center justify-center shadow-glow-cyan group-hover:scale-110 transition-transform">
                          <Wifi className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{pkg.name}</h3>
                          <p className="text-sm text-white/50">{pkg.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-white/40">
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
                        <p className="text-lg font-bold text-lokal-cyan">
                          {formatCurrency(pkg.price)}
                        </p>
                        <Zap className="w-4 h-4 text-lokal-cyan/50 ml-auto mt-1" />
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
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Wifi className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/40 mb-4">No vouchers yet</p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        className="bg-gradient-to-r from-lokal-cyan to-lokal-blue hover:opacity-90 text-white font-semibold rounded-xl shadow-glow-cyan border-0"
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
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{voucher.package_name}</h3>
                          <Badge className={`mt-1 ${
                            voucher.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            voucher.status === 'UNUSED' ? 'bg-lokal-cyan/20 text-lokal-cyan border-lokal-cyan/30' :
                            voucher.status === 'EXPIRED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {voucher.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => copyToClipboard(voucher.voucher_code)}
                            className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => shareVoucher(voucher.voucher_code, voucher.package_name)}
                            className="w-9 h-9 bg-lokal-cyan/10 border border-lokal-cyan/30 rounded-lg flex items-center justify-center text-lokal-cyan hover:bg-lokal-cyan/20 transition-all"
                          >
                            <Share2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-lokal-navy to-lokal-deep rounded-xl p-3 font-mono text-center text-lg text-lokal-cyan border border-lokal-cyan/20">
                        {voucher.voucher_code}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-white/40 text-xs">Data</p>
                          <p className="font-medium text-white">
                            {formatData(voucher.data_remaining_mb)} / {formatData(voucher.data_limit_mb)}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-white/40 text-xs">Validity</p>
                          <p className="font-medium text-white">{formatValidity(voucher.validity_hours)}</p>
                        </div>
                      </div>
                      {voucher.status === 'ACTIVE' && voucher.expires_at && (
                        <p className="text-xs text-white/40 mt-2">
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
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!selectedPackage && !purchaseResult} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-sm mx-4 bg-lokal-deep border border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Confirm Purchase</DialogTitle>
            <DialogDescription className="text-white/50 text-center">
              You are about to purchase a WiFi voucher
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="py-4">
              <div className="bg-gradient-to-br from-lokal-cyan/10 to-lokal-blue/10 rounded-2xl p-5 text-center border border-lokal-cyan/20">
                <div className="w-16 h-16 bg-gradient-to-br from-lokal-cyan to-lokal-blue rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-cyan">
                  <Wifi className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white">{selectedPackage.name}</h3>
                <p className="text-white/50 text-sm">{selectedPackage.description}</p>
                <div className="flex justify-center gap-4 mt-3 text-sm text-white/60">
                  <span className="flex items-center gap-1"><Database className="w-3 h-3" />{formatData(selectedPackage.data_limit_mb)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatValidity(selectedPackage.validity_hours)}</span>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-lokal-cyan to-lokal-blue bg-clip-text text-transparent mt-4">
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedPackage(null)} 
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
            >
              Cancel
            </Button>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                className="w-full bg-gradient-to-r from-lokal-cyan to-lokal-blue hover:opacity-90 text-white font-semibold rounded-xl shadow-glow-cyan border-0"
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
        <DialogContent className="max-w-sm mx-4 bg-lokal-deep border border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>
          {purchaseResult && (
            <div className="py-4">
              <p className="text-center text-white/50 mb-4">
                Your WiFi voucher code is:
              </p>
              <div className="bg-gradient-to-r from-lokal-navy to-lokal-deep rounded-xl p-4 font-mono text-center text-xl text-lokal-cyan border border-lokal-cyan/30 shadow-glow-cyan">
                {purchaseResult.voucher_code}
              </div>
              <div className="flex gap-2 mt-4">
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
                    onClick={() => copyToClipboard(purchaseResult.voucher_code)}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-lokal-cyan to-lokal-blue hover:opacity-90 text-white font-semibold rounded-xl border-0"
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
                className="w-full bg-gradient-to-r from-lokal-purple to-lokal-pink hover:opacity-90 text-white font-semibold rounded-xl shadow-glow-purple border-0"
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
