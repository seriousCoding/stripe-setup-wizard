
import { useState, useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';

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

interface UseStripePricingFormReturn {
  form: UseFormReturn<PricingFormData>;
  isSubmitting: boolean;
  onSubmit: (data: PricingFormData) => Promise<void>;
}

export const useStripePricingForm = (): UseStripePricingFormReturn => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const { pricingModel, billingType } = watchedValues;
    let newAmount = form.getValues('amount');
    let newUsageType = form.getValues('usageType');
    let newBillingScheme = form.getValues('billingScheme');

    if (pricingModel === 'payAsYouGo') {
      newAmount = '0';
      if (billingType === 'recurring') newUsageType = 'metered';
      newBillingScheme = 'per_unit';
    } else if (pricingModel === 'usageBased') {
      if (billingType === 'recurring') newUsageType = 'metered';
      newBillingScheme = 'per_unit'; 
    } else if (pricingModel === 'tiered') {
      newBillingScheme = 'tiered';
    } else { // flatRate, package
      if (billingType === 'recurring') newUsageType = 'licensed';
      newBillingScheme = 'per_unit';
    }

    if (newAmount !== form.getValues('amount')) {
      form.setValue('amount', newAmount, { shouldValidate: true });
    }
    if (newUsageType !== form.getValues('usageType') && billingType === 'recurring') {
      form.setValue('usageType', newUsageType, { shouldValidate: true });
    }
    if (newBillingScheme !== form.getValues('billingScheme')) {
      form.setValue('billingScheme', newBillingScheme, { shouldValidate: true });
    }
  }, [watchedValues.pricingModel, watchedValues.billingType, form]);

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
        const amountValue = parseFloat(data.amount);
        if (isNaN(amountValue) || amountValue < 0) {
            throw new Error("Invalid amount provided.");
        }
        priceData.unit_amount = Math.round(amountValue * 100); // Send as integer cents
      } else {
        toast({ title: "Tiered Pricing Note", description: "UI for defining specific tiers is not yet implemented. Backend supports it if data is passed.", duration: 7000});
        const baseAmountValue = parseFloat(data.amount);
        if (!isNaN(baseAmountValue) && baseAmountValue > 0) {
            priceData.unit_amount = Math.round(baseAmountValue * 100);
        }
      }

      if (data.transformQuantityDivideBy && data.billingScheme !== 'tiered') {
        const divideBy = parseInt(data.transformQuantityDivideBy);
        if (isNaN(divideBy) || divideBy <= 0) {
            throw new Error("Invalid 'Divide usage by' value.");
        }
        priceData.transform_quantity = {
          divide_by: divideBy,
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
          const trialDays = parseInt(data.trialPeriodDays);
          if (!isNaN(trialDays) && trialDays >= 0) {
            priceData.recurring.trial_period_days = trialDays;
          } else if (data.trialPeriodDays !== '' && data.trialPeriodDays !== null) { // Allow empty string/null for no trial
             throw new Error("Invalid trial period days.");
          }
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

      if (priceResult.error || !priceResult.price) {
        throw new Error(priceResult.error || "Failed to create price");
      }

      toast({
        title: "Success!",
        description: `Stripe product and price created successfully. Price ID: ${priceResult.price.id}`,
      });

      form.reset();
      // If previewQuantity state were here, you'd reset it: setPreviewQuantity('1');
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

  return { form, isSubmitting, onSubmit };
};
