
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface ProductSetupProps {
  productSetup: 'new' | 'existing';
  setProductSetup: (value: 'new' | 'existing') => void;
  existingProduct: string;
  setExistingProduct: (value: string) => void;
}

const ProductSetup = ({ 
  productSetup, 
  setProductSetup, 
  existingProduct, 
  setExistingProduct 
}: ProductSetupProps) => {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StripeProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();

  const fetchStripeProducts = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching Stripe products...');
      const { data, error } = await supabase.functions.invoke('fetch-stripe-data');
      
      if (error) {
        console.error('Error invoking function:', error);
        throw new Error(error.message);
      }

      console.log('Received data:', data);
      
      if (data?.success && data?.all_products) {
        const activeProducts = data.all_products.filter((product: any) => product.active);
        console.log('Active products:', activeProducts);
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
        
        toast({
          title: "Products Loaded",
          description: `Found ${activeProducts.length} active products`,
        });
      } else {
        throw new Error(data?.error || 'No products found');
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: `Failed to fetch Stripe products: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productSetup === 'existing') {
      fetchStripeProducts();
    }
  }, [productSetup]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleProductSelect = (productId: string) => {
    setExistingProduct(productId);
    setIsDropdownOpen(false);
  };

  const selectedProduct = products.find(p => p.id === existingProduct);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Product Setup</Label>
        <div className="flex space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="new-product"
              name="productSetup"
              checked={productSetup === 'new'}
              onChange={() => setProductSetup('new')}
              className="w-4 h-4"
            />
            <Label htmlFor="new-product">Create New Product</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="existing-product"
              name="productSetup"
              checked={productSetup === 'existing'}
              onChange={() => setProductSetup('existing')}
              className="w-4 h-4"
            />
            <Label htmlFor="existing-product">Use Existing Product</Label>
          </div>
        </div>
      </div>

      {productSetup === 'existing' && (
        <div className="space-y-3">
          <Label>Search Existing Products</Label>
          
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products by name, description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                className="pl-10"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        existingProduct === product.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleProductSelect(product.id)}
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.id}</div>
                      {product.description && (
                        <div className="text-sm text-gray-600 mt-1">{product.description}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500 text-center">
                    {isLoading ? 'Loading products...' : 'No products found'}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="font-medium text-blue-900">Selected: {selectedProduct.name}</div>
              <div className="text-sm text-blue-700">ID: {selectedProduct.id}</div>
              {selectedProduct.description && (
                <div className="text-sm text-blue-600 mt-1">{selectedProduct.description}</div>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStripeProducts}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Products
            </Button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductSetup;
