
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, AlertCircle, Activity, ArrowLeft, Crown, Info, CreditCard, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStripePricing } from '@/hooks/useStripePricing';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import UsageDashboard from '@/components/UsageDashboard';
import ProductDetailModal from '@/components/ProductDetailModal';
import FileUploadProcessor from '@/components/FileUploadProcessor';

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);
  const [showFileProcessor, setShowFileProcessor] = useState(false);
  const { toast } = useToast();
  
  // Remove automated refresh - only manual refresh
  const { pricingTiers, isLoading: isPricingLoading, error: pricingError, isRefreshing, refetch } = useStripePricing({
    autoRefresh: false,
    useAllProducts: false
  });

  // Get subscription status without auto-refresh
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

  // Create subscription products with proper Stripe billing structure
  const handleCreateSubscriptionProducts = async () => {
    setIsCreatingProducts(true);
    
    try {
      console.log('Creating subscription products with meters and pricing...');
      const { data, error } = await supabase.functions.invoke('create-subscription-products');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.success) {
        toast({
          title: "Subscription Products Created!",
          description: `Created ${data.summary?.products_created || 0} subscription products with billing meters.`,
        });
        console.log('Subscription products created:', data);
        
        // Refresh pricing data after creating products
        setTimeout(() => {
          refetch();
        }, 2000);
      } else {
        throw new Error(data?.error || 'Failed to create subscription products');
      }
    } catch (error: any) {
      console.error('Error creating subscription products:', error);
      toast({
        title: "Error Creating Products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingProducts(false);
    }
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
        console.log('Creating trial subscription directly...');
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            priceId: tierId,
            planName: selectedTier.name,
            mode: 'subscription'
          }
        });

        console.log('Trial checkout response:', { data, error });

        if (error) {
          console.error('Trial checkout error:', error);
          throw new Error(error.message || 'Failed to create trial subscription');
        }

        if (data?.success) {
          toast({
            title: "Free Trial Activated!",
            description: `You now have access to the trial plan.`,
          });
          setTimeout(() => refetchSubscription(), 1000);
          return;
        }
      }

      // Create checkout session for paid subscription plans
      console.log('Creating subscription checkout session...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price,
          currency: selectedTier.currency.toLowerCase(),
          mode: 'subscription'
        }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        // Open checkout in new tab to prevent page reload issues
        window.open(data.url, '_blank');
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
    
    // Use the actual price from the tier data, not hardcoded values
    const dollarAmount = tier.price / 100;
    if (dollarAmount < 1) {
      return `$${dollarAmount.toFixed(2)}`;
    }
    return `$${Math.round(dollarAmount)}`;
  };

  const getPriceSubtext = (tier: any) => {
    switch (tier.id) {
      case 'trial': return '14 days free';
      case 'starter': return 'per month + usage';
      case 'professional': return 'per month + usage';
      case 'business': return 'per month';
      case 'enterprise': return 'per user/month';
      default: return tier.isMonthly ? 'per month' : '';
    }
  };

  const getUsageLimitsFromTier = (tier: any) => {
    // Use actual tier data instead of hardcoded values
    if (tier.usageLimits && tier.usageLimits.length > 0) {
      return tier.usageLimits;
    }
    
    // Fallback to calculated limits based on tier metadata
    switch (tier.id) {
      case 'trial':
        return [
          { name: 'Transactions', value: tier.includedUsage ? `${tier.includedUsage} included` : '500 included' },
          { name: 'AI Processing', value: '50 included' },
          { name: 'After limit', value: tier.meterRate ? `$${tier.meterRate}/transaction` : '$0.05/transaction' }
        ];
      case 'starter':
        return [
          { name: 'Base Fee', value: formatPrice(tier) + '/month' },
          { name: 'Included Usage', value: tier.includedUsage ? `${tier.includedUsage.toLocaleString()} transactions` : '1,000 transactions' },
          { name: 'Overage', value: tier.meterRate ? `$${tier.meterRate}/transaction` : '$0.02/transaction' }
        ];
      case 'professional':
        return [
          { name: 'Base Fee', value: formatPrice(tier) + '/month' },
          { name: 'Included Usage', value: tier.includedUsage ? `${tier.includedUsage.toLocaleString()} transactions` : '5,000 transactions' },
          { name: 'Overage', value: tier.meterRate ? `$${tier.meterRate}/transaction` : '$0.015/transaction' }
        ];
      case 'business':
        return [
          { name: 'Transactions', value: 'Unlimited' },
          { name: 'AI Processing', value: 'Unlimited' },
          { name: 'Monthly Fee', value: formatPrice(tier) + ' flat rate' }
        ];
      case 'enterprise':
        return [
          { name: 'Per User', value: formatPrice(tier) + '/month' },
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

  const handleDataProcessed = (data: any[], metadata: any) => {
    console.log('Processed data:', data);
    console.log('Metadata:', metadata);
    toast({
      title: "File Processed Successfully",
      description: `Extracted ${data.length} items from ${metadata.fileName}`,
    });
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
            <div className="flex space-x-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateSubscriptionProducts}
                className="bg-green-600/20 border-green-500/30 text-green-300 hover:bg-green-600/30"
                disabled={isCreatingProducts}
              >
                {isCreatingProducts ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Create Subscription Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileProcessor(!showFileProcessor)}
                className="bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
              >
                {showFileProcessor ? 'Hide' : 'Show'} File Processor
              </Button>
            </div>
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
            Select the perfect subscription plan for your business needs. All plans include flexible usage-based billing!
          </p>
        </div>

        {/* File Processor Section */}
        {showFileProcessor && (
          <div className="mb-8">
            <FileUploadProcessor onDataProcessed={handleDataProcessed} />
          </div>
        )}

        {/* Usage Dashboard */}
        <div className="mb-8">
          <UsageDashboard period="current_month" limits={usageLimits} />
        </div>

        {/* Show setup notice if no products found */}
        {pricingTiers.length === 0 && (
          <div className="mb-8 p-6 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-center">
            <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-yellow-300 mb-2">Subscription Products Not Found</h3>
            <p className="text-yellow-200 mb-4">
              Click "Create Subscription Products" above to set up the proper Stripe billing structure with meters, pricing tiers, and subscription products.
            </p>
          </div>
        )}

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingTiers.map((tier) => {
            const isActive = isCurrentPlan(tier.id);
            
            return (
              <Card 
                key={tier.id} 
                className={`relative bg-slate-800/90 backdrop-blur-sm border-slate-700 text-white h-full flex flex-col transform transition-all duration-300 hover:scale-105 hover:z-10 ${
                  isActive
                    ? 'border-2 border-green-500 shadow-2xl shadow-green-500/30 z-20'
                    : tier.popular 
                      ? 'border-2 border-blue-500 shadow-2xl shadow-blue-500/30 z-10' 
                      : 'border border-slate-700/50 shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-blue-500/20'
                }`}
                style={{
                  boxShadow: isActive 
                    ? '0 25px 50px -12px rgba(34, 197, 94, 0.4), 0 0 0 1px rgba(34, 197, 94, 0.3)'
                    : tier.popular
                      ? '0 25px 50px -12px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)'
                      : '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                }}
              >
                {isActive && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
                    <Badge className="bg-green-600 text-white border-green-600">
                      Current Plan
                    </Badge>
                  </div>
                )}

                {!isActive && tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
                    <Badge className="bg-blue-600 text-white border-blue-600">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {!isActive && tier.id === 'trial' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
                    <Badge className="bg-green-600 text-white border-green-600">
                      Free Trial
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
                      Pricing Details
                    </h4>
                    <div className="space-y-2">
                      {getUsageLimitsFromTier(tier).map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-slate-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    className={`w-full mt-6 font-medium py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      isActive
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                    onClick={() => handleSelectPlan(tier.id)}
                    disabled={isLoading && selectedPlan === tier.id || isActive}
                  >
                    {isActive 
                      ? 'Current Plan' 
                      : isLoading && selectedPlan === tier.id 
                        ? 'Processing...' 
                        : 'Subscribe Now'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300 text-sm max-w-4xl mx-auto leading-relaxed">
            <strong>New Subscription Model:</strong> All plans now include a monthly base fee with included usage and overage billing. 
            <strong> Trial:</strong> Free with 500 included transactions. 
            <strong> Starter:</strong> $19/month with 1,000 included transactions. 
            <strong> Professional:</strong> $49/month with 5,000 included transactions. 
            <strong> Business:</strong> $99/month unlimited. 
            <strong> Enterprise:</strong> $25/user/month unlimited.
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
