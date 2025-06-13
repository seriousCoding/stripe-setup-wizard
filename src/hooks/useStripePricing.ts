import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StripePricingTier {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number; // Price in dollars (not cents)
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
  includedUsage?: number;
  usageUnit?: string;
  tierStructure?: 'graduated' | 'volume' | 'flat';
}

interface UseStripePricingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  useAllProducts?: boolean;
}

export const useStripePricing = (options: UseStripePricingOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000, useAllProducts = false } = options;
  const [pricingTiers, setPricingTiers] = useState<StripePricingTier[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchPricingData = async (isAutoRefresh = false) => {
    // Prevent too frequent requests
    const now = Date.now();
    if (now - lastFetchRef.current < 5000 && isAutoRefresh) {
      console.log('Skipping fetch due to rate limiting');
      return;
    }
    lastFetchRef.current = now;

    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('Fetching Stripe pricing data...');
      
      const { data, error } = await supabase.functions.invoke('fetch-stripe-data');

      if (error) {
        console.error('Error fetching Stripe data:', error);
        throw new Error(error.message || 'Failed to fetch pricing data');
      }

      console.log('Fetch response:', data);

      if (data?.success) {
        setAllProducts(data.all_products || []);
        
        const productsToUse = useAllProducts ? data.all_products : data.app_products;
        
        if (productsToUse && productsToUse.length > 0) {
          const tiers = mapStripeProductsToTiers(productsToUse);
          setPricingTiers(tiers);
          console.log(`Loaded ${useAllProducts ? 'all' : 'app'} products:`, productsToUse.length);
        } else {
          console.log(`No ${useAllProducts ? '' : 'app '}products found, using fallback`);
          // Use fallback pricing tiers if no products found
          const fallbackTiers = getDefaultPricingTiers();
          setPricingTiers(fallbackTiers);
        }
      } else {
        console.log('No products found or fetch unsuccessful, using fallback');
        const fallbackTiers = getDefaultPricingTiers();
        setPricingTiers(fallbackTiers);
      }
    } catch (err: any) {
      console.error('Error fetching pricing data:', err);
      setError(err.message);
      // Use fallback pricing tiers on error
      const fallbackTiers = getDefaultPricingTiers();
      setPricingTiers(fallbackTiers);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPricingData();

    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchPricingData(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, useAllProducts]);

  const refetch = () => {
    console.log('Manual refetch triggered');
    fetchPricingData();
  };

  return {
    pricingTiers,
    allProducts,
    isLoading,
    error,
    isRefreshing,
    refetch
  };
};

const mapStripeProductsToTiers = (products: any[]): StripePricingTier[] => {
  const tiers: StripePricingTier[] = [];

  products.forEach((product) => {
    const defaultPrice = product.default_price;
    if (!defaultPrice) return;

    // Convert from cents to dollars
    const priceAmount = defaultPrice.unit_amount ? defaultPrice.unit_amount / 100 : 0;
    const isRecurring = defaultPrice.recurring?.interval === 'month';
    const metadata = product.metadata || {};
    
    const tierId = metadata.tier_id || 'custom';

    const usageLimits = [];
    
    if (metadata.usage_limit_transactions) {
      const transactionLimit = metadata.usage_limit_transactions;
      usageLimits.push({ 
        name: 'Transactions', 
        value: transactionLimit === 'unlimited' ? 'Unlimited' : parseInt(transactionLimit).toLocaleString() 
      });
    }
    
    if (metadata.usage_limit_ai_processing) {
      const aiLimit = metadata.usage_limit_ai_processing;
      usageLimits.push({ 
        name: 'AI Processing', 
        value: aiLimit === 'unlimited' ? 'Unlimited' : parseInt(aiLimit).toLocaleString() 
      });
    }

    if (metadata.overage_rate) {
      usageLimits.push({
        name: 'After limit',
        value: `$${metadata.overage_rate}/transaction`
      });
    }

    const features = getFeaturesFromTierId(tierId);

    const tier: StripePricingTier = {
      id: tierId,
      name: product.name || 'Custom Plan',
      subtitle: metadata.subtitle || getSubtitleFromBillingType(metadata.billing_model_type, isRecurring),
      description: product.description || getDescriptionFromTierId(tierId),
      price: priceAmount, // Now in dollars, not cents
      currency: defaultPrice.currency?.toUpperCase() || 'USD',
      icon: getIconForTier(tierId),
      features: features,
      usageLimits: usageLimits.length > 0 ? usageLimits : undefined,
      buttonText: getButtonTextFromTier(tierId),
      popular: metadata.popular === 'true' || tierId === 'professional',
      badge: metadata.badge || getBadgeFromTier(tierId, metadata),
      isMonthly: isRecurring,
      meterRate: parseFloat(metadata.meter_rate || '0'),
      packageCredits: parseInt(metadata.package_credits || '0'),
      includedUsage: metadata.usage_limit_transactions === 'unlimited' ? 999999 : parseInt(metadata.usage_limit_transactions || '0'),
      usageUnit: 'transactions',
      tierStructure: 'flat'
    };

    tiers.push(tier);
  });

  return tiers.sort((a, b) => {
    if (a.id === 'trial') return -1;
    if (b.id === 'trial') return 1;
    return a.price - b.price;
  });
};

