import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, X, Plus, DollarSign, Calendar, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stripeService, StripePrice } from '@/services/stripeService';
import { InfoIconWithTooltip } from '@/components/InfoIconWithTooltip';

interface PriceEditFormProps {
  price: StripePrice;
  onPriceUpdated: (price: StripePrice) => void;
  onCancel: () => void;
}

export const PriceEditForm: React.FC<PriceEditFormProps> = ({
  price,
  onPriceUpdated,
  onCancel
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: price.nickname || '',
    active: price.active,
    tax_behavior: price.tax_behavior,
    metadata: price.metadata || {},
    lookup_key: price.lookup_key || '',
    transfer_lookup_key: false,
    currency_options: price.currency_options
      ? JSON.parse(JSON.stringify(price.currency_options)) // Defensive deep clone
      : {},
  });
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');
  const [currencyToAdd, setCurrencyToAdd] = useState('');

  // Handle currency option editing
  const handleCurrencyChange = (currency: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      currency_options: {
        ...prev.currency_options,
        [currency]: {
          ...prev.currency_options[currency],
          [field]: value,
        }
      }
    }));
  };

  // Handle deep updates for custom_unit_amount
  const handleCustomUnitAmountChange = (currency: string, subfield: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      currency_options: {
        ...prev.currency_options,
        [currency]: {
          ...prev.currency_options[currency],
          custom_unit_amount: {
            ...((prev.currency_options[currency] && prev.currency_options[currency].custom_unit_amount) || {}),
            [subfield]: value,
          }
        }
      }
    }));
  };

  // Handle tier management for tiered prices
  const handleTierChange = (currency: string, index: number, field: string, value: any) => {
    setFormData((prev) => {
      const tiers = prev.currency_options?.[currency]?.tiers || [];
      const updatedTiers = tiers.map((tier: any, i: number) => 
        i === index ? { ...tier, [field]: value } : tier
      );
      return {
        ...prev,
        currency_options: {
          ...prev.currency_options,
          [currency]: {
            ...(prev.currency_options?.[currency] || {}),
            tiers: updatedTiers,
          }
        }
      }
    });
  };
  const handleAddTier = (currency: string) => {
    setFormData((prev) => {
      const tiers = prev.currency_options?.[currency]?.tiers || [];
      return {
        ...prev,
        currency_options: {
          ...prev.currency_options,
          [currency]: {
            ...(prev.currency_options?.[currency] || {}),
            tiers: [...tiers, { up_to: '', unit_amount: '', unit_amount_decimal: '', flat_amount: '', flat_amount_decimal: '' }],
          }
        }
      }
    });
  }
  const handleRemoveTier = (currency: string, index: number) => {
    setFormData((prev) => {
      const tiers = [...(prev.currency_options?.[currency]?.tiers || [])];
      tiers.splice(index, 1);
      return {
        ...prev,
        currency_options: {
          ...prev.currency_options,
          [currency]: { ...prev.currency_options[currency], tiers }
        }
      }
    });
  }

  // Handle add/remove metadata and currency
  const handleAddMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          [newMetadataKey]: newMetadataValue
        }
      });
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };
  const handleRemoveMetadata = (key: string) => {
    const updatedMetadata = { ...formData.metadata };
    delete updatedMetadata[key];
    setFormData({
      ...formData,
      metadata: updatedMetadata
    });
  };

  const handleAddCurrency = () => {
    if (currencyToAdd.match(/^[a-z]{3}$/i)) {
      setFormData((prev) => ({
        ...prev,
        currency_options: {
          ...prev.currency_options,
          [currencyToAdd.toLowerCase()]: {},
        }
      }));
      setCurrencyToAdd('');
    }
  };
  const handleRemoveCurrency = (currency: string) => {
    const copy = { ...formData.currency_options };
    delete copy[currency];
    setFormData((prev) => ({
      ...prev,
      currency_options: copy,
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updates: any = {
        nickname: formData.nickname || null,
        active: formData.active,
        tax_behavior: formData.tax_behavior,
        metadata: formData.metadata,
        lookup_key: formData.lookup_key || null,
        transfer_lookup_key: formData.transfer_lookup_key,
        currency_options: Object.keys(formData.currency_options).length > 0 ? formData.currency_options : undefined,
      };

      const { price: updatedPrice, error } = await stripeService.updatePrice(price.id, updates);
      if (error) {
        throw new Error(error);
      }
      if (updatedPrice) {
        toast({ title: "Price Updated", description: "The price has been successfully updated." });
        onPriceUpdated(updatedPrice);
      }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Failed to update the price.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number | undefined, currency: string) => {
    if (typeof amount !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPriceDisplayText = (price: StripePrice) => {
    let text = formatPrice(price.unit_amount, price.currency);
    if (price.type === 'recurring' && price.recurring) {
      text += `/${price.recurring.interval}`;
      if (price.recurring.interval_count && price.recurring.interval_count > 1) {
        text = `${formatPrice(price.unit_amount, price.currency)} every ${price.recurring.interval_count} ${price.recurring.interval}s`;
      }
    }
    return text;
  };

  // Redesign: Show essential details in a visually grouped card 
  // Add clear section headers; better spacing; clear separation of readonly and editable fields.

  // Readonly price info block
  const PriceInfo = () => (
    <div className="p-4 bg-muted rounded-lg">
      <div className="font-medium text-primary mb-2">Stripe Price Information</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Amount:</span> <span className="ml-2 font-medium">{formatPrice(price.unit_amount, price.currency)}</span></div>
        <div><span className="text-gray-500">Currency:</span> <span className="ml-2 font-medium">{price.currency.toUpperCase()}</span></div>
        <div><span className="text-gray-500">Type:</span> <span className="ml-2 font-medium">{price.type}</span></div>
        <div><span className="text-gray-500">Scheme:</span> <span className="ml-2 font-medium">{price.billing_scheme}</span></div>
        {price.recurring && (
          <>
            <div><span className="text-gray-500">Interval:</span> <span className="ml-2 font-medium">
              {price.recurring.interval_count > 1 ? `${price.recurring.interval_count} ` : ''}{price.recurring.interval}
            </span></div>
            <div><span className="text-gray-500">Usage Type:</span> <span className="ml-2 font-medium">{price.recurring.usage_type}</span></div>
          </>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-2">ID: {price.id}</div>
    </div>
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> Edit Price: {getPriceDisplayText(price)}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={price.active ? "default" : "secondary"}>
            {price.active ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">{price.type}</Badge>
          {price.recurring && (
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {price.recurring.usage_type}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-7">
        <PriceInfo />

        <Separator />

        {/* Editable fields */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
          {/* Basic fields */}
          <div>
            <div className="flex items-center">
              <Label htmlFor="nickname">Nickname</Label>
              <InfoIconWithTooltip description="A brief description of the price, hidden from customers." />
            </div>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Optional price nickname"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={checked => setFormData({ ...formData, active: checked })}
              disabled={isLoading}
            />
            <Label htmlFor="active">Active</Label>
            <InfoIconWithTooltip description="Whether the price can be used for new purchases. Defaults to true." />
          </div>
          <div>
            <div className="flex items-center">
              <Label htmlFor="tax_behavior">Tax Behavior</Label>
              <InfoIconWithTooltip description="Specifies whether the price is considered inclusive of taxes or exclusive of taxes. One of inclusive, exclusive, or unspecified. Once specified as either inclusive or exclusive, it cannot be changed." />
            </div>
            <Select
              value={formData.tax_behavior}
              onValueChange={(value: 'inclusive' | 'exclusive' | 'unspecified') =>
                setFormData({ ...formData, tax_behavior: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Unspecified</SelectItem>
                <SelectItem value="inclusive">Inclusive</SelectItem>
                <SelectItem value="exclusive">Exclusive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center">
              <Label htmlFor="lookup_key">Lookup Key</Label>
              <InfoIconWithTooltip description="A lookup key used to retrieve prices dynamically from a static string. This may be up to 200 characters." />
            </div>
            <Input
              id="lookup_key"
              value={formData.lookup_key || ''}
              onChange={e => setFormData({ ...formData, lookup_key: e.target.value })}
              placeholder="Optional static lookup key for this price"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="transfer_lookup_key"
              checked={formData.transfer_lookup_key}
              onCheckedChange={checked => setFormData({ ...formData, transfer_lookup_key: checked })}
              disabled={isLoading}
            />
            <Label htmlFor="transfer_lookup_key">Transfer Lookup Key</Label>
            <InfoIconWithTooltip description="If set to true, will atomically remove the lookup key from the existing price, and assign it to this price." />
          </div>
          <Separator className="my-6" />
          {/* Metadata */}
          <div>
            <div className="flex items-center">
              <Label>Metadata</Label>
              <InfoIconWithTooltip description="Set of key-value pairs that you can attach to an object. Useful for storing additional information." />
            </div>
            <div className="space-y-2">
              {Object.entries(formData.metadata).map(([k, v]) => (
                <div key={k} className="flex items-center border rounded p-2">
                  <span className="text-sm font-medium mr-2">{k}:</span>
                  <span className="text-sm text-gray-600 break-all mr-2">{v}</span>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveMetadata(k)} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Key"
                  value={newMetadataKey}
                  onChange={e => setNewMetadataKey(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Value"
                  value={newMetadataValue}
                  onChange={e => setNewMetadataValue(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddMetadata} disabled={!newMetadataKey || !newMetadataValue || isLoading}>
                  Add
                </Button>
              </div>
            </div>
          </div>
          {/* currency_options */}
          <Separator className="my-6" />
          <div>
            <div className="flex items-center">
             <Label>Currencies</Label>
             <InfoIconWithTooltip description="Prices defined in each available currency option. Each key must be a three-letter ISO currency code and a supported currency." />
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. eur"
                value={currencyToAdd}
                onChange={e => setCurrencyToAdd(e.target.value)}
                className="w-24"
                disabled={isLoading}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddCurrency} disabled={!currencyToAdd.match(/^[a-z]{3}$/i) || isLoading}>
                Add Currency
              </Button>
            </div>
            <div className="space-y-4 mt-4">
              {Object.keys(formData.currency_options || {}).map(currency => (
                <div key={currency} className="border rounded-lg p-3 bg-gray-50 mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">Currency: {currency.toUpperCase()}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveCurrency(currency)} disabled={isLoading}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Increased gap for better spacing */}
                    <div>
                      <div className="flex items-center">
                        <Label htmlFor={`unit_amount_${currency}`}>Unit Amount (cents)</Label>
                        <InfoIconWithTooltip description="A positive integer in cents (or 0 for a free price) representing how much to charge." />
                      </div>
                      <Input
                        id={`unit_amount_${currency}`}
                        value={formData.currency_options?.[currency]?.unit_amount || ''}
                        onChange={e => handleCurrencyChange(currency, 'unit_amount', e.target.value.replace(/\D/, ''))}
                        disabled={isLoading}
                        placeholder="e.g., 1000 for $10.00"
                      />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <Label htmlFor={`unit_amount_decimal_${currency}`}>Unit Amount Decimal</Label>
                        <InfoIconWithTooltip description="Same as unit_amount, but accepts a decimal value in cents with at most 12 decimal places. Only one of unit_amount and unit_amount_decimal can be set." />
                      </div>
                      <Input
                        id={`unit_amount_decimal_${currency}`}
                        value={formData.currency_options?.[currency]?.unit_amount_decimal || ''}
                        onChange={e => handleCurrencyChange(currency, 'unit_amount_decimal', e.target.value)}
                        disabled={isLoading}
                        placeholder="e.g., 1000.50 for $10.005"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2"> {/* Tax behavior for currency option spans full width on mobile */}
                      <div className="flex items-center">
                        <Label htmlFor={`tax_behavior_${currency}`}>Tax Behavior</Label>
                        <InfoIconWithTooltip description="Specifies whether the price is considered inclusive of taxes or exclusive of taxes for this currency. Overrides the top-level tax_behavior." />
                      </div>
                      <Select
                        value={formData.currency_options?.[currency]?.tax_behavior || 'unspecified'}
                        onValueChange={v => handleCurrencyChange(currency, 'tax_behavior', v)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`tax_behavior_${currency}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Unspecified</SelectItem>
                          <SelectItem value="inclusive">Inclusive</SelectItem>
                          <SelectItem value="exclusive">Exclusive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Custom unit amount */}
                    <div className="border bg-muted rounded-md p-3 col-span-1 md:col-span-2"> {/* Spans full width */}
                      <div className="flex items-center">
                        <Label>Custom Unit Amount</Label>
                        <InfoIconWithTooltip description="When set, provides configuration for the amount to be adjusted by the customer during Checkout Sessions and Payment Links." />
                      </div>
                      <div className="flex flex-wrap gap-2 items-center mt-2">
                        <Switch
                          checked={!!formData.currency_options?.[currency]?.custom_unit_amount?.enabled}
                          onCheckedChange={checked => handleCustomUnitAmountChange(currency, 'enabled', checked)}
                          disabled={isLoading}
                          id={`custom_unit_amount_enabled_${currency}`}
                        />
                        <Label htmlFor={`custom_unit_amount_enabled_${currency}`} className="mr-2">Enable</Label>
                        <InfoIconWithTooltip description="Pass in true to enable custom_unit_amount." />
                      </div>
                      {formData.currency_options?.[currency]?.custom_unit_amount?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                          <div>
                            <div className="flex items-center">
                              <Label htmlFor={`custom_unit_amount_minimum_${currency}`}>Minimum</Label>
                              <InfoIconWithTooltip description="The minimum unit amount the customer can specify for this item. Must be at least the minimum charge amount." />
                            </div>
                            <Input
                              id={`custom_unit_amount_minimum_${currency}`}
                              placeholder="Min (cents)"
                              type="number"
                              value={formData.currency_options?.[currency]?.custom_unit_amount?.minimum || ''}
                              onChange={e => handleCustomUnitAmountChange(currency, 'minimum', e.target.value)}
                              disabled={isLoading}
                            />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <Label htmlFor={`custom_unit_amount_maximum_${currency}`}>Maximum</Label>
                              <InfoIconWithTooltip description="The maximum unit amount the customer can specify for this item." />
                            </div>
                            <Input
                              id={`custom_unit_amount_maximum_${currency}`}
                              placeholder="Max (cents)"
                              type="number"
                              value={formData.currency_options?.[currency]?.custom_unit_amount?.maximum || ''}
                              onChange={e => handleCustomUnitAmountChange(currency, 'maximum', e.target.value)}
                              disabled={isLoading}
                            />
                          </div>
                          <div>
                            <div className="flex items-center">
                             <Label htmlFor={`custom_unit_amount_preset_${currency}`}>Preset</Label>
                             <InfoIconWithTooltip description="The starting unit amount which can be updated by the customer." />
                            </div>
                            <Input
                              id={`custom_unit_amount_preset_${currency}`}
                              placeholder="Preset (cents)"
                              type="number"
                              value={formData.currency_options?.[currency]?.custom_unit_amount?.preset || ''}
                              onChange={e => handleCustomUnitAmountChange(currency, 'preset', e.target.value)}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Tiers */}
                  {(price.billing_scheme === 'tiered' || (formData.currency_options?.[currency]?.tiers?.length ?? 0) > 0) && (
                    <div className="mt-4">
                      <div className="flex items-center">
                        <Label>Tiers</Label>
                        <InfoIconWithTooltip description="Each element represents a pricing tier. This parameter requires billing_scheme to be set to tiered." />
                      </div>
                      <div className="space-y-2">
                        {(formData.currency_options?.[currency]?.tiers || []).map((tier: any, i: number) => (
                          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border p-3 rounded bg-white"> {/* Increased padding and gap */}
                            <div>
                              <div className="flex items-center">
                                <Label htmlFor={`tier_up_to_${currency}_${i}`}>Up To</Label>
                                <InfoIconWithTooltip description="Specifies the upper bound of this tier. Use 'inf' for the last tier." />
                              </div>
                              <Input
                                id={`tier_up_to_${currency}_${i}`}
                                placeholder="Number or 'inf'"
                                value={tier.up_to}
                                onChange={e => handleTierChange(currency, i, 'up_to', e.target.value)}
                                disabled={isLoading}
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <Label htmlFor={`tier_unit_amount_${currency}_${i}`}>Unit Amount</Label>
                                <InfoIconWithTooltip description="The per unit billing amount for each individual unit for which this tier applies (cents)." />
                              </div>
                              <Input
                                id={`tier_unit_amount_${currency}_${i}`}
                                placeholder="Unit Amount (cents)"
                                value={tier.unit_amount || ''}
                                onChange={e => handleTierChange(currency, i, 'unit_amount', e.target.value.replace(/\D/, ''))}
                                disabled={isLoading}
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <Label htmlFor={`tier_unit_amount_decimal_${currency}_${i}`}>Unit Amount Decimal</Label>
                                <InfoIconWithTooltip description="Same as unit_amount, but accepts a decimal value in cents with at most 12 decimal places." />
                              </div>
                              <Input
                                id={`tier_unit_amount_decimal_${currency}_${i}`}
                                placeholder="e.g., 10.50"
                                value={tier.unit_amount_decimal || ''}
                                onChange={e => handleTierChange(currency, i, 'unit_amount_decimal', e.target.value)}
                                disabled={isLoading}
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <Label htmlFor={`tier_flat_amount_${currency}_${i}`}>Flat Amount</Label>
                                <InfoIconWithTooltip description="The flat billing amount for an entire tier, regardless of the number of units in the tier (cents)." />
                              </div>
                              <Input
                                id={`tier_flat_amount_${currency}_${i}`}
                                placeholder="Flat Amount (cents)"
                                value={tier.flat_amount || ''}
                                onChange={e => handleTierChange(currency, i, 'flat_amount', e.target.value.replace(/\D/, ''))}
                                disabled={isLoading}
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <Label htmlFor={`tier_flat_amount_decimal_${currency}_${i}`}>Flat Amount Decimal</Label>
                                <InfoIconWithTooltip description="Same as flat_amount, but accepts a decimal value representing an integer in the minor units of the currency." />
                              </div>
                              <Input
                                id={`tier_flat_amount_decimal_${currency}_${i}`}
                                placeholder="e.g., 500.75"
                                value={tier.flat_amount_decimal || ''}
                                onChange={e => handleTierChange(currency, i, 'flat_amount_decimal', e.target.value)}
                                disabled={isLoading}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveTier(currency, i)}
                              className="mt-4 md:mt-0 md:self-end" // Align button
                              disabled={isLoading}
                            >Remove Tier</Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddTier(currency)} disabled={isLoading}>
                          <Plus className="h-4 w-4 mr-2"/> Add Tier
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
