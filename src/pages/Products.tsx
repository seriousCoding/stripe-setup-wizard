
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, ExternalLink, Edit, Trash2, RefreshCw } from 'lucide-react';
import { stripeService, StripeProduct } from '@/services/stripeService';
import { useToast } from '@/hooks/use-toast';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    const { products: fetchedProducts, error } = await stripeService.listProducts();
    
    if (error) {
      toast({
        title: "Error Loading Products",
        description: error,
        variant: "destructive",
      });
    } else if (fetchedProducts) {
      setProducts(fetchedProducts);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (amount: number, currency: string, interval: string | undefined) => {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval ? `/${interval}` : '';
    return `$${price} ${currency.toUpperCase()}${intervalText}`;
  };

  const createNewProduct = async () => {
    const productName = prompt("Enter product name:");
    if (!productName) return;
    
    const description = prompt("Enter product description (optional):");
    
    setLoading(true);
    const { product, error } = await stripeService.createProduct({
      name: productName,
      description: description || undefined
    });
    
    if (error) {
      toast({
        title: "Error Creating Product",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Product Created!",
        description: `${productName} has been created successfully.`,
      });
      loadProducts(); // Refresh the list
    }
    
    setLoading(false);
  };

  if (loading && products.length === 0) {
    return (
      <DashboardLayout
        title="Products"
        description="Manage your existing Stripe products and pricing"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
              onClick={createNewProduct}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
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
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Pricing ({product.prices.length} price{product.prices.length !== 1 ? 's' : ''})
                    </h4>
                    <div className="space-y-1">
                      {product.prices.slice(0, 3).map((price) => (
                        <div key={price.id} className="text-sm text-muted-foreground">
                          {formatPrice(price.unit_amount, price.currency, price.interval)}
                          {price.type === 'recurring' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                      ))}
                      {product.prices.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{product.prices.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      ID: {product.id}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" title="Edit Product">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" title="View in Stripe">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" title="Delete Product">
                        <Trash2 className="h-3 w-3" />
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
                onClick={createNewProduct}
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
