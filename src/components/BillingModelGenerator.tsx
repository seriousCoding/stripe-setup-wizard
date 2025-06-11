
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Wand2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const detectModelType = () => {
    const types = billingItems.map(item => item.type);
    if (types.every(type => type === 'recurring')) return 'Subscription';
    if (types.every(type => type === 'metered')) return 'Usage-Based';
    if (types.includes('recurring') && types.includes('metered')) return 'Hybrid';
    return 'Custom';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-indigo-600" />
            <span>Generated Billing Model</span>
            <Badge variant="secondary">{detectModelType()}</Badge>
          </CardTitle>
          <CardDescription>
            Edit and customize your billing model based on the uploaded data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., API Service Pricing Model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-description">Model Description</Label>
              <Input
                id="model-description"
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                placeholder="Brief description of this billing model"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={isEditing}
              onCheckedChange={setIsEditing}
            />
            <Label>Enable editing mode</Label>
          </div>
        </CardContent>
      </Card>

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
              <Card key={item.id} className="bg-gray-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <div className="flex space-x-2">
                      <Badge variant={
                        item.type === 'metered' ? 'default' : 
                        item.type === 'recurring' ? 'secondary' : 'outline'
                      }>
                        {item.type}
                      </Badge>
                      {billingItems.length > 1 && isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBillingItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        value={item.product}
                        onChange={(e) => updateBillingItem(item.id, 'product', e.target.value)}
                        disabled={!isEditing}
                        placeholder="API Calls"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.price}
                        onChange={(e) => updateBillingItem(item.id, 'price', parseFloat(e.target.value))}
                        disabled={!isEditing}
                        placeholder="0.001"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={item.currency}
                        onValueChange={(value) => updateBillingItem(item.id, 'currency', value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Billing Type</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value: 'metered' | 'recurring' | 'one-time') => 
                          updateBillingItem(item.id, 'type', value)
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="metered">Metered (Usage-based)</SelectItem>
                          <SelectItem value="recurring">Recurring (Subscription)</SelectItem>
                          <SelectItem value="one-time">One-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {item.type === 'recurring' && (
                      <div className="space-y-2">
                        <Label>Billing Interval</Label>
                        <Select
                          value={item.interval}
                          onValueChange={(value) => updateBillingItem(item.id, 'interval', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Daily</SelectItem>
                            <SelectItem value="week">Weekly</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="year">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {item.type === 'metered' && (
                      <div className="space-y-2">
                        <Label>Event Name</Label>
                        <Input
                          value={item.eventName}
                          onChange={(e) => updateBillingItem(item.id, 'eventName', e.target.value)}
                          disabled={!isEditing}
                          placeholder="api_call"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <Label>Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateBillingItem(item.id, 'description', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Description of this billing item"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
