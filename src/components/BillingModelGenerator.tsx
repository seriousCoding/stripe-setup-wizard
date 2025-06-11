
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
    const stripeConfig = {
      products: billingItems.map(item => ({
        name: item.product,
        description: item.description,
        type: item.type === 'metered' ? 'service' : 'good',
        metadata: {
          eventName: item.eventName
        }
      })),
      prices: billingItems.map(item => ({
        unit_amount: Math.round(item.price * 100),
        currency: item.currency.toLowerCase(),
        recurring: item.type === 'recurring' ? { interval: item.interval } : null,
        billing_scheme: item.type === 'metered' ? 'per_unit' : 'per_unit'
      }))
    };
    
    return JSON.stringify(stripeConfig, null, 2);
  };

  const saveModel = () => {
    const model = {
      name: modelName,
      description: modelDescription,
      items: billingItems,
      generatedAt: new Date().toISOString(),
      apiConfig: generateAPIPreview()
    };
    
    onModelGenerated(model);
    toast({
      title: "Billing Model Saved!",
      description: `${modelName} has been generated and is ready for Stripe configuration.`,
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
            <p><strong>Estimated Monthly Revenue Range:</strong> ${billingItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)} - ${(billingItems.reduce((sum, item) => sum + item.price, 0) * 1000).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button
          onClick={saveModel}
          disabled={!modelName || billingItems.length === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Billing Model
        </Button>
        <Button variant="outline">
          Preview Stripe Config
        </Button>
      </div>
    </div>
  );
};

export default BillingModelGenerator;
