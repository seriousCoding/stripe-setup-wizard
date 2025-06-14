import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_status: string;
  subscription_id?: string;
  customer_id?: string;
  current_period_end?: number;
  price_amount?: number;
  subscription_price_id?: string; // Added field for price ID
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    subscription_status: 'loading',
    subscription_price_id: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'no_user',
        subscription_price_id: undefined,
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Checking subscription status for user:', user.email);

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Subscription check error:', error);
        throw new Error(error.message);
      }

      console.log('Raw subscription check result:', data);
      
      const validatedData: SubscriptionStatus = {
        subscribed: Boolean(data?.subscribed),
        subscription_tier: data?.subscription_tier || null,
        subscription_status: data?.subscription_status || 'unknown',
        subscription_id: data?.subscription_id || undefined,
        customer_id: data?.customer_id || undefined,
        current_period_end: data?.current_period_end || undefined,
        price_amount: data?.price_amount || undefined,
        subscription_price_id: data?.price_id || undefined, // Map price_id
      };

      console.log('Validated subscription data:', validatedData);
      setSubscriptionStatus(validatedData);

      localStorage.setItem('subscription_status', JSON.stringify(validatedData));

    } catch (err: any) {
      console.error('Error checking subscription:', err);
      setError(err.message);
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'error',
        subscription_price_id: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check subscription when user changes
  useEffect(() => {
    if (user) {
      // Try to load from localStorage first for immediate display
      const cached = localStorage.getItem('subscription_status');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          // Ensure new field is handled if not in cache
          if (!('subscription_price_id' in cachedData)) {
            cachedData.subscription_price_id = undefined;
          }
          setSubscriptionStatus(cachedData);
          setIsLoading(false); // Assuming cached data is good enough for initial load
        } catch (e) {
          console.warn('Failed to parse cached subscription status');
          localStorage.removeItem('subscription_status'); // Clear invalid cache
        }
      }
      
      // Then fetch fresh data
      checkSubscription();
    } else {
       // Clear status if no user
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'no_user',
        subscription_price_id: undefined,
      });
      setIsLoading(false);
      localStorage.removeItem('subscription_status');
    }
  }, [user]);

  // Auto-refresh subscription status every 60 seconds when user is present
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing subscription status...');
      checkSubscription();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  return {
    subscriptionStatus,
    isLoading: isLoading, // Renamed for clarity from hook's perspective
    error,
    refetch: checkSubscription
  };
};
