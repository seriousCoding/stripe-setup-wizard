
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StripePricingTier {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  currency: string;
  icon: string;
  features: string[];
  usageLimits?: { name: string; value: string }[];
  buttonText: string;
  popular?: boolean;
  badge?: string;
  isMonthly?: boolean;
  meterRate?: number;
  packageCredits?: number;
}

export const useStripePricing = () => {
  const [pricingTiers, setPricingTiers] = useState<StripePricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('fetch-stripe-data');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.products) {
        const tiers = mapStripeProductsToTiers(data.products);
        setPricingTiers(tiers);
      }
    } catch (err: any) {
      console.error('Error fetching pricing data:', err);
      setError(err.message);
      // Fallback to default pricing if Stripe fetch fails
      setPricingTiers(getDefaultPricingTiers());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  return {
    pricingTiers,
    isLoading,
    error,
    refetch: fetchPricingData
  };
};

const mapStripeProductsToTiers = (products: any[]): StripePricingTier[] => {
  const tiers: StripePricingTier[] = [];

  // Add default tiers that might not be in Stripe yet
  tiers.push(
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
  );

  // Map Stripe products to tiers
  products.forEach((product) => {
    const defaultPrice = product.default_price;
    if (!defaultPrice) return;

    const tierId = product.metadata?.tier_id;
    if (!tierId) return;

    const priceAmount = defaultPrice.unit_amount ? defaultPrice.unit_amount / 100 : 0;
    const isRecurring = defaultPrice.recurring?.interval === 'month';

    let tier: StripePricingTier;

    switch (tierId) {
      case 'professional':
        tier = {
          id: 'professional',
          name: 'Professional',
          subtitle: 'Credit Burndown',
          description: 'Buy credits in advance for better rates and flexibility.',
          price: priceAmount,
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
        };
        break;

      case 'business':
        tier = {
          id: 'business',
          name: 'Business',
          subtitle: 'Flat Fee',
          description: 'Unlimited transactions with predictable monthly costs.',
          price: priceAmount,
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
          isMonthly: isRecurring
        };
        break;

      case 'enterprise':
        tier = {
          id: 'enterprise',
          name: 'Enterprise',
          subtitle: 'Per Seat',
          description: 'Scale with your team size and organizational needs.',
          price: priceAmount,
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
          isMonthly: isRecurring
        };
        break;

      default:
        return;
    }

    // Replace existing tier if found, otherwise add new one
    const existingIndex = tiers.findIndex(t => t.id === tier.id);
    if (existingIndex >= 0) {
      tiers[existingIndex] = tier;
    } else {
      tiers.push(tier);
    }
  });

  return tiers;
};

const getDefaultPricingTiers = (): StripePricingTier[] => {
  return [
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
};
