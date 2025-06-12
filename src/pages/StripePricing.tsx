
import React, { useState } from 'react';
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

interface PricingFormData {
  billingType: 'recurring' | 'oneOff';
  pricingModel: 'flatRate' | 'package' | 'tiered' | 'usageBased' | 'payAsYouGo';
  amount: string;
  currency: string;
  taxBehavior: 'inclusive' | 'exclusive' | 'unspecified';
  interval: 'day' | 'week' | 'month' | 'year' | 'quarter' | 'semiannual' | 'custom';
  description: string;
  lookupKey: string;
  unitQuantity: string;
  productName: string;
  productDescription: string;
  // Pay-as-you-go specific fields
  hasMeteredUsage: boolean;
  meteredDisplayName: string;
  meteredEventName: string;
  meteredPricePerUnit: string;
  meteredAggregation: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  // Additional original fields
  nickname: string;
  trialPeriodDays: string;
  usageType: 'licensed' | 'metered';
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
      unitQuantity: '1',
      productName: '',
      productDescription: '',
      hasMeteredUsage: false,
      meteredDisplayName: '',
      meteredEventName: '',
      meteredPricePerUnit: '',
      meteredAggregation: 'sum',
      nickname: '',
      trialPeriodDays: '',
      usageType: 'licensed',
      billingScheme: 'per_unit',
      transformQuantityDivideBy: '',
      transformQuantityRound: 'up',
    },
  });

  const watchedValues = form.watch();

  React.useEffect(() => {
    const amount = parseFloat(watchedValues.amount || '0');
    const quantity = parseInt(watchedValues.unitQuantity || '1');
    const total = (amount * quantity).toFixed(2);
    setPreviewAmount(total);
    setPreviewQuantity(quantity.toString());

    // Auto-set amount to $0 for pay-as-you-go
    if (watchedValues.pricingModel === 'payAsYouGo' && watchedValues.amount !== '0') {
      form.setValue('amount', '0');
      form.setValue('hasMeteredUsage', true);
      form.setValue('usageType', 'metered');
    }
  }, [watchedValues.amount, watchedValues.unitQuantity, watchedValues.pricingModel, form]);

  const onSubmit = async (data: PricingFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Creating Stripe pricing with data:', data);

      // First create the product
      const productResult = await stripeService.createProduct({
        name: data.productName || `Product for ${data.pricingModel} pricing`,
        description: data.productDescription || data.description || undefined,
      });

      if (productResult.error) {
        throw new Error(productResult.error);
      }

      // Create the base price
      const priceData: any = {
        product: productResult.product.id,
        unit_amount: Math.round(parseFloat(data.amount) * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        nickname: data.nickname || undefined,
        metadata: {
          pricing_model: data.pricingModel,
          tax_behavior: data.taxBehavior,
          lookup_key: data.lookupKey || undefined,
        },
      };

      // Add billing scheme and usage type
      if (data.billingScheme) {
        priceData.billing_scheme = data.billingScheme;
      }

      // Add transform quantity if specified
      if (data.transformQuantityDivideBy) {
        priceData.transform_quantity = {
          divide_by: parseInt(data.transformQuantityDivideBy),
          round: data.transformQuantityRound,
        };
      }

      // Add recurring data if it's a recurring price
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

        // Add trial period if specified
        if (data.trialPeriodDays) {
          priceData.recurring.trial_period_days = parseInt(data.trialPeriodDays);
        }
      }

      const priceResult = await stripeService.createPrice(priceData);

      if (priceResult.error) {
        throw new Error(priceResult.error);
      }

      // If pay-as-you-go with metered usage, create additional metered price
      if (data.pricingModel === 'payAsYouGo' && data.hasMeteredUsage && data.meteredPricePerUnit) {
        const meteredPriceData = {
          product: productResult.product.id,
          unit_amount: Math.round(parseFloat(data.meteredPricePerUnit) * 100),
          currency: data.currency.toLowerCase(),
          nickname: `${data.nickname || 'Metered'} - Usage`,
          billing_scheme: 'per_unit',
          recurring: {
            interval: 'month' as const,
            usage_type: 'metered' as const,
            aggregate_usage: data.meteredAggregation,
          },
          metadata: {
            pricing_model: 'metered_usage',
            event_name: data.meteredEventName,
          },
        };

        await stripeService.createPrice(meteredPriceData);
      }

      toast({
        title: "Success!",
        description: `Stripe ${data.billingType === 'recurring' ? 'recurring' : 'one-time'} price created successfully.`,
      });

      // Reset form
      form.reset();

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
      currency: 'USD',
    }).format(num);
  };

  const getPricingModelDescription = (model: string) => {
    switch (model) {
      case 'flatRate':
        return 'Offer a fixed price for a single unit or package.';
      case 'package':
        return 'Price by package, bundle, or group of units.';
      case 'tiered':
        return 'Offer different price points based on unit quantity.';
      case 'usageBased':
        return 'Pay-as-you-go billing based on metered usage.';
      case 'payAsYouGo':
        return 'Card on file with $0 base price, charge for actual usage.';
      default:
        return '';
    }
  };

  return (
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
                        <FormLabel>Billing Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
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
                        <FormLabel>Choose your pricing model</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pricing model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flatRate">
                              <div>
                                <div className="font-medium">Flat rate</div>
                                <div className="text-sm text-muted-foreground">Offer a fixed price for a single unit or package.</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="package">
                              <div>
                                <div className="font-medium">Package pricing</div>
                                <div className="text-sm text-muted-foreground">Price by package, bundle, or group of units.</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="tiered">
                              <div>
                                <div className="font-medium">Tiered pricing</div>
                                <div className="text-sm text-muted-foreground">Offer different price points based on unit quantity.</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="usageBased">
                              <div>
                                <div className="font-medium">Usage-based</div>
                                <div className="text-sm text-muted-foreground">Pay-as-you-go billing based on metered usage.</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="payAsYouGo">
                              <div>
                                <div className="font-medium">Pay-as-you-go</div>
                                <div className="text-sm text-muted-foreground">Card on file with $0 base price, charge for actual usage.</div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground mt-2">
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
                          <FormLabel>Product Name (required)</FormLabel>
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
                          <FormLabel>Product Description</FormLabel>
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
                    <h3 className="text-lg font-semibold">Price</h3>
                    
                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Amount (required)
                            {watchedValues.pricingModel === 'payAsYouGo' && (
                              <Badge variant="secondary" className="ml-2">Auto-set to $0</Badge>
                            )}
                          </FormLabel>
                          <div className="flex">
                            <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                              <span>$</span>
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

                    {/* Nickname */}
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Nickname</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Standard Plan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tax Behavior */}
                    <FormField
                      control={form.control}
                      name="taxBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Include tax in price</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unspecified">Select...</SelectItem>
                              <SelectItem value="inclusive">
                                <div>
                                  <div>Yes</div>
                                  <div className="text-sm text-muted-foreground">Tax is included in the price.</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="exclusive">
                                <div>
                                  <div>No</div>
                                  <div className="text-sm text-muted-foreground">Tax is added to the price.</div>
                                </div>
                              </SelectItem>
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
                        <h3 className="text-lg font-semibold">Billing period</h3>
                        
                        <FormField
                          control={form.control}
                          name="interval"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price recurring interval</FormLabel>
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
                                  <SelectItem value="custom">Custom</SelectItem>
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
                              <FormLabel>Usage Type</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trialPeriodDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trial Period (days)</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Pay-as-you-go Metered Usage */}
                  {watchedValues.pricingModel === 'payAsYouGo' && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Metered Usage Configuration</h3>
                        
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="hasMeteredUsage"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Enable metered usage billing</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        {watchedValues.hasMeteredUsage && (
                          <>
                            <FormField
                              control={form.control}
                              name="meteredPricePerUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price per unit of usage</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.01" placeholder="0.10" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="meteredEventName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usage Event Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="api_calls" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="meteredAggregation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usage Aggregation</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sum">Sum</SelectItem>
                                      <SelectItem value="last_during_period">Last During Period</SelectItem>
                                      <SelectItem value="last_ever">Last Ever</SelectItem>
                                      <SelectItem value="max">Maximum</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Advanced Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Advanced</h3>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Use to organize your prices. Not shown to customers." />
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
                          <FormLabel>Lookup key</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. standard_monthly" />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            <a
                              href="https://stripe.com/docs/products-prices/manage-prices#lookup-keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Lookup keys
                            </a>{' '}
                            make it easier to manage and make future pricing changes by using a unique key for each price.
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingScheme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Scheme</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transformQuantityDivideBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transform Quantity (Divide By)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="1" />
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
                            <FormLabel>Rounding</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
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

                  {/* Submit Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline">Back</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Price'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Preview</CardTitle>
              <CardDescription className="text-muted-foreground">Estimate totals based on pricing model, unit quantity, and tax.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Unit quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={previewQuantity}
                  onChange={(e) => {
                    setPreviewQuantity(e.target.value);
                    form.setValue('unitQuantity', e.target.value);
                  }}
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="text-sm">
                {previewQuantity} × {formatCurrency(watchedValues.amount || '0')} = {formatCurrency(previewAmount)}
              </div>

              {watchedValues.pricingModel === 'payAsYouGo' && watchedValues.hasMeteredUsage && (
                <div className="text-sm text-muted-foreground">
                  + {formatCurrency(watchedValues.meteredPricePerUnit || '0')} per usage unit
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(previewAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>
                    Total per {watchedValues.billingType === 'recurring' ? watchedValues.interval : 'payment'}
                  </span>
                  <span>{formatCurrency(previewAmount)}</span>
                </div>
                {watchedValues.billingType === 'recurring' && (
                  <div className="text-xs text-muted-foreground">
                    Billed at the start of the period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StripePricing;
