import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Search,
  User,
  Phone,
  Loader2,
  Plus,
  UserPlus
} from 'lucide-react';

interface Customer {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  kyc_status: string;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchPhone, setSearchPhone] = useState('');
  const [searchName, setSearchName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchPhone && !searchName) {
      alert('Please enter a phone number or name to search');
      return;
    }
    
    setLoading(true);
    setSearched(true);
    const { data } = await api.searchCustomers(searchPhone || undefined, searchName || undefined);
    if (data) setCustomers(data);
    setLoading(false);
  };

  const getKycColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/agent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Find Customer</h1>
        </div>
        
        {/* Search Form */}
        <div className="space-y-3">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4da6e8]" />
            <Input
              type="tel"
              placeholder="Search by phone number"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-[#4da6e8]"
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4da6e8]" />
            <Input
              type="text"
              placeholder="Search by name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-[#4da6e8]"
            />
          </div>
          <Button 
            className="w-full bg-white text-[#1e3a5f] hover:bg-gray-50 shadow-lg"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Register New Customer Button */}
        <Button 
          variant="outline"
          className="w-full mb-4 border-gray-200 text-gray-600 hover:bg-gray-50"
          onClick={() => navigate('/agent/customers/new')}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Register New Customer
        </Button>

        {/* Results */}
        {searched && (
          <>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : customers.length === 0 ? (
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 text-center text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No customers found</p>
                  <Button 
                    className="mt-4 bg-[#1e3a5f] hover:bg-[#2d5a87]"
                    onClick={() => navigate('/agent/customers/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Register New Customer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">{customers.length} customer(s) found</p>
                {customers.map((customer) => (
                  <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#4da6e8]/20 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-[#4da6e8]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {customer.first_name || customer.last_name 
                                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                : 'Unknown'}
                            </h3>
                            <Badge variant={getKycColor(customer.kyc_status) as "default" | "secondary" | "destructive" | "outline"}>
                              {customer.kyc_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{customer.phone_number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
