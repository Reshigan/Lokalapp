import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Store, 
  Wifi, 
  Zap, 
  Users, 
  Wallet,
  TrendingUp,
  ArrowRight, 
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

const onboardingSteps = [
  {
    icon: Store,
    title: 'Welcome, Agent!',
    description: 'You are now part of the Lokal network. Sell WiFi and electricity to your customers and earn commissions on every sale.',
    color: 'bg-[#1e3a5f]',
    iconColor: 'text-white'
  },
  {
    icon: Wallet,
    title: 'Manage Your Float',
    description: 'Your float balance is used to process sales. Top up your float via bank transfer or mobile money to keep selling.',
    color: 'bg-[#4da6e8]',
    iconColor: 'text-white'
  },
  {
    icon: Wifi,
    title: 'Sell WiFi Vouchers',
    description: 'Select a customer, choose a WiFi package, and complete the sale. The voucher code is generated instantly for your customer.',
    color: 'bg-cyan-500',
    iconColor: 'text-white'
  },
  {
    icon: Zap,
    title: 'Sell Electricity',
    description: 'Enter the customer\'s meter number, select a package, and process the sale. Electricity tokens are delivered instantly.',
    color: 'bg-amber-500',
    iconColor: 'text-white'
  },
  {
    icon: Users,
    title: 'Register Customers',
    description: 'Register new customers to build your network. You earn referral bonuses when your customers make purchases.',
    color: 'bg-purple-500',
    iconColor: 'text-white'
  },
  {
    icon: TrendingUp,
    title: 'Earn Commissions',
    description: 'Track your sales and commissions in real-time. Climb tiers from Bronze (5%) to Platinum (12%) for higher earnings!',
    color: 'bg-emerald-500',
    iconColor: 'text-white'
  }
];

export default function AgentOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('agent_onboarding_complete', 'true');
      navigate('/agent');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('agent_onboarding_complete', 'true');
    navigate('/agent');
  };

  const step = onboardingSteps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] flex flex-col">
      {/* Skip button */}
      <div className="p-4 flex justify-end">
        <Button 
          variant="ghost" 
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleSkip}
        >
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Icon */}
        <div className={`w-24 h-24 ${step.color} rounded-3xl flex items-center justify-center mb-8 shadow-2xl`}>
          <StepIcon className={`w-12 h-12 ${step.iconColor}`} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          {step.title}
        </h1>

        {/* Description */}
        <p className="text-white/80 text-center text-lg max-w-sm mb-8">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'w-8 bg-white' 
                  : index < currentStep 
                    ? 'bg-white/80' 
                    : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <Card className="w-full max-w-sm bg-white/10 backdrop-blur border-0">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  onClick={handlePrevious}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                className={`flex-1 ${isLastStep ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white text-[#1e3a5f] hover:bg-gray-100'}`}
                onClick={handleNext}
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Start Selling
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
