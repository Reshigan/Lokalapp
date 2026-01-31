import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  Zap, 
  ArrowLeft, 
  Check, 
  Loader2,
  Plus,
  Battery,
  Gauge
} from 'lucide-react';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  package_type: string;
  kwh_amount: number | null;
  validity_days: number | null;
}

interface Meter {
  id: string;
  meter_number: string;
  address: string | null;
  kwh_balance: number;
  status: string;
  unlimited_expires_at: string | null;
}

export default function ElectricityPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<ElectricityPackage[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ElectricityPackage | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'meters'>('buy');
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [newMeterNumber, setNewMeterNumber] = useState('');
  const [newMeterAddress, setNewMeterAddress] = useState('');
  const [addingMeter, setAddingMeter] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [packagesRes, metersRes] = await Promise.all([
      api.getElectricityPackages(),
      api.getMeters(),
    ]);
    if (packagesRes.data?.packages) setPackages(packagesRes.data.packages);
    if (metersRes.data?.meters) {
      setMeters(metersRes.data.meters);
      if (metersRes.data.meters.length > 0 && !selectedMeter) {
        setSelectedMeter(metersRes.data.meters[0]);
      }
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedMeter) return;
    setPurchasing(true);
    const { data, error } = await api.purchaseElectricity(selectedPackage.id, selectedMeter.id);
    setPurchasing(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setPurchaseSuccess(true);
      loadData();
    }
  };

  const handleAddMeter = async () => {
    if (!newMeterNumber) return;
    setAddingMeter(true);
    const { data, error } = await api.registerMeter(newMeterNumber, newMeterAddress || undefined);
    setAddingMeter(false);
    
    if (error) {
      alert(error);
      return;
    }
    
    if (data) {
      setShowAddMeter(false);
      setNewMeterNumber('');
      setNewMeterAddress('');
      loadData();
    }
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
            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl animate-pulse-slow" />
            <Loader2 className="w-12 h-12 animate-spin text-amber-400 relative z-10" />
          </div>
          <p className="text-white/50 mt-4 text-sm">Loading electricity packages...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lokal-navy pb-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-amber-500/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '3s' }} />
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
              <h1 className="text-xl font-bold text-white">Prepaid Electricity</h1>
              <p className="text-white/50 text-sm">Power up your home</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'buy' 
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Buy Units
            </button>
            <button
              onClick={() => setActiveTab('meters')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'meters' 
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Gauge className="w-4 h-4 inline mr-2" />
              My Meters ({meters.length})
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
              >
                {/* Meter Selection */}
                {meters.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
                  >
                    <p className="text-sm text-white/50 mb-2">Selected Meter</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{selectedMeter?.meter_number}</p>
                        <p className="text-sm text-white/50">{selectedMeter?.address || 'No address'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/50">Balance</p>
                        <p className="font-bold text-amber-400">{selectedMeter?.kwh_balance.toFixed(1)} kWh</p>
                      </div>
                    </div>
                    {meters.length > 1 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {meters.map((meter) => (
                          <button
                            key={meter.id}
                            onClick={() => setSelectedMeter(meter)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selectedMeter?.id === meter.id 
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            {meter.meter_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {meters.length === 0 && (
                  <div className="mb-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/40 mb-4">Add a meter to buy electricity</p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        className="bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] border-0"
                        onClick={() => setShowAddMeter(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Meter
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* Packages */}
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectedMeter && setSelectedPackage(pkg)}
                      className={`cursor-pointer bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-amber-500/30 transition-all group ${!selectedMeter ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.35)] group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{pkg.name}</h3>
                            <p className="text-sm text-white/50">{pkg.description}</p>
                            <div className="flex items-center gap-1 mt-2 text-sm text-white/40">
                              <Battery className="w-4 h-4" />
                              {pkg.kwh_amount} kWh
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-400">
                            {formatCurrency(pkg.price)}
                          </p>
                          {pkg.kwh_amount && (
                            <p className="text-xs text-white/40">
                              {formatCurrency(pkg.price / pkg.kwh_amount)}/kWh
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="meters"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] border-0 h-12"
                    onClick={() => setShowAddMeter(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Meter
                  </Button>
                </motion.div>
                
                {meters.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/40">No meters registered yet</p>
                  </div>
                ) : (
                  meters.map((meter, index) => (
                    <motion.div 
                      key={meter.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{meter.meter_number}</h3>
                            <Badge className={meter.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/10 text-white/60 border-white/20'}>
                              {meter.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/50 mt-1">
                            {meter.address || 'No address set'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white/50">Balance</p>
                          <p className="text-xl font-bold text-amber-400">
                            {meter.kwh_balance.toFixed(1)} kWh
                          </p>
                        </div>
                      </div>
                      {meter.unlimited_expires_at && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-white/40">
                            Unlimited until: {new Date(meter.unlimited_expires_at).toLocaleDateString()}
                          </p>
                        </div>
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
      <Dialog open={!!selectedPackage && !purchaseSuccess} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Confirm Purchase</DialogTitle>
            <DialogDescription className="text-gray-500">
              You are about to purchase electricity units
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && selectedMeter && (
            <div className="py-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                <Zap className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                <h3 className="font-bold text-lg text-gray-900">{selectedPackage.name}</h3>
                <p className="text-gray-600">{selectedPackage.kwh_amount} kWh</p>
                <p className="text-sm text-gray-500 mt-2">
                  For meter: {selectedMeter.meter_number}
                </p>
                <p className="text-2xl font-bold text-[#1e3a5f] mt-3">
                  {formatCurrency(selectedPackage.price)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPackage(null)} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Success Dialog */}
      <Dialog open={purchaseSuccess} onOpenChange={() => setPurchaseSuccess(false)}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-gray-900">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-500">
              Your electricity units have been added to your meter.
            </p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => {
                setPurchaseSuccess(false);
                setSelectedPackage(null);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Meter Dialog */}
      <Dialog open={showAddMeter} onOpenChange={setShowAddMeter}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Add New Meter</DialogTitle>
            <DialogDescription className="text-gray-500">
              Enter your prepaid electricity meter number
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Meter Number</label>
              <Input
                placeholder="Enter meter number"
                value={newMeterNumber}
                onChange={(e) => setNewMeterNumber(e.target.value)}
                className="border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Address (Optional)</label>
              <Input
                placeholder="Enter address"
                value={newMeterAddress}
                onChange={(e) => setNewMeterAddress(e.target.value)}
                className="border-gray-200 focus:border-[#4da6e8] focus:ring-[#4da6e8]"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddMeter(false)} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={handleAddMeter}
              disabled={addingMeter || !newMeterNumber}
            >
              {addingMeter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Meter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
