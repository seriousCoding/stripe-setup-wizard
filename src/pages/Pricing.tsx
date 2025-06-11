
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PricingCard from '@/components/PricingCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const pricingTiers = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for getting started with transaction-based billing.',
      price: 0.05,
      currency: 'USD',
      badge: 'Pay As-You-Go',
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
      badge: 'Most Popular',
      popular: true,
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
      interval: 'month' as const,
      badge: 'Flat Fee',
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
      interval: 'month' as const,
      badge: 'Per Seat',
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

  const handleSelectPlan = async (tierId: string) => {
    // Check if Stripe API key is configured
    const apiKey = localStorage.getItem('stripe_api_key');
    if (!apiKey) {
      toast({
        title: "Stripe Not Connected",
        description: "Please configure your Stripe API key in the Billing section first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
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
        setIsLoading(false);
        return;
      }

      // For pay-as-you-go (Starter), create a customer but no immediate payment
      if (tierId === 'starter') {
        toast({
          title: "Pay-As-You-Go Plan Activated!",
          description: "You'll only be charged for what you use.",
        });
        setIsLoading(false);
        return;
      }

      // For paid plans, create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price * 100, // Convert to cents
          currency: selectedTier.currency.toLowerCase(),
          interval: selectedTier.interval || null
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout in new tab
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Choose from flexible pricing options designed to scale with your business needs.
            From pay-as-you-go to enterprise solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {pricingTiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              onSelectPlan={handleSelectPlan}
              isLoading={isLoading}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-4">Need a Custom Solution?</h3>
          <p className="text-gray-400 mb-6">
            Have specific requirements or need volume pricing? We'd love to work with you.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Contact Sales
            </button>
            <button className="border border-gray-600 text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
