import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Battery
} from 'lucide-react';

interface ElectricityPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  kwh_amount: number;
}

interface Meter {
  id: string;
  meter_number: string;
  address: string | null;
  kwh_balance: number;
  status: string;
  last_reading: number;
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
    if (packagesRes.data) setPackages(packagesRes.data);
    if (metersRes.data) {
      setMeters(metersRes.data);
      if (metersRes.data.length > 0 && !selectedMeter) {
        setSelectedMeter(metersRes.data[0]);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/user')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Prepaid Electricity</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'buy' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('buy')}
            className={activeTab === 'buy' ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/20'}
          >
            Buy Units
          </Button>
          <Button
            variant={activeTab === 'meters' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('meters')}
            className={activeTab === 'meters' ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/20'}
          >
            My Meters ({meters.length})
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {activeTab === 'buy' ? (
          <>
            {/* Meter Selection */}
            {meters.length > 0 && (
              <Card className="mb-4 bg-white border-0 shadow-md">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500 mb-2">Selected Meter</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedMeter?.meter_number}</p>
                      <p className="text-sm text-gray-500">{selectedMeter?.address || 'No address'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="font-bold text-amber-600">{selectedMeter?.kwh_balance.toFixed(1)} kWh</p>
                    </div>
                  </div>
                  {meters.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {meters.map((meter) => (
                        <Button
                          key={meter.id}
                          variant={selectedMeter?.id === meter.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedMeter(meter)}
                          className={selectedMeter?.id === meter.id ? 'bg-[#1e3a5f]' : 'border-gray-200 text-gray-600'}
                        >
                          {meter.meter_number}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {meters.length === 0 && (
              <Card className="mb-4 bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <Zap className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 mb-4">Add a meter to buy electricity</p>
                  <Button 
                    className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                    onClick={() => setShowAddMeter(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Meter
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Packages */}
            <div className="space-y-3">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow bg-white border-0 shadow-md ${!selectedMeter ? 'opacity-50' : ''}`}
                  onClick={() => selectedMeter && setSelectedPackage(pkg)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          <p className="text-sm text-gray-500">{pkg.description}</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                            <Battery className="w-4 h-4" />
                            {pkg.kwh_amount} kWh
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#1e3a5f]">
                          {formatCurrency(pkg.price)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(pkg.price / pkg.kwh_amount)}/kWh
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Button 
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => setShowAddMeter(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Meter
            </Button>
            
            {meters.length === 0 ? (
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <Zap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No meters registered yet</p>
                </CardContent>
              </Card>
            ) : (
              meters.map((meter) => (
                <Card key={meter.id} className="bg-white border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{meter.meter_number}</h3>
                          <Badge variant={meter.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {meter.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {meter.address || 'No address set'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className="text-xl font-bold text-amber-600">
                          {meter.kwh_balance.toFixed(1)} kWh
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Last reading: {meter.last_reading.toFixed(1)} kWh
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
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
