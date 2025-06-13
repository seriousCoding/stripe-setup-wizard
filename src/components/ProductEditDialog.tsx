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
import { Trash2, Plus, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: StripePrice[];
}

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  interval?: 'month' | 'year' | 'week' | 'day';
  active: boolean;
  metadata: Record<string, string>;
  billing_scheme?: 'per_unit' | 'tiered';
  tiers?: Array<{
    up_to: number | null;
    unit_amount: number;
    flat_amount: number;
  }>;
}

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
    metadata: {} as Record<string, string>
  });
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [newPrice, setNewPrice] = useState({
    unit_amount: 0,
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    interval: 'month' as 'month' | 'year' | 'week' | 'day',
    billing_scheme: 'per_unit' as 'per_unit' | 'tiered',
    metadata: {} as Record<string, string>
  });
  const [showAddPrice, setShowAddPrice] = useState(false);

  useEffect(() => {
    if (product) {
      setProductData({
        name: product.name,
        description: product.description || '',
        active: product.active,
        metadata: product.metadata || {}
      });
      setPrices(product.prices || []);
    }
  }, [product]);

  const handleUpdateProduct = async () => {
    if (!product) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-stripe-product', {
        body: {
          product_id: product.id,
          name: productData.name,
          description: productData.description,
          active: productData.active,
          metadata: productData.metadata
        }
      });

      if (error) throw error;

      toast({
        title: "Product Updated",
        description: "The Stripe product has been successfully updated.",
      });

      onProductUpdated();
      onOpenChange(false);
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
        unit_amount: Math.round(newPrice.unit_amount * 100), // Convert to cents
        metadata: newPrice.metadata
      };

      if (newPrice.type === 'recurring') {
        priceData.recurring = { interval: newPrice.interval };
      }

      if (newPrice.billing_scheme === 'tiered') {
        priceData.billing_scheme = 'tiered';
        priceData.tiers_mode = 'graduated';
        priceData.tiers = [
          {
            up_to: 100,
            unit_amount: Math.round(newPrice.unit_amount * 100),
            flat_amount: 0
          },
          {
            up_to: null,
            unit_amount: Math.round(newPrice.unit_amount * 100 * 0.8),
            flat_amount: 0
          }
        ];
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
      setNewPrice({
        unit_amount: 0,
        currency: 'usd',
        type: 'one_time',
        interval: 'month',
        billing_scheme: 'per_unit',
        metadata: {}
      });

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

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product: {product?.name}</DialogTitle>
          <DialogDescription>
            Update product details and manage pricing options
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    value={productData.name}
                    onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="product-active"
                    checked={productData.active}
                    onChange={(e) => setProductData({ ...productData, active: e.target.checked })}
                  />
                  <Label htmlFor="product-active">Active</Label>
                </div>

                <Button onClick={handleUpdateProduct} disabled={isLoading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Update Product
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Existing Prices */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Existing Prices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {formatPrice(price.unit_amount, price.currency)}
                          </span>
                          {price.type === 'recurring' && (
                            <Badge variant="outline">/{price.interval}</Badge>
                          )}
                          {price.billing_scheme === 'tiered' && (
                            <Badge variant="secondary">Tiered</Badge>
                          )}
                          {!price.active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">ID: {price.id}</p>
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

                <Separator className="my-4" />

                {!showAddPrice ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddPrice(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Price
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Add New Price</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddPrice(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Amount ($)</Label>
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

                      {newPrice.type === 'recurring' && (
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
                      )}
                    </div>

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

                    <Button onClick={handleAddPrice} disabled={isLoading} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Price
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
