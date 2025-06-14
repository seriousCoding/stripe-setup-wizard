import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';
import { PricingFormData } from '@/hooks/useStripePricingForm'; // Updated import

interface PriceDetailsSectionProps {
  control: Control<PricingFormData>;
  watchedValues: PricingFormData;
  setValue: UseFormSetValue<PricingFormData>;
}

export const PriceDetailsSection: React.FC<PriceDetailsSectionProps> = ({ control, watchedValues, setValue }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Price Details</h3>
      <FormField
        control={control}
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
                <Select value={watchedValues.currency} onValueChange={(value) => setValue('currency', value as PricingFormData['currency'])}>
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
        control={control}
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
        control={control}
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
            {(watchedValues.pricingModel === 'flatRate' || watchedValues.pricingModel === 'package' || watchedValues.pricingModel === 'usageBased' || watchedValues.pricingModel === 'payAsYouGo') &&
              <p className="text-sm text-muted-foreground">Automatically set to 'Per Unit' for this pricing model.</p>
            }
            {watchedValues.pricingModel === 'tiered' &&
              <p className="text-sm text-muted-foreground">Automatically set to 'Tiered' for this pricing model. Define tiers in Stripe Dashboard after creation for now.</p>
            }
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
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
  );
};
