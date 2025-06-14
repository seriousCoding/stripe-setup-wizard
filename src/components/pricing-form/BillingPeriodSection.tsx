import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { PricingFormData } from '@/hooks/useStripePricingForm';

interface BillingPeriodSectionProps {
  control: Control<PricingFormData>;
  watchedValues: PricingFormData;
}

export const BillingPeriodSection: React.FC<BillingPeriodSectionProps> = ({ control, watchedValues }) => {
  const isMetered = watchedValues.billingType === 'recurring' && watchedValues.usageType === 'metered';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Billing Period</h3>
      <FormField
        control={control}
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
        control={control}
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
            {(watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package') &&
              <p className="text-sm text-muted-foreground">Automatically set to 'Licensed'.</p>
            }
            {(watchedValues.pricingModel === 'usageBased' || watchedValues.pricingModel === 'payAsYouGo') &&
              <p className="text-sm text-muted-foreground">Automatically set to 'Metered'.</p>
            }
            <FormMessage />
          </FormItem>
        )}
      />

      {isMetered && (
        <>
          <FormField
            control={control}
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
            control={control}
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
        control={control}
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
  );
};
