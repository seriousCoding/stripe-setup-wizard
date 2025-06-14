
import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { PricingFormData } from '@/pages/StripePricing'; // Assuming PricingFormData is exported

interface ProductInformationSectionProps {
  control: Control<PricingFormData>;
}

export const ProductInformationSection: React.FC<ProductInformationSectionProps> = ({ control }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Product Information</h3>
      <FormField
        control={control}
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
        control={control}
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
  );
};
