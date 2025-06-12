
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, ExternalLink, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
  default_price?: {
    id: string;
    unit_amount: number;
    currency: string;
    recurring?: {
      interval: string;
      interval_count?: number;
    };
  };
  metadata?: Record<string, string>;
}

interface ProductFormData {
  name: string;
  description: string;
  active: boolean;
}

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<StripeProduct | null>(null);
  const [newProductForm, setNewProductForm] = useState<ProductFormData>({
    name: '',
    description: '',
    active: true
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log('Fetching live Stripe products...');
      
      const { data, error } = await supabase.functions.invoke('fetch-stripe-data', {
        body: {}
      });

      if (error) {
        console.error('Error fetching Stripe data:', error);
        toast({
          title: "Error Loading Products",
          description: "Failed to fetch products from Stripe. Please check your connection.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data.all_products) {
        setProducts(data.all_products);
        console.log('Products loaded:', data.all_products.length);
        
        toast({
          title: "Products Loaded",
          description: `Loaded ${data.all_products.length} products from Stripe.`,
        });
      }
    } catch (error: any) {
      console.error('Error in loadProducts:', error);
      toast({
        title: "Error Loading Products",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-product', {
        body: {
          name: newProductForm.name,
          description: newProductForm.description,
          type: 'service',
          metadata: {
            active: newProductForm.active.toString(),
            created_via: 'billing_app_v1'
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Product Created",
        description: `Successfully created product: ${newProductForm.name}`,
      });

      setNewProductForm({ name: '', description: '', active: true });
      setIsAddDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error Creating Product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      // Note: Stripe doesn't allow updating product names directly
      // This would require a custom edge function to update product metadata
      toast({
        title: "Update Feature",
        description: "Product updates require additional Stripe API integration. Opening Stripe dashboard for manual editing.",
      });
      
      window.open(`https://dashboard.stripe.com/products/${editingProduct.id}`, '_blank');
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error Updating Product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      // Note: This would require a custom edge function to archive/deactivate products
      toast({
        title: "Delete Feature",
        description: "Product deletion requires additional setup. Opening Stripe dashboard for manual management.",
      });
      
      window.open(`https://dashboard.stripe.com/products/${productId}`, '_blank');
    } catch (error: any) {
      toast({
        title: "Error Deleting Product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatPrice = (amount: number, currency: string, interval?: string) => {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval ? `/${interval}` : '';
    return `$${price} ${currency.toUpperCase()}${intervalText}`;
  };

  const openStripeProduct = (productId: string) => {
    window.open(`https://dashboard.stripe.com/products/${productId}`, '_blank');
  };

  if (loading && products.length === 0) {
    return (
      <DashboardLayout
        title="Products"
        description="Manage your existing Stripe products and pricing"
      >
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span>Loading live Stripe data...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Products"
      description="Manage your existing Stripe products and pricing"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={loadProducts}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Add a new product to your Stripe catalog.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input
                      id="product-name"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea
                      id="product-description"
                      value={newProductForm.description}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter product description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateProduct}
                      disabled={!newProductForm.name.trim()}
                    >
                      Create Product
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading products...</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="mt-1">{product.description}</CardDescription>
                  </div>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.default_price && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Pricing</h4>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(
                          product.default_price.unit_amount,
                          product.default_price.currency,
                          product.default_price.recurring?.interval
                        )}
                        {product.default_price.recurring && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      ID: {product.id.substring(0, 12)}...
                    </span>
                    <div className="flex space-x-2">
                      <Dialog open={isEditDialogOpen && editingProduct?.id === product.id} onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setEditingProduct(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Edit Product"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>
                              Update product details. Note: Some changes require Stripe dashboard access.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Product Name</Label>
                              <Input value={editingProduct?.name || ''} disabled />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea value={editingProduct?.description || ''} disabled />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateProduct}>
                                Open in Stripe
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Delete Product"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action will open the Stripe dashboard for safe product management.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProduct(product.id, product.name)}>
                              Open Stripe Dashboard
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="View in Stripe"
                        onClick={() => openStripeProduct(product.id)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No products found matching your search.' : 'No products found.'}
            </div>
            {!searchTerm && (
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
