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

      if (data?.success) {
        setAllProducts(data.all_products || []);
        
        const productsToUse = useAllProducts ? data.all_products : data.app_products;
        
        if (productsToUse && productsToUse.length > 0) {
          const tiers = mapStripeProductsToTiers(productsToUse);
          setPricingTiers(tiers);
          console.log(`Loaded ${useAllProducts ? 'all' : 'app'} products:`, productsToUse.length);
        } else {
          // Return enhanced default tiers if no products found
          console.log(`No ${useAllProducts ? '' : 'app '}products found, using enhanced defaults`);
          setPricingTiers(getEnhancedDefaultPricingTiers());
        }
      } else {
        console.log('No products found, using enhanced defaults');
        setPricingTiers(getEnhancedDefaultPricingTiers());
      }
    } catch (err: any) {
      console.error('Error fetching pricing data:', err);
      setError(err.message);
      setPricingTiers(getEnhancedDefaultPricingTiers());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPricingData();

    // Only set up interval if autoRefresh is explicitly enabled
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

  const refetch = () => fetchPricingData();

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

    // Add meter rate information
    if (metadata.meter_rate_after_limit) {
      usageLimits.push({
        name: 'After limit',
        value: `$${metadata.meter_rate_after_limit}/transaction`
      });
    }

    const features = getFeaturesFromTierId(tierId);

    const tier: StripePricingTier = {
      id: tierId,
      name: product.name || 'Custom Plan',
      subtitle: metadata.subtitle || getSubtitleFromBillingType(metadata.billing_model_type, isRecurring),
      description: product.description || getDescriptionFromTierId(tierId),
      price: priceAmount,
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
        'True pay-as-you-go pricing',
        'No monthly commitment',
        'No setup fees or minimums',
        'Basic AI data extraction',
        'Standard support'
      ];
    case 'professional':
      return [
        'Prepaid credit system',
        '20% bonus credits included',
        '1,500 transaction credits',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics',
        'Credit expiration: 1 year'
      ];
    case 'business':
      return [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations',
        'Priority processing'
      ];
    case 'enterprise':
      return [
        'Unlimited everything',
        'Multi-user management',
        'Advanced security features',
        'SLA guarantee',
        'Custom development',
        'White-label options'
      ];
    default:
      return ['Custom features'];
  }
};

const getDescriptionFromTierId = (tierId: string): string => {
  switch (tierId) {
    case 'trial':
      return 'Try all features risk-free before committing to a paid plan.';
    case 'starter':
      return 'Perfect for occasional use with true pay-as-you-go pricing.';
    case 'professional':
      return 'Get 20% bonus credits with our prepaid credit system.';
    case 'business':
      return 'Unlimited usage with predictable monthly costs for growing teams.';
    case 'enterprise':
      return 'Scale with your organization with per-user pricing and enterprise features.';
    default:
      return 'Custom pricing plan tailored to your needs.';
  }
};

const getButtonTextFromTier = (tierId: string): string => {
  switch (tierId) {
    case 'trial': return 'Start Free Trial';
    case 'starter': return 'Start Using';
    case 'professional': return 'Buy Credits';
    case 'business': return 'Subscribe Now';
    case 'enterprise': return 'Contact Sales';
    default: return 'Select Plan';
  }
};

const getSubtitleFromBillingType = (billingType: string, isRecurring: boolean): string => {
  switch (billingType) {
    case 'free_trial': return 'Trial';
    case 'pay_as_you_go': return 'Pay As-You-Go';
    case 'credit_burndown': return 'Credit Burndown';
    case 'flat_recurring': return 'Flat Fee';
    case 'per_seat': return 'Per Seat';
    default: return isRecurring ? 'Monthly Plan' : 'Pay-as-you-go';
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
      id: 'default',
      name: 'Default Plan',
      subtitle: 'Setup Required',
      description: 'Please run the Stripe cleanup and reseed process to see proper billing tiers with usage limits.',
      price: 0,
      currency: 'USD',
      icon: '⚙️',
      features: [
        'Use the management tools above',
        'Clean up existing products',
        'Reseed with proper structure',
        'Usage limits will appear after setup'
      ],
      buttonText: 'Setup Required',
    }
  ];
};

const getEnhancedDefaultPricingTiers = (): StripePricingTier[] => {
  return [
    {
      id: 'trial',
      name: 'Free Trial',
      subtitle: 'Trial',
      description: 'Try all features risk-free with 500 included transactions monthly.',
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
      price: 1900, // $19.00
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
      price: 4900, // $49.00
      currency: 'USD',
      icon: '💼',
      features: [
        'Monthly subscription billing',
        '5,000 transactions included',
        'Overage billing at $0.015/transaction',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics',
        'Advanced features'
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
      price: 9900, // $99.00
      currency: 'USD',
      icon: '⚡',
      features: [
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations',
        'Priority processing'
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
      price: 2500, // $25.00
      currency: 'USD',
      icon: '👥',
      features: [
        'Unlimited everything per user',
        'Multi-user management',
        'Advanced security features',
        'SLA guarantee',
        'Custom development',
        'White-label options'
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
