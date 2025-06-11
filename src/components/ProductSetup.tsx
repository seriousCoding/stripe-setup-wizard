
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
        <div>
          <Label>Existing Product</Label>
          <Select value={existingProduct} onValueChange={setExistingProduct}>
            <SelectTrigger>
              <SelectValue placeholder="None (or enter ID manually below)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (or enter ID manually below)</SelectItem>
              <SelectItem value="prod_123">API Service Platform</SelectItem>
              <SelectItem value="prod_456">Analytics Dashboard</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="mt-2">
            Disconnect Stripe
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductSetup;
