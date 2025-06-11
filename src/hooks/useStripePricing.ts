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

      if (data?.success && data.products && data.products.length > 0) {
        const tiers = mapStripeProductsToTiers(data.products);
        setPricingTiers(tiers);
        console.log('Loaded billing app products:', data.products.length);
      } else {
        // No billing app products found, use default
        console.log('No billing app products found, using default pricing');
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
  const tiers: StripePricingTier[] = [];

  // Process Stripe products and map to tiers
  products.forEach((product) => {
    const defaultPrice = product.default_price;
    if (!defaultPrice) return;

    const priceAmount = defaultPrice.unit_amount ? defaultPrice.unit_amount / 100 : 0;
    const isRecurring = defaultPrice.recurring?.interval === 'month';
    const metadata = product.metadata || {};
    
    // Get tier ID from metadata
    const tierId = metadata.tier_id || 'custom';

    // Extract usage limits from metadata
    const usageLimits = [];
    
    if (metadata.usage_limit_transactions) {
      const transactionLimit = parseInt(metadata.usage_limit_transactions);
      usageLimits.push({ 
        name: 'Transactions', 
        value: transactionLimit >= 999999 ? 'Unlimited' : transactionLimit.toLocaleString() 
      });
    }
    
    if (metadata.usage_limit_ai_processing) {
      const aiLimit = parseInt(metadata.usage_limit_ai_processing);
      usageLimits.push({ 
        name: 'AI Processing', 
        value: aiLimit >= 999999 ? 'Unlimited' : aiLimit.toLocaleString() 
      });
    }
    
    if (metadata.usage_limit_data_exports) {
      const exportLimit = parseInt(metadata.usage_limit_data_exports);
      usageLimits.push({ 
        name: 'Data Exports', 
        value: exportLimit >= 999999 ? 'Unlimited' : exportLimit.toLocaleString() 
      });
    }
    
    if (metadata.usage_limit_api_calls) {
      const apiLimit = parseInt(metadata.usage_limit_api_calls);
      usageLimits.push({ 
        name: 'API Calls', 
        value: apiLimit >= 999999 ? 'Unlimited' : apiLimit.toLocaleString() 
      });
    }

    // Generate features based on tier and metadata
    const features = generateFeaturesFromTier(tierId, metadata);

    // Create tier from Stripe product data
    const tier: StripePricingTier = {
      id: tierId,
      name: product.name || 'Custom Plan',
      subtitle: getSubtitleFromBillingType(metadata.billing_model_type, isRecurring),
      description: product.description || 'Custom pricing plan',
      price: priceAmount,
      currency: defaultPrice.currency?.toUpperCase() || 'USD',
      icon: getIconForTier(tierId),
      features: features,
      usageLimits: usageLimits.length > 0 ? usageLimits : undefined,
      buttonText: priceAmount === 0 ? 'Start Free Trial' : 'Select Plan',
      popular: metadata.popular === 'true',
      badge: metadata.badge || getBadgeFromTier(tierId, metadata),
      isMonthly: isRecurring,
      meterRate: parseFloat(metadata.meter_rate || '0'),
      packageCredits: parseInt(metadata.package_credits || '0'),
      includedUsage: parseInt(metadata.usage_limit_transactions || '0'),
      usageUnit: 'transactions',
      tierStructure: 'flat'
    };

    tiers.push(tier);
  });

  // Sort tiers by price
  return tiers.sort((a, b) => a.price - b.price);
};

const generateFeaturesFromTier = (tierId: string, metadata: any): string[] => {
  const features = [];
  
  // Add tier-specific features based on the image
  switch (tierId) {
    case 'trial':
      features.push(
        'Full access to all features',
        '500 transaction limit',
        'Basic AI processing',
        'Email support'
      );
      break;
    case 'starter':
      features.push(
        'Pay only for what you use',
        'No monthly commitment',
        'Basic AI data extraction',
        'Standard support'
      );
      break;
    case 'professional':
      features.push(
        '1,200 transaction credits',
        '15% discount on bulk purchases',
        'Advanced AI processing',
        'Priority support',
        'Usage analytics'
      );
      break;
    case 'business':
      features.push(
        'Unlimited transactions',
        'Unlimited AI processing',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations'
      );
      break;
    case 'enterprise':
      features.push(
        'Unlimited everything',
        'Multi-user management',
        'Advanced security',
        'SLA guarantee',
        'Custom development'
      );
      break;
  }
  
  // Add meter rate information if available
  if (metadata.meter_rate && parseFloat(metadata.meter_rate) > 0) {
    features.push(`$${metadata.meter_rate}/transaction after limit`);
  }
  
  return features;
};

const getSubtitleFromBillingType = (billingType: string, isRecurring: boolean): string => {
  switch (billingType) {
    case 'free_trial': return 'Free Trial';
    case 'pay_as_you_go': return 'Pay As-You-Go';
    case 'credit_burndown': return 'Credit Package';
    case 'flat_recurring': return 'Monthly Plan';
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

const generateFeaturesFromMetadata = (metadata: any, usageLimits: any): string[] => {
  const features = [];
  
  if (usageLimits.included_usage > 0) {
    features.push(`${usageLimits.included_usage.toLocaleString()} ${usageLimits.usage_unit} included`);
  }
  
  if (usageLimits.meter_rate > 0) {
    features.push(`$${usageLimits.meter_rate} per additional ${usageLimits.usage_unit || 'unit'}`);
  }
  
  if (usageLimits.package_credits > 0) {
    features.push(`${usageLimits.package_credits.toLocaleString()} prepaid credits`);
  }

  // Check for unlimited features
  if (metadata.usage_limit_transactions === 'unlimited') {
    features.push('Unlimited transactions');
  }
  if (metadata.usage_limit_ai_processing === 'unlimited') {
    features.push('Unlimited AI processing');
  }
  if (metadata.usage_limit_api_calls === 'unlimited') {
    features.push('Unlimited API calls');
  }
  
  // Add tier-specific features
  switch (metadata.tier_id) {
    case 'trial':
      features.push('Full feature access', 'Email support');
      break;
    case 'starter':
      features.push('Pay only for what you use', 'No monthly commitment', 'Email support');
      break;
    case 'professional':
      features.push('Better rates', 'Flexible credit system', 'Priority support');
      break;
    case 'business':
      features.push('Predictable costs', 'Advanced features', 'Phone support');
      break;
    case 'enterprise':
      features.push('Team management', 'Custom integrations', 'Dedicated support');
      break;
  }
  
  // Add default features if none specified
  if (features.length === 0) {
    features.push('Full access to platform', 'Email support', 'Standard features');
  }
  
  return features;
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

export default useStripePricing;
