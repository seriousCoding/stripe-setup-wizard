
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';

interface SeatTier {
  id: string;
  name: string;
  pricePerSeat: number;
  currency: string;
  interval: string;
  minSeats: number;
  maxSeats?: number;
  description: string;
  features: string[];
}

const PerSeatForm = () => {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [enableTieredPricing, setEnableTieredPricing] = useState(false);
  const [seatTiers, setSeatTiers] = useState<SeatTier[]>([
    {
      id: '1',
      name: 'Standard Seat',
      pricePerSeat: 15.99,
      currency: 'USD',
      interval: 'month',
      minSeats: 1,
      description: 'Per user monthly subscription',
      features: ['Dashboard Access', 'Basic Reports', 'Email Support']
    }
  ]);
  const { toast } = useToast();

  const addSeatTier = () => {
    const newTier: SeatTier = {
      id: Date.now().toString(),
      name: '',
      pricePerSeat: 0,
      currency: 'USD',
      interval: 'month',
      minSeats: 1,
      description: '',
      features: []
    };
    setSeatTiers([...seatTiers, newTier]);
  };

  const updateSeatTier = (id: string, field: keyof SeatTier, value: any) => {
    setSeatTiers(tiers => 
      tiers.map(tier => 
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    );
  };

  const removeSeatTier = (id: string) => {
    if (seatTiers.length > 1) {
      setSeatTiers(tiers => tiers.filter(tier => tier.id !== id));
    }
  };

  const addFeature = (tierId: string) => {
    setSeatTiers(tiers =>
      tiers.map(tier =>
        tier.id === tierId 
          ? { ...tier, features: [...tier.features, ''] }
          : tier
      )
    );
  };

  const updateFeature = (tierId: string, featureIndex: number, value: string) => {
    setSeatTiers(tiers =>
      tiers.map(tier =>
        tier.id === tierId 
          ? { 
              ...tier, 
              features: tier.features.map((feature, index) => 
                index === featureIndex ? value : feature
              )
            }
          : tier
      )
    );
  };

  const removeFeature = (tierId: string, featureIndex: number) => {
    setSeatTiers(tiers =>
      tiers.map(tier =>
        tier.id === tierId 
          ? { 
              ...tier, 
              features: tier.features.filter((_, index) => index !== featureIndex)
            }
          : tier
      )
    );
  };

  const saveModel = async () => {
    if (!modelName || seatTiers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a model name and at least one seat tier.",
        variant: "destructive",
      });
      return;
    }

    const billingItems = seatTiers.map(tier => ({
      id: tier.id,
      product: tier.name,
      price: tier.pricePerSeat,
      currency: tier.currency,
      type: 'recurring' as const,
      interval: tier.interval,
      description: tier.description,
      eventName: `seat_${tier.name.toLowerCase().replace(/\s+/g, '_')}`
    }));

    const model = {
      name: modelName,
      description: modelDescription,
      type: 'per-seat' as const,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Per Seat Billing Model</CardTitle>
          <CardDescription>
            Create user-based pricing where customers pay per active seat/user. Perfect for team-based SaaS products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Team Collaboration Seats"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="model-description">Description</Label>
            <Textarea
              id="model-description"
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              placeholder="Describe your per-seat pricing model..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="tiered-pricing"
              checked={enableTieredPricing}
              onCheckedChange={setEnableTieredPricing}
            />
            <Label htmlFor="tiered-pricing">Enable Tiered Pricing (volume discounts)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seat Tiers ({seatTiers.length})</CardTitle>
              <CardDescription>
                Define pricing tiers for different seat types or volume brackets
              </CardDescription>
            </div>
            <Button onClick={addSeatTier} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {seatTiers.map((tier) => (
              <div key={tier.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Seat Tier Configuration</h4>
                  {seatTiers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSeatTier(tier.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Tier Name</Label>
                    <Input
                      value={tier.name}
                      onChange={(e) => updateSeatTier(tier.id, 'name', e.target.value)}
                      placeholder="e.g., Standard Seat"
                    />
                  </div>
                  
                  <div>
                    <Label>Price per Seat</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tier.pricePerSeat}
                      onChange={(e) => updateSeatTier(tier.id, 'pricePerSeat', parseFloat(e.target.value) || 0)}
                      placeholder="15.99"
                    />
                  </div>
                  
                  <div>
                    <Label>Currency</Label>
                    <Select value={tier.currency} onValueChange={(value) => updateSeatTier(tier.id, 'currency', value)}>
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
                    <Label>Billing Interval</Label>
                    <Select value={tier.interval} onValueChange={(value) => updateSeatTier(tier.id, 'interval', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {enableTieredPricing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Seats</Label>
                      <Input
                        type="number"
                        value={tier.minSeats}
                        onChange={(e) => updateSeatTier(tier.id, 'minSeats', parseInt(e.target.value) || 1)}
                        placeholder="1"
                      />
                    </div>
                    
                    <div>
                      <Label>Maximum Seats (optional)</Label>
                      <Input
                        type="number"
                        value={tier.maxSeats || ''}
                        onChange={(e) => updateSeatTier(tier.id, 'maxSeats', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={tier.description}
                    onChange={(e) => updateSeatTier(tier.id, 'description', e.target.value)}
                    placeholder="Describe this seat tier..."
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Features Included</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addFeature(tier.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Feature
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(tier.id, index, e.target.value)}
                          placeholder="e.g., Dashboard Access"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFeature(tier.id, index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    ${tier.pricePerSeat} {tier.currency} per seat/{tier.interval}
                  </Badge>
                  <Badge variant="secondary">Per Seat</Badge>
                  {enableTieredPricing && (
                    <Badge variant="outline">
                      {tier.minSeats}{tier.maxSeats ? `-${tier.maxSeats}` : '+'} seats
                    </Badge>
                  )}
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
            <p><strong>Seat Tiers:</strong> {seatTiers.length}</p>
            <p><strong>Price Range:</strong> ${Math.min(...seatTiers.map(t => t.pricePerSeat)).toFixed(2)} - ${Math.max(...seatTiers.map(t => t.pricePerSeat)).toFixed(2)} per seat</p>
            <p><strong>Tiered Pricing:</strong> {enableTieredPricing ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Model Type:</strong> Per Seat Billing</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button
          onClick={saveModel}
          disabled={!modelName || seatTiers.length === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Billing Model
        </Button>
      </div>
    </div>
  );
};

export default PerSeatForm;
