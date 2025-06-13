
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ProductEditDialog from '@/components/ProductEditDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, ExternalLink, Edit, Trash2, RefreshCw, Zap, CreditCard, Users, Target, BarChart3, Settings, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { stripeService } from '@/services/stripeService';

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: string;
    interval_count?: number;
    usage_type?: string;
    aggregate_usage?: string;
  };
  billing_scheme?: string;
  usage_type?: string;
  tiers?: any[];
  transform_quantity?: any;
  metadata?: Record<string, string>;
}

interface StripeMeter {
  id: string;
  display_name: string;
  event_name: string;
  status: string;
  value_settings: {
    event_payload_key: string;
  };
  default_aggregation: {
    formula: string;
  };
  created: number;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created: number;
  default_price?: StripePrice;
  prices?: StripePrice[];
  metadata?: Record<string, string>;
  // Enhanced product data
  meters?: StripeMeter[];
  usage_records?: any[];
  subscription_data?: any;
  billing_thresholds?: any;
  // Computed properties
  totalPriceOptions?: number;
  hasMeteredPricing?: boolean;
  isRecurring?: boolean;
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log('Fetching comprehensive Stripe product data...');
      
      const { data, error } = await supabase.functions.invoke('fetch-stripe-data', {
        body: { 
          include_meters: true,
          include_usage: true,
          include_detailed_pricing: true,
          include_all_prices: true
        }
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

      if (data?.success) {
        // Enhanced product data processing with all associated prices
        const enhancedProducts = (data.all_products || []).map((product: any) => {
          const enhancedProduct = { ...product };
          
          // Get all prices for this product from the comprehensive price list
          if (data.all_prices) {
            enhancedProduct.prices = data.all_prices.filter(
              (price: any) => price.product === product.id
            );
          }

          // Get related meters
          if (data.meters) {
            enhancedProduct.meters = data.meters.filter((meter: any) => 
              meter.display_name?.toLowerCase().includes(product.name.toLowerCase()) ||
              product.metadata?.meter_ids?.split(',').includes(meter.id)
            );
          }

          // Calculate aggregated metrics
          enhancedProduct.totalPriceOptions = enhancedProduct.prices?.length || 0;
          enhancedProduct.hasMeteredPricing = enhancedProduct.prices?.some(
            (price: any) => price.recurring?.usage_type === 'metered'
          ) || false;
          enhancedProduct.isRecurring = enhancedProduct.prices?.some(
            (price: any) => price.recurring
          ) || false;

          return enhancedProduct;
        });

        setProducts(enhancedProducts);
        console.log('Enhanced products loaded:', enhancedProducts.length);
        
        toast({
          title: "Products Loaded",
          description: `Loaded ${enhancedProducts.length} products with complete pricing data from Stripe.`,
        });

        // Create billing meters for app usage if needed
        await createAppBillingMeters();
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

  const createAppBillingMeters = async () => {
    try {
      console.log('Creating essential billing meters for app functionality...');
      
      // Create essential billing meters for app functionality
      const requiredMeters: Array<{
        display_name: string;
        event_name: string;
        aggregation_formula: 'sum' | 'count' | 'last_during_period' | 'last_ever' | 'max';
        description: string;
      }> = [
        {
          display_name: 'API Calls',
          event_name: 'api_calls',
          aggregation_formula: 'sum',
          description: 'Track API calls for usage-based billing'
        },
        {
          display_name: 'Data Processing',
          event_name: 'data_processing',
          aggregation_formula: 'sum',
          description: 'Track data processing operations'
        },
        {
          display_name: 'AI Processing',
          event_name: 'ai_processing',
          aggregation_formula: 'sum',
          description: 'Track AI processing requests'
        },
        {
          display_name: 'Document Uploads',
          event_name: 'document_uploads',
          aggregation_formula: 'count',
          description: 'Track document upload operations'
        },
        {
          display_name: 'Storage Usage',
          event_name: 'storage_usage',
          aggregation_formula: 'sum',
          description: 'Track storage usage in bytes'
        },
        {
          display_name: 'User Sessions',
          event_name: 'user_sessions',
          aggregation_formula: 'count',
          description: 'Track active user sessions'
        }
      ];

      const createdMeters = [];
      
      for (const meterConfig of requiredMeters) {
        try {
          console.log(`Creating meter: ${meterConfig.display_name}`);
          
          const { data, error } = await supabase.functions.invoke('create-billing-meter', {
            body: meterConfig
          });
          
          if (error) {
            console.warn(`Could not create meter ${meterConfig.event_name}:`, error);
            toast({
              title: "Meter Creation Warning",
              description: `Could not create ${meterConfig.display_name}: ${error.message}`,
              variant: "destructive",
            });
          } else if (data?.success) {
            console.log(`Successfully created billing meter: ${meterConfig.display_name}`);
            createdMeters.push(data.meter);
            
            toast({
              title: "Meter Created",
              description: `Successfully created ${meterConfig.display_name} billing meter`,
            });
          } else {
            console.warn(`Failed to create meter ${meterConfig.event_name}:`, data?.error);
            toast({
              title: "Meter Creation Error",
              description: `Failed to create ${meterConfig.display_name}: ${data?.error || 'Unknown error'}`,
              variant: "destructive",
            });
          }
        } catch (meterError: any) {
          console.warn(`Error creating meter ${meterConfig.event_name}:`, meterError);
          toast({
            title: "Meter Creation Error",
            description: `Failed to create ${meterConfig.display_name}: ${meterError.message}`,
            variant: "destructive",
          });
        }
      }

      if (createdMeters.length > 0) {
        toast({
          title: "Billing Meters Setup Complete",
          description: `Successfully created ${createdMeters.length} billing meters for app usage tracking.`,
        });
      }

      return createdMeters;
    } catch (error: any) {
      console.error('Error creating app billing meters:', error);
      toast({
        title: "Error Creating Billing Meters",
        description: "Failed to create billing meters. Please check your Stripe configuration.",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleCreateProduct = async () => {
    try {
      const { product, error } = await stripeService.createProduct({
        name: newProductForm.name,
        description: newProductForm.description,
        type: 'service',
        metadata: {
          active: newProductForm.active.toString(),
          created_via: 'billing_app_v1',
          enhanced_tracking: 'true'
        }
      });

      if (error) {
        throw new Error(error);
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

  const handleEditProduct = (product: StripeProduct) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const getBillingTierInfo = (product: StripeProduct) => {
    const metadata = product.metadata || {};
    const defaultPrice = product.default_price;
    const hasMetered = product.hasMeteredPricing || false;
    const isRecurring = product.isRecurring || false;
    
    // Check metadata for tier information
    if (metadata.tier_id) {
      return {
        tier: metadata.tier_id,
        type: metadata.billing_model_type || 'unknown',
        icon: getTierIcon(metadata.tier_id)
      };
    }
    
    // Determine tier based on enhanced data
    if (hasMetered) {
      return {
        tier: 'usage-based',
        type: 'metered',
        icon: <Zap className="h-4 w-4" />
      };
    }
    
    if (defaultPrice) {
      const amount = defaultPrice.unit_amount || 0;
      
      if (isRecurring) {
        if (amount === 0) {
          return {
            tier: 'trial',
            type: 'free_trial',
            icon: <Target className="h-4 w-4" />
          };
        } else if (amount < 1000) {
          return {
            tier: 'starter',
            type: 'flat_recurring',
            icon: <CreditCard className="h-4 w-4" />
          };
        } else {
          return {
            tier: 'premium',
            type: 'flat_recurring',
            icon: <Users className="h-4 w-4" />
          };
        }
      }
      
      return {
        tier: 'one-time',
        type: 'one_time',
        icon: <CreditCard className="h-4 w-4" />
      };
    }
    
    return {
      tier: 'unknown',
      type: 'unknown',
      icon: <CreditCard className="h-4 w-4" />
    };
  };

  const getTierIcon = (tierId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      trial: <Target className="h-4 w-4" />,
      starter: <CreditCard className="h-4 w-4" />,
      professional: <Users className="h-4 w-4" />,
      business: <Zap className="h-4 w-4" />,
      enterprise: <Users className="h-4 w-4" />
    };
    return iconMap[tierId] || <CreditCard className="h-4 w-4" />;
  };

  const getTierColor = (tier: string) => {
    const colorMap: { [key: string]: string } = {
      trial: 'bg-green-100 text-green-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      business: 'bg-orange-100 text-orange-800',
      enterprise: 'bg-red-100 text-red-800',
      'usage-based': 'bg-yellow-100 text-yellow-800',
      'one-time': 'bg-gray-100 text-gray-800',
      unknown: 'bg-gray-100 text-gray-600'
    };
    return colorMap[tier] || 'bg-gray-100 text-gray-600';
  };

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const formatPrice = (amount: number, currency: string, interval?: string) => {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval ? `/${interval}` : '';
    return `$${price} ${currency.toUpperCase()}${intervalText}`;
  };

  const openStripeProduct = (productId: string) => {
    window.open(`https://dashboard.stripe.com/products/${productId}`, '_blank');
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && products.length === 0) {
    return (
      <DashboardLayout
        title="Products"
        description="Manage your existing Stripe products and pricing"
      >
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span>Loading comprehensive Stripe data...</span>
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

        {/* Product Edit Dialog */}
        <ProductEditDialog
          product={editingProduct}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            loadProducts();
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const tierInfo = getBillingTierInfo(product);
            const isExpanded = expandedProducts.has(product.id);
            
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription className="mt-1">{product.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge className={getTierColor(tierInfo.tier)}>
                        <div className="flex items-center space-x-1">
                          {tierInfo.icon}
                          <span className="capitalize">{tierInfo.tier.replace('-', ' ')}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Enhanced Pricing Section with All Prices */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Pricing Options ({product.totalPriceOptions || 0})
                        </h4>
                      </div>
                      
                      {/* Display all prices for this product */}
                      {product.prices && product.prices.length > 0 ? (
                        <div className="space-y-2">
                          {product.prices.slice(0, isExpanded ? product.prices.length : 3).map((price: any, index: number) => (
                            <div key={price.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">
                                  {formatPrice(price.unit_amount, price.currency, price.recurring?.interval)}
                                </span>
                                {price.recurring && (
                                  <div className="flex space-x-1 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {price.recurring.usage_type === 'metered' ? 'Metered' : 'Licensed'}
                                    </Badge>
                                    {price.billing_scheme === 'tiered' && (
                                      <Badge variant="outline" className="text-xs">Tiered</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Badge variant={price.active ? "default" : "secondary"} className="text-xs">
                                {price.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          ))}
                          {!isExpanded && product.prices.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{product.prices.length - 3} more prices...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No pricing options available
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Product Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3 text-gray-500" />
                        <span>{product.totalPriceOptions || 0} prices</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3 text-gray-500" />
                        <span>{product.meters?.length || 0} meters</span>
                      </div>
                    </div>

                    {/* Expansion Toggle */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleProductExpansion(product.id)}
                      className="w-full"
                    >
                      {isExpanded ? 'Show Less' : 'Show Details'}
                    </Button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="space-y-3 border-t pt-3">
                        {/* Meters */}
                        {product.meters && product.meters.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium mb-1">Associated Meters</h5>
                            <div className="space-y-1">
                              {product.meters.map((meter: any, index: number) => (
                                <div key={index} className="text-xs text-muted-foreground">
                                  {meter.display_name} ({meter.event_name})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {product.metadata && Object.keys(product.metadata).length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium mb-1">Metadata</h5>
                            <div className="space-y-1">
                              {Object.entries(product.metadata).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="text-xs text-muted-foreground">
                                  <span className="font-mono">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        ID: {product.id.substring(0, 12)}...
                      </span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Edit Product"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="View in Stripe"
                          onClick={() => window.open(`https://dashboard.stripe.com/products/${product.id}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
