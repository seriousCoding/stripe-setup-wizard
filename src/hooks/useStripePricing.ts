
import { useState, useEffect, useRef } from 'react';
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

interface UseStripePricingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export const useStripePricing = (options: UseStripePricingOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const [pricingTiers, setPricingTiers] = useState<StripePricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPricingData = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const { data, error } = await supabase.functions.invoke('fetch-stripe-data');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.products) {
        const tiers = mapStripeProductsToTiers(data.products);
        setPricingTiers(tiers);
      } else {
        // Fallback to default pricing if no products returned
        setPricingTiers(getDefaultPricingTiers());
      }
    } catch (err: any) {
      console.error('Error fetching pricing data:', err);
      setError(err.message);
      // Fallback to default pricing if Stripe fetch fails
      setPricingTiers(getDefaultPricingTiers());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPricingData();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchPricingData(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const refetch = () => fetchPricingData();

  return {
    pricingTiers,
    isLoading,
    error,
    isRefreshing,
    refetch
  };
};

const mapStripeProductsToTiers = (products: any[]): StripePricingTier[] => {
  // Start with all default tiers
  const defaultTiers = getDefaultPricingTiers();
  const tiers: StripePricingTier[] = [...defaultTiers];

  // Override with Stripe products where available
  products.forEach((product) => {
    const defaultPrice = product.default_price;
    if (!defaultPrice) return;

    const tierId = product.metadata?.tier_id;
    if (!tierId) return;

    const priceAmount = defaultPrice.unit_amount ? defaultPrice.unit_amount / 100 : 0;
    const isRecurring = defaultPrice.recurring?.interval === 'month';

    let tierUpdate: Partial<StripePricingTier> = {};

    switch (tierId) {
      case 'professional':
        tierUpdate = {
          price: priceAmount,
          meterRate: 0.04,
          packageCredits: 1200
        };
        break;

      case 'business':
        tierUpdate = {
          price: priceAmount,
          isMonthly: isRecurring
        };
        break;

      case 'enterprise':
        tierUpdate = {
          price: priceAmount,
          isMonthly: isRecurring
        };
        break;

      default:
        return;
    }

    // Find and update the corresponding tier
    const existingIndex = tiers.findIndex(t => t.id === tierId);
    if (existingIndex >= 0) {
      tiers[existingIndex] = { ...tiers[existingIndex], ...tierUpdate };
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
      price: 0.99,
      currency: 'USD',
      icon: '📄',
      features: [
        'Pay only for what you use',
        'No monthly commitment',
        'Basic AI data extraction',
        'Standard support'
      ],
      usageLimits: [
        { name: 'Transactions', value: '20' },
        { name: 'AI Processing', value: '5' }
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
