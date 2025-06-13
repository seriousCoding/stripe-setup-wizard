import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, RefreshCw, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { ProductEditDialog } from '@/components/ProductEditDialog';
import { StripeProduct } from '@/services/stripeService';

const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('fetch-stripe-data');

      if (error) {
        throw error;
      }

      if (data?.success && data.all_products) {
        setProducts(data.all_products);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Failed to Load Products",
        description: error.message || "Could not fetch Stripe products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeBilling = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('initialize-stripe-billing');

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Billing Initialized",
          description: `Created ${data.summary?.products_created || 0} products with meters and pricing`,
        });
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Error initializing billing:', error);
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize billing system",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: StripeProduct) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getBillingType = (metadata: Record<string, string>) => {
    return metadata.billing_model_type || 'standard';
  };

  const getTierInfo = (metadata: Record<string, string>) => {
    const tierInfo = [];
    if (metadata.usage_limit_transactions) {
      tierInfo.push(`${metadata.usage_limit_transactions} transactions`);
    }
    if (metadata.usage_limit_ai_processing) {
      tierInfo.push(`${metadata.usage_limit_ai_processing} AI processing`);
    }
    if (metadata.overage_rate) {
      tierInfo.push(`$${metadata.overage_rate}/overage`);
    }
    return tierInfo;
  };

  const getDefaultPrice = (product: StripeProduct) => {
    if (product.default_price) {
      return product.default_price;
    }
    // If no default price, try to find the first active recurring price
    const recurringPrice = product.prices?.find(p => p.active && p.type === 'recurring');
    if (recurringPrice) return recurringPrice;
    
    // Otherwise, return the first active price
    return product.prices?.find(p => p.active);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <DashboardLayout 
      title="Stripe Products" 
      description="Manage your Stripe products and pricing"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Button onClick={fetchProducts} disabled={isLoading} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleInitializeBilling} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Initialize Billing Plans
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-gray-500 mb-6">
                  You haven't created any Stripe products yet. Initialize your billing plans to get started.
                </p>
                <Button onClick={handleInitializeBilling} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize Billing Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const defaultPrice = getDefaultPrice(product);
              const activePrices = product.prices?.filter(p => p.active) || [];
              const inactivePrices = product.prices?.filter(p => !p.active) || [];
              
              return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.metadata?.subtitle && (
                          <p className="text-sm text-gray-500 mt-1">{product.metadata.subtitle}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {product.metadata?.popular === 'true' && (
                          <Badge className="bg-blue-600">Most Popular</Badge>
                        )}
                        {product.metadata?.badge && (
                          <Badge variant="secondary">{product.metadata.badge}</Badge>
                        )}
                        {!product.active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-gray-600">{product.description}</p>
                    )}

                    {/* Default/Main Price Display */}
                    {defaultPrice && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-800">
                              {formatPrice(defaultPrice.unit_amount, defaultPrice.currency)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {defaultPrice.type === 'recurring' && defaultPrice.interval && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                /{defaultPrice.interval}
                              </Badge>
                            )}
                            {defaultPrice.billing_scheme === 'tiered' && (
                              <Badge variant="secondary" className="text-xs">Tiered</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {defaultPrice === product.default_price ? 'Default Price' : 'Primary Price'}
                        </div>
                      </div>
                    )}

                    {/* Additional Prices Summary */}
                    {activePrices.length > 1 && (
                      <div className="text-xs text-gray-500">
                        <div className="font-medium">Additional Prices ({activePrices.length - 1}):</div>
                        <div className="mt-1 space-y-1">
                          {activePrices.slice(0, 3).filter(p => p.id !== defaultPrice?.id).map((price) => (
                            <div key={price.id} className="flex justify-between">
                              <span>{formatPrice(price.unit_amount, price.currency)}</span>
                              <span>
                                {price.type === 'recurring' && price.interval ? `/${price.interval}` : 'one-time'}
                              </span>
                            </div>
                          ))}
                          {activePrices.length > 4 && (
                            <div className="text-gray-400">
                              +{activePrices.length - 4} more prices
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inactive Prices Notice */}
                    {inactivePrices.length > 0 && (
                      <div className="text-xs text-orange-600">
                        {inactivePrices.length} inactive price{inactivePrices.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Billing Model Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Billing Type:</span>
                        <Badge variant="outline">{getBillingType(product.metadata)}</Badge>
                      </div>
                      
                      {/* Usage Limits */}
                      {getTierInfo(product.metadata).length > 0 && (
                        <div className="text-xs text-gray-500">
                          <div className="font-medium">Usage Limits:</div>
                          <ul className="list-disc list-inside">
                            {getTierInfo(product.metadata).map((info, index) => (
                              <li key={index}>{info}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>

                    {/* Product ID */}
                    <div className="text-xs text-gray-400 truncate">
                      ID: {product.id}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <ProductEditDialog
        product={selectedProduct}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProductUpdated={fetchProducts}
      />
    </DashboardLayout>
  );
};

export default Products;
