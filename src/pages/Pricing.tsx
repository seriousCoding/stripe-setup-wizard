import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, AlertCircle, Activity, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStripePricing } from '@/hooks/useStripePricing';
import { Link } from 'react-router-dom';
import UsageDashboard from '@/components/UsageDashboard';

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Enable automatic price refresh every 10 minutes
  const { pricingTiers, isLoading: isPricingLoading, error: pricingError, isRefreshing, refetch } = useStripePricing({
    autoRefresh: true,
    refreshInterval: 600000 // 10 minutes
  });

  // Define usage limits for different plans
  const usageLimits = {
    api_calls: 100,
    transactions: 50,
    ai_processing: 20,
    data_exports: 5
  };

  // Manual refresh function for immediate updates
  const handleRefreshPricing = () => {
    refetch();
    toast({
      title: "Refreshing Pricing Data",
      description: "Fetching latest pricing information from Stripe...",
    });
  };

  const handleSelectPlan = async (tierId: string) => {
    console.log('Selecting plan:', tierId);
    setIsLoading(true);
    setSelectedPlan(tierId);
    
    try {
      const selectedTier = pricingTiers.find(tier => tier.id === tierId);
      if (!selectedTier) {
        throw new Error('Invalid plan selected');
      }

      console.log('Selected tier details:', selectedTier);

      // Handle special case for free trial plan only
      if (tierId === 'trial') {
        toast({
          title: "Free Trial Activated!",
          description: `You now have ${selectedTier.packageCredits} transaction credits. After the limit, meter rate of $${selectedTier.meterRate} per transaction applies.`,
        });
        return;
      }

      // Create checkout session for all other plans (including starter)
      console.log('Creating checkout session...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierId,
          planName: selectedTier.name,
          amount: selectedTier.price * 100, // Convert to cents
          currency: selectedTier.currency.toLowerCase(),
          mode: selectedTier.isMonthly ? 'subscription' : 'payment',
          packageCredits: selectedTier.packageCredits,
          meterRate: selectedTier.meterRate
        }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        // Redirect directly to Stripe checkout
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
    if (tier.price === 0) return '$0';
    
    // For starter plan, show as $0.99
    if (tier.id === 'starter') {
      return '$0.99';
    }
    
    // For other plans, show the dollar amount without decimals
    if (tier.price === 4900) return '$49';
    if (tier.price === 9900) return '$99';
    if (tier.price === 2500) return '$25';
    
    // Fallback for any other prices
    const dollarAmount = tier.price / 100;
    return `$${Math.round(dollarAmount)}`;
  };

  const getPriceSubtext = (tier: any) => {
    if (tier.price === 0 && tier.id === 'trial') return '14 days free';
    if (tier.id === 'starter') return 'per transaction';
    if (tier.id === 'professional') return 'prepaid credits';
    if (tier.isMonthly && tier.id === 'enterprise') return 'per user/month';
    if (tier.isMonthly) return 'per month';
    return '';
  };

  if (isPricingLoading) {
    return (
      <div className="min-h-screen bg-gradient-blue-purple py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-purple-500">Choose Your Plan</h1>
            <p className="text-white/90 max-w-2xl mx-auto text-lg">
              Loading pricing information...
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
          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Select the perfect plan for your business needs
          </p>
          {isRefreshing && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-blue-300">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Auto-refreshing prices...</span>
            </div>
          )}
          {pricingError && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-orange-300">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Using fallback pricing data - {pricingError}</span>
            </div>
          )}
        </div>

        {/* Usage Dashboard */}
        <div className="mb-8">
          <UsageDashboard period="current_month" limits={usageLimits} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative bg-slate-800/90 backdrop-blur-sm border-slate-700 text-white h-full flex flex-col ${
                tier.popular 
                  ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'border border-slate-700/50'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white border-blue-600">
                    Most Popular
                  </Badge>
                </div>
              )}

              {tier.badge && tier.id === 'trial' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-600 text-white border-green-600">
                    {tier.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-start space-x-3 mb-3">
                  <div className="text-xl">{tier.icon}</div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-sm text-slate-400">{tier.subtitle}</p>
                  </div>
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
                
                {tier.usageLimits && tier.usageLimits.length > 0 && (
                  <div className="bg-slate-700/40 rounded-lg p-4 mt-4">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                      Usage Limits
                    </h4>
                    <div className="space-y-2">
                      {tier.usageLimits.map((limit, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-slate-400">{limit.name}</span>
                          <span className="text-white font-medium">{limit.value}</span>
                        </div>
                      ))}
                    </div>
                    {tier.meterRate && tier.meterRate > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-600">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">After limit</span>
                          <span className="text-white">${tier.meterRate}/transaction</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isLoading && selectedPlan === tier.id}
                >
                  {isLoading && selectedPlan === tier.id ? 'Processing...' : tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-300 text-sm max-w-4xl mx-auto leading-relaxed">
            All packages auto-renew unless you opt out. After package limits are reached, meter rates apply automatically. 
            No service interruption - we'll continue processing your transactions at the meter rate. 
            Prices refresh automatically every 10 minutes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
