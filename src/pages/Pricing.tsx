
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'Pay As-You-Go',
      description: 'Perfect for getting started with transaction-based billing.',
      price: '$0.99',
      priceSubtext: 'per transaction',
      features: [
        'Pay only for what you use',
        'No monthly commitment',
        'Basic AI data extraction',
        'Standard support'
      ],
      usageLimits: [
        { label: 'Transactions', value: '20' },
        { label: 'AI Processing', value: '5' },
        { label: 'After limit', value: '$0.05/transaction' }
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'Credit Burndown',
      description: 'Buy credits in advance for better rates and flexibility.',
      price: '$49',
      priceSubtext: 'prepaid credits',
      popular: true,
      features: [
        '1,200 transaction credits',
        '15% discount on bulk purchases',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics'
      ],
      usageLimits: [
        { label: 'Transactions', value: '1,200' },
        { label: 'AI Processing', value: '300' },
        { label: 'After limit', value: '$0.04/transaction' }
      ]
    },
    {
      id: 'business',
      name: 'Business',
      subtitle: 'Flat Fee',
      description: 'Unlimited transactions with predictable monthly costs.',
      price: '$99',
      priceSubtext: 'per month',
      features: [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Per Seat',
      description: 'Scale with your team size and organizational needs.',
      price: '$25',
      priceSubtext: 'per user/month',
      features: [
        'Unlimited everything',
        'Multi-user management',
        'Advanced security',
        'SLA guarantee',
        'Custom development'
      ]
    },
    {
      id: 'trial',
      name: 'Free Trial',
      subtitle: 'Trial',
      description: 'Try all features risk-free before committing.',
      price: '$0',
      priceSubtext: '14 days free',
      badge: 'Free Trial',
      features: [
        'Full access to all features',
        '500 transaction limit',
        'Basic AI processing',
        'Email support'
      ],
      usageLimits: [
        { label: 'Transactions', value: '500' },
        { label: 'AI Processing', value: '50' },
        { label: 'After limit', value: '$0.05/transaction' }
      ]
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to a plan.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For starter and professional plans, use one-time payment mode
      const isOneTimePayment = planId === 'starter' || planId === 'professional';
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier_id: planId,
          user_email: user.email,
          mode: isOneTimePayment ? 'payment' : 'subscription'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Navigate in the same tab instead of opening a new one
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-purple-200 text-lg">Select the perfect pricing model for your business needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative bg-gray-800 border-gray-700 ${
                plan.popular ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 right-4">
                  <Badge className={`${
                    plan.badge === 'Free Trial' ? 'bg-green-600' : 'bg-blue-600'
                  } text-white`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mb-3">
                  <CardTitle className="text-xl font-semibold text-white mb-1">
                    {plan.name}
                  </CardTitle>
                  <div className="text-sm text-purple-300">{plan.subtitle}</div>
                </div>
                
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white mb-1">{plan.price}</div>
                  <div className="text-gray-400 text-sm">{plan.priceSubtext}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {plan.usageLimits && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                      Usage Limits
                    </h4>
                    <div className="space-y-2">
                      {plan.usageLimits.map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-400">{limit.label}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Select Plan
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
