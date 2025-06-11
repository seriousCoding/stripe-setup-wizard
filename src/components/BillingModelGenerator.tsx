
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';
import { stripeService } from '@/services/stripeService';
import ModelHeader from './ModelHeader';
import BillingItemCard from './BillingItemCard';

interface BillingItem {
  id: string;
  product: string;
  price: number;
  currency: string;
  type: 'metered' | 'recurring' | 'one-time';
  interval?: string;
  eventName?: string;
  description?: string;
}

interface BillingModelGeneratorProps {
  uploadedData: any[];
  onModelGenerated: (model: any) => void;
}

const BillingModelGenerator = ({ uploadedData, onModelGenerated }: BillingModelGeneratorProps) => {
  const [billingItems, setBillingItems] = useState<BillingItem[]>(
    uploadedData.map((item, index) => ({
      id: `item-${index}`,
      product: item.product || '',
      price: item.price || 0,
      currency: item.currency || 'USD',
      type: item.type || 'metered',
      interval: item.interval || 'month',
      eventName: item.eventName || item.product?.toLowerCase().replace(/\s+/g, '_'),
      description: item.description || ''
    }))
  );
  
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showApiPreview, setShowApiPreview] = useState(false);
  const { toast } = useToast();

  const updateBillingItem = (id: string, field: keyof BillingItem, value: any) => {
    setBillingItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addBillingItem = () => {
    const newItem: BillingItem = {
      id: `item-${Date.now()}`,
      product: '',
      price: 0,
      currency: 'USD',
      type: 'metered',
      eventName: '',
      description: ''
    };
    setBillingItems(prev => [...prev, newItem]);
  };

  const removeBillingItem = (id: string) => {
    setBillingItems(prev => prev.filter(item => item.id !== id));
  };

  const detectModelType = () => {
    const types = billingItems.map(item => item.type);
    if (types.every(type => type === 'recurring')) return 'Subscription';
    if (types.every(type => type === 'metered')) return 'Usage-Based';
    if (types.includes('recurring') && types.includes('metered')) return 'Hybrid';
    return 'Custom';
  };

  const generateAPIPreview = () => {
    const model = {
      name: modelName,
      description: modelDescription,
      type: detectModelType().toLowerCase().replace(/\s+/g, '-') as any,
      items: billingItems
    };
    
    return billingModelService.generateStripeConfiguration(model);
  };

  const saveModel = async () => {
    if (!modelName || billingItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a model name and at least one billing item.",
        variant: "destructive",
      });
      return;
    }

    const model = {
      name: modelName,
      description: modelDescription,
      type: detectModelType().toLowerCase().replace(/\s+/g, '-') as any,
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

    onModelGenerated(savedModel);
    toast({
      title: "Billing Model Saved!",
      description: `${modelName} has been generated and is ready for Stripe configuration.`,
    });
  };

  const createStripeResources = async () => {
    setIsCreating(true);
    
    try {
      const results = [];
      
      // Create products and prices
      for (const item of billingItems) {
        // Create product
        const { product, error: productError } = await stripeService.createProduct({
          name: item.product,
          description: item.description,
          type: item.type === 'metered' ? 'service' : 'good'
        });
        
        if (productError) {
          throw new Error(`Failed to create product ${item.product}: ${productError}`);
        }
        
        // Create price
        const priceData: any = {
          product: product.id,
          unit_amount: Math.round(item.price * 100),
          currency: item.currency.toLowerCase()
        };
        
        if (item.type === 'recurring' && item.interval) {
          priceData.recurring = { interval: item.interval };
        }
        
        const { price, error: priceError } = await stripeService.createPrice(priceData);
        
        if (priceError) {
          throw new Error(`Failed to create price for ${item.product}: ${priceError}`);
        }
        
        // Create meter for metered items
        if (item.type === 'metered' && item.eventName) {
          const { meter, error: meterError } = await stripeService.createMeter({
            display_name: item.product,
            event_name: item.eventName
          });
          
          if (meterError) {
            throw new Error(`Failed to create meter for ${item.product}: ${meterError}`);
          }
          
          results.push({ product, price, meter });
        } else {
          results.push({ product, price });
        }
      }
      
      toast({
        title: "Stripe Resources Created!",
        description: `Successfully created ${results.length} products with prices${billingItems.filter(i => i.type === 'metered').length > 0 ? ' and meters' : ''}.`,
      });
      
    } catch (error: any) {
      console.error('Error creating Stripe resources:', error);
      toast({
        title: "Error Creating Resources",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const downloadConfiguration = () => {
    const config = generateAPIPreview();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelName.toLowerCase().replace(/\s+/g, '_')}_stripe_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Downloaded",
      description: "Stripe configuration file has been downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <ModelHeader
        modelName={modelName}
        setModelName={setModelName}
        modelDescription={modelDescription}
        setModelDescription={setModelDescription}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        modelType={detectModelType()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Billing Items ({billingItems.length})</CardTitle>
          <CardDescription>
            Configure each billing item detected from your uploaded data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingItems.map((item, index) => (
              <BillingItemCard
                key={item.id}
                item={item}
                index={index}
                isEditing={isEditing}
                canRemove={billingItems.length > 1}
                onUpdate={(field, value) => updateBillingItem(item.id, field, value)}
                onRemove={() => removeBillingItem(item.id)}
              />
            ))}
            
            {isEditing && (
              <Button
                variant="outline"
                onClick={addBillingItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Billing Item
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle>Model Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Total Items:</strong> {billingItems.length}</p>
            <p><strong>Model Type:</strong> {detectModelType()}</p>
            <p><strong>Recurring Items:</strong> {billingItems.filter(i => i.type === 'recurring').length}</p>
            <p><strong>Metered Items:</strong> {billingItems.filter(i => i.type === 'metered').length}</p>
            <p><strong>Estimated Monthly Revenue Range:</strong> ${billingItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)} - ${(billingItems.reduce((sum, item) => sum + item.price, 0) * 1000).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {showApiPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Stripe API Configuration Preview</CardTitle>
            <CardDescription>
              This configuration will be used to create your Stripe resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(generateAPIPreview(), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={saveModel}
          disabled={!modelName || billingItems.length === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Billing Model
        </Button>
        
        <Button
          onClick={createStripeResources}
          disabled={!modelName || billingItems.length === 0 || isCreating}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          {isCreating ? "Creating..." : "Create in Stripe"}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowApiPreview(!showApiPreview)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {showApiPreview ? "Hide" : "Preview"} Config
        </Button>
        
        <Button variant="outline" onClick={downloadConfiguration}>
          <Download className="h-4 w-4 mr-2" />
          Download Config
        </Button>
      </div>
    </div>
  );
};

export default BillingModelGenerator;
