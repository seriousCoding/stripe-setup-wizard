
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StripeConnectionStatus from '@/components/StripeConnectionStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, DollarSign, Calendar, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
  prices: StripePrice[];
}

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  interval?: 'month' | 'year' | 'week' | 'day';
  active: boolean;
}

const Billing = () => {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const { toast } = useToast();

  // Form states
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('usd');
  const [priceType, setPriceType] = useState<'one_time' | 'recurring'>('one_time');
  const [priceInterval, setPriceInterval] = useState<'month' | 'year'>('month');

  const loadStripeData = async () => {
    const apiKey = localStorage.getItem('stripe_api_key');
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your Stripe API key first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      toast({
        title: "Loading Stripe Data",
        description: "Fetching your products and prices from Stripe...",
      });
      
      // TODO: Implement actual Stripe data fetching
      setProducts([]);
    } catch (error: any) {
      console.error('Error loading Stripe data:', error);
      toast({
        title: "Error",
        description: "Failed to load Stripe data",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    const apiKey = localStorage.getItem('stripe_api_key');
    if (apiKey) {
      loadStripeData();
    }
  }, []);

  const createProduct = async () => {
    const apiKey = localStorage.getItem('stripe_api_key');
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your Stripe API key first",
        variant: "destructive",
      });
      return;
    }

    if (!productName || !priceAmount) {
      toast({
        title: "Validation Error",
        description: "Please provide product name and price",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Create product
      const { data: productData, error: productError } = await supabase.functions.invoke('create-stripe-product', {
        body: {
          name: productName,
          description: productDescription,
          type: 'service',
          apiKey
        }
      });

      if (productError) {
        throw new Error(productError.message);
      }

      // Create price
      const priceData: any = {
        product: productData.product.id,
        unit_amount: Math.round(parseFloat(priceAmount) * 100),
        currency: priceCurrency,
        apiKey
      };

      if (priceType === 'recurring') {
        priceData.recurring = { interval: priceInterval };
      }

      const { data: priceResponse, error: priceError } = await supabase.functions.invoke('create-stripe-price', {
        body: priceData
      });

      if (priceError) {
        throw new Error(priceError.message);
      }

      toast({
        title: "Success!",
        description: `Created product "${productName}" with pricing in Stripe`,
      });

      // Reset form
      setProductName('');
      setProductDescription('');
      setPriceAmount('');
      setPriceCurrency('usd');
      setPriceType('one_time');
      setPriceInterval('month');

      // Reload data
      loadStripeData();

    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    }
    setCreating(false);
  };

  const openStripeDashboard = () => {
    window.open('https://dashboard.stripe.com/products', '_blank');
  };

  return (
    <DashboardLayout
      title="Billing Management"
      description="Manage your Stripe products, prices, and billing configuration"
    >
      <div className="space-y-6">
        <StripeConnectionStatus />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products & Prices</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Stripe Products ({products.length})</h3>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={loadStripeData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={openStripeDashboard}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Stripe
                </Button>
              </div>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                </CardContent>
              </Card>
            ) : products.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Products Found</CardTitle>
                  <CardDescription>
                    Create your first product to get started with billing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <Package className="h-5 w-5" />
                            <span>{product.name}</span>
                            <Badge variant={product.active ? "default" : "secondary"}>
                              {product.active ? "Active" : "Inactive"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{product.description}</CardDescription>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(product.created * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-medium">Prices ({product.prices?.length || 0})</h4>
                        {product.prices?.map((price) => (
                          <div key={price.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span>${(price.unit_amount / 100).toFixed(2)} {price.currency.toUpperCase()}</span>
                              {price.type === 'recurring' && (
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {price.interval}
                                </Badge>
                              )}
                            </div>
                            <Badge variant={price.active ? "default" : "secondary"}>
                              {price.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Product & Price</CardTitle>
                <CardDescription>
                  Add a new product with pricing to your Stripe account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., API Access Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceAmount">Price *</Label>
                    <Input
                      id="priceAmount"
                      type="number"
                      step="0.01"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="29.99"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Describe your product..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={priceCurrency} onValueChange={setPriceCurrency}>
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
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={priceType} onValueChange={(value: 'one_time' | 'recurring') => setPriceType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {priceType === 'recurring' && (
                    <div className="space-y-2">
                      <Label>Interval</Label>
                      <Select value={priceInterval} onValueChange={(value: 'month' | 'year') => setPriceInterval(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button onClick={createProduct} disabled={creating || !productName || !priceAmount}>
                  {creating ? "Creating..." : "Create Product & Price"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing Analytics</CardTitle>
                <CardDescription>
                  View your billing and revenue metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-500">
                    Detailed billing analytics and revenue metrics will be available here.
                  </p>
                  <Button variant="outline" onClick={openStripeDashboard} className="mt-4">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Stripe Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
