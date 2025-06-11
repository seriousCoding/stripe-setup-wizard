
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FlatRecurringForm = () => {
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    price: '',
    currency: 'usd',
    interval: 'month',
    intervalCount: '1',
    existingProductId: '',
    useExistingProduct: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Subscription Created Successfully!",
        description: `${formData.productName} has been set up with ${formData.currency.toUpperCase()} ${formData.price}/${formData.interval} pricing.`,
      });
      
      // Reset form
      setFormData({
        productName: '',
        productDescription: '',
        price: '',
        currency: 'usd',
        interval: 'month',
        intervalCount: '1',
        existingProductId: '',
        useExistingProduct: false
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPreview = () => {
    if (!formData.price) return '';
    const count = parseInt(formData.intervalCount) || 1;
    const intervalText = count === 1 ? formData.interval : `${count} ${formData.interval}s`;
    return `${formData.currency.toUpperCase()} $${formData.price} per ${intervalText}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Flat Recurring Subscription</span>
          </CardTitle>
          <CardDescription>
            Create a simple subscription with fixed recurring payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="use-existing"
                checked={formData.useExistingProduct}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, useExistingProduct: checked }))
                }
              />
              <Label htmlFor="use-existing">Use existing Stripe product</Label>
            </div>

            {formData.useExistingProduct ? (
              <div className="space-y-2">
                <Label htmlFor="existing-product">Existing Product ID</Label>
                <Input
                  id="existing-product"
                  value={formData.existingProductId}
                  onChange={(e) => setFormData(prev => ({ ...prev, existingProductId: e.target.value }))}
                  placeholder="prod_..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the Product ID from your Stripe dashboard
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Premium Subscription"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description">Product Description</Label>
                  <Textarea
                    id="product-description"
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="Access to premium features and priority support"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="29.99"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                    <SelectItem value="eur">EUR - Euro</SelectItem>
                    <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Billing Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, interval: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval-count">Interval Count</Label>
                <Input
                  id="interval-count"
                  type="number"
                  min="1"
                  value={formData.intervalCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, intervalCount: e.target.value }))}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Bill every X {formData.interval}s
                </p>
              </div>
            </div>

            {formData.price && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Pricing Preview</span>
                  </div>
                  <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                    {formatPreview()}
                  </Badge>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.price}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {isSubmitting ? 'Creating Subscription...' : 'Create Subscription'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlatRecurringForm;