const getFeaturesFromTierId = (tierId: string): string[] => {
  switch (tierId) {
    case 'trial':
      return [
        'Full access to all features',
        '500 transaction limit',
        'Basic AI processing',
        'Email support'
      ];
    case 'starter':
      return [
        'Monthly subscription billing',
        '1,000 transactions included',
        'Overage billing at $0.02/transaction',
        'Basic AI data extraction',
        'Standard support'
      ];
    case 'professional':
      return [
        'Monthly subscription billing',
        '5,000 transactions included',
        'Overage billing at $0.015/transaction',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics'
      ];
    case 'business':
      return [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations'
      ];
    case 'enterprise':
      return [
        'Unlimited everything per user',
        'Multi-user management',
        'Advanced security features',
        'SLA guarantee',
        'Custom development'
      ];
    default:
      return ['Custom features'];
  }
};

const getDescriptionFromTierId = (tierId: string): string => {
  switch (tierId) {
    case 'trial':
      return 'Try all features risk-free with included transactions.';
    case 'starter':
      return 'Perfect for small teams with included transactions and overage billing.';
    case 'professional':
      return 'Great for growing businesses with more included transactions.';
    case 'business':
      return 'Unlimited usage with predictable monthly costs.';
    case 'enterprise':
      return 'Scale with your organization with per-user pricing.';
    default:
      return 'Custom pricing plan tailored to your needs.';
  }
};

const getButtonTextFromTier = (tierId: string): string => {
  switch (tierId) {
    case 'trial': return 'Start Free Trial';
    case 'starter': return 'Subscribe Now';
    case 'professional': return 'Subscribe Now';
    case 'business': return 'Subscribe Now';
    case 'enterprise': return 'Subscribe Now';
    default: return 'Select Plan';
  }
};

const getSubtitleFromBillingType = (billingType: string, isRecurring: boolean): string => {
  switch (billingType) {
    case 'free_trial': return 'Trial';
    case 'pay_as_you_go': return 'Pay As-You-Go';
    case 'credit_burndown': return 'Credit Burndown';
    case 'fixed_fee_graduated': return 'Fixed Fee + Overage';
    case 'flat_recurring': return 'Flat Fee';
    case 'per_seat': return 'Per Seat';
    default: return isRecurring ? 'Fixed Fee + Overage' : 'Pay-as-you-go';
  }
};

const getBadgeFromTier = (tierId: string, metadata: any): string | undefined => {
  if (tierId === 'trial') return 'Free Trial';
  if (tierId === 'professional') return 'Most Popular';
  if (metadata.badge) return metadata.badge;
  return undefined;
};

const getIconForTier = (tierId: string): string => {
  const iconMap: { [key: string]: string } = {
    trial: '🎁',
    starter: '📄',
    professional: '💼',
    business: '⚡',
    enterprise: '👥'
  };
  return iconMap[tierId] || '📦';
};

const getDefaultPricingTiers = (): StripePricingTier[] => {
  return [
    {
      id: 'trial',
      name: 'Free Trial',
      subtitle: 'Trial',
      description: 'Try all features risk-free with included transactions monthly.',
      price: 0,
      currency: 'USD',
      icon: '🎁',
      features: [
        'Full access to all features',
        '500 transactions included monthly',
        'Basic AI processing',
        'Email support',
        '14-day free trial'
      ],
      usageLimits: [
        { name: 'Base Fee', value: 'Free' },
        { name: 'Included Usage', value: '500 transactions' },
        { name: 'Overage Rate', value: '$0.05/transaction' }
      ],
      buttonText: 'Start Free Trial',
      badge: 'Free Trial',
      isMonthly: true
    },
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'Fixed Fee + Overage',
      description: 'Perfect for small teams with 1,000 included transactions monthly.',
      price: 19,
      currency: 'USD',
      icon: '📄',
      features: [
        'Monthly subscription billing',
        '1,000 transactions included',
        'Overage billing at $0.02/transaction',
        'Basic AI data extraction',
        'Standard support'
      ],
      usageLimits: [
        { name: 'Base Fee', value: '$19/month' },
        { name: 'Included Usage', value: '1,000 transactions' },
        { name: 'Overage Rate', value: '$0.02/transaction' }
      ],
      buttonText: 'Subscribe Now',
      isMonthly: true
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'Fixed Fee + Overage',
      description: 'Great for growing businesses with 5,000 included transactions monthly.',
      price: 49,
      currency: 'USD',
      icon: '💼',
      features: [
        'Monthly subscription billing',
        '5,000 transactions included',
        'Overage billing at $0.015/transaction',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics'
      ],
      usageLimits: [
        { name: 'Base Fee', value: '$49/month' },
        { name: 'Included Usage', value: '5,000 transactions' },
        { name: 'Overage Rate', value: '$0.015/transaction' }
      ],
      buttonText: 'Subscribe Now',
      popular: true,
      badge: 'Most Popular',
      isMonthly: true
    },
    {
      id: 'business',
      name: 'Business',
      subtitle: 'Flat Rate',
      description: 'Unlimited usage with predictable monthly costs for growing teams.',
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
      usageLimits: [
        { name: 'Monthly Fee', value: '$99 flat rate' },
        { name: 'Transactions', value: 'Unlimited' },
        { name: 'AI Processing', value: 'Unlimited' }
      ],
      buttonText: 'Subscribe Now',
      isMonthly: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Per Seat',
      description: 'Scale with your organization with per-user pricing and enterprise features.',
      price: 25,
      currency: 'USD',
      icon: '👥',
      features: [
        'Unlimited everything per user',
        'Multi-user management',
        'Advanced security features',
        'SLA guarantee',
        'Custom development'
      ],
      usageLimits: [
        { name: 'Per User', value: '$25/month' },
        { name: 'Transactions', value: 'Unlimited' },
        { name: 'AI Processing', value: 'Unlimited' }
      ],
      buttonText: 'Subscribe Now',
      isMonthly: true
    }
  ];
};

export default useStripePricing;
