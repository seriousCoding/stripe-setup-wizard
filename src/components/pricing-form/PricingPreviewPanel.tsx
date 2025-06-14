
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PricingFormData } from '@/pages/StripePricing';

interface PricingPreviewPanelProps {
  watchedValues: PricingFormData;
  previewAmount: string;
  previewQuantity: string;
  setPreviewQuantity: (value: string) => void;
  formatCurrency: (amount: string) => string;
}

export const PricingPreviewPanel: React.FC<PricingPreviewPanelProps> = ({
  watchedValues,
  previewAmount,
  previewQuantity,
  setPreviewQuantity,
  formatCurrency,
}) => {
  const isMetered = watchedValues.billingType === 'recurring' && watchedValues.usageType === 'metered';

  return (
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
  );
};
