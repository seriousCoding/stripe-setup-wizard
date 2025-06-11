
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const pricingTiers = [
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'Pay As-You-Go',
      description: 'Perfect for getting started with transaction-based billing.',
      price: 0.05,
      currency: 'USD',
      icon: '📄',
      features: [
        'Pay only for what you use',
        'No monthly commitment',
        'Basic AI data extraction',
        'Standard support'
      ],
      usageLimits: [
        { name: 'Transactions', value: '1,000' },
        { name: 'AI Processing', value: '100' }
      ],
      buttonText: 'Select Plan',
      meterRate: 0.05
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'Credit Burndown',
      description: 'Buy credits in advance for better rates and flexibility.',
      price: 49,
      currency: 'USD',
      popular: true,
      icon: '💼',
      features: [
        '1,200 transaction credits',
        '15% discount on bulk purchases',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics'
      ],
      usageLimits: [
        { name: 'Transactions', value: '1,200' },
        { name: 'AI Processing', value: '300' }
      ],
      buttonText: 'Select Plan',
      meterRate: 0.04,
      packageCredits: 1200
    },
    {
      id: 'business',
      name: 'Business',
      subtitle: 'Flat Fee',
      description: 'Unlimited transactions with predictable monthly costs.',
      price: 99,
      currency: 'USD',
      icon: '⚡',
      features: [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations'
      ],
      buttonText: 'Select Plan',
      isMonthly: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Per Seat',
      description: 'Scale with your team size and organizational needs.',
      price: 25,
      currency: 'USD',
      icon: '👥',
      features: [
        'Unlimited everything',
        'Multi-user management',
        'Advanced security',
        'SLA guarantee',
        'Custom development'
      ],
      buttonText: 'Select Plan',
      isMonthly: true
    },
    {
      id: 'trial',
      name: 'Free Trial',
      subtitle: 'Trial',
      description: 'Try all features risk-free before committing.',
      price: 0,
      currency: 'USD',
      badge: 'Free Trial',
      icon: '🎁',
      features: [
        'Full access to all features',
        '500 transaction limit',
        'Basic AI processing',
        'Email support'
      ],
      usageLimits: [
        { name: 'Transactions', value: '500' },
        { name: 'AI Processing', value: '50' }
      ],
      buttonText: 'Select Plan',
      packageCredits: 500,
      meterRate: 0.05
    }
  ];

  const createStripeProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-products', {
        body: { products: pricingTiers }
      });

      if (error) {
        console.error('Error creating products:', error);
        return;
      }

      console.log('Products created successfully:', data);
    } catch (error) {
      console.error('Error creating Stripe products:', error);
    }
  };

  useEffect(() => {
    createStripeProducts();
  }, []);

  const handleSelectPlan = async (tierId: string) => {
    setIsLoading(true);
    setSelectedPlan(tierId);
    
    try {
      const selectedTier = pricingTiers.find(tier => tier.id === tierId);
      if (!selectedTier) {
        throw new Error('Invalid plan selected');
      }

      if (tierId === 'trial') {
        toast({
          title: "Free Trial Activated!",
          description: `You now have ${selectedTier.packageCredits} transaction credits. After the limit, meter rate of $${selectedTier.meterRate} per transaction applies.`,
        });
        return;
      }

      if (tierId === 'starter') {
        toast({
          title: "Pay-As-You-Go Plan Activated!",
          description: `Rate: $${selectedTier.price} per transaction. No package limits.`,
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price * 100,
          currency: selectedTier.currency.toLowerCase(),
          mode: selectedTier.isMonthly ? 'subscription' : 'payment',
          packageCredits: selectedTier.packageCredits,
          meterRate: selectedTier.meterRate
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }

      if (selectedTier.packageCredits) {
        toast({
          title: `${selectedTier.name} Plan Selected!`,
          description: `Package includes ${selectedTier.packageCredits} credits. After limit, meter rate of $${selectedTier.meterRate} per transaction applies with auto-renewal.`,
        });
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process plan selection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (tier: any) => {
    if (tier.price === 0) return '$0';
    return `$${tier.price}`;
  };

  const getPriceSubtext = (tier: any) => {
    if (tier.price === 0 && tier.id === 'trial') return '14 days free';
    if (tier.id === 'starter') return 'per transaction';
    if (tier.id === 'professional') return 'prepaid credits';
    if (tier.isMonthly) return tier.id === 'enterprise' ? 'per user/month' : 'per month';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-blue-purple py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-purple-500">Choose Your Plan</h1>
          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative bg-slate-800/90 backdrop-blur-sm border-slate-700 text-white h-full flex flex-col ${
                tier.popular 
                  ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'border border-slate-700/50'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white border-blue-600">
                    Most Popular
                  </Badge>
                </div>
              )}

              {tier.badge && tier.id === 'trial' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-600 text-white border-green-600">
                    {tier.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-start space-x-3 mb-3">
                  <div className="text-xl">{tier.icon}</div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-sm text-slate-400">{tier.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-slate-300 text-sm mb-6 min-h-[48px] text-left leading-relaxed">
                  {tier.description}
                </p>
                
                <div className="mb-6 text-left">
                  <div className="text-4xl font-bold text-blue-400 mb-1">
                    {formatPrice(tier)}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {getPriceSubtext(tier)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-4 px-6">
                <div className="space-y-3 flex-1">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-200 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {tier.usageLimits && (
                  <div className="bg-slate-700/40 rounded-lg p-4 mt-4">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                      Usage Limits
                    </h4>
                    <div className="space-y-2">
                      {tier.usageLimits.map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-slate-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                    {tier.meterRate && (
                      <div className="mt-3 pt-2 border-t border-slate-600">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">After limit</span>
                          <span className="text-white">${tier.meterRate}/transaction</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isLoading && selectedPlan === tier.id}
                >
                  {isLoading && selectedPlan === tier.id ? 'Processing...' : tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300 text-sm max-w-4xl mx-auto leading-relaxed">
            All packages auto-renew unless you opt out. After package limits are reached, meter rates apply automatically. 
            No service interruption - we'll continue processing your transactions at the meter rate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
