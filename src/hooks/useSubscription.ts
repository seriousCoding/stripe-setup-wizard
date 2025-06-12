
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
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    subscription_status: 'loading'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'no_user'
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
      
      // Ensure we have a valid response structure
      const validatedData = {
        subscribed: Boolean(data?.subscribed),
        subscription_tier: data?.subscription_tier || null,
        subscription_status: data?.subscription_status || 'unknown',
        subscription_id: data?.subscription_id || undefined,
        customer_id: data?.customer_id || undefined,
        current_period_end: data?.current_period_end || undefined,
        price_amount: data?.price_amount || undefined
      };

      console.log('Validated subscription data:', validatedData);
      setSubscriptionStatus(validatedData);

      // Store in localStorage for persistence
      localStorage.setItem('subscription_status', JSON.stringify(validatedData));

    } catch (err: any) {
      console.error('Error checking subscription:', err);
      setError(err.message);
      setSubscriptionStatus({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'error'
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
          setSubscriptionStatus(cachedData);
          setIsLoading(false);
        } catch (e) {
          console.warn('Failed to parse cached subscription status');
        }
      }
      
      // Then fetch fresh data
      checkSubscription();
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
    isLoading,
    error,
    refetch: checkSubscription
  };
};
