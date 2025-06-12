
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, AlertCircle, Activity, ArrowLeft, Crown, Info, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStripePricing } from '@/hooks/useStripePricing';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import UsageDashboard from '@/components/UsageDashboard';
import ProductDetailModal from '@/components/ProductDetailModal';

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const { toast } = useToast();
  
  // Enable automatic price refresh every 10 minutes
  const { pricingTiers, isLoading: isPricingLoading, error: pricingError, isRefreshing, refetch } = useStripePricing({
    autoRefresh: true,
    refreshInterval: 600000 // 10 minutes
  });

  // Get subscription status with auto-refresh
  const { subscriptionStatus, isLoading: isSubscriptionLoading, error: subscriptionError, refetch: refetchSubscription } = useSubscription();

  // Define usage limits for different plans
  const usageLimits = {
    api_calls: 100,
    transactions: 50,
    ai_processing: 20,
    data_exports: 5
  };

  // Manual refresh function for immediate updates
  const handleRefreshPricing = async () => {
    console.log('Manual refresh triggered');
    refetch();
    await refetchSubscription();
    toast({
      title: "Refreshing Data",
      description: "Fetching latest pricing and subscription information...",
    });
  };

  const handleProductInfo = (tier: any) => {
    setSelectedProduct(tier);
    setShowProductModal(true);
  };

  const handleSelectPlan = async (tierId: string) => {
    console.log('Selecting plan:', tierId);
    
    // If user is already subscribed to this tier, don't allow selection
    if (subscriptionStatus.subscribed && subscriptionStatus.subscription_tier === tierId) {
      toast({
        title: "Already Subscribed",
        description: "You are already subscribed to this plan.",
      });
      return;
    }

    setIsLoading(true);
    setSelectedPlan(tierId);
    
    try {
      const selectedTier = pricingTiers.find(tier => tier.id === tierId);
      if (!selectedTier) {
        throw new Error('Invalid plan selected');
      }

      console.log('Selected tier details:', selectedTier);

      // Handle special case for free trial plan
      if (tierId === 'trial') {
        toast({
          title: "Free Trial Activated!",
          description: `You now have access to the trial plan with 500 transaction credits.`,
        });
        setTimeout(() => refetchSubscription(), 1000);
        return;
      }

      // Handle Professional plan (Credit Burndown)
      if (tierId === 'professional') {
        console.log('Processing Professional plan as credit burndown...');
        
        // First get or create customer
        const customers = await supabase.functions.invoke('check-subscription');
        let customerId = customers.data?.customer_id;
        
        if (!customerId) {
          // Create customer through checkout which will handle customer creation
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              priceId: tierId,
              planName: selectedTier.name,
              amount: selectedTier.price,
              currency: selectedTier.currency.toLowerCase(),
              mode: 'payment' // One-time payment for credits
            }
          });

          if (error) throw new Error(error.message);
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
        } else {
          // Create credit invoice for existing customer
          const { data, error } = await supabase.functions.invoke('create-credit-invoice', {
            body: {
              customerId: customerId,
              amount: selectedTier.price,
              currency: selectedTier.currency.toLowerCase(),
              description: `${selectedTier.name} Credits`,
              creditMultiplier: 1.2 // 20% bonus
            }
          });

          if (error) throw new Error(error.message);
          if (data?.invoice_url) {
            window.open(data.invoice_url, '_blank');
            return;
          }
        }
      }

      // Handle all other plans (Starter, Business, Enterprise)
      console.log('Creating checkout session for standard plan...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price,
          currency: selectedTier.currency.toLowerCase(),
          mode: selectedTier.isMonthly ? 'subscription' : 'payment'
        }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process plan selection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (tier: any) => {
    if (tier.price === 0 || tier.id === 'trial') return '$0';
    if (tier.id === 'starter') return '$0.99';
    if (tier.id === 'professional') return '$49';
    if (tier.id === 'business') return '$99';
    if (tier.id === 'enterprise') return '$25';
    
    const dollarAmount = tier.price / 100;
    if (dollarAmount < 1) {
      return `$${dollarAmount.toFixed(2)}`;
    }
    return `$${Math.round(dollarAmount)}`;
  };

  const getPriceSubtext = (tier: any) => {
    switch (tier.id) {
      case 'trial': return '14 days free';
      case 'starter': return 'per transaction';
      case 'professional': return 'for $120 in credits';
      case 'business': return 'per month';
      case 'enterprise': return 'per user/month';
      default: return '';
    }
  };

  const getUsageLimitsFromImage = (tierId: string) => {
    switch (tierId) {
      case 'trial':
        return [
          { name: 'Transactions', value: '500' },
          { name: 'AI Processing', value: '50' },
          { name: 'After limit', value: '$0.05/transaction' }
        ];
      case 'starter':
        return [
          { name: 'Transactions', value: 'Pay per use' },
          { name: 'Rate', value: '$0.99/transaction' },
          { name: 'Setup Fee', value: 'None' }
        ];
      case 'professional':
        return [
          { name: 'Prepaid Amount', value: '$49' },
          { name: 'Credit Value', value: '$120 (20% bonus)' },
          { name: 'Rate', value: '$0.04/transaction' }
        ];
      case 'business':
        return [
          { name: 'Transactions', value: 'Unlimited' },
          { name: 'AI Processing', value: 'Unlimited' }
        ];
      case 'enterprise':
        return [
          { name: 'Transactions', value: 'Unlimited' },
          { name: 'AI Processing', value: 'Unlimited' }
        ];
      default:
        return [];
    }
  };

  const isCurrentPlan = (tierId: string) => {
    return subscriptionStatus.subscribed && subscriptionStatus.subscription_tier === tierId;
  };

  if (isPricingLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-blue-purple py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-purple-500">Choose Your Plan</h1>
            <p className="text-white/90 max-w-2xl mx-auto text-lg">
              Loading pricing and subscription information...
            </p>
          </div>
          <div className="flex justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-blue-purple py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-purple-500">Choose Your Plan</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPricing}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Enhanced Current Subscription Status */}
          {subscriptionStatus.subscribed && (
            <div className="mb-6 p-4 bg-green-600/20 border border-green-500/30 rounded-lg max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2">
                <Crown className="h-5 w-5 text-green-400" />
                <span className="text-green-300 font-semibold">
                  Currently subscribed to: {subscriptionStatus.subscription_tier?.charAt(0).toUpperCase() + subscriptionStatus.subscription_tier?.slice(1)}
                </span>
              </div>
              <div className="text-xs text-green-400 mt-1">
                Status: {subscriptionStatus.subscription_status} | ID: {subscriptionStatus.subscription_id?.substring(0, 8)}...
              </div>
            </div>
          )}

          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Select the perfect plan for your business needs. Professional plan includes 20% bonus credits!
          </p>
          {isRefreshing && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-blue-300">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Auto-refreshing prices...</span>
            </div>
          )}
        </div>

        {/* Usage Dashboard */}
        <div className="mb-8">
          <UsageDashboard period="current_month" limits={usageLimits} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingTiers.map((tier) => {
            const isActive = isCurrentPlan(tier.id);
            
            return (
              <Card 
                key={tier.id} 
                className={`relative bg-slate-800/90 backdrop-blur-sm border-slate-700 text-white h-full flex flex-col ${
                  isActive
                    ? 'border-2 border-green-500 shadow-lg shadow-green-500/20'
                    : tier.popular 
                      ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'border border-slate-700/50'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-600 text-white border-green-600">
                      Current Plan
                    </Badge>
                  </div>
                )}

                {!isActive && tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white border-blue-600">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {!isActive && tier.id === 'trial' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-600 text-white border-green-600">
                      Free Trial
                    </Badge>
                  </div>
                )}

                {tier.id === 'professional' && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-orange-600 text-white text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      20% Bonus
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{tier.icon}</div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                        <p className="text-sm text-slate-400">{tier.subtitle}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleProductInfo(tier)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-slate-300 text-sm mb-6 min-h-[48px] text-left leading-relaxed">
                    {tier.description}
                  </p>
                  
                  <div className="mb-6 text-left">
                    <div className="text-4xl font-bold text-blue-400 mb-1">
                      {formatPrice(tier)}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {getPriceSubtext(tier)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col space-y-4 px-6">
                  <div className="space-y-3 flex-1">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-200 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-slate-700/40 rounded-lg p-4 mt-4">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                      {tier.id === 'professional' ? 'Credit Details' : 'Usage Limits'}
                    </h4>
                    <div className="space-y-2">
                      {getUsageLimitsFromImage(tier.id).map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-slate-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    className={`w-full mt-6 font-medium py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : tier.id === 'professional'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    onClick={() => handleSelectPlan(tier.id)}
                    disabled={isLoading && selectedPlan === tier.id || isActive}
                  >
                    {isActive 
                      ? 'Current Plan' 
                      : isLoading && selectedPlan === tier.id 
                        ? 'Processing...' 
                        : tier.id === 'professional'
                          ? 'Buy Credits'
                          : 'Select Plan'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300 text-sm max-w-4xl mx-auto leading-relaxed">
            <strong>Starter:</strong> True pay-as-you-go with no limits or commitments. 
            <strong> Professional:</strong> Credit burndown model - pay $49, get $120 in credits (20% bonus). 
            <strong> Business & Enterprise:</strong> Unlimited usage with monthly subscriptions. 
            All plans include automatic credit application and real-time usage tracking.
          </p>
        </div>
      </div>

      <ProductDetailModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        product={selectedProduct}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
};

export default Pricing;
