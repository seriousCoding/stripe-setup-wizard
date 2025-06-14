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
import { PriceEditForm } from '@/components/PriceEditForm';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProductGrid from '@/components/products/ProductGrid';
import PriceEditDialog from '@/components/products/PriceEditDialog';

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
          <ProductGrid 
            products={products}
            onEditProduct={handleEditProduct}
            onAddPrice={handleAddPrice}
            onEditPrice={handleEditPrice}
            getDefaultPrice={getDefaultPrice}
            concisePrice={concisePrice}
            getBillingType={getBillingType}
            getTierInfo={getTierInfo}
          />
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
      {/* New: Responsive Price Edit Dialog */}
      <PriceEditDialog
        open={showEditPriceDialog}
        priceToEdit={priceToEdit}
        onOpenChange={(open) => {
          setShowEditPriceDialog(open);
          if (!open) setPriceToEdit(null);
        }}
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
    </DashboardLayout>
  );
};

export default Products;
