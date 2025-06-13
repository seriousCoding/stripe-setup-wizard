
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';

interface ProductEditDialogProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface PriceFormData {
  unit_amount: number;
  currency: string;
  interval: string;
  type: 'recurring' | 'one_time';
  billing_scheme: 'per_unit' | 'tiered';
  usage_type: 'licensed' | 'metered';
  nickname: string;
}

const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  product,
  isOpen,
  onClose,
  onSave
}) => {
  const [productData, setProductData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    active: product?.active || true
  });
  
  const [newPriceForm, setNewPriceForm] = useState<PriceFormData>({
    unit_amount: 0,
    currency: 'usd',
    interval: 'month',
    type: 'recurring',
    billing_scheme: 'per_unit',
    usage_type: 'licensed',
    nickname: ''
  });

  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setProductData({
        name: product.name || '',
        description: product.description || '',
        active: product.active || true
      });
    }
  }, [product]);

  const handleAddPrice = async () => {
    if (!product) return;

    setLoading(true);
    try {
      const priceData = {
        product: product.id,
        unit_amount: Math.round(newPriceForm.unit_amount * 100), // Convert to cents
        currency: newPriceForm.currency,
        billing_scheme: newPriceForm.billing_scheme,
        nickname: newPriceForm.nickname,
        metadata: {
          created_via: 'product_edit_dialog',
          product_name: product.name
        }
      };

      // Add recurring data if it's a recurring price
      if (newPriceForm.type === 'recurring') {
        (priceData as any).recurring = {
          interval: newPriceForm.interval,
          usage_type: newPriceForm.usage_type
        };
      }

      const { price, error } = await stripeService.createPrice(priceData);

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "Price Added",
        description: `Successfully added new price: ${newPriceForm.nickname || `$${newPriceForm.unit_amount} ${newPriceForm.currency.toUpperCase()}`}`,
      });

      // Reset form
      setNewPriceForm({
        unit_amount: 0,
        currency: 'usd',
        interval: 'month',
        type: 'recurring',
        billing_scheme: 'per_unit',
        usage_type: 'licensed',
        nickname: ''
      });
      setIsAddingPrice(false);
      onSave(); // Refresh the products list
    } catch (error: any) {
      toast({
        title: "Error Adding Price",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string, interval?: string) => {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval ? `/${interval}` : '';
    return `$${price} ${currency.toUpperCase()}${intervalText}`;
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
          <DialogDescription>
            Modify product details and manage pricing options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={productData.name}
                  onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={productData.description}
                  onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="product-active"
                  checked={productData.active}
                  onCheckedChange={(checked) => setProductData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="product-active">Active Product</Label>
              </div>
            </CardContent>
          </Card>

          {/* Current Prices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Current Prices ({product.prices?.length || 0})
                <Button
                  size="sm"
                  onClick={() => setIsAddingPrice(true)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Price
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.prices && product.prices.length > 0 ? (
                <div className="space-y-2">
                  {product.prices.map((price: any) => (
                    <div key={price.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {formatPrice(price.unit_amount, price.currency, price.recurring?.interval)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {price.nickname && <span className="mr-2">{price.nickname}</span>}
                          <Badge variant="outline" className="text-xs mr-1">
                            {price.recurring ? 'Recurring' : 'One-time'}
                          </Badge>
                          {price.recurring && (
                            <Badge variant="outline" className="text-xs">
                              {price.recurring.usage_type === 'metered' ? 'Metered' : 'Licensed'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={price.active ? "default" : "secondary"} className="text-xs">
                        {price.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No prices configured for this product
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Price Form */}
          {isAddingPrice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add New Price</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price-amount">Price Amount ($)</Label>
                    <Input
                      id="price-amount"
                      type="number"
                      step="0.01"
                      value={newPriceForm.unit_amount}
                      onChange={(e) => setNewPriceForm(prev => ({ ...prev, unit_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-currency">Currency</Label>
                    <Select value={newPriceForm.currency} onValueChange={(value) => setNewPriceForm(prev => ({ ...prev, currency: value }))}>
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
                </div>

                <div>
                  <Label htmlFor="price-nickname">Nickname (Optional)</Label>
                  <Input
                    id="price-nickname"
                    value={newPriceForm.nickname}
                    onChange={(e) => setNewPriceForm(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="e.g., Monthly Plan, Starter Package"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price-type">Price Type</Label>
                    <Select value={newPriceForm.type} onValueChange={(value: 'recurring' | 'one_time') => setNewPriceForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recurring">Recurring</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="billing-scheme">Billing Scheme</Label>
                    <Select value={newPriceForm.billing_scheme} onValueChange={(value: 'per_unit' | 'tiered') => setNewPriceForm(prev => ({ ...prev, billing_scheme: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_unit">Per Unit</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newPriceForm.type === 'recurring' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price-interval">Billing Interval</Label>
                      <Select value={newPriceForm.interval} onValueChange={(value) => setNewPriceForm(prev => ({ ...prev, interval: value }))}>
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
                      <Label htmlFor="usage-type">Usage Type</Label>
                      <Select value={newPriceForm.usage_type} onValueChange={(value: 'licensed' | 'metered') => setNewPriceForm(prev => ({ ...prev, usage_type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="licensed">Licensed (Fixed)</SelectItem>
                          <SelectItem value="metered">Metered (Usage-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingPrice(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddPrice}
                    disabled={loading || newPriceForm.unit_amount <= 0}
                  >
                    {loading ? 'Adding...' : 'Add Price'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Metadata */}
          {product.metadata && Object.keys(product.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Product Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(product.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="font-mono text-gray-600">{key}:</span>
                      <span className="text-gray-800">{value as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => { onSave(); onClose(); }}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
