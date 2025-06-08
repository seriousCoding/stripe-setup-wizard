
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, ExternalLink, Edit, Trash2 } from 'lucide-react';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for products
  const products = [
    {
      id: 'prod_1',
      name: 'API Service Pro',
      description: 'Professional API access with advanced features',
      prices: [
        { id: 'price_1', amount: 2999, currency: 'usd', interval: 'month' },
        { id: 'price_2', amount: 199, currency: 'usd', interval: null }
      ],
      created: '2024-01-15',
      active: true
    },
    {
      id: 'prod_2',
      name: 'Storage Plan',
      description: 'Scalable cloud storage solution',
      prices: [
        { id: 'price_3', amount: 999, currency: 'usd', interval: 'month' }
      ],
      created: '2024-01-10',
      active: true
    },
    {
      id: 'prod_3',
      name: 'Analytics Dashboard',
      description: 'Advanced analytics and reporting tools',
      prices: [
        { id: 'price_4', amount: 4999, currency: 'usd', interval: 'month' },
        { id: 'price_5', amount: 49999, currency: 'usd', interval: 'year' }
      ],
      created: '2024-01-05',
      active: false
    }
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (amount: number, currency: string, interval: string | null) => {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval ? `/${interval}` : '';
    return `$${price} ${currency.toUpperCase()}${intervalText}`;
  };

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
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </div>

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
                    <h4 className="text-sm font-medium mb-2">Pricing</h4>
                    <div className="space-y-1">
                      {product.prices.map((price) => (
                        <div key={price.id} className="text-sm text-muted-foreground">
                          {formatPrice(price.amount, price.currency, price.interval)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Created {product.created}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              {searchTerm ? 'No products found matching your search.' : 'No products found.'}
            </div>
            <Button className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Product
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
