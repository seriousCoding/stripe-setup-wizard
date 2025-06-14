
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// Removed useToast import, it's now in the hook
// Removed stripeService import, it's now in the hook
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { ProductInformationSection } from '@/components/pricing-form/ProductInformationSection';
import { PriceDetailsSection } from '@/components/pricing-form/PriceDetailsSection';
import { BillingPeriodSection } from '@/components/pricing-form/BillingPeriodSection';
import { UsageTransformationSection } from '@/components/pricing-form/UsageTransformationSection';
import { AdvancedOptionsSection } from '@/components/pricing-form/AdvancedOptionsSection';
import { PricingPreviewPanel } from '@/components/pricing-form/PricingPreviewPanel';
import { useStripePricingForm, PricingFormData } from '@/hooks/useStripePricingForm'; // Import the hook and type

// PricingFormData is now exported from useStripePricingForm.ts

const StripePricing = () => {
  const { form, isSubmitting, onSubmit } = useStripePricingForm();
  const [previewAmount, setPreviewAmount] = useState('0.00');
  const [previewQuantity, setPreviewQuantity] = useState('1');

  const watchedValues = form.watch();

  useEffect(() => {
    const amountValue = parseFloat(watchedValues.amount || '0');
    const quantityValue = parseInt(previewQuantity || '1');
    const total = (amountValue * quantityValue).toFixed(2);
    setPreviewAmount(total);
    // The useEffect that was here for updating form.setValue('amount', etc.)
    // has been moved to the useStripePricingForm hook.
  }, [watchedValues.amount, previewQuantity]);


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
                                // This logic is now primarily handled by the useEffect in the hook,
                                // but direct setValue here ensures immediate UI feedback if needed or for fields not covered by the hook's effect.
                                // The hook's useEffect will also run and ensure consistency.
                                if (value === 'oneOff') {
                                  form.setValue('usageType', 'licensed'); // Ensure usageType is licensed for oneOff
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
