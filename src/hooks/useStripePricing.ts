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

      if (data?.products && data.products.length > 0) {
        const tiers = mapStripeProductsToTiers(data.products);
        setPricingTiers(tiers);
      } else {
        // Only use fallback if no products found
        console.log('No Stripe products found, using default pricing');
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
    const usageLimits = product.usage_limits || {};
    
    // Determine tier ID from metadata or price range
    let tierId = product.metadata?.tier_id;
    if (!tierId) {
      // Auto-assign tier based on price
      if (priceAmount === 0) tierId = 'trial';
      else if (priceAmount <= 10) tierId = 'starter';
      else if (priceAmount <= 50) tierId = 'professional';
      else if (priceAmount <= 100) tierId = 'business';
      else tierId = 'enterprise';
    }

    // Create dynamic usage limits array
    const dynamicUsageLimits = [];
    if (usageLimits.transactions > 0) {
      dynamicUsageLimits.push({ 
        name: 'Transactions', 
        value: usageLimits.transactions.toLocaleString() 
      });
    }
    if (usageLimits.ai_processing > 0) {
      dynamicUsageLimits.push({ 
        name: 'AI Processing', 
        value: usageLimits.ai_processing.toLocaleString() 
      });
    }
    if (usageLimits.data_exports > 0) {
      dynamicUsageLimits.push({ 
        name: 'Data Exports', 
        value: usageLimits.data_exports.toLocaleString() 
      });
    }
    if (usageLimits.api_calls > 0) {
      dynamicUsageLimits.push({ 
        name: 'API Calls', 
        value: usageLimits.api_calls.toLocaleString() 
      });
    }

    // Create tier from Stripe product data
    const tier: StripePricingTier = {
      id: tierId,
      name: product.name || 'Custom Plan',
      subtitle: product.metadata?.billing_model_type || (isRecurring ? 'Monthly Plan' : 'Pay-as-you-go'),
      description: product.description || 'Custom pricing plan',
      price: priceAmount,
      currency: defaultPrice.currency?.toUpperCase() || 'USD',
      icon: getIconForTier(tierId),
      features: generateFeaturesFromMetadata(product.metadata, usageLimits),
      usageLimits: dynamicUsageLimits.length > 0 ? dynamicUsageLimits : undefined,
      buttonText: 'Select Plan',
      popular: product.metadata?.popular === 'true',
      badge: product.metadata?.badge,
      isMonthly: isRecurring,
      meterRate: usageLimits.meter_rate || 0,
      packageCredits: usageLimits.package_credits || 0,
      includedUsage: usageLimits.included_usage || 0,
      usageUnit: usageLimits.usage_unit || 'units',
      tierStructure: product.graduated_pricing ? 'graduated' : 'flat'
    };

    tiers.push(tier);
  });

  // If no Stripe products found, return default tiers
  if (tiers.length === 0) {
    return getDefaultPricingTiers();
  }

  // Sort tiers by price
  return tiers.sort((a, b) => a.price - b.price);
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
  
  if (metadata?.features) {
    try {
      const additionalFeatures = JSON.parse(metadata.features);
      features.push(...additionalFeatures);
    } catch {
      // If features isn't valid JSON, add as single feature
      features.push(metadata.features);
    }
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
        'Basic AI processing',
        'Email support'
      ],
      usageLimits: [
        { name: 'Transactions', value: '500' },
        { name: 'AI Processing', value: '50' }
      ],
      buttonText: 'Start Free Trial',
      packageCredits: 500,
      meterRate: 0.05
    },
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
      buttonText: 'Select Plan',
      meterRate: 0.05
    }
  ];
};
