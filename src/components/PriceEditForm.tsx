
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
import { Save, X, Plus, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stripeService, StripePrice } from '@/services/stripeService';

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
    metadata: price.metadata || {}
  });
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = {
        nickname: formData.nickname || null,
        active: formData.active,
        tax_behavior: formData.tax_behavior,
        metadata: formData.metadata
      };

      const { price: updatedPrice, error } = await stripeService.updatePrice(price.id, updates);
      
      if (error) {
        throw new Error(error);
      }

      if (updatedPrice) {
        toast({
          title: "Price Updated",
          description: "The price has been successfully updated.",
        });
        onPriceUpdated(updatedPrice);
      }
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update the price.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatPrice = (amount: number, currency: string) => {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Edit Price: {getPriceDisplayText(price)}
        </CardTitle>
        <div className="flex items-center gap-2">
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
      
      <CardContent className="space-y-6">
        {/* Read-only price information */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700">Price Details (Read-only)</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Amount:</span>
              <span className="ml-2 font-medium">{formatPrice(price.unit_amount, price.currency)}</span>
            </div>
            <div>
              <span className="text-gray-500">Currency:</span>
              <span className="ml-2 font-medium">{price.currency.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium">{price.type}</span>
            </div>
            <div>
              <span className="text-gray-500">Billing Scheme:</span>
              <span className="ml-2 font-medium">{price.billing_scheme}</span>
            </div>
            {price.recurring && (
              <>
                <div>
                  <span className="text-gray-500">Interval:</span>
                  <span className="ml-2 font-medium">
                    {price.recurring.interval_count > 1 ? `${price.recurring.interval_count} ` : ''}{price.recurring.interval}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Usage Type:</span>
                  <span className="ml-2 font-medium">{price.recurring.usage_type}</span>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-gray-400">
            ID: {price.id}
          </div>
        </div>

        <Separator />

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Optional price nickname"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active (can be used for new purchases)</Label>
          </div>

          <div>
            <Label htmlFor="tax-behavior">Tax Behavior</Label>
            <Select
              value={formData.tax_behavior}
              onValueChange={(value: 'inclusive' | 'exclusive' | 'unspecified') => 
                setFormData({ ...formData, tax_behavior: value })
              }
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
        </div>

        <Separator />

        {/* Metadata section */}
        <div className="space-y-4">
          <h4 className="font-medium">Metadata</h4>
          
          {Object.keys(formData.metadata).length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(formData.metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{key}</div>
                    <div className="text-sm text-gray-500 break-all">{value}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMetadata(key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Metadata key"
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
              />
              <Input
                placeholder="Metadata value"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMetadata}
              disabled={!newMetadataKey || !newMetadataValue}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Metadata
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 pt-4">
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
