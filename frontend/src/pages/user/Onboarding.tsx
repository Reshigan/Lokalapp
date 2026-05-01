import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { IconBadge } from '@/components/Stat';
import { Wallet, Wifi, Zap, Receipt, Gift, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: Wallet,  title: 'Welcome to Lokal',     desc: 'Your community wallet for prepaid services and postpaid electricity billing.' },
  { icon: Receipt, title: 'Postpaid bills',       desc: 'See electricity invoices, pay an agent in cash, and confirm with a 6-digit code.' },
  { icon: Wifi,    title: 'WiFi & prepaid power', desc: 'Top up data and electricity in seconds. Vouchers stored in your account.' },
  { icon: Zap,     title: 'Push notifications',   desc: 'Get notified when an invoice is issued, a payment confirms, or anything that needs you.' },
  { icon: Gift,    title: 'Earn rewards',         desc: 'Every R10 spent earns you a loyalty point. Climb from Bronze to Platinum.' },
];

export default function UserOnboarding() {
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
            <IconBadge icon={Icon} tone="brand" size="lg" className="mx-auto" />
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
                <Button variant="ghost" onClick={() => navigate('/user')} className="flex-1">
                  Skip
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => (last ? navigate('/user') : setStep(step + 1))}
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
