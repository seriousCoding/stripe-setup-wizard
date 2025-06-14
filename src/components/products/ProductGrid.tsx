
import React from 'react';
import { StripeProduct, StripePrice } from '@/services/stripeService';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: StripeProduct[];
  onEditProduct: (product: StripeProduct) => void;
  onAddPrice: (product: StripeProduct) => void;
  onEditPrice: (price: StripePrice) => void;
  getDefaultPrice: (product: StripeProduct) => StripePrice | undefined;
  concisePrice: (price?: StripePrice) => string | null;
  getBillingType: (metadata: Record<string, string>) => string;
  getTierInfo: (metadata: Record<string, string>) => string[];
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products, ...restProps
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          {...restProps}
        />
      ))}
    </div>
  );
};
export default ProductGrid;
