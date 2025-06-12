
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
        throw new Error(error.message);
      }

      console.log('Subscription check result:', data);
      
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

      setSubscriptionStatus(validatedData);

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
    checkSubscription();
  }, [user]);

  // Auto-refresh subscription status every 30 seconds when on pricing page
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing subscription status...');
      checkSubscription();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  return {
    subscriptionStatus,
    isLoading,
    error,
    refetch: checkSubscription
  };
};
