
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import useStripePricing from '@/hooks/useStripePricing';
import { useSubscription } from '@/hooks/useSubscription';

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [managingPlanId, setManagingPlanId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);

  const { pricingTiers, isLoading: pricingLoading, error: pricingError } = useStripePricing({
    autoRefresh: false,
    useAllProducts: false
  });
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();

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

    if (selectedPlan === planId && isLoading) return;

    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      console.log(`Creating checkout for plan: ${planId}`);
      
      const mode = planId === 'trial' ? 'subscription' : 'subscription';
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier_id: planId,
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
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (managingPlanId === planId && isManaging) return;

    setManagingPlanId(planId);
    setIsManaging(true);

    try {
      console.log(`Opening customer portal for plan: ${planId}`);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Customer portal error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to customer portal:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No customer portal URL returned');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal.",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
      setManagingPlanId(null);
    }
  };

  const handleCancelSubscription = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to cancel your subscription.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (cancellingPlanId === planId && isCancelling) return;

    setCancellingPlanId(planId);
    setIsCancelling(true);

    try {
      console.log(`Cancelling subscription for plan: ${planId}`);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Customer portal error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to customer portal for cancellation:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No customer portal URL returned');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open cancellation portal.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancellingPlanId(null);
    }
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return 'Free';
    return `$${price}`;
  };

  const getPriceSubtext = (tier: any): string => {
    if (tier.price === 0) return '14 days free trial';
    if (tier.isMonthly) return 'per month';
    if (tier.id === 'starter') return 'per month + overages';
    if (tier.id === 'professional') return 'per month + overages';
    if (tier.id === 'enterprise') return 'per user/month';
    return '';
  };

  if (pricingError) {
    return (
      <DashboardLayout 
        title="Choose Your Plan" 
        description="Select the perfect pricing model for your business needs"
      >
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error loading pricing plans: {pricingError}</p>
          <p className="text-gray-400">Displaying default pricing plans</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Choose Your Plan" 
      description="Select the perfect pricing model for your business needs"
    >
      {(pricingLoading || subscriptionLoading) && (
        <div className="mb-6 text-center">
          <div className="text-sm text-gray-400">Loading plans and subscription status...</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {pricingTiers.map((tier) => {
          const isCurrentUserSubscribedToThisPlan = 
            subscriptionStatus.subscribed && 
            subscriptionStatus.subscription_price_id === tier.id;

          let buttonText = tier.buttonText;
          let buttonAction = () => handleSelectPlan(tier.id);
          let buttonDisabled = (isLoading && selectedPlan === tier.id) || (isManaging && managingPlanId === tier.id) || (isCancelling && cancellingPlanId === tier.id);
          let currentButtonIsLoading = false;
          let buttonVariant: "default" | "destructive" = "default";

          if (isCurrentUserSubscribedToThisPlan) {
            buttonText = "Cancel Subscription";
            buttonAction = () => handleCancelSubscription(tier.id);
            currentButtonIsLoading = isCancelling && cancellingPlanId === tier.id;
            buttonVariant = "destructive";
          } else {
            currentButtonIsLoading = isLoading && selectedPlan === tier.id;
          }
          
          return (
            <Card 
              key={tier.id} 
              className={`relative bg-gray-800 border-gray-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-2 shadow-lg ${
                tier.popular ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' : ''
              } ${isCurrentUserSubscribedToThisPlan ? 'border-2 border-green-500 shadow-green-500/20' : ''}`}
            >
              {isCurrentUserSubscribedToThisPlan && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-green-600 text-white shadow-lg">Your Plan</Badge>
                </div>
              )}
              {tier.badge && !isCurrentUserSubscribedToThisPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className={`shadow-lg ${
                    tier.badge === 'Free Trial' ? 'bg-green-600' : 'bg-blue-600'
                  } text-white`}>
                    {tier.badge}
                  </Badge>
                </div>
              )}

              {tier.popular && !isCurrentUserSubscribedToThisPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white shadow-lg">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mb-3">
                  <CardTitle className="text-xl font-semibold text-white mb-1">
                    {tier.name}
                  </CardTitle>
                  <div className="text-sm text-purple-300">{tier.subtitle}</div>
                </div>
                
                <p className="text-gray-400 text-sm mb-6 h-10 overflow-hidden">{tier.description}</p>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white mb-1">{formatPrice(tier.price)}</div>
                  <div className="text-gray-400 text-sm">{getPriceSubtext(tier)}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 flex flex-col flex-grow">
                <div className="space-y-3 flex-grow">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {tier.usageLimits && tier.usageLimits.length > 0 && (
                  <div className="bg-gray-700/50 rounded-lg p-4 shadow-inner">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                      Usage Limits
                    </h4>
                    <div className="space-y-2">
                      {tier.usageLimits.map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  variant={buttonVariant}
                  className={`w-full mt-auto ${
                    isCurrentUserSubscribedToThisPlan 
                      ? 'hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-all duration-200 hover:shadow-lg hover:scale-105 shadow-md`}
                  onClick={buttonAction}
                  disabled={buttonDisabled || subscriptionLoading}
                >
                  {currentButtonIsLoading ? 'Processing...' : buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pricingTiers.length === 0 && !pricingLoading && !subscriptionLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No pricing plans available</p>
          <p className="text-gray-500 text-sm">Please check your Stripe configuration or contact support.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Pricing;
