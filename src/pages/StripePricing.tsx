import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip'; // Added
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip'; // Added

interface PricingFormData {
  billingType: 'recurring' | 'oneOff';
  pricingModel: 'flatRate' | 'package' | 'tiered' | 'usageBased' | 'payAsYouGo';
  amount: string; // Base amount for flat/package, or $0 for usage-based if applicable
  currency: string;
  taxBehavior: 'inclusive' | 'exclusive' | 'unspecified';
  interval: 'day' | 'week' | 'month' | 'year' | 'quarter' | 'semiannual'; // Removed 'custom' for simplicity now
  description: string; // Price description (internal)
  lookupKey: string;
  // unitQuantity is for preview only, not directly part of Stripe Price object creation in this context
  // productName and productDescription are for creating the product
  productName: string;
  productDescription: string;
  
  // Recurring specific
  trialPeriodDays: string;
  usageType: 'licensed' | 'metered'; // For recurring prices

  // Metered / Usage-based specific fields (applies if usageType is 'metered')
  meteredAggregation: 'sum' | 'last_during_period' | 'last_ever' | 'max'; // If usageType is 'metered'
  meteredEventName: string; // If usageType is 'metered', used in metadata

  // Tiered specific (billingScheme will be 'tiered')
  // UI for tiers (array of tier objects) and tiers_mode ('volume' | 'graduated') would be complex.
  // For now, selecting 'tiered' model will set billingScheme to 'tiered'.
  // Actual tier definition will be a future enhancement to this form.
  
