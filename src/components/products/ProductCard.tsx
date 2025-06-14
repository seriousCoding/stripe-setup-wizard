
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Edit, Plus, Calendar } from 'lucide-react';
import { StripeProduct, StripePrice } from '@/services/stripeService';

interface ProductCardProps {
  product: StripeProduct;
  onEditProduct: (product: StripeProduct) => void;
  onAddPrice: (product: StripeProduct) => void;
  onEditPrice: (price: StripePrice) => void;
  getDefaultPrice: (product: StripeProduct) => StripePrice | undefined;
  concisePrice: (price?: StripePrice) => string | null;
  getBillingType: (metadata: Record<string, string>) => string;
  getTierInfo: (metadata: Record<string, string>) => string[];
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product, onEditProduct, onAddPrice, onEditPrice,
  getDefaultPrice, concisePrice, getBillingType, getTierInfo
}) => {
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
                <Badge variant="secondary">
                  {priceCount} {priceCount === 1 ? 'Price' : 'Prices'}
                </Badge>
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
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1 mt-1"
              onClick={() => onAddPrice(product)}
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

        {/* All Prices */}
        {product.prices && product.prices.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              All Prices ({product.prices.length}):
            </div>
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
                      <div className="text-xs text-gray-500 mt-1">{price.nickname}</div>
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
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 mt-2"
                      onClick={() => onEditPrice(price)}
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

        {/* Usage / Billing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Billing Type:</span>
            <Badge variant="outline">{getBillingType(product.metadata)}</Badge>
          </div>
          {!!getTierInfo(product.metadata).length && (
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
            onClick={() => onEditProduct(product)}
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
};
export default ProductCard;
