import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/services/api';
import { 
  ArrowLeft, 
  CreditCard,
  Building2,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wifi,
  Zap,
  Save
} from 'lucide-react';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  merchant_id?: string;
  api_key?: string;
  environment: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  account_type: string;
  is_primary: boolean;
}

interface IoTDevice {
  id: string;
  name: string;
  device_type: string;
  serial_number: string;
  ip_address?: string;
  status: string;
  last_seen?: string;
  location?: string;
}

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('payment');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Payment Gateways
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);
  
  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [showBankDialog, setShowBankDialog] = useState(false);
  
  // IoT Devices
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [editingDevice, setEditingDevice] = useState<IoTDevice | null>(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gatewaysRes, banksRes, devicesRes] = await Promise.all([
        api.getPaymentGateways(),
        api.getBankAccounts(),
        api.getIoTDevices(),
      ]);
      if (gatewaysRes.data) setGateways(gatewaysRes.data);
      if (banksRes.data) setBankAccounts(banksRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setLoading(false);
  };

  // Payment Gateway handlers
  const handleSaveGateway = async () => {
    if (!editingGateway) return;
    setSaving(true);
    try {
      if (editingGateway.id) {
        await api.updatePaymentGateway(editingGateway.id, editingGateway);
      } else {
        await api.createPaymentGateway(editingGateway);
      }
      await loadData();
      setShowGatewayDialog(false);
      setEditingGateway(null);
    } catch (error) {
      console.error('Failed to save gateway:', error);
    }
    setSaving(false);
  };

  const handleDeleteGateway = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) return;
    await api.deletePaymentGateway(id);
    await loadData();
  };

  // Bank Account handlers
  const handleSaveBank = async () => {
    if (!editingBank) return;
    setSaving(true);
    try {
      if (editingBank.id) {
        await api.updateBankAccount(editingBank.id, editingBank);
      } else {
        await api.createBankAccount(editingBank);
      }
      await loadData();
      setShowBankDialog(false);
      setEditingBank(null);
    } catch (error) {
      console.error('Failed to save bank account:', error);
    }
    setSaving(false);
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    await api.deleteBankAccount(id);
    await loadData();
  };

  // IoT Device handlers
  const handleSaveDevice = async () => {
    if (!editingDevice) return;
    setSaving(true);
    try {
      if (editingDevice.id) {
        await api.updateIoTDevice(editingDevice.id, editingDevice);
      } else {
        await api.createIoTDevice(editingDevice);
      }
      await loadData();
      setShowDeviceDialog(false);
      setEditingDevice(null);
    } catch (error) {
      console.error('Failed to save device:', error);
    }
    setSaving(false);
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this IoT device?')) return;
    await api.deleteIoTDevice(id);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">System Settings</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="payment" className="text-xs">
              <CreditCard className="w-4 h-4 mr-1" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs">
              <Building2 className="w-4 h-4 mr-1" />
              Banks
            </TabsTrigger>
            <TabsTrigger value="iot" className="text-xs">
              <Cpu className="w-4 h-4 mr-1" />
              IoT
            </TabsTrigger>
          </TabsList>

          {/* Payment Gateways Tab */}
          <TabsContent value="payment" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">Payment Gateways</h2>
              <Button 
                size="sm" 
                className="bg-[#1e3a5f]"
                onClick={() => {
                  setEditingGateway({
                    id: '',
                    name: '',
                    type: 'OZOW',
                    is_active: true,
                    environment: 'SANDBOX'
                  });
                  setShowGatewayDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            {gateways.length === 0 ? (
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No payment gateways configured</p>
                </CardContent>
              </Card>
            ) : (
              gateways.map((gateway) => (
                <Card key={gateway.id} className="bg-white border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gateway.is_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          <CreditCard className={`w-5 h-5 ${gateway.is_active ? 'text-emerald-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{gateway.name}</h3>
                            <Badge variant={gateway.is_active ? 'default' : 'secondary'} className={gateway.is_active ? 'bg-emerald-500' : ''}>
                              {gateway.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{gateway.type} - {gateway.environment}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingGateway(gateway);
                            setShowGatewayDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteGateway(gateway.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Bank Accounts Tab */}
          <TabsContent value="bank" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">Bank Accounts</h2>
              <Button 
                size="sm" 
                className="bg-[#1e3a5f]"
                onClick={() => {
                  setEditingBank({
                    id: '',
                    bank_name: '',
                    account_name: '',
                    account_number: '',
                    branch_code: '',
                    account_type: 'CURRENT',
                    is_primary: false
                  });
                  setShowBankDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            {bankAccounts.length === 0 ? (
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No bank accounts configured</p>
                </CardContent>
              </Card>
            ) : (
              bankAccounts.map((bank) => (
                <Card key={bank.id} className="bg-white border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bank.is_primary ? 'bg-[#4da6e8]/20' : 'bg-gray-100'}`}>
                          <Building2 className={`w-5 h-5 ${bank.is_primary ? 'text-[#4da6e8]' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{bank.bank_name}</h3>
                            {bank.is_primary && (
                              <Badge className="bg-[#4da6e8]">Primary</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{bank.account_name}</p>
                          <p className="text-xs text-gray-400">****{bank.account_number.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingBank(bank);
                            setShowBankDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteBank(bank.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* IoT Devices Tab */}
          <TabsContent value="iot" className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">IoT Devices</h2>
              <Button 
                size="sm" 
                className="bg-[#1e3a5f]"
                onClick={() => {
                  setEditingDevice({
                    id: '',
                    name: '',
                    device_type: 'WIFI_CONTROLLER',
                    serial_number: '',
                    status: 'OFFLINE'
                  });
                  setShowDeviceDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            {devices.length === 0 ? (
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <Cpu className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No IoT devices configured</p>
                </CardContent>
              </Card>
            ) : (
              devices.map((device) => (
                <Card key={device.id} className="bg-white border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          device.status === 'ONLINE' ? 'bg-emerald-100' : 
                          device.status === 'ERROR' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {device.device_type === 'WIFI_CONTROLLER' ? (
                            <Wifi className={`w-5 h-5 ${
                              device.status === 'ONLINE' ? 'text-emerald-600' : 
                              device.status === 'ERROR' ? 'text-red-600' : 'text-gray-400'
                            }`} />
                          ) : (
                            <Zap className={`w-5 h-5 ${
                              device.status === 'ONLINE' ? 'text-emerald-600' : 
                              device.status === 'ERROR' ? 'text-red-600' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{device.name}</h3>
                            <Badge variant={
                              device.status === 'ONLINE' ? 'default' : 
                              device.status === 'ERROR' ? 'destructive' : 'secondary'
                            } className={device.status === 'ONLINE' ? 'bg-emerald-500' : ''}>
                              {device.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{device.device_type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-400">SN: {device.serial_number}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingDevice(device);
                            setShowDeviceDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteDevice(device.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Gateway Dialog */}
      <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
        <DialogContent className="max-w-sm mx-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">
              {editingGateway?.id ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
            </DialogTitle>
          </DialogHeader>
          {editingGateway && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingGateway.name}
                  onChange={(e) => setEditingGateway({...editingGateway, name: e.target.value})}
                  placeholder="Gateway name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editingGateway.type}
                  onChange={(e) => setEditingGateway({...editingGateway, type: e.target.value})}
                >
                  <option value="OZOW">Ozow</option>
                  <option value="PAYFAST">PayFast</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Merchant ID</label>
                <Input
                  value={editingGateway.merchant_id || ''}
                  onChange={(e) => setEditingGateway({...editingGateway, merchant_id: e.target.value})}
                  placeholder="Merchant ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  value={editingGateway.api_key || ''}
                  onChange={(e) => setEditingGateway({...editingGateway, api_key: e.target.value})}
                  placeholder="API Key"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editingGateway.environment}
                  onChange={(e) => setEditingGateway({...editingGateway, environment: e.target.value})}
                >
                  <option value="SANDBOX">Sandbox</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gateway-active"
                  checked={editingGateway.is_active}
                  onChange={(e) => setEditingGateway({...editingGateway, is_active: e.target.checked})}
                />
                <label htmlFor="gateway-active" className="text-sm">Active</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGatewayDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f]" onClick={handleSaveGateway} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="max-w-sm mx-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">
              {editingBank?.id ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
          </DialogHeader>
          {editingBank && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Name</label>
                <Input
                  value={editingBank.bank_name}
                  onChange={(e) => setEditingBank({...editingBank, bank_name: e.target.value})}
                  placeholder="e.g. FNB, Standard Bank"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  value={editingBank.account_name}
                  onChange={(e) => setEditingBank({...editingBank, account_name: e.target.value})}
                  placeholder="Account holder name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <Input
                  value={editingBank.account_number}
                  onChange={(e) => setEditingBank({...editingBank, account_number: e.target.value})}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch Code</label>
                <Input
                  value={editingBank.branch_code}
                  onChange={(e) => setEditingBank({...editingBank, branch_code: e.target.value})}
                  placeholder="Branch code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editingBank.account_type}
                  onChange={(e) => setEditingBank({...editingBank, account_type: e.target.value})}
                >
                  <option value="CURRENT">Current</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bank-primary"
                  checked={editingBank.is_primary}
                  onChange={(e) => setEditingBank({...editingBank, is_primary: e.target.checked})}
                />
                <label htmlFor="bank-primary" className="text-sm">Primary Account</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f]" onClick={handleSaveBank} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IoT Device Dialog */}
      <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
        <DialogContent className="max-w-sm mx-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">
              {editingDevice?.id ? 'Edit IoT Device' : 'Add IoT Device'}
            </DialogTitle>
          </DialogHeader>
          {editingDevice && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Name</label>
                <Input
                  value={editingDevice.name}
                  onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
                  placeholder="Device name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editingDevice.device_type}
                  onChange={(e) => setEditingDevice({...editingDevice, device_type: e.target.value})}
                >
                  <option value="WIFI_CONTROLLER">WiFi Controller</option>
                  <option value="ELECTRICITY_METER">Electricity Meter</option>
                  <option value="PREPAID_METER">Prepaid Meter</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Serial Number</label>
                <Input
                  value={editingDevice.serial_number}
                  onChange={(e) => setEditingDevice({...editingDevice, serial_number: e.target.value})}
                  placeholder="Serial number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address</label>
                <Input
                  value={editingDevice.ip_address || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, ip_address: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={editingDevice.location || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
                  placeholder="Device location"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>Cancel</Button>
            <Button className="bg-[#1e3a5f]" onClick={handleSaveDevice} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
