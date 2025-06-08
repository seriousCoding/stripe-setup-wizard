
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OverageService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: string;
}

const FixedOverageForm = () => {
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    basePrice: '',
    currency: 'usd',
    interval: 'month',
    existingProductId: '',
    useExistingProduct: false
  });
  
  const [overageServices, setOverageServices] = useState<OverageService[]>([
    { id: '1', displayName: '', eventName: '', pricePerUnit: '' }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addOverageService = () => {
    const newService: OverageService = {
      id: Date.now().toString(),
      displayName: '',
      eventName: '',
      pricePerUnit: ''
    };
    setOverageServices(prev => [...prev, newService]);
  };

  const removeOverageService = (id: string) => {
    setOverageServices(prev => prev.filter(service => service.id !== id));
  };

  const updateOverageService = (id: string, field: keyof OverageService, value: string) => {
    setOverageServices(prev => 
      prev.map(service => 
        service.id === id ? { ...service, [field]: value } : service
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
        title: "Fixed + Overage Plan Created!",
        description: `${formData.productName} has been set up with base pricing and overage charges.`,
      });
      
      // Reset form
      setFormData({
        productName: '',
        productDescription: '',
        basePrice: '',
        currency: 'usd',
        interval: 'month',
        existingProductId: '',
        useExistingProduct: false
      });
      setOverageServices([{ id: '1', displayName: '', eventName: '', pricePerUnit: '' }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
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
            <TrendingUp className="h-5 w-5" />
            <span>Fixed Fee + Overage Model</span>
          </CardTitle>
          <CardDescription>
            Create a base subscription with included usage plus metered overage charges
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
                    placeholder="Business Plan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description">Product Description</Label>
                  <Textarea
                    id="product-description"
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="Base plan with included usage and overage billing"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-price">Base Price</Label>
                <Input
                  id="base-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                  placeholder="99.00"
                  required
                />
              </div>

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
          <CardTitle>Overage Services</CardTitle>
          <CardDescription>
            Define metered services that will be charged beyond the base plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overageServices.map((service, index) => (
              <Card key={service.id} className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Overage Service {index + 1}</h4>
                    {overageServices.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOverageService(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={service.displayName}
                        onChange={(e) => updateOverageService(service.id, 'displayName', e.target.value)}
                        placeholder="Extra API Calls"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Event Name</Label>
                      <Input
                        value={service.eventName}
                        onChange={(e) => updateOverageService(service.id, 'eventName', e.target.value)}
                        placeholder="api_call_overage"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Price per Unit</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={service.pricePerUnit}
                        onChange={(e) => updateOverageService(service.id, 'pricePerUnit', e.target.value)}
                        placeholder="0.01"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addOverageService}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Overage Service
            </Button>
          </div>
        </CardContent>
      </Card>

      {formData.basePrice && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Plan Preview</h4>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  Base: {formData.currency.toUpperCase()} ${formData.basePrice}/{formData.interval}
                </Badge>
                {overageServices.filter(s => s.displayName && s.pricePerUnit).map((service, index) => (
                  <Badge key={service.id} variant="outline" className="text-green-700 border-green-300">
                    {service.displayName}: ${service.pricePerUnit} per unit
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleSubmit}
        disabled={isSubmitting || !formData.basePrice}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
      >
        {isSubmitting ? 'Creating Plan...' : 'Create Fixed + Overage Plan'}
      </Button>
    </div>
  );
};

export default FixedOverageForm;
