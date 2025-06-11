
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
      description: 'Perfect for getting started with transaction-based billing.',
      price: 0.05,
      currency: 'USD',
      badge: 'Pay As-You-Go',
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
      buttonText: 'Select Plan'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Buy credits in advance for better rates and flexibility.',
      price: 49,
      currency: 'USD',
      badge: 'Credit Burndown',
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
      buttonText: 'Select Plan'
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Unlimited transactions with predictable monthly costs.',
      price: 99,
      currency: 'USD',
      badge: 'Flat Fee',
      icon: '⚡',
      features: [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations'
      ],
      buttonText: 'Select Plan'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Scale with your team size and organizational needs.',
      price: 25,
      currency: 'USD',
      badge: 'Per Seat',
      icon: '👥',
      features: [
        'Unlimited everything',
        'Multi-user management',
        'Advanced security',
        'SLA guarantee',
        'Custom development'
      ],
      buttonText: 'Select Plan'
    },
    {
      id: 'trial',
      name: 'Free Trial',
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
      buttonText: 'Select Plan'
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
    // Create products in Stripe when component mounts
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

      // For free trial, just show success
      if (tierId === 'trial') {
        toast({
          title: "Free Trial Activated!",
          description: "You now have access to all features for 14 days.",
        });
        return;
      }

      // For pay-as-you-go (Starter), create a customer but no immediate payment
      if (tierId === 'starter') {
        toast({
          title: "Pay-As-You-Go Plan Activated!",
          description: "You'll only be charged for what you use.",
        });
        return;
      }

      // For paid plans, create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price * 100,
          currency: selectedTier.currency.toLowerCase(),
          mode: tierId === 'business' || tierId === 'enterprise' ? 'subscription' : 'payment'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
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
    if (tier.price === 0) return '14 days free';
    if (tier.id === 'starter') return 'per transaction';
    if (tier.id === 'professional') return 'prepaid credits';
    if (tier.id === 'business') return 'per month';
    if (tier.id === 'enterprise') return 'per user/month';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative bg-gray-800 border-gray-700 text-white h-full flex flex-col ${
                tier.popular ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`${
                    tier.popular 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : tier.id === 'trial'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-gray-600 text-gray-200 border-gray-600'
                  }`}>
                    {tier.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="text-2xl">{tier.icon}</div>
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                </div>
                
                <p className="text-gray-400 text-sm mb-6 min-h-[40px]">
                  {tier.description}
                </p>
                
                <div className="mb-4">
                  <div className="text-4xl font-bold text-blue-400 mb-1">
                    {formatPrice(tier)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {getPriceSubtext(tier)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-6">
                <div className="space-y-3 flex-1">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {tier.usageLimits && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                      Usage Limits
                    </h4>
                    <div className="space-y-2">
                      {tier.usageLimits.map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isLoading && selectedPlan === tier.id}
                >
                  {isLoading && selectedPlan === tier.id ? 'Processing...' : tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
