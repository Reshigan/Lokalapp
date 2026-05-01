import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { IconBadge } from '@/components/Stat';
import { Store, Wallet, Wifi, Zap, Users, Coins, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: Store,  title: 'Welcome, Agent',     desc: 'You are now part of the Lokal network. Earn commissions on every sale you make.' },
  { icon: Wallet, title: 'Manage your float',  desc: 'Float is the working capital you spend on customer sales. Top up via card or EFT.' },
  { icon: Wifi,   title: 'Sell WiFi & power',  desc: 'Pick a customer, choose a package, take the cash, hand over the voucher.' },
  { icon: Zap,    title: 'Bill households',    desc: 'For postpaid electricity: capture meter reading, generate invoice, collect cash, settle at the office.' },
  { icon: Users,  title: 'Track your customers', desc: 'See history, contact details, and total spend per customer.' },
  { icon: Coins,  title: 'Get paid',           desc: 'Commissions accrue with every sale. Withdraw to your wallet whenever you like.' },
];

export default function AgentOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const Icon = STEPS[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo size={36} showWordmark />
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <IconBadge icon={Icon} tone="accent" size="lg" className="mx-auto" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{STEPS[step].title}</h2>
              <p className="text-sm text-ink-muted mt-2">{STEPS[step].desc}</p>
            </div>

            <div className="flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-8 bg-brand-700' : 'w-1.5 bg-surface-border',
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => navigate('/agent')} className="flex-1">
                  Skip
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => (last ? navigate('/agent') : setStep(step + 1))}
              >
                {last ? 'Get started' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
