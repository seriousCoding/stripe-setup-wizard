
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';
import { supabase } from '@/integrations/supabase/client';

interface BasePlan {
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  includedUsage: number;
  usageUnit: string;
}

interface OverageItem {
  id: string;
  name: string;
  pricePerUnit: number;
  currency: string;
  eventName: string;
  description: string;
}

const FixedOverageForm = () => {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [basePlan, setBasePlan] = useState<BasePlan>({
    name: '',
    price: 0,
    currency: 'USD',
    interval: 'month',
    description: '',
    includedUsage: 0,
    usageUnit: ''
  });
  const [overageItems, setOverageItems] = useState<OverageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStripeData();
  }, []);

  const fetchStripeData = async () => {
    setIsLoading(true);
    try {
      // This will fetch existing Stripe data or create test data if none exists
      const { data, error } = await supabase.functions.invoke('deploy-billing-model', {
        body: { 
          billingModel: { 
            name: 'temp-fetch',
            type: 'fixed-overage',
            items: []
          }
        }
      });

      if (error) {
        console.error('Error fetching Stripe data:', error);
        // Set default values if fetch fails
        setBasePlan({
          name: 'Professional Plan',
          price: 49.99,
          currency: 'USD',
          interval: 'month',
          description: 'Base plan with included usage',
          includedUsage: 1000,
          usageUnit: 'API calls'
        });
        
        setOverageItems([{
          id: '1',
          name: 'Additional API Calls',
          pricePerUnit: 0.01,
          currency: 'USD',
          eventName: 'api_call_overage',
          description: 'Extra API calls beyond included limit'
        }]);
      } else {
        // If we have products from Stripe, use them to populate the form
        if (data?.results?.products?.length > 0) {
          const products = data.results.products;
          const recurringProduct = products.find((p: any) => 
            p.metadata?.billing_model_type === 'recurring' || 
            p.name.toLowerCase().includes('plan') ||
            p.name.toLowerCase().includes('subscription')
          );
          
          if (recurringProduct) {
            setBasePlan({
              name: recurringProduct.name,
              price: 49.99, // Default, will be updated when price is fetched
              currency: 'USD',
              interval: 'month',
              description: recurringProduct.description || 'Base subscription plan',
              includedUsage: 1000,
              usageUnit: 'units'
            });
          }

          // Set overage items from metered products
          const meteredProducts = products.filter((p: any) => 
            p.metadata?.billing_model_type === 'metered' ||
            p.name.toLowerCase().includes('usage') ||
            p.name.toLowerCase().includes('call') ||
            p.name.toLowerCase().includes('overage')
          );

          if (meteredProducts.length > 0) {
            const newOverageItems = meteredProducts.map((product: any, index: number) => ({
              id: product.id,
              name: product.name,
              pricePerUnit: 0.01, // Default, will be updated when price is fetched
              currency: 'USD',
              eventName: product.name.toLowerCase().replace(/\s+/g, '_'),
              description: product.description || `Usage-based ${product.name}`
            }));
            setOverageItems(newOverageItems);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in fetchStripeData:', error);
      toast({
        title: "Info",
        description: "Using default values. Connect to Stripe to fetch live data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addOverageItem = () => {
    const newItem: OverageItem = {
      id: Date.now().toString(),
      name: '',
      pricePerUnit: 0,
      currency: 'USD',
      eventName: '',
      description: ''
    };
    setOverageItems([...overageItems, newItem]);
  };

  const updateOverageItem = (id: string, field: keyof OverageItem, value: any) => {
    setOverageItems(items => 
      items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeOverageItem = (id: string) => {
    if (overageItems.length > 1) {
      setOverageItems(items => items.filter(item => item.id !== id));
    }
  };

  const saveModel = async () => {
    if (!modelName || !basePlan.name) {
      toast({
        title: "Validation Error",
        description: "Please provide a model name and base plan details.",
        variant: "destructive",
      });
      return;
    }

    const billingItems = [
      {
        id: 'base-plan',
        product: basePlan.name,
        unit_amount: Math.round(basePlan.price * 100), // Convert to cents
        currency: basePlan.currency.toLowerCase(),
        type: 'recurring' as const,
        interval: basePlan.interval,
        description: basePlan.description,
        billing_scheme: 'per_unit' as const,
        metadata: {
          plan_type: 'base_plan',
          included_usage: basePlan.includedUsage.toString(),
          usage_unit: basePlan.usageUnit
        }
      },
      ...overageItems.map(item => ({
        id: item.id,
        product: item.name,
        unit_amount: Math.round(item.pricePerUnit * 100), // Convert to cents
        currency: item.currency.toLowerCase(),
        type: 'metered' as const,
        eventName: item.eventName,
        description: item.description,
        billing_scheme: 'per_unit' as const,
        usage_type: 'metered' as const,
        aggregate_usage: 'sum' as const,
        metadata: {
          overage_item: 'true',
          base_plan_id: 'base-plan'
        }
      }))
    ];

    const model = {
      name: modelName,
      description: modelDescription,
      type: 'fixed-overage' as const,
      items: billingItems
    };

    const { model: savedModel, error } = await billingModelService.saveBillingModel(model);
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Model Saved!",
      description: `${modelName} has been saved successfully.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2">Loading Stripe data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fixed + Overage Billing Model</CardTitle>
              <CardDescription>
                Create a hybrid model with a base subscription fee plus usage-based charges for overages. Perfect for services with predictable base usage and variable overages.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchStripeData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Professional + Overages"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="model-description">Description</Label>
            <Textarea
              id="model-description"
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              placeholder="Describe your fixed + overage model..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base Subscription Plan</CardTitle>
          <CardDescription>
            Define the fixed recurring component of your billing model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Plan Name</Label>
              <Input
                value={basePlan.name}
                onChange={(e) => setBasePlan({...basePlan, name: e.target.value})}
                placeholder="e.g., Professional Plan"
              />
            </div>
            
            <div>
              <Label>Monthly Price</Label>
              <Input
                type="number"
                step="0.01"
                value={basePlan.price}
                onChange={(e) => setBasePlan({...basePlan, price: parseFloat(e.target.value) || 0})}
                placeholder="49.99"
              />
            </div>
            
            <div>
              <Label>Currency</Label>
              <Select value={basePlan.currency} onValueChange={(value) => setBasePlan({...basePlan, currency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Included Usage</Label>
              <Input
                type="number"
                value={basePlan.includedUsage}
                onChange={(e) => setBasePlan({...basePlan, includedUsage: parseInt(e.target.value) || 0})}
                placeholder="1000"
              />
            </div>
            
            <div>
              <Label>Usage Unit</Label>
              <Input
                value={basePlan.usageUnit}
                onChange={(e) => setBasePlan({...basePlan, usageUnit: e.target.value})}
                placeholder="e.g., API calls, GB storage"
              />
            </div>
          </div>
          
          <div>
            <Label>Plan Description</Label>
            <Textarea
              value={basePlan.description}
              onChange={(e) => setBasePlan({...basePlan, description: e.target.value})}
              placeholder="Describe what's included in the base plan..."
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="default">
              ${basePlan.price} {basePlan.currency}/{basePlan.interval}
            </Badge>
            <Badge variant="secondary">
              Includes {basePlan.includedUsage} {basePlan.usageUnit}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overage Charges ({overageItems.length})</CardTitle>
              <CardDescription>
                Define usage-based charges that apply beyond the included limits
              </CardDescription>
            </div>
            <Button onClick={addOverageItem} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Overage Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overageItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Overage Item Configuration</h4>
                  {overageItems.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOverageItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Item Name</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateOverageItem(item.id, 'name', e.target.value)}
                      placeholder="e.g., Additional API Calls"
                    />
                  </div>
                  
                  <div>
                    <Label>Price per Unit</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.pricePerUnit}
                      onChange={(e) => updateOverageItem(item.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                      placeholder="0.01"
                    />
                  </div>
                  
                  <div>
                    <Label>Currency</Label>
                    <Select value={item.currency} onValueChange={(value) => updateOverageItem(item.id, 'currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Event Name</Label>
                    <Input
                      value={item.eventName}
                      onChange={(e) => updateOverageItem(item.id, 'eventName', e.target.value)}
                      placeholder="e.g., api_call_overage"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateOverageItem(item.id, 'description', e.target.value)}
                    placeholder="Describe this overage charge..."
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    ${item.pricePerUnit} {item.currency} per unit
                  </Badge>
                  <Badge variant="secondary">Metered</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle>Model Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Base Plan:</strong> ${basePlan.price} {basePlan.currency}/{basePlan.interval}</p>
            <p><strong>Included Usage:</strong> {basePlan.includedUsage} {basePlan.usageUnit}</p>
            <p><strong>Overage Items:</strong> {overageItems.length}</p>
            <p><strong>Model Type:</strong> Fixed + Overage Hybrid</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button
          onClick={saveModel}
          disabled={!modelName || !basePlan.name}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Billing Model
        </Button>
      </div>
    </div>
  );
};

export default FixedOverageForm;
