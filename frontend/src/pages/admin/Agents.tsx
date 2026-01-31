import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { 
  ArrowLeft, 
  UserCheck,
  Loader2,
  TrendingUp,
  Award
} from 'lucide-react';

interface AgentData {
  id: string;
  agent_code: string;
  business_name: string;
  business_type: string;
  tier: string;
  float_balance: number;
  commission_balance: number;
  total_sales: number;
  monthly_sales: number;
  status: string;
  user_phone: string;
  user_name: string;
  created_at: string;
}

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export default function AdminAgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadAgents();
  }, [page]);

  const loadAgents = async () => {
    setLoading(true);
    const { data } = await api.getAdminAgents(page);
    if (data) {
      setAgents(data.agents);
      setTotal(data.total);
    }
    setLoading(false);
  };

  const handleUpdateTier = async (tier: string) => {
    if (!selectedAgent) return;
    setUpdating(true);
    const { error } = await api.updateAgentTier(selectedAgent.id, tier);
    setUpdating(false);
    if (error) {
      alert(error);
      return;
    }
    setSelectedAgent(null);
    loadAgents();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'bg-yellow-500 text-white';
      case 'SILVER': return 'bg-gray-400 text-white';
      case 'PLATINUM': return 'bg-purple-500 text-white';
      default: return 'bg-orange-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SUSPENDED': return 'destructive';
      case 'PENDING': return 'warning';
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
    <div className="min-h-screen bg-slate-900 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 via-pink-600 to-purple-700 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Agent Management</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <p className="text-sm text-slate-400 mb-3">{total} agents total</p>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center text-slate-400">
              <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p>No agents found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card 
                key={agent.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow bg-slate-800 border-slate-700"
                onClick={() => setSelectedAgent(agent)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate text-white">{agent.business_name}</h3>
                        <Badge className={getTierColor(agent.tier)}>
                          {agent.tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">{agent.agent_code}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {formatCurrency(agent.total_sales)}
                        </span>
                        <Badge variant={getStatusColor(agent.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {agent.status}
                        </Badge>
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
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-slate-400">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={agents.length < 20}
                onClick={() => setPage(p => p + 1)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Agent Detail Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-sm mx-4 bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Agent Details</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <UserCheck className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg text-white">{selectedAgent.business_name}</h3>
                <p className="text-slate-400">{selectedAgent.agent_code}</p>
                <Badge className={`mt-2 ${getTierColor(selectedAgent.tier)}`}>
                  {selectedAgent.tier}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Business Type</span>
                  <span className="text-white">{selectedAgent.business_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner</span>
                  <span className="text-white">{selectedAgent.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white">{selectedAgent.user_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Float Balance</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedAgent.float_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Commission Balance</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(selectedAgent.commission_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Sales</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedAgent.total_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Sales</span>
                  <span className="text-white">{formatCurrency(selectedAgent.monthly_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joined</span>
                  <span className="text-white">{formatDate(selectedAgent.created_at)}</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm font-medium text-slate-400 mb-2">
                  <Award className="w-4 h-4 inline mr-1" />
                  Change Tier
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {TIERS.map((tier) => (
                    <Button
                      key={tier}
                      variant={selectedAgent.tier === tier ? 'default' : 'outline'}
                      size="sm"
                      className={selectedAgent.tier === tier ? getTierColor(tier) : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                      onClick={() => handleUpdateTier(tier)}
                      disabled={updating || selectedAgent.tier === tier}
                    >
                      {tier.slice(0, 1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Commission rates: Bronze 5%, Silver 7%, Gold 10%, Platinum 12%
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAgent(null)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
