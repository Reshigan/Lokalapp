import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  Search,
  User,
  Loader2,
  Shield,
  Ban,
  CheckCircle
} from 'lucide-react';

interface UserData {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  kyc_status: string;
  status: string;
  loyalty_points: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await api.getAdminUsers(page, search || undefined);
    if (data) {
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedUser) return;
    setUpdating(true);
    const { error } = await api.updateUserStatus(selectedUser.id, status);
    setUpdating(false);
    if (error) {
      alert(error);
      return;
    }
    setSelectedUser(null);
    loadUsers();
  };

  const handleUpdateKYC = async (status: string) => {
    if (!selectedUser) return;
    setUpdating(true);
    const { error } = await api.updateUserKYC(selectedUser.id, status);
    setUpdating(false);
    if (error) {
      alert(error);
      return;
    }
    setSelectedUser(null);
    loadUsers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SUSPENDED': return 'destructive';
      case 'PENDING': return 'warning';
      default: return 'secondary';
    }
  };

  const getKycColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white p-6 rounded-b-[30px]">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">User Management</h1>
        </div>
        
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-200" />
            <Input
              type="text"
              placeholder="Search by phone or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-rose-200"
            />
          </div>
          <Button 
            className="bg-white text-rose-600 hover:bg-gray-50 shadow-lg"
            onClick={handleSearch}
          >
            Search
          </Button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <p className="text-sm text-gray-500 mb-3">{total} users total</p>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-6 text-center text-gray-400">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card 
                key={user.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white border-0 shadow-md"
                onClick={() => setSelectedUser(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate text-gray-900">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Unknown'}
                        </h3>
                        <Badge variant={getStatusColor(user.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{user.phone_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getKycColor(user.kyc_status) as "default" | "secondary" | "destructive" | "outline"} className="text-xs">
                          KYC: {user.kyc_status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination */}
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={users.length < 20}
                onClick={() => setPage(p => p + 1)}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-sm mx-4 bg-white border-0 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedUser.first_name || selectedUser.last_name 
                    ? `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim()
                    : 'Unknown'}
                </h3>
                <p className="text-gray-500">{selectedUser.phone_number}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{selectedUser.email || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={getStatusColor(selectedUser.status) as "default" | "secondary" | "destructive" | "outline"}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">KYC Status</span>
                  <Badge variant={getKycColor(selectedUser.kyc_status) as "default" | "secondary" | "destructive" | "outline"}>
                    {selectedUser.kyc_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Loyalty Points</span>
                  <span className="text-gray-900">{selectedUser.loyalty_points}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-500">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedUser.status === 'ACTIVE' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUpdateStatus('SUSPENDED')}
                      disabled={updating}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleUpdateStatus('ACTIVE')}
                      disabled={updating}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  {selectedUser.kyc_status !== 'VERIFIED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateKYC('VERIFIED')}
                      disabled={updating}
                      className="border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Verify KYC
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
