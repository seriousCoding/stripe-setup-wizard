
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PriceFormData {
  type: 'recurring' | 'one-off';
  pricingModel: 'flatRate' | 'package' | 'tiered' | 'usageBased';
  amount: string;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year' | 'quarter' | 'semiannual';
  taxBehavior: 'inclusive' | 'exclusive' | 'unspecified';
  description: string;
  lookupKey: string;
}

interface PriceCard extends PriceFormData {
  id: string;
  preview: {
    quantity: number;
    subtotal: number;
    tax: number;
    total: number;
  };
}

interface StripePricingFormProps {
  productId?: string;
  onSave?: (prices: PriceCard[]) => void;
}

const StripePricingForm = ({ productId, onSave }: StripePricingFormProps) => {
  const { toast } = useToast();
  const [priceCards, setPriceCards] = useState<PriceCard[]>([
    {
      id: '1',
      type: 'recurring',
      pricingModel: 'flatRate',
      amount: '',
      currency: 'USD',
      interval: 'month',
      taxBehavior: 'exclusive',
      description: '',
      lookupKey: '',
      preview: {
        quantity: 1,
        subtotal: 0,
        tax: 0,
        total: 0
      }
    }
  ]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<{ prices: PriceFormData[] }>({
    defaultValues: {
      prices: priceCards.map(({ preview, id, ...rest }) => rest)
    }
  });

  const watchedPrices = watch('prices');

  const pricingModels = [
    {
      id: 'flatRate',
      name: 'Flat rate',
      description: 'Offer a fixed price for a single unit or package.',
      docs: 'https://stripe.com/docs/products-prices/pricing-models#flat-rate'
    },
    {
      id: 'package',
      name: 'Package pricing',
      description: 'Price by package, bundle, or group of units.'
    },
    {
      id: 'tiered',
      name: 'Tiered pricing',
      description: 'Offer different price points based on unit quantity.'
    },
    {
      id: 'usageBased',
      name: 'Usage-based',
      description: 'Pay-as-you-go billing based on metered usage.'
    }
  ];

  const intervals = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' },
    { value: 'quarter', label: 'Every 3 months' },
    { value: 'semiannual', label: 'Every 6 months' }
  ];

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' }
  ];

  const updatePriceCard = (id: string, field: keyof PriceCard, value: any) => {
    setPriceCards(prev => prev.map(card => {
      if (card.id === id) {
        const updated = { ...card, [field]: value };
        
        // Update preview when amount changes
        if (field === 'amount') {
          const amount = parseFloat(value) || 0;
          updated.preview = {
            ...updated.preview,
            subtotal: amount * updated.preview.quantity,
            total: amount * updated.preview.quantity
          };
        }
        
        // Sync with form
        const cardIndex = priceCards.findIndex(c => c.id === id);
        if (cardIndex !== -1) {
          const { preview, id: cardId, ...formData } = updated;
          setValue(`prices.${cardIndex}`, formData);
        }
        
        return updated;
      }
      return card;
    }));
  };

  const addPriceCard = () => {
    const newCard: PriceCard = {
      id: Date.now().toString(),
      type: 'recurring',
      pricingModel: 'flatRate',
      amount: '',
      currency: 'USD',
      interval: 'month',
      taxBehavior: 'exclusive',
      description: '',
      lookupKey: '',
      preview: {
        quantity: 1,
        subtotal: 0,
        tax: 0,
        total: 0
      }
    };
    setPriceCards(prev => [...prev, newCard]);
    
    // Add to form
    const { preview, id, ...formData } = newCard;
    setValue('prices', [...watchedPrices, formData]);
  };

  const removePriceCard = (id: string) => {
    setPriceCards(prev => prev.filter(card => card.id !== id));
    
    // Remove from form
    const updatedPrices = watchedPrices.filter((_, index) => {
      const cardIndex = priceCards.findIndex(c => c.id === id);
      return index !== cardIndex;
    });
    setValue('prices', updatedPrices);
  };

  const onSubmit = (data: { prices: PriceFormData[] }) => {
    // Validate required fields
    const isValid = priceCards.every(card => card.amount && parseFloat(card.amount) > 0);
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid amounts.",
        variant: "destructive",
      });
      return;
    }

    onSave?.(priceCards);
    toast({
      title: "Prices Saved",
      description: `Successfully configured ${priceCards.length} price${priceCards.length > 1 ? 's' : ''}.`,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Price Configuration</h2>
          <p className="text-muted-foreground">Configure pricing for your product</p>
        </div>
        <Button type="button" onClick={addPriceCard} className="bg-gradient-to-r from-indigo-600 to-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Price
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {priceCards.map((card, index) => (
            <Card key={card.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Price {index + 1}</CardTitle>
                  {priceCards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePriceCard(card.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Price Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Price Type</Label>
                  <Controller
                    name={`prices.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value: 'recurring' | 'one-off') => {
                          field.onChange(value);
                          updatePriceCard(card.id, 'type', value);
                        }}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 border rounded-lg p-4">
                          <RadioGroupItem value="recurring" id={`recurring-${card.id}`} />
                          <div>
                            <Label htmlFor={`recurring-${card.id}`} className="font-medium">
                              Recurring
                            </Label>
                            <p className="text-sm text-muted-foreground">Charge an ongoing fee</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-lg p-4">
                          <RadioGroupItem value="one-off" id={`one-off-${card.id}`} />
                          <div>
                            <Label htmlFor={`one-off-${card.id}`} className="font-medium">
                              One-off
                            </Label>
                            <p className="text-sm text-muted-foreground">Charge a one-time fee</p>
                          </div>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>

                {/* Pricing Model */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Pricing Model</Label>
                  <Controller
                    name={`prices.${index}.pricingModel`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          updatePriceCard(card.id, 'pricingModel', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div>
                                <div className="font-medium">{model.name}</div>
                                <div className="text-sm text-muted-foreground">{model.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {card.pricingModel === 'flatRate' && (
                    <p className="text-sm text-muted-foreground">
                      A single, fixed price.{' '}
                      <a 
                        href="https://stripe.com/docs/products-prices/pricing-models#flat-rate"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View docs
                      </a>
                    </p>
                  )}
                </div>

                {/* Price Amount */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Amount <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Controller
                        name={`prices.${index}.amount`}
                        control={control}
                        rules={{ required: "Amount is required", min: { value: 0.01, message: "Amount must be greater than 0" } }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              updatePriceCard(card.id, 'amount', e.target.value);
                            }}
                          />
                        )}
                      />
                      {errors.prices?.[index]?.amount && (
                        <p className="text-sm text-red-500 mt-1">{errors.prices[index]?.amount?.message}</p>
                      )}
                    </div>
                    <Controller
                      name={`prices.${index}.currency`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updatePriceCard(card.id, 'currency', value);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {/* Tax Behavior */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label className="text-base font-medium">Include tax in price</Label>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Controller
                    name={`prices.${index}.taxBehavior`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          updatePriceCard(card.id, 'taxBehavior', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Select...</SelectItem>
                          <SelectItem value="inclusive">
                            <div>
                              <div className="font-medium">Yes</div>
                              <div className="text-sm text-muted-foreground">Tax is included in the price.</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="exclusive">
                            <div>
                              <div className="font-medium">No</div>
                              <div className="text-sm text-muted-foreground">Tax is added to the price.</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Billing Period (for recurring) */}
                {card.type === 'recurring' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Billing Period</Label>
                      <Controller
                        name={`prices.${index}.interval`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              updatePriceCard(card.id, 'interval', value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {intervals.map((interval) => (
                                <SelectItem key={interval.value} value={interval.value}>
                                  {interval.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Advanced Options */}
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-medium">Advanced</Label>
                  
                  <div className="space-y-3">
                    <Label>Price description</Label>
                    <p className="text-sm text-muted-foreground">
                      Use to organize your prices. Not shown to customers.
                    </p>
                    <Controller
                      name={`prices.${index}.description`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Enter description"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            updatePriceCard(card.id, 'description', e.target.value);
                          }}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Lookup key</Label>
                    <p className="text-sm text-muted-foreground">
                      <a 
                        href="https://stripe.com/docs/products-prices/manage-prices#lookup-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Lookup keys
                      </a>{' '}
                      make it easier to manage and make future pricing changes by using a unique key for each price.
                    </p>
                    <Controller
                      name={`prices.${index}.lookupKey`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g. standard_monthly"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            updatePriceCard(card.id, 'lookupKey', e.target.value);
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Preview</span>
              </CardTitle>
              <CardDescription>
                Estimate totals based on pricing model, unit quantity, and tax.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {priceCards.map((card, index) => (
                <div key={card.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Price {index + 1}</span>
                    <Badge variant="outline">{card.type}</Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Unit quantity</span>
                      <Input
                        type="number"
                        min="1"
                        value={card.preview.quantity}
                        onChange={(e) => {
                          const quantity = parseInt(e.target.value) || 1;
                          const amount = parseFloat(card.amount) || 0;
                          updatePriceCard(card.id, 'preview', {
                            ...card.preview,
                            quantity,
                            subtotal: amount * quantity,
                            total: amount * quantity
                          });
                        }}
                        className="w-20 h-8"
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {card.preview.quantity} × ${parseFloat(card.amount) || 0} = ${card.preview.subtotal.toFixed(2)}
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${card.preview.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total per {card.type === 'recurring' ? card.interval : 'payment'}</span>
                      <span>${card.preview.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {card.type === 'recurring' && (
                    <p className="text-xs text-muted-foreground">
                      Billed at the start of the period
                    </p>
                  )}

                  {index < priceCards.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline">
          Back
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
          Save Prices
        </Button>
      </div>
    </form>
  );
};

export default StripePricingForm;
