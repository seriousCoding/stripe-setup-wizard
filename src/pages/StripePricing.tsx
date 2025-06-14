import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { ProductInformationSection } from '@/components/pricing-form/ProductInformationSection';
import { PriceDetailsSection } from '@/components/pricing-form/PriceDetailsSection';
import { BillingPeriodSection } from '@/components/pricing-form/BillingPeriodSection';
import { UsageTransformationSection } from '@/components/pricing-form/UsageTransformationSection';
import { AdvancedOptionsSection } from '@/components/pricing-form/AdvancedOptionsSection';
import { PricingPreviewPanel } from '@/components/pricing-form/PricingPreviewPanel';

export interface PricingFormData {
  billingType: 'recurring' | 'oneOff';
  pricingModel: 'flatRate' | 'package' | 'tiered' | 'usageBased' | 'payAsYouGo';
  amount: string;
  currency: string;
  taxBehavior: 'inclusive' | 'exclusive' | 'unspecified';
  interval: 'day' | 'week' | 'month' | 'year' | 'quarter' | 'semiannual';
  description: string; // Price description (internal)
  lookupKey: string;
  productName: string;
  productDescription: string;
  trialPeriodDays: string;
  usageType: 'licensed' | 'metered';
  meteredAggregation: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  meteredEventName: string;
  nickname: string;
  billingScheme: 'per_unit' | 'tiered';
  transformQuantityDivideBy: string;
  transformQuantityRound: 'up' | 'down';
}

