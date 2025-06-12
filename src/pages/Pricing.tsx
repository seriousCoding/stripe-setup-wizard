
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Users, Building, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStripePricing } from '@/hooks/useStripePricing';

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pricingTiers, isLoading, error, refetch } = useStripePricing();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [fixingPricing, setFixingPricing] = useState(false);

  const handleSubscribe = async (tierId: string, priceId?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to a plan.",
        variant: "destructive",
      });
      return;
    }

    setCheckingOut(tierId);
    
    try {
      console.log(`Creating checkout for tier: ${tierId}, priceId: ${priceId}`);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier_id: tierId,
          price_id: priceId,
          user_email: user.email
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to checkout:', data.url);
        // Open in same window for proper navigation
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast({
        title: "Checkout Error", 
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setCheckingOut(null);
    }
  };

  const handleFixPricing = async () => {
    setFixingPricing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-stripe-pricing');
      
      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Pricing Fixed",
          description: `Successfully processed ${data.summary?.products_processed || 0} products and created ${data.summary?.prices_created || 0} prices.`,
        });
        
        // Refetch pricing data
        refetch();
      } else {
        throw new Error(data?.error || 'Failed to fix pricing');
      }
    } catch (error: any) {
      console.error('Fix pricing error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix pricing",
        variant: "destructive",
      });
    } finally {
      setFixingPricing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Pricing Plans" description="Choose the perfect plan for your business">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Pricing Plans" description="Choose the perfect plan for your business">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading pricing: {error}</p>
          <div className="space-x-2">
            <Button onClick={refetch} variant="outline">Retry</Button>
            <Button onClick={handleFixPricing} disabled={fixingPricing}>
              {fixingPricing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fix Stripe Pricing
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pricing Plans" description="Choose the perfect plan for your business">
      <div className="space-y-8">
        {/* Fix Pricing Button */}
        <div className="flex justify-end">
          <Button onClick={handleFixPricing} disabled={fixingPricing} variant="outline" size="sm">
            {fixingPricing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Fix Stripe Pricing
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-primary/10 rounded-lg">
                  {plan.id === 'trial' && <Zap className="h-6 w-6 text-primary" />}
                  {plan.id === 'starter' && <Users className="h-6 w-6 text-primary" />}
                  {plan.id === 'professional' && <Building className="h-6 w-6 text-primary" />}
                  {plan.id === 'business' && <Crown className="h-6 w-6 text-primary" />}
                  {plan.id === 'enterprise' && <Crown className="h-6 w-6 text-primary" />}
                </div>
                
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/{plan.isMonthly ? 'month' : 'year'}</span>}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handleSubscribe(plan.id, plan.id)}
                  disabled={checkingOut === plan.id}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {checkingOut === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {plan.price === 0 ? 'Start Free Trial' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-center mb-8">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-4 text-left">Features</th>
                  <th className="border border-gray-200 p-4 text-center">Free Trial</th>
                  <th className="border border-gray-200 p-4 text-center">Starter</th>
                  <th className="border border-gray-200 p-4 text-center">Professional</th>
                  <th className="border border-gray-200 p-4 text-center">Business</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 p-4">API Calls</td>
                  <td className="border border-gray-200 p-4 text-center">1,000/month</td>
                  <td className="border border-gray-200 p-4 text-center">10,000/month</td>
                  <td className="border border-gray-200 p-4 text-center">100,000/month</td>
                  <td className="border border-gray-200 p-4 text-center">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 p-4">Support</td>
                  <td className="border border-gray-200 p-4 text-center">Community</td>
                  <td className="border border-gray-200 p-4 text-center">Email</td>
                  <td className="border border-gray-200 p-4 text-center">Priority</td>
                  <td className="border border-gray-200 p-4 text-center">24/7 Phone</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-4">Custom Integration</td>
                  <td className="border border-gray-200 p-4 text-center">❌</td>
                  <td className="border border-gray-200 p-4 text-center">❌</td>
                  <td className="border border-gray-200 p-4 text-center">✅</td>
                  <td className="border border-gray-200 p-4 text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Pricing;
