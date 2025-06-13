
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

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Use the hook to get live pricing data with background updates
  const { pricingTiers, isLoading: pricingLoading, error: pricingError } = useStripePricing({
    autoRefresh: false, // No auto refresh needed
    useAllProducts: false // Only use app-specific products
  });

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

    if (selectedPlan === planId) return; // Prevent duplicate calls
    
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      // For trial plan, handle locally
      if (planId === 'trial') {
        toast({
          title: "Free Trial Activated",
          description: "Your free trial has been activated!",
        });
        navigate('/');
        return;
      }

      console.log(`Creating checkout for plan: ${planId}`);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier_id: planId,
          user_email: user.email,
          mode: 'subscription'
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

  const formatPrice = (price: number): string => {
    if (price === 0) return '$0';
    return `$${price}`;
  };

  const getPriceSubtext = (tier: any): string => {
    if (tier.price === 0) return '14 days free';
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
      {pricingLoading && (
        <div className="mb-6 text-center">
          <div className="text-sm text-gray-400">Loading pricing plans...</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {pricingTiers.map((tier) => (
          <Card 
            key={tier.id} 
            className={`relative bg-gray-800 border-gray-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-2 shadow-lg ${
              tier.popular ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' : ''
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 right-4">
                <Badge className={`shadow-lg ${
                  tier.badge === 'Free Trial' ? 'bg-green-600' : 'bg-blue-600'
                } text-white`}>
                  {tier.badge}
                </Badge>
              </div>
            )}

            {tier.popular && (
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
              
              <p className="text-gray-400 text-sm mb-6">{tier.description}</p>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-white mb-1">{formatPrice(tier.price)}</div>
                <div className="text-gray-400 text-sm">{getPriceSubtext(tier)}</div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {tier.usageLimits && (
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-105 shadow-md"
                onClick={() => handleSelectPlan(tier.id)}
                disabled={isLoading || selectedPlan === tier.id}
              >
                {isLoading && selectedPlan === tier.id ? 'Processing...' : tier.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {pricingTiers.length === 0 && !pricingLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No pricing plans available</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Pricing;