const StripePricing = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAmount, setPreviewAmount] = useState('0.00');
  const [previewQuantity, setPreviewQuantity] = useState('1');

  const form = useForm<PricingFormData>({
    defaultValues: {
      billingType: 'recurring',
      pricingModel: 'flatRate',
      amount: '',
      currency: 'USD',
      taxBehavior: 'exclusive',
      interval: 'month',
      description: '',
      lookupKey: '',
      productName: '',
      productDescription: '',
      trialPeriodDays: '',
      usageType: 'licensed',
      billingScheme: 'per_unit',
      meteredAggregation: 'sum',
      meteredEventName: '',
      nickname: '',
      transformQuantityDivideBy: '',
      transformQuantityRound: 'up',
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const amountValue = parseFloat(watchedValues.amount || '0');
    const quantityValue = parseInt(previewQuantity || '1'); // Use previewQuantity for calculation
    const total = (amountValue * quantityValue).toFixed(2);
    setPreviewAmount(total);

    // Logic based on pricingModel
    const { pricingModel, billingType } = watchedValues;
    let newAmount = watchedValues.amount;
    let newUsageType = watchedValues.usageType;
    let newBillingScheme = watchedValues.billingScheme;

    if (pricingModel === 'payAsYouGo') {
      newAmount = '0';
      if (billingType === 'recurring') newUsageType = 'metered';
      newBillingScheme = 'per_unit';
    } else if (pricingModel === 'usageBased') {
      if (billingType === 'recurring') newUsageType = 'metered';
      newBillingScheme = 'per_unit';
    } else if (pricingModel === 'tiered') {
      newBillingScheme = 'tiered';
      // For tiered, amount field might represent a base fee or be unused if tiers define all costs
      // For now, we keep 'amount' field active but it might need reconsideration for tiered model
    } else { // flatRate, package
      if (billingType === 'recurring') newUsageType = 'licensed';
      newBillingScheme = 'per_unit';
    }

    if (newAmount !== watchedValues.amount) form.setValue('amount', newAmount);
    if (newUsageType !== watchedValues.usageType && billingType === 'recurring') form.setValue('usageType', newUsageType);
    if (newBillingScheme !== watchedValues.billingScheme) form.setValue('billingScheme', newBillingScheme);

  }, [
    watchedValues.amount,
    previewQuantity,
    watchedValues.pricingModel,
    watchedValues.billingType,
    watchedValues.usageType,
    watchedValues.billingScheme,
    form
  ]);

  const onSubmit = async (data: PricingFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Creating Stripe pricing with data:', data);

      const productResult = await stripeService.createProduct({
        name: data.productName || `Product for ${data.pricingModel} pricing`,
        description: data.productDescription || data.description || undefined,
      });

      if (productResult.error || !productResult.product) {
        throw new Error(productResult.error || "Failed to create product");
      }

      const priceData: any = {
        product: productResult.product.id,
        currency: data.currency.toLowerCase(),
        nickname: data.nickname || undefined,
        tax_behavior: data.taxBehavior,
        lookup_key: data.lookupKey || undefined,
        billing_scheme: data.billingScheme,
        metadata: {
          pricing_model: data.pricingModel,
        },
      };
      
      if (data.billingScheme !== 'tiered') {
        priceData.unit_amount = parseFloat(data.amount); 
      } else {
        toast({ title: "Tiered Pricing Note", description: "UI for defining specific tiers is not yet implemented. Backend supports it if data is passed.", duration: 7000});
      }

      if (data.transformQuantityDivideBy && data.billingScheme !== 'tiered') {
        priceData.transform_quantity = {
          enabled: true,
          divide_by: parseInt(data.transformQuantityDivideBy),
          round: data.transformQuantityRound,
        };
      }
      
      if (data.billingType === 'recurring') {
        let interval: 'day' | 'week' | 'month' | 'year' = 'month';
        let interval_count = 1;

        switch (data.interval) {
          case 'quarter':
            interval = 'month';
            interval_count = 3;
            break;
          case 'semiannual':
            interval = 'month';
            interval_count = 6;
            break;
          default:
            interval = data.interval as 'day' | 'week' | 'month' | 'year';
            break;
        }

        priceData.recurring = {
          interval,
          interval_count,
          usage_type: data.usageType,
        };
        
        if (data.trialPeriodDays) {
          priceData.recurring.trial_period_days = parseInt(data.trialPeriodDays);
        }

        if (data.usageType === 'metered') {
           priceData.recurring.aggregate_usage = data.meteredAggregation;
           if (data.meteredEventName) {
               if (!priceData.metadata) priceData.metadata = {};
               priceData.metadata.event_name = data.meteredEventName;
           }
        }
      }
      
      const priceResult = await stripeService.createPrice(priceData);

      if (priceResult.error) {
        throw new Error(priceResult.error);
      }

      toast({
        title: "Success!",
        description: `Stripe product and price created successfully. Price ID: ${priceResult.price.id}`,
      });

      form.reset();
      setPreviewQuantity('1');

    } catch (error: any) {
      console.error('Error creating Stripe pricing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe pricing",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: watchedValues.currency.toUpperCase() || 'USD', 
    }).format(num);
  };

  const getPricingModelDescription = (model: string) => {
    switch (model) {
      case 'flatRate':
        return 'A simple, fixed price for your product or service.';
      case 'package':
        return 'Price by a bundle or group of units (e.g., 10 units for $X). Uses "per_unit" billing scheme.';
      case 'tiered':
        return 'Price per unit changes as quantity increases (e.g., first 10 units at $X, next 10 at $Y). UI for tiers coming soon.';
      case 'usageBased':
        return 'Charge based on actual consumption (e.g., per GB, per API call). Requires metered billing.';
      case 'payAsYouGo':
        return 'A $0 base recurring price, with charges based purely on metered usage. Ideal for card-on-file scenarios.';
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <DashboardLayout
        title="Stripe Pricing Builder"
        description="Create and configure Stripe products and pricing models"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Price Builder</CardTitle>
                <CardDescription className="text-muted-foreground">Configure your Stripe pricing model</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Billing Type */}
                    <FormField
                      control={form.control}
                      name="billingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Billing Type
                            <InfoIconWithTooltip description="Choose 'Recurring' for subscriptions or 'One-off' for single payments." />
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === 'oneOff') {
                                  form.setValue('usageType', 'licensed');
                                }
                              }}
                              className="flex space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="recurring" id="recurring" />
                                <Label htmlFor="recurring" className="cursor-pointer">
                                  <div>
                                    <div className="font-medium">Recurring</div>
                                    <div className="text-sm text-muted-foreground">Charge an ongoing fee</div>
                                  </div>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="oneOff" id="oneOff" />
                                <Label htmlFor="oneOff" className="cursor-pointer">
                                  <div>
                                    <div className="font-medium">One-off</div>
                                    <div className="text-sm text-muted-foreground">Charge a one-time fee</div>
                                  </div>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Pricing Model */}
                    <FormField
                      control={form.control}
                      name="pricingModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Choose your pricing model
                            <InfoIconWithTooltip description="Select the strategy that best fits how you want to charge for this product." />
                          </FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pricing model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="flatRate">Flat rate</SelectItem>
                              <SelectItem value="package">Package pricing</SelectItem>
                              <SelectItem value="tiered">Tiered pricing</SelectItem>
                              <SelectItem value="usageBased">Usage-based</SelectItem>
                              <SelectItem value="payAsYouGo">Pay-as-you-go</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-muted-foreground mt-2 min-h-[40px]">
                            {getPricingModelDescription(watchedValues.pricingModel)}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />
                    <ProductInformationSection control={form.control} />
                    <Separator />
                    <PriceDetailsSection control={form.control} watchedValues={watchedValues} setValue={form.setValue} />

                    {watchedValues.billingType === 'recurring' && (
                      <>
                        <Separator />
                        <BillingPeriodSection control={form.control} watchedValues={watchedValues} />
                      </>
                    )}

                    {watchedValues.billingScheme !== 'tiered' && (
                      <>
                        <Separator />
                        <UsageTransformationSection control={form.control} watchedValues={watchedValues} />
                      </>
                    )}

                    <Separator />
                    <AdvancedOptionsSection control={form.control} />

                    <div className="flex justify-end pt-6">
                      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? 'Creating...' : 'Create Product and Price'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <PricingPreviewPanel
              watchedValues={watchedValues}
              previewAmount={previewAmount}
              previewQuantity={previewQuantity}
              setPreviewQuantity={setPreviewQuantity}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
};

export default StripePricing;
