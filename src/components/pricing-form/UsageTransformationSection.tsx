import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { PricingFormData } from '@/hooks/useStripePricingForm';

interface UsageTransformationSectionProps {
  control: Control<PricingFormData>;
  watchedValues: PricingFormData;
}

export const UsageTransformationSection: React.FC<UsageTransformationSectionProps> = ({ control, watchedValues }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Usage Transformation (Optional)</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
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
          control={control}
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
  );
};
