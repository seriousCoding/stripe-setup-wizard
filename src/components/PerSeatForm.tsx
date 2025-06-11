
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeatTier {
  id: string;
  name: string;
  minSeats: string;
  maxSeats: string;
  pricePerSeat: string;
}

const PerSeatForm = () => {
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    currency: 'usd',
    interval: 'month',
    existingProductId: '',
    useExistingProduct: false
  });
  
  const [seatTiers, setSeatTiers] = useState<SeatTier[]>([
    { id: '1', name: 'Standard', minSeats: '1', maxSeats: '10', pricePerSeat: '' }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addSeatTier = () => {
    const newTier: SeatTier = {
      id: Date.now().toString(),
      name: '',
      minSeats: '',
      maxSeats: '',
      pricePerSeat: ''
    };
    setSeatTiers(prev => [...prev, newTier]);
  };

  const removeSeatTier = (id: string) => {
    setSeatTiers(prev => prev.filter(tier => tier.id !== id));
  };

  const updateSeatTier = (id: string, field: keyof SeatTier, value: string) => {
    setSeatTiers(prev => 
      prev.map(tier => 
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Per Seat Plan Created!",
        description: `${formData.productName} has been set up with per-seat pricing.`,
      });
      
      // Reset form
      setFormData({
        productName: '',
        productDescription: '',
        currency: 'usd',
        interval: 'month',
        existingProductId: '',
        useExistingProduct: false
      });
      setSeatTiers([{ id: '1', name: 'Standard', minSeats: '1', maxSeats: '10', pricePerSeat: '' }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create per-seat plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Per Seat Pricing</span>
          </CardTitle>
          <CardDescription>
            Create seat-based pricing where customers pay per user or seat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="use-existing"
                checked={formData.useExistingProduct}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, useExistingProduct: checked }))
                }
              />
              <Label htmlFor="use-existing">Use existing Stripe product</Label>
            </div>

            {formData.useExistingProduct ? (
              <div className="space-y-2">
                <Label htmlFor="existing-product">Existing Product ID</Label>
                <Input
                  id="existing-product"
                  value={formData.existingProductId}
                  onChange={(e) => setFormData(prev => ({ ...prev, existingProductId: e.target.value }))}
                  placeholder="prod_..."
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Team Collaboration Plan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description">Product Description</Label>
                  <Textarea
                    id="product-description"
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="Per-seat pricing for team collaboration features"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                    <SelectItem value="cad">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Billing Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, interval: value }))}
                >
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
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seat Pricing Tiers</CardTitle>
          <CardDescription>
            Define pricing tiers based on the number of seats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {seatTiers.map((tier, index) => (
              <Card key={tier.id} className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Pricing Tier {index + 1}</h4>
                    {seatTiers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSeatTier(tier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Tier Name</Label>
                      <Input
                        value={tier.name}
                        onChange={(e) => updateSeatTier(tier.id, 'name', e.target.value)}
                        placeholder="Standard"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Min Seats</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.minSeats}
                        onChange={(e) => updateSeatTier(tier.id, 'minSeats', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max Seats</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.maxSeats}
                        onChange={(e) => updateSeatTier(tier.id, 'maxSeats', e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Price per Seat</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.pricePerSeat}
                        onChange={(e) => updateSeatTier(tier.id, 'pricePerSeat', e.target.value)}
                        placeholder="25.00"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addSeatTier}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Pricing Tier
            </Button>
          </div>
        </CardContent>
      </Card>

      {seatTiers.some(tier => tier.pricePerSeat) && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h4 className="font-medium text-purple-900">Per Seat Plan Preview</h4>
              <div className="space-y-1">
                {seatTiers.filter(tier => tier.name && tier.pricePerSeat).map((tier) => (
                  <Badge key={tier.id} variant="secondary" className="text-purple-700 bg-purple-100">
                    {tier.name}: {formData.currency.toUpperCase()} ${tier.pricePerSeat}/seat/{formData.interval}
                    {tier.minSeats && tier.maxSeats && ` (${tier.minSeats}-${tier.maxSeats} seats)`}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleSubmit}
        disabled={isSubmitting || seatTiers.every(tier => !tier.pricePerSeat)}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
      >
        {isSubmitting ? 'Creating Per Seat Plan...' : 'Create Per Seat Plan'}
      </Button>
    </div>
  );
};

export default PerSeatForm;
