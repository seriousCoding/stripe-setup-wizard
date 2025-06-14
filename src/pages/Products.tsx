import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, RefreshCw, DollarSign, Calendar, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { ProductEditDialog } from '@/components/ProductEditDialog';
import { StripeProduct, StripePrice } from '@/services/stripeService';
import PriceCreateDialog from '@/components/PriceCreateDialog';
import PriceEditForm from '@/components/PriceEditForm';

const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreatePriceDialog, setShowCreatePriceDialog] = useState(false);
  const [priceTargetProduct, setPriceTargetProduct] = useState<StripeProduct | null>(null);
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false);
  const [priceToEdit, setPriceToEdit] = useState<any | null>(null);

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

  const handleAddPrice = (product: StripeProduct) => {
    setPriceTargetProduct(product);
    setShowCreatePriceDialog(true);
  };

  const handleEditPrice = (price: any) => {
    setPriceToEdit(price);
    setShowEditPriceDialog(true);
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

  const concisePrice = (price?: StripePrice) => {
    if (!price) return null;
    let amount = formatPrice(price.unit_amount, price.currency);
    if (price.type === 'recurring' && price.recurring) {
      if (price.recurring.interval_count && price.recurring.interval_count > 1) {
        amount += ` every ${price.recurring.interval_count} ${price.recurring.interval}s`;
      } else {
        amount += `/${price.recurring.interval}`;
      }
    }
    return amount;
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
              const priceCount = product.prices?.length || 0;
              return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex flex-col">
                          <span className="flex items-center gap-2">
                            {product.name}
                            <Badge variant="secondary">{priceCount} {priceCount === 1 ? 'Price' : 'Prices'}</Badge>
                          </span>
                          {defaultPrice && (
                            <span className="text-base text-green-700 font-semibold mt-1 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-700" />
                              {concisePrice(defaultPrice)}
                              <Badge variant="outline" className="ml-2">Default</Badge>
                            </span>
                          )}
                        </CardTitle>
                        {product.metadata?.subtitle && (
                          <p className="text-sm text-gray-500 mt-1">{product.metadata.subtitle}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
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
                        <Button 
                          size="xs" 
                          variant="outline" 
                          className="text-xs px-2 py-1 mt-1"
                          onClick={() => handleAddPrice(product)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Price
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-gray-600">{product.description}</p>
                    )}

                    {/* All Prices (active + inactive) */}
                    {product.prices && product.prices.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">All Prices ({product.prices.length}):</div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {product.prices.map(price => (
                            <div
                              key={price.id}
                              className={`p-2 rounded-lg border flex items-center ${
                                price.id === defaultPrice?.id
                                  ? 'bg-blue-50 border-blue-200'
                                  : price.active
                                  ? 'bg-gray-50 border-gray-200'
                                  : 'bg-gray-100 border-gray-300 opacity-70'
                              }`}
                            >
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="h-3 w-3 text-green-600" />
                                  <span className="font-medium text-sm">
                                    {concisePrice(price)}
                                  </span>
                                  {price.id === defaultPrice?.id && (
                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                  )}
                                </div>
                                {price.nickname && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {price.nickname}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                  ID: {price.id}
                                </div>
                              </div>
                              <div className="flex flex-col items-end ml-4 gap-2">
                                <div className="flex items-center space-x-1">
                                  {price.type === 'recurring' && price.recurring && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-2 w-2 mr-1" />
                                      /{price.recurring.interval}
                                    </Badge>
                                  )}
                                  {price.billing_scheme === 'tiered' && (
                                    <Badge variant="secondary" className="text-xs">Tiered</Badge>
                                  )}
                                  {price.recurring?.usage_type === 'metered' && (
                                    <Badge variant="outline" className="text-xs">Metered</Badge>
                                  )}
                                  {!price.active && (
                                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                <Button 
                                  size="xs" 
                                  variant="outline" 
                                  className="text-xs px-2 py-1 mt-2"
                                  onClick={() => handleEditPrice(price)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usage Limits, Actions, etc. */}
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
                        Edit Product
                      </Button>
                    </div>

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

      {/* Product Edit Dialog */}
      <ProductEditDialog
        product={selectedProduct}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProductUpdated={fetchProducts}
      />
      {/* New: Price Create Dialog */}
      <PriceCreateDialog
        product={priceTargetProduct}
        open={showCreatePriceDialog}
        onOpenChange={(open) => {
          setShowCreatePriceDialog(open);
          if (!open) setPriceTargetProduct(null);
        }}
        onPriceCreated={() => {
          setShowCreatePriceDialog(false); 
          setPriceTargetProduct(null);
          fetchProducts();
        }}
      />
      {/* New: Price Edit Dialog (re-use PriceEditForm for now) */}
      {priceToEdit && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-red-500"
              onClick={() => setShowEditPriceDialog(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <PriceEditForm
              price={priceToEdit}
              onPriceUpdated={() => {
                setShowEditPriceDialog(false);
                setPriceToEdit(null);
                fetchProducts();
              }}
              onCancel={() => {
                setShowEditPriceDialog(false);
                setPriceToEdit(null);
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Products;