  // General Price fields
  nickname: string; // Price nickname
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
    watchedValues.usageType, // ensure effect runs if usageType changes externally
    watchedValues.billingScheme, // ensure effect runs if billingScheme changes externally
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
          // Add other relevant metadata if needed
        },
      };
      
      // unit_amount is conditional
      if (data.billingScheme !== 'tiered') {
        priceData.unit_amount = parseFloat(data.amount); // Send as float, service will convert to cents
      } else {
        // For tiered pricing, unit_amount is not set at the top level.
        // Tiers themselves will contain unit_amounts or flat_amounts.
        // The UI for defining tiers is not yet built in this form.
        // For now, we'd expect `tiers` and `tiers_mode` in `data` if implementing fully.
        // priceData.tiers = []; // Placeholder for actual tiers data
        // priceData.tiers_mode = 'volume'; // or 'graduated', needs UI
        // Since tier UI is not built, sending tiered without tiers will likely fail at Stripe.
        // This part needs to be expanded when tier UI is added.
        toast({ title: "Tiered Pricing Note", description: "UI for defining specific tiers is not yet implemented. Backend supports it if data is passed.", duration: 7000});
      }


      if (data.transformQuantityDivideBy && data.billingScheme !== 'tiered') {
        priceData.transform_quantity = {
          enabled: true, // Assuming if divide_by is set, it's enabled
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
               priceData.metadata.event_name = data.meteredEventName; // Store event name for meter reference
           }
        }
      }
      
      // If Pay-As-You-Go model with $0 base price, we might create a separate metered price
      // for the actual usage, or configure the $0 price with metered usage.
      // The current logic correctly sets usageType to 'metered' for $0 recurring prices.
      // The stripeService.createPrice handles amount conversion.

      const priceResult = await stripeService.createPrice(priceData);

      if (priceResult.error) {
        throw new Error(priceResult.error);
      }

      toast({
        title: "Success!",
        description: `Stripe product and price created successfully. Price ID: ${priceResult.price.id}`,
      });

      form.reset();
      setPreviewQuantity('1'); // Reset preview quantity

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
      currency: watchedValues.currency.toUpperCase() || 'USD', // Use watched currency
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


  const isMetered = watchedValues.billingType === 'recurring' && watchedValues.usageType === 'metered';

  return (
    <TooltipProvider> {/* Added TooltipProvider */}
      <DashboardLayout
        title="Stripe Pricing Builder"
        description="Create and configure Stripe products and pricing models"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
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
                                // If switching to oneOff, usageType becomes irrelevant for Stripe Price object direct creation
                                if (value === 'oneOff') {
                                  form.setValue('usageType', 'licensed'); // Default or make it non-applicable
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

                    {/* Product Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Product Information</h3>
                      
                      <FormField
                        control={form.control}
                        name="productName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Product Name (required)
                              <InfoIconWithTooltip description="The name of the product as it will appear to customers and in your Stripe dashboard." />
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter product name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="productDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Product Description
                              <InfoIconWithTooltip description="An optional description for the product. Displayed in Stripe Checkout and customer portal." />
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Describe what customers are purchasing" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                    <Separator />

                    {/* Price Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Price Details</h3>
                      
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Amount
                              {watchedValues.pricingModel === 'payAsYouGo' && (
                                <Badge variant="secondary" className="ml-2">Auto-set to $0</Badge>
                              )}
                               <InfoIconWithTooltip description={
                                watchedValues.billingScheme === 'tiered' 
                                ? "For tiered pricing, this can be a base fee. Tiers define per-unit costs." 
                                : "The base price per unit or for the entire package. For 'Pay-As-You-Go', this is typically $0."
                               } />
                            </FormLabel>
                            <div className="flex">
                              <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                                <span>{watchedValues.currency === "USD" ? "$" : watchedValues.currency === "EUR" ? "€" : watchedValues.currency === "GBP" ? "£" : "$"}</span>
                              </div>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="0.00"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="rounded-l-none border-l-0"
                                  disabled={watchedValues.pricingModel === 'payAsYouGo'}
                                />
                              </FormControl>
                              <FormControl>
                                <Select value={watchedValues.currency} onValueChange={(value) => form.setValue('currency', value)}>
                                  <SelectTrigger className="w-32 rounded-l-none border-l-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="CAD">CAD</SelectItem>
                                    <SelectItem value="AUD">AUD</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nickname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Price Nickname
                              <InfoIconWithTooltip description="An internal name for the price, not shown to customers. Helps organize prices in Stripe." />
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Standard Plan Monthly" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="billingScheme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Billing Scheme
                              <InfoIconWithTooltip description="'Per Unit': Fixed amount per unit. 'Tiered': Unit price changes based on quantity/usage tiers." />
                            </FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package' || watchedValues.pricingModel === 'usageBased' || watchedValues.pricingModel === 'payAsYouGo'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="per_unit">Per Unit</SelectItem>
                                <SelectItem value="tiered">Tiered</SelectItem>
                              </SelectContent>
                            </Select>
                            { (watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package' || watchedValues.pricingModel === 'usageBased' || watchedValues.pricingModel === 'payAsYouGo') &&
                              <p className="text-sm text-muted-foreground">Automatically set to 'Per Unit' for this pricing model.</p>
                            }
                            { watchedValues.pricingModel === 'tiered' &&
                              <p className="text-sm text-muted-foreground">Automatically set to 'Tiered' for this pricing model. Define tiers in Stripe Dashboard after creation for now.</p>
                            }
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxBehavior"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Include tax in price
                              <InfoIconWithTooltip description="Specifies if the price includes or excludes taxes. 'Unspecified' uses your Stripe Tax settings." />
                            </FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unspecified">Unspecified (use account default)</SelectItem>
                                <SelectItem value="inclusive">Inclusive (tax is part of the price)</SelectItem>
                                <SelectItem value="exclusive">Exclusive (tax is added to the price)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Billing Period (only for recurring) */}
                    {watchedValues.billingType === 'recurring' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Billing Period</h3>
                          
                          <FormField
                            control={form.control}
                            name="interval"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center">
                                  Price recurring interval
                                  <InfoIconWithTooltip description="How often the customer will be charged." />
                                </FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="day">Daily</SelectItem>
                                    <SelectItem value="week">Weekly</SelectItem>
                                    <SelectItem value="month">Monthly</SelectItem>
                                    <SelectItem value="year">Yearly</SelectItem>
                                    <SelectItem value="quarter">Every 3 months</SelectItem>
                                    <SelectItem value="semiannual">Every 6 months</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="usageType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center">
                                  Usage Type
                                  <InfoIconWithTooltip description="'Licensed': Bills a fixed quantity. 'Metered': Bills based on reported usage." />
                                </FormLabel>
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                  disabled={watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package' || watchedValues.pricingModel === 'payAsYouGo' || watchedValues.pricingModel === 'usageBased'}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="licensed">Licensed</SelectItem>
                                    <SelectItem value="metered">Metered</SelectItem>
                                  </SelectContent>
                                </Select>
                                { (watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package') &&
                                  <p className="text-sm text-muted-foreground">Automatically set to 'Licensed'.</p>
                                }
                                { (watchedValues.pricingModel === 'usageBased' || watchedValues.pricingModel === 'payAsYouGo') &&
                                  <p className="text-sm text-muted-foreground">Automatically set to 'Metered'.</p>
                                }
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {isMetered && (
                            <>
                              <FormField
                                control={form.control}
                                name="meteredAggregation"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center">
                                      Metered Usage Aggregation
                                      <InfoIconWithTooltip description="How Stripe should aggregate reported usage over the billing period. 'Sum' is most common." />
                                    </FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="sum">Sum of usage during period</SelectItem>
                                        <SelectItem value="last_during_period">Last usage reported during period</SelectItem>
                                        <SelectItem value="last_ever">Last usage reported ever</SelectItem>
                                        <SelectItem value="max">Maximum usage during period</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="meteredEventName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center">
                                      Metered Event Name (for metadata)
                                      <InfoIconWithTooltip description="An internal name for the type of usage being metered (e.g., 'api_calls', 'gb_storage'). Used to link to a Stripe Meter." />
                                    </FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., api_calls" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          <FormField
                            control={form.control}
                            name="trialPeriodDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center">
                                  Trial Period (days)
                                  <InfoIconWithTooltip description="Offer a free trial for a number of days before the first charge." />
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" placeholder="0" min="0" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Transform Quantity - shown if not tiered */}
                    {watchedValues.billingScheme !== 'tiered' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Usage Transformation (Optional)</h3>
                           <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="transformQuantityDivideBy"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Divide usage by
                                     <InfoIconWithTooltip description="Transform the quantity before calculating price (e.g., sell in packs of 1000 by dividing reported usage by 1000)." />
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" placeholder="e.g., 1000" min="1" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="transformQuantityRound"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Rounding after division
                                    <InfoIconWithTooltip description="How to round the quantity after division." />
                                  </FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange} disabled={!watchedValues.transformQuantityDivideBy}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="up">Round Up</SelectItem>
                                      <SelectItem value="down">Round Down</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </>
                    )}


                    <Separator />
                    {/* Advanced Section */}
                     <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Advanced Options</h3>
                      
                      <FormField
                        control={form.control}
                        name="description" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Price description (internal)
                              <InfoIconWithTooltip description="An internal description for the price. Not shown to customers. Helps organize prices in Stripe." />
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Monthly standard plan for new users" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lookupKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              Lookup key
                              <InfoIconWithTooltip description="A unique key to retrieve this price via the API, making it easier to manage pricing changes programmatically." />
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., standard_monthly_v1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                    {/* Submit Buttons */}
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

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border sticky top-8">
              <CardHeader>
                <CardTitle className="text-card-foreground">Preview</CardTitle>
                <CardDescription className="text-muted-foreground">Estimate totals based on quantity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {watchedValues.billingScheme !== 'tiered' && (
                  <div>
                    <Label>Unit quantity for preview</Label>
                    <Input
                      type="number"
                      min="1"
                      value={previewQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setPreviewQuantity(val > 0 ? val.toString() : '1');
                      }}
                      className="mt-1"
                    />
                  </div>
                )}
                {watchedValues.billingScheme === 'tiered' && (
                  <p className="text-sm text-muted-foreground">Preview for tiered pricing shows base amount if applicable. Tier calculations happen at invoicing.</p>
                )}


                <Separator />

                <div className="text-sm">
                  {watchedValues.billingScheme !== 'tiered' ? 
                    `${previewQuantity} × ${formatCurrency(watchedValues.amount || '0')} = ${formatCurrency(previewAmount)}`
                    : `Base Amount: ${formatCurrency(watchedValues.amount || '0')}`
                  }
                </div>

                {isMetered && watchedValues.pricingModel !== 'payAsYouGo' && (
                  <div className="text-sm text-muted-foreground">
                    + metered usage (cost depends on consumption)
                  </div>
                )}
                 {watchedValues.pricingModel === 'payAsYouGo' && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Base price is $0. Actual charges depend on metered usage.
                  </div>
                )}


                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(watchedValues.billingScheme !== 'tiered' ? previewAmount : watchedValues.amount || '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="text-muted-foreground">
                      {watchedValues.taxBehavior === 'inclusive' ? 'Included' : 
                       watchedValues.taxBehavior === 'exclusive' ? 'Added at checkout' : 'Per account setting'}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>
                      Total per {watchedValues.billingType === 'recurring' ? watchedValues.interval : 'payment'}
                    </span>
                    <span>{formatCurrency(watchedValues.billingScheme !== 'tiered' ? previewAmount : watchedValues.amount || '0')}</span>
                  </div>
                  {watchedValues.billingType === 'recurring' && (
                    <div className="text-xs text-muted-foreground">
                      Billed at the start of the period. {watchedValues.trialPeriodDays && `After ${watchedValues.trialPeriodDays}-day trial.`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
};

export default StripePricing;
