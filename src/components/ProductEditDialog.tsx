
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, X, Edit2, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StripeProduct, StripePrice } from '@/services/stripeService';

interface ProductEditDialogProps {
  product: StripeProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => void;
}

export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  product,
  open,
  onOpenChange,
  onProductUpdated
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    active: true,
    metadata: {} as Record<string, string>,
    type: 'service' as 'service' | 'good',
    url: '',
    unit_label: '',
    package_dimensions: {
      height: 0,
      length: 0,
      weight: 0,
      width: 0
    },
    shippable: false,
    statement_descriptor: '',
    tax_code: ''
  });
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [newPrice, setNewPrice] = useState({
    unit_amount: 0,
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    interval: 'month' as 'month' | 'year' | 'week' | 'day',
    interval_count: 1,
    billing_scheme: 'per_unit' as 'per_unit' | 'tiered',
    usage_type: 'licensed' as 'licensed' | 'metered',
    aggregate_usage: 'sum' as 'sum' | 'last_during_period' | 'last_ever' | 'max',
    nickname: '',
    metadata: {} as Record<string, string>,
    tax_behavior: 'unspecified' as 'inclusive' | 'exclusive' | 'unspecified',
    transform_quantity: {
      divide_by: 1,
      round: 'up' as 'up' | 'down'
    }
  });
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setProductData({
        name: product.name,
        description: product.description || '',
        active: product.active,
        metadata: product.metadata || {},
        type: 'service', // Default since not always provided by Stripe
        url: product.metadata?.url || '',
        unit_label: product.metadata?.unit_label || '',
        package_dimensions: {
          height: parseFloat(product.metadata?.package_height || '0'),
          length: parseFloat(product.metadata?.package_length || '0'),
          weight: parseFloat(product.metadata?.package_weight || '0'),
          width: parseFloat(product.metadata?.package_width || '0')
        },
        shippable: product.metadata?.shippable === 'true',
        statement_descriptor: product.metadata?.statement_descriptor || '',
        tax_code: product.metadata?.tax_code || ''
      });
      setPrices(product.prices || []);
      resetNewPrice();
    }
  }, [product]);

  const resetNewPrice = () => {
    setNewPrice({
      unit_amount: 0,
      currency: 'usd',
      type: 'one_time',
      interval: 'month',
      interval_count: 1,
      billing_scheme: 'per_unit',
      usage_type: 'licensed',
      aggregate_usage: 'sum',
      nickname: '',
      metadata: {},
      tax_behavior: 'unspecified',
      transform_quantity: {
        divide_by: 1,
        round: 'up'
      }
    });
  };

  const handleUpdateProduct = async () => {
    if (!product) return;

    setIsLoading(true);
    try {
      // Prepare metadata with additional product options
      const updatedMetadata = {
        ...productData.metadata,
        url: productData.url,
        unit_label: productData.unit_label,
        package_height: productData.package_dimensions.height.toString(),
        package_length: productData.package_dimensions.length.toString(),
        package_weight: productData.package_dimensions.weight.toString(),
        package_width: productData.package_dimensions.width.toString(),
        shippable: productData.shippable.toString(),
        statement_descriptor: productData.statement_descriptor,
        tax_code: productData.tax_code
      };

      const { data, error } = await supabase.functions.invoke('update-stripe-product', {
        body: {
          product_id: product.id,
          name: productData.name,
          description: productData.description,
          active: productData.active,
          metadata: updatedMetadata
        }
      });

      if (error) throw error;

      toast({
        title: "Product Updated",
        description: "The Stripe product has been successfully updated.",
      });

      onProductUpdated();
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update the product.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!product) return;

    setIsLoading(true);
    try {
      const priceData: any = {
        product: product.id,
        currency: newPrice.currency,
        unit_amount: Math.round(newPrice.unit_amount * 100),
        billing_scheme: newPrice.billing_scheme,
        nickname: newPrice.nickname || undefined,
        tax_behavior: newPrice.tax_behavior,
        metadata: {
          ...newPrice.metadata,
          created_via: 'product_edit_dialog'
        }
      };

      if (newPrice.type === 'recurring') {
        priceData.recurring = { 
          interval: newPrice.interval,
          interval_count: newPrice.interval_count,
          usage_type: newPrice.usage_type
        };
        
        if (newPrice.usage_type === 'metered') {
          priceData.recurring.aggregate_usage = newPrice.aggregate_usage;
        }
      }

      if (newPrice.transform_quantity.divide_by > 1) {
        priceData.transform_quantity = newPrice.transform_quantity;
      }

      const { data, error } = await supabase.functions.invoke('create-stripe-price', {
        body: priceData
      });

      if (error) throw error;

      toast({
        title: "Price Added",
        description: "A new price has been added to the product.",
      });

      setShowAddPrice(false);
      resetNewPrice();
      onProductUpdated();
    } catch (error: any) {
      console.error('Error adding price:', error);
      toast({
        title: "Failed to Add Price",
        description: error.message || "Failed to add the new price.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivatePrice = async (priceId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deactivate-stripe-price', {
        body: { price_id: priceId }
      });

      if (error) throw error;

      toast({
        title: "Price Deactivated",
        description: "The price has been deactivated.",
      });

      onProductUpdated();
    } catch (error: any) {
      console.error('Error deactivating price:', error);
      toast({
        title: "Deactivation Failed",
        description: error.message || "Failed to deactivate the price.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setProductData({
        ...productData,
        metadata: {
          ...productData.metadata,
          [newMetadataKey]: newMetadataValue
        }
      });
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const updatedMetadata = { ...productData.metadata };
    delete updatedMetadata[key];
    setProductData({
      ...productData,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Product: {product?.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive editing of Stripe product details, pricing, and metadata
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-name">Product Name *</Label>
                    <Input
                      id="product-name"
                      value={productData.name}
                      onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="product-active"
                      checked={productData.active}
                      onCheckedChange={(checked) => setProductData({ ...productData, active: checked })}
                    />
                    <Label htmlFor="product-active">Active</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    value={productData.description}
                    onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-url">Product URL</Label>
                    <Input
                      id="product-url"
                      value={productData.url}
                      onChange={(e) => setProductData({ ...productData, url: e.target.value })}
                      placeholder="https://example.com/product"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit-label">Unit Label</Label>
                    <Input
                      id="unit-label"
                      value={productData.unit_label}
                      onChange={(e) => setProductData({ ...productData, unit_label: e.target.value })}
                      placeholder="e.g., per user, per GB"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="statement-descriptor">Statement Descriptor</Label>
                  <Input
                    id="statement-descriptor"
                    value={productData.statement_descriptor}
                    onChange={(e) => setProductData({ ...productData, statement_descriptor: e.target.value })}
                    placeholder="Appears on customer's credit card statement"
                    maxLength={22}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum 22 characters</p>
                </div>

                <Button onClick={handleUpdateProduct} disabled={isLoading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Update Product
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Existing Prices ({prices.length})</span>
                  <Button onClick={() => setShowAddPrice(true)} disabled={showAddPrice}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Price
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-lg">
                            {getPriceDisplayText(price)}
                          </span>
                          {price.billing_scheme === 'tiered' && (
                            <Badge variant="secondary">Tiered</Badge>
                          )}
                          {price.type === 'recurring' && price.recurring?.usage_type === 'metered' && (
                            <Badge variant="outline">Metered</Badge>
                          )}
                          {!price.active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        {price.nickname && (
                          <div className="text-sm text-gray-600 mb-1">
                            Nickname: {price.nickname}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          ID: {price.id} • Currency: {price.currency.toUpperCase()}
                        </div>
                      </div>
                      {price.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivatePrice(price.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {showAddPrice && (
                  <div className="mt-6 p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Add New Price</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddPrice(false);
                          resetNewPrice();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Amount ($) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newPrice.unit_amount}
                          onChange={(e) => setNewPrice({ ...newPrice, unit_amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label>Currency</Label>
                        <Select
                          value={newPrice.currency}
                          onValueChange={(value) => setNewPrice({ ...newPrice, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usd">USD</SelectItem>
                            <SelectItem value="eur">EUR</SelectItem>
                            <SelectItem value="gbp">GBP</SelectItem>
                            <SelectItem value="cad">CAD</SelectItem>
                            <SelectItem value="aud">AUD</SelectItem>
                            <SelectItem value="jpy">JPY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Type</Label>
                        <Select
                          value={newPrice.type}
                          onValueChange={(value: 'one_time' | 'recurring') => setNewPrice({ ...newPrice, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One Time</SelectItem>
                            <SelectItem value="recurring">Recurring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {newPrice.type === 'recurring' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Interval</Label>
                          <Select
                            value={newPrice.interval}
                            onValueChange={(value: 'month' | 'year' | 'week' | 'day') => setNewPrice({ ...newPrice, interval: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Daily</SelectItem>
                              <SelectItem value="week">Weekly</SelectItem>
                              <SelectItem value="month">Monthly</SelectItem>
                              <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Interval Count</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newPrice.interval_count}
                            onChange={(e) => setNewPrice({ ...newPrice, interval_count: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        <div>
                          <Label>Usage Type</Label>
                          <Select
                            value={newPrice.usage_type}
                            onValueChange={(value: 'licensed' | 'metered') => setNewPrice({ ...newPrice, usage_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="licensed">Licensed</SelectItem>
                              <SelectItem value="metered">Metered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Billing Scheme</Label>
                        <Select
                          value={newPrice.billing_scheme}
                          onValueChange={(value: 'per_unit' | 'tiered') => setNewPrice({ ...newPrice, billing_scheme: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_unit">Per Unit</SelectItem>
                            <SelectItem value="tiered">Tiered</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Nickname</Label>
                        <Input
                          value={newPrice.nickname}
                          onChange={(e) => setNewPrice({ ...newPrice, nickname: e.target.value })}
                          placeholder="Optional price nickname"
                        />
                      </div>
                    </div>

                    <Button onClick={handleAddPrice} disabled={isLoading} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Price
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Metadata</CardTitle>
                <DialogDescription>
                  Add custom key-value pairs to store additional information about this product
                </DialogDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(productData.metadata).map(([key, value]) => (
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

                <Separator />

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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tax-code">Tax Code</Label>
                  <Input
                    id="tax-code"
                    value={productData.tax_code}
                    onChange={(e) => setProductData({ ...productData, tax_code: e.target.value })}
                    placeholder="e.g., txcd_99999999"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="shippable"
                    checked={productData.shippable}
                    onCheckedChange={(checked) => setProductData({ ...productData, shippable: checked })}
                  />
                  <Label htmlFor="shippable">Shippable Product</Label>
                </div>

                {productData.shippable && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <Label>Height (inches)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productData.package_dimensions.height}
                        onChange={(e) => setProductData({
                          ...productData,
                          package_dimensions: {
                            ...productData.package_dimensions,
                            height: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Length (inches)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productData.package_dimensions.length}
                        onChange={(e) => setProductData({
                          ...productData,
                          package_dimensions: {
                            ...productData.package_dimensions,
                            length: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Width (inches)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productData.package_dimensions.width}
                        onChange={(e) => setProductData({
                          ...productData,
                          package_dimensions: {
                            ...productData.package_dimensions,
                            width: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Weight (ounces)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productData.package_dimensions.weight}
                        onChange={(e) => setProductData({
                          ...productData,
                          package_dimensions: {
                            ...productData.package_dimensions,
                            weight: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
