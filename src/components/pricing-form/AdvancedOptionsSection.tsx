import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { PricingFormData } from '@/hooks/useStripePricingForm';

interface AdvancedOptionsSectionProps {
  control: Control<PricingFormData>;
}

export const AdvancedOptionsSection: React.FC<AdvancedOptionsSectionProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Advanced Options</h3>
      <FormField
        control={control}
        name="description" // This was 'description' in original form, assuming it's price description
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
        control={control}
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
  );
};
