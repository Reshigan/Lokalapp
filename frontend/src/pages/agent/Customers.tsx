import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, IconBadge } from '@/components/Stat';
import api from '@/services/api';
import { Search, User, Loader2, UserPlus, ChevronRight } from 'lucide-react';

interface Customer {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  kyc_status: string;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!phone && !name) return;
    setLoading(true);
    setSearched(true);
    const r = await api.searchCustomers(phone || undefined, name || undefined);
    if (r.data) setCustomers(r.data);
    setLoading(false);
  };

  const kycVariant = (s: string) =>
    s === 'VERIFIED' ? 'success' : s === 'PENDING' ? 'warning' : 'secondary';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Search the customers you've registered, or add a new one."
        back="/agent"
        actions={
          <Button onClick={() => navigate('/agent/customers/new')}>
            <UserPlus className="w-4 h-4" /> New
          </Button>
        }
      />

      <Card>
        <CardContent className="p-3 grid md:grid-cols-3 gap-2">
          <Input placeholder="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <Button onClick={search} disabled={loading || (!phone && !name)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {!searched ? (
        <EmptyState icon={Search} title="Find a customer" description="Type a phone number or name above to search." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={User}
          title="No customer found"
          description="Try a different search, or register them as a new customer."
          action={<Button onClick={() => navigate('/agent/customers/new')}><UserPlus className="w-4 h-4" /> Register customer</Button>}
        />
      ) : (
        <div className="grid gap-2">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/agent/customers/${c.id}`)}
              className="card text-left p-4 flex items-center gap-3 hover:shadow-pop hover:border-accent-200 transition-all"
            >
              <IconBadge icon={User} tone="brand" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.phone_number}
                  </p>
                  <Badge variant={kycVariant(c.kyc_status) as any}>{c.kyc_status}</Badge>
                </div>
                <p className="text-xs text-ink-muted">{c.phone_number}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
