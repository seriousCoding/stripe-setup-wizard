
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import useStripePricing from '@/hooks/useStripePricing';
import { useSubscription } from '@/hooks/useSubscription'; // Import useSubscription
import PricingCard from '@/components/PricingCard'; // Import PricingCard
import { StripePricingTier } from '@/hooks/useStripePricing'; // Import the tier type

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false); // Renamed for clarity
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null); // Renamed for clarity
  
  const { pricingTiers, isLoading: pricingLoading, error: pricingError } = useStripePricing({
    autoRefresh: false,
    useAllProducts: false
  });

  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription(); // Get subscription status

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to a plan.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Prevent re-subscribing to the current plan if somehow clicked (button should be disabled)
    if (subscriptionStatus.subscribed && subscriptionStatus.subscription_tier === planId) {
      toast({
        title: "Already Subscribed",
        description: "You are already subscribed to this plan.",
      });
      return;
    }
    
    setSelectedPlanId(planId);
    setIsLoadingCheckout(true);

    try {
      console.log(`Creating checkout for plan: ${planId}`);
      const mode = 'subscription'; // All plans are subscriptions
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier_id: planId, // Use the planId which should match Stripe Price/Product ID or metadata
          user_email: user.email,
          mode: mode
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCheckout(false);
      setSelectedPlanId(null);
    }
  };

  if (pricingError) {
    return (
      <DashboardLayout 
        title="Choose Your Plan" 
        description="Select the perfect pricing model for your business needs"
      >
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error loading pricing plans: {pricingError}</p>
        </div>
      </DashboardLayout>
    );
  }
  
  const actualPricingTiers: StripePricingTier[] = pricingTiers as StripePricingTier[];


  return (
    <DashboardLayout 
      title="Choose Your Plan" 
      description="Select the perfect pricing model for your business needs"
    >
      {(pricingLoading || subscriptionLoading) && (
        <div className="mb-6 text-center">
          <div className="text-sm text-gray-400">Loading plans...</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {actualPricingTiers.map((tier) => {
          const isCurrentPlan = subscriptionStatus.subscribed && subscriptionStatus.subscription_tier === tier.id;
          const isProcessing = isLoadingCheckout && selectedPlanId === tier.id;
          return (
            <PricingCard
              key={tier.id}
              tier={tier}
              onSelectPlan={handleSelectPlan}
              isLoading={isProcessing}
              isCurrentPlan={isCurrentPlan}
              isSubscribedToAnyPlan={subscriptionStatus.subscribed}
            />
          );
        })}
      </div>

      {actualPricingTiers.length === 0 && !pricingLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No pricing plans available at the moment.</p>
          <p className="text-gray-500 text-sm">Please check back later or contact support.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Pricing;
