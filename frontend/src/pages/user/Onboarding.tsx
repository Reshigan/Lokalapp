import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wallet, 
  Wifi, 
  Zap, 
  Share2, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Gift
} from 'lucide-react';

const onboardingSteps = [
  {
    icon: Wallet,
    title: 'Welcome to Lokal',
    description: 'Your digital wallet for local services. Top up your wallet and pay for WiFi and electricity with ease.',
    color: 'bg-[#1e3a5f]',
    iconColor: 'text-white'
  },
  {
    icon: Wifi,
    title: 'Buy WiFi Vouchers',
    description: 'Purchase WiFi data packages instantly. Choose from daily, weekly, or monthly plans that suit your needs.',
    color: 'bg-[#4da6e8]',
    iconColor: 'text-white'
  },
  {
    icon: Zap,
    title: 'Prepaid Electricity',
    description: 'Buy prepaid electricity tokens for your meter. Enter your meter number and get your token instantly.',
    color: 'bg-amber-500',
    iconColor: 'text-white'
  },
  {
    icon: Share2,
    title: 'Share with Friends',
    description: 'Share your WiFi voucher codes with family and friends using WhatsApp, SMS, or any app on your phone.',
    color: 'bg-emerald-500',
    iconColor: 'text-white'
  },
  {
    icon: Gift,
    title: 'Earn Loyalty Points',
    description: 'Every purchase earns you loyalty points. Climb tiers from Bronze to Platinum and unlock exclusive rewards!',
    color: 'bg-purple-500',
    iconColor: 'text-white'
  }
];

export default function UserOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('user_onboarding_complete', 'true');
      navigate('/user');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('user_onboarding_complete', 'true');
    navigate('/user');
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
                    Get Started
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
